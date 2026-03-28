import { translate } from "@shared/i18n/translate";
import type { TranslationParams } from "@shared/i18n/types/catalog";
import type { I18nKey } from "@shared/i18n/types/i18n-key";
import { getLocale } from "@/state/locale.store";

/**
 * @summary Resolves a required translation key using the active locale state.
 */
export function t(key: I18nKey, params?: TranslationParams): string {
    return translate(key, getLocale(), params);
}

/**
 * @summary Resolves an optional translation key and returns undefined when absent.
 */
export function tOptional(key?: I18nKey, params?: TranslationParams): string | undefined {
    return key ? t(key, params) : undefined;
}