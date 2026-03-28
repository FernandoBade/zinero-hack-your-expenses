import { AppRoutePath } from "@shared/enums/routes.enums";
import type { I18nKey } from "@shared/i18n/types/i18n-key";
import { navigate } from "@/routes/navigation";
import { login } from "@/services/auth/auth.service";

const LOGIN_ERROR_FALLBACK_MESSAGE = 'error.invalid_credentials';

export interface LoginControllerDependencies {
    readonly setError: (value: I18nKey | null) => void;
}

export interface LoginController {
    readonly onSubmit: (email: string, password: string) => Promise<void>;
    readonly onNavigateToSignup: () => void;
    readonly onNavigateToForgotPassword: () => void;
}

/**
 * @summary Builds login submit flow with validation, auth calls, and navigation.
 */
export function createLoginController(dependencies: LoginControllerDependencies): LoginController {
    const onSubmit = async (email: string, password: string): Promise<void> => {
        dependencies.setError(null);

        const result = await login(email, password);
        if (result.success) {
            navigate(AppRoutePath.DASHBOARD);
            return;
        }

        dependencies.setError(result.messageKey ?? LOGIN_ERROR_FALLBACK_MESSAGE);
    };

    const onNavigateToSignup = (): void => {
        navigate(AppRoutePath.SIGNUP);
    };

    const onNavigateToForgotPassword = (): void => {
        navigate(AppRoutePath.FORGOT_PASSWORD);
    };

    return {
        onSubmit,
        onNavigateToSignup,
        onNavigateToForgotPassword,
    };
}
