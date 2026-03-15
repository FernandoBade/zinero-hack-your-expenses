import type { I18nKey } from "@shared/i18n/types/i18n-key";
import { IconPosition } from "@shared/enums/icon-position.enums";
import { IconName } from "@shared/enums/icon.enums";

export interface SelectOption {
    readonly label: I18nKey;
    readonly value: string;
}

/**
 * @summary Typed select props for reusable option lists.
 */
export interface SelectProps {
    readonly label?: I18nKey;
    readonly placeholder?: I18nKey;
    readonly hint?: I18nKey;
    readonly error?: I18nKey;
    readonly options: readonly SelectOption[];
    readonly value?: string;
    readonly required?: boolean;
    readonly disabled?: boolean;
    readonly icon?: IconName;
    readonly iconPosition?: IconPosition;
    readonly onChange?: (value: string) => void;
}
