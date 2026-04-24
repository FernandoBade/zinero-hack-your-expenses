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
    brandName: string;
    subject: string;
    preheader: string;
    heading: string;
    body: string;
    ctaLabel: string;
    linkLabel: string;
    warning: string;
};

const HTML_ESCAPE_MAP: Readonly<Record<string, string>> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;",
};

/**
 * @summary Escapes dynamic email content before interpolating it into HTML templates.
 */
const escapeHtml = (value: string): string => value.replace(/[&<>"']/g, (character) => HTML_ESCAPE_MAP[character] ?? character);

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
    const brandName = await translateAsync("app.name", locale);
    const linkLabel = await translateAsync("email.auth.link.label", locale);

    if (type === TokenType.EMAIL_VERIFICATION) {
        return {
            brandName,
            subject: await translateAsync("email.auth.verification.subject", locale),
            preheader: await translateAsync("email.auth.verification.preheader", locale),
            heading: await translateAsync("email.auth.verification.heading", locale),
            body: await translateAsync("email.auth.verification.body", locale),
            ctaLabel: await translateAsync("email.auth.verification.cta", locale),
            linkLabel,
            warning: await translateAsync("email.auth.verification.warning", locale),
        };
    }

    return {
        brandName,
        subject: await translateAsync("email.auth.password_reset.subject", locale),
        preheader: await translateAsync("email.auth.password_reset.preheader", locale),
        heading: await translateAsync("email.auth.password_reset.heading", locale),
        body: await translateAsync("email.auth.password_reset.body", locale),
        ctaLabel: await translateAsync("email.auth.password_reset.cta", locale),
        warning: await translateAsync("email.auth.password_reset.warning", locale),
        linkLabel,
    };
};

/**
 * @summary Builds the HTML template used for authentication-related transactional emails.
 */
const buildAuthEmailHtml = (content: AuthEmailContent, link: string): string => {
    const brandName = escapeHtml(content.brandName);
    const subject = escapeHtml(content.subject);
    const preheader = escapeHtml(content.preheader);
    const heading = escapeHtml(content.heading);
    const body = escapeHtml(content.body);
    const ctaLabel = escapeHtml(content.ctaLabel);
    const linkLabel = escapeHtml(content.linkLabel);
    const warning = escapeHtml(content.warning);
    const escapedLink = escapeHtml(link);

    return `
<!DOCTYPE html>
<html>
  <head>
    <title>${subject}</title>
  </head>
  <body style="margin:0;padding:0;background-color:#f4f1ec;">
    <span style="display:none!important;visibility:hidden;opacity:0;color:transparent;height:0;width:0;overflow:hidden;">${preheader}</span>
    <div style="max-width:600px;margin:0 auto;padding:28px 16px;font-family:Arial,Helvetica,sans-serif;color:#171717;">
      <div style="background:#ffffff;border:1px solid #e5e0d8;border-radius:12px;overflow:hidden;">
        <div style="padding:24px 28px 0;">
          <p style="margin:0;color:#256f5b;font-size:22px;font-weight:800;letter-spacing:.2px;">${brandName}</p>
        </div>
        <div style="padding:24px 28px 28px;">
          <h1 style="font-size:24px;line-height:1.25;margin:0 0 12px;color:#171717;">${heading}</h1>
          <p style="margin:0 0 24px;line-height:1.6;font-size:15px;color:#3f3f46;">${body}</p>
          <p style="margin:0 0 24px;">
            <a href="${escapedLink}" style="display:inline-block;background:#256f5b;color:#ffffff;text-decoration:none;border-radius:8px;padding:12px 18px;font-size:15px;font-weight:700;">${ctaLabel}</a>
          </p>
          <p style="margin:0 0 8px;line-height:1.5;font-size:13px;color:#71717a;">${linkLabel}</p>
          <p style="margin:0 0 20px;word-break:break-word;line-height:1.5;font-size:13px;">
            <a href="${escapedLink}" style="color:#256f5b;">${escapedLink}</a>
          </p>
          <p style="margin:0;line-height:1.5;font-size:13px;color:#71717a;">${warning}</p>
        </div>
      </div>
      <p style="margin:16px 0 0;text-align:center;font-size:12px;line-height:1.5;color:#71717a;">
        ${brandName}
        </p>
    </div>
  </body>
</html>`.trim();
};

/**
 * @summary Builds a plain-text fallback version of authentication email content.
 */
const buildAuthEmailText = (content: AuthEmailContent, link: string): string => {
    return [
        content.brandName,
        "",
        content.heading,
        "",
        content.body,
        "",
        `${content.ctaLabel}: ${link}`,
        "",
        content.linkLabel,
        link,
        "",
        content.warning,
    ].join("\n");
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
