import type { ComponentChildren } from "preact";
import type { I18nKey } from "@shared/i18n/types/i18n-key";
import { TooltipPosition } from "@shared/enums/ui.enums";

/**
 * @summary Typed tooltip props.
 */
export interface TooltipProps {
    readonly content: I18nKey;
    readonly position?: TooltipPosition;
    readonly children: ComponentChildren;
}
