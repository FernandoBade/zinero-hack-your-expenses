import type { ComponentChildren } from "preact";
import type { ResourceKey } from "@shared/i18n/resource.keys";

/**
 * @summary Typed card props for structured content blocks.
 */
export interface CardProps {
    readonly title?: ResourceKey;
    readonly description?: ResourceKey;
    readonly children: ComponentChildren;
    readonly compact?: boolean;
    readonly bgColor?: string;
}
