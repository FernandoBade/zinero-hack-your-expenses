import type { ComponentChildren } from "preact";
import type { I18nKey } from "@shared/i18n/types/i18n-key";

export type AuthShellSize = "compact" | "form" | "wide";

/**
 * @summary Typed props for the public authentication shell.
 */
export interface AuthShellProps {
    readonly title: I18nKey;
    readonly subtitle: I18nKey;
    readonly children: ComponentChildren;
    readonly size?: AuthShellSize;
}