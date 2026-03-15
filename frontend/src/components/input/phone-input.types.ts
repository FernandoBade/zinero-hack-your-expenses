import { CountryCode } from "@shared/enums/country.enums";
import { PhoneInputValidationError } from "@shared/enums/input-validation.enums";
import { Language } from "@shared/enums/user.enums";
import type { I18nKey } from "@shared/i18n/types/i18n-key";
import type {
    CanonicalInputBaseProps,
    CanonicalInputValueChange,
} from "@/components/input/canonical-input.types";

/**
 * @summary Typed props for international phone input with E.164 canonical output.
 */
export interface PhoneInputProps extends CanonicalInputBaseProps {
    readonly language: Language;
    readonly countryCode?: CountryCode;
    /** @summary When true, country switch clears the current draft to avoid cross-country reformat artifacts. */
    readonly resetValueOnCountryChange?: boolean;
    readonly validateIncomplete?: boolean;
    readonly validationI18nKeys?: Partial<Record<PhoneInputValidationError, I18nKey>>;
    readonly onCountryChange?: (countryCode: CountryCode, value: CanonicalInputValueChange) => void;
}

