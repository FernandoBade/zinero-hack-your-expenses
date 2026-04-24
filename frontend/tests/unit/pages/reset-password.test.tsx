// @vitest-environment jsdom

import { render } from "preact";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const useSearchParamsMock = vi.fn();
const onSubmitMock = vi.fn();
const onNavigateToLoginMock = vi.fn();
const onNavigateToForgotPasswordMock = vi.fn();

vi.mock("wouter-preact", () => ({
    useSearchParams: () => useSearchParamsMock(),
}));

vi.mock("@/pages/reset-password/reset-password.controller", () => ({
    createResetPasswordController: () => ({
        onSubmit: (...args: unknown[]) => onSubmitMock(...args),
        onNavigateToLogin: (...args: unknown[]) => onNavigateToLoginMock(...args),
        onNavigateToForgotPassword: (...args: unknown[]) => onNavigateToForgotPasswordMock(...args),
    }),
}));

vi.mock("@/utils/i18n/translate", () => ({
    t: (key: string, values?: Record<string, unknown>) =>
        values ? `${key} ${JSON.stringify(values)}` : key,
    tOptional: (key?: string) => key,
}));

import { ResetPasswordPage } from "@/pages/reset-password/reset-password";

function flushUi(): Promise<void> {
    return Promise.resolve().then(() => undefined).then(() => undefined);
}

describe("ResetPasswordPage", () => {
    let container: HTMLDivElement;

    beforeEach(() => {
        vi.clearAllMocks();
        container = document.createElement("div");
        document.body.appendChild(container);
        useSearchParamsMock.mockReturnValue([new URLSearchParams("token=reset-token"), vi.fn()]);
    });

    afterEach(() => {
        render(null, container);
        container.remove();
    });

    it("shows invalid-link recovery when no token is present", () => {
        useSearchParamsMock.mockReturnValue([new URLSearchParams(), vi.fn()]);

        render(<ResetPasswordPage />, container);

        expect(container.textContent).toContain("auth.reset_password.invalid.title");
        expect(container.textContent).toContain("auth.reset_password.invalid.message");

        const requestNewLinkButton = Array.from(container.querySelectorAll("button")).find((button) =>
            button.textContent?.includes("auth.reset_password.actions.request_new_link")
        );

        requestNewLinkButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));

        expect(onNavigateToForgotPasswordMock).toHaveBeenCalledTimes(1);
    });

    it("shows success state with one login action after password reset", async () => {
        onSubmitMock.mockResolvedValue({
            success: true,
            messageKey: "auth.reset_password.success.message",
            data: { reset: true },
        });

        render(<ResetPasswordPage />, container);

        container.querySelector("form")?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
        await flushUi();

        expect(onSubmitMock).toHaveBeenCalledWith("reset-token", "", "");
        expect(container.textContent).toContain("auth.reset_password.success.title");
        expect(container.textContent).toContain("auth.reset_password.success.message");
        expect(container.querySelector("form")).toBeNull();

        const loginButtons = Array.from(container.querySelectorAll("button")).filter((button) =>
            button.textContent?.includes("auth.reset_password.actions.back_to_login")
        );

        expect(loginButtons).toHaveLength(1);

        loginButtons[0]?.dispatchEvent(new MouseEvent("click", { bubbles: true }));

        expect(onNavigateToLoginMock).toHaveBeenCalledTimes(1);
    });
});
