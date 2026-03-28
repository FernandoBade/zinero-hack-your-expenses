import { AppRoutePath } from "@shared/enums/routes.enums";
import { ErrorCode } from "@shared/errors/error-codes";
import { FieldKey } from "@shared/fields/field-keys";
import { navigate, replace } from "@/routes/navigation";
import type { AuthActionResult } from "@/services/auth/auth.service";
import { resendVerificationEmail, verifyEmailToken } from "@/services/auth/auth.service";

function isValidEmail(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export interface VerifyEmailController {
    readonly onVerifyToken: (token: string) => Promise<AuthActionResult<{ verified: true; alreadyVerified?: boolean }>>;
    readonly onResendVerification: (email: string) => Promise<AuthActionResult<unknown, { cooldownSeconds?: number }>>;
    readonly onNavigateToLogin: (verified?: boolean) => void;
}

/**
 * @summary Builds email-verification flows including token validation, resend, and login redirects.
 */
export function createVerifyEmailController(): VerifyEmailController {
    const onVerifyToken = async (token: string): Promise<AuthActionResult<{ verified: true; alreadyVerified?: boolean }>> => {
        const normalizedToken = token.trim();
        if (normalizedToken.length === 0) {
            return {
                success: false,
                messageKey: "auth.verify_email.status.invalid.message",
                errorCode: ErrorCode.EXPIRED_OR_INVALID_TOKEN,
            };
        }

        return verifyEmailToken(normalizedToken);
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

    const onNavigateToLogin = (verified = false): void => {
        if (verified) {
            replace(AppRoutePath.LOGIN, { verified: 1 });
            return;
        }

        navigate(AppRoutePath.LOGIN);
    };

    return {
        onVerifyToken,
        onResendVerification,
        onNavigateToLogin,
    };
}