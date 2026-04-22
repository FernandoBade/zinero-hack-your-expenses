import type { JSX } from "preact";
import { CheckCircleIcon } from "@phosphor-icons/react/ssr";
import { useMemo, useState } from "preact/hooks";
import { useSearchParams } from "wouter-preact";
import { Alert } from "@/components/alert/alert";
import { AuthShell } from "@/components/auth-shell/auth-shell";
import { Button } from "@/components/button/button";
import { Form } from "@/components/form/form";
import { PasswordInput } from "@/components/password-input/password-input";
import { createResetPasswordController } from "@/pages/reset-password/reset-password.controller";
import { t } from "@/utils/i18n/translate";
import { AlertStyle, AlertVariant, ButtonVariant } from "@shared/enums/ui.enums";
import { ErrorCode } from "@shared/errors/error-codes";
import { FieldKey, type FieldKey as FieldKeyType } from "@shared/fields/field-keys";
import type { I18nKey } from "@shared/i18n/types/i18n-key";

const RESET_PASSWORD_TITLE_KEY = "auth.reset_password.title";
const RESET_PASSWORD_SUBTITLE_KEY = "auth.reset_password.subtitle";
const RESET_PASSWORD_SUBMIT_KEY = "auth.reset_password.actions.submit";
const RESET_PASSWORD_SUBMITTING_KEY = "auth.reset_password.actions.submitting";
const RESET_PASSWORD_BACK_KEY = "auth.reset_password.actions.back_to_login";
const RESET_PASSWORD_REQUEST_NEW_LINK_KEY = "auth.reset_password.actions.request_new_link";
const RESET_PASSWORD_SUCCESS_TITLE_KEY = "auth.reset_password.success.title";
const RESET_PASSWORD_SUCCESS_MESSAGE_KEY = "auth.reset_password.success.message";
const RESET_PASSWORD_INVALID_TITLE_KEY = "auth.reset_password.invalid.title";
const RESET_PASSWORD_INVALID_MESSAGE_KEY = "auth.reset_password.invalid.message";
const RESET_PASSWORD_INVALID_TOKEN_KEY = "auth.reset_password.errors.invalid_token";
const RESET_PASSWORD_CONFIRM_PLACEHOLDER_KEY = "auth.reset_password.confirm_password.placeholder";
const PASSWORD_LABEL_KEY = "field.password.label";
const PASSWORD_PLACEHOLDER_KEY = "auth.login.password.placeholder";
const CONFIRM_PASSWORD_LABEL_KEY = "field.confirm_password.label";

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
 * @summary Renders the reset-password page with token validation, form, and success states.
 */
export function ResetPasswordPage(): JSX.Element {
    const [searchParams] = useSearchParams();
    const controller = useMemo(() => createResetPasswordController(), []);
    const token = (searchParams.get("token") ?? "").trim();
    const [password, setPassword] = useState<string>("");
    const [confirmPassword, setConfirmPassword] = useState<string>("");
    const [fieldErrors, setFieldErrors] = useState<Partial<Record<FieldKeyType, I18nKey>>>({});
    const [formError, setFormError] = useState<I18nKey | null>(token.length === 0 ? RESET_PASSWORD_INVALID_TOKEN_KEY : null);
    const [successMessage, setSuccessMessage] = useState<I18nKey | null>(null);
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [hasInvalidToken, setHasInvalidToken] = useState<boolean>(token.length === 0);

    const clearFieldError = (field: FieldKeyType): void => {
        setFieldErrors((currentValue) => removeFieldError(currentValue, field));
    };

    const handleSubmit = async (): Promise<void> => {
        setIsSubmitting(true);
        setFormError(null);
        setSuccessMessage(null);

        const result = await controller.onSubmit(token, password, confirmPassword);

        setIsSubmitting(false);
        if (result.success) {
            setSuccessMessage(result.messageKey ?? RESET_PASSWORD_SUCCESS_MESSAGE_KEY);
            setHasInvalidToken(false);
            return;
        }

        setFieldErrors(result.fieldErrors ?? {});
        setFormError(result.messageKey);
        if (result.errorCode === ErrorCode.EXPIRED_OR_INVALID_TOKEN) {
            setHasInvalidToken(true);
        }
    };

    const showForm = !successMessage && !hasInvalidToken;

    return (
        <AuthShell size="compact" title={RESET_PASSWORD_TITLE_KEY} subtitle={RESET_PASSWORD_SUBTITLE_KEY}>
            <div class="space-y-5">
                {successMessage ? (
                    <Alert variant={AlertVariant.SUCCESS} style={AlertStyle.SOFT} title={RESET_PASSWORD_SUCCESS_TITLE_KEY} message={successMessage} />
                ) : null}

                {hasInvalidToken ? (
                    <Alert variant={AlertVariant.ERROR} style={AlertStyle.OUTLINE} title={RESET_PASSWORD_INVALID_TITLE_KEY} message={RESET_PASSWORD_INVALID_MESSAGE_KEY} />
                ) : formError ? (
                    <Alert variant={AlertVariant.ERROR} style={AlertStyle.OUTLINE} message={formError} />
                ) : null}

                {showForm ? (
                    <Form onSubmit={handleSubmit} disabled={isSubmitting}>
                        <div class="space-y-4">
                            <PasswordInput
                                id="reset-password"
                                name="password"
                                label={PASSWORD_LABEL_KEY}
                                placeholder={PASSWORD_PLACEHOLDER_KEY}
                                value={password}
                                autoComplete="new-password"
                                error={fieldErrors[FieldKey.PASSWORD]}
                                required
                                onChange={(value) => {
                                    setPassword(value);
                                    clearFieldError(FieldKey.PASSWORD);
                                }}
                            />

                            <PasswordInput
                                id="reset-confirm-password"
                                name="confirmPassword"
                                label={CONFIRM_PASSWORD_LABEL_KEY}
                                placeholder={RESET_PASSWORD_CONFIRM_PLACEHOLDER_KEY}
                                value={confirmPassword}
                                autoComplete="new-password"
                                error={fieldErrors[FieldKey.CONFIRM_PASSWORD]}
                                required
                                onChange={(value) => {
                                    setConfirmPassword(value);
                                    clearFieldError(FieldKey.CONFIRM_PASSWORD);
                                }}
                            />

                            <Button type="submit" variant={ButtonVariant.PRIMARY} fullWidth loading={isSubmitting}>
                                {t(isSubmitting ? RESET_PASSWORD_SUBMITTING_KEY : RESET_PASSWORD_SUBMIT_KEY)}
                            </Button>
                        </div>
                    </Form>
                ) : null}

                <div class="space-y-3">
                    {successMessage ? (
                        <Button type="button" variant={ButtonVariant.PRIMARY} fullWidth onClick={controller.onNavigateToLogin}>
                            <span class="inline-flex items-center gap-2">
                                <CheckCircleIcon size={24} weight="regular" />
                                <span class="text-button-lg font-semibold">{t(RESET_PASSWORD_BACK_KEY)}</span>
                            </span>
                        </Button>
                    ) : null}
                    {hasInvalidToken ? (
                        <Button type="button" variant={ButtonVariant.PRIMARY} fullWidth onClick={controller.onNavigateToForgotPassword}>
                            {t(RESET_PASSWORD_REQUEST_NEW_LINK_KEY)}
                        </Button>
                    ) : null}
                    <Button type="button" variant={ButtonVariant.LINK} fullWidth onClick={controller.onNavigateToLogin}>
                        {t(RESET_PASSWORD_BACK_KEY)}
                    </Button>
                </div>
            </div>
        </AuthShell>
    );
}

