import type { ComponentChildren, HTMLAttributes, Ref } from "preact";
import type { I18nKey } from "@shared/i18n/types/i18n-key";
import { IconPosition } from "@shared/enums/icon-position.enums";
import { IconName } from "@shared/enums/icon.enums";
import { InputType } from "@shared/enums/input.enums";

/**
 * @summary Typed input props for reusable form controls.
 */
export interface InputProps {
    readonly label?: I18nKey;
    readonly placeholder?: I18nKey;
    readonly placeholderText?: string;
    readonly hint?: I18nKey;
    readonly type?: InputType;
    readonly value?: string;
    readonly required?: boolean;
    readonly disabled?: boolean;
    readonly readOnly?: boolean;
    readonly name?: string;
    readonly id?: string;
    readonly autoComplete?: string;
    readonly error?: I18nKey;
    readonly icon?: IconName;
    readonly iconPosition?: IconPosition;
    readonly prefixText?: I18nKey;
    readonly suffixText?: I18nKey;
    readonly rightSlot?: ComponentChildren;
    readonly leftSlot?: ComponentChildren;
    readonly maxLength?: number;
    readonly minLength?: number;
    readonly inputMode?: HTMLAttributes<HTMLInputElement>["inputMode"];
    readonly inputRef?: Ref<HTMLInputElement>;
    readonly onBeforeInput?: HTMLAttributes<HTMLInputElement>["onBeforeInput"];
    readonly onPaste?: HTMLAttributes<HTMLInputElement>["onPaste"];
    readonly onChange?: (value: string) => void;
    readonly onBlur?: () => void;
}
