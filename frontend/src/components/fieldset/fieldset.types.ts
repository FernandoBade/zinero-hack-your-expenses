import type { ComponentChildren } from "preact";
import type { I18nKey } from "@shared/i18n/types/i18n-key";

/**
 * @summary Typed fieldset props for grouped form controls.
 */
export interface FieldsetProps {
    readonly legend?: I18nKey;
    readonly description?: I18nKey;
    readonly children: ComponentChildren;
}
