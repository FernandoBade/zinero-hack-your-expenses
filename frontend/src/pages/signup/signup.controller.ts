import type { I18nKey } from "@shared/i18n/types/i18n-key";
import type { CreateUserInput, CreateUserOutput } from "@shared/domains/user/user.types";
import { AppRoutePath } from "@shared/enums/routes.enums";
import { ErrorCode } from "@shared/errors/error-codes";
import { FieldKey } from "@shared/fields/field-keys";
import { navigate, replace } from "@/routes/navigation";
import type { AuthActionResult, AuthFieldErrors } from "@/services/auth/auth.service";
import { resendVerificationEmail, signup } from "@/services/auth/auth.service";

const SIGNUP_VALIDATION_KEY = "auth.signup.errors.fix_fields";

function isValidEmail(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export interface SignupFormValue {
    readonly firstName: string;
    readonly lastName: string;
    readonly email: string;
    readonly phone: string;
    readonly phoneError?: I18nKey | null;
    readonly password: string;
    readonly confirmPassword: string;
    readonly acceptedTerms: boolean;
}

export interface SignupController {
    readonly onSubmit: (form: SignupFormValue) => Promise<AuthActionResult<CreateUserOutput, { email?: string; canResend?: boolean; verificationSent?: boolean }>>;
    readonly onResendVerification: (email: string) => Promise<AuthActionResult<unknown, { cooldownSeconds?: number }>>;
    readonly onNavigateToLogin: () => void;
}

function buildSignupFieldErrors(form: SignupFormValue): AuthFieldErrors {
    const fieldErrors: AuthFieldErrors = {};
    const normalizedFirstName = form.firstName.trim();
    const normalizedLastName = form.lastName.trim();
    const normalizedEmail = form.email.trim();

    if (normalizedFirstName.length < 2) {
        fieldErrors[FieldKey.FIRST_NAME] = "error.first_name_too_short";
    }

    if (normalizedLastName.length < 2) {
        fieldErrors[FieldKey.LAST_NAME] = "error.last_name_too_short";
    }

    if (!isValidEmail(normalizedEmail)) {
        fieldErrors[FieldKey.EMAIL] = "error.email_invalid";
    }

    if (form.phoneError) {
        fieldErrors[FieldKey.PHONE] = form.phoneError;
    }

    if (form.password.trim().length < 6) {
        fieldErrors[FieldKey.PASSWORD] = "error.password_too_short";
    }

    if (form.confirmPassword.trim().length === 0) {
        fieldErrors[FieldKey.CONFIRM_PASSWORD] = "error.field_required_generic";
    } else if (form.password !== form.confirmPassword) {
        fieldErrors[FieldKey.CONFIRM_PASSWORD] = "auth.signup.errors.password_mismatch";
    }

    if (!form.acceptedTerms) {
        fieldErrors[FieldKey.TERMS_ACCEPTED] = "auth.signup.errors.accept_terms";
    }

    return fieldErrors;
}

/**
 * @summary Builds signup flows with client validation, resend support, and route transitions.
 */
export function createSignupController(): SignupController {
    const onSubmit = async (form: SignupFormValue): Promise<AuthActionResult<CreateUserOutput, { email?: string; canResend?: boolean; verificationSent?: boolean }>> => {
        const fieldErrors = buildSignupFieldErrors(form);
        if (Object.keys(fieldErrors).length > 0) {
            return {
                success: false,
                messageKey: SIGNUP_VALIDATION_KEY,
                errorCode: ErrorCode.VALIDATION_ERROR,
                fieldErrors,
            };
        }

        const payload: CreateUserInput = {
            firstName: form.firstName.trim(),
            lastName: form.lastName.trim(),
            email: form.email.trim().toLowerCase(),
            password: form.password,
            phone: form.phone.trim().length > 0 ? form.phone.trim() : undefined,
        };

        const result = await signup(payload);
        if (result.success) {
            replace(AppRoutePath.VERIFY_EMAIL, {
                email: payload.email,
                sent: 1,
            });
        }

        return result;
    };

    const onResendVerification = async (email: string): Promise<AuthActionResult<unknown, { cooldownSeconds?: number }>> => {
        const normalizedEmail = email.trim();
        if (!isValidEmail(normalizedEmail)) {
            return {
                success: false,
                messageKey: "error.email_invalid",
                errorCode: ErrorCode.EMAIL_INVALID,
                fieldErrors: {
                    [FieldKey.EMAIL]: "error.email_invalid",
                },
            };
        }

        return resendVerificationEmail(normalizedEmail);
    };

    const onNavigateToLogin = (): void => {
        navigate(AppRoutePath.LOGIN);
    };

    return {
        onSubmit,
        onResendVerification,
        onNavigateToLogin,
    };
}