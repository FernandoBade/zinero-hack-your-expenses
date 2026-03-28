import type { I18nKey } from "./types/i18n-key";

/**
 * @summary Backward-compatible i18n key aliases used by restored legacy screens.
 */
export const ResourceKey = {
    EMAIL_INVALID: "error.email_invalid",
    FIELD_LABEL_ACTIVE: "field.active.label",
    FIELD_LABEL_BALANCE: "field.balance.label",
    FIELD_LABEL_CANONICAL_VALUE: "field.canonical_value.label",
    FIELD_LABEL_CURRENCY: "field.currency.label",
    FIELD_LABEL_DATE: "field.date.label",
    FIELD_LABEL_DISPLAY_VALUE: "field.display_value.label",
    FIELD_LABEL_EMAIL: "field.email.label",
    FIELD_LABEL_HIDE_VALUES: "field.hide_values.label",
    FIELD_LABEL_LIMIT: "field.limit.label",
    FIELD_LABEL_MESSAGE: "field.message.label",
    FIELD_LABEL_NAME: "field.name.label",
    FIELD_LABEL_OBSERVATION: "field.observation.label",
    FIELD_LABEL_PASSWORD: "field.password.label",
    FIELD_LABEL_PAYMENT_DAY: "field.payment_day.label",
    FIELD_LABEL_PHONE: "field.phone.label",
    FIELD_LABEL_PROFILE: "field.profile.label",
    FIELD_LABEL_TAGS: "field.tags.label",
    FIELD_LABEL_TITLE: "field.title.label",
    FIELD_LABEL_TOTAL_MONTHS: "field.total_months.label",
    FIELD_LABEL_TYPE: "field.type.label",
    FIELD_LABEL_VALUE: "field.value.label",
    FIELD_REQUIRED: "error.field_required_generic",
    INTERNAL_SERVER_ERROR: "error.internal_server_error",
    INVALID_NUMBER_VALUE: "error.invalid_number_value",
    NO_RECORDS_FOUND: "error.no_records_found",
    PASSWORD_RESET_SUCCESS: "error.password_reset_success",
    PASSWORD_RESET_WARNING: "error.password_reset_requested",
    PHONE_NUMBER_INVALID: "error.phone_number_invalid",
    UNEXPECTED_ERROR: "error.unexpected_error",
    VALUE_ABOVE_MAXIMUM: "error.value_above_maximum",
} as const satisfies Record<string, I18nKey>;

export type ResourceKey = (typeof ResourceKey)[keyof typeof ResourceKey];
