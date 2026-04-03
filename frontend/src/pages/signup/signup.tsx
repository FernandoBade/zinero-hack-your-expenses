import type { JSX } from "preact";
import { EyeClosedIcon, EyeIcon, UserPlusIcon } from "@phosphor-icons/react";
import { useEffect, useMemo, useState } from "preact/hooks";
import { Alert } from "@/components/alert/alert";
import { AuthShell } from "@/components/auth-shell/auth-shell";
import { Button } from "@/components/button/button";
import { Checkbox } from "@/components/checkbox/checkbox";
import { Form } from "@/components/form/form";
import { FormGrid } from "@/components/form-grid/form-grid";
import { Input } from "@/components/input/input";
import { PhoneInput } from "@/components/input/phone-input";
import { PasswordInput } from "@/components/password-input/password-input";
import { createSignupController } from "@/pages/signup/signup.controller";
import { getLocale } from "@/state/locale.store";
import { t } from "@/utils/i18n/translate";
import { AlertStyle, AlertVariant, ButtonVariant } from "@shared/enums/ui.enums";
import { ErrorCode } from "@shared/errors/error-codes";
import { FieldKey, type FieldKey as FieldKeyType } from "@shared/fields/field-keys";
import type { I18nKey } from "@shared/i18n/types/i18n-key";
import { InputType } from "@shared/enums/input.enums";

const DEFAULT_VERIFICATION_COOLDOWN_SECONDS = 60;
const SIGNUP_TITLE_KEY = "auth.signup.title";
const SIGNUP_SUBTITLE_KEY = "auth.signup.subtitle";
const SIGNUP_FIRST_NAME_PLACEHOLDER_KEY = "auth.signup.first_name.placeholder";
const SIGNUP_LAST_NAME_PLACEHOLDER_KEY = "auth.signup.last_name.placeholder";
const SIGNUP_EMAIL_PLACEHOLDER_KEY = "auth.signup.email.placeholder";
const SIGNUP_CONFIRM_PASSWORD_PLACEHOLDER_KEY = "auth.signup.confirm_password.placeholder";
const FIRST_NAME_LABEL_KEY = "field.first_name.label";
const LAST_NAME_LABEL_KEY = "field.last_name.label";
const EMAIL_LABEL_KEY = "field.email.label";
const PHONE_LABEL_KEY = "field.phone.label";
const PASSWORD_LABEL_KEY = "field.password.label";
const PASSWORD_PLACEHOLDER_KEY = "auth.login.password.placeholder";
const CONFIRM_PASSWORD_LABEL_KEY = "field.confirm_password.label";
const SIGNUP_TERMS_LABEL_KEY = "auth.signup.terms.label";
const SIGNUP_SUBMIT_KEY = "auth.signup.actions.submit";
const SIGNUP_SUBMITTING_KEY = "auth.signup.actions.submitting";
const SIGNUP_LOGIN_TEXT_KEY = "auth.signup.login_prompt.text";
const SIGNUP_LOGIN_ACTION_KEY = "auth.signup.login_prompt.action";
const SIGNUP_NOT_VERIFIED_TITLE_KEY = "auth.signup.not_verified.title";
const SIGNUP_NOT_VERIFIED_MESSAGE_KEY = "auth.signup.not_verified.message";
const SIGNUP_NOT_VERIFIED_MESSAGE_WITH_EMAIL_KEY = "auth.signup.not_verified.message_with_email";
const RESEND_SUCCESS_TITLE_KEY = "auth.verify_email.resend.success.title";
const RESEND_SEND_KEY = "auth.verify_email.resend.actions.send";
const RESEND_SENDING_KEY = "auth.verify_email.resend.actions.sending";
const RESEND_COOLDOWN_KEY = "auth.verify_email.resend.actions.cooldown";

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
 * @summary Renders the signup page following the shared onboarding and verification flow.
 */
export function SignupPage(): JSX.Element {
    const controller = useMemo(() => createSignupController(), []);
    const language = getLocale();
    const [firstName, setFirstName] = useState<string>("");
    const [lastName, setLastName] = useState<string>("");
    const [email, setEmail] = useState<string>("");
    const [phone, setPhone] = useState<string>("");
    const [phoneError, setPhoneError] = useState<I18nKey | null>(null);
    const [password, setPassword] = useState<string>("");
    const [confirmPassword, setConfirmPassword] = useState<string>("");
    const [acceptedTerms, setAcceptedTerms] = useState<boolean>(false);
    const [fieldErrors, setFieldErrors] = useState<Partial<Record<FieldKeyType, I18nKey>>>({});
    const [formError, setFormError] = useState<I18nKey | null>(null);
    const [pendingVerificationEmail, setPendingVerificationEmail] = useState<string | null>(null);
    const [resendError, setResendError] = useState<I18nKey | null>(null);
    const [resendSuccess, setResendSuccess] = useState<I18nKey | null>(null);
    const [cooldown, setCooldown] = useState<number>(0);
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [isResending, setIsResending] = useState<boolean>(false);

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

        const result = await controller.onSubmit({
            firstName,
            lastName,
            email,
            phone,
            phoneError,
            password,
            confirmPassword,
            acceptedTerms,
        });

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
        <AuthShell
            size="wide"
            title={SIGNUP_TITLE_KEY}
            subtitle={SIGNUP_SUBTITLE_KEY}
            logoClassName="max-w-[18rem] sm:max-w-[20rem]"
        >
            <div class="space-y-6">
                {formError ? (
                    <Alert variant={AlertVariant.ERROR} style={AlertStyle.OUTLINE} message={formError} />
                ) : null}

                {pendingVerificationEmail ? (
                    <Alert variant={AlertVariant.WARNING} style={AlertStyle.OUTLINE}>
                        <div class="space-y-1">
                            <p class="text-label font-semibold">{t(SIGNUP_NOT_VERIFIED_TITLE_KEY)}</p>
                            <p class="text-body">
                                {t(
                                    pendingVerificationEmail
                                        ? SIGNUP_NOT_VERIFIED_MESSAGE_WITH_EMAIL_KEY
                                        : SIGNUP_NOT_VERIFIED_MESSAGE_KEY,
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
                            <Alert variant={AlertVariant.SUCCESS} style={AlertStyle.SOFT} title={RESEND_SUCCESS_TITLE_KEY} message={resendSuccess} />
                        ) : null}
                        <div class="mx-auto w-full max-w-sm">
                            <Button type="button" fullWidth loading={isResending} onClick={handleResendVerification}>
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
                    <div class="space-y-5">
                        <FormGrid columns={2}>
                            <Input
                                id="signup-first-name"
                                name="firstName"
                                label={FIRST_NAME_LABEL_KEY}
                                placeholder={SIGNUP_FIRST_NAME_PLACEHOLDER_KEY}
                                type={InputType.TEXT}
                                value={firstName}
                                autoComplete="given-name"
                                error={fieldErrors[FieldKey.FIRST_NAME]}
                                required
                                onChange={(value) => {
                                    setFirstName(value);
                                    clearFieldError(FieldKey.FIRST_NAME);
                                }}
                            />

                            <Input
                                id="signup-last-name"
                                name="lastName"
                                label={LAST_NAME_LABEL_KEY}
                                placeholder={SIGNUP_LAST_NAME_PLACEHOLDER_KEY}
                                type={InputType.TEXT}
                                value={lastName}
                                autoComplete="family-name"
                                error={fieldErrors[FieldKey.LAST_NAME]}
                                required
                                onChange={(value) => {
                                    setLastName(value);
                                    clearFieldError(FieldKey.LAST_NAME);
                                }}
                            />

                            <Input
                                id="signup-email"
                                name="email"
                                label={EMAIL_LABEL_KEY}
                                placeholder={SIGNUP_EMAIL_PLACEHOLDER_KEY}
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

                            <PhoneInput
                                id="signup-phone"
                                name="phone"
                                label={PHONE_LABEL_KEY}
                                canonicalValue={phone}
                                language={language}
                                autoComplete="tel"
                                error={fieldErrors[FieldKey.PHONE]}
                                validateIncomplete
                                onValueChange={(value) => {
                                    setPhone(value.canonicalValue);
                                    setPhoneError(value.error ?? null);
                                    clearFieldError(FieldKey.PHONE);
                                }}
                                onValueBlur={(value) => {
                                    setPhoneError(value.error ?? null);
                                }}
                            />

                            <PasswordInput
                                id="signup-password"
                                name="password"
                                label={PASSWORD_LABEL_KEY}
                                placeholder={PASSWORD_PLACEHOLDER_KEY}
                                value={password}
                                autoComplete="new-password"
                                error={fieldErrors[FieldKey.PASSWORD]}
                                required
                                visibleIcon={<EyeClosedIcon size={22} weight="regular" />}
                                hiddenIcon={<EyeIcon size={22} weight="regular" />}
                                onChange={(value) => {
                                    setPassword(value);
                                    clearFieldError(FieldKey.PASSWORD);
                                }}
                            />

                            <PasswordInput
                                id="signup-confirm-password"
                                name="confirmPassword"
                                label={CONFIRM_PASSWORD_LABEL_KEY}
                                placeholder={SIGNUP_CONFIRM_PASSWORD_PLACEHOLDER_KEY}
                                value={confirmPassword}
                                autoComplete="new-password"
                                error={fieldErrors[FieldKey.CONFIRM_PASSWORD]}
                                required
                                visibleIcon={<EyeClosedIcon size={22} weight="regular" />}
                                hiddenIcon={<EyeIcon size={22} weight="regular" />}
                                onChange={(value) => {
                                    setConfirmPassword(value);
                                    clearFieldError(FieldKey.CONFIRM_PASSWORD);
                                }}
                            />
                        </FormGrid>

                        <Checkbox
                            id="signup-terms"
                            name="termsAccepted"
                            label={SIGNUP_TERMS_LABEL_KEY}
                            checked={acceptedTerms}
                            error={fieldErrors[FieldKey.TERMS_ACCEPTED]}
                            labelClassName="font-medium text-base-100"
                            onChange={(checked) => {
                                setAcceptedTerms(checked);
                                clearFieldError(FieldKey.TERMS_ACCEPTED);
                            }}
                        />

                        <div class="mx-auto w-full max-w-sm">
                            <Button type="submit" variant={ButtonVariant.PRIMARY} fullWidth loading={isSubmitting}>
                                <span class="inline-flex items-center gap-2">
                                    {!isSubmitting ? <UserPlusIcon size={28} weight="regular" /> : null}
                                    <span class="text-button-lg font-semibold">{t(isSubmitting ? SIGNUP_SUBMITTING_KEY : SIGNUP_SUBMIT_KEY)}</span>
                                </span>
                            </Button>
                        </div>
                    </div>
                </Form>

                <div class="pt-1 text-center">
                    <span class="text-sm text-base-100">{t(SIGNUP_LOGIN_TEXT_KEY)}</span>
                    <Button type="button" variant={ButtonVariant.LINK} label={SIGNUP_LOGIN_ACTION_KEY} onClick={controller.onNavigateToLogin} />
                </div>
            </div>
        </AuthShell>
    );
}
