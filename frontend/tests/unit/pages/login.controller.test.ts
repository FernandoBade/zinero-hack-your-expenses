import { AppRoutePath } from "@shared/enums/routes.enums";
import { ErrorCode } from "@shared/errors/error-codes";
import { beforeEach, describe, expect, it, vi } from "vitest";

const navigateMock = vi.fn();
const loginMock = vi.fn();
const resendVerificationEmailMock = vi.fn();

vi.mock("@/routes/navigation", () => ({
    navigate: (...args: unknown[]) => navigateMock(...args),
}));

vi.mock("@/services/auth/auth.service", () => ({
    login: (...args: unknown[]) => loginMock(...args),
    resendVerificationEmail: (...args: unknown[]) => resendVerificationEmailMock(...args),
}));

import { createLoginController } from "@/pages/login/login.controller";

describe("login.controller", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("navigates to dashboard on successful login", async () => {
        loginMock.mockResolvedValue({
            success: true,
        });

        const controller = createLoginController();
        const result = await controller.onSubmit("user@example.com", "secret");

        expect(loginMock).toHaveBeenCalledWith("user@example.com", "secret");
        expect(result).toEqual({ success: true });
        expect(navigateMock).toHaveBeenCalledWith(AppRoutePath.DASHBOARD);
    });

    it("returns validation feedback when credentials are missing", async () => {
        const controller = createLoginController();
        const result = await controller.onSubmit("", "");

        expect(loginMock).not.toHaveBeenCalled();
        expect(result).toMatchObject({
            success: false,
            messageKey: "auth.login.errors.missing_credentials",
            errorCode: ErrorCode.VALIDATION_ERROR,
            fieldErrors: {
                email: "error.field_required_generic",
                password: "error.field_required_generic",
            },
        });
        expect(navigateMock).not.toHaveBeenCalled();
    });

    it("preserves unverified-account metadata from the auth service", async () => {
        loginMock.mockResolvedValue({
            success: false,
            messageKey: "error.email_not_verified",
            errorCode: ErrorCode.EMAIL_NOT_VERIFIED,
            data: { email: "user@example.com", canResend: true },
        });

        const controller = createLoginController();
        const result = await controller.onSubmit("user@example.com", "wrong");

        expect(result).toMatchObject({
            success: false,
            messageKey: "error.email_not_verified",
            errorCode: ErrorCode.EMAIL_NOT_VERIFIED,
            data: { email: "user@example.com", canResend: true },
        });
        expect(navigateMock).not.toHaveBeenCalled();
    });

    it("validates resend target email before calling the API", async () => {
        const controller = createLoginController();
        const result = await controller.onResendVerification("invalid-email");

        expect(resendVerificationEmailMock).not.toHaveBeenCalled();
        expect(result).toMatchObject({
            success: false,
            messageKey: "error.email_invalid",
            errorCode: ErrorCode.EMAIL_INVALID,
            fieldErrors: {
                email: "error.email_invalid",
            },
        });
    });

    it("delegates resend verification when the email is valid", async () => {
        resendVerificationEmailMock.mockResolvedValue({
            success: true,
            messageKey: "error.email_verification_requested",
            data: { sent: true },
        });

        const controller = createLoginController();
        const result = await controller.onResendVerification(" user@example.com ");

        expect(resendVerificationEmailMock).toHaveBeenCalledWith("user@example.com");
        expect(result).toEqual({
            success: true,
            messageKey: "error.email_verification_requested",
            data: { sent: true },
        });
    });

    it("navigates to signup", () => {
        const controller = createLoginController();

        controller.onNavigateToSignup();

        expect(navigateMock).toHaveBeenCalledWith(AppRoutePath.SIGNUP);
    });

    it("navigates to forgot-password", () => {
        const controller = createLoginController();

        controller.onNavigateToForgotPassword();

        expect(navigateMock).toHaveBeenCalledWith(AppRoutePath.FORGOT_PASSWORD);
    });
});
