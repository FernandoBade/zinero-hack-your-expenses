import { Resend } from "resend";
import { createLog } from "../commons";
import { TokenType } from "../../../../shared/enums/auth.enums";
import { EmailProvider } from "../../../../shared/enums/email.enums";
import { LogCategory, LogEvent, LogOperation, LogType } from "../../../../shared/enums/log.enums";
import type { Locale } from "../../../../shared/i18n/types/locale";
import { translateAsync } from "../../../../shared/i18n/translate";
import { getBackendConfig } from "../../config/env";

type AuthEmailType = TokenType.EMAIL_VERIFICATION | TokenType.PASSWORD_RESET;

type AuthEmailPayload = {
    type: AuthEmailType;
    to: string;
    link: string;
    userId?: number;
    locale?: Locale;
};

export type AuthEmailSender = (payload: AuthEmailPayload) => Promise<void>;

type AuthEmailContent = {
    subject: string;
    body: string;
    warning?: string;
    linkLabel: string;
};

/**
 * @summary Builds the configured Resend client when email delivery credentials are present.
 */
const createResendClient = (): Resend | null => {
    const { email } = getBackendConfig();
    return email.resendApiKey ? new Resend(email.resendApiKey) : null;
};

/**
 * @summary Builds auth links with token query parameter for public web verification and reset flows.
 */
const buildAuthLink = (path: string, token: string): string => {
    const { server } = getBackendConfig();
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    const encodedToken = encodeURIComponent(token);
    const link = `${normalizedPath}?token=${encodedToken}`;
    return server.webPublicBaseUrl ? `${server.webPublicBaseUrl}${link}` : link;
};

/**
 * @summary Resolves localized subject/body content for auth email templates by token type.
 */
const buildAuthEmailContent = async (type: AuthEmailType, locale?: Locale): Promise<AuthEmailContent> => {
    if (type === TokenType.EMAIL_VERIFICATION) {
        return {
            subject: await translateAsync("email.auth.verification.subject", locale),
            body: await translateAsync("email.auth.verification.body", locale),
            linkLabel: await translateAsync("email.auth.link.label", locale),
        };
    }

    return {
        subject: await translateAsync("email.auth.password_reset.subject", locale),
        body: await translateAsync("email.auth.password_reset.body", locale),
        warning: await translateAsync("email.auth.password_reset.warning", locale),
        linkLabel: await translateAsync("email.auth.link.label", locale),
    };
};

/**
 * @summary Builds the HTML template used for authentication-related transactional emails.
 */
const buildAuthEmailHtml = (content: AuthEmailContent, link: string): string => {
    const warningBlock = content.warning
        ? `<p style="margin:0 0 12px;line-height:1.5;color:#555;">${content.warning}</p>`
        : "";

    return `
<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background-color:#f5f5f5;">
    <div style="max-width:600px;margin:0 auto;padding:24px;font-family:Arial,sans-serif;color:#111;">
      <div style="background:#ffffff;border-radius:8px;padding:24px;">
        <h1 style="font-size:20px;margin:0 0 12px;">${content.subject}</h1>
        <p style="margin:0 0 16px;line-height:1.5;">${content.body}</p>
        <p style="margin:0 0 8px;line-height:1.5;color:#555;">${content.linkLabel}</p>
        <p style="margin:0 0 16px;word-break:break-word;">
          <a href="${link}" style="color:#111;">${link}</a>
        </p>
        ${warningBlock}
      </div>
    </div>
  </body>
</html>`.trim();
};

/**
 * @summary Builds a plain-text fallback version of authentication email content.
 */
const buildAuthEmailText = (content: AuthEmailContent, link: string): string => {
    const lines = [
        content.subject,
        "",
        content.body,
        "",
        `${content.linkLabel} ${link}`,
    ];

    if (content.warning) {
        lines.push("", content.warning);
    }

    return lines.join("\n");
};

/**
 * @summary Redacts token query values before writing URLs into logs.
 */
const redactTokens = (value: string): string => value.replace(/token=([^&\s]+)/gi, "token=[REDACTED]");

/**
 * @summary Normalizes provider and runtime failures into a safe serializable email-error payload.
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
 * @summary Persists authentication email send failures with provider context and sanitized error data.
 */
const logEmailError = async (type: AuthEmailType, error: unknown, userId?: number): Promise<void> => {
    try {
        await createLog(
            LogType.ERROR,
            LogOperation.CREATE,
            LogCategory.AUTH,
            {
                event: LogEvent.AUTH_EMAIL_SEND_FAILED,
                provider: EmailProvider.RESEND,
                type,
                error: formatEmailError(error),
            },
            userId
        );
    } catch {
        // Ignore logging errors to avoid surfacing email issues.
    }
};

/**
 * @summary Logs missing sender configuration errors for authentication email operations.
 */
const logConfigError = async (type: AuthEmailType, userId?: number): Promise<void> => {
    await logEmailError(type, new Error("Resend configuration missing"), userId);
};

/**
 * @summary Sends authentication emails through Resend and throws on provider/config failures after logging them.
 */
const defaultSender: AuthEmailSender = async ({ type, to, link, userId, locale }) => {
    const { email } = getBackendConfig();
    const resend = createResendClient();

    if (!resend || !email.resendFromEmail) {
        await logConfigError(type, userId);
        throw new Error("AUTH_EMAIL_DELIVERY_FAILED");
    }

    const content = await buildAuthEmailContent(type, locale);
    const html = buildAuthEmailHtml(content, link);
    const text = buildAuthEmailText(content, link);

    try {
        const result = await resend.emails.send({
            from: email.resendFromEmail,
            to,
            subject: content.subject,
            html,
            text,
        });

        if (result?.error) {
            await logEmailError(type, result.error, userId);
            throw new Error("AUTH_EMAIL_DELIVERY_FAILED");
        }
    } catch (error) {
        await logEmailError(type, error, userId);
        throw new Error("AUTH_EMAIL_DELIVERY_FAILED");
    }
};

export const buildEmailVerificationLink = (token: string): string => buildAuthLink("/verify-email", token);

export const buildPasswordResetLink = (token: string): string => buildAuthLink("/reset-password", token);

/**
 * @summary Sends an email-verification message using the injectable sender strategy.
 */
export async function sendEmailVerificationEmail(
    to: string,
    token: string,
    userId?: number,
    locale?: Locale,
    sender: AuthEmailSender = defaultSender
): Promise<void> {
    const link = buildEmailVerificationLink(token);
    await sender({ type: TokenType.EMAIL_VERIFICATION, to, link, userId, locale });
}

/**
 * @summary Sends a password-reset message using the injectable sender strategy.
 */
export async function sendPasswordResetEmail(
    to: string,
    token: string,
    userId?: number,
    locale?: Locale,
    sender: AuthEmailSender = defaultSender
): Promise<void> {
    const link = buildPasswordResetLink(token);
    await sender({ type: TokenType.PASSWORD_RESET, to, link, userId, locale });
}
