import { AuthEvent } from "@shared/enums/auth.enums";
import { ErrorCode } from "@shared/errors/error-codes";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const loginApiMock = vi.fn();
const refreshApiMock = vi.fn();
const logoutApiMock = vi.fn();
const verifyEmailApiMock = vi.fn();
const resendVerificationEmailApiMock = vi.fn();
const requestPasswordResetApiMock = vi.fn();
const resetPasswordApiMock = vi.fn();
const createUserApiMock = vi.fn();
const setAuthRefreshHandlerMock = vi.fn();
const emitAuthEventMock = vi.fn();
const setAuthenticatedMock = vi.fn();
const setRefreshingMock = vi.fn();
const setUnauthenticatedMock = vi.fn();

vi.mock("@/api/auth/auth.api", () => ({
    login: (...args: unknown[]) => loginApiMock(...args),
    refresh: (...args: unknown[]) => refreshApiMock(...args),
    logout: (...args: unknown[]) => logoutApiMock(...args),
    verifyEmail: (...args: unknown[]) => verifyEmailApiMock(...args),
    resendVerificationEmail: (...args: unknown[]) => resendVerificationEmailApiMock(...args),
    requestPasswordReset: (...args: unknown[]) => requestPasswordResetApiMock(...args),
    resetPassword: (...args: unknown[]) => resetPasswordApiMock(...args),
}));

vi.mock("@/api/users/users.api", () => ({
    createUser: (...args: unknown[]) => createUserApiMock(...args),
}));

vi.mock("@/api/http/httpClient", () => ({
    setAuthRefreshHandler: (...args: unknown[]) => setAuthRefreshHandlerMock(...args),
}));

vi.mock("@/state/auth.store", () => ({
    emitAuthEvent: (...args: unknown[]) => emitAuthEventMock(...args),
    setAuthenticated: (...args: unknown[]) => setAuthenticatedMock(...args),
    setRefreshing: (...args: unknown[]) => setRefreshingMock(...args),
    setUnauthenticated: (...args: unknown[]) => setUnauthenticatedMock(...args),
}));

import {
    initializeAuthService,
    login,
    logout,
    refresh,
    requestPasswordReset,
    resendVerificationEmail,
    resetPassword,
    signup,
    verifyEmailToken,
} from "@/services/auth/auth.service";

describe("auth.service", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it("maps API errorCode to an i18n message key and keeps error payload", async () => {
        loginApiMock.mockResolvedValue({
            success: false,
            errorCode: ErrorCode.EMAIL_NOT_VERIFIED,
            error: { canResend: true },
        });

        const result = await login("user@example.com", "wrong");

        expect(result).toMatchObject({
            success: false,
            messageKey: "error.email_not_verified",
            errorCode: ErrorCode.EMAIL_NOT_VERIFIED,
            data: { canResend: true },
            error: { canResend: true },
        });
        expect(setUnauthenticatedMock).toHaveBeenCalledTimes(1);
    });

    it("maps delivery failures to the dedicated auth email message key", async () => {
        requestPasswordResetApiMock.mockResolvedValue({
            success: false,
            errorCode: ErrorCode.EMAIL_DELIVERY_FAILED,
        });

        const result = await requestPasswordReset("user@example.com");

        expect(result).toMatchObject({
            success: false,
            messageKey: "error.email_delivery_failed",
            errorCode: ErrorCode.EMAIL_DELIVERY_FAILED,
        });
    });

    it("returns unexpected error key for an unmapped errorCode", async () => {
        loginApiMock.mockResolvedValue({
            success: false,
            errorCode: "UNMAPPED_ERROR_CODE",
        });

        const result = await login("user@example.com", "wrong");

        expect(result.messageKey).toBe("error.unexpected_error");
        expect(setUnauthenticatedMock).toHaveBeenCalledTimes(1);
    });

    it("uses errorCode mapping instead of legacy message/resource fields", async () => {
        loginApiMock.mockResolvedValue({
            success: false,
            errorCode: ErrorCode.INVALID_CREDENTIALS,
            resource: "error.email_not_verified",
            message: "Credenciais invalidas",
        });

        const result = await login("user@example.com", "wrong");

        expect(result.messageKey).toBe("error.invalid_credentials");
        expect(setUnauthenticatedMock).toHaveBeenCalledTimes(1);
    });

    it("stores token and emits login success on successful login", async () => {
        loginApiMock.mockResolvedValue({
            success: true,
            data: { token: "access-token" },
        });

        const result = await login("user@example.com", "secret");

        expect(result).toEqual({ success: true });
        expect(setAuthenticatedMock).toHaveBeenCalledWith("access-token");
        expect(emitAuthEventMock).toHaveBeenCalledWith(AuthEvent.LOGIN_SUCCESS);
    });

    it("returns verification-required metadata after signup", async () => {
        createUserApiMock.mockResolvedValue({
            success: true,
            data: { id: "user-id", email: "user@example.com" },
        });

        const result = await signup({
            firstName: "User",
            lastName: "Example",
            email: "user@example.com",
            password: "secret123",
        });

        expect(createUserApiMock).toHaveBeenCalledWith({
            firstName: "User",
            lastName: "Example",
            email: "user@example.com",
            password: "secret123",
        });
        expect(result).toEqual({
            success: true,
            data: { id: "user-id", email: "user@example.com" },
            messageKey: "error.email_verification_required",
        });
    });

    it("returns resend verification success message", async () => {
        resendVerificationEmailApiMock.mockResolvedValue({
            success: true,
            data: { sent: true },
        });

        const result = await resendVerificationEmail("user@example.com");

        expect(result).toEqual({
            success: true,
            data: { sent: true },
            messageKey: "auth.verify_email.resend.success.message",
        });
    });

    it("maps verify-email success according to backend state", async () => {
        verifyEmailApiMock.mockResolvedValue({
            success: true,
            data: { verified: true, alreadyVerified: true },
        });

        const result = await verifyEmailToken("token-value");

        expect(result).toEqual({
            success: true,
            data: { verified: true, alreadyVerified: true },
            messageKey: "error.email_already_verified",
        });
    });

    it("returns password reset request success message", async () => {
        requestPasswordResetApiMock.mockResolvedValue({
            success: true,
            data: { sent: true },
        });

        const result = await requestPasswordReset("user@example.com");

        expect(result).toEqual({
            success: true,
            data: { sent: true },
            messageKey: "auth.forgot_password.success.message",
        });
    });

    it("returns password reset success message", async () => {
        resetPasswordApiMock.mockResolvedValue({
            success: true,
            data: { reset: true },
        });

        const result = await resetPassword("token-value", "secret123");

        expect(result).toEqual({
            success: true,
            data: { reset: true },
            messageKey: "auth.reset_password.success.message",
        });
    });

    it("registers refresh handler on initialize", () => {
        initializeAuthService();
        expect(setAuthRefreshHandlerMock).toHaveBeenCalledTimes(1);
        expect(setAuthRefreshHandlerMock).toHaveBeenCalledWith(refresh);
    });

    it("marks refreshing state and returns false when refresh fails", async () => {
        refreshApiMock.mockResolvedValue({ success: false });

        const result = await refresh();

        expect(result).toBe(false);
        expect(setRefreshingMock).toHaveBeenCalledTimes(1);
        expect(setUnauthenticatedMock).toHaveBeenCalledTimes(1);
    });

    it("logs out and emits event", async () => {
        logoutApiMock.mockResolvedValue({ success: true });

        const result = await logout();

        expect(result).toBe(true);
        expect(setUnauthenticatedMock).toHaveBeenCalledTimes(1);
        expect(emitAuthEventMock).toHaveBeenCalledWith(AuthEvent.LOGOUT);
    });
});
