// @vitest-environment jsdom

import { render } from "preact";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Language } from "@shared/enums/language.enums";
import { ErrorCode } from "@shared/errors/error-codes";

const onSubmitMock = vi.fn();
const onResendVerificationMock = vi.fn();
const onNavigateToLoginMock = vi.fn();

vi.mock("@/pages/signup/signup.controller", () => ({
    createSignupController: () => ({
        onSubmit: (...args: unknown[]) => onSubmitMock(...args),
        onResendVerification: (...args: unknown[]) => onResendVerificationMock(...args),
        onNavigateToLogin: (...args: unknown[]) => onNavigateToLoginMock(...args),
    }),
}));

vi.mock("@/state/locale.store", () => ({
    getLocale: () => Language.EN_US,
}));

vi.mock("@/utils/i18n/translate", () => ({
    t: (key: string, values?: Record<string, unknown>) =>
        values ? `${key} ${JSON.stringify(values)}` : key,
    tOptional: (key?: string) => key,
}));

import { SignupPage } from "@/pages/signup/signup";

function flushUi(): Promise<void> {
    return Promise.resolve().then(() => undefined).then(() => undefined);
}

describe("SignupPage", () => {
    let container: HTMLDivElement;

    beforeEach(() => {
        vi.clearAllMocks();
        container = document.createElement("div");
        document.body.appendChild(container);
    });

    afterEach(() => {
        render(null, container);
        container.remove();
    });

    it("shows verification recovery and resend feedback for an existing unverified account", async () => {
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

        render(<SignupPage />, container);

        container.querySelector("form")?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
        await flushUi();

        expect(container.textContent).toContain("auth.signup.not_verified.title");
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

    it("keeps login navigation as the secondary action", () => {
        render(<SignupPage />, container);

        const loginButton = Array.from(container.querySelectorAll("button")).find((button) =>
            button.textContent?.includes("auth.signup.login_prompt.action")
        );

        loginButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));

        expect(onNavigateToLoginMock).toHaveBeenCalledTimes(1);
    });
});
