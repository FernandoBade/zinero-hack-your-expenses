import type { ComponentChildren } from "preact";
import type { I18nKey } from "@shared/i18n/types/i18n-key";

export interface AccordionItem {
    readonly id: string;
    readonly title: I18nKey;
    readonly content: ComponentChildren;
    readonly openByDefault?: boolean;
}

/**
 * @summary Typed accordion props.
 */
export interface AccordionProps {
    readonly items: readonly AccordionItem[];
    readonly allowMultiple?: boolean;
}
