import type { I18nKey } from "@shared/i18n/types/i18n-key";
import { IconName } from "@shared/enums/icon.enums";
import { ToastVariant } from "@shared/enums/ui.enums";

/**
 * NECESSARY DIFFERENCE: frontend keeps this UI contract local because it defines
 * client-only presentation state shape (runtime toast id and duration) that does
 * not belong to domain/backend shared contracts.
 */
export interface ToastPayload {
    readonly variant: ToastVariant;
    readonly message: I18nKey;
    readonly icon?: IconName;
    readonly durationMs?: number;
}

/**
 * @summary Toast item persisted in UI state.
 */
export interface ToastItem extends ToastPayload {
    readonly id: string;
}
