import { CountryCode } from "@shared/enums/country.enums";
import { PhoneInputValidationError } from "@shared/enums/input-validation.enums";
import { Language } from "@shared/enums/language.enums";
import {
    getPhoneMaxNationalDigits,
    getPhoneCountryOption,
    getPhoneCountryOptions,
    normalizePhoneValue,
    normalizePhoneInputDigits,
    parsePhoneDraft,
    reprocessPhoneCountry,
    resolvePhoneCountryFromLanguage,
    validatePhoneValue,
} from "@/utils/intl/phoneInput";

describe("phoneInput country selector and E.164 canonical flow", () => {
    it("formats and emits BR canonical E.164 when country is BR", () => {
        const parsed = parsePhoneDraft("11999999999", CountryCode.BR);

        expect(parsed.displayValue.length).toBeGreaterThan(0);
        expect(parsed.canonicalValue).toBe("+5511999999999");
    });

    it("formats and emits US canonical E.164 when country is US", () => {
        const parsed = parsePhoneDraft("2125550142", CountryCode.US);

        expect(parsed.canonicalValue).toBe("+12125550142");
    });

    it("sanitizes pasted values with symbols and emits valid E.164", () => {
        const parsed = parsePhoneDraft("+55 (11) 99999-9999", CountryCode.BR);

        expect(parsed.canonicalValue).toBe("+5511999999999");
    });

    it("sanitizes non-digit input and trims values to country metadata length", () => {
        const parsedFromDirtyInput = parsePhoneDraft("+57 (300) ABC-123-4567", CountryCode.CO);
        const parsedFromLongInput = parsePhoneDraft("3001234567999999", CountryCode.CO);
        const parsedFromLettersOnly = parsePhoneDraft("wqeqweqweqwe", CountryCode.BR);

        expect(parsedFromDirtyInput.canonicalValue).toBe("+573001234567");
        expect(parsedFromLongInput.canonicalValue).toBe("+573001234567");
        expect(parsedFromLettersOnly.canonicalValue).toBe("");
        expect(parsedFromLettersOnly.displayValue).toBe("");
    });

    it("normalizes dial-prefix input and enforces max digits from shared country metadata", () => {
        const brMaxDigits = getPhoneCountryOption(CountryCode.BR)?.maxDigits ?? 0;
        const mxMaxDigits = getPhoneCountryOption(CountryCode.MX)?.maxDigits ?? 0;

        expect(getPhoneMaxNationalDigits(CountryCode.BR)).toBeGreaterThanOrEqual(10);
        expect(getPhoneMaxNationalDigits(CountryCode.CO)).toBeGreaterThanOrEqual(10);
        expect(getPhoneMaxNationalDigits(CountryCode.BR)).toBe(brMaxDigits);
        expect(getPhoneMaxNationalDigits(CountryCode.MX)).toBe(mxMaxDigits);

        expect(normalizePhoneInputDigits("5511949482823", CountryCode.BR)).toBe("11949482823");
        expect(normalizePhoneInputDigits("573001234567", CountryCode.CO)).toBe("3001234567");
        expect(normalizePhoneInputDigits("119999999999999", CountryCode.BR).length).toBe(brMaxDigits);
        expect(normalizePhoneInputDigits("525512345678999", CountryCode.MX).length).toBe(mxMaxDigits);
    });

    it("keeps canonical empty for invalid values and reports validation error", () => {
        const parsed = parsePhoneDraft("123", CountryCode.US);
        const validation = validatePhoneValue({
            displayValue: parsed.displayValue,
            canonicalValue: parsed.canonicalValue,
            countryCode: CountryCode.US,
            rules: {
                required: false,
                validateIncomplete: true,
            },
        });

        expect(parsed.canonicalValue).toBe("");
        expect(validation).toBe(PhoneInputValidationError.INCOMPLETE);
    });

    it("reprocesses display/canonical values when country changes", () => {
        const nextDraft = reprocessPhoneCountry({
            displayValue: "2125550142",
            canonicalValue: "",
            countryCode: CountryCode.US,
        });

        expect(nextDraft.canonicalValue).toBe("+12125550142");

        const switchedDraft = reprocessPhoneCountry({
            displayValue: nextDraft.displayValue,
            canonicalValue: nextDraft.canonicalValue,
            countryCode: CountryCode.BR,
        });

        expect(switchedDraft.canonicalValue).toBe("+12125550142");
        expect(switchedDraft.displayValue).toContain("+1");
    });

    it("preserves digits when country changes and remasks display for the new country", () => {
        const brDraft = parsePhoneDraft("11949482823", CountryCode.BR);
        const preservedDigits = normalizePhoneInputDigits(brDraft.displayValue, CountryCode.BR);
        const coDraft = parsePhoneDraft(preservedDigits, CountryCode.CO);

        expect(normalizePhoneInputDigits(coDraft.displayValue, CountryCode.CO)).toBe("1194948282");
        expect(coDraft.displayValue).toContain(" ");
    });

    it("keeps formatting safe when beforeinput guard is unavailable", () => {
        const parsed = parsePhoneDraft("wqeqwe+57 (300) 123-4567####", CountryCode.CO);

        expect(parsed.canonicalValue).toBe("+573001234567");
        expect(parsed.displayValue).toBe("300 1234567");
    });

    it("resolves default country by language and exposes shared options", () => {
        expect(resolvePhoneCountryFromLanguage(Language.PT_BR)).toBe(CountryCode.BR);
        expect(resolvePhoneCountryFromLanguage(Language.EN_US)).toBe(CountryCode.OTHER);
        expect(resolvePhoneCountryFromLanguage(Language.ES_ES)).toBe(CountryCode.OTHER);
        expect(resolvePhoneCountryFromLanguage("fr-FR" as Language)).toBe(CountryCode.OTHER);

        const options = getPhoneCountryOptions();
        expect(options.length).toBe(8);
        expect(options.map((option) => option.code)).toEqual([
            CountryCode.AR,
            CountryCode.BR,
            CountryCode.CL,
            CountryCode.CO,
            CountryCode.MX,
            CountryCode.PE,
            CountryCode.VE,
            CountryCode.OTHER,
        ]);
        expect(getPhoneCountryOption(CountryCode.BR)?.dialCode).toBe("55");
        expect(getPhoneCountryOption(CountryCode.CO)?.placeholderExample).toBe("300 1234567");
        expect(getPhoneCountryOption(CountryCode.PE)?.dialCode).toBe("51");
        expect(getPhoneCountryOption(CountryCode.VE)?.dialCode).toBe("58");
        expect(getPhoneCountryOption(CountryCode.OTHER)?.dialCode).toBe("");
        expect(getPhoneCountryOption(CountryCode.US)).toBeUndefined();
        expect(getPhoneCountryOption(CountryCode.PT)).toBeUndefined();
        expect(getPhoneCountryOption("XX" as CountryCode)).toBeUndefined();
    });

    it("normalizes valid numbers and keeps invalid values canonical-empty on blur", () => {
        const valid = normalizePhoneValue("2125550142", CountryCode.US);
        const invalid = normalizePhoneValue("+999", CountryCode.US);

        expect(valid.canonicalValue).toBe("+12125550142");
        expect(valid.isValid).toBe(true);
        expect(invalid.canonicalValue).toBe("");
        expect(invalid.isValid).toBe(false);
    });

    it("handles required/empty states and invalid fallback when incomplete validation is off", () => {
        expect(
            validatePhoneValue({
                displayValue: "",
                canonicalValue: "",
                countryCode: CountryCode.US,
                rules: {
                    required: true,
                    validateIncomplete: true,
                },
            })
        ).toBe(PhoneInputValidationError.REQUIRED);

        expect(
            validatePhoneValue({
                displayValue: "",
                canonicalValue: "",
                countryCode: CountryCode.US,
                rules: {
                    required: false,
                    validateIncomplete: true,
                },
            })
        ).toBeNull();

        expect(
            validatePhoneValue({
                displayValue: "2125",
                canonicalValue: "",
                countryCode: CountryCode.US,
                rules: {
                    required: false,
                    validateIncomplete: false,
                },
            })
        ).toBe(PhoneInputValidationError.INVALID);

        expect(
            validatePhoneValue({
                displayValue: "+999",
                canonicalValue: "",
                countryCode: CountryCode.US,
                rules: {
                    required: false,
                    validateIncomplete: true,
                },
            })
        ).toBe(PhoneInputValidationError.INVALID);
    });

    it("keeps OTHER as freeform input and only validates required state", () => {
        const parsed = parsePhoneDraft("+351 912 345 678 ext 99", CountryCode.OTHER);

        expect(parsed.displayValue).toBe("+351 912 345 678 ext 99");
        expect(parsed.canonicalValue).toBe("+351 912 345 678 ext 99");

        expect(
            validatePhoneValue({
                displayValue: parsed.displayValue,
                canonicalValue: parsed.canonicalValue,
                countryCode: CountryCode.OTHER,
                rules: {
                    required: false,
                    validateIncomplete: true,
                },
            })
        ).toBeNull();

        expect(
            validatePhoneValue({
                displayValue: "   ",
                canonicalValue: "",
                countryCode: CountryCode.OTHER,
                rules: {
                    required: true,
                    validateIncomplete: true,
                },
            })
        ).toBe(PhoneInputValidationError.REQUIRED);
    });
});
