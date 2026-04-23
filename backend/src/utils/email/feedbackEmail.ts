import { Resend } from "resend";
import { createLog } from "../commons";
import { EmailProvider } from "../../../../shared/enums/email.enums";
import { LogCategory, LogEvent, LogOperation, LogType } from "../../../../shared/enums/log.enums";
import type { Locale } from "../../../../shared/i18n/types/locale";
import { translateAsync } from "../../../../shared/i18n/translate";
import { getBackendConfig } from "../../config/env";

export type FeedbackAttachmentInput = {
    filename: string;
    content: Buffer;
    contentType?: string;
};

type FeedbackEmailPayload = {
    to: string;
    userId: number;
    userEmail: string;
    title: string;
    message: string;
    language?: Locale;
    attachments?: FeedbackAttachmentInput[];
};

export type FeedbackEmailSender = (payload: FeedbackEmailPayload) => Promise<boolean>;

type FeedbackEmailContent = {
    subject: string;
    intro: string;
    titleLabel: string;
    messageLabel: string;
    userIdLabel: string;
    userEmailLabel: string;
};

/**
 * @summary Builds the configured Resend client when feedback delivery credentials are present.
 */
const createResendClient = (): Resend | null => {
    const { email } = getBackendConfig();
    return email.resendApiKey ? new Resend(email.resendApiKey) : null;
};

/**
 * @summary Resolves localized labels and subject text for feedback email templates.
 */
const buildFeedbackEmailContent = async (language?: Locale): Promise<FeedbackEmailContent> => ({
    subject: await translateAsync("email.feedback.subject", language),
    intro: await translateAsync("email.feedback.intro", language),
    titleLabel: await translateAsync("email.feedback.title_label", language),
    messageLabel: await translateAsync("email.feedback.message_label", language),
    userIdLabel: await translateAsync("email.feedback.user_id_label", language),
    userEmailLabel: await translateAsync("email.feedback.user_email_label", language),
});

/**
 * @summary Builds the HTML payload for feedback emails including user metadata and message body.
 */
const buildFeedbackEmailHtml = (
    content: FeedbackEmailContent,
    payload: FeedbackEmailPayload
): string => `<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background-color:#f5f5f5;">
    <div style="max-width:600px;margin:0 auto;padding:24px;font-family:Arial,sans-serif;color:#111;">
      <div style="background:#ffffff;border-radius:8px;padding:24px;">
        <h1 style="font-size:20px;margin:0 0 12px;">${content.subject}</h1>
        <p style="margin:0 0 16px;line-height:1.5;">${content.intro}</p>
        <p style="margin:0 0 6px;line-height:1.5;color:#555;">
          <strong>${content.userIdLabel}</strong> ${payload.userId}
        </p>
        <p style="margin:0 0 12px;line-height:1.5;color:#555;">
          <strong>${content.userEmailLabel}</strong> ${payload.userEmail}
        </p>
        <p style="margin:0 0 6px;line-height:1.5;color:#555;">
          <strong>${content.titleLabel}</strong> ${payload.title}
        </p>
        <p style="margin:0;line-height:1.5;color:#555;">
          <strong>${content.messageLabel}</strong> ${payload.message}
        </p>
      </div>
    </div>
  </body>
</html>`.trim();

/**
 * @summary Builds a plain-text fallback payload for feedback email delivery.
 */
const buildFeedbackEmailText = (
    content: FeedbackEmailContent,
    payload: FeedbackEmailPayload
): string =>
    [
        content.subject,
        "",
        content.intro,
        "",
        `${content.userIdLabel} ${payload.userId}`,
        `${content.userEmailLabel} ${payload.userEmail}`,
        "",
        `${content.titleLabel} ${payload.title}`,
        `${content.messageLabel} ${payload.message}`,
    ].join("\n");

/**
 * @summary Redacts token query values before serializing URLs into logs.
 */
const redactTokens = (value: string): string => value.replace(/token=([^&\s]+)/gi, "token=[REDACTED]");

/**
 * @summary Normalizes provider/runtime errors into a serializable feedback-email error payload.
 */
const formatEmailError = (error: unknown): Record<string, unknown> => {
    if (error instanceof Error) {
        return { name: error.name, message: redactTokens(error.message) };
    }

    if (error && typeof error === "object") {
        const payload = error as Record<string, unknown>;
        const message = typeof payload.message === "string" ? payload.message : "Email provider error";
        return {
            message: redactTokens(message),
            code: payload.code ?? payload.statusCode ?? payload.status,
        };
    }

    return { message: redactTokens(String(error)) };
};

/**
 * @summary Persists feedback email delivery failures with provider context and sanitized details.
 */
const logEmailError = async (error: unknown, userId?: number): Promise<void> => {
    try {
        await createLog(
            LogType.ERROR,
            LogOperation.CREATE,
            LogCategory.LOG,
            {
                event: LogEvent.FEEDBACK_EMAIL_SEND_FAILED,
                provider: EmailProvider.RESEND,
                error: formatEmailError(error),
            },
            userId
        );
    } catch {
        // Ignore logging errors to avoid surfacing email issues.
    }
};

/**
 * @summary Logs missing email-provider configuration for feedback delivery operations.
 */
const logConfigError = async (userId?: number): Promise<void> => {
    await logEmailError(new Error("Resend configuration missing"), userId);
};

/**
 * @summary Sends feedback payloads through Resend and returns delivery success status.
 */
const defaultSender: FeedbackEmailSender = async (payload) => {
    const { email } = getBackendConfig();
    const resend = createResendClient();

    if (!resend || !email.resendFromEmail) {
        await logConfigError(payload.userId);
        return false;
    }

    const content = await buildFeedbackEmailContent(payload.language);
    const html = buildFeedbackEmailHtml(content, payload);
    const text = buildFeedbackEmailText(content, payload);

    try {
        const result = await resend.emails.send({
            from: email.resendFromEmail,
            to: payload.to,
            subject: content.subject,
            html,
            text,
            attachments: payload.attachments?.map((attachment) => ({
                filename: attachment.filename,
                content: attachment.content,
                contentType: attachment.contentType,
            })),
        });

        if (result?.error) {
            await logEmailError(result.error, payload.userId);
            return false;
        }

        return true;
    } catch (error) {
        await logEmailError(error, payload.userId);
        return false;
    }
};

/**
 * @summary Sends a formatted feedback email with optional attachments.
 */
export async function sendFeedbackEmail(
    {
        userId,
        userEmail,
        title,
        message,
        language,
        attachments,
    }: Omit<FeedbackEmailPayload, "to">,
    sender: FeedbackEmailSender = defaultSender
): Promise<{ success: true } | { success: false }> {
    const { email } = getBackendConfig();
    if (!email.feedbackToEmail) {
        await logConfigError(userId);
        return { success: false };
    }

    const success = await sender({
        to: email.feedbackToEmail,
        userId,
        userEmail,
        title,
        message,
        language,
        attachments,
    });

    return success ? { success: true } : { success: false };
}
