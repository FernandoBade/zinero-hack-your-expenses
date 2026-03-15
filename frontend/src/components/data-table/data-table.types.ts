import type { ComponentChildren } from "preact";
import type { I18nKey } from "@shared/i18n/types/i18n-key";
import { IconName } from "@shared/enums/icon.enums";
import { LoaderSize } from "@shared/enums/ui.enums";
import type { TableColumn } from "@/components/table/table.types";

/**
 * @summary Typed data table props with loading and empty states.
 */
export interface DataTableProps<TRow> {
    readonly columns: readonly TableColumn<TRow>[];
    readonly rows: readonly TRow[];
    readonly loading?: boolean;
    readonly errorTitle?: I18nKey;
    readonly errorDescription?: I18nKey;
    readonly errorActionLabel?: I18nKey;
    readonly onErrorAction?: () => void;
    readonly loaderSize?: LoaderSize;
    readonly emptyStateTitle: I18nKey;
    readonly emptyStateDescription?: I18nKey;
    readonly emptyStateIcon?: IconName;
    readonly getRowKey?: (row: TRow, rowIndex: number) => string;
    readonly onRowClick?: (row: TRow) => void;
    readonly actionsLabel?: I18nKey;
    readonly renderRowActions?: (row: TRow, rowIndex: number) => ComponentChildren;
}
