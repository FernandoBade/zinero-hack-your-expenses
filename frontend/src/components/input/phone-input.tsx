import type { JSX } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import { CountryCode } from "@shared/enums/country.enums";
import { IconName } from "@shared/enums/icon.enums";
import { InputType } from "@shared/enums/input.enums";
import { PhoneInputValidationError } from "@shared/enums/input-validation.enums";
import type { I18nKey } from "@shared/i18n/types/i18n-key";
import { Icon } from "@/components/icon/icon";
import { Input } from "@/components/input/input";
import type { CanonicalInputValueChange } from "@/components/input/canonical-input.types";
import { getPhoneCountryFlagSource } from "@/components/input/phone-country-flag-map";
import type { PhoneInputProps } from "@/components/input/phone-input.types";
import { classNames } from "@/utils/classNames";
import {
    getPhoneCountryOption,
    getPhoneCountryOptions,
    isFreeformPhoneCountry,
    normalizePhoneInputDigits,
    normalizePhoneValue,
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

interface PhoneDraftState {
    readonly rawValue: string;
    readonly displayValue: string;
    readonly canonicalValue: string;
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

function buildPhoneDraftState(rawValue: string, countryCode: CountryCode): PhoneDraftState {
    if (isFreeformPhoneCountry(countryCode)) {
        const nextDraft = parsePhoneDraft(rawValue, countryCode);

        return {
            rawValue: nextDraft.displayValue,
            displayValue: nextDraft.displayValue,
            canonicalValue: nextDraft.canonicalValue,
        };
    }

    const digitsOnly = normalizePhoneInputDigits(rawValue, countryCode);
    const nextDraft = parsePhoneDraft(digitsOnly, countryCode);

    return {
        rawValue: digitsOnly,
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

function resolveCountryPreservedValue(draftState: PhoneDraftState, countryCode: CountryCode): string {
    return isFreeformPhoneCountry(countryCode) ? draftState.displayValue : draftState.rawValue;
}

function getCountryDisplayName(countryCode: CountryCode): string {
    return t(getPhoneCountryOption(countryCode)?.nameKey ?? 'field.country.label');
}

function getCountryCompactLabel(countryCode: CountryCode): string {
    const countryOption = getPhoneCountryOption(countryCode);
    if (!countryOption) {
        return getCountryDisplayName(CountryCode.OTHER);
    }

    return countryOption.dialCode.length > 0
        ? `+${countryOption.dialCode}`
        : t(countryOption.nameKey);
}

/**
 * @summary Renders an international phone input with image-based country selection and canonical output.
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
    const fallbackCountry = resolvePhoneCountryFromLanguage(language);
    const [selectedCountryCode, setSelectedCountryCode] = useState<CountryCode>(countryCode ?? fallbackCountry);
    const [draftState, setDraftState] = useState<PhoneDraftState>(() =>
        buildPhoneDraftStateFromCanonical(canonicalValue, countryCode ?? fallbackCountry)
    );
    const [isTouched, setIsTouched] = useState<boolean>(false);
    const [isCountryMenuOpen, setIsCountryMenuOpen] = useState<boolean>(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const countryMenuRef = useRef<HTMLDivElement>(null);
    const lastEmittedCanonicalRef = useRef<string>(canonicalValue);
    const lastEffectiveCountryCodeRef = useRef<CountryCode>(countryCode ?? fallbackCountry);

    const effectiveCountryCode = countryCode ?? selectedCountryCode;
    const selectedCountryOption = getPhoneCountryOption(effectiveCountryCode);
    const phoneCountryOptions = getPhoneCountryOptions();
    const selectedCountryName = getCountryDisplayName(effectiveCountryCode);
    const selectedCountryCompactLabel = getCountryCompactLabel(effectiveCountryCode);
    const selectedCountryFlagSource = getPhoneCountryFlagSource(effectiveCountryCode);
    const countryPlaceholder = isFreeformPhoneCountry(effectiveCountryCode)
        ? ""
        : selectedCountryOption?.placeholderExample ?? "";

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
                    : buildPhoneDraftState(
                        resolveCountryPreservedValue(draftState, lastEffectiveCountryCodeRef.current),
                        effectiveCountryCode
                    );
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
    }, [canonicalValue, draftState, effectiveCountryCode, resetValueOnCountryChange]);

    useEffect(() => {
        if (!isCountryMenuOpen) {
            return;
        }

        const handlePointerDown = (event: PointerEvent): void => {
            const eventTarget = event.target;
            if (!(eventTarget instanceof Node)) {
                return;
            }

            if (!countryMenuRef.current?.contains(eventTarget)) {
                setIsCountryMenuOpen(false);
            }
        };

        const handleKeyDown = (event: KeyboardEvent): void => {
            if (event.key === "Escape") {
                setIsCountryMenuOpen(false);
            }
        };

        document.addEventListener("pointerdown", handlePointerDown);
        document.addEventListener("keydown", handleKeyDown);

        return () => {
            document.removeEventListener("pointerdown", handlePointerDown);
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [isCountryMenuOpen]);

    const computedValidationError = resolveValidationErrorKey(
        draftState.displayValue,
        draftState.canonicalValue,
        {
            required,
            validateIncomplete,
            validationI18nKeys,
            countryCode: effectiveCountryCode,
        }
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

    const handleCountryChange = (nextCountryCode: CountryCode): void => {
        const nextDraftState = resetValueOnCountryChange
            ? buildPhoneDraftState("", nextCountryCode)
            : buildPhoneDraftState(
                resolveCountryPreservedValue(draftState, effectiveCountryCode),
                nextCountryCode
            );
        const nextValue = createChangeFromDraft(nextDraftState, nextCountryCode, isTouched);

        setSelectedCountryCode(nextCountryCode);
        setIsCountryMenuOpen(false);
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
        if (disabled || readOnly || isFreeformPhoneCountry(effectiveCountryCode)) {
            return;
        }

        const nativeInputEvent = event as unknown as InputEvent;
        if (nativeInputEvent.data === null) {
            return;
        }

        if (/\D/.test(nativeInputEvent.data)) {
            event.preventDefault();
        }
    };

    const handlePaste: JSX.GenericEventHandler<HTMLInputElement> = (event): void => {
        if (disabled || readOnly || isFreeformPhoneCountry(effectiveCountryCode)) {
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
        setIsCountryMenuOpen(false);

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
        <div ref={countryMenuRef} class="relative flex w-32 items-center border-r border-base-300 pr-2">
            <span class="sr-only" id={`${id ?? name ?? "phone"}-country-label`}>
                {t('field.country.label')}
            </span>

            <button
                id={`${id ?? name ?? "phone"}-country`}
                type="button"
                class={classNames(
                    "flex h-8 w-full items-center gap-2 bg-base-200/70 pl-1 pr-2 text-base-content transition-colors hover:bg-base-200",
                    disabled || readOnly ? "pointer-events-none opacity-70" : undefined
                )}
                aria-haspopup="listbox"
                aria-expanded={isCountryMenuOpen ? "true" : "false"}
                aria-labelledby={`${id ?? name ?? "phone"}-country-label`}
                disabled={disabled || readOnly}
                onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    setIsCountryMenuOpen((currentValue) => !currentValue);
                }}
            >
                <img
                    src={selectedCountryFlagSource}
                    alt={`${selectedCountryName} ${t('field.flag.label')}`}
                    class="h-6 w-8 rounded-sm object-cover ring-1 ring-base-300"
                    loading="lazy"
                />
                <span class="min-w-0 flex-1 truncate font-ui text-caption text-base-content/80">
                    {selectedCountryCompactLabel}
                </span>
                <Icon name={IconName.CHEVRON_DOWN} size={14} />
            </button>

            {isCountryMenuOpen ? (
                <div class="absolute pl-3 left-[-1rem] top-full z-40 mt-2 w-[9rem] overflow-hidden rounded-lg border border-base-300 bg-base-100 p-2 shadow-xl">
                    <div role="listbox" aria-label={t('field.country.label')} class="max-h-72 overflow-y-auto ">
                        {phoneCountryOptions.map((countryOption) => {
                            const optionName = t(countryOption.nameKey);
                            const optionCompactLabel = getCountryCompactLabel(countryOption.code);
                            const isSelected = countryOption.code === effectiveCountryCode;

                            return (
                                <button
                                    key={countryOption.code}
                                    type="button"
                                    class={classNames(
                                        "flex h-9 w-full items-center gap-2 rounded-md px-2 py-1 text-left transition-colors hover:border-y-primary hover:border-y-2",
                                        isSelected ? "border-y-2 rounded-xs" : undefined
                                    )}
                                    role="option"
                                    aria-selected={isSelected}
                                    onClick={(event) => {
                                        event.preventDefault();
                                        event.stopPropagation();
                                        handleCountryChange(countryOption.code);
                                    }}
                                >
                                    <img
                                        src={getPhoneCountryFlagSource(countryOption.code)}
                                        alt={`${optionName} ${t('field.flag.label')}`}
                                        class="h-6 w-8 rounded-sm object-cover ring-1 ring-base-300"
                                        loading="lazy"
                                    />
                                    <span class="min-w-0 flex-1 truncate text-right font-ui text-caption text-base-content/70">
                                        {optionCompactLabel}
                                    </span>
                                    {isSelected ? <Icon name={IconName.PHONE} size={18} /> : null}
                                </button>
                            );
                        })}
                    </div>
                </div>
            ) : null}
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
