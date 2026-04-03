import { StorageKey } from "@shared/enums/storage.enums";
import { Currency, Language } from "@shared/enums/user.enums";
import { storage } from "@/platform/storage/storage";
import { getAccessToken, subscribeAuthState } from "@/state/auth.store";
import {
    fetchUserPreferences,
    type UserPreferencesSnapshot,
} from "@/services/user/userPreferences.service";

const DEFAULT_LANGUAGE = Language.PT_BR;
const DEFAULT_CURRENCY = Currency.USD;

const LANGUAGE_PREFIX_BY_LOCALE: Readonly<Record<Language, string>> = {
    [Language.EN_US]: Language.EN_US.slice(0, 2).toLowerCase(),
    [Language.ES_ES]: Language.ES_ES.slice(0, 2).toLowerCase(),
    [Language.PT_BR]: Language.PT_BR.slice(0, 2).toLowerCase(),
};

type UserPreferencesListener = (state: UserPreferencesState) => void;

export interface UserPreferencesState {
    readonly language: Language;
    readonly currency: Currency;
}

const listeners = new Set<UserPreferencesListener>();

let initialized = false;
let initializationPromise: Promise<void> | null = null;
let authSubscriptionInitialized = false;
let authenticatedUserId: number | null = null;
let authReconciliationSequence = 0;
let state: UserPreferencesState = {
    language: DEFAULT_LANGUAGE,
    currency: DEFAULT_CURRENCY,
};


function resolveLanguageFromLocaleTag(localeTag: string): Language {
    const normalizedTag = localeTag.trim().toLowerCase();
    const supportedLanguageList = Object.values(Language) as readonly Language[];

    const exactLanguage = supportedLanguageList.find(
        (language) => language.toLowerCase() === normalizedTag
    );
    if (exactLanguage !== undefined) {
        return exactLanguage;
    }

    const primarySubtag = normalizedTag.split("-")[0];
    const prefixMatch = supportedLanguageList.find(
        (language) => LANGUAGE_PREFIX_BY_LOCALE[language] === primarySubtag
    );

    return prefixMatch ?? DEFAULT_LANGUAGE;
}


function resolveBrowserLanguage(): Language {
    if (typeof navigator === "undefined") {
        return DEFAULT_LANGUAGE;
    }

    return resolveLanguageFromLocaleTag(navigator.language);
}


function applyLanguageToDocument(language: Language): void {
    if (typeof document === "undefined") {
        return;
    }

    document.documentElement.setAttribute("lang", language);
}


function persistPreferences(): void {
    storage.set<UserPreferencesState>(StorageKey.USER_PREFERENCES, state);
}


function getStateSnapshot(): UserPreferencesState {
    return { ...state };
}


function notifyListeners(): void {
    const snapshot = getStateSnapshot();
    listeners.forEach((listener) => listener(snapshot));
}


function arePreferencesEqual(left: UserPreferencesState, right: UserPreferencesState): boolean {
    return left.language === right.language && left.currency === right.currency;
}


function applyState(nextState: UserPreferencesState, notify: boolean): void {
    const shouldNotify = notify && !arePreferencesEqual(state, nextState);
    state = nextState;
    applyLanguageToDocument(state.language);

    if (shouldNotify) {
        notifyListeners();
    }
}


function decodeBase64Url(base64UrlValue: string): string | null {
    if (typeof globalThis.atob !== "function") {
        return null;
    }

    const normalizedValue = base64UrlValue.replace(/-/g, "+").replace(/_/g, "/");
    const paddingLength = (4 - (normalizedValue.length % 4)) % 4;
    const paddedValue = `${normalizedValue}${"=".repeat(paddingLength)}`;

    try {
        return globalThis.atob(paddedValue);
    } catch {
        return null;
    }
}


function readAccessTokenUserId(token: string): number | null {
    const tokenParts = token.split(".");
    if (tokenParts.length < 2) {
        return null;
    }

    const decodedPayload = decodeBase64Url(tokenParts[1]);
    if (decodedPayload === null) {
        return null;
    }

    try {
        const parsedPayload = JSON.parse(decodedPayload) as { id?: unknown };
        const numericId =
            typeof parsedPayload.id === "string" ? Number(parsedPayload.id) : parsedPayload.id;

        return typeof numericId === "number" && Number.isInteger(numericId) && numericId > 0
            ? numericId
            : null;
    } catch {
        return null;
    }
}


function reconcilePreferences(
    backendPreferences: UserPreferencesSnapshot
): UserPreferencesState {
    return {
        language: backendPreferences.language,
        currency: backendPreferences.currency,
    };
}


function resolveAuthenticatedUserId(): number | null {
    const accessToken = getAccessToken();
    if (typeof accessToken !== "string" || accessToken.length === 0) {
        return null;
    }

    return readAccessTokenUserId(accessToken);
}

async function hydrateFromBackend(userId: number, reconciliationSequence: number): Promise<void> {
    const backendPreferences = await fetchUserPreferences(userId);
    if (backendPreferences === null) {
        return;
    }

    const latestAuthenticatedUserId = resolveAuthenticatedUserId();
    if (
        reconciliationSequence !== authReconciliationSequence
        || latestAuthenticatedUserId !== userId
    ) {
        return;
    }

    applyState(reconcilePreferences(backendPreferences), true);
}


function applyLoggedOutPreferences(): void {
    const fallbackPreferences: UserPreferencesState = {
        language: resolveBrowserLanguage(),
        currency: DEFAULT_CURRENCY,
    };
    applyState(fallbackPreferences, true);
    persistPreferences();
}

async function handleAuthStateTransition(): Promise<void> {
    const nextAuthenticatedUserId = resolveAuthenticatedUserId();
    if (nextAuthenticatedUserId === authenticatedUserId) {
        return;
    }

    authenticatedUserId = nextAuthenticatedUserId;
    authReconciliationSequence += 1;
    const reconciliationSequence = authReconciliationSequence;

    if (nextAuthenticatedUserId === null) {
        applyLoggedOutPreferences();
        return;
    }

    try {
        await hydrateFromBackend(nextAuthenticatedUserId, reconciliationSequence);
    } catch {
        // Keep deterministic local state when backend reconciliation fails.
    }

    persistPreferences();
}


function ensureAuthStateSubscription(): void {
    if (authSubscriptionInitialized) {
        return;
    }

    subscribeAuthState(() => {
        void handleAuthStateTransition();
    });
    authSubscriptionInitialized = true;
}

async function runInitialization(): Promise<void> {
    authenticatedUserId = resolveAuthenticatedUserId();
    const browserPreferences: UserPreferencesState = {
        language: resolveBrowserLanguage(),
        currency: DEFAULT_CURRENCY,
    };

    applyState(browserPreferences, true);
    ensureAuthStateSubscription();

    authReconciliationSequence += 1;
    const reconciliationSequence = authReconciliationSequence;

    if (authenticatedUserId !== null) {
        try {
            await hydrateFromBackend(authenticatedUserId, reconciliationSequence);
        } catch {
            // Keep deterministic local hydration when backend reconciliation fails.
        }
    }

    persistPreferences();
    initialized = true;
}

/**
 * @summary Initializes user preference state from browser locale for public flows, then reconciles authenticated sessions with backend preferences.
 * @returns Promise resolved when hydration and reconciliation finish.
 */

export async function initializeUserPreferencesStore(): Promise<void> {
    if (initialized) {
        return;
    }

    if (initializationPromise !== null) {
        return initializationPromise;
    }

    initializationPromise = runInitialization().finally(() => {
        initializationPromise = null;
    });

    return initializationPromise;
}

/**
 * @summary Returns the current user preference snapshot.
 * @returns Current language and currency values.
 */

export function getUserPreferences(): UserPreferencesState {
    return getStateSnapshot();
}

/**
 * @summary Returns the effective locale from user preferences.
 * @returns Active locale enum value.
 */

export function getUserLocale(): Language {
    return state.language;
}

/**
 * @summary Returns the effective currency from user preferences.
 * @returns Active currency enum value.
 */

export function getUserCurrency(): Currency {
    return state.currency;
}

/**
 * @summary Merges and persists user preference updates.
 * @param patch Partial preference values to merge into current state.
 * @returns No return value.
 */

export function setUserPreferences(patch: Partial<UserPreferencesState>): void {
    const nextState: UserPreferencesState = {
        language: patch.language ?? state.language,
        currency: patch.currency ?? state.currency,
    };

    if (arePreferencesEqual(state, nextState)) {
        return;
    }

    applyState(nextState, true);
    persistPreferences();
}

/**
 * @summary Subscribes to user preference state updates.
 * @param listener Callback executed after every preference transition.
 * @returns Unsubscribe function for the provided listener.
 */

export function subscribeUserPreferences(listener: UserPreferencesListener): () => void {
    listeners.add(listener);
    listener(getStateSnapshot());

    return (): void => {
        listeners.delete(listener);
    };
}
