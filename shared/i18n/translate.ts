import IntlMessageFormat from "intl-messageformat";
import { Language } from "../enums/language.enums";
import type { ErrorCode } from "../errors/error-codes";
import { fieldLabelMap } from "../fields/field-label-map";
import { isFieldKey, type FieldKey } from "../fields/field-keys";
import { ptBRErrorCatalog } from "./locales/pt-BR/errors";
import { ptBREmailCatalog } from "./locales/pt-BR/email";
import { ptBRUiCatalog } from "./locales/pt-BR/ui";
import { errorCodeMap } from "./mappings/error-code-map";
import type { I18nCatalog, TranslationParams } from "./types/catalog";
import type { I18nKey } from "./types/i18n-key";
import { DEFAULT_LOCALE, type Locale } from "./types/locale";

const defaultCatalog: I18nCatalog = {
    ...ptBRUiCatalog,
    ...ptBRErrorCatalog,
    ...ptBREmailCatalog,
};

const loadedCatalogs: Partial<Record<Locale, I18nCatalog>> = {
    [Language.PT_BR]: defaultCatalog,
};

const localeLoadPromises: Partial<Record<Locale, Promise<I18nCatalog>>> = {};

type LocaleCatalogLoader = () => Promise<I18nCatalog>;

const localeCatalogLoaders: Record<Locale, LocaleCatalogLoader> = {
    [Language.PT_BR]: async () => defaultCatalog,
    [Language.EN_US]: async () => {
        const [{ enUSUiCatalog }, { enUSErrorCatalog }, { enUSEmailCatalog }] = await Promise.all([
            import("./locales/en-US/ui"),
            import("./locales/en-US/errors"),
            import("./locales/en-US/email"),
        ]);

        return {
            ...enUSUiCatalog,
            ...enUSErrorCatalog,
            ...enUSEmailCatalog,
        };
    },
    [Language.ES_ES]: async () => {
        const [{ esESUiCatalog }, { esESErrorCatalog }, { esESEmailCatalog }] = await Promise.all([
            import("./locales/es-ES/ui"),
            import("./locales/es-ES/errors"),
            import("./locales/es-ES/email"),
        ]);

        return {
            ...esESUiCatalog,
            ...esESErrorCatalog,
            ...esESEmailCatalog,
        };
    },
};

function isLocale(value: string): value is Locale {
    return value === Language.EN_US || value === Language.PT_BR || value === Language.ES_ES;
}

export function resolveLocale(locale?: Locale | string): Locale {
    if (typeof locale === "string" && isLocale(locale)) {
        return locale;
    }

    return DEFAULT_LOCALE;
}

function getFallbackCatalog(): I18nCatalog {
    return loadedCatalogs[DEFAULT_LOCALE] ?? defaultCatalog;
}

function getLoadedCatalog(locale: Locale): I18nCatalog | undefined {
    return loadedCatalogs[locale];
}

/**
 * @summary Preloads and caches a locale catalog to enable locale-level lazy loading.
 */
export async function preloadLocaleCatalog(locale?: Locale | string): Promise<I18nCatalog> {
    const resolvedLocale = resolveLocale(locale);
    const loadedCatalog = getLoadedCatalog(resolvedLocale);
    if (loadedCatalog) {
        return loadedCatalog;
    }

    const pendingLoad = localeLoadPromises[resolvedLocale];
    if (pendingLoad) {
        return pendingLoad;
    }

    const loadPromise = localeCatalogLoaders[resolvedLocale]()
        .then((catalog) => {
            loadedCatalogs[resolvedLocale] = catalog;
            return catalog;
        })
        .finally(() => {
            delete localeLoadPromises[resolvedLocale];
        });

    localeLoadPromises[resolvedLocale] = loadPromise;
    return loadPromise;
}

/**
 * @summary Indicates whether a locale catalog is already loaded in memory.
 */
export function isLocaleCatalogLoaded(locale?: Locale | string): boolean {
    const resolvedLocale = resolveLocale(locale);
    return getLoadedCatalog(resolvedLocale) !== undefined;
}

function normalizeParams(
    params: TranslationParams | undefined,
    locale: Locale
): TranslationParams | undefined {
    if (!params) {
        return undefined;
    }

    const normalized: Record<string, unknown> = { ...params };
    for (const candidate of ["path", "field"]) {
        const raw = normalized[candidate];
        if (typeof raw !== "string") {
            continue;
        }

        if (!isFieldKey(raw)) {
            continue;
        }

        const labelKey = fieldLabelMap[raw];
        if (labelKey) {
            normalized[candidate] = translate(labelKey, locale);
        }
    }

    return normalized as TranslationParams;
}

/**
 * @summary Resolves a translation key synchronously. Falls back to default locale when requested catalog is not yet loaded.
 */
export function translate(
    key: I18nKey,
    locale?: Locale | string,
    params?: TranslationParams
): string {
    const resolvedLocale = resolveLocale(locale);
    const catalog = getLoadedCatalog(resolvedLocale);

    if (!catalog && resolvedLocale !== DEFAULT_LOCALE) {
        void preloadLocaleCatalog(resolvedLocale);
    }

    const fallbackCatalog = getFallbackCatalog();
    const template = (catalog ?? fallbackCatalog)[key] ?? fallbackCatalog[key];
    const formatter = new IntlMessageFormat(template, resolvedLocale);
    const output = formatter.format(normalizeParams(params, resolvedLocale));

    return typeof output === "string" ? output : String(output);
}

/**
 * @summary Resolves a translation key asynchronously, guaranteeing the requested locale catalog is loaded.
 */
export async function translateAsync(
    key: I18nKey,
    locale?: Locale | string,
    params?: TranslationParams
): Promise<string> {
    const resolvedLocale = resolveLocale(locale);
    await preloadLocaleCatalog(resolvedLocale);
    return translate(key, resolvedLocale, params);
}

export function translateError(
    errorCode: ErrorCode,
    locale?: Locale | string,
    params?: TranslationParams
): string {
    return translate(errorCodeMap[errorCode], locale, params);
}

export async function translateErrorAsync(
    errorCode: ErrorCode,
    locale?: Locale | string,
    params?: TranslationParams
): Promise<string> {
    return translateAsync(errorCodeMap[errorCode], locale, params);
}

export function translateFieldLabel(field: FieldKey | string, locale?: Locale | string): string {
    if (!isFieldKey(field)) {
        return field;
    }

    return translate(fieldLabelMap[field], locale);
}

export async function translateFieldLabelAsync(
    field: FieldKey | string,
    locale?: Locale | string
): Promise<string> {
    if (!isFieldKey(field)) {
        return field;
    }

    return translateAsync(fieldLabelMap[field], locale);
}

