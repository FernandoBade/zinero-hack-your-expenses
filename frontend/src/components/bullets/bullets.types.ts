import type { I18nKey } from "@shared/i18n/types/i18n-key";

/**
 * @summary Typed bullets props.
 */
export interface BulletsProps {
    readonly items: readonly I18nKey[];
    readonly ordered?: boolean;
}
