import { AuthEvent } from "@shared/enums/auth.enums";
import { errorCodeMap } from "@shared/i18n/mappings/error-code-map";
import type { I18nKey } from "@shared/i18n/types/i18n-key";
import * as authApi from "@/api/auth/auth.api";
import type { ApiResponse } from "@/api/http/httpTypes";
import { setAuthRefreshHandler } from "@/api/http/httpClient";
import { emitAuthEvent, setAuthenticated, setRefreshing, setUnauthenticated } from "@/state/auth.store";

function resolveFailureMessageKey<T>(response: ApiResponse<T>): I18nKey {
    if (!response.success) {
        return errorCodeMap[response.errorCode] ?? "error.unexpected_error";
    }

    return "error.unexpected_error";
}

export interface AuthLoginResult {
    success: boolean;
    messageKey?: I18nKey;
    error?: unknown;
}

/**
 * @summary Authenticates credentials and updates auth store with the returned access token.
 */
export async function login(email: string, password: string): Promise<AuthLoginResult> {
    const response = await authApi.login(email, password);
    const token = response.data?.token;

    if (response.success && typeof token === "string" && token.length > 0) {
        setAuthenticated(token);
        emitAuthEvent(AuthEvent.LOGIN_SUCCESS);
        return { success: true };
    }

    setUnauthenticated();
    return {
        success: false,
        messageKey: resolveFailureMessageKey(response),
        error: response.error,
    };
}

/**
 * @summary Refreshes the access token and updates auth state according to refresh outcome.
 */
export async function refresh(): Promise<boolean> {
    setRefreshing();

    const response = await authApi.refresh();
    const token = response.data?.token;

    if (response.success && typeof token === "string" && token.length > 0) {
        setAuthenticated(token);
        return true;
    }

    setUnauthenticated();
    return false;
}

/**
 * @summary Invalidates the current session and clears authentication state.
 */
export async function logout(): Promise<boolean> {
    const response = await authApi.logout();
    setUnauthenticated();
    emitAuthEvent(AuthEvent.LOGOUT);
    return response.success;
}

/**
 * @summary Wires auth refresh integration between the HTTP client and auth service.
 */
export function initializeAuthService(): void {
    setAuthRefreshHandler(refresh);
}
