import { translate } from "@shared/i18n/translate";
import type { I18nKey } from "@shared/i18n/types/i18n-key";
import { getLocale } from "@/state/locale.store";

/**
 * @summary Resolves a required translation key using the active locale state.
 */
export function t(key: I18nKey): string {
    return translate(key, getLocale());
}

/**
 * @summary Resolves an optional translation key and returns undefined when absent.
 */
export function tOptional(key?: I18nKey): string | undefined {
    return key ? t(key) : undefined;
}
