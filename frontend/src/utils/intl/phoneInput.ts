import { PHONE_COUNTRY_OPTIONS } from "@shared/domains/phone/country.options";
import type { PhoneCountryOption } from "@shared/domains/phone/country.types";
import { CountryCode } from "@shared/enums/country.enums";
import { PhoneInputValidationError } from "@shared/enums/input-validation.enums";
import { Language } from "@shared/enums/language.enums";
import {
    AsYouType,
    parsePhoneNumberFromString,
    validatePhoneNumberLength,
    type CountryCode as LibCountryCode,
} from "libphonenumber-js";

const DEFAULT_PHONE_COUNTRY = CountryCode.OTHER;

const COUNTRY_BY_LANGUAGE: Readonly<Record<Language, CountryCode>> = {
    [Language.EN_US]: CountryCode.OTHER,
    [Language.ES_ES]: CountryCode.OTHER,
    [Language.PT_BR]: CountryCode.BR,
};

export interface PhoneValidationRules {
    readonly required?: boolean;
    readonly validateIncomplete?: boolean;
}

export interface ParsedPhoneDraft {
    readonly displayValue: string;
    readonly canonicalValue: string;
}

export interface NormalizedPhoneValue extends ParsedPhoneDraft {
    readonly isValid: boolean;
    readonly isPossible: boolean;
}

interface PhoneMaskPattern {
    readonly prefix: string;
    readonly groupSizes: readonly number[];
    readonly separators: readonly string[];
}


function isFreeformPhoneCountryInternal(countryCode: CountryCode): boolean {
    return countryCode === CountryCode.OTHER;
}


function toLibCountryCode(countryCode: CountryCode): LibCountryCode {
    return countryCode as LibCountryCode;
}


function hasDigit(value: string): boolean {
    return /\d/.test(value);
}


function sanitizePhoneDigits(value: string): string {
    return value.replace(/\D/g, "");
}


function resolveCountryDialCode(countryCode: CountryCode): string {
    return PHONE_COUNTRY_OPTIONS.find((option) => option.code === countryCode)?.dialCode ?? "";
}


function resolveCountryPlaceholder(countryCode: CountryCode): string {
    return PHONE_COUNTRY_OPTIONS.find((option) => option.code === countryCode)?.placeholderExample ?? "";
}


function resolveCountryMaxDigitsFromShared(countryCode: CountryCode): number | null {
    const maxDigits = PHONE_COUNTRY_OPTIONS.find((option) => option.code === countryCode)?.maxDigits;
    if (typeof maxDigits !== "number" || Number.isNaN(maxDigits) || maxDigits <= 0) {
        return null;
    }

    return Math.trunc(maxDigits);
}


function buildPhoneMaskPattern(countryCode: CountryCode): PhoneMaskPattern | null {
    const placeholder = resolveCountryPlaceholder(countryCode);
    if (placeholder.length === 0) {
        return null;
    }

    const groups = placeholder.match(/\d+/g);
    if (!groups || groups.length === 0) {
        return null;
    }

    const groupSizes = groups.map((group) => group.length);
    const chunks = placeholder.split(/\d+/);

    return {
        prefix: chunks[0] ?? "",
        separators: chunks.slice(1, groupSizes.length),
        groupSizes,
    };
}


function formatDigitsByPattern(digits: string, pattern: PhoneMaskPattern): string {
    if (digits.length === 0) {
        return "";
    }

    let cursor = 0;
    let output = "";

    for (let groupIndex = 0; groupIndex < pattern.groupSizes.length; groupIndex += 1) {
        const groupSize = pattern.groupSizes[groupIndex];
        const chunk = digits.slice(cursor, cursor + groupSize);

        if (chunk.length === 0) {
            break;
        }

        if (groupIndex === 0) {
            output += pattern.prefix;
        }

        output += chunk;
        cursor += chunk.length;

        const hasRemainingDigits = cursor < digits.length;
        if (hasRemainingDigits) {
            output += pattern.separators[groupIndex] ?? " ";
        }
    }

    if (cursor < digits.length) {
        output += digits.slice(cursor);
    }

    return output.trim();
}


function hasVisiblePhoneMask(displayValue: string, digitsOnly: string): boolean {
    return displayValue.length > digitsOnly.length;
}


function hasStableAsYouTypeDigits(displayValue: string, digitsOnly: string): boolean {
    return sanitizePhoneDigits(displayValue) === digitsOnly;
}


function resolveCountryMaxNationalDigits(countryCode: CountryCode): number {
    const sharedMaxDigits = resolveCountryMaxDigitsFromShared(countryCode);
    if (sharedMaxDigits !== null) {
        return sharedMaxDigits;
    }

    if (isFreeformPhoneCountryInternal(countryCode)) {
        return 64;
    }

    let maxDigits = 20;

    for (let size = 1; size <= 20; size += 1) {
        const probe = "9".repeat(size);
        const validationResult = validatePhoneNumberLength(probe, toLibCountryCode(countryCode));

        if (validationResult === "TOO_LONG") {
            maxDigits = size - 1;
            break;
        }
    }

    return Math.max(maxDigits, 1);
}


function trimToCountryLength(value: string, countryCode: CountryCode): string {
    if (isFreeformPhoneCountryInternal(countryCode)) {
        return value;
    }

    let boundedDigits = value;

    while (boundedDigits.length > 0) {
        const validationResult = validatePhoneNumberLength(
            boundedDigits,
            toLibCountryCode(countryCode)
        );

        if (validationResult !== "TOO_LONG") {
            break;
        }

        boundedDigits = boundedDigits.slice(0, -1);
    }

    return boundedDigits;
}


function normalizePhoneDigits(rawValue: string, countryCode: CountryCode): string {
    const digitsOnly = sanitizePhoneDigits(rawValue);
    if (digitsOnly.length === 0) {
        return "";
    }

    const maxNationalDigits = resolveCountryMaxNationalDigits(countryCode);
    const dialCode = resolveCountryDialCode(countryCode);
    const hasDialPrefix = dialCode.length > 0
        && digitsOnly.startsWith(dialCode)
        && digitsOnly.length > maxNationalDigits;
    const withoutDialPrefix = hasDialPrefix ? digitsOnly.slice(dialCode.length) : digitsOnly;
    const trimmedToMetadataLimit = trimToCountryLength(withoutDialPrefix, countryCode);

    return trimmedToMetadataLimit.slice(0, maxNationalDigits);
}


function getValidatedE164(
    value: string,
    countryCode: CountryCode
): string {
    const parsedPhone = parsePhoneNumberFromString(value, toLibCountryCode(countryCode));
    if (parsedPhone === undefined || !parsedPhone.isValid()) {
        return "";
    }

    return parsedPhone.number;
}

/**
 * @summary Returns available phone country metadata used by country selectors.
 * @returns Immutable phone country options list.
 */

export function getPhoneCountryOptions(): readonly PhoneCountryOption[] {
    return PHONE_COUNTRY_OPTIONS;
}

/**
 * @summary Returns phone country metadata for a specific ISO country code.
 * @param countryCode ISO country code.
 * @returns Shared country option or undefined when not found.
 */

export function getPhoneCountryOption(
    countryCode: CountryCode
): PhoneCountryOption | undefined {
    return PHONE_COUNTRY_OPTIONS.find((option) => option.code === countryCode);
}

/**
 * @summary Maps a language preference to its default phone country.
 * @param language Active user language.
 * @returns ISO country code used by phone parser and mask.
 */

export function resolvePhoneCountryFromLanguage(language: Language): CountryCode {
    return COUNTRY_BY_LANGUAGE[language] ?? DEFAULT_PHONE_COUNTRY;
}

/**
 * @summary Indicates whether the selected country uses freeform phone entry instead of masking.
 * @param countryCode Selected country code.
 * @returns True when the phone input should bypass country formatting rules.
 */
export function isFreeformPhoneCountry(countryCode: CountryCode): boolean {
    return isFreeformPhoneCountryInternal(countryCode);
}

/**
 * @summary Formats typed phone digits and emits canonical E.164 when the number is valid.
 * @param rawValue Raw typed value.
 * @param countryCode Selected country code.
 * @returns Display value and canonical E.164 when valid.
 */

export function parsePhoneDraft(
    rawValue: string,
    countryCode: CountryCode
): ParsedPhoneDraft {
    if (isFreeformPhoneCountryInternal(countryCode)) {
        const trimmedValue = rawValue.trim();

        return {
            displayValue: trimmedValue,
            canonicalValue: trimmedValue,
        };
    }

    const digitsOnly = normalizePhoneDigits(rawValue, countryCode);
    if (digitsOnly.length === 0) {
        return {
            displayValue: "",
            canonicalValue: "",
        };
    }

    const formatter = new AsYouType(toLibCountryCode(countryCode));
    const asYouTypeDisplay = formatter.input(digitsOnly);
    const fallbackPattern = buildPhoneMaskPattern(countryCode);
    const fallbackDisplay = fallbackPattern
        ? formatDigitsByPattern(digitsOnly, fallbackPattern)
        : digitsOnly;
    const displayValue = hasVisiblePhoneMask(asYouTypeDisplay, digitsOnly)
        && hasStableAsYouTypeDigits(asYouTypeDisplay, digitsOnly)
        ? asYouTypeDisplay
        : fallbackDisplay;
    const canonicalCandidate = formatter.getNumberValue() ?? digitsOnly;

    return {
        displayValue,
        canonicalValue: getValidatedE164(canonicalCandidate, countryCode),
    };
}

/**
 * @summary Normalizes phone input into display and canonical forms with validity metadata.
 * @param value Input value to normalize.
 * @param countryCode Selected country code.
 * @returns Normalized display/canonical payload with validity flags.
 */

export function normalizePhoneValue(
    value: string,
    countryCode: CountryCode
): NormalizedPhoneValue {
    const trimmedValue = value.trim();

    if (isFreeformPhoneCountryInternal(countryCode)) {
        return {
            displayValue: trimmedValue,
            canonicalValue: trimmedValue,
            isValid: trimmedValue.length > 0,
            isPossible: trimmedValue.length > 0,
        };
    }

    if (trimmedValue.length === 0) {
        return {
            displayValue: "",
            canonicalValue: "",
            isValid: false,
            isPossible: false,
        };
    }

    if (trimmedValue.startsWith("+")) {
        const parsedPhone = parsePhoneNumberFromString(trimmedValue);
        if (parsedPhone === undefined) {
            return {
                displayValue: trimmedValue,
                canonicalValue: "",
                isValid: false,
                isPossible: false,
            };
        }

        return {
            displayValue: parsedPhone.country === countryCode
                ? parsedPhone.formatNational()
                : parsedPhone.formatInternational(),
            canonicalValue: parsedPhone.isValid() ? parsedPhone.number : "",
            isValid: parsedPhone.isValid(),
            isPossible: parsedPhone.isPossible(),
        };
    }

    const boundedDigits = normalizePhoneDigits(trimmedValue, countryCode);
    const parsedDraft = parsePhoneDraft(boundedDigits, countryCode);
    const parseSource = parsedDraft.canonicalValue.length > 0
        ? parsedDraft.canonicalValue
        : boundedDigits;
    const parsedPhone = parsePhoneNumberFromString(parseSource, toLibCountryCode(countryCode));

    if (parsedPhone === undefined) {
        return {
            displayValue: parsedDraft.displayValue,
            canonicalValue: "",
            isValid: false,
            isPossible: false,
        };
    }

    return {
        displayValue: parsedPhone.isValid()
            ? parsedPhone.formatInternational()
            : parsedDraft.displayValue,
        canonicalValue: parsedPhone.isValid() ? parsedPhone.number : "",
        isValid: parsedPhone.isValid(),
        isPossible: parsedPhone.isPossible(),
    };
}

/**
 * @summary Recomputes phone display and canonical values when the selected country changes.
 * @param input Existing display/canonical pair and next country code.
 * @returns Reprocessed display/canonical values for the new country.
 */

export function reprocessPhoneCountry(input: {
    readonly displayValue: string;
    readonly canonicalValue: string;
    readonly countryCode: CountryCode;
}): ParsedPhoneDraft {
    const canonicalValue = input.canonicalValue.trim();
    if (canonicalValue.length > 0) {
        const normalized = normalizePhoneValue(canonicalValue, input.countryCode);
        return {
            displayValue: normalized.displayValue,
            canonicalValue: normalized.canonicalValue,
        };
    }

    return parsePhoneDraft(input.displayValue, input.countryCode);
}

/**
 * @summary Validates phone input for required, invalid, and incomplete scenarios.
 * @param input Display/canonical values and validation context.
 * @returns Validation error code or null when valid.
 */

export function validatePhoneValue(input: {
    readonly displayValue: string;
    readonly canonicalValue: string;
    readonly countryCode: CountryCode;
    readonly rules: PhoneValidationRules;
}): PhoneInputValidationError | null {
    if (isFreeformPhoneCountryInternal(input.countryCode)) {
        const hasValue = input.displayValue.trim().length > 0 || input.canonicalValue.trim().length > 0;

        if (input.rules.required && !hasValue) {
            return PhoneInputValidationError.REQUIRED;
        }

        return null;
    }

    const hasAnyDigits = hasDigit(input.displayValue);
    const hasCanonicalValue = input.canonicalValue.trim().length > 0;
    const digitsOnly = sanitizePhoneDigits(input.displayValue);
    const isInternationalDraft = input.displayValue.trim().startsWith("+");

    if (input.rules.required && !hasAnyDigits && !hasCanonicalValue) {
        return PhoneInputValidationError.REQUIRED;
    }

    if (!hasAnyDigits && !hasCanonicalValue) {
        return null;
    }

    const lengthValidation = digitsOnly.length > 0
        ? validatePhoneNumberLength(digitsOnly, toLibCountryCode(input.countryCode))
        : undefined;

    if (lengthValidation === "TOO_SHORT") {
        if (isInternationalDraft) {
            return PhoneInputValidationError.INVALID;
        }

        return input.rules.validateIncomplete
            ? PhoneInputValidationError.INCOMPLETE
            : PhoneInputValidationError.INVALID;
    }

    if (lengthValidation === "TOO_LONG") {
        return PhoneInputValidationError.INVALID;
    }

    const parseSource = hasCanonicalValue ? input.canonicalValue : input.displayValue;
    const parsedPhone = parsePhoneNumberFromString(parseSource, toLibCountryCode(input.countryCode));

    if (parsedPhone === undefined) {
        return PhoneInputValidationError.INVALID;
    }

    if (!parsedPhone.isPossible()) {
        return input.rules.validateIncomplete
            ? PhoneInputValidationError.INCOMPLETE
            : PhoneInputValidationError.INVALID;
    }

    if (!parsedPhone.isValid()) {
        return PhoneInputValidationError.INVALID;
    }

    return null;
}

/**
 * @summary Returns the maximum national digit length configured for a country.
 * @param countryCode Selected country code.
 * @returns Maximum digits accepted for national numbers in that country.
 */

export function getPhoneMaxNationalDigits(countryCode: CountryCode): number {
    return resolveCountryMaxNationalDigits(countryCode);
}

/**
 * @summary Sanitizes raw phone input and enforces the country national digit limit.
 * @param rawValue User-provided value (typed or pasted).
 * @param countryCode Selected country code.
 * @returns Sanitized national digits limited by metadata.
 */

export function normalizePhoneInputDigits(rawValue: string, countryCode: CountryCode): string {
    return normalizePhoneDigits(rawValue, countryCode);
}
