import type { ComponentChildren, JSX } from "preact";
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
    readonly disabled?: boolean;
    readonly loading?: boolean;
    readonly iconLeft?: IconName;
    readonly iconRight?: IconName;
    readonly type?: JSX.ButtonHTMLAttributes<HTMLButtonElement>["type"];
    readonly onClick?: JSX.MouseEventHandler<HTMLButtonElement>;
}
