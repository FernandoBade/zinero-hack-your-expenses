import type { I18nKey } from "@shared/i18n/types/i18n-key";
import { IconName } from "@shared/enums/icon.enums";

/**
 * @summary Typed error-state props.
 */
export interface ErrorStateProps {
    readonly title: I18nKey;
    readonly description?: I18nKey;
    readonly icon?: IconName;
    readonly actionLabel?: I18nKey;
    readonly onAction?: () => void;
}
