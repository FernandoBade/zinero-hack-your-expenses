import type {
    ForgotPasswordOutput,
    LoginOutput,
    ResetPasswordOutput,
    ResendVerificationEmailOutput,
    VerifyEmailOutput,
} from "@shared/domains/auth/auth.types";
import type { CreateUserInput, CreateUserOutput } from "@shared/domains/user/user.types";
import { AuthEvent } from "@shared/enums/auth.enums";
import { ErrorCode as ErrorCodeValue, type ErrorCode } from "@shared/errors/error-codes";
import type { ValidationErrorPayload } from "@shared/errors/error-payload";
import type { FieldKey } from "@shared/fields/field-keys";
import { errorCodeMap } from "@shared/i18n/mappings/error-code-map";
import type { I18nKey } from "@shared/i18n/types/i18n-key";
import * as authApi from "@/api/auth/auth.api";
import { setAuthRefreshHandler } from "@/api/http/httpClient";
import type { ApiErrorResponse, ApiResponse } from "@/api/http/httpTypes";
import * as usersApi from "@/api/users/users.api";
import { emitAuthEvent, setAuthenticated, setRefreshing, setUnauthenticated } from "@/state/auth.store";

export type AuthFieldErrors = Partial<Record<FieldKey, I18nKey>>;

export interface AuthActionSuccess<T = undefined> {
    readonly success: true;
    readonly data?: T;
    readonly messageKey?: I18nKey;
}

export interface AuthActionFailure<T = unknown> {
    readonly success: false;
    readonly messageKey: I18nKey;
    readonly errorCode?: ErrorCode;
    readonly fieldErrors?: AuthFieldErrors;
    readonly data?: T;
    readonly error?: unknown;
}

export type AuthActionResult<T = undefined, F = unknown> = AuthActionSuccess<T> | AuthActionFailure<F>;

interface VerificationResendFailureData {
    readonly email?: string;
    readonly canResend?: boolean;
}

interface CooldownFailureData {
    readonly cooldownSeconds?: number;
}

function resolveFailureMessageKey<T>(response: ApiResponse<T>): I18nKey {
    if (!response.success) {
        return errorCodeMap[response.errorCode] ?? "error.unexpected_error";
    }

    return "error.unexpected_error";
}

function isValidationErrorPayload(value: unknown): value is ValidationErrorPayload {
    if (typeof value !== "object" || value === null) {
        return false;
    }

    const candidate = value as Partial<ValidationErrorPayload>;
    return typeof candidate.field === "string" && typeof candidate.errorCode === "string";
}

function resolveFieldErrors(response: ApiErrorResponse): AuthFieldErrors | undefined {
    if (response.errorCode !== ErrorCodeValue.VALIDATION_ERROR || !Array.isArray(response.error)) {
        return undefined;
    }

    const fieldErrors = response.error.reduce<AuthFieldErrors>((accumulator, item) => {
        if (!isValidationErrorPayload(item)) {
            return accumulator;
        }

        accumulator[item.field] = errorCodeMap[item.errorCode] ?? "error.unexpected_error";
        return accumulator;
    }, {});

    return Object.keys(fieldErrors).length > 0 ? fieldErrors : undefined;
}

function createUnexpectedFailure<T = unknown>(error?: unknown, data?: T): AuthActionFailure<T> {
    return {
        success: false,
        messageKey: "error.unexpected_error",
        errorCode: ErrorCodeValue.UNEXPECTED_ERROR,
        data,
        error,
    };
}

function resolveFailureResult<TResponse, TFailure = unknown>(response: ApiResponse<TResponse>): AuthActionFailure<TFailure> {
    if (response.success) {
        return createUnexpectedFailure<TFailure>();
    }

    return {
        success: false,
        messageKey: resolveFailureMessageKey(response),
        errorCode: response.errorCode,
        fieldErrors: resolveFieldErrors(response),
        data: response.error as TFailure,
        error: response.error,
    };
}

/**
 * @summary Authenticates credentials and updates auth store with the returned access token.
 */
export async function login(email: string, password: string): Promise<AuthActionResult<void, VerificationResendFailureData>> {
    const response = await authApi.login(email, password);
    const token = response.data?.token;

    if (response.success && typeof token === "string" && token.length > 0) {
        setAuthenticated(token);
        emitAuthEvent(AuthEvent.LOGIN_SUCCESS);
        return { success: true };
    }

    setUnauthenticated();
    return response.success ? createUnexpectedFailure<VerificationResendFailureData>() : resolveFailureResult<LoginOutput, VerificationResendFailureData>(response);
}

/**
 * @summary Creates a new user account and persists the current public UI locale so auth emails follow the signup language.
 */
export async function signup(payload: CreateUserInput): Promise<AuthActionResult<CreateUserOutput, VerificationResendFailureData>> {
    const response = await usersApi.createUser(payload);

    if (response.success) {
        return {
            success: true,
            data: response.data,
            messageKey: "error.email_verification_required",
        };
    }

    return resolveFailureResult<CreateUserOutput, VerificationResendFailureData>(response);
}

/**
 * @summary Requests a new verification email and exposes cooldown data when returned by the backend.
 */
export async function resendVerificationEmail(email: string): Promise<AuthActionResult<ResendVerificationEmailOutput, CooldownFailureData>> {
    const response = await authApi.resendVerificationEmail(email);

    if (response.success) {
        return {
            success: true,
            data: response.data,
            messageKey: "auth.verify_email.resend.success.message",
        };
    }

    return resolveFailureResult<ResendVerificationEmailOutput, CooldownFailureData>(response);
}

/**
 * @summary Validates an email-verification token and reports the resolved verification state.
 */
export async function verifyEmailToken(token: string): Promise<AuthActionResult<VerifyEmailOutput>> {
    const response = await authApi.verifyEmail(token);

    if (response.success) {
        return {
            success: true,
            data: response.data,
            messageKey: response.data?.alreadyVerified
                ? "error.email_already_verified"
                : "error.email_verification_success",
        };
    }

    return resolveFailureResult<VerifyEmailOutput>(response);
}

/**
 * @summary Starts the password-recovery flow and returns a generic success message key.
 */
export async function requestPasswordReset(email: string): Promise<AuthActionResult<ForgotPasswordOutput>> {
    const response = await authApi.requestPasswordReset(email);

    if (response.success) {
        return {
            success: true,
            data: response.data,
            messageKey: "auth.forgot_password.success.message",
        };
    }

    return resolveFailureResult<ForgotPasswordOutput>(response);
}

/**
 * @summary Resets the account password with the supplied token and new credential.
 */
export async function resetPassword(token: string, password: string): Promise<AuthActionResult<ResetPasswordOutput>> {
    const response = await authApi.resetPassword(token, password);

    if (response.success) {
        return {
            success: true,
            data: response.data,
            messageKey: "auth.reset_password.success.message",
        };
    }

    return resolveFailureResult<ResetPasswordOutput>(response);
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



