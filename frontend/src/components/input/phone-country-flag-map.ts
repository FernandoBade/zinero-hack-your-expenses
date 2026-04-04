import arFlag from "@shared/assets/images/flags/ar.svg";
import brFlag from "@shared/assets/images/flags/br.svg";
import clFlag from "@shared/assets/images/flags/cl.svg";
import coFlag from "@shared/assets/images/flags/co.svg";
import mxFlag from "@shared/assets/images/flags/mx.svg";
import otherFlag from "@shared/assets/images/flags/other.svg";
import peFlag from "@shared/assets/images/flags/pe.svg";
import veFlag from "@shared/assets/images/flags/ve.svg";
import { CountryCode } from "@shared/enums/country.enums";

const PHONE_COUNTRY_FLAG_BY_CODE: Readonly<Record<CountryCode, string>> = {
    [CountryCode.AR]: arFlag,
    [CountryCode.BR]: brFlag,
    [CountryCode.CA]: otherFlag,
    [CountryCode.CL]: clFlag,
    [CountryCode.CO]: coFlag,
    [CountryCode.DE]: otherFlag,
    [CountryCode.ES]: otherFlag,
    [CountryCode.FR]: otherFlag,
    [CountryCode.GB]: otherFlag,
    [CountryCode.MX]: mxFlag,
    [CountryCode.OTHER]: otherFlag,
    [CountryCode.PE]: peFlag,
    [CountryCode.PT]: otherFlag,
    [CountryCode.US]: otherFlag,
    [CountryCode.VE]: veFlag,
};

/**
 * @summary Returns the phone country flag asset associated with the given code.
 * @param countryCode Country code used by the phone selector.
 * @returns Imported SVG asset path for the matching flag.
 */
export function getPhoneCountryFlagSource(countryCode: CountryCode): string {
    return PHONE_COUNTRY_FLAG_BY_CODE[countryCode] ?? otherFlag;
}
