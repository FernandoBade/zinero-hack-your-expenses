import { NumericInputValidationError } from "@shared/enums/input-validation.enums";
import { Language } from "@shared/enums/user.enums";
import type { I18nKey } from "@shared/i18n/types/i18n-key";
import type { CanonicalInputBaseProps } from "@/components/input/canonical-input.types";

/**
 * @summary Typed props for locale-aware decimal input with canonical output.
 */
export interface NumberInputProps extends CanonicalInputBaseProps {
    readonly language: Language;
    readonly min?: string;
    readonly max?: string;
    readonly maxFractionDigits?: number;
    readonly validationI18nKeys?: Partial<Record<NumericInputValidationError, I18nKey>>;
}

