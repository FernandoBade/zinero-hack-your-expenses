import { CountryCode } from "../../enums/country.enums";
import type { I18nKey } from "../../i18n/types/i18n-key";

/** @summary Country metadata used by phone input selectors and E.164 normalization. */
export interface PhoneCountryOption {
    readonly code: CountryCode;
    readonly dialCode: string;
    readonly nameKey: I18nKey;
    readonly placeholderExample: string;
    readonly maxDigits: number;
}
