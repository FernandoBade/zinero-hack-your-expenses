import { CountryCode } from "../../enums/country.enums";
import type { PhoneCountryOption } from "./country.types";

/** @summary Canonical phone country selector options consumed by frontend and backend contracts. */
export const PHONE_COUNTRY_OPTIONS: readonly PhoneCountryOption[] = [
    { code: CountryCode.AR, dialCode: "54", nameKey: 'country.ar.name', placeholderExample: "11 1234-5678", maxDigits: 10 },
    { code: CountryCode.BR, dialCode: "55", nameKey: 'country.br.name', placeholderExample: "(11) 91234-5678", maxDigits: 11 },
    { code: CountryCode.CL, dialCode: "56", nameKey: 'country.cl.name', placeholderExample: "9 1234 5678", maxDigits: 9 },
    { code: CountryCode.CO, dialCode: "57", nameKey: 'country.co.name', placeholderExample: "300 1234567", maxDigits: 10 },
    { code: CountryCode.MX, dialCode: "52", nameKey: 'country.mx.name', placeholderExample: "55 1234 5678", maxDigits: 10 },
    { code: CountryCode.PE, dialCode: "51", nameKey: 'country.pe.name', placeholderExample: "912 345 678", maxDigits: 9 },
    { code: CountryCode.VE, dialCode: "58", nameKey: 'country.ve.name', placeholderExample: "412 1234567", maxDigits: 10 },
    { code: CountryCode.OTHER, dialCode: "", nameKey: 'country.other.name', placeholderExample: "", maxDigits: 20 },
];
