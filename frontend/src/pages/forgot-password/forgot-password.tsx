import type { JSX } from "preact";
import { PaperPlaneTiltIcon } from "@phosphor-icons/react/ssr";
import { useMemo, useState } from "preact/hooks";
import { Alert } from "@/components/alert/alert";
import { AuthShell } from "@/components/auth-shell/auth-shell";
import { Button } from "@/components/button/button";
import { Form } from "@/components/form/form";
import { Input } from "@/components/input/input";
import { createForgotPasswordController } from "@/pages/forgot-password/forgot-password.controller";
import { t } from "@/utils/i18n/translate";
import { AlertStyle, AlertVariant, ButtonVariant } from "@shared/enums/ui.enums";
import { FieldKey, type FieldKey as FieldKeyType } from "@shared/fields/field-keys";
import { InputType } from "@shared/enums/input.enums";
import type { I18nKey } from "@shared/i18n/types/i18n-key";

const FORGOT_PASSWORD_TITLE_KEY = "auth.forgot_password.title";
const FORGOT_PASSWORD_SUBTITLE_KEY = "auth.forgot_password.subtitle";
const FORGOT_PASSWORD_SUBMIT_KEY = "auth.forgot_password.actions.submit";
const FORGOT_PASSWORD_SUBMITTING_KEY = "auth.forgot_password.actions.submitting";
const FORGOT_PASSWORD_BACK_KEY = "auth.forgot_password.actions.back_to_login";
const FORGOT_PASSWORD_SUCCESS_TITLE_KEY = "auth.forgot_password.success.title";
const FORGOT_PASSWORD_SUCCESS_MESSAGE_KEY = "auth.forgot_password.success.message";
const FORGOT_PASSWORD_INSTRUCTION_PRIMARY_KEY = "auth.forgot_password.instructions.primary";
const FORGOT_PASSWORD_INSTRUCTION_SECONDARY_KEY = "auth.forgot_password.instructions.secondary";
const LOGIN_EMAIL_PLACEHOLDER_KEY = "auth.login.email.placeholder";
const EMAIL_LABEL_KEY = "field.email.label";

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
 * @summary Renders the forgot-password page with request and success states.
 */
export function ForgotPasswordPage(): JSX.Element {
    const controller = useMemo(() => createForgotPasswordController(), []);
    const [email, setEmail] = useState<string>("");
    const [fieldErrors, setFieldErrors] = useState<Partial<Record<FieldKeyType, I18nKey>>>({});
    const [formError, setFormError] = useState<I18nKey | null>(null);
    const [successMessage, setSuccessMessage] = useState<I18nKey | null>(null);
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

    const clearFieldError = (field: FieldKeyType): void => {
        setFieldErrors((currentValue) => removeFieldError(currentValue, field));
    };

    const handleSubmit = async (): Promise<void> => {
        setIsSubmitting(true);
        setFormError(null);
        setSuccessMessage(null);

        const result = await controller.onSubmit(email);

        setIsSubmitting(false);
        if (result.success) {
            setSuccessMessage(result.messageKey ?? FORGOT_PASSWORD_SUCCESS_MESSAGE_KEY);
            return;
        }

        setFieldErrors(result.fieldErrors ?? {});
        setFormError(result.messageKey);
    };

    return (
        <AuthShell size="compact" title={FORGOT_PASSWORD_TITLE_KEY} subtitle={FORGOT_PASSWORD_SUBTITLE_KEY}>
            <div class="space-y-5">
                {formError ? (
                    <Alert variant={AlertVariant.ERROR} style={AlertStyle.OUTLINE} message={formError} />
                ) : null}

                {successMessage ? (
                    <Alert variant={AlertVariant.SUCCESS} style={AlertStyle.SOFT} title={FORGOT_PASSWORD_SUCCESS_TITLE_KEY} message={successMessage} />
                ) : null}

                {successMessage ? (
                    <div class="space-y-2">
                        <p class="text-body text-base-100">{t(FORGOT_PASSWORD_INSTRUCTION_PRIMARY_KEY)}</p>
                        <p class="text-body text-base-100">{t(FORGOT_PASSWORD_INSTRUCTION_SECONDARY_KEY)}</p>
                    </div>
                ) : (
                    <Form onSubmit={handleSubmit} disabled={isSubmitting}>
                        <div class="space-y-4">
                            <Input
                                id="forgot-password-email"
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

                            <Button type="submit" variant={ButtonVariant.PRIMARY} fullWidth loading={isSubmitting}>
                                <span class="inline-flex items-center gap-2">
                                    {!isSubmitting ? <PaperPlaneTiltIcon size={24} weight="regular" /> : null}
                                    <span class="text-button-lg font-semibold">{t(isSubmitting ? FORGOT_PASSWORD_SUBMITTING_KEY : FORGOT_PASSWORD_SUBMIT_KEY)}</span>
                                </span>
                            </Button>
                        </div>
                    </Form>
                )}

                <Button type="button" variant={ButtonVariant.LINK} fullWidth onClick={controller.onNavigateToLogin}>
                    {t(FORGOT_PASSWORD_BACK_KEY)}
                </Button>
            </div>
        </AuthShell>
    );
}

