import type { I18nKey } from "@shared/i18n/types/i18n-key";
import { IconName } from "@shared/enums/icon.enums";

/**
 * @summary Typed empty state props.
 */
export interface EmptyStateProps {
    readonly title: I18nKey;
    readonly description?: I18nKey;
    readonly icon?: IconName;
    readonly actionLabel?: I18nKey;
    readonly onAction?: () => void;
}
