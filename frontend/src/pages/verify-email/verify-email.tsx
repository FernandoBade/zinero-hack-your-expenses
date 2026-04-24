import type { JSX } from "preact";
import { useEffect, useMemo, useState } from "preact/hooks";
import { useSearchParams } from "wouter-preact";
import { Alert } from "@/components/alert/alert";
import { AuthShell } from "@/components/auth-shell/auth-shell";
import { Button } from "@/components/button/button";
import { Form } from "@/components/form/form";
import { Input } from "@/components/input/input";
import { Loader } from "@/components/loader/loader";
import { createVerifyEmailController } from "@/pages/verify-email/verify-email.controller";
import { t } from "@/utils/i18n/translate";
import { AlertStyle, AlertVariant, ButtonVariant, LoaderSize } from "@shared/enums/ui.enums";
import { ErrorCode } from "@shared/errors/error-codes";
import { FieldKey, type FieldKey as FieldKeyType } from "@shared/fields/field-keys";
import { InputType } from "@shared/enums/input.enums";
import type { I18nKey } from "@shared/i18n/types/i18n-key";

const DEFAULT_VERIFICATION_COOLDOWN_SECONDS = 60;
const VERIFY_TITLE_KEY = "auth.verify_email.title";
const VERIFY_SUBTITLE_KEY = "auth.verify_email.subtitle";
const VERIFY_SENT_TITLE_KEY = "auth.verify_email.sent.title";
const VERIFY_SENT_MESSAGE_KEY = "auth.verify_email.sent.message";
const VERIFY_LOADING_KEY = "auth.verify_email.status.loading";
const VERIFY_SUCCESS_TITLE_KEY = "auth.verify_email.status.success.title";
const VERIFY_SUCCESS_MESSAGE_KEY = "auth.verify_email.status.success.message";
const VERIFY_ALREADY_VERIFIED_TITLE_KEY = "auth.verify_email.status.already_verified.title";
const VERIFY_ALREADY_VERIFIED_MESSAGE_KEY = "auth.verify_email.status.already_verified.message";
const VERIFY_INVALID_TITLE_KEY = "auth.verify_email.status.invalid.title";
const VERIFY_INVALID_MESSAGE_KEY = "auth.verify_email.status.invalid.message";
const VERIFY_ERROR_TITLE_KEY = "auth.verify_email.status.error.title";
const VERIFY_ERROR_MESSAGE_KEY = "auth.verify_email.status.error.message";
const VERIFY_TIP_INBOX_KEY = "auth.verify_email.tips.check_inbox";
const VERIFY_TIP_SPAM_KEY = "auth.verify_email.tips.check_spam";
const VERIFY_TIP_RESEND_KEY = "auth.verify_email.tips.resend";
const VERIFY_RESEND_TITLE_KEY = "auth.verify_email.resend.title";
const VERIFY_RESEND_SUBTITLE_KEY = "auth.verify_email.resend.subtitle";
const VERIFY_RESEND_SUCCESS_TITLE_KEY = "auth.verify_email.resend.success.title";
const VERIFY_RESEND_SUCCESS_MESSAGE_KEY = "auth.verify_email.resend.success.message";
const VERIFY_RESEND_SEND_KEY = "auth.verify_email.resend.actions.send";
const VERIFY_RESEND_SENDING_KEY = "auth.verify_email.resend.actions.sending";
const VERIFY_RESEND_COOLDOWN_KEY = "auth.verify_email.resend.actions.cooldown";
const VERIFY_LOGIN_ACTION_KEY = "auth.verify_email.actions.login";
const VERIFY_BACK_TO_LOGIN_KEY = "auth.verify_email.actions.back_to_login";
const LOGIN_EMAIL_PLACEHOLDER_KEY = "auth.login.email.placeholder";
const EMAIL_LABEL_KEY = "field.email.label";

type VerifyEmailStatus = "idle" | "loading" | "success" | "alreadyVerified" | "invalid" | "error";

function isTruthyQueryValue(value: string | null): boolean {
    return value === "1" || value === "true";
}

function removeFieldError(
    previousValue: Partial<Record<FieldKeyType, I18nKey>>,
    field: FieldKeyType
): Partial<Record<FieldKeyType, I18nKey>> {
    if (!previousValue[field]) {
        return previousValue;
    }

    const nextValue = { ...previousValue };
    delete nextValue[field];
    return nextValue;
}

/**
 * @summary Renders the email verification page with token validation and resend support.
 */
export function VerifyEmailPage(): JSX.Element {
    const [searchParams] = useSearchParams();
    const controller = useMemo(() => createVerifyEmailController(), []);
    const token = (searchParams.get("token") ?? "").trim();
    const sent = isTruthyQueryValue(searchParams.get("sent"));
    const [resendEmail, setResendEmail] = useState<string>((searchParams.get("email") ?? "").trim());
    const [fieldErrors, setFieldErrors] = useState<Partial<Record<FieldKeyType, I18nKey>>>({});
    const [verifyStatus, setVerifyStatus] = useState<VerifyEmailStatus>(token.length > 0 ? "loading" : "idle");
    const [verifyErrorMessage, setVerifyErrorMessage] = useState<I18nKey | null>(null);
    const [resendError, setResendError] = useState<I18nKey | null>(null);
    const [resendSuccess, setResendSuccess] = useState<I18nKey | null>(null);
    const [cooldown, setCooldown] = useState<number>(0);
    const [isResending, setIsResending] = useState<boolean>(false);

    useEffect(() => {
        if (token.length === 0) {
            setVerifyStatus("idle");
            return;
        }

        let cancelled = false;

        const verifyToken = async (): Promise<void> => {
            setVerifyStatus("loading");
            setVerifyErrorMessage(null);

            const result = await controller.onVerifyToken(token);
            if (cancelled) {
                return;
            }

            if (result.success) {
                setVerifyStatus(result.data?.alreadyVerified ? "alreadyVerified" : "success");
                return;
            }

            if (result.errorCode === ErrorCode.EXPIRED_OR_INVALID_TOKEN) {
                setVerifyStatus("invalid");
                return;
            }

            setVerifyStatus("error");
            setVerifyErrorMessage(result.messageKey);
        };

        void verifyToken();

        return () => {
            cancelled = true;
        };
    }, [controller, token]);

    useEffect(() => {
        if (verifyStatus !== "success" && verifyStatus !== "alreadyVerified") {
            return;
        }

        const timeoutId = globalThis.setTimeout(() => {
            controller.onNavigateToLogin(true);
        }, 1500);

        return () => {
            globalThis.clearTimeout(timeoutId);
        };
    }, [controller, verifyStatus]);

    useEffect(() => {
        if (cooldown <= 0) {
            return;
        }

        const timerId = globalThis.setTimeout(() => {
            setCooldown((currentValue) => Math.max(currentValue - 1, 0));
        }, 1000);

        return () => {
            globalThis.clearTimeout(timerId);
        };
    }, [cooldown]);

    const clearFieldError = (field: FieldKeyType): void => {
        setFieldErrors((currentValue) => removeFieldError(currentValue, field));
    };

    const handleResendVerification = async (): Promise<void> => {
        if (isResending || cooldown > 0) {
            return;
        }

        setIsResending(true);
        setResendError(null);
        setResendSuccess(null);

        const result = await controller.onResendVerification(resendEmail);

        setIsResending(false);
        if (result.success) {
            setResendSuccess(result.messageKey ?? VERIFY_RESEND_SUCCESS_MESSAGE_KEY);
            setCooldown(DEFAULT_VERIFICATION_COOLDOWN_SECONDS);
            return;
        }

        if (result.fieldErrors) {
            setFieldErrors((currentValue) => ({ ...currentValue, ...result.fieldErrors }));
        }

        setResendError(result.messageKey);
        if (result.errorCode === ErrorCode.EMAIL_VERIFICATION_COOLDOWN) {
            setCooldown(Number(result.data?.cooldownSeconds ?? DEFAULT_VERIFICATION_COOLDOWN_SECONDS));
        }
    };

    const showResendSection = verifyStatus === "idle" || verifyStatus === "invalid" || verifyStatus === "error";
    const showGuidanceTips = showResendSection;

    return (
        <AuthShell size="compact" title={VERIFY_TITLE_KEY} subtitle={VERIFY_SUBTITLE_KEY}>
            <div class="space-y-5">
                {sent && token.length === 0 ? (
                    <Alert variant={AlertVariant.INFO} style={AlertStyle.SOFT} title={VERIFY_SENT_TITLE_KEY} message={VERIFY_SENT_MESSAGE_KEY} />
                ) : null}

                {verifyStatus === "loading" ? (
                    <div class="flex items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-5 text-body text-base-100/80">
                        <Loader size={LoaderSize.MD} />
                        <span>{t(VERIFY_LOADING_KEY)}</span>
                    </div>
                ) : null}

                {verifyStatus === "success" ? (
                    <Alert variant={AlertVariant.SUCCESS} style={AlertStyle.SOFT} title={VERIFY_SUCCESS_TITLE_KEY} message={VERIFY_SUCCESS_MESSAGE_KEY} />
                ) : null}

                {verifyStatus === "alreadyVerified" ? (
                    <Alert variant={AlertVariant.INFO} style={AlertStyle.SOFT} title={VERIFY_ALREADY_VERIFIED_TITLE_KEY} message={VERIFY_ALREADY_VERIFIED_MESSAGE_KEY} />
                ) : null}

                {verifyStatus === "invalid" ? (
                    <Alert variant={AlertVariant.ERROR} style={AlertStyle.OUTLINE} title={VERIFY_INVALID_TITLE_KEY} message={VERIFY_INVALID_MESSAGE_KEY} />
                ) : null}

                {verifyStatus === "error" ? (
                    <Alert
                        variant={AlertVariant.ERROR}
                        style={AlertStyle.OUTLINE}
                        title={VERIFY_ERROR_TITLE_KEY}
                        message={verifyErrorMessage ?? VERIFY_ERROR_MESSAGE_KEY}
                    />
                ) : null}

                {showGuidanceTips ? (
                    <div class="space-y-2">
                        <p class="text-body text-base-100">{t(VERIFY_TIP_INBOX_KEY)}</p>
                        <p class="text-body text-base-100">{t(VERIFY_TIP_SPAM_KEY)}</p>
                        <p class="text-body text-base-100">{t(VERIFY_TIP_RESEND_KEY)}</p>
                    </div>
                ) : null}

                {showResendSection ? (
                    <Form onSubmit={handleResendVerification} disabled={isResending}>
                        <div class="space-y-4">
                            <div class="space-y-1">
                                <h2 class="text-card-title text-base-100">{t(VERIFY_RESEND_TITLE_KEY)}</h2>
                                <p class="text-body text-base-100/75">{t(VERIFY_RESEND_SUBTITLE_KEY)}</p>
                            </div>

                            <Input
                                id="verify-email-resend"
                                name="email"
                                label={EMAIL_LABEL_KEY}
                                placeholder={LOGIN_EMAIL_PLACEHOLDER_KEY}
                                type={InputType.EMAIL}
                                value={resendEmail}
                                autoComplete="email"
                                error={fieldErrors[FieldKey.EMAIL]}
                                required
                                onChange={(value) => {
                                    setResendEmail(value);
                                    clearFieldError(FieldKey.EMAIL);
                                }}
                            />

                            {resendError ? (
                                <Alert variant={AlertVariant.ERROR} style={AlertStyle.OUTLINE} message={resendError} />
                            ) : null}
                            {resendSuccess ? (
                                <Alert variant={AlertVariant.SUCCESS} style={AlertStyle.SOFT} title={VERIFY_RESEND_SUCCESS_TITLE_KEY} message={resendSuccess} />
                            ) : null}

                            <Button
                                type="submit"
                                variant={ButtonVariant.PRIMARY}
                                fullWidth
                                loading={isResending}
                                disabled={cooldown > 0}
                            >
                                {t(
                                    isResending
                                        ? VERIFY_RESEND_SENDING_KEY
                                        : cooldown > 0
                                            ? VERIFY_RESEND_COOLDOWN_KEY
                                            : VERIFY_RESEND_SEND_KEY,
                                    cooldown > 0 ? { seconds: cooldown } : undefined
                                )}
                            </Button>
                        </div>
                    </Form>
                ) : null}

                <div class="space-y-3">
                    {(verifyStatus === "success" || verifyStatus === "alreadyVerified") ? (
                        <Button type="button" variant={ButtonVariant.PRIMARY} fullWidth onClick={() => controller.onNavigateToLogin(true)}>
                            {t(VERIFY_LOGIN_ACTION_KEY)}
                        </Button>
                    ) : null}
                    <Button type="button" variant={ButtonVariant.LINK} fullWidth onClick={() => controller.onNavigateToLogin(false)}>
                        {t(VERIFY_BACK_TO_LOGIN_KEY)}
                    </Button>
                </div>
            </div>
        </AuthShell>
    );
}
