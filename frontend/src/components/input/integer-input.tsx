import type { JSX } from "preact";
import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { NumericInputValidationError } from "@shared/enums/input-validation.enums";
import { InputType } from "@shared/enums/input.enums";
import type { I18nKey } from "@shared/i18n/types/i18n-key";
import type { CanonicalInputValueChange } from "@/components/input/canonical-input.types";
import { Input } from "@/components/input/input";
import type { IntegerInputProps } from "@/components/input/integer-input.types";
import { validateCanonicalDecimal } from "@/utils/intl/decimalInput";
import {
    canonicalToMaskedValue,
    createNumericMask,
    maskedValueToCanonical,
    type NumericMaskInstance,
} from "@/utils/intl/numericMask";

const INTEGER_SCALE = 0;

const DEFAULT_ERROR_BY_VALIDATION: Readonly<Record<NumericInputValidationError, I18nKey>> = {
    [NumericInputValidationError.REQUIRED]: 'error.field_required_generic',
    [NumericInputValidationError.INVALID]: 'error.invalid_number_value',
    [NumericInputValidationError.MIN]: 'error.value_below_minimum',
    [NumericInputValidationError.MAX]: 'error.value_above_maximum',
    [NumericInputValidationError.GREATER_THAN_ZERO]: 'error.value_must_be_greater_than_zero',
};


function formatIntegerDisplay(canonicalValue: string, language: IntegerInputProps["language"]): string {
    if (canonicalValue.trim().length === 0) {
        return "";
    }

    return canonicalToMaskedValue(canonicalValue, language, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    });
}


function toIntegerCanonical(maskedValue: string, language: IntegerInputProps["language"]): string {
    const canonicalValue = maskedValueToCanonical(maskedValue, language, INTEGER_SCALE);
    return canonicalValue.split(".")[0] ?? canonicalValue;
}


function resolveValidationErrorKey(
    canonicalValue: string,
    props: Pick<IntegerInputProps, "required" | "min" | "max" | "validationI18nKeys">
): I18nKey | undefined {
    const validationError = validateCanonicalDecimal(canonicalValue, {
        required: props.required,
        min: props.min,
        max: props.max,
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
 * @summary Renders a locale-aware integer input that emits canonical digit values.
 * @param props Integer input configuration.
 * @returns Integer input component.
 */

export function IntegerInput({
    canonicalValue,
    language,
    min,
    max,
    useThousandsSeparator = true,
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
}: IntegerInputProps): JSX.Element {
    const [displayValue, setDisplayValue] = useState<string>(() =>
        formatIntegerDisplay(canonicalValue, language)
    );
    const [isTouched, setIsTouched] = useState<boolean>(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const maskRef = useRef<NumericMaskInstance | null>(null);
    const syncingMaskRef = useRef<boolean>(false);
    const lastEmittedCanonicalRef = useRef<string>(canonicalValue);
    const lastLanguageRef = useRef<IntegerInputProps["language"]>(language);
    const onValueChangeRef = useRef<IntegerInputProps["onValueChange"]>(onValueChange);
    const validationPropsRef = useRef<
        Pick<IntegerInputProps, "required" | "min" | "max" | "validationI18nKeys">
    >({
        required,
        min,
        max,
        validationI18nKeys,
    });
    const isTouchedRef = useRef<boolean>(isTouched);

    onValueChangeRef.current = onValueChange;
    validationPropsRef.current = {
        required,
        min,
        max,
        validationI18nKeys,
    };
    isTouchedRef.current = isTouched;

    useEffect(() => {
        const localeChanged = language !== lastLanguageRef.current;
        const canonicalChangedExternally = canonicalValue !== lastEmittedCanonicalRef.current;

        if (localeChanged || canonicalChangedExternally) {
            const nextDisplayValue = formatIntegerDisplay(canonicalValue, language);
            setDisplayValue(nextDisplayValue);

            if (maskRef.current) {
                syncingMaskRef.current = true;
                maskRef.current.value = nextDisplayValue;
                syncingMaskRef.current = false;
            }
        }

        lastLanguageRef.current = language;
        if (canonicalChangedExternally) {
            lastEmittedCanonicalRef.current = canonicalValue;
        }
    }, [canonicalValue, language]);

    const draftCanonicalValue = useMemo(
        () => toIntegerCanonical(displayValue, language),
        [displayValue, language]
    );
    const computedValidationError = useMemo(
        () =>
            resolveValidationErrorKey(draftCanonicalValue, {
                required,
                min,
                max,
                validationI18nKeys,
            }),
        [draftCanonicalValue, max, min, required, validationI18nKeys]
    );
    const resolvedError = error ?? (isTouched ? computedValidationError : undefined);

    useEffect(() => {
        const inputElement = inputRef.current;
        if (!inputElement) {
            return;
        }

        const mask = createNumericMask(inputElement, {
            language,
            scale: INTEGER_SCALE,
            padFractionalZeros: false,
            normalizeZeros: true,
            useThousandsSeparator,
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
            const nextCanonicalValue = toIntegerCanonical(nextDisplayValue, language);
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
    }, [language, useThousandsSeparator]);

    const handleBlur = (): void => {
        setIsTouched(true);
        isTouchedRef.current = true;
        const normalizedCanonicalValue = toIntegerCanonical(maskRef.current?.value ?? displayValue, language);
        const normalizedDisplay = formatIntegerDisplay(normalizedCanonicalValue, language);
        const nextError = resolveValidationErrorKey(normalizedCanonicalValue, {
            required,
            min,
            max,
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
            rightSlot={rightSlot}
            leftSlot={leftSlot}
            maxLength={maxLength}
            minLength={minLength}
            inputMode="numeric"
            inputRef={inputRef}
            onBlur={handleBlur}
        />
    );
}

