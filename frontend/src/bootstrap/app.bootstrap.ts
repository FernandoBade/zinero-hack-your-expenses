import { preloadLocaleCatalog } from "@shared/i18n/translate";
import { initializeAuthService } from "@/services/auth/auth.service";
import { getLocale, subscribeLocale } from "@/state/locale.store";
import { initializeThemeStore } from "@/state/theme.store";
import { initializeUserPreferencesStore } from "@/state/userPreferences.store";
import { t } from "@/utils/i18n/translate";

let bootstrappedPromise: Promise<void> | null = null;
let localeSubscriptionInitialized = false;

/**
 * @summary Initializes app stores and prepares locale catalogs before mounting the root Preact application.
 */
async function runBootstrap(): Promise<void> {
    await initializeUserPreferencesStore();
    await preloadLocaleCatalog(getLocale());

    if (!localeSubscriptionInitialized) {
        subscribeLocale((locale) => {
            void preloadLocaleCatalog(locale);
            if (typeof document !== "undefined") {
                document.title = t("app.name");
            }
        });
        localeSubscriptionInitialized = true;
    }

    initializeThemeStore();
    initializeAuthService();

    if (typeof document !== "undefined") {
        document.title = t("app.name");
    }
}

/**
 * @summary Executes application bootstrap once and shares the same promise across callers.
 */
export async function bootstrapApp(): Promise<void> {
    if (bootstrappedPromise === null) {
        bootstrappedPromise = runBootstrap();
    }

    return bootstrappedPromise;
}
