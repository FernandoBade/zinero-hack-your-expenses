import { beforeEach, describe, expect, it, vi } from "vitest";

const preloadLocaleCatalogMock = vi.fn();
const initializeAuthServiceMock = vi.fn();
const getLocaleMock = vi.fn();
const subscribeLocaleMock = vi.fn();
const initializeThemeStoreMock = vi.fn();
const initializeUserPreferencesStoreMock = vi.fn();
const tMock = vi.fn();

vi.mock("@shared/i18n/translate", () => ({
    preloadLocaleCatalog: (...args: unknown[]) => preloadLocaleCatalogMock(...args),
}));

vi.mock("@/services/auth/auth.service", () => ({
    initializeAuthService: (...args: unknown[]) => initializeAuthServiceMock(...args),
}));

vi.mock("@/state/locale.store", () => ({
    getLocale: () => getLocaleMock(),
    subscribeLocale: (...args: unknown[]) => subscribeLocaleMock(...args),
}));

vi.mock("@/state/theme.store", () => ({
    initializeThemeStore: (...args: unknown[]) => initializeThemeStoreMock(...args),
}));

vi.mock("@/state/userPreferences.store", () => ({
    initializeUserPreferencesStore: (...args: unknown[]) => initializeUserPreferencesStoreMock(...args),
}));

vi.mock("@/utils/i18n/translate", () => ({
    t: (...args: unknown[]) => tMock(...args),
}));

type BootstrapModule = typeof import("@/bootstrap/app.bootstrap");

async function loadBootstrapModule(): Promise<BootstrapModule> {
    return import("@/bootstrap/app.bootstrap");
}

describe("app.bootstrap", () => {
    beforeEach(() => {
        vi.resetModules();
        vi.clearAllMocks();

        preloadLocaleCatalogMock.mockResolvedValue(undefined);
        getLocaleMock.mockReturnValue("en-US");
        subscribeLocaleMock.mockReturnValue(() => undefined);
        initializeUserPreferencesStoreMock.mockResolvedValue(undefined);
        tMock.mockReturnValue("Zinero");
    });

    it("registers refresh recovery before hydrating user preferences", async () => {
        const callOrder: string[] = [];
        initializeAuthServiceMock.mockImplementation(() => {
            callOrder.push("auth");
        });
        initializeUserPreferencesStoreMock.mockImplementation(async () => {
            callOrder.push("preferences");
        });

        const { bootstrapApp } = await loadBootstrapModule();
        await bootstrapApp();

        expect(callOrder).toEqual(["auth", "preferences"]);
        expect(preloadLocaleCatalogMock).toHaveBeenCalledWith("en-US");
        expect(initializeThemeStoreMock).toHaveBeenCalledTimes(1);
    });
});
