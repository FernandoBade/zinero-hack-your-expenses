/**
 * @summary Living documentation page for the Zinero Core UI Kit.
 */

import type { ComponentChildren, JSX } from "preact";
import { useEffect, useMemo, useState } from "preact/hooks";
import { CountryCode } from "@shared/enums/country.enums";
import { IconPosition } from "@shared/enums/icon-position.enums";
import { IconName } from "@shared/enums/icon.enums";
import { InputType } from "@shared/enums/input.enums";
import { Theme } from "@shared/enums/theme.enums";
import { Currency, Language } from "@shared/enums/user.enums";
import {
    AlertDirection,
    AlertStyle,
    AlertVariant,
    ButtonSize,
    ButtonVariant,
    LoaderSize,
    ModalPosition,
    ModalScrollMode,
    ModalSize,
    ToastVariant,
    TooltipPosition,
} from "@shared/enums/ui.enums";
import { ResourceKey } from "@shared/i18n/resource.keys";
import brandDarkHorizontal from "@shared/assets/images/ZINERO_dark_horizontal.png";
import brandDarkSymbol from "@shared/assets/images/ZINERO_dark_symbol.png";
import brandDarkVertical from "@shared/assets/images/ZINERO_dark_vertical.png";
import brandTransparentHorizontal from "@shared/assets/images/ZINERO_transparent_horizontal.png";
import brandTransparentSymbol from "@shared/assets/images/ZINERO_transparent_symbol.png";
import brandTransparentVertical from "@shared/assets/images/ZINERO_transparent_vertical.png";
import type { AccordionItem } from "@/components/accordion/accordion.types";
import { Accordion } from "@/components/accordion/accordion";
import { Alert } from "@/components/alert/alert";
import { Bullets } from "@/components/bullets/bullets";
import { Button } from "@/components/button/button";
import { Card } from "@/components/card/card";
import { Collapse } from "@/components/collapse/collapse";
import { DataTable } from "@/components/data-table/data-table";
import { ErrorState } from "@/components/error-state/error-state";
import { Fieldset } from "@/components/fieldset/fieldset";
import { FilterBar } from "@/components/filter-bar/filter-bar";
import { Form } from "@/components/form/form";
import { FormGrid } from "@/components/form-grid/form-grid";
import { Icon } from "@/components/icon/icon";
import { Input } from "@/components/input/input";
import type { CanonicalInputValueChange } from "@/components/input/canonical-input.types";
import { IntegerInput } from "@/components/input/integer-input";
import { MoneyInput } from "@/components/input/money-input";
import { NumberInput } from "@/components/input/number-input";
import { PhoneInput } from "@/components/input/phone-input";
import { AppLayout } from "@/components/layout/app-layout";
import { Loader } from "@/components/loader/loader";
import { Modal } from "@/components/modal/modal";
import { PageContainer } from "@/components/page-container/page-container";
import { Pagination } from "@/components/pagination/pagination";
import { Select } from "@/components/select/select";
import { Table } from "@/components/table/table";
import { ToastContainer } from "@/components/toast/toast";
import { Tooltip } from "@/components/tooltip/tooltip";
import { getStatusVariantIcon } from "@/components/status/status-variant";
import {
    createSandboxController,
    SANDBOX_DATA_TABLE_MODE,
    SANDBOX_STATUS_FILTER,
    type SandboxDataTableMode,
    type SandboxFilters,
    type SandboxModalState,
} from "@/pages/sandbox/sandbox.controller";
import {
    getUserPreferences,
    setUserPreferences,
    subscribeUserPreferences,
    type UserPreferencesState,
} from "@/state/userPreferences.store";
import { getToasts, removeToast, subscribeToasts } from "@/state/toast.store";
import { formatDate, type FormatDateInput } from "@/utils/intl/date";
import { formatMoney } from "@/utils/intl/money";
import { formatNumber, type FormatNumberInput } from "@/utils/intl/number";
import { resolvePhoneCountryFromLanguage } from "@/utils/intl/phoneInput";
import { t } from "@/utils/i18n/translate";

const PAGE_SIZE = 4;
const SANDBOX_REFERENCE_DATE = new Date(Date.UTC(2026, 0, 31, 12, 0, 0));
const SANDBOX_REFERENCE_DATE_OPTIONS: FormatDateInput["options"] = {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
};
const CANVAS_CLASS = "space-y-6 rounded-3xl border border-base-300 bg-base-200/30 p-4 sm:p-6";
const SECTION_SURFACE_CLASS = "overflow-hidden rounded-2xl border border-base-300 bg-base-100 shadow-sm";
const DEMO_CARD_CLASS = "space-y-3 rounded-xl border border-base-300 bg-base-200/40 p-4";

const BUTTON_VARIANT_LABEL: Record<ButtonVariant, string> = {
    [ButtonVariant.PRIMARY]: "Primary",
    [ButtonVariant.SECONDARY]: "Secondary",
    [ButtonVariant.ACCENT]: "Accent",
    [ButtonVariant.OUTLINE]: "Outline",
    [ButtonVariant.GHOST]: "Ghost",
    [ButtonVariant.LINK]: "Link",
};

const BUTTON_SIZE_LABEL: Record<ButtonSize, string> = {
    [ButtonSize.SM]: "Small",
    [ButtonSize.MD]: "Medium",
    [ButtonSize.LG]: "Large",
};

const ALERT_LABEL: Record<AlertVariant, string> = {
    [AlertVariant.INFO]: "Info",
    [AlertVariant.SUCCESS]: "Success",
    [AlertVariant.WARNING]: "Warning",
    [AlertVariant.ERROR]: "Error",
};

const MODAL_SIZE_LABEL: Record<ModalSize, string> = {
    [ModalSize.SM]: "SM",
    [ModalSize.MD]: "MD",
    [ModalSize.LG]: "LG",
    [ModalSize.XL]: "XL",
};

const MODAL_POSITION_LABEL: Record<ModalPosition, string> = {
    [ModalPosition.CENTER]: "Center",
    [ModalPosition.TOP]: "Top",
    [ModalPosition.BOTTOM]: "Bottom",
};

const MODAL_SCROLL_LABEL: Record<ModalScrollMode, string> = {
    [ModalScrollMode.INSIDE]: "Inside",
    [ModalScrollMode.BODY]: "Body",
};

const DATA_TABLE_MODE_LABEL: Record<SandboxDataTableMode, string> = {
    [SANDBOX_DATA_TABLE_MODE.READY]: "Ready",
    [SANDBOX_DATA_TABLE_MODE.LOADING]: "Loading",
    [SANDBOX_DATA_TABLE_MODE.EMPTY]: "Empty",
    [SANDBOX_DATA_TABLE_MODE.ERROR]: "Error",
};

const TOAST_LABEL: Record<ToastVariant, string> = {
    [ToastVariant.INFO]: "Info Toast",
    [ToastVariant.SUCCESS]: "Success Toast",
    [ToastVariant.WARNING]: "Warning Toast",
    [ToastVariant.ERROR]: "Error Toast",
};

const LANGUAGE_LABEL: Record<Language, string> = {
    [Language.EN_US]: "English (US)",
    [Language.ES_ES]: "Espanol (ES)",
    [Language.PT_BR]: "Portugues (BR)",
};

const CURRENCY_LABEL: Record<Currency, string> = {
    [Currency.ARS]: "ARS",
    [Currency.BRL]: "BRL",
    [Currency.COP]: "COP",
    [Currency.EUR]: "EUR",
    [Currency.USD]: "USD",
};

const BUTTON_VARIANTS: readonly ButtonVariant[] = [
    ButtonVariant.PRIMARY,
    ButtonVariant.SECONDARY,
    ButtonVariant.ACCENT,
    ButtonVariant.OUTLINE,
    ButtonVariant.GHOST,
    ButtonVariant.LINK,
];

const BUTTON_SIZES: readonly ButtonSize[] = [ButtonSize.SM, ButtonSize.MD, ButtonSize.LG];

const ALERT_VARIANTS: readonly AlertVariant[] = [
    AlertVariant.INFO,
    AlertVariant.SUCCESS,
    AlertVariant.WARNING,
    AlertVariant.ERROR,
];

const TOAST_VARIANTS: readonly ToastVariant[] = [
    ToastVariant.INFO,
    ToastVariant.SUCCESS,
    ToastVariant.WARNING,
    ToastVariant.ERROR,
];

const LANGUAGE_OPTIONS: readonly Language[] = [Language.EN_US, Language.ES_ES, Language.PT_BR];

const CURRENCY_OPTIONS: readonly Currency[] = [
    Currency.ARS,
    Currency.BRL,
    Currency.COP,
    Currency.EUR,
    Currency.USD,
];

const MODAL_SIZES: readonly ModalSize[] = [ModalSize.SM, ModalSize.MD, ModalSize.LG, ModalSize.XL];

const MODAL_POSITIONS: readonly ModalPosition[] = [
    ModalPosition.CENTER,
    ModalPosition.TOP,
    ModalPosition.BOTTOM,
];

const MODAL_SCROLL_MODES: readonly ModalScrollMode[] = [
    ModalScrollMode.INSIDE,
    ModalScrollMode.BODY,
];

const TOOLTIP_ITEMS: readonly {
    readonly id: string;
    readonly label: string;
    readonly content: ResourceKey;
    readonly position: TooltipPosition;
}[] = [
    {
        id: "tooltip-top",
        label: "Top",
        content: ResourceKey.FIELD_LABEL_TITLE,
        position: TooltipPosition.TOP,
    },
    {
        id: "tooltip-right",
        label: "Right",
        content: ResourceKey.FIELD_LABEL_MESSAGE,
        position: TooltipPosition.RIGHT,
    },
    {
        id: "tooltip-bottom",
        label: "Bottom",
        content: ResourceKey.FIELD_LABEL_DATE,
        position: TooltipPosition.BOTTOM,
    },
    {
        id: "tooltip-left",
        label: "Left",
        content: ResourceKey.FIELD_LABEL_NAME,
        position: TooltipPosition.LEFT,
    },
];

const BRAND_LOGO_ITEMS: readonly {
    readonly id: string;
    readonly label: string;
    readonly variant: string;
    readonly source: string;
    readonly filename: string;
}[] = [
    {
        id: "logo-dark-horizontal",
        label: "ZINERO Dark Horizontal",
        variant: "Dark / Horizontal",
        source: brandDarkHorizontal,
        filename: "ZINERO_dark_horizontal.png",
    },
    {
        id: "logo-dark-vertical",
        label: "ZINERO Dark Vertical",
        variant: "Dark / Vertical",
        source: brandDarkVertical,
        filename: "ZINERO_dark_vertical.png",
    },
    {
        id: "logo-dark-symbol",
        label: "ZINERO Dark Symbol",
        variant: "Dark / Symbol",
        source: brandDarkSymbol,
        filename: "ZINERO_dark_symbol.png",
    },
    {
        id: "logo-transparent-horizontal",
        label: "ZINERO Transparent Horizontal",
        variant: "Transparent / Horizontal",
        source: brandTransparentHorizontal,
        filename: "ZINERO_transparent_horizontal.png",
    },
    {
        id: "logo-transparent-vertical",
        label: "ZINERO Transparent Vertical",
        variant: "Transparent / Vertical",
        source: brandTransparentVertical,
        filename: "ZINERO_transparent_vertical.png",
    },
    {
        id: "logo-transparent-symbol",
        label: "ZINERO Transparent Symbol",
        variant: "Transparent / Symbol",
        source: brandTransparentSymbol,
        filename: "ZINERO_transparent_symbol.png",
    },
];

const SHOWCASE_SECTION = {
    TYPOGRAPHY: "typography",
    BUTTONS: "buttons",
    INPUTS_FORMS: "inputs-forms",
    ALERTS_STATUS: "alerts-status",
    MODAL: "modal",
    TABLES_DATA: "tables-data",
    FILTER_BAR: "filter-bar",
    CARD_LAYOUT: "card-layout",
    BRAND_LOGO_ASSETS: "brand-logo-assets",
    TOOLTIP_TOAST: "tooltip-toast",
    ACCORDION_BULLETS: "accordion-bullets",
} as const;

type ShowcaseSectionId = (typeof SHOWCASE_SECTION)[keyof typeof SHOWCASE_SECTION];

interface ShowcaseSectionDefinition {
    readonly id: ShowcaseSectionId;
    readonly title: string;
    readonly description: string;
}

const SECTION_DEFINITIONS: readonly ShowcaseSectionDefinition[] = [
    {
        id: SHOWCASE_SECTION.TYPOGRAPHY,
        title: "Typography System",
        description: "Semantic typography tokens and explicit human vs. data layer usage.",
    },
    {
        id: SHOWCASE_SECTION.BUTTONS,
        title: "Buttons",
        description: "Variants, sizes, icon placement, loading, disabled, form usage, and full-width behavior.",
    },
    {
        id: SHOWCASE_SECTION.INPUTS_FORMS,
        title: "Inputs & Form Elements",
        description: "Input states, Select, Fieldset, Form wrapper, and FormGrid responsiveness.",
    },
    {
        id: SHOWCASE_SECTION.ALERTS_STATUS,
        title: "Alerts & Status",
        description: "Alert variants, compact mode, status mapping, ErrorState, and Loader sizes.",
    },
    {
        id: SHOWCASE_SECTION.MODAL,
        title: "Modal",
        description: "Interactive modal showcase for size, position, scroll mode, and footer states.",
    },
    {
        id: SHOWCASE_SECTION.TABLES_DATA,
        title: "Tables & Data",
        description: "Unified Table/DataTable showcase with actions, loading, empty, error, and pagination.",
    },
    {
        id: SHOWCASE_SECTION.FILTER_BAR,
        title: "Filter Bar",
        description: "Typed text/select filters with emitted-value preview and mobile collapse behavior.",
    },
    {
        id: SHOWCASE_SECTION.CARD_LAYOUT,
        title: "Card & Layout",
        description: "Card composition, nested cards, PageContainer, and AppLayout examples.",
    },
    {
        id: SHOWCASE_SECTION.BRAND_LOGO_ASSETS,
        title: "Brand & Logo Assets",
        description: "Canonical brand files imported from shared/assets/images.",
    },
    {
        id: SHOWCASE_SECTION.TOOLTIP_TOAST,
        title: "Tooltip & Toast",
        description: "Tooltip positions and interactive toast triggering with stack behavior.",
    },
    {
        id: SHOWCASE_SECTION.ACCORDION_BULLETS,
        title: "Accordion & Bullets",
        description: "Nested Accordion usage and Bullets component variations.",
    },
];

type SectionVisibility = Record<ShowcaseSectionId, boolean>;


function createSectionVisibility(open: boolean): SectionVisibility {
    return {
        [SHOWCASE_SECTION.TYPOGRAPHY]: open,
        [SHOWCASE_SECTION.BUTTONS]: open,
        [SHOWCASE_SECTION.INPUTS_FORMS]: open,
        [SHOWCASE_SECTION.ALERTS_STATUS]: open,
        [SHOWCASE_SECTION.MODAL]: open,
        [SHOWCASE_SECTION.TABLES_DATA]: open,
        [SHOWCASE_SECTION.FILTER_BAR]: open,
        [SHOWCASE_SECTION.CARD_LAYOUT]: open,
        [SHOWCASE_SECTION.BRAND_LOGO_ASSETS]: open,
        [SHOWCASE_SECTION.TOOLTIP_TOAST]: open,
        [SHOWCASE_SECTION.ACCORDION_BULLETS]: open,
    };
}

interface ShowcaseSectionProps {
    readonly id: ShowcaseSectionId;
    readonly title: string;
    readonly description: string;
    readonly open: boolean;
    readonly onToggle: (sectionId: ShowcaseSectionId, open: boolean) => void;
    readonly children: ComponentChildren;
}


function ShowcaseSection({
    id,
    title,
    description,
    open,
    onToggle,
    children,
}: ShowcaseSectionProps): JSX.Element {
    return (
        <Collapse
            id={`sandbox-showcase-${id}`}
            open={open}
            onToggle={(nextOpen) => onToggle(id, nextOpen)}
            title={title}
            description={description}
            className="rounded-2xl shadow-sm"
            headerClassName="items-start gap-4 p-4 sm:p-5"
            titleClassName="text-section-title"
            descriptionClassName="text-body text-base-content/70"
            iconClassName="mt-1"
            contentClassName="px-4 pb-5 pt-4 sm:px-5"
        >
            {children}
        </Collapse>
    );
}

/**
 * @summary Renders the design-system sandbox used for component behavior validation.
 * @returns Sandbox page component.
 */

export function SandboxPage(): JSX.Element {
    const controller = useMemo(() => createSandboxController(), []);

    const [theme, setTheme] = useState<Theme>(controller.getCurrentTheme());
    const [preferences, setPreferences] = useState<UserPreferencesState>(getUserPreferences());
    const [sectionVisibility, setSectionVisibility] = useState<SectionVisibility>(() =>
        createSectionVisibility(true)
    );
    const [modalState, setModalState] = useState<SandboxModalState>(
        controller.getDefaultModalState()
    );
    const [filters, setFilters] = useState<SandboxFilters>(controller.getDefaultFilters());
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [dataTableMode, setDataTableMode] = useState<SandboxDataTableMode>(
        SANDBOX_DATA_TABLE_MODE.READY
    );
    const [toasts, setToasts] = useState(getToasts());

    const [textInputValue, setTextInputValue] = useState<string>("Design system baseline");
    const [emailInputValue, setEmailInputValue] = useState<string>("sandbox@zinero.dev");
    const [passwordInputValue, setPasswordInputValue] = useState<string>("safe-password");
    const [searchInputValue, setSearchInputValue] = useState<string>("");
    const [numberInputValue, setNumberInputValue] = useState<string>("12840.55");
    const [telInputValue, setTelInputValue] = useState<string>("+1 212 555 0142");
    const [urlInputValue, setUrlInputValue] = useState<string>("https://zinero.dev");
    const [hintInputValue, setHintInputValue] = useState<string>("Automated nightly snapshot");
    const [errorInputValue, setErrorInputValue] = useState<string>("broken-email-format");
    const [prefixedInputValue, setPrefixedInputValue] = useState<string>("250");
    const [suffixInputValue, setSuffixInputValue] = useState<string>("24");
    const [disabledInputValue] = useState<string>("Read-only showcase");
    const [requiredInputValue, setRequiredInputValue] = useState<string>("");
    const [selectValue, setSelectValue] = useState<string>(SANDBOX_STATUS_FILTER.ACTIVE);
    const [selectErrorValue, setSelectErrorValue] = useState<string>("");
    const [moneyCanonicalValue, setMoneyCanonicalValue] = useState<string>("12840.55");
    const [moneyDisplayValue, setMoneyDisplayValue] = useState<string>("");
    const [moneyIconCanonicalValue, setMoneyIconCanonicalValue] = useState<string>("12.34");
    const [moneyIconDisplayValue, setMoneyIconDisplayValue] = useState<string>("");
    const [numberCanonicalValue, setNumberCanonicalValue] = useState<string>("445.30");
    const [numberDisplayValue, setNumberDisplayValue] = useState<string>("");
    const [numberIconCanonicalValue, setNumberIconCanonicalValue] = useState<string>("2048.00");
    const [numberIconDisplayValue, setNumberIconDisplayValue] = useState<string>("");
    const [integerCanonicalValue, setIntegerCanonicalValue] = useState<string>("2048");
    const [integerDisplayValue, setIntegerDisplayValue] = useState<string>("");
    const [integerIconCanonicalValue, setIntegerIconCanonicalValue] = useState<string>("4096");
    const [integerIconDisplayValue, setIntegerIconDisplayValue] = useState<string>("");
    const [phoneCountryCode, setPhoneCountryCode] = useState<CountryCode>(() =>
        resolvePhoneCountryFromLanguage(preferences.language)
    );
    const [phoneCanonicalValue, setPhoneCanonicalValue] = useState<string>("+5511999999999");
    const [phoneDisplayValue, setPhoneDisplayValue] = useState<string>("");
    const [phoneIconCountryCode, setPhoneIconCountryCode] = useState<CountryCode>(CountryCode.US);
    const [phoneIconCanonicalValue, setPhoneIconCanonicalValue] = useState<string>("");
    const [phoneIconDisplayValue, setPhoneIconDisplayValue] = useState<string>("");

    const formatSandboxMoney = useMemo(
        () => (amount: string): string =>
            formatMoney(amount, {
                locale: preferences.language,
                currency: preferences.currency,
            }),
        [preferences.currency, preferences.language]
    );
    const formatSandboxNumber = useMemo(
        () => (value: number, options?: FormatNumberInput["options"]): string =>
            formatNumber(value, {
                locale: preferences.language,
                options,
            }),
        [preferences.language]
    );
    const formattedSandboxDate = useMemo(
        () =>
            formatDate(SANDBOX_REFERENCE_DATE, {
                locale: preferences.language,
                options: SANDBOX_REFERENCE_DATE_OPTIONS,
            }),
        [preferences.language]
    );
    const tableColumns = useMemo(
        () => controller.getTableColumns(formatSandboxMoney),
        [controller, formatSandboxMoney]
    );
    const filterFields = controller.getFilterFields();
    const filterOptions = controller.getFilterOptions();
    const records = controller.getRecords();

    const filteredRecords = useMemo(
        () => controller.filterRecords(filters),
        [controller, filters]
    );
    const totalPages = useMemo(
        () => controller.getTotalPages(filteredRecords.length, PAGE_SIZE),
        [controller, filteredRecords.length]
    );

    useEffect(() => {
        if (currentPage > totalPages) {
            setCurrentPage(totalPages);
        }
    }, [currentPage, totalPages]);

    const paginatedRecords = useMemo(
        () => controller.paginateRecords(filteredRecords, currentPage, PAGE_SIZE),
        [controller, filteredRecords, currentPage]
    );

    const dataTableRows = useMemo(
        () => controller.resolveDataTableRows(paginatedRecords, dataTableMode),
        [controller, paginatedRecords, dataTableMode]
    );

    const nestedAccordionItems: readonly AccordionItem[] = useMemo(
        () => [
            {
                id: "sandbox-nested-accordion-1",
                title: ResourceKey.FIELD_LABEL_DATE,
                content: "Nested section for secondary details.",
                openByDefault: true,
            },
            {
                id: "sandbox-nested-accordion-2",
                title: ResourceKey.FIELD_LABEL_OBSERVATION,
                content: "Nested section for supporting notes.",
            },
        ],
        []
    );

    const accordionItems: readonly AccordionItem[] = useMemo(
        () => [
            {
                id: "sandbox-accordion-1",
                title: ResourceKey.FIELD_LABEL_TITLE,
                content: (
                    <div class="space-y-3">
                        <p class="text-body">
                            This parent panel contains a nested accordion to demonstrate stacked usage.
                        </p>
                        <Accordion items={nestedAccordionItems} allowMultiple={false} />
                    </div>
                ),
                openByDefault: true,
            },
            {
                id: "sandbox-accordion-2",
                title: ResourceKey.FIELD_LABEL_MESSAGE,
                content:
                    "Second parent panel for validating independent open and close behavior.",
            },
        ],
        [nestedAccordionItems]
    );

    useEffect(() => subscribeToasts((nextToasts) => setToasts(nextToasts)), []);
    useEffect(
        () => subscribeUserPreferences((nextPreferences) => setPreferences(nextPreferences)),
        []
    );
    useEffect(() => {
        setPhoneCountryCode(resolvePhoneCountryFromLanguage(preferences.language));
    }, [preferences.language]);

    const areAllExpanded = SECTION_DEFINITIONS.every(
        (section) => sectionVisibility[section.id]
    );
    const areAllCollapsed = SECTION_DEFINITIONS.every(
        (section) => !sectionVisibility[section.id]
    );

    const toggleTheme = (): void => {
        const nextTheme = theme === Theme.LIGHT ? Theme.DARK : Theme.LIGHT;
        setTheme(controller.applyTheme(nextTheme));
    };

    const applyLanguage = (language: Language): void => {
        setUserPreferences({ language });
    };

    const applyCurrency = (currency: Currency): void => {
        setUserPreferences({ currency });
    };

    const setAllSections = (open: boolean): void => {
        setSectionVisibility(createSectionVisibility(open));
    };

    const handleSectionToggle = (sectionId: ShowcaseSectionId, open: boolean): void => {
        setSectionVisibility((current) => ({
            ...current,
            [sectionId]: open,
        }));
    };

    const handleFilterChange = (nextValues: Partial<SandboxFilters>): void => {
        setFilters(controller.mergeFilters(nextValues));
        setCurrentPage(1);
    };

    const handleOpenModal = (patch: Partial<SandboxModalState>): void => {
        setModalState((current) => controller.openModal(current, patch));
    };

    const handleCloseModal = (): void => {
        setModalState((current) => controller.closeModal(current));
    };

    const handleClearFilters = (): void => {
        setFilters(controller.getDefaultFilters());
        setCurrentPage(1);
    };

    const handleMoneyValueChange = (value: CanonicalInputValueChange): void => {
        setMoneyCanonicalValue(value.canonicalValue);
        setMoneyDisplayValue(value.displayValue);
    };

    const handleMoneyIconValueChange = (value: CanonicalInputValueChange): void => {
        setMoneyIconCanonicalValue(value.canonicalValue);
        setMoneyIconDisplayValue(value.displayValue);
    };

    const handleNumberValueChange = (value: CanonicalInputValueChange): void => {
        setNumberCanonicalValue(value.canonicalValue);
        setNumberDisplayValue(value.displayValue);
    };

    const handleNumberIconValueChange = (value: CanonicalInputValueChange): void => {
        setNumberIconCanonicalValue(value.canonicalValue);
        setNumberIconDisplayValue(value.displayValue);
    };

    const handleIntegerValueChange = (value: CanonicalInputValueChange): void => {
        setIntegerCanonicalValue(value.canonicalValue);
        setIntegerDisplayValue(value.displayValue);
    };

    const handleIntegerIconValueChange = (value: CanonicalInputValueChange): void => {
        setIntegerIconCanonicalValue(value.canonicalValue);
        setIntegerIconDisplayValue(value.displayValue);
    };

    const handlePhoneValueChange = (value: CanonicalInputValueChange): void => {
        setPhoneCanonicalValue(value.canonicalValue);
        setPhoneDisplayValue(value.displayValue);
    };

    const handlePhoneCountryChange = (
        countryCode: CountryCode,
        value: CanonicalInputValueChange
    ): void => {
        setPhoneCountryCode(countryCode);
        setPhoneCanonicalValue(value.canonicalValue);
        setPhoneDisplayValue(value.displayValue);
    };

    const handlePhoneIconValueChange = (value: CanonicalInputValueChange): void => {
        setPhoneIconCanonicalValue(value.canonicalValue);
        setPhoneIconDisplayValue(value.displayValue);
    };

    const handlePhoneIconCountryChange = (
        countryCode: CountryCode,
        value: CanonicalInputValueChange
    ): void => {
        setPhoneIconCountryCode(countryCode);
        setPhoneIconCanonicalValue(value.canonicalValue);
        setPhoneIconDisplayValue(value.displayValue);
    };

    return (
        <PageContainer>
            <div class={CANVAS_CLASS}>
                <section class={SECTION_SURFACE_CLASS}>
                    <div class="space-y-4 p-4 sm:p-5">
                        <div class="space-y-2">
                            <h1 class="text-page-title">Zinero UI Design System</h1>
                            <p class="text-body text-base-content/80">
                                Living documentation and visual validation surface for the Core UI
                                Kit. Each section is interactive, collapsible, and optimized for
                                responsive inspection.
                            </p>
                        </div>

                        <div class="grid grid-cols-1 gap-3 lg:grid-cols-3">
                            <div class={DEMO_CARD_CLASS}>
                                <p class="text-label">Theme</p>
                                <p class="text-body text-base-content/70">
                                    Current:{" "}
                                    <span class="font-data">
                                        {theme === Theme.DARK ? "Dark" : "Light"}
                                    </span>
                                </p>
                                <div class="w-full sm:w-auto [&>button]:w-full sm:[&>button]:w-auto">
                                    <Button
                                        variant={
                                            theme === Theme.DARK
                                                ? ButtonVariant.SECONDARY
                                                : ButtonVariant.PRIMARY
                                        }
                                        iconLeft={IconName.STAR}
                                        onClick={toggleTheme}
                                    >
                                        {theme === Theme.DARK
                                            ? "Switch to Light Mode"
                                            : "Switch to Dark Mode"}
                                    </Button>
                                </div>
                            </div>

                            <div class={DEMO_CARD_CLASS}>
                                <p class="text-label">Locale & Currency</p>
                                <p class="text-body text-base-content/70">
                                    Locale:
                                    {" "}
                                    <span class="font-data">
                                        {preferences.language}
                                    </span>
                                    {" "} | Currency:{" "}
                                    <span class="font-data">{preferences.currency}</span>
                                </p>
                                <p class="text-caption text-base-content/70">
                                    Sample Date:{" "}
                                    <span class="font-data">{formattedSandboxDate}</span>
                                </p>
                                <p class="text-caption text-base-content/70">
                                    Sample Number:{" "}
                                    <span class="font-data">
                                        {formatSandboxNumber(98760.11, {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2,
                                        })}
                                    </span>
                                </p>
                                <div class="space-y-3">
                                    <div class="space-y-2">
                                        <p class="text-caption">Language</p>
                                        <div class="flex flex-wrap gap-2">
                                            {LANGUAGE_OPTIONS.map((language) => (
                                                <Button
                                                    key={language}
                                                    variant={
                                                        preferences.language === language
                                                            ? ButtonVariant.PRIMARY
                                                            : ButtonVariant.OUTLINE
                                                    }
                                                    size={ButtonSize.SM}
                                                    onClick={() => applyLanguage(language)}
                                                >
                                                    {LANGUAGE_LABEL[language]}
                                                </Button>
                                            ))}
                                        </div>
                                    </div>

                                    <div class="space-y-2">
                                        <p class="text-caption">Currency</p>
                                        <div class="flex flex-wrap gap-2">
                                            {CURRENCY_OPTIONS.map((currency) => (
                                                <Button
                                                    key={currency}
                                                    variant={
                                                        preferences.currency === currency
                                                            ? ButtonVariant.SECONDARY
                                                            : ButtonVariant.OUTLINE
                                                    }
                                                    size={ButtonSize.SM}
                                                    onClick={() => applyCurrency(currency)}
                                                >
                                                    {CURRENCY_LABEL[currency]}
                                                </Button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div class={DEMO_CARD_CLASS}>
                                <p class="text-label">Section Controls</p>
                                <p class="text-body text-base-content/70">
                                    Expand or collapse every documentation block with one action.
                                </p>
                                <div class="flex flex-wrap gap-2">
                                    <Button
                                        variant={ButtonVariant.OUTLINE}
                                        iconLeft={IconName.ADD}
                                        disabled={areAllExpanded}
                                        onClick={() => setAllSections(true)}
                                    >
                                        Expand All
                                    </Button>
                                    <Button
                                        variant={ButtonVariant.GHOST}
                                        iconLeft={IconName.CLOSE}
                                        disabled={areAllCollapsed}
                                        onClick={() => setAllSections(false)}
                                    >
                                        Collapse All
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <ShowcaseSection
                    id={SHOWCASE_SECTION.TYPOGRAPHY}
                    title="Typography System"
                    description="Jakarta = human layer. Plex Mono = data layer."
                    open={sectionVisibility[SHOWCASE_SECTION.TYPOGRAPHY]}
                    onToggle={handleSectionToggle}
                >
                    <div class="grid grid-cols-1 gap-4 xl:grid-cols-2">
                        <div class={DEMO_CARD_CLASS}>
                            <p class="text-label">Plus Jakarta Sans (Human Layer)</p>
                            <h1 class="text-page-title">H1 - Executive Insights</h1>
                            <h2 class="text-section-title">H2 - Monthly Review</h2>
                            <h3 class="text-card-title">H3 - Account Overview</h3>
                            <p class="text-body">
                                Paragraph sample for descriptive interface content and long-form
                                guidance text.
                            </p>
                            <p class="text-label">Label sample: Account Status</p>
                            <div class="flex flex-wrap gap-2">
                                <Button size={ButtonSize.SM} variant={ButtonVariant.OUTLINE}>
                                    Button Text SM
                                </Button>
                                <Button size={ButtonSize.MD} variant={ButtonVariant.SECONDARY}>
                                    Button Text MD
                                </Button>
                                <Button size={ButtonSize.LG} variant={ButtonVariant.PRIMARY}>
                                    Button Text LG
                                </Button>
                            </div>
                        </div>

                        <div class={DEMO_CARD_CLASS}>
                            <p class="text-label">IBM Plex Mono (Data Layer)</p>
                            <p class="text-kpi text-right">
                                {formatSandboxNumber(98760, {
                                    maximumFractionDigits: 0,
                                })}
                            </p>
                            <p class="text-money text-right">
                                {formatSandboxMoney("12840.55")}
                            </p>
                            <p class="text-table-number text-right">
                                {formatSandboxNumber(2770.11, {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                })}
                            </p>
                            <Input
                                label={ResourceKey.FIELD_LABEL_VALUE}
                                type={InputType.NUMBER}
                                value={numberInputValue}
                                suffixText={ResourceKey.FIELD_LABEL_CURRENCY}
                                onChange={setNumberInputValue}
                            />
                            <div class="rounded-lg border border-base-300 bg-base-100 p-3">
                                <div class="flex items-start justify-between gap-4">
                                    <div class="space-y-1">
                                        <p class="text-label">Transaction Line Example</p>
                                        <p class="text-body text-base-content/70">
                                            Corporate travel reimbursement - January cycle
                                        </p>
                                    </div>
                                    <div class="text-right">
                                        <p class="text-money">
                                            {formatSandboxMoney("2840.55")}
                                        </p>
                                        <p class="font-data text-table-number">txn_2026_0042</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </ShowcaseSection>

                <ShowcaseSection
                    id={SHOWCASE_SECTION.BUTTONS}
                    title="Buttons"
                    description="Variants, sizing, icon placement, state handling, and form usage."
                    open={sectionVisibility[SHOWCASE_SECTION.BUTTONS]}
                    onToggle={handleSectionToggle}
                >
                    <div class="space-y-4">
                        <div class={DEMO_CARD_CLASS}>
                            <p class="text-label">All Variants</p>
                            <div class="flex flex-wrap gap-2">
                                {BUTTON_VARIANTS.map((variant) => (
                                    <Button key={variant} variant={variant}>
                                        {BUTTON_VARIANT_LABEL[variant]}
                                    </Button>
                                ))}
                            </div>
                        </div>

                        <div class="grid grid-cols-1 gap-4 xl:grid-cols-2">
                            <div class={DEMO_CARD_CLASS}>
                                <p class="text-label">All Sizes + Icons</p>
                                <div class="flex flex-wrap items-center gap-2">
                                    {BUTTON_SIZES.map((size) => (
                                        <Button
                                            key={size}
                                            size={size}
                                            variant={ButtonVariant.PRIMARY}
                                            iconLeft={IconName.ADD}
                                        >
                                            {BUTTON_SIZE_LABEL[size]}
                                        </Button>
                                    ))}
                                </div>
                                <div class="flex flex-wrap gap-2">
                                    <Button
                                        variant={ButtonVariant.SECONDARY}
                                        iconLeft={IconName.EDIT}
                                    >
                                        Left Icon
                                    </Button>
                                    <Button
                                        variant={ButtonVariant.OUTLINE}
                                        iconRight={IconName.CHEVRON_RIGHT}
                                    >
                                        Right Icon
                                    </Button>
                                </div>
                            </div>

                            <div class={DEMO_CARD_CLASS}>
                                <p class="text-label">Loading + Disabled + Full Width</p>
                                <div class="flex flex-wrap gap-2">
                                    <Button
                                        variant={ButtonVariant.PRIMARY}
                                        loading
                                    >
                                        Loading
                                    </Button>
                                    <Button
                                        variant={ButtonVariant.OUTLINE}
                                        disabled
                                    >
                                        Disabled
                                    </Button>
                                </div>
                                <div class="w-full [&>button]:w-full">
                                    <Button
                                        variant={ButtonVariant.ACCENT}
                                        iconLeft={IconName.SAVE}
                                    >
                                        Full Width Primary Action
                                    </Button>
                                </div>
                            </div>
                        </div>

                        <div class={DEMO_CARD_CLASS}>
                            <p class="text-label">Button Inside Form</p>
                            <Form
                                onSubmit={() =>
                                    controller.triggerToastWithIcon(ToastVariant.SUCCESS)
                                }
                            >
                                <FormGrid columns={2}>
                                    <Input
                                        label={ResourceKey.FIELD_LABEL_NAME}
                                        value={textInputValue}
                                        onChange={setTextInputValue}
                                        required
                                    />
                                    <Input
                                        label={ResourceKey.FIELD_LABEL_EMAIL}
                                        type={InputType.EMAIL}
                                        value={emailInputValue}
                                        onChange={setEmailInputValue}
                                        required
                                    />
                                </FormGrid>
                                <div class="flex flex-wrap gap-2">
                                    <Button
                                        type="submit"
                                        variant={ButtonVariant.PRIMARY}
                                        iconLeft={IconName.CHECK}
                                    >
                                        Submit Form
                                    </Button>
                                    <Button variant={ButtonVariant.GHOST}>
                                        Secondary Action
                                    </Button>
                                </div>
                            </Form>
                        </div>
                    </div>
                </ShowcaseSection>

                <ShowcaseSection
                    id={SHOWCASE_SECTION.INPUTS_FORMS}
                    title="Inputs & Form Elements"
                    description="Typed input controls, select states, field grouping, and responsive grids."
                    open={sectionVisibility[SHOWCASE_SECTION.INPUTS_FORMS]}
                    onToggle={handleSectionToggle}
                >
                    <div class="space-y-4">
                        <div class={DEMO_CARD_CLASS}>
                            <p class="text-label">Financial Input Gallery</p>
                            <p class="text-body text-base-content/70">
                                Each card demonstrates one real use case. Edit locale/currency above to validate display formatting and canonical persistence values.
                            </p>
                            <div class="grid grid-cols-1 gap-4 xl:grid-cols-2">
                                <div class="space-y-2 rounded-xl border border-base-300 bg-base-100 p-4">
                                    <p class="text-label">Money: Required + Range Validation</p>
                                    <p class="text-caption text-base-content/70">
                                        Use when persisting monetary amounts. Canonical is always dot-decimal and closes with 2 fraction digits on blur.
                                    </p>
                                    <MoneyInput
                                        label={ResourceKey.FIELD_LABEL_VALUE}
                                        canonicalValue={moneyCanonicalValue}
                                        language={preferences.language}
                                        currency={preferences.currency}
                                        required
                                        min="1.00"
                                        max="100000.00"
                                        greaterThanZero
                                        onValueChange={handleMoneyValueChange}
                                    />
                                    <p class="text-caption text-base-content/70">
                                        {t(ResourceKey.FIELD_LABEL_CANONICAL_VALUE)}:{" "}
                                        <span class="font-data">{moneyCanonicalValue || "-"}</span>
                                    </p>
                                    <p class="text-caption text-base-content/70">
                                        {t(ResourceKey.FIELD_LABEL_DISPLAY_VALUE)}:{" "}
                                        <span class="font-data">{moneyDisplayValue || "-"}</span>
                                    </p>
                                </div>

                                <div class="space-y-2 rounded-xl border border-base-300 bg-base-100 p-4">
                                    <p class="text-label">Money: Icon + Error State</p>
                                    <p class="text-caption text-base-content/70">
                                        Financial context with icon prefix and explicit error rendering using shared resource keys.
                                    </p>
                                    <MoneyInput
                                        label={ResourceKey.FIELD_LABEL_CURRENCY}
                                        canonicalValue={moneyIconCanonicalValue}
                                        language={preferences.language}
                                        currency={preferences.currency}
                                        icon={IconName.CURRENCY}
                                        error={ResourceKey.VALUE_ABOVE_MAXIMUM}
                                        onValueChange={handleMoneyIconValueChange}
                                    />
                                    <p class="text-caption text-base-content/70">
                                        {t(ResourceKey.FIELD_LABEL_CANONICAL_VALUE)}:{" "}
                                        <span class="font-data">{moneyIconCanonicalValue || "-"}</span>
                                    </p>
                                    <p class="text-caption text-base-content/70">
                                        {t(ResourceKey.FIELD_LABEL_DISPLAY_VALUE)}:{" "}
                                        <span class="font-data">{moneyIconDisplayValue || "-"}</span>
                                    </p>
                                </div>

                                <div class="space-y-2 rounded-xl border border-base-300 bg-base-100 p-4">
                                    <p class="text-label">Number: Decimal Precision</p>
                                    <p class="text-caption text-base-content/70">
                                        Use for non-currency decimal inputs. Precision is controlled by maxFractionDigits and canonical uses dot separator.
                                    </p>
                                    <NumberInput
                                        label={ResourceKey.FIELD_LABEL_TOTAL_MONTHS}
                                        canonicalValue={numberCanonicalValue}
                                        language={preferences.language}
                                        required
                                        min="0.10"
                                        max="10000.00"
                                        maxFractionDigits={4}
                                        onValueChange={handleNumberValueChange}
                                    />
                                    <p class="text-caption text-base-content/70">
                                        {t(ResourceKey.FIELD_LABEL_CANONICAL_VALUE)}:{" "}
                                        <span class="font-data">{numberCanonicalValue || "-"}</span>
                                    </p>
                                    <p class="text-caption text-base-content/70">
                                        {t(ResourceKey.FIELD_LABEL_DISPLAY_VALUE)}:{" "}
                                        <span class="font-data">{numberDisplayValue || "-"}</span>
                                    </p>
                                </div>

                                <div class="space-y-2 rounded-xl border border-base-300 bg-base-100 p-4">
                                    <p class="text-label">Number: Disabled + Icon</p>
                                    <p class="text-caption text-base-content/70">
                                        Read-only decimal display with locale mask retained for audit and detail views.
                                    </p>
                                    <NumberInput
                                        label={ResourceKey.FIELD_LABEL_LIMIT}
                                        canonicalValue={numberIconCanonicalValue}
                                        language={preferences.language}
                                        icon={IconName.NUMBER}
                                        disabled
                                        onValueChange={handleNumberIconValueChange}
                                    />
                                    <p class="text-caption text-base-content/70">
                                        {t(ResourceKey.FIELD_LABEL_CANONICAL_VALUE)}:{" "}
                                        <span class="font-data">{numberIconCanonicalValue || "-"}</span>
                                    </p>
                                    <p class="text-caption text-base-content/70">
                                        {t(ResourceKey.FIELD_LABEL_DISPLAY_VALUE)}:{" "}
                                        <span class="font-data">{numberIconDisplayValue || "-"}</span>
                                    </p>
                                </div>

                                <div class="space-y-2 rounded-xl border border-base-300 bg-base-100 p-4">
                                    <p class="text-label">Integer: Business Range</p>
                                    <p class="text-caption text-base-content/70">
                                        Recommended for day/month counters and other integer-only fields with min/max constraints.
                                    </p>
                                    <IntegerInput
                                        label={ResourceKey.FIELD_LABEL_PAYMENT_DAY}
                                        canonicalValue={integerCanonicalValue}
                                        language={preferences.language}
                                        required
                                        min="1"
                                        max="31"
                                        onValueChange={handleIntegerValueChange}
                                    />
                                    <p class="text-caption text-base-content/70">
                                        {t(ResourceKey.FIELD_LABEL_CANONICAL_VALUE)}:{" "}
                                        <span class="font-data">{integerCanonicalValue || "-"}</span>
                                    </p>
                                    <p class="text-caption text-base-content/70">
                                        {t(ResourceKey.FIELD_LABEL_DISPLAY_VALUE)}:{" "}
                                        <span class="font-data">{integerDisplayValue || "-"}</span>
                                    </p>
                                </div>

                                <div class="space-y-2 rounded-xl border border-base-300 bg-base-100 p-4">
                                    <p class="text-label">Integer: Error + Icon</p>
                                    <p class="text-caption text-base-content/70">
                                        Explicit error scenario for integer-only fields where backend-safe canonical must remain digits only.
                                    </p>
                                    <IntegerInput
                                        label={ResourceKey.FIELD_LABEL_TOTAL_MONTHS}
                                        canonicalValue={integerIconCanonicalValue}
                                        language={preferences.language}
                                        icon={IconName.NUMBER}
                                        error={ResourceKey.INVALID_NUMBER_VALUE}
                                        onValueChange={handleIntegerIconValueChange}
                                    />
                                    <p class="text-caption text-base-content/70">
                                        {t(ResourceKey.FIELD_LABEL_CANONICAL_VALUE)}:{" "}
                                        <span class="font-data">{integerIconCanonicalValue || "-"}</span>
                                    </p>
                                    <p class="text-caption text-base-content/70">
                                        {t(ResourceKey.FIELD_LABEL_DISPLAY_VALUE)}:{" "}
                                        <span class="font-data">{integerIconDisplayValue || "-"}</span>
                                    </p>
                                </div>

                                <div class="space-y-2 rounded-xl border border-base-300 bg-base-100 p-4">
                                    <p class="text-label">Phone: Country Selector + E.164</p>
                                    <p class="text-caption text-base-content/70">
                                        Phone value is formatted as-you-type per selected country and persisted only as valid E.164 canonical value.
                                    </p>
                                    <PhoneInput
                                        label={ResourceKey.FIELD_LABEL_PHONE}
                                        canonicalValue={phoneCanonicalValue}
                                        language={preferences.language}
                                        countryCode={phoneCountryCode}
                                        resetValueOnCountryChange
                                        required
                                        validateIncomplete
                                        onValueChange={handlePhoneValueChange}
                                        onCountryChange={handlePhoneCountryChange}
                                    />
                                    <p class="text-caption text-base-content/70">
                                        {t(ResourceKey.FIELD_LABEL_CANONICAL_VALUE)}:{" "}
                                        <span class="font-data">{phoneCanonicalValue || "-"}</span>
                                    </p>
                                    <p class="text-caption text-base-content/70">
                                        {t(ResourceKey.FIELD_LABEL_DISPLAY_VALUE)}:{" "}
                                        <span class="font-data">{phoneDisplayValue || "-"}</span>
                                    </p>
                                </div>

                                <div class="space-y-2 rounded-xl border border-base-300 bg-base-100 p-4">
                                    <p class="text-label">Phone: Icon + Invalid Example</p>
                                    <p class="text-caption text-base-content/70">
                                        Demonstrates visual invalid state while keeping canonical empty when E.164 cannot be generated.
                                    </p>
                                    <PhoneInput
                                        label={ResourceKey.FIELD_LABEL_PHONE}
                                        canonicalValue={phoneIconCanonicalValue}
                                        language={preferences.language}
                                        countryCode={phoneIconCountryCode}
                                        resetValueOnCountryChange
                                        icon={IconName.PHONE}
                                        error={ResourceKey.PHONE_NUMBER_INVALID}
                                        onValueChange={handlePhoneIconValueChange}
                                        onCountryChange={handlePhoneIconCountryChange}
                                    />
                                    <p class="text-caption text-base-content/70">
                                        {t(ResourceKey.FIELD_LABEL_CANONICAL_VALUE)}:{" "}
                                        <span class="font-data">{phoneIconCanonicalValue || "-"}</span>
                                    </p>
                                    <p class="text-caption text-base-content/70">
                                        {t(ResourceKey.FIELD_LABEL_DISPLAY_VALUE)}:{" "}
                                        <span class="font-data">{phoneIconDisplayValue || "-"}</span>
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div class={DEMO_CARD_CLASS}>
                            <p class="text-label">Input Types</p>
                            <FormGrid columns={3}>
                                <Input
                                    label={ResourceKey.FIELD_LABEL_NAME}
                                    type={InputType.TEXT}
                                    value={textInputValue}
                                    onChange={setTextInputValue}
                                />
                                <Input
                                    label={ResourceKey.FIELD_LABEL_EMAIL}
                                    type={InputType.EMAIL}
                                    value={emailInputValue}
                                    onChange={setEmailInputValue}
                                />
                                <Input
                                    label={ResourceKey.FIELD_LABEL_PASSWORD}
                                    type={InputType.PASSWORD}
                                    value={passwordInputValue}
                                    onChange={setPasswordInputValue}
                                />
                                <Input
                                    label={ResourceKey.FIELD_LABEL_TITLE}
                                    type={InputType.SEARCH}
                                    value={searchInputValue}
                                    icon={IconName.SEARCH}
                                    onChange={setSearchInputValue}
                                />
                                <Input
                                    label={ResourceKey.FIELD_LABEL_VALUE}
                                    type={InputType.NUMBER}
                                    value={numberInputValue}
                                    onChange={setNumberInputValue}
                                />
                                <Input
                                    label={ResourceKey.FIELD_LABEL_PHONE}
                                    type={InputType.TEL}
                                    value={telInputValue}
                                    onChange={setTelInputValue}
                                />
                                <Input
                                    label={ResourceKey.FIELD_LABEL_PROFILE}
                                    type={InputType.URL}
                                    value={urlInputValue}
                                    onChange={setUrlInputValue}
                                />
                            </FormGrid>
                        </div>

                        <div class={DEMO_CARD_CLASS}>
                            <p class="text-label">States, Prefix/Suffix, and Icons</p>
                            <FormGrid columns={2}>
                                <Input
                                    label={ResourceKey.FIELD_LABEL_OBSERVATION}
                                    hint={ResourceKey.FIELD_LABEL_MESSAGE}
                                    value={hintInputValue}
                                    onChange={setHintInputValue}
                                />
                                <Input
                                    label={ResourceKey.FIELD_LABEL_EMAIL}
                                    error={ResourceKey.EMAIL_INVALID}
                                    value={errorInputValue}
                                    onChange={setErrorInputValue}
                                />
                                <Input
                                    label={ResourceKey.FIELD_LABEL_VALUE}
                                    prefixText={ResourceKey.FIELD_LABEL_CURRENCY}
                                    value={prefixedInputValue}
                                    onChange={setPrefixedInputValue}
                                />
                                <Input
                                    label={ResourceKey.FIELD_LABEL_TOTAL_MONTHS}
                                    suffixText={ResourceKey.FIELD_LABEL_TYPE}
                                    value={suffixInputValue}
                                    onChange={setSuffixInputValue}
                                />
                                <Input
                                    label={ResourceKey.FIELD_LABEL_PROFILE}
                                    icon={IconName.USER}
                                    iconPosition={IconPosition.LEFT}
                                    value={textInputValue}
                                    onChange={setTextInputValue}
                                />
                                <Input
                                    label={ResourceKey.FIELD_LABEL_MESSAGE}
                                    icon={IconName.INFO}
                                    iconPosition={IconPosition.RIGHT}
                                    value={hintInputValue}
                                    onChange={setHintInputValue}
                                />
                                <Input
                                    label={ResourceKey.FIELD_LABEL_TITLE}
                                    value={disabledInputValue}
                                    disabled
                                />
                                <Input
                                    label={ResourceKey.FIELD_LABEL_NAME}
                                    value={requiredInputValue}
                                    onChange={setRequiredInputValue}
                                    required
                                    hint={ResourceKey.FIELD_REQUIRED}
                                />
                            </FormGrid>
                        </div>

                        <div class={DEMO_CARD_CLASS}>
                            <p class="text-label">Select, Fieldset, Form Wrapper, and FormGrid 1/2/3</p>
                            <p class="text-body text-base-content/70">
                                FormGrid collapses to a single column on narrow viewports.
                            </p>

                            <Fieldset
                                legend={ResourceKey.FIELD_LABEL_PROFILE}
                                description={ResourceKey.FIELD_LABEL_MESSAGE}
                            >
                                <Form
                                    onSubmit={() =>
                                        controller.triggerToastWithIcon(ToastVariant.SUCCESS)
                                    }
                                >
                                    <FormGrid columns={1}>
                                        <Select
                                            label={ResourceKey.FIELD_LABEL_TYPE}
                                            placeholder={ResourceKey.FIELD_LABEL_TYPE}
                                            options={filterOptions}
                                            value={selectValue}
                                            onChange={setSelectValue}
                                        />
                                    </FormGrid>

                                    <FormGrid columns={2}>
                                        <Select
                                            label={ResourceKey.FIELD_LABEL_ACTIVE}
                                            placeholder={ResourceKey.FIELD_LABEL_ACTIVE}
                                            options={filterOptions}
                                            value={selectValue}
                                            icon={IconName.CHEVRON_DOWN}
                                            onChange={setSelectValue}
                                        />
                                        <Select
                                            label={ResourceKey.FIELD_LABEL_MESSAGE}
                                            placeholder={ResourceKey.FIELD_LABEL_MESSAGE}
                                            options={filterOptions}
                                            value={selectErrorValue}
                                            error={ResourceKey.FIELD_REQUIRED}
                                            onChange={setSelectErrorValue}
                                        />
                                    </FormGrid>

                                    <FormGrid columns={3}>
                                        <Input
                                            label={ResourceKey.FIELD_LABEL_NAME}
                                            value={textInputValue}
                                            onChange={setTextInputValue}
                                        />
                                        <Input
                                            label={ResourceKey.FIELD_LABEL_EMAIL}
                                            value={emailInputValue}
                                            onChange={setEmailInputValue}
                                        />
                                        <Input
                                            label={ResourceKey.FIELD_LABEL_PHONE}
                                            value={telInputValue}
                                            onChange={setTelInputValue}
                                        />
                                    </FormGrid>

                                    <div class="flex flex-wrap gap-2">
                                        <Button
                                            type="submit"
                                            variant={ButtonVariant.PRIMARY}
                                            iconLeft={IconName.CHECK}
                                        >
                                            Submit Showcase Form
                                        </Button>
                                        <Button
                                            variant={ButtonVariant.OUTLINE}
                                            iconLeft={IconName.CLOSE}
                                            onClick={() => {
                                                setRequiredInputValue("");
                                                setSelectErrorValue("");
                                            }}
                                        >
                                            Reset Values
                                        </Button>
                                    </div>
                                </Form>
                            </Fieldset>
                        </div>
                    </div>
                </ShowcaseSection>

                <ShowcaseSection
                    id={SHOWCASE_SECTION.ALERTS_STATUS}
                    title="Alerts & Status"
                    description="Alert variants, compact mode, status mapping, ErrorState, and Loader states."
                    open={sectionVisibility[SHOWCASE_SECTION.ALERTS_STATUS]}
                    onToggle={handleSectionToggle}
                >
                    <div class="space-y-4">
                        <div class={DEMO_CARD_CLASS}>
                            <p class="text-label">Alert Variants (Soft)</p>
                            <div class="space-y-2">
                                {ALERT_VARIANTS.map((variant) => (
                                    <Alert
                                        key={variant}
                                        variant={variant}
                                        style={AlertStyle.SOFT}
                                        icon={getStatusVariantIcon(variant)}
                                    >
                                        {ALERT_LABEL[variant]} feedback for live UI state
                                        validation.
                                    </Alert>
                                ))}
                            </div>
                        </div>

                        <div class="grid grid-cols-1 gap-4 xl:grid-cols-2">
                            <div class={DEMO_CARD_CLASS}>
                                <p class="text-label">Compact + Responsive Actions</p>
                                <div class="space-y-2">
                                    <Alert
                                        variant={AlertVariant.INFO}
                                        compact
                                        icon={IconName.INFO}
                                    >
                                        Compact informational status.
                                    </Alert>
                                    <Alert
                                        variant={AlertVariant.WARNING}
                                        style={AlertStyle.DASH}
                                        direction={AlertDirection.RESPONSIVE}
                                        icon={IconName.WARNING}
                                        actions={
                                            <>
                                                <Button
                                                    size={ButtonSize.SM}
                                                    variant={ButtonVariant.OUTLINE}
                                                >
                                                    Review
                                                </Button>
                                                <Button
                                                    size={ButtonSize.SM}
                                                    variant={ButtonVariant.PRIMARY}
                                                >
                                                    Resolve
                                                </Button>
                                            </>
                                        }
                                    >
                                        Responsive alert action layout for mobile and desktop.
                                    </Alert>
                                </div>
                            </div>

                            <div class={DEMO_CARD_CLASS}>
                                <p class="text-label">Status Mapping Snapshot</p>
                                <div class="space-y-2">
                                    {ALERT_VARIANTS.map((variant) => (
                                        <div
                                            key={variant}
                                            class="rounded-lg border border-base-300 bg-base-100 p-3"
                                        >
                                            <div class="flex items-center justify-between gap-3">
                                                <div class="flex items-center gap-2">
                                                    <Icon
                                                        name={getStatusVariantIcon(variant)}
                                                    />
                                                    <p class="text-body">
                                                        {ALERT_LABEL[variant]} Status
                                                    </p>
                                                </div>
                                                <p class="text-right text-table-number">
                                                    {variant === AlertVariant.ERROR
                                                        ? "02"
                                                        : variant === AlertVariant.WARNING
                                                            ? "05"
                                                            : variant === AlertVariant.SUCCESS
                                                                ? "18"
                                                                : "09"}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div class="grid grid-cols-1 gap-4 xl:grid-cols-2">
                            <div class={DEMO_CARD_CLASS}>
                                <p class="text-label">ErrorState</p>
                                <ErrorState
                                    title={ResourceKey.UNEXPECTED_ERROR}
                                    description={ResourceKey.INTERNAL_SERVER_ERROR}
                                    actionLabel={ResourceKey.FIELD_LABEL_PROFILE}
                                    onAction={() =>
                                        controller.triggerToastWithIcon(ToastVariant.ERROR)
                                    }
                                />
                            </div>
                            <div class={DEMO_CARD_CLASS}>
                                <p class="text-label">Loader Sizes</p>
                                <div class="flex items-center gap-4">
                                    <Loader size={LoaderSize.SM} />
                                    <Loader size={LoaderSize.MD} />
                                    <Loader size={LoaderSize.LG} />
                                </div>
                            </div>
                        </div>
                    </div>
                </ShowcaseSection>

                <ShowcaseSection
                    id={SHOWCASE_SECTION.MODAL}
                    title="Modal"
                    description="Interactive controls for size, position, scroll ownership, and footer variants."
                    open={sectionVisibility[SHOWCASE_SECTION.MODAL]}
                    onToggle={handleSectionToggle}
                >
                    <div class="space-y-4">
                        <div class="grid grid-cols-1 gap-4 xl:grid-cols-2">
                            <div class={DEMO_CARD_CLASS}>
                                <p class="text-label">Size</p>
                                <div class="flex flex-wrap gap-2">
                                    {MODAL_SIZES.map((size) => (
                                        <Button
                                            key={size}
                                            variant={
                                                modalState.size === size
                                                    ? ButtonVariant.PRIMARY
                                                    : ButtonVariant.OUTLINE
                                            }
                                            onClick={() =>
                                                setModalState((current) => ({
                                                    ...current,
                                                    size,
                                                }))
                                            }
                                        >
                                            {MODAL_SIZE_LABEL[size]}
                                        </Button>
                                    ))}
                                </div>

                                <p class="text-label">Position</p>
                                <div class="flex flex-wrap gap-2">
                                    {MODAL_POSITIONS.map((position) => (
                                        <Button
                                            key={position}
                                            variant={
                                                modalState.position === position
                                                    ? ButtonVariant.PRIMARY
                                                    : ButtonVariant.OUTLINE
                                            }
                                            onClick={() =>
                                                setModalState((current) => ({
                                                    ...current,
                                                    position,
                                                }))
                                            }
                                        >
                                            {MODAL_POSITION_LABEL[position]}
                                        </Button>
                                    ))}
                                </div>

                                <p class="text-label">Scroll Mode</p>
                                <div class="flex flex-wrap gap-2">
                                    {MODAL_SCROLL_MODES.map((scrollMode) => (
                                        <Button
                                            key={scrollMode}
                                            variant={
                                                modalState.scrollMode === scrollMode
                                                    ? ButtonVariant.PRIMARY
                                                    : ButtonVariant.OUTLINE
                                            }
                                            onClick={() =>
                                                setModalState((current) => ({
                                                    ...current,
                                                    scrollMode,
                                                }))
                                            }
                                        >
                                            {MODAL_SCROLL_LABEL[scrollMode]}
                                        </Button>
                                    ))}
                                </div>
                            </div>

                            <div class={DEMO_CARD_CLASS}>
                                <p class="text-label">Open Modal</p>
                                <p class="text-body text-base-content/70">
                                    Press Esc to validate keyboard close behavior.
                                </p>
                                <div class="flex flex-wrap gap-2">
                                    <Button
                                        variant={ButtonVariant.PRIMARY}
                                        iconLeft={IconName.ADD}
                                        onClick={() =>
                                            handleOpenModal({
                                                showFooter: true,
                                            })
                                        }
                                    >
                                        Open With Footer
                                    </Button>
                                    <Button
                                        variant={ButtonVariant.OUTLINE}
                                        iconLeft={IconName.INFO}
                                        onClick={() =>
                                            handleOpenModal({
                                                showFooter: false,
                                            })
                                        }
                                    >
                                        Open Without Footer
                                    </Button>
                                </div>

                                <div class="rounded-lg border border-base-300 bg-base-100 p-3">
                                    <p class="text-label">Current Config</p>
                                    <p class="text-body">
                                        Size:{" "}
                                        <span class="font-data">
                                            {MODAL_SIZE_LABEL[modalState.size]}
                                        </span>
                                    </p>
                                    <p class="text-body">
                                        Position:{" "}
                                        <span class="font-data">
                                            {MODAL_POSITION_LABEL[modalState.position]}
                                        </span>
                                    </p>
                                    <p class="text-body">
                                        Scroll:{" "}
                                        <span class="font-data">
                                            {MODAL_SCROLL_LABEL[modalState.scrollMode]}
                                        </span>
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </ShowcaseSection>

                <ShowcaseSection
                    id={SHOWCASE_SECTION.TABLES_DATA}
                    title="Tables & Data"
                    description="Simple Table + DataTable in one unified interactive data showcase."
                    open={sectionVisibility[SHOWCASE_SECTION.TABLES_DATA]}
                    onToggle={handleSectionToggle}
                >
                    <div class="space-y-4">
                        <div class={DEMO_CARD_CLASS}>
                            <p class="text-label">Dataset Summary</p>
                            <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                <div class="rounded-lg border border-base-300 bg-base-100 p-3">
                                    <p class="text-caption text-base-content/70">Total Records</p>
                                    <p class="text-kpi text-right">{records.length}</p>
                                </div>
                                <div class="rounded-lg border border-base-300 bg-base-100 p-3">
                                    <p class="text-caption text-base-content/70">
                                        Filtered Records
                                    </p>
                                    <p class="text-kpi text-right">{filteredRecords.length}</p>
                                </div>
                                <div class="rounded-lg border border-base-300 bg-base-100 p-3">
                                    <p class="text-caption text-base-content/70">Current Page</p>
                                    <p class="text-kpi text-right">{currentPage}</p>
                                </div>
                            </div>
                        </div>

                        <div class="grid grid-cols-1 gap-4 xl:grid-cols-2">
                            <div class={DEMO_CARD_CLASS}>
                                <p class="text-label">Simple Table</p>
                                <Table
                                    columns={tableColumns}
                                    rows={paginatedRecords}
                                    getRowKey={(row) => row.id}
                                    actionsLabel={ResourceKey.FIELD_LABEL_TYPE}
                                    onRowClick={() =>
                                        controller.triggerToastWithIcon(ToastVariant.INFO)
                                    }
                                    renderRowActions={() => (
                                        <>
                                            <Button
                                                size={ButtonSize.SM}
                                                variant={ButtonVariant.GHOST}
                                                iconLeft={IconName.EDIT}
                                                onClick={() =>
                                                    controller.triggerToastWithIcon(
                                                        ToastVariant.INFO
                                                    )
                                                }
                                            />
                                            <Button
                                                size={ButtonSize.SM}
                                                variant={ButtonVariant.LINK}
                                                onClick={() =>
                                                    controller.triggerToastWithIcon(
                                                        ToastVariant.SUCCESS
                                                    )
                                                }
                                            >
                                                View
                                            </Button>
                                        </>
                                    )}
                                />
                            </div>

                            <div class={DEMO_CARD_CLASS}>
                                <p class="text-label">DataTable States</p>
                                <div class="flex flex-wrap gap-2">
                                    {(Object.values(
                                        SANDBOX_DATA_TABLE_MODE
                                    ) as readonly SandboxDataTableMode[]).map((mode) => (
                                        <Button
                                            key={mode}
                                            variant={
                                                dataTableMode === mode
                                                    ? ButtonVariant.PRIMARY
                                                    : ButtonVariant.OUTLINE
                                            }
                                            onClick={() => setDataTableMode(mode)}
                                        >
                                            {DATA_TABLE_MODE_LABEL[mode]}
                                        </Button>
                                    ))}
                                </div>
                                <DataTable
                                    columns={tableColumns}
                                    rows={dataTableRows}
                                    loading={dataTableMode === SANDBOX_DATA_TABLE_MODE.LOADING}
                                    errorTitle={
                                        dataTableMode === SANDBOX_DATA_TABLE_MODE.ERROR
                                            ? ResourceKey.UNEXPECTED_ERROR
                                            : undefined
                                    }
                                    errorDescription={
                                        dataTableMode === SANDBOX_DATA_TABLE_MODE.ERROR
                                            ? ResourceKey.INTERNAL_SERVER_ERROR
                                            : undefined
                                    }
                                    errorActionLabel={
                                        dataTableMode === SANDBOX_DATA_TABLE_MODE.ERROR
                                            ? ResourceKey.FIELD_LABEL_PROFILE
                                            : undefined
                                    }
                                    onErrorAction={() =>
                                        setDataTableMode(SANDBOX_DATA_TABLE_MODE.READY)
                                    }
                                    emptyStateTitle={ResourceKey.NO_RECORDS_FOUND}
                                    emptyStateDescription={ResourceKey.FIELD_LABEL_MESSAGE}
                                    getRowKey={(row) => row.id}
                                    actionsLabel={ResourceKey.FIELD_LABEL_TYPE}
                                    renderRowActions={() => (
                                        <Button
                                            size={ButtonSize.SM}
                                            variant={ButtonVariant.LINK}
                                        >
                                            Open
                                        </Button>
                                    )}
                                />
                            </div>
                        </div>

                        <div class={DEMO_CARD_CLASS}>
                            <p class="text-label">Pagination</p>
                            <p class="text-body">
                                Page <span class="font-data">{currentPage}</span> of{" "}
                                <span class="font-data">{totalPages}</span>
                            </p>
                            <Pagination
                                currentPage={currentPage}
                                totalPages={totalPages}
                                onPageChange={setCurrentPage}
                            />
                        </div>
                    </div>
                </ShowcaseSection>

                <ShowcaseSection
                    id={SHOWCASE_SECTION.FILTER_BAR}
                    title="Filter Bar"
                    description="Typed filter controls, emitted values preview, and responsive grid collapse."
                    open={sectionVisibility[SHOWCASE_SECTION.FILTER_BAR]}
                    onToggle={handleSectionToggle}
                >
                    <div class="space-y-4">
                        <div class={DEMO_CARD_CLASS}>
                            <FilterBar<SandboxFilters>
                                fields={filterFields}
                                values={filters}
                                columns={3}
                                onChange={handleFilterChange}
                                onSubmit={() =>
                                    controller.triggerToastWithIcon(ToastVariant.INFO)
                                }
                                onClear={handleClearFilters}
                            />
                        </div>

                        <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
                            <div class={DEMO_CARD_CLASS}>
                                <p class="text-label">Emitted Query</p>
                                <p class="text-body">{filters.query || "No query applied"}</p>
                            </div>
                            <div class={DEMO_CARD_CLASS}>
                                <p class="text-label">Emitted Status</p>
                                <p class="font-data text-table-number text-right">
                                    {filters.status}
                                </p>
                            </div>
                            <div class={DEMO_CARD_CLASS}>
                                <p class="text-label">Result Count</p>
                                <p class="font-data text-money text-right">
                                    {filteredRecords.length}
                                </p>
                            </div>
                        </div>
                    </div>
                </ShowcaseSection>

                <ShowcaseSection
                    id={SHOWCASE_SECTION.CARD_LAYOUT}
                    title="Card & Layout"
                    description="Card composition patterns and shell-level layout wrappers."
                    open={sectionVisibility[SHOWCASE_SECTION.CARD_LAYOUT]}
                    onToggle={handleSectionToggle}
                >
                    <div class="space-y-4">
                        <div class="grid grid-cols-1 gap-4 xl:grid-cols-2">
                            <Card
                                title={ResourceKey.FIELD_LABEL_TITLE}
                                description={ResourceKey.FIELD_LABEL_MESSAGE}
                            >
                                <p class="text-body">
                                    Card with heading and content body for primary context blocks.
                                </p>
                            </Card>

                            <Card title={ResourceKey.FIELD_LABEL_PROFILE}>
                                <p class="text-body">
                                    Card with action row to showcase primary and secondary controls.
                                </p>
                                <div class="flex flex-wrap gap-2">
                                    <Button
                                        variant={ButtonVariant.PRIMARY}
                                        iconLeft={IconName.SAVE}
                                        onClick={() =>
                                            controller.triggerToastWithIcon(ToastVariant.SUCCESS)
                                        }
                                    >
                                        Save
                                    </Button>
                                    <Button
                                        variant={ButtonVariant.OUTLINE}
                                        iconLeft={IconName.EDIT}
                                        onClick={() =>
                                            controller.triggerToastWithIcon(ToastVariant.INFO)
                                        }
                                    >
                                        Edit
                                    </Button>
                                </div>
                            </Card>
                        </div>

                        <div class={DEMO_CARD_CLASS}>
                            <p class="text-label">Nested Cards</p>
                            <Card title={ResourceKey.FIELD_LABEL_TAGS}>
                                <p class="text-body">Parent card container.</p>
                                <Card compact title={ResourceKey.FIELD_LABEL_OBSERVATION}>
                                    <p class="text-body">
                                        Nested card for compact grouped context.
                                    </p>
                                </Card>
                            </Card>
                        </div>

                        <div class="grid grid-cols-1 gap-4 xl:grid-cols-2">
                            <div class={DEMO_CARD_CLASS}>
                                <p class="text-label">PageContainer Example</p>
                                <div class="rounded-xl border border-base-300 bg-base-100">
                                    <PageContainer>
                                        <Card compact title={ResourceKey.FIELD_LABEL_TITLE}>
                                            <p class="text-body">
                                                This block demonstrates PageContainer spacing and
                                                max width behavior.
                                            </p>
                                        </Card>
                                    </PageContainer>
                                </div>
                            </div>

                            <div class={DEMO_CARD_CLASS}>
                                <p class="text-label">Layout Example</p>
                                <div class="h-[24rem] overflow-auto rounded-xl border border-base-300">
                                    <AppLayout
                                        header={
                                            <div class="px-4 py-3">
                                                <p class="text-label">Header Slot</p>
                                            </div>
                                        }
                                        footer={
                                            <div class="px-4 py-3">
                                                <p class="text-caption">
                                                    Footer Slot
                                                </p>
                                            </div>
                                        }
                                    >
                                        <PageContainer>
                                            <Card compact title={ResourceKey.FIELD_LABEL_MESSAGE}>
                                                <p class="text-body">
                                                    AppLayout shell preview with header and footer
                                                    boundaries.
                                                </p>
                                            </Card>
                                        </PageContainer>
                                    </AppLayout>
                                </div>
                            </div>
                        </div>
                    </div>
                </ShowcaseSection>

                <ShowcaseSection
                    id={SHOWCASE_SECTION.BRAND_LOGO_ASSETS}
                    title="Brand & Logo Assets"
                    description="Canonical logo assets from the shared image catalog."
                    open={sectionVisibility[SHOWCASE_SECTION.BRAND_LOGO_ASSETS]}
                    onToggle={handleSectionToggle}
                >
                    <div class="space-y-4">
                        <div class={DEMO_CARD_CLASS}>
                            <p class="text-label">Asset Source</p>
                            <p class="text-body">
                                All previews in this section are imported from{" "}
                                <span class="font-data">shared/assets/images</span>.
                            </p>
                        </div>

                        <div class="grid grid-cols-1 gap-4 xl:grid-cols-2">
                            {BRAND_LOGO_ITEMS.map((logo) => (
                                <div key={logo.id} class={DEMO_CARD_CLASS}>
                                    <div class="flex items-start justify-between gap-3">
                                        <div>
                                            <p class="text-label">{logo.label}</p>
                                            <p class="text-caption text-base-content/70">{logo.variant}</p>
                                        </div>
                                        <p class="font-data text-caption">{logo.filename}</p>
                                    </div>

                                    <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                        <div class="space-y-2 rounded-lg border border-base-300 bg-base-100 p-3">
                                            <p class="text-caption">Base 100 Surface</p>
                                            <div class="h-24 rounded-md border border-base-300 bg-base-100 p-3">
                                                <img
                                                    src={logo.source}
                                                    alt={logo.label}
                                                    class="h-full w-full object-contain"
                                                    loading="lazy"
                                                />
                                            </div>
                                        </div>
                                        <div class="space-y-2 rounded-lg border border-base-300 bg-base-200 p-3">
                                            <p class="text-caption">Base 200 Surface</p>
                                            <div class="h-24 rounded-md border border-base-300 bg-base-200 p-3">
                                                <img
                                                    src={logo.source}
                                                    alt={`${logo.label} on base 200`}
                                                    class="h-full w-full object-contain"
                                                    loading="lazy"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </ShowcaseSection>

                <ShowcaseSection
                    id={SHOWCASE_SECTION.TOOLTIP_TOAST}
                    title="Tooltip & Toast"
                    description="Tooltip positioning and toast trigger behaviors with stacked notifications."
                    open={sectionVisibility[SHOWCASE_SECTION.TOOLTIP_TOAST]}
                    onToggle={handleSectionToggle}
                >
                    <div class="space-y-4">
                        <div class={DEMO_CARD_CLASS}>
                            <p class="text-label">Tooltip Positions</p>
                            <div class="flex flex-wrap gap-3">
                                {TOOLTIP_ITEMS.map((item) => (
                                    <Tooltip
                                        key={item.id}
                                        content={item.content}
                                        position={item.position}
                                    >
                                        <Button
                                            variant={ButtonVariant.OUTLINE}
                                            iconLeft={IconName.INFO}
                                        >
                                            {item.label}
                                        </Button>
                                    </Tooltip>
                                ))}
                            </div>
                        </div>

                        <div class={DEMO_CARD_CLASS}>
                            <p class="text-label">Toast Triggers</p>
                            <div class="flex flex-wrap gap-2">
                                {TOAST_VARIANTS.map((variant) => (
                                    <Button
                                        key={variant}
                                        variant={ButtonVariant.SECONDARY}
                                        iconLeft={getStatusVariantIcon(variant)}
                                        onClick={() =>
                                            controller.triggerToastWithIcon(variant)
                                        }
                                    >
                                        {TOAST_LABEL[variant]}
                                    </Button>
                                ))}
                                <Button
                                    variant={ButtonVariant.PRIMARY}
                                    iconLeft={IconName.ADD}
                                    onClick={controller.triggerToastBurst}
                                >
                                    Trigger Stack (3)
                                </Button>
                                <Button
                                    variant={ButtonVariant.ACCENT}
                                    iconLeft={IconName.WARNING}
                                    onClick={() =>
                                        controller.triggerPersistentToast(ToastVariant.WARNING)
                                    }
                                >
                                    Persistent Warning
                                </Button>
                                <Button
                                    variant={ButtonVariant.GHOST}
                                    iconLeft={IconName.CLOSE}
                                    onClick={controller.clearAllToasts}
                                >
                                    Clear Toasts
                                </Button>
                            </div>
                            <p class="text-body">
                                Active toasts: <span class="font-data">{toasts.length}</span>
                            </p>
                        </div>
                    </div>
                </ShowcaseSection>

                <ShowcaseSection
                    id={SHOWCASE_SECTION.ACCORDION_BULLETS}
                    title="Accordion & Bullets"
                    description="Nested accordion behavior and list rendering variations."
                    open={sectionVisibility[SHOWCASE_SECTION.ACCORDION_BULLETS]}
                    onToggle={handleSectionToggle}
                >
                    <div class="grid grid-cols-1 gap-4 xl:grid-cols-2">
                        <div class={DEMO_CARD_CLASS}>
                            <p class="text-label">Accordion (Nested Usage)</p>
                            <Accordion items={accordionItems} allowMultiple={false} />
                        </div>
                        <div class={DEMO_CARD_CLASS}>
                            <p class="text-label">Bullets Variations</p>
                            <Bullets
                                items={[
                                    ResourceKey.FIELD_LABEL_NAME,
                                    ResourceKey.FIELD_LABEL_EMAIL,
                                    ResourceKey.FIELD_LABEL_PASSWORD,
                                ]}
                            />
                            <Bullets
                                ordered
                                items={[
                                    ResourceKey.FIELD_LABEL_TITLE,
                                    ResourceKey.FIELD_LABEL_MESSAGE,
                                    ResourceKey.FIELD_LABEL_DATE,
                                ]}
                            />
                        </div>
                    </div>
                </ShowcaseSection>
            </div>

            <Modal
                open={modalState.open}
                title={ResourceKey.FIELD_LABEL_MESSAGE}
                size={modalState.size}
                position={modalState.position}
                scrollMode={modalState.scrollMode}
                onClose={handleCloseModal}
                footer={
                    modalState.showFooter ? (
                        <>
                            <Button variant={ButtonVariant.GHOST} onClick={handleCloseModal}>
                                Close
                            </Button>
                            <Button
                                variant={ButtonVariant.PRIMARY}
                                iconLeft={IconName.CHECK}
                                onClick={() => {
                                    controller.triggerToastWithIcon(ToastVariant.SUCCESS);
                                    handleCloseModal();
                                }}
                            >
                                Confirm
                            </Button>
                        </>
                    ) : undefined
                }
            >
                <div class="space-y-3">
                    {controller.getModalParagraphs().map((paragraph) => (
                        <p key={paragraph} class="text-body">
                            {paragraph}
                        </p>
                    ))}
                </div>
            </Modal>

            <ToastContainer toasts={toasts} onClose={removeToast} />
        </PageContainer>
    );
}