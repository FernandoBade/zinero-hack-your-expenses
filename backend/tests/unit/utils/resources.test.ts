import { Language } from '../../../../shared/enums/language.enums';
import { ErrorCode } from '../../../../shared/errors/error-codes';
import { FieldKey } from '../../../../shared/fields/field-keys';
import {
    isLocaleCatalogLoaded,
    preloadLocaleCatalog,
    resolveLocale,
    translate,
    translateAsync,
    translateError,
    translateFieldLabel,
} from '../../../../shared/i18n/translate';
import { DEFAULT_LOCALE } from '../../../../shared/i18n/types/locale';

describe('shared i18n translate', () => {
    it('resolves unknown locales to the default locale', () => {
        expect(resolveLocale('fr-FR')).toBe(DEFAULT_LOCALE);
    });

    it('translates a known key in the default locale', () => {
        expect(translate('error.validation_error', Language.PT_BR)).toBe('Erro de validação');
    });

    it('loads and translates the english locale asynchronously', async () => {
        const value = await translateAsync('error.validation_error', Language.EN_US);

        expect(value).toBe('Validation error');
        expect(isLocaleCatalogLoaded(Language.EN_US)).toBe(true);
    });

    it('translates error codes through the error-code map', async () => {
        await preloadLocaleCatalog(Language.EN_US);
        expect(translateError(ErrorCode.INVALID_CREDENTIALS, Language.EN_US)).toBe('Invalid credentials');
    });

    it('translates field labels through the typed field map', async () => {
        await preloadLocaleCatalog(Language.EN_US);
        expect(translateFieldLabel(FieldKey.USER_ID, Language.EN_US)).toBe('User');
    });
});
