import type { ComponentChildren } from "preact";
import type { I18nKey } from "@shared/i18n/types/i18n-key";

/**
 * @summary Column definition for generic table rendering.
 */
export interface TableColumn<TRow> {
    readonly key: string;
    readonly header: I18nKey;
    readonly render: (row: TRow, rowIndex: number) => ComponentChildren;
    readonly isNumeric?: boolean;
}

/**
 * @summary Typed table props.
 */
export interface TableProps<TRow> {
    readonly columns: readonly TableColumn<TRow>[];
    readonly rows: readonly TRow[];
    readonly getRowKey?: (row: TRow, rowIndex: number) => string;
    readonly onRowClick?: (row: TRow) => void;
    readonly actionsLabel?: I18nKey;
    readonly renderRowActions?: (row: TRow, rowIndex: number) => ComponentChildren;
}
