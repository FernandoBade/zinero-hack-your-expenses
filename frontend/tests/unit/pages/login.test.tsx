// @vitest-environment jsdom

import { render } from "preact";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ErrorCode } from "@shared/errors/error-codes";

const useSearchParamsMock = vi.fn();
const onSubmitMock = vi.fn();
const onResendVerificationMock = vi.fn();
const onNavigateToSignupMock = vi.fn();
const onNavigateToForgotPasswordMock = vi.fn();

vi.mock("wouter-preact", () => ({
    useSearchParams: () => useSearchParamsMock(),
}));

vi.mock("@/pages/login/login.controller", () => ({
    createLoginController: () => ({
        onSubmit: (...args: unknown[]) => onSubmitMock(...args),
        onResendVerification: (...args: unknown[]) => onResendVerificationMock(...args),
        onNavigateToSignup: (...args: unknown[]) => onNavigateToSignupMock(...args),
        onNavigateToForgotPassword: (...args: unknown[]) => onNavigateToForgotPasswordMock(...args),
    }),
}));

vi.mock("@/utils/i18n/translate", () => ({
    t: (key: string, values?: Record<string, unknown>) =>
        values ? `${key} ${JSON.stringify(values)}` : key,
    tOptional: (key?: string) => key,
}));

import { LoginPage } from "@/pages/login/login";

function flushUi(): Promise<void> {
    return Promise.resolve().then(() => undefined).then(() => undefined);
}

describe("LoginPage", () => {
    let container: HTMLDivElement;

    beforeEach(() => {
        vi.clearAllMocks();
        container = document.createElement("div");
        document.body.appendChild(container);
        useSearchParamsMock.mockReturnValue([new URLSearchParams(), vi.fn()]);
    });

    afterEach(() => {
        render(null, container);
        container.remove();
    });

    it("shows the verified-success state from the query string", () => {
        useSearchParamsMock.mockReturnValue([new URLSearchParams("verified=1"), vi.fn()]);

        render(<LoginPage />, container);

        expect(container.textContent).toContain("auth.login.success.verified.title");
        expect(container.textContent).toContain("auth.login.success.verified.message");
    });

    it("renders missing-credential feedback returned by the controller", async () => {
        onSubmitMock.mockResolvedValue({
            success: false,
            messageKey: "auth.login.errors.missing_credentials",
            errorCode: ErrorCode.VALIDATION_ERROR,
            fieldErrors: {
                email: "error.field_required_generic",
                password: "error.field_required_generic",
            },
        });

        render(<LoginPage />, container);

        container.querySelector("form")?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
        await flushUi();

        expect(onSubmitMock).toHaveBeenCalledWith("", "");
        expect(container.textContent).toContain("auth.login.errors.missing_credentials");
        expect(container.textContent).toContain("error.field_required_generic");
    });

    it("does not render unfinished Google sign-in controls", () => {
        render(<LoginPage />, container);

        expect(container.textContent).not.toContain("auth.login.google.continue");
        expect(container.textContent).not.toContain("auth.login.divider.or");
    });

    it("supports resend recovery when login fails with an unverified account", async () => {
        onSubmitMock.mockResolvedValue({
            success: false,
            messageKey: "error.email_not_verified",
            errorCode: ErrorCode.EMAIL_NOT_VERIFIED,
            data: { email: "user@example.com", canResend: true },
        });
        onResendVerificationMock.mockResolvedValue({
            success: true,
            messageKey: "auth.verify_email.resend.success.message",
            data: { sent: true },
        });

        render(<LoginPage />, container);

        container.querySelector("form")?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
        await flushUi();

        expect(container.textContent).toContain("auth.login.not_verified.title");
        expect(container.textContent).toContain("user@example.com");

        const resendButton = Array.from(container.querySelectorAll("button")).find((button) =>
            button.textContent?.includes("auth.verify_email.resend.actions.send")
        );

        resendButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
        await flushUi();

        expect(onResendVerificationMock).toHaveBeenCalledWith("user@example.com");
        expect(container.textContent).toContain("auth.verify_email.resend.success.title");
        expect(container.textContent).toContain("auth.verify_email.resend.success.message");
    });
});
