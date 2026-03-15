import type { JSX } from "preact";
import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { NumericInputValidationError } from "@shared/enums/input-validation.enums";
import { InputType } from "@shared/enums/input.enums";
import type { I18nKey } from "@shared/i18n/types/i18n-key";
import { Input } from "@/components/input/input";
import type { CanonicalInputValueChange } from "@/components/input/canonical-input.types";
import type { MoneyInputProps } from "@/components/input/money-input.types";
import {
    toCanonicalWithFixedFraction,
    validateCanonicalDecimal,
} from "@/utils/intl/decimalInput";
import {
    canonicalToMaskedValue,
    createNumericMask,
    maskedValueToCanonical,
    type NumericMaskInstance,
} from "@/utils/intl/numericMask";

const MONEY_FRACTION_DIGITS = 2;

const DEFAULT_ERROR_BY_VALIDATION: Readonly<Record<NumericInputValidationError, I18nKey>> = {
    [NumericInputValidationError.REQUIRED]: 'error.field_required_generic',
    [NumericInputValidationError.INVALID]: 'error.invalid_number_value',
    [NumericInputValidationError.MIN]: 'error.value_below_minimum',
    [NumericInputValidationError.MAX]: 'error.value_above_maximum',
    [NumericInputValidationError.GREATER_THAN_ZERO]: 'error.value_must_be_greater_than_zero',
};


function formatMoneyDisplay(
    canonicalValue: string,
    language: MoneyInputProps["language"]
): string {
    if (canonicalValue.trim().length === 0) {
        return "";
    }

    return canonicalToMaskedValue(canonicalValue, language, {
        minimumFractionDigits: MONEY_FRACTION_DIGITS,
        maximumFractionDigits: MONEY_FRACTION_DIGITS,
    });
}


function resolveValidationErrorKey(
    canonicalValue: string,
    props: Pick<
        MoneyInputProps,
        "required" | "min" | "max" | "greaterThanZero" | "validationI18nKeys"
    >
): I18nKey | undefined {
    const validationError = validateCanonicalDecimal(canonicalValue, {
        required: props.required,
        min: props.min,
        max: props.max,
        greaterThanZero: props.greaterThanZero,
    });

    if (validationError === null) {
        return undefined;
    }

    return props.validationI18nKeys?.[validationError] ?? DEFAULT_ERROR_BY_VALIDATION[validationError];
}


function createValueChange(
    canonicalValue: string,
    displayValue: string,
    error: I18nKey | undefined
): CanonicalInputValueChange {
    return {
        canonicalValue,
        displayValue,
        error,
    };
}

/**
 * @summary Renders a locale-aware currency input that emits canonical decimal values.
 * @param props Money input configuration.
 * @returns Money input component.
 */

export function MoneyInput({
    canonicalValue,
    language,
    currency,
    min,
    max,
    greaterThanZero = false,
    validationI18nKeys,
    label,
    placeholder,
    hint,
    required = false,
    disabled = false,
    readOnly = false,
    name,
    id,
    autoComplete,
    error,
    icon,
    iconPosition,
    prefixText,
    suffixText,
    rightSlot,
    leftSlot,
    maxLength,
    minLength,
    onValueChange,
    onValueBlur,
}: MoneyInputProps): JSX.Element {
    const [displayValue, setDisplayValue] = useState<string>(() =>
        formatMoneyDisplay(canonicalValue, language)
    );
    const [isTouched, setIsTouched] = useState<boolean>(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const maskRef = useRef<NumericMaskInstance | null>(null);
    const syncingMaskRef = useRef<boolean>(false);
    const lastEmittedCanonicalRef = useRef<string>(canonicalValue);
    const lastLocaleKeyRef = useRef<string>(`${language}::${currency}`);
    const onValueChangeRef = useRef<MoneyInputProps["onValueChange"]>(onValueChange);
    const validationPropsRef = useRef<
        Pick<MoneyInputProps, "required" | "min" | "max" | "greaterThanZero" | "validationI18nKeys">
    >({
        required,
        min,
        max,
        greaterThanZero,
        validationI18nKeys,
    });
    const isTouchedRef = useRef<boolean>(isTouched);

    onValueChangeRef.current = onValueChange;
    validationPropsRef.current = {
        required,
        min,
        max,
        greaterThanZero,
        validationI18nKeys,
    };
    isTouchedRef.current = isTouched;

    const draftCanonicalValue = useMemo(
        () => maskedValueToCanonical(displayValue, language, MONEY_FRACTION_DIGITS),
        [displayValue, language]
    );
    useEffect(() => {
        const localeKey = `${language}::${currency}`;
        const localeChanged = localeKey !== lastLocaleKeyRef.current;
        const canonicalChangedExternally = canonicalValue !== lastEmittedCanonicalRef.current;

        if (localeChanged || canonicalChangedExternally) {
            const nextDisplayValue = formatMoneyDisplay(canonicalValue, language);
            setDisplayValue(nextDisplayValue);

            if (maskRef.current) {
                syncingMaskRef.current = true;
                maskRef.current.value = nextDisplayValue;
                syncingMaskRef.current = false;
            }
        }

        lastLocaleKeyRef.current = localeKey;
        if (canonicalChangedExternally) {
            lastEmittedCanonicalRef.current = canonicalValue;
        }
    }, [canonicalValue, currency, language]);

    const computedValidationError = useMemo(
        () =>
            resolveValidationErrorKey(draftCanonicalValue, {
                required,
                min,
                max,
                greaterThanZero,
                validationI18nKeys,
            }),
        [
            draftCanonicalValue,
            greaterThanZero,
            max,
            min,
            required,
            validationI18nKeys,
        ]
    );
    const resolvedError = error ?? (isTouched ? computedValidationError : undefined);

    useEffect(() => {
        const inputElement = inputRef.current;
        if (!inputElement) {
            return;
        }

        const mask = createNumericMask(inputElement, {
            language,
            scale: MONEY_FRACTION_DIGITS,
            padFractionalZeros: true,
            normalizeZeros: true,
            useThousandsSeparator: true,
        });
        maskRef.current = mask;
        syncingMaskRef.current = true;
        mask.value = inputElement.value;
        syncingMaskRef.current = false;

        const handleAccept = (): void => {
            if (syncingMaskRef.current) {
                return;
            }

            const nextDisplayValue = mask.value;
            const nextCanonicalValue = maskedValueToCanonical(
                nextDisplayValue,
                language,
                MONEY_FRACTION_DIGITS
            );
            const nextError = resolveValidationErrorKey(nextCanonicalValue, validationPropsRef.current);

            setDisplayValue(nextDisplayValue);
            lastEmittedCanonicalRef.current = nextCanonicalValue;
            onValueChangeRef.current?.(
                createValueChange(
                    nextCanonicalValue,
                    nextDisplayValue,
                    isTouchedRef.current ? nextError : undefined
                )
            );
        };

        mask.on("accept", handleAccept);

        return () => {
            mask.off("accept", handleAccept);
            mask.destroy();
            if (maskRef.current === mask) {
                maskRef.current = null;
            }
        };
    }, [language]);

    const handleBlur = (): void => {
        setIsTouched(true);
        isTouchedRef.current = true;
        const maskDisplayValue = maskRef.current?.value ?? displayValue;
        const parsedCanonicalValue = maskedValueToCanonical(
            maskDisplayValue,
            language,
            MONEY_FRACTION_DIGITS
        );
        const normalizedCanonicalValue = parsedCanonicalValue.length === 0
            ? ""
            : (toCanonicalWithFixedFraction(parsedCanonicalValue, MONEY_FRACTION_DIGITS)
                ?? "");
        const normalizedDisplay = formatMoneyDisplay(normalizedCanonicalValue, language);
        const nextError = resolveValidationErrorKey(normalizedCanonicalValue, {
            required,
            min,
            max,
            greaterThanZero,
            validationI18nKeys,
        });
        const nextValue = createValueChange(
            normalizedCanonicalValue,
            normalizedDisplay,
            nextError
        );

        if (maskRef.current) {
            syncingMaskRef.current = true;
            maskRef.current.value = normalizedDisplay;
            syncingMaskRef.current = false;
        }
        setDisplayValue(normalizedDisplay);
        lastEmittedCanonicalRef.current = normalizedCanonicalValue;

        if (
            normalizedCanonicalValue !== canonicalValue
            || normalizedDisplay !== displayValue
        ) {
            onValueChangeRef.current?.(nextValue);
        }

        onValueBlur?.(nextValue);
    };

    const combinedRightSlot = (
        <>
            {rightSlot}
            <span class="pointer-events-none whitespace-nowrap text-caption font-data text-base-content/70">
                {currency}
            </span>
        </>
    );

    return (
        <Input
            label={label}
            placeholder={placeholder}
            hint={hint}
            type={InputType.TEXT}
            value={displayValue}
            required={required}
            disabled={disabled}
            readOnly={readOnly}
            name={name}
            id={id}
            autoComplete={autoComplete}
            error={resolvedError}
            icon={icon}
            iconPosition={iconPosition}
            prefixText={prefixText}
            suffixText={suffixText}
            rightSlot={combinedRightSlot}
            leftSlot={leftSlot}
            maxLength={maxLength}
            minLength={minLength}
            inputMode="decimal"
            inputRef={inputRef}
            onBlur={handleBlur}
        />
    );
}

