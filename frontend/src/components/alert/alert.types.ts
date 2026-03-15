import type { ComponentChildren } from "preact";
import type { I18nKey } from "@shared/i18n/types/i18n-key";
import { IconName } from "@shared/enums/icon.enums";
import { AlertDirection, AlertStyle, AlertVariant } from "@shared/enums/ui.enums";

/**
 * @summary Typed alert props supporting DaisyUI alert variants, styles and layouts.
 */
export interface AlertProps {
    readonly variant?: AlertVariant;
    readonly style?: AlertStyle;
    readonly direction?: AlertDirection;
    readonly message?: I18nKey;
    readonly title?: I18nKey;
    readonly description?: I18nKey;
    readonly icon?: IconName;
    readonly hideIcon?: boolean;
    readonly actions?: ComponentChildren;
    readonly children?: ComponentChildren;
    readonly compact?: boolean;
}
