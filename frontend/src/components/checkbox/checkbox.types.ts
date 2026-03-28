import type { ComponentChildren } from "preact";
import type { I18nKey } from "@shared/i18n/types/i18n-key";

/**
 * @summary Typed props for the shared checkbox field.
 */
export interface CheckboxProps {
    readonly label?: I18nKey;
    readonly children?: ComponentChildren;
    readonly checked: boolean;
    readonly error?: I18nKey;
    readonly disabled?: boolean;
    readonly id?: string;
    readonly name?: string;
    readonly onChange?: (checked: boolean) => void;
}