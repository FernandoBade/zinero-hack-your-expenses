import { FilterFieldType } from "@shared/enums/filter.enums";
import { IconName } from "@shared/enums/icon.enums";
import { InputType } from "@shared/enums/input.enums";
import { Theme } from "@shared/enums/theme.enums";
import {
    ModalPosition,
    ModalScrollMode,
    ModalSize,
    ToastVariant,
} from "@shared/enums/ui.enums";
import { ResourceKey } from "@shared/i18n/resource.keys";
import type { FieldConfig } from "@/components/filter-bar/filter-bar.types";
import type { SelectOption } from "@/components/select/select.types";
import type { TableColumn } from "@/components/table/table.types";
import { clearToasts, pushToast } from "@/state/toast.store";
import { getTheme, setTheme } from "@/state/theme.store";

const SANDBOX_STATUS_FILTER = {
    ALL: "all",
    ACTIVE: "active",
    INACTIVE: "inactive",
} as const;

type SandboxStatusFilter = (typeof SANDBOX_STATUS_FILTER)[keyof typeof SANDBOX_STATUS_FILTER];

const SANDBOX_DATA_TABLE_MODE = {
    READY: "ready",
    LOADING: "loading",
    EMPTY: "empty",
    ERROR: "error",
} as const;

const STATUS_LABEL: Record<SandboxStatusFilter, string> = {
    [SANDBOX_STATUS_FILTER.ALL]: "All",
    [SANDBOX_STATUS_FILTER.ACTIVE]: "Active",
    [SANDBOX_STATUS_FILTER.INACTIVE]: "Inactive",
};

const STATUS_FILTER_OPTIONS: readonly SelectOption[] = [
    { value: SANDBOX_STATUS_FILTER.ALL, label: ResourceKey.FIELD_LABEL_TAGS },
    { value: SANDBOX_STATUS_FILTER.ACTIVE, label: ResourceKey.FIELD_LABEL_ACTIVE },
    { value: SANDBOX_STATUS_FILTER.INACTIVE, label: ResourceKey.FIELD_LABEL_HIDE_VALUES },
];

const SANDBOX_FILTER_FIELDS: readonly FieldConfig<SandboxFilters>[] = [
    {
        type: FilterFieldType.TEXT,
        name: "query",
        label: ResourceKey.FIELD_LABEL_NAME,
        placeholder: ResourceKey.FIELD_LABEL_NAME,
        icon: IconName.SEARCH,
        inputType: InputType.SEARCH,
        parse: (rawValue) => rawValue,
        serialize: (value) => value ?? "",
    },
    {
        type: FilterFieldType.SELECT,
        name: "status",
        label: ResourceKey.FIELD_LABEL_ACTIVE,
        placeholder: ResourceKey.FIELD_LABEL_TYPE,
        options: STATUS_FILTER_OPTIONS,
        parse: (rawValue) => {
            if (rawValue === SANDBOX_STATUS_FILTER.ACTIVE || rawValue === SANDBOX_STATUS_FILTER.INACTIVE) {
                return rawValue;
            }

            return SANDBOX_STATUS_FILTER.ALL;
        },
        serialize: (value) => value ?? SANDBOX_STATUS_FILTER.ALL,
    },
];

const TOAST_MESSAGE_BY_VARIANT: Record<ToastVariant, ResourceKey> = {
    [ToastVariant.INFO]: ResourceKey.FIELD_LABEL_MESSAGE,
    [ToastVariant.SUCCESS]: ResourceKey.PASSWORD_RESET_SUCCESS,
    [ToastVariant.WARNING]: ResourceKey.PASSWORD_RESET_WARNING,
    [ToastVariant.ERROR]: ResourceKey.UNEXPECTED_ERROR,
};

const TOAST_ICON_BY_VARIANT: Record<ToastVariant, IconName> = {
    [ToastVariant.INFO]: IconName.INFO,
    [ToastVariant.SUCCESS]: IconName.CHECK,
    [ToastVariant.WARNING]: IconName.WARNING,
    [ToastVariant.ERROR]: IconName.ERROR,
};

const DEFAULT_FILTERS: SandboxFilters = {
    query: "",
    status: SANDBOX_STATUS_FILTER.ALL,
};

const DEFAULT_MODAL_STATE: SandboxModalState = {
    open: false,
    size: ModalSize.MD,
    position: ModalPosition.CENTER,
    scrollMode: ModalScrollMode.INSIDE,
    showFooter: true,
};

const MODAL_PARAGRAPHS: readonly string[] = [
    "This modal uses static content so behavior stays deterministic in documentation mode.",
    "Use the controls in the section to change size, viewport position, and scroll ownership.",
    "Press Escape, click the backdrop, or use the close icon to validate close behavior.",
    "The page intentionally avoids business workflows and external API requests.",
    "This long content block helps verify both inside-scroll and body-scroll rendering.",
    "Theme colors and spacing should remain stable in both Light and Dark modes.",
    "All samples are designed for responsive testing in narrow viewport widths.",
];

const SANDBOX_RECORDS: readonly SandboxRecord[] = [
    {
        id: "usr_001",
        name: "Ada Lovelace",
        email: "ada@zinero.dev",
        status: SANDBOX_STATUS_FILTER.ACTIVE,
        monthlyBudget: "1250.00",
        balance: "8920.54",
        note: "Handles strategic planning and reviews long-term goals with the finance committee.",
    },
    {
        id: "usr_002",
        name: "Grace Hopper",
        email: "grace@zinero.dev",
        status: SANDBOX_STATUS_FILTER.INACTIVE,
        monthlyBudget: "980.75",
        balance: "2140.13",
        note: "Pending profile review for a multi-department onboarding process with extended approvals.",
    },
    {
        id: "usr_003",
        name: "Margaret Hamilton",
        email: "margaret@zinero.dev",
        status: SANDBOX_STATUS_FILTER.ACTIVE,
        monthlyBudget: "1730.25",
        balance: "10440.90",
        note: "Owns release readiness reviews and coordinates operational checklists every quarter.",
    },
    {
        id: "usr_004",
        name: "Katherine Johnson",
        email: "katherine@zinero.dev",
        status: SANDBOX_STATUS_FILTER.ACTIVE,
        monthlyBudget: "2200.00",
        balance: "15620.42",
        note: "Maintains forecasting models with tabular numeric reports for monthly planning cycles.",
    },
    {
        id: "usr_005",
        name: "Alan Turing",
        email: "alan@zinero.dev",
        status: SANDBOX_STATUS_FILTER.INACTIVE,
        monthlyBudget: "640.50",
        balance: "880.21",
        note: "Temporary access suspension while role permissions are reviewed by the operations team.",
    },
    {
        id: "usr_006",
        name: "Linus Torvalds",
        email: "linus@zinero.dev",
        status: SANDBOX_STATUS_FILTER.ACTIVE,
        monthlyBudget: "3050.00",
        balance: "17320.75",
        note: "Collaborates on technical standards and validates large text content overflow in tables.",
    },
    {
        id: "usr_007",
        name: "Hedy Lamarr",
        email: "hedy@zinero.dev",
        status: SANDBOX_STATUS_FILTER.ACTIVE,
        monthlyBudget: "1899.99",
        balance: "9420.60",
        note: "Reviews communication guidelines and confirms alert messaging clarity across states.",
    },
    {
        id: "usr_008",
        name: "Dorothy Vaughan",
        email: "dorothy@zinero.dev",
        status: SANDBOX_STATUS_FILTER.INACTIVE,
        monthlyBudget: "730.00",
        balance: "1304.55",
        note: "Scheduled for profile migration and staged reactivation after data validation completes.",
    },
];

type SandboxMoneyFormatter = (amount: string) => string;


function buildSandboxTableColumns(
    formatMoneyValue: SandboxMoneyFormatter
): readonly TableColumn<SandboxRecord>[] {
    return [
        {
            key: "name",
            header: ResourceKey.FIELD_LABEL_NAME,
            render: (row) => row.name,
        },
        {
            key: "email",
            header: ResourceKey.FIELD_LABEL_EMAIL,
            render: (row) => row.email,
        },
        {
            key: "status",
            header: ResourceKey.FIELD_LABEL_ACTIVE,
            render: (row) => STATUS_LABEL[row.status],
        },
        {
            key: "note",
            header: ResourceKey.FIELD_LABEL_OBSERVATION,
            render: (row) => row.note,
        },
        {
            key: "monthlyBudget",
            header: ResourceKey.FIELD_LABEL_VALUE,
            render: (row) => formatMoneyValue(row.monthlyBudget),
            isNumeric: true,
        },
        {
            key: "balance",
            header: ResourceKey.FIELD_LABEL_BALANCE,
            render: (row) => formatMoneyValue(row.balance),
            isNumeric: true,
        },
    ];
}

export { SANDBOX_DATA_TABLE_MODE, SANDBOX_STATUS_FILTER };

export type SandboxDataTableMode = (typeof SANDBOX_DATA_TABLE_MODE)[keyof typeof SANDBOX_DATA_TABLE_MODE];

export type SandboxFilters = Record<string, string> & {
    readonly query: string;
    readonly status: SandboxStatusFilter;
};

export interface SandboxRecord {
    readonly id: string;
    readonly name: string;
    readonly email: string;
    readonly status: SandboxStatusFilter;
    readonly monthlyBudget: string;
    readonly balance: string;
    readonly note: string;
}

export interface SandboxModalState {
    readonly open: boolean;
    readonly size: ModalSize;
    readonly position: ModalPosition;
    readonly scrollMode: ModalScrollMode;
    readonly showFooter: boolean;
}

export interface SandboxController {
    readonly getCurrentTheme: () => Theme;
    readonly applyTheme: (theme: Theme) => Theme;
    readonly getRecords: () => readonly SandboxRecord[];
    readonly getTableColumns: (
        formatMoneyValue: SandboxMoneyFormatter
    ) => readonly TableColumn<SandboxRecord>[];
    readonly getDefaultFilters: () => SandboxFilters;
    readonly mergeFilters: (values: Partial<SandboxFilters>) => SandboxFilters;
    readonly getFilterFields: () => readonly FieldConfig<SandboxFilters>[];
    readonly getFilterOptions: () => readonly SelectOption[];
    readonly filterRecords: (values: SandboxFilters) => readonly SandboxRecord[];
    readonly getTotalPages: (totalRows: number, pageSize: number) => number;
    readonly paginateRecords: (
        rows: readonly SandboxRecord[],
        page: number,
        pageSize: number
    ) => readonly SandboxRecord[];
    readonly resolveDataTableRows: (
        rows: readonly SandboxRecord[],
        mode: SandboxDataTableMode
    ) => readonly SandboxRecord[];
    readonly getDefaultModalState: () => SandboxModalState;
    readonly openModal: (
        state: SandboxModalState,
        patch: Partial<SandboxModalState>
    ) => SandboxModalState;
    readonly closeModal: (state: SandboxModalState) => SandboxModalState;
    readonly getModalParagraphs: () => readonly string[];
    readonly triggerToast: (variant: ToastVariant) => void;
    readonly triggerToastWithIcon: (variant: ToastVariant) => void;
    readonly triggerPersistentToast: (variant: ToastVariant) => void;
    readonly triggerToastBurst: () => void;
    readonly clearAllToasts: () => void;
}

/**
 * @summary Builds sandbox demo data, filters, and UI interaction handlers.
 * @returns Typed controller actions and showcase datasets.
 */

export function createSandboxController(): SandboxController {
    const getCurrentTheme = (): Theme => getTheme();

    const applyTheme = (theme: Theme): Theme => {
        setTheme(theme);
        return getTheme();
    };

    const getRecords = (): readonly SandboxRecord[] => SANDBOX_RECORDS;

    const getTableColumns = (
        formatMoneyValue: SandboxMoneyFormatter
    ): readonly TableColumn<SandboxRecord>[] => buildSandboxTableColumns(formatMoneyValue);

    const getDefaultFilters = (): SandboxFilters => ({ ...DEFAULT_FILTERS });

    const mergeFilters = (values: Partial<SandboxFilters>): SandboxFilters => ({
        query: values.query ?? DEFAULT_FILTERS.query,
        status: values.status ?? DEFAULT_FILTERS.status,
    });

    const getFilterFields = (): readonly FieldConfig<SandboxFilters>[] => SANDBOX_FILTER_FIELDS;

    const getFilterOptions = (): readonly SelectOption[] => STATUS_FILTER_OPTIONS;

    const filterRecords = (values: SandboxFilters): readonly SandboxRecord[] => {
        const query = values.query.trim().toLowerCase();

        return SANDBOX_RECORDS.filter((record) => {
            const matchesQuery =
                query.length === 0
                || record.name.toLowerCase().includes(query)
                || record.email.toLowerCase().includes(query)
                || record.note.toLowerCase().includes(query);

            if (!matchesQuery) {
                return false;
            }

            if (values.status === SANDBOX_STATUS_FILTER.ALL) {
                return true;
            }

            return record.status === values.status;
        });
    };

    const getTotalPages = (totalRows: number, pageSize: number): number => {
        if (pageSize <= 0) {
            return 1;
        }

        return Math.max(1, Math.ceil(totalRows / pageSize));
    };

    const paginateRecords = (
        rows: readonly SandboxRecord[],
        page: number,
        pageSize: number
    ): readonly SandboxRecord[] => {
        if (pageSize <= 0) {
            return rows;
        }

        const safePage = Math.max(1, page);
        const start = (safePage - 1) * pageSize;
        return rows.slice(start, start + pageSize);
    };

    const resolveDataTableRows = (
        rows: readonly SandboxRecord[],
        mode: SandboxDataTableMode
    ): readonly SandboxRecord[] => {
        if (mode === SANDBOX_DATA_TABLE_MODE.EMPTY) {
            return [];
        }

        return rows;
    };

    const getDefaultModalState = (): SandboxModalState => ({ ...DEFAULT_MODAL_STATE });

    const openModal = (
        state: SandboxModalState,
        patch: Partial<SandboxModalState>
    ): SandboxModalState => ({
        ...state,
        ...patch,
        open: true,
    });

    const closeModal = (state: SandboxModalState): SandboxModalState => ({
        ...state,
        open: false,
    });

    const getModalParagraphs = (): readonly string[] => MODAL_PARAGRAPHS;

    const triggerToast = (variant: ToastVariant): void => {
        pushToast({
            variant,
            message: TOAST_MESSAGE_BY_VARIANT[variant],
        });
    };

    const triggerToastWithIcon = (variant: ToastVariant): void => {
        pushToast({
            variant,
            message: TOAST_MESSAGE_BY_VARIANT[variant],
            icon: TOAST_ICON_BY_VARIANT[variant],
        });
    };

    const triggerPersistentToast = (variant: ToastVariant): void => {
        pushToast({
            variant,
            message: TOAST_MESSAGE_BY_VARIANT[variant],
            icon: TOAST_ICON_BY_VARIANT[variant],
            durationMs: 0,
        });
    };

    const triggerToastBurst = (): void => {
        pushToast({
            variant: ToastVariant.INFO,
            message: TOAST_MESSAGE_BY_VARIANT[ToastVariant.INFO],
            icon: TOAST_ICON_BY_VARIANT[ToastVariant.INFO],
        });
        pushToast({
            variant: ToastVariant.SUCCESS,
            message: TOAST_MESSAGE_BY_VARIANT[ToastVariant.SUCCESS],
            icon: TOAST_ICON_BY_VARIANT[ToastVariant.SUCCESS],
        });
        pushToast({
            variant: ToastVariant.WARNING,
            message: TOAST_MESSAGE_BY_VARIANT[ToastVariant.WARNING],
            icon: TOAST_ICON_BY_VARIANT[ToastVariant.WARNING],
        });
    };

    const clearAllToasts = (): void => {
        clearToasts();
    };

    return {
        getCurrentTheme,
        applyTheme,
        getRecords,
        getTableColumns,
        getDefaultFilters,
        mergeFilters,
        getFilterFields,
        getFilterOptions,
        filterRecords,
        getTotalPages,
        paginateRecords,
        resolveDataTableRows,
        getDefaultModalState,
        openModal,
        closeModal,
        getModalParagraphs,
        triggerToast,
        triggerToastWithIcon,
        triggerPersistentToast,
        triggerToastBurst,
        clearAllToasts,
    };
}