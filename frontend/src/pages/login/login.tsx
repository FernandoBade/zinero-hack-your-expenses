import type { JSX } from "preact";
import { useEffect, useMemo, useState } from "preact/hooks";
import { FingerprintIcon } from "@phosphor-icons/react/ssr";
import googleLogoButton from "@shared/assets/images/google-logo-button.png";
import { ErrorCode } from "@shared/errors/error-codes";
import { FieldKey, type FieldKey as FieldKeyType } from "@shared/fields/field-keys";
import { AlertVariant, AlertStyle, ButtonVariant } from "@shared/enums/ui.enums";
import type { I18nKey } from "@shared/i18n/types/i18n-key";
import { useSearchParams } from "wouter-preact";
import { Alert } from "@/components/alert/alert";
import { AuthShell } from "@/components/auth-shell/auth-shell";
import { Button } from "@/components/button/button";
import { Form } from "@/components/form/form";
import { Input } from "@/components/input/input";
import { PasswordInput } from "@/components/password-input/password-input";
import { createLoginController } from "@/pages/login/login.controller";
import { t } from "@/utils/i18n/translate";
import { InputType } from "@shared/enums/input.enums";

const DEFAULT_VERIFICATION_COOLDOWN_SECONDS = 60;
const LOGIN_TITLE_KEY = "auth.login.title";
const LOGIN_SUBTITLE_KEY = "auth.login.subtitle";
const LOGIN_EMAIL_PLACEHOLDER_KEY = "auth.login.email.placeholder";
const LOGIN_PASSWORD_PLACEHOLDER_KEY = "auth.login.password.placeholder";
const LOGIN_BUTTON_KEY = "auth.login.submit";
const LOGIN_FORGOT_PASSWORD_KEY = "auth.login.forgot_password.action";
const LOGIN_DIVIDER_OR_KEY = "auth.login.divider.or";
const LOGIN_WITH_GOOGLE_KEY = "auth.login.google.continue";
const SIGNUP_HINT_KEY = "auth.login.signup_prompt.text";
const SIGNUP_ACTION_KEY = "auth.login.signup_prompt.action";
const LOGIN_GOOGLE_COMMING_SOON_KEY = "app.coming_soon";
const LOGIN_NOT_VERIFIED_TITLE_KEY = "auth.login.not_verified.title";
const LOGIN_NOT_VERIFIED_MESSAGE_KEY = "auth.login.not_verified.message";
const LOGIN_NOT_VERIFIED_MESSAGE_WITH_EMAIL_KEY = "auth.login.not_verified.message_with_email";
const LOGIN_VERIFIED_SUCCESS_TITLE_KEY = "auth.login.success.verified.title";
const LOGIN_VERIFIED_SUCCESS_MESSAGE_KEY = "auth.login.success.verified.message";
const RESEND_SUCCESS_TITLE_KEY = "auth.verify_email.resend.success.title";
const RESEND_SEND_KEY = "auth.verify_email.resend.actions.send";
const RESEND_SENDING_KEY = "auth.verify_email.resend.actions.sending";
const RESEND_COOLDOWN_KEY = "auth.verify_email.resend.actions.cooldown";
const EMAIL_LABEL_KEY = "field.email.label";
const PASSWORD_LABEL_KEY = "field.password.label";

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
 * @summary Renders the login page with validation, verified-success feedback, and resend recovery for unverified accounts.
 */
export function LoginPage(): JSX.Element {
    const [searchParams] = useSearchParams();
    const controller = useMemo(() => createLoginController(), []);
    const [email, setEmail] = useState<string>("");
    const [password, setPassword] = useState<string>("");
    const [fieldErrors, setFieldErrors] = useState<Partial<Record<FieldKeyType, I18nKey>>>({});
    const [formError, setFormError] = useState<I18nKey | null>(null);
    const [pendingVerificationEmail, setPendingVerificationEmail] = useState<string | null>(null);
    const [resendError, setResendError] = useState<I18nKey | null>(null);
    const [resendSuccess, setResendSuccess] = useState<I18nKey | null>(null);
    const [cooldown, setCooldown] = useState<number>(0);
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [isResending, setIsResending] = useState<boolean>(false);

    const showVerifiedSuccess = isTruthyQueryValue(searchParams.get("verified"));

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

    const handleSubmit = async (): Promise<void> => {
        setIsSubmitting(true);
        setFormError(null);
        setPendingVerificationEmail(null);
        setResendError(null);
        setResendSuccess(null);

        const result = await controller.onSubmit(email, password);

        setIsSubmitting(false);
        if (result.success) {
            return;
        }

        setFieldErrors(result.fieldErrors ?? {});

        if (result.errorCode === ErrorCode.EMAIL_NOT_VERIFIED) {
            setPendingVerificationEmail(result.data?.email?.trim() || email.trim());
            return;
        }

        setFormError(result.messageKey);
    };

    const handleResendVerification = async (): Promise<void> => {
        if (isResending || cooldown > 0) {
            return;
        }

        const targetEmail = (pendingVerificationEmail ?? email).trim();
        setIsResending(true);
        setResendError(null);
        setResendSuccess(null);

        const result = await controller.onResendVerification(targetEmail);

        setIsResending(false);
        if (result.success) {
            setResendSuccess(result.messageKey ?? "error.email_verification_requested");
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

    return (
        <AuthShell size="compact" title={LOGIN_TITLE_KEY} subtitle={LOGIN_SUBTITLE_KEY}>
            <div class="space-y-6">
                {showVerifiedSuccess ? (
                    <Alert
                        variant={AlertVariant.SUCCESS}
                        style={AlertStyle.SOFT}
                        title={LOGIN_VERIFIED_SUCCESS_TITLE_KEY}
                        message={LOGIN_VERIFIED_SUCCESS_MESSAGE_KEY}
                    />
                ) : null}

                {formError ? (
                    <Alert variant={AlertVariant.ERROR} style={AlertStyle.OUTLINE} message={formError} />
                ) : null}

                {pendingVerificationEmail ? (
                    <Alert variant={AlertVariant.WARNING} style={AlertStyle.OUTLINE}>
                        <div class="space-y-1">
                            <p class="text-label font-semibold">{t(LOGIN_NOT_VERIFIED_TITLE_KEY)}</p>
                            <p class="text-body">
                                {t(
                                    pendingVerificationEmail
                                        ? LOGIN_NOT_VERIFIED_MESSAGE_WITH_EMAIL_KEY
                                        : LOGIN_NOT_VERIFIED_MESSAGE_KEY,
                                    pendingVerificationEmail ? { email: pendingVerificationEmail } : undefined
                                )}
                            </p>
                        </div>
                    </Alert>
                ) : null}

                {pendingVerificationEmail ? (
                    <div class="space-y-3">
                        {resendError ? (
                            <Alert variant={AlertVariant.ERROR} style={AlertStyle.OUTLINE} message={resendError} />
                        ) : null}
                        {resendSuccess ? (
                            <Alert
                                variant={AlertVariant.SUCCESS}
                                style={AlertStyle.SOFT}
                                title={RESEND_SUCCESS_TITLE_KEY}
                                message={resendSuccess}
                            />
                        ) : null}
                        <div class="mx-auto w-full max-w-sm">
                            <Button
                                type="button"
                                fullWidth
                                loading={isResending}
                                disabled={cooldown > 0}
                                onClick={handleResendVerification}
                            >
                                {t(
                                    isResending
                                        ? RESEND_SENDING_KEY
                                        : cooldown > 0
                                            ? RESEND_COOLDOWN_KEY
                                            : RESEND_SEND_KEY,
                                    cooldown > 0 ? { seconds: cooldown } : undefined
                                )}
                            </Button>
                        </div>
                    </div>
                ) : null}

                <Form onSubmit={handleSubmit} disabled={isSubmitting}>
                    <div class="space-y-4">
                        <Input
                            id="login-email"
                            name="email"
                            label={EMAIL_LABEL_KEY}
                            placeholder={LOGIN_EMAIL_PLACEHOLDER_KEY}
                            type={InputType.EMAIL}
                            value={email}
                            autoComplete="email"
                            error={fieldErrors[FieldKey.EMAIL]}
                            required
                            onChange={(value) => {
                                setEmail(value);
                                clearFieldError(FieldKey.EMAIL);
                            }}
                        />

                        <PasswordInput
                            id="login-password"
                            name="password"
                            label={PASSWORD_LABEL_KEY}
                            placeholder={LOGIN_PASSWORD_PLACEHOLDER_KEY}
                            value={password}
                            autoComplete="current-password"
                            error={fieldErrors[FieldKey.PASSWORD]}
                            required
                            onChange={(value) => {
                                setPassword(value);
                                clearFieldError(FieldKey.PASSWORD);
                            }}
                        />

                        <div class="text-right [&>button]:!text-base-100">
                            <Button
                                type="button"
                                variant={ButtonVariant.LINK}
                                label={LOGIN_FORGOT_PASSWORD_KEY}
                                onClick={controller.onNavigateToForgotPassword}
                            />
                        </div>
                    </div>

                    <div class="space-y-4">
                        <div class="[&>button]:w-full">
                            <Button type="submit" variant={ButtonVariant.PRIMARY} loading={isSubmitting}>
                                <span class="inline-flex items-center gap-2">
                                    {!isSubmitting ? <FingerprintIcon size={24} weight="duotone" /> : null}
                                    <span class="text-button-lg font-semibold">{t(LOGIN_BUTTON_KEY)}</span>
                                </span>
                            </Button>
                        </div>

                        <div class="flex items-center gap-4 pb-4">
                            <span class="h-px flex-1 bg-base-100/40" />
                            <span class="text-body text-base-100">{t(LOGIN_DIVIDER_OR_KEY)}</span>
                            <span class="h-px flex-1 bg-base-100/40" />
                        </div>

                        <div
                            class="[&>button]:w-full [&>button]:!border-base-100/80 [&>button]:!text-base-100"
                            title={t(LOGIN_GOOGLE_COMMING_SOON_KEY)}
                        >
                            <Button type="button" variant={ButtonVariant.OUTLINE} disabled>
                                <span class="inline-flex cursor-not-allowed items-center gap-3">
                                    <img src={googleLogoButton} alt="" class="h-6 w-6 cursor-not-allowed" aria-hidden="true" />
                                    <span class="cursor-not-allowed text-button-lg font-semibold line-through text-stone-500">{t(LOGIN_WITH_GOOGLE_KEY)}</span>
                                </span>
                            </Button>
                        </div>

                        <div class="pt-1 text-center">
                            <span class="text-sm text-base-100">{t(SIGNUP_HINT_KEY)}</span>
                            <Button type="button" variant={ButtonVariant.LINK} label={SIGNUP_ACTION_KEY} onClick={controller.onNavigateToSignup} />
                        </div>
                    </div>
                </Form>
            </div>
        </AuthShell>
    );
}
