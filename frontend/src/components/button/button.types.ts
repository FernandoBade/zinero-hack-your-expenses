import type { ComponentChildren, ButtonHTMLAttributes, MouseEventHandler } from "preact";
import type { I18nKey } from "@shared/i18n/types/i18n-key";
import { IconName } from "@shared/enums/icon.enums";
import { ButtonSize, ButtonVariant } from "@shared/enums/ui.enums";

/**
 * @summary Typed button props with internal Daisy variant mapping.
 */
export interface ButtonProps {
    readonly label?: I18nKey;
    readonly children?: ComponentChildren;
    readonly ariaLabel?: I18nKey;
    readonly variant?: ButtonVariant;
    readonly size?: ButtonSize;
    readonly fullWidth?: boolean;
    readonly disabled?: boolean;
    readonly loading?: boolean;
    readonly iconLeft?: IconName;
    readonly iconRight?: IconName;
    readonly type?: ButtonHTMLAttributes<HTMLButtonElement>["type"];
    readonly onClick?: MouseEventHandler<HTMLButtonElement>;
}