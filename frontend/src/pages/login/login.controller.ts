import { AppRoutePath } from "@shared/enums/routes.enums";
import { ErrorCode } from "@shared/errors/error-codes";
import { FieldKey } from "@shared/fields/field-keys";
import { navigate } from "@/routes/navigation";
import type { AuthActionResult, AuthFieldErrors } from "@/services/auth/auth.service";
import { login, resendVerificationEmail } from "@/services/auth/auth.service";

const LOGIN_VALIDATION_KEY = "auth.login.errors.missing_credentials";

interface VerificationResendFailureData {
    readonly email?: string;
    readonly canResend?: boolean;
}

function isValidEmail(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function buildLoginFieldErrors(email: string, password: string): AuthFieldErrors {
    const fieldErrors: AuthFieldErrors = {};

    if (email.trim().length === 0) {
        fieldErrors[FieldKey.EMAIL] = "error.field_required_generic";
    }

    if (password.trim().length === 0) {
        fieldErrors[FieldKey.PASSWORD] = "error.field_required_generic";
    }

    return fieldErrors;
}

export interface LoginController {
    readonly onSubmit: (email: string, password: string) => Promise<AuthActionResult<void, VerificationResendFailureData>>;
    readonly onResendVerification: (email: string) => Promise<AuthActionResult<unknown, { cooldownSeconds?: number }>>;
    readonly onNavigateToSignup: () => void;
    readonly onNavigateToForgotPassword: () => void;
}

/**
 * @summary Builds login flows with validation, auth calls, resend support, and navigation.
 */
export function createLoginController(): LoginController {
    const onSubmit = async (email: string, password: string): Promise<AuthActionResult<void, VerificationResendFailureData>> => {
        const fieldErrors = buildLoginFieldErrors(email, password);
        if (Object.keys(fieldErrors).length > 0) {
            return {
                success: false,
                messageKey: LOGIN_VALIDATION_KEY,
                errorCode: ErrorCode.VALIDATION_ERROR,
                fieldErrors,
            };
        }

        const result = await login(email.trim(), password);
        if (result.success) {
            navigate(AppRoutePath.DASHBOARD);
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

    const onNavigateToSignup = (): void => {
        navigate(AppRoutePath.SIGNUP);
    };

    const onNavigateToForgotPassword = (): void => {
        navigate(AppRoutePath.FORGOT_PASSWORD);
    };

    return {
        onSubmit,
        onResendVerification,
        onNavigateToSignup,
        onNavigateToForgotPassword,
    };
}
