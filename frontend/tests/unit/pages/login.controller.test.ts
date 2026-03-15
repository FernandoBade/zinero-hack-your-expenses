import { AppRoutePath } from "@shared/enums/routes.enums";
import { beforeEach, describe, expect, it, vi } from "vitest";

const navigateMock = vi.fn();
const loginMock = vi.fn();

vi.mock("@/routes/navigation", () => ({
    navigate: (...args: unknown[]) => navigateMock(...args),
}));

vi.mock("@/services/auth/auth.service", () => ({
    login: (...args: unknown[]) => loginMock(...args),
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
        const setError = vi.fn();
        const controller = createLoginController({ setError });

        await controller.onSubmit("user@example.com", "secret");

        expect(loginMock).toHaveBeenCalledWith("user@example.com", "secret");
        expect(setError).toHaveBeenCalledWith(null);
        expect(navigateMock).toHaveBeenCalledWith(AppRoutePath.DASHBOARD);
    });

    it("uses returned semantic key when login fails", async () => {
        loginMock.mockResolvedValue({
            success: false,
            messageKey: "error.email_not_verified",
        });
        const setError = vi.fn();
        const controller = createLoginController({ setError });

        await controller.onSubmit("user@example.com", "wrong");

        expect(setError).toHaveBeenCalledWith(null);
        expect(setError).toHaveBeenCalledWith("error.email_not_verified");
        expect(navigateMock).not.toHaveBeenCalled();
    });

    it("falls back to invalid credentials when semantic key is missing", async () => {
        loginMock.mockResolvedValue({
            success: false,
            messageKey: undefined,
        });
        const setError = vi.fn();
        const controller = createLoginController({ setError });

        await controller.onSubmit("user@example.com", "wrong");

        expect(setError).toHaveBeenCalledWith(null);
        expect(setError).toHaveBeenCalledWith("error.invalid_credentials");
        expect(navigateMock).not.toHaveBeenCalled();
    });
});
