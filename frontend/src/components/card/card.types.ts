import type { ComponentChildren } from "preact";
import type { I18nKey } from "@shared/i18n/types/i18n-key";

/**
 * @summary Typed card props for structured content blocks.
 */
export interface CardProps {
    readonly title?: I18nKey;
    readonly description?: I18nKey;
    readonly children: ComponentChildren;
    readonly compact?: boolean;
    readonly bgColor?: string;
}
