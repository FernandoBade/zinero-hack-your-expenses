import { NumericInputValidationError } from "@shared/enums/input-validation.enums";
import { Currency, Language } from "@shared/enums/user.enums";
import type { I18nKey } from "@shared/i18n/types/i18n-key";
import type { CanonicalInputBaseProps } from "@/components/input/canonical-input.types";

/**
 * @summary Typed props for locale-aware monetary input with canonical decimal output.
 */
export interface MoneyInputProps extends CanonicalInputBaseProps {
    readonly language: Language;
    readonly currency: Currency;
    readonly min?: string;
    readonly max?: string;
    readonly greaterThanZero?: boolean;
    readonly validationI18nKeys?: Partial<Record<NumericInputValidationError, I18nKey>>;
}

