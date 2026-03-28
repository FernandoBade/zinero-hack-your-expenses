import { AppRoutePath } from "@shared/enums/routes.enums";
import { ErrorCode } from "@shared/errors/error-codes";
import { FieldKey } from "@shared/fields/field-keys";
import { navigate } from "@/routes/navigation";
import type { AuthActionResult } from "@/services/auth/auth.service";
import { requestPasswordReset } from "@/services/auth/auth.service";

function isValidEmail(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export interface ForgotPasswordController {
    readonly onSubmit: (email: string) => Promise<AuthActionResult<{ sent: true }>>;
    readonly onNavigateToLogin: () => void;
}

/**
 * @summary Builds forgot-password flows with validation and navigation back to login.
 */
export function createForgotPasswordController(): ForgotPasswordController {
    const onSubmit = async (email: string): Promise<AuthActionResult<{ sent: true }>> => {
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

        return requestPasswordReset(normalizedEmail);
    };

    const onNavigateToLogin = (): void => {
        navigate(AppRoutePath.LOGIN);
    };

    return {
        onSubmit,
        onNavigateToLogin,
    };
}