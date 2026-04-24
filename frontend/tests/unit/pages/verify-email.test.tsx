// @vitest-environment jsdom

import { render } from "preact";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ErrorCode } from "@shared/errors/error-codes";

const useSearchParamsMock = vi.fn();
const onVerifyTokenMock = vi.fn();
const onResendVerificationMock = vi.fn();
const onNavigateToLoginMock = vi.fn();

vi.mock("wouter-preact", () => ({
    useSearchParams: () => useSearchParamsMock(),
}));

vi.mock("@/pages/verify-email/verify-email.controller", () => ({
    createVerifyEmailController: () => ({
        onVerifyToken: (...args: unknown[]) => onVerifyTokenMock(...args),
        onResendVerification: (...args: unknown[]) => onResendVerificationMock(...args),
        onNavigateToLogin: (...args: unknown[]) => onNavigateToLoginMock(...args),
    }),
}));

vi.mock("@/utils/i18n/translate", () => ({
    t: (key: string, values?: Record<string, unknown>) =>
        values ? `${key} ${JSON.stringify(values)}` : key,
    tOptional: (key?: string) => key,
}));

import { VerifyEmailPage } from "@/pages/verify-email/verify-email";

function flushUi(): Promise<void> {
    return new Promise((resolve) => {
        globalThis.setTimeout(resolve, 20);
    });
}

describe("VerifyEmailPage", () => {
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

    it("hides guidance and resend controls after successful verification", async () => {
        useSearchParamsMock.mockReturnValue([new URLSearchParams("token=valid-token"), vi.fn()]);
        onVerifyTokenMock.mockResolvedValue({
            success: true,
            data: { verified: true },
        });

        render(<VerifyEmailPage />, container);
        await flushUi();
        await flushUi();

        expect(onVerifyTokenMock).toHaveBeenCalledWith("valid-token");
        expect(container.textContent).toContain("auth.verify_email.status.success.title");
        expect(container.textContent).not.toContain("auth.verify_email.tips.check_inbox");
        expect(container.textContent).not.toContain("auth.verify_email.resend.title");
    });

    it("shows guidance and supports resend when the user still needs to act", async () => {
        useSearchParamsMock.mockReturnValue([new URLSearchParams("sent=1&email=user@example.com"), vi.fn()]);
        onResendVerificationMock.mockResolvedValue({
            success: true,
            messageKey: "auth.verify_email.resend.success.message",
            data: { sent: true },
        });

        render(<VerifyEmailPage />, container);

        expect(container.textContent).toContain("auth.verify_email.sent.title");
        expect(container.textContent).toContain("auth.verify_email.tips.check_inbox");
        expect(container.textContent).toContain("auth.verify_email.resend.title");

        container.querySelector("form")?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
        await flushUi();

        expect(onResendVerificationMock).toHaveBeenCalledWith("user@example.com");
        expect(container.textContent).toContain("auth.verify_email.resend.success.message");
    });

    it("keeps resend recovery available for invalid verification links", async () => {
        useSearchParamsMock.mockReturnValue([new URLSearchParams("token=expired-token"), vi.fn()]);
        onVerifyTokenMock.mockResolvedValue({
            success: false,
            messageKey: "error.expired_or_invalid_token",
            errorCode: ErrorCode.EXPIRED_OR_INVALID_TOKEN,
        });

        render(<VerifyEmailPage />, container);
        await flushUi();
        await flushUi();

        expect(container.textContent).toContain("auth.verify_email.status.invalid.title");
        expect(container.textContent).toContain("auth.verify_email.tips.resend");
        expect(container.textContent).toContain("auth.verify_email.resend.title");
    });
});
