// @vitest-environment jsdom

import { render } from "preact";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const onSubmitMock = vi.fn();
const onNavigateToLoginMock = vi.fn();

vi.mock("@/pages/forgot-password/forgot-password.controller", () => ({
    createForgotPasswordController: () => ({
        onSubmit: (...args: unknown[]) => onSubmitMock(...args),
        onNavigateToLogin: (...args: unknown[]) => onNavigateToLoginMock(...args),
    }),
}));

vi.mock("@/utils/i18n/translate", () => ({
    t: (key: string, values?: Record<string, unknown>) =>
        values ? `${key} ${JSON.stringify(values)}` : key,
    tOptional: (key?: string) => key,
}));

import { ForgotPasswordPage } from "@/pages/forgot-password/forgot-password";

function flushUi(): Promise<void> {
    return Promise.resolve().then(() => undefined).then(() => undefined);
}

describe("ForgotPasswordPage", () => {
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

    it("shows the recovery success state and follow-up guidance", async () => {
        onSubmitMock.mockResolvedValue({
            success: true,
            messageKey: "auth.forgot_password.success.message",
            data: { sent: true },
        });

        render(<ForgotPasswordPage />, container);

        container.querySelector("form")?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
        await flushUi();

        expect(container.textContent).toContain("auth.forgot_password.success.title");
        expect(container.textContent).toContain("auth.forgot_password.success.message");
        expect(container.textContent).toContain("auth.forgot_password.instructions.primary");
        expect(container.textContent).toContain("auth.forgot_password.instructions.secondary");
        expect(container.querySelector("form")).toBeNull();
    });

    it("keeps login navigation available", () => {
        render(<ForgotPasswordPage />, container);

        const loginButton = Array.from(container.querySelectorAll("button")).find((button) =>
            button.textContent?.includes("auth.forgot_password.actions.back_to_login")
        );

        loginButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));

        expect(onNavigateToLoginMock).toHaveBeenCalledTimes(1);
    });
});
