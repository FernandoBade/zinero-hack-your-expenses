import { NumericInputValidationError } from "@shared/enums/input-validation.enums";
import { Language } from "@shared/enums/user.enums";
import type { I18nKey } from "@shared/i18n/types/i18n-key";
import type { CanonicalInputBaseProps } from "@/components/input/canonical-input.types";

/**
 * @summary Typed props for locale-aware integer input with canonical digit output.
 */
export interface IntegerInputProps extends CanonicalInputBaseProps {
    readonly language: Language;
    readonly min?: string;
    readonly max?: string;
    readonly useThousandsSeparator?: boolean;
    readonly validationI18nKeys?: Partial<Record<NumericInputValidationError, I18nKey>>;
}

