import { AppRoutePath } from "@shared/enums/routes.enums";
import { Language } from "@shared/enums/user.enums";
import { beforeEach, describe, expect, it, vi } from "vitest";

const navigateMock = vi.fn();
const replaceMock = vi.fn();
const signupMock = vi.fn();
const resendVerificationEmailMock = vi.fn();
const getLocaleMock = vi.fn();

vi.mock("@/routes/navigation", () => ({
    navigate: (...args: unknown[]) => navigateMock(...args),
    replace: (...args: unknown[]) => replaceMock(...args),
}));

vi.mock("@/services/auth/auth.service", () => ({
    signup: (...args: unknown[]) => signupMock(...args),
    resendVerificationEmail: (...args: unknown[]) => resendVerificationEmailMock(...args),
}));

vi.mock("@/state/locale.store", () => ({
    getLocale: () => getLocaleMock(),
}));

import { createSignupController } from "@/pages/signup/signup.controller";

describe("signup.controller", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        getLocaleMock.mockReturnValue(Language.EN_US);
    });

    it("sends the active locale in the signup payload and redirects to verify-email", async () => {
        signupMock.mockResolvedValue({
            success: true,
            data: { id: 1, email: "user@example.com" },
        });

        const controller = createSignupController();

        const result = await controller.onSubmit({
            firstName: "User",
            lastName: "Example",
            email: "user@example.com",
            phone: "",
            phoneError: null,
            password: "secret123",
            confirmPassword: "secret123",
            acceptedTerms: true,
        });

        expect(signupMock).toHaveBeenCalledWith({
            firstName: "User",
            lastName: "Example",
            email: "user@example.com",
            password: "secret123",
            phone: undefined,
            language: Language.EN_US,
        });
        expect(replaceMock).toHaveBeenCalledWith(AppRoutePath.VERIFY_EMAIL, {
            email: "user@example.com",
            sent: 1,
        });
        expect(result).toEqual({
            success: true,
            data: { id: 1, email: "user@example.com" },
        });
    });

    it("navigates back to login through typed routes", () => {
        const controller = createSignupController();

        controller.onNavigateToLogin();

        expect(navigateMock).toHaveBeenCalledWith(AppRoutePath.LOGIN);
    });
});
