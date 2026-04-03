import type { ComponentChildren } from "preact";
import type { InputProps } from "@/components/input/input.types";
import type { I18nKey } from "@shared/i18n/types/i18n-key";

/**
 * @summary Password input props reusing the shared text-input contract.
 */
export interface PasswordInputProps extends Omit<InputProps, "type" | "rightSlot"> {
    readonly visibleIcon?: ComponentChildren;
    readonly hiddenIcon?: ComponentChildren;
    readonly toggleButtonClassName?: string;
    readonly showAriaLabel?: I18nKey;
    readonly hideAriaLabel?: I18nKey;
}
