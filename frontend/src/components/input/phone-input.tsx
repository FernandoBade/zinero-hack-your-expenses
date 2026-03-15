import type { JSX } from "preact";
import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { CountryCode } from "@shared/enums/country.enums";
import { InputType } from "@shared/enums/input.enums";
import { PhoneInputValidationError } from "@shared/enums/input-validation.enums";
import type { I18nKey } from "@shared/i18n/types/i18n-key";
import { Input } from "@/components/input/input";
import type { CanonicalInputValueChange } from "@/components/input/canonical-input.types";
import type { PhoneInputProps } from "@/components/input/phone-input.types";
import { classNames } from "@/utils/classNames";
import {
    getPhoneCountryOption,
    getPhoneCountryOptions,
    normalizePhoneValue,
    normalizePhoneInputDigits,
    parsePhoneDraft,
    resolvePhoneCountryFromLanguage,
    validatePhoneValue,
} from "@/utils/intl/phoneInput";
import { t } from "@/utils/i18n/translate";

const DEFAULT_ERROR_BY_VALIDATION: Readonly<Record<PhoneInputValidationError, I18nKey>> = {
    [PhoneInputValidationError.REQUIRED]: 'error.field_required_generic',
    [PhoneInputValidationError.INVALID]: 'error.phone_number_invalid',
    [PhoneInputValidationError.INCOMPLETE]: 'error.phone_number_incomplete',
};


function getFlagFromCountryCode(countryCode: CountryCode): string {
    return countryCode
        .split("")
        .map((character) => String.fromCodePoint(127397 + character.charCodeAt(0)))
        .join("");
}


function formatCountryOptionLabel(countryCode: CountryCode): string {
    const countryOption = getPhoneCountryOptions().find((option) => option.code === countryCode);
    if (countryOption === undefined) {
        return countryCode;
    }

    return `${getFlagFromCountryCode(countryOption.code)} ${t(countryOption.nameKey)} +${countryOption.dialCode}`;
}


function formatPhoneDisplay(canonicalValue: string, countryCode: CountryCode): string {
    if (canonicalValue.trim().length === 0) {
        return "";
    }

    return normalizePhoneValue(canonicalValue, countryCode).displayValue;
}


function resolveValidationErrorKey(
    displayValue: string,
    canonicalValue: string,
    props: Pick<
        PhoneInputProps,
        "required" | "validateIncomplete" | "validationI18nKeys"
    > & {
        readonly countryCode: CountryCode;
    }
): I18nKey | undefined {
    const validationError = validatePhoneValue({
        displayValue,
        canonicalValue,
        countryCode: props.countryCode,
        rules: {
            required: props.required,
            validateIncomplete: props.validateIncomplete,
        },
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


function syncInputElementValue(inputElement: HTMLInputElement | null, nextDisplayValue: string): void {
    if (!inputElement) {
        return;
    }

    if (inputElement.value !== nextDisplayValue) {
        inputElement.value = nextDisplayValue;
    }
}

interface PhoneDraftState {
    readonly digitsOnly: string;
    readonly displayValue: string;
    readonly canonicalValue: string;
}


function buildPhoneDraftState(rawValue: string, countryCode: CountryCode): PhoneDraftState {
    const digitsOnly = normalizePhoneInputDigits(rawValue, countryCode);
    const nextDraft = parsePhoneDraft(digitsOnly, countryCode);

    return {
        digitsOnly,
        displayValue: nextDraft.displayValue,
        canonicalValue: nextDraft.canonicalValue,
    };
}


function buildPhoneDraftStateFromCanonical(
    canonicalValue: string,
    countryCode: CountryCode
): PhoneDraftState {
    const normalizedDisplay = formatPhoneDisplay(canonicalValue, countryCode);
    const rawValue = normalizedDisplay.length > 0 ? normalizedDisplay : canonicalValue;

    return buildPhoneDraftState(rawValue, countryCode);
}

/**
 * @summary Renders an international phone input with country selection and canonical E.164 output.
 * @param props Phone input configuration.
 * @returns Phone input component.
 */

export function PhoneInput({
    canonicalValue,
    language,
    countryCode,
    resetValueOnCountryChange = true,
    validateIncomplete = false,
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
    onCountryChange,
}: PhoneInputProps): JSX.Element {
    const fallbackCountry = useMemo(() => resolvePhoneCountryFromLanguage(language), [language]);
    const [selectedCountryCode, setSelectedCountryCode] = useState<CountryCode>(countryCode ?? fallbackCountry);
    const [draftState, setDraftState] = useState<PhoneDraftState>(() =>
        buildPhoneDraftStateFromCanonical(canonicalValue, countryCode ?? fallbackCountry)
    );
    const [isTouched, setIsTouched] = useState<boolean>(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const lastEmittedCanonicalRef = useRef<string>(canonicalValue);
    const lastEffectiveCountryCodeRef = useRef<CountryCode>(countryCode ?? fallbackCountry);

    const effectiveCountryCode = countryCode ?? selectedCountryCode;
    const phoneCountryOptions = getPhoneCountryOptions();
    const countryPlaceholder = useMemo(
        () => getPhoneCountryOption(effectiveCountryCode)?.placeholderExample ?? "",
        [effectiveCountryCode]
    );

    useEffect(() => {
        if (countryCode !== undefined) {
            setSelectedCountryCode(countryCode);
            return;
        }

        if (canonicalValue.trim().length === 0) {
            setSelectedCountryCode(fallbackCountry);
        }
    }, [canonicalValue, countryCode, fallbackCountry]);

    useEffect(() => {
        const effectiveCountryChanged = effectiveCountryCode !== lastEffectiveCountryCodeRef.current;
        const canonicalChangedExternally = canonicalValue !== lastEmittedCanonicalRef.current;

        if (effectiveCountryChanged) {
            const nextDraftState = canonicalChangedExternally
                ? buildPhoneDraftStateFromCanonical(canonicalValue, effectiveCountryCode)
                : resetValueOnCountryChange
                    ? buildPhoneDraftState("", effectiveCountryCode)
                    : buildPhoneDraftState(draftState.digitsOnly, effectiveCountryCode);
            setDraftState(nextDraftState);
            syncInputElementValue(inputRef.current, nextDraftState.displayValue);
            lastEffectiveCountryCodeRef.current = effectiveCountryCode;
            lastEmittedCanonicalRef.current = nextDraftState.canonicalValue;

            return;
        }

        if (canonicalChangedExternally) {
            const nextDraftState = buildPhoneDraftStateFromCanonical(canonicalValue, effectiveCountryCode);
            setDraftState(nextDraftState);
            syncInputElementValue(inputRef.current, nextDraftState.displayValue);
            lastEmittedCanonicalRef.current = canonicalValue;
        }
    }, [canonicalValue, draftState.digitsOnly, effectiveCountryCode, resetValueOnCountryChange]);

    const computedValidationError = useMemo(
        () =>
            resolveValidationErrorKey(draftState.displayValue, draftState.canonicalValue, {
                required,
                validateIncomplete,
                validationI18nKeys,
                countryCode: effectiveCountryCode,
            }),
        [
            draftState.canonicalValue,
            draftState.displayValue,
            effectiveCountryCode,
            required,
            validateIncomplete,
            validationI18nKeys,
        ]
    );
    const resolvedError = error ?? (isTouched ? computedValidationError : undefined);

    const emitValueChange = (nextValue: CanonicalInputValueChange): void => {
        onValueChange?.(nextValue);
    };

    const commitDraftState = (
        nextDraftState: PhoneDraftState,
        options?: {
            readonly forceSync?: boolean;
        }
    ): void => {
        setDraftState(nextDraftState);
        if (options?.forceSync) {
            syncInputElementValue(inputRef.current, nextDraftState.displayValue);
        }
        lastEmittedCanonicalRef.current = nextDraftState.canonicalValue;
    };

    const createChangeFromDraft = (
        nextDraftState: PhoneDraftState,
        targetCountryCode: CountryCode,
        touched: boolean
    ): CanonicalInputValueChange => {
        const nextError = resolveValidationErrorKey(
            nextDraftState.displayValue,
            nextDraftState.canonicalValue,
            {
                required,
                validateIncomplete,
                validationI18nKeys,
                countryCode: targetCountryCode,
            }
        );

        return createValueChange(
            nextDraftState.canonicalValue,
            nextDraftState.displayValue,
            touched ? nextError : undefined
        );
    };

    const handleCountrySelectChange: JSX.GenericEventHandler<HTMLSelectElement> = (event): void => {
        const nextCountryCode = event.currentTarget.value as CountryCode;
        const nextDraftState = resetValueOnCountryChange
            ? buildPhoneDraftState("", nextCountryCode)
            : buildPhoneDraftState(draftState.digitsOnly, nextCountryCode);
        const nextValue = createChangeFromDraft(nextDraftState, nextCountryCode, isTouched);

        setSelectedCountryCode(nextCountryCode);
        commitDraftState(nextDraftState, {
            forceSync: true,
        });
        lastEffectiveCountryCodeRef.current = nextCountryCode;

        emitValueChange(nextValue);
        onCountryChange?.(nextCountryCode, nextValue);
    };

    const handleChange = (nextDisplayValue: string): void => {
        const previousDisplayValue = draftState.displayValue;
        const nextDraftState = buildPhoneDraftState(nextDisplayValue, effectiveCountryCode);
        const nextValue = createChangeFromDraft(nextDraftState, effectiveCountryCode, isTouched);
        const shouldForceSync = nextDraftState.displayValue === previousDisplayValue
            && nextDisplayValue !== previousDisplayValue;

        commitDraftState(nextDraftState, {
            forceSync: shouldForceSync,
        });
        emitValueChange(nextValue);
    };

    const handleBeforeInput: JSX.GenericEventHandler<HTMLInputElement> = (event): void => {
        if (disabled || readOnly) {
            return;
        }

        const nativeInputEvent = event as unknown as InputEvent;
        if (nativeInputEvent.data === null) {
            return;
        }

        if (/\D/.test(nativeInputEvent.data)) {
            event.preventDefault();
            return;
        }

        // Length limiting is handled by normalized parser to keep replace-selection flows stable.
    };

    const handlePaste: JSX.GenericEventHandler<HTMLInputElement> = (event): void => {
        if (disabled || readOnly) {
            return;
        }

        event.preventDefault();

        const clipboardEvent = event as unknown as ClipboardEvent;
        const pastedText = clipboardEvent.clipboardData?.getData("text") ?? "";
        const inputElement = event.currentTarget;
        const selectionStart = inputElement.selectionStart ?? inputElement.value.length;
        const selectionEnd = inputElement.selectionEnd ?? selectionStart;
        const nextRawValue = `${inputElement.value.slice(0, selectionStart)}${pastedText}${inputElement.value.slice(selectionEnd)}`;
        const nextDraftState = buildPhoneDraftState(nextRawValue, effectiveCountryCode);
        const nextValue = createChangeFromDraft(nextDraftState, effectiveCountryCode, isTouched);

        commitDraftState(nextDraftState, {
            forceSync: true,
        });
        emitValueChange(nextValue);
    };

    const handleBlur = (): void => {
        setIsTouched(true);
        const nextDraftState = buildPhoneDraftState(draftState.displayValue, effectiveCountryCode);
        const nextValue = createChangeFromDraft(nextDraftState, effectiveCountryCode, true);

        commitDraftState(nextDraftState);

        if (
            nextDraftState.canonicalValue !== canonicalValue
            || nextDraftState.displayValue !== draftState.displayValue
        ) {
            emitValueChange(nextValue);
        }

        onValueBlur?.(nextValue);
    };

    const countrySelector = (
        <div class="flex items-center border-r border-base-300 pr-2">
            <label class="sr-only" for={`${id ?? name ?? "phone"}-country`}>
                {t('field.country.label')}
            </label>
            <select
                id={`${id ?? name ?? "phone"}-country`}
                class={classNames(
                    "select select-ghost h-8 min-h-0 w-36 bg-transparent p-0 pr-6 text-caption font-ui focus:outline-none",
                    disabled ? "pointer-events-none opacity-70" : undefined
                )}
                value={effectiveCountryCode}
                disabled={disabled || readOnly}
                onChange={handleCountrySelectChange}
            >
                {phoneCountryOptions.map((countryOption) => (
                    <option key={countryOption.code} value={countryOption.code}>
                        {formatCountryOptionLabel(countryOption.code)}
                    </option>
                ))}
            </select>
        </div>
    );

    const combinedLeftSlot = (
        <>
            {countrySelector}
            {leftSlot}
        </>
    );

    return (
        <Input
            label={label}
            placeholder={placeholder}
            placeholderText={countryPlaceholder}
            hint={hint}
            type={InputType.TEL}
            value={draftState.displayValue}
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
            leftSlot={combinedLeftSlot}
            maxLength={maxLength}
            minLength={minLength}
            inputMode="tel"
            inputRef={inputRef}
            onBeforeInput={handleBeforeInput}
            onPaste={handlePaste}
            onChange={handleChange}
            onBlur={handleBlur}
        />
    );
}

