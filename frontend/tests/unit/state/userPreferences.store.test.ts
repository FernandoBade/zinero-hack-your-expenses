// @vitest-environment jsdom

import { StorageKey } from "@shared/enums/storage.enums";
import { Currency, Language } from "@shared/enums/user.enums";
import {
    makeBackendPreferences,
    makePreferences,
    makeStorageSnapshot,
} from "../../helpers/factories/userPreferences.factory";
import { makeAccessToken } from "../../mocks/accessToken.mock";

const storageGetMock = vi.fn();
const storageSetMock = vi.fn();
const storageRemoveMock = vi.fn();
const getAccessTokenMock = vi.fn();
const subscribeAuthStateMock = vi.fn();
const fetchUserPreferencesMock = vi.fn();
let authStateListener: (() => void) | null = null;

vi.mock("@/platform/storage/storage", () => ({
    storage: {
        get: storageGetMock,
        set: storageSetMock,
        remove: storageRemoveMock,
    },
}));

vi.mock("@/state/auth.store", () => ({
    getAccessToken: getAccessTokenMock,
    subscribeAuthState: subscribeAuthStateMock,
}));

vi.mock("@/services/user/userPreferences.service", () => ({
    fetchUserPreferences: fetchUserPreferencesMock,
}));

type UserPreferencesStoreModule = typeof import("@/state/userPreferences.store");

async function loadStoreModule(): Promise<UserPreferencesStoreModule> {
    return import("@/state/userPreferences.store");
}

function emitAuthStateTransition(): void {
    authStateListener?.();
}

async function flushMicrotasks(): Promise<void> {
    await Promise.resolve();
    await Promise.resolve();
}

describe("userPreferences.store", () => {
    beforeEach(() => {
        vi.resetModules();
        storageGetMock.mockReset();
        storageSetMock.mockReset();
        storageRemoveMock.mockReset();
        getAccessTokenMock.mockReset();
        subscribeAuthStateMock.mockReset();
        fetchUserPreferencesMock.mockReset();
        authStateListener = null;

        storageGetMock.mockReturnValue(null);
        getAccessTokenMock.mockReturnValue(null);
        fetchUserPreferencesMock.mockResolvedValue(null);
        subscribeAuthStateMock.mockImplementation((listener: () => void) => {
            authStateListener = listener;
            return (): void => {
                if (authStateListener === listener) {
                    authStateListener = null;
                }
            };
        });

        document.documentElement.removeAttribute("lang");
        Object.defineProperty(window.navigator, "language", {
            configurable: true,
            value: Language.EN_US,
        });
    });

    it("initializes with browser defaults when storage snapshot is missing", async () => {
        const store = await loadStoreModule();

        await store.initializeUserPreferencesStore();

        const expected = makePreferences({
            language: Language.EN_US,
            currency: Currency.USD,
        });
        expect(store.getUserPreferences()).toEqual(expected);
        expect(store.getUserLocale()).toBe(Language.EN_US);
        expect(store.getUserCurrency()).toBe(Currency.USD);
        expect(fetchUserPreferencesMock).not.toHaveBeenCalled();
        expect(storageSetMock).toHaveBeenCalledWith(StorageKey.USER_PREFERENCES, expected);
        expect(document.documentElement.getAttribute("lang")).toBe(Language.EN_US);
    });

    it("does not re-run hydration when already initialized", async () => {
        const store = await loadStoreModule();

        await store.initializeUserPreferencesStore();
        await store.initializeUserPreferencesStore();

        expect(storageGetMock).toHaveBeenCalledTimes(0);
        expect(storageSetMock).toHaveBeenCalledTimes(1);
        expect(subscribeAuthStateMock).toHaveBeenCalledTimes(1);
    });

    it("ignores persisted language while unauthenticated and follows the browser locale", async () => {
        const persisted = makeStorageSnapshot({
            language: Language.ES_ES,
            currency: Currency.EUR,
        });
        storageGetMock.mockReturnValue(persisted);
        const store = await loadStoreModule();

        await store.initializeUserPreferencesStore();

        expect(store.getUserPreferences()).toEqual(
            makePreferences({
                language: Language.EN_US,
                currency: Currency.USD,
            })
        );
        expect(fetchUserPreferencesMock).not.toHaveBeenCalled();
        expect(document.documentElement.getAttribute("lang")).toBe(Language.EN_US);
    });

    it("reconciles with backend preferences when authenticated", async () => {
        const backend = makeBackendPreferences({
            language: Language.PT_BR,
            currency: Currency.BRL,
        });

        storageGetMock.mockReturnValue(
            makeStorageSnapshot({
                language: Language.EN_US,
                currency: Currency.USD,
            })
        );
        getAccessTokenMock.mockReturnValue(makeAccessToken({ id: 42 }));
        fetchUserPreferencesMock.mockResolvedValue(backend);

        const store = await loadStoreModule();
        await store.initializeUserPreferencesStore();

        expect(fetchUserPreferencesMock).toHaveBeenCalledWith(42);
        expect(store.getUserPreferences()).toEqual(backend);
        expect(storageSetMock).toHaveBeenCalledWith(StorageKey.USER_PREFERENCES, backend);
        expect(document.documentElement.getAttribute("lang")).toBe(Language.PT_BR);
    });

    it("reuses in-flight initialization promise to avoid duplicated backend fetches", async () => {
        storageGetMock.mockReturnValue(
            makeStorageSnapshot({
                language: Language.EN_US,
                currency: Currency.USD,
            })
        );
        getAccessTokenMock.mockReturnValue(makeAccessToken({ id: 42 }));

        let resolveFetch: ((value: ReturnType<typeof makeBackendPreferences>) => void) | undefined;
        fetchUserPreferencesMock.mockImplementation(
            () =>
                new Promise((resolve) => {
                    resolveFetch = resolve;
                })
        );

        const store = await loadStoreModule();
        const firstInitialization = store.initializeUserPreferencesStore();
        const secondInitialization = store.initializeUserPreferencesStore();

        expect(fetchUserPreferencesMock).toHaveBeenCalledTimes(1);

        resolveFetch?.(
            makeBackendPreferences({
                language: Language.EN_US,
                currency: Currency.BRL,
            })
        );
        await Promise.all([firstInitialization, secondInitialization]);

        expect(store.getUserCurrency()).toBe(Currency.BRL);
    });

    it("reconciles preferences after unauthenticated initialization when auth becomes authenticated", async () => {
        const backend = makeBackendPreferences({
            language: Language.ES_ES,
            currency: Currency.EUR,
        });

        storageGetMock.mockReturnValue(
            makeStorageSnapshot({
                language: Language.EN_US,
                currency: Currency.USD,
            })
        );
        fetchUserPreferencesMock.mockResolvedValue(backend);

        const store = await loadStoreModule();
        await store.initializeUserPreferencesStore();

        expect(fetchUserPreferencesMock).not.toHaveBeenCalled();

        getAccessTokenMock.mockReturnValue(makeAccessToken({ id: 501 }));
        emitAuthStateTransition();
        await flushMicrotasks();

        expect(fetchUserPreferencesMock).toHaveBeenCalledWith(501);
        expect(store.getUserPreferences()).toEqual(backend);
    });

    it("ignores stale backend fetch results when logout happens during in-flight reconciliation", async () => {
        storageGetMock.mockReturnValue(
            makeStorageSnapshot({
                language: Language.PT_BR,
                currency: Currency.BRL,
            })
        );
        getAccessTokenMock.mockReturnValue(null);

        let resolveFetch: ((value: ReturnType<typeof makeBackendPreferences>) => void) | undefined;
        fetchUserPreferencesMock.mockImplementation(
            () =>
                new Promise((resolve) => {
                    resolveFetch = resolve;
                })
        );

        const store = await loadStoreModule();
        await store.initializeUserPreferencesStore();

        getAccessTokenMock.mockReturnValue(makeAccessToken({ id: 900 }));
        emitAuthStateTransition();

        getAccessTokenMock.mockReturnValue(null);
        emitAuthStateTransition();

        resolveFetch?.(
            makeBackendPreferences({
                language: Language.ES_ES,
                currency: Currency.EUR,
            })
        );
        await flushMicrotasks();

        expect(store.getUserPreferences()).toEqual(
            makePreferences({
                language: Language.EN_US,
                currency: Currency.USD,
            })
        );
        expect(document.documentElement.getAttribute("lang")).toBe(Language.EN_US);
    });

    it("resets state on logout and loads the next authenticated user without leaking previous preferences", async () => {
        storageGetMock.mockReturnValue(null);
        fetchUserPreferencesMock.mockImplementation(async (userId: number) => {
            if (userId === 1) {
                return makeBackendPreferences({
                    language: Language.PT_BR,
                    currency: Currency.BRL,
                });
            }

            return makeBackendPreferences({
                language: Language.ES_ES,
                currency: Currency.EUR,
            });
        });

        const store = await loadStoreModule();
        await store.initializeUserPreferencesStore();

        getAccessTokenMock.mockReturnValue(makeAccessToken({ id: 1 }));
        emitAuthStateTransition();
        await flushMicrotasks();
        expect(store.getUserPreferences()).toEqual(
            makePreferences({
                language: Language.PT_BR,
                currency: Currency.BRL,
            })
        );

        getAccessTokenMock.mockReturnValue(null);
        emitAuthStateTransition();
        expect(store.getUserPreferences()).toEqual(
            makePreferences({
                language: Language.EN_US,
                currency: Currency.USD,
            })
        );
        expect(document.documentElement.getAttribute("lang")).toBe(Language.EN_US);

        getAccessTokenMock.mockReturnValue(makeAccessToken({ id: 2 }));
        emitAuthStateTransition();
        await flushMicrotasks();
        expect(store.getUserPreferences()).toEqual(
            makePreferences({
                language: Language.ES_ES,
                currency: Currency.EUR,
            })
        );
        expect(document.documentElement.getAttribute("lang")).toBe(Language.ES_ES);
    });

    it("skips backend reconciliation when token payload is malformed", async () => {
        getAccessTokenMock.mockReturnValue("invalid-token-format");
        const store = await loadStoreModule();

        await store.initializeUserPreferencesStore();

        expect(fetchUserPreferencesMock).not.toHaveBeenCalled();
        expect(store.getUserPreferences()).toEqual(
            makePreferences({
                language: Language.EN_US,
                currency: Currency.USD,
            })
        );
    });

    it("keeps hydrated preferences when backend reconciliation throws", async () => {
        storageGetMock.mockReturnValue(
            makeStorageSnapshot({
                language: Language.ES_ES,
                currency: Currency.EUR,
            })
        );
        getAccessTokenMock.mockReturnValue(makeAccessToken({ id: 99 }));
        fetchUserPreferencesMock.mockRejectedValue(new Error("backend unavailable"));

        const store = await loadStoreModule();
        await store.initializeUserPreferencesStore();

        expect(store.getUserPreferences()).toEqual(
            makePreferences({
                language: Language.EN_US,
                currency: Currency.USD,
            })
        );
    });

    it("keeps hydrated preferences when authenticated fetch returns no backend snapshot", async () => {
        storageGetMock.mockReturnValue(
            makeStorageSnapshot({
                language: Language.ES_ES,
                currency: Currency.EUR,
            })
        );
        getAccessTokenMock.mockReturnValue(makeAccessToken({ id: 77 }));
        fetchUserPreferencesMock.mockResolvedValue(null);

        const store = await loadStoreModule();
        await store.initializeUserPreferencesStore();

        expect(fetchUserPreferencesMock).toHaveBeenCalledWith(77);
        expect(store.getUserPreferences()).toEqual(
            makePreferences({
                language: Language.EN_US,
                currency: Currency.USD,
            })
        );
    });

    it("notifies subscribers immediately and on subsequent updates", async () => {
        const store = await loadStoreModule();
        await store.initializeUserPreferencesStore();

        const listener = vi.fn();
        const unsubscribe = store.subscribeUserPreferences(listener);

        expect(listener).toHaveBeenCalledTimes(1);

        store.setUserPreferences({ currency: Currency.BRL });
        expect(listener).toHaveBeenCalledTimes(2);

        store.setUserPreferences({ currency: Currency.BRL });
        expect(listener).toHaveBeenCalledTimes(2);

        unsubscribe();
        store.setUserPreferences({ currency: Currency.USD });
        expect(listener).toHaveBeenCalledTimes(2);
    });

    it("keeps html lang synchronized with language transitions", async () => {
        const store = await loadStoreModule();
        await store.initializeUserPreferencesStore();

        store.setUserPreferences({ language: Language.ES_ES });
        expect(document.documentElement.getAttribute("lang")).toBe(Language.ES_ES);

        store.setUserPreferences({ language: Language.PT_BR });
        expect(document.documentElement.getAttribute("lang")).toBe(Language.PT_BR);
    });

    it("emits subscriber updates when language changes", async () => {
        const store = await loadStoreModule();
        await store.initializeUserPreferencesStore();

        const listener = vi.fn();
        store.subscribeUserPreferences(listener);

        store.setUserPreferences({ language: Language.ES_ES });
        const latestCall = listener.mock.calls.at(-1)?.[0];

        expect(latestCall).toEqual(
            makePreferences({
                language: Language.ES_ES,
                currency: Currency.USD,
            })
        );
    });
});
