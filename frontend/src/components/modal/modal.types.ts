import type { ComponentChildren } from "preact";
import type { I18nKey } from "@shared/i18n/types/i18n-key";
import { ModalPosition, ModalScrollMode, ModalSize } from "@shared/enums/ui.enums";

/**
 * @summary Typed modal props using HTML dialog behavior.
 */
export interface ModalProps {
    readonly open: boolean;
    readonly title?: I18nKey;
    readonly size?: ModalSize;
    readonly position?: ModalPosition;
    readonly scrollMode?: ModalScrollMode;
    readonly closeOnBackdrop?: boolean;
    readonly closeOnEsc?: boolean;
    readonly showCloseButton?: boolean;
    readonly onClose: () => void;
    readonly children: ComponentChildren;
    readonly footer?: ComponentChildren;
}
