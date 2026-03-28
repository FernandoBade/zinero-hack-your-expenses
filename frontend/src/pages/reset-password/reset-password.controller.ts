import { AppRoutePath } from "@shared/enums/routes.enums";
import { ErrorCode } from "@shared/errors/error-codes";
import { FieldKey } from "@shared/fields/field-keys";
import { navigate } from "@/routes/navigation";
import type { AuthActionResult, AuthFieldErrors } from "@/services/auth/auth.service";
import { resetPassword } from "@/services/auth/auth.service";

const RESET_PASSWORD_VALIDATION_KEY = "auth.reset_password.errors.fix_fields";

export interface ResetPasswordController {
    readonly onSubmit: (token: string, password: string, confirmPassword: string) => Promise<AuthActionResult<{ reset: true }>>;
    readonly onNavigateToLogin: () => void;
    readonly onNavigateToForgotPassword: () => void;
}

function buildResetPasswordFieldErrors(password: string, confirmPassword: string): AuthFieldErrors {
    const fieldErrors: AuthFieldErrors = {};

    if (password.trim().length < 6) {
        fieldErrors[FieldKey.PASSWORD] = "error.password_too_short";
    }

    if (confirmPassword.trim().length === 0) {
        fieldErrors[FieldKey.CONFIRM_PASSWORD] = "error.field_required_generic";
    } else if (password !== confirmPassword) {
        fieldErrors[FieldKey.CONFIRM_PASSWORD] = "auth.reset_password.errors.password_mismatch";
    }

    return fieldErrors;
}

/**
 * @summary Builds reset-password flows with token validation, password checks, and recovery navigation.
 */
export function createResetPasswordController(): ResetPasswordController {
    const onSubmit = async (token: string, password: string, confirmPassword: string): Promise<AuthActionResult<{ reset: true }>> => {
        const normalizedToken = token.trim();
        if (normalizedToken.length === 0) {
            return {
                success: false,
                messageKey: "auth.reset_password.errors.invalid_token",
                errorCode: ErrorCode.EXPIRED_OR_INVALID_TOKEN,
            };
        }

        const fieldErrors = buildResetPasswordFieldErrors(password, confirmPassword);
        if (Object.keys(fieldErrors).length > 0) {
            return {
                success: false,
                messageKey: RESET_PASSWORD_VALIDATION_KEY,
                errorCode: ErrorCode.VALIDATION_ERROR,
                fieldErrors,
            };
        }

        return resetPassword(normalizedToken, password);
    };

    const onNavigateToLogin = (): void => {
        navigate(AppRoutePath.LOGIN);
    };

    const onNavigateToForgotPassword = (): void => {
        navigate(AppRoutePath.FORGOT_PASSWORD);
    };

    return {
        onSubmit,
        onNavigateToLogin,
        onNavigateToForgotPassword,
    };
}