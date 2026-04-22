import type { CreateTransactionInput, UpdateTransactionInput } from "../../../../../shared/domains/transaction/transaction.types";
import { TransactionType, TransactionSource } from "../../../../../shared/enums/transaction.enums";
import { ErrorCode } from "../../../../../shared/errors/error-codes";
import type { FieldKey } from "../../../../../shared/fields/field-keys";
import type { Locale } from "../../../../../shared/i18n/types/locale";
import { createValidationError, type ValidationError, type ValidationResult } from "../errors";
import { isBoolean, isEnum, isISODateString, isMonetaryString, isNumber, isNumberArray, isString } from "../guards";
import { parseValidationBody } from "../common/body";
import { isBlankString, isMonetaryGreaterThanZero, normalizeMonetaryValue } from "../common/money";

type ValidationOutput = Record<string, unknown>;

const buildInvalidEnumError = <T extends Record<string, string>>(
    field: FieldKey,
    value: unknown,
    enumObject: T
) => createValidationError(field, ErrorCode.INVALID_ENUM, {
    path: field,
    received: value === undefined ? "undefined" : String(value),
    options: Object.values(enumObject).join(", ")
});

const validateRequiredMonetaryValue = (
    field: FieldKey,
    value: unknown,
    errors: ValidationError[]
): string | undefined => {
    if (value === undefined || value === null || (isString(value) && isBlankString(value))) {
        errors.push(createValidationError(field, ErrorCode.FIELD_REQUIRED, {
            field
        }));
        return undefined;
    }

    const normalizedValue = normalizeMonetaryValue(value);
    if (!normalizedValue || !isMonetaryString(normalizedValue)) {
        errors.push(createValidationError(field, ErrorCode.INVALID_TYPE, {
            path: field,
            expected: "string",
            received: String(value)
        }));
        return undefined;
    }

    if (!isMonetaryGreaterThanZero(normalizedValue)) {
        errors.push(createValidationError(field, ErrorCode.TOO_SMALL, {
            path: field,
            min: 1
        }));
        return undefined;
    }

    return normalizedValue;
};

const assignOptionalMonetaryValue = (
    field: FieldKey,
    value: unknown,
    errors: ValidationError[],
    result: ValidationOutput
) => {
    if (value === undefined) {
        return;
    }

    const normalizedValue = validateRequiredMonetaryValue(field, value, errors);
    if (normalizedValue !== undefined) {
        result[field] = normalizedValue;
    }
};

const assignOptionalPositiveId = (
    field: FieldKey,
    value: unknown,
    errors: ValidationError[],
    result: ValidationOutput,
    errorCode: ErrorCode
) => {
    if (value === undefined || value === null) {
        return;
    }

    if (!isNumber(value) || value <= 0) {
        errors.push(createValidationError(field, errorCode));
        return;
    }

    result[field] = value;
};

const assignOptionalEnum = <T extends Record<string, string>>(
    field: FieldKey,
    value: unknown,
    enumObject: T,
    errors: ValidationError[],
    result: ValidationOutput
) => {
    if (value === undefined) {
        return;
    }

    if (!isEnum(value, enumObject)) {
        errors.push(buildInvalidEnumError(field, value, enumObject));
        return;
    }

    result[field] = value;
};

const assignOptionalBoolean = (
    field: FieldKey,
    value: unknown,
    errors: ValidationError[],
    result: ValidationOutput
) => {
    if (value === undefined) {
        return;
    }

    if (!isBoolean(value)) {
        errors.push(createValidationError(field, ErrorCode.INVALID_TYPE, {
            path: field,
            expected: "boolean",
            received: String(value)
        }));
        return;
    }

    result[field] = value;
};

const assignOptionalPositiveNumber = (
    field: FieldKey,
    value: unknown,
    errors: ValidationError[],
    result: ValidationOutput
) => {
    if (value === undefined || value === null) {
        return;
    }

    if (!isNumber(value) || value <= 0) {
        errors.push(createValidationError(field, ErrorCode.INVALID_TYPE, {
            path: field,
            expected: "number",
            received: String(value)
        }));
        return;
    }

    result[field] = value;
};

const assignOptionalObservation = (
    value: unknown,
    errors: ValidationError[],
    result: ValidationOutput
) => {
    if (value === undefined || value === null) {
        return;
    }

    if (!isString(value)) {
        errors.push(createValidationError("observation", ErrorCode.INVALID_OBSERVATION_TYPE));
        return;
    }

    result.observation = value;
};

const assignOptionalTags = (
    value: unknown,
    errors: ValidationError[],
    result: ValidationOutput
) => {
    if (value === undefined) {
        return;
    }

    if (!isNumberArray(value) || (value as number[]).some((tagId) => tagId <= 0)) {
        errors.push(createValidationError("tags", ErrorCode.VALIDATION_ERROR));
        return;
    }

    result.tags = value;
};

const validateCreateSourceFields = (
    body: Record<string, unknown>,
    errors: ValidationError[]
) => {
    if (body.transactionSource === TransactionSource.ACCOUNT) {
        if (!isNumber(body.accountId) || body.accountId <= 0) {
            errors.push(createValidationError("accountId", ErrorCode.INVALID_ACCOUNT_ID));
        }
        if (body.creditCardId !== undefined) {
            errors.push(createValidationError("creditCardId", ErrorCode.INVALID_CREDIT_CARD_ID));
        }
        return;
    }

    if (body.transactionSource === TransactionSource.CREDIT_CARD) {
        if (!isNumber(body.creditCardId) || body.creditCardId <= 0) {
            errors.push(createValidationError("creditCardId", ErrorCode.INVALID_CREDIT_CARD_ID));
        }
        if (body.accountId !== undefined) {
            errors.push(createValidationError("accountId", ErrorCode.INVALID_ACCOUNT_ID));
        }
    }
};

/**
 * Validates transaction creation data.
 *
 * @summary Validates transaction creation request data.
 * @param data - Request body data.
 * @param lang - Language code for error messages.
 * @returns Validation result with data or errors.
 */
export function validateCreateTransaction(
    data: unknown,
    _locale?: Locale
): ValidationResult<CreateTransactionInput> {
    const errors: ValidationError[] = [];
    const bodyResult = parseValidationBody(data);

    if (!bodyResult.success) {
        return bodyResult;
    }

    const body = bodyResult.data;
    const normalizedValue = validateRequiredMonetaryValue("value", body.value, errors);
    const hasCategoryId = body.categoryId !== undefined && body.categoryId !== null;
    const hasSubcategoryId = body.subcategoryId !== undefined && body.subcategoryId !== null;

    if (!isISODateString(body.date)) {
        errors.push(createValidationError("date", ErrorCode.INVALID_DATE_VALUE));
    }

    if (hasCategoryId && (!isNumber(body.categoryId) || body.categoryId <= 0)) {
        errors.push(createValidationError("categoryId", ErrorCode.VALIDATION_ERROR));
    }

    if (hasSubcategoryId && (!isNumber(body.subcategoryId) || body.subcategoryId <= 0)) {
        errors.push(createValidationError("subcategoryId", ErrorCode.VALIDATION_ERROR));
    }

    if (!hasCategoryId && !hasSubcategoryId) {
        errors.push(createValidationError("categoryId", ErrorCode.CATEGORY_OR_SUBCATEGORY_REQUIRED));
        errors.push(createValidationError("subcategoryId", ErrorCode.CATEGORY_OR_SUBCATEGORY_REQUIRED));
    }

    if (!isEnum(body.transactionType, TransactionType)) {
        errors.push(buildInvalidEnumError("transactionType", body.transactionType, TransactionType));
    }

    if (!isEnum(body.transactionSource, TransactionSource)) {
        errors.push(buildInvalidEnumError("transactionSource", body.transactionSource, TransactionSource));
    }

    if (!isBoolean(body.isInstallment)) {
        errors.push(createValidationError("isInstallment", ErrorCode.INVALID_TYPE, {
            path: "isInstallment",
            expected: "boolean",
            received: String(body.isInstallment)
        }));
    }

    if (body.isInstallment && (!isNumber(body.totalMonths) || body.totalMonths <= 0)) {
        errors.push(createValidationError("totalMonths", ErrorCode.TOTAL_MONTHS_REQUIRED));
    }

    if (!isBoolean(body.isRecurring)) {
        errors.push(createValidationError("isRecurring", ErrorCode.INVALID_TYPE, {
            path: "isRecurring",
            expected: "boolean",
            received: String(body.isRecurring)
        }));
    }

    if (body.isRecurring && (!isNumber(body.paymentDay) || body.paymentDay < 1 || body.paymentDay > 31)) {
        errors.push(createValidationError("paymentDay", ErrorCode.PAYMENT_DAY_REQUIRED));
    }

    validateCreateSourceFields(body, errors);

    if (body.observation !== undefined && !isString(body.observation)) {
        errors.push(createValidationError("observation", ErrorCode.INVALID_OBSERVATION_TYPE));
    }

    if (body.tags !== undefined) {
        if (!isNumberArray(body.tags) || (body.tags as number[]).some((tagId) => tagId <= 0)) {
            errors.push(createValidationError("tags", ErrorCode.VALIDATION_ERROR));
        }
    }

    if (body.active !== undefined && !isBoolean(body.active)) {
        errors.push(createValidationError("active", ErrorCode.INVALID_TYPE, {
            path: "active",
            expected: "boolean",
            received: String(body.active)
        }));
    }

    if (errors.length > 0) {
        return { success: false, errors };
    }

    return {
        success: true,
        data: {
            value: normalizedValue as string,
            date: body.date as string,
            categoryId: body.categoryId as number | undefined,
            subcategoryId: body.subcategoryId as number | undefined,
            observation: body.observation as string | undefined,
            transactionType: body.transactionType as TransactionType,
            transactionSource: body.transactionSource as TransactionSource,
            isInstallment: body.isInstallment as boolean,
            totalMonths: body.totalMonths as number | undefined,
            isRecurring: body.isRecurring as boolean,
            paymentDay: body.paymentDay as number | undefined,
            accountId: body.accountId as number | undefined,
            creditCardId: body.creditCardId as number | undefined,
            tags: body.tags as number[] | undefined,
            active: body.active as boolean | undefined,
        }
    };
}

/**
 * Validates transaction update data.
 *
 * @summary Validates transaction update request data.
 * @param data - Request body data.
 * @param lang - Language code for error messages.
 * @returns Validation result with data or errors.
 */
export function validateUpdateTransaction(
    data: unknown,
    _locale?: Locale
): ValidationResult<UpdateTransactionInput> {
    const errors: ValidationError[] = [];
    const result: ValidationOutput = {};
    const bodyResult = parseValidationBody(data);

    if (!bodyResult.success) {
        return bodyResult;
    }

    const body = bodyResult.data;

    assignOptionalMonetaryValue("value", body.value, errors, result);

    if (body.date !== undefined) {
        if (!isISODateString(body.date)) {
            errors.push(createValidationError("date", ErrorCode.INVALID_DATE_VALUE));
        } else {
            result.date = body.date;
        }
    }

    assignOptionalPositiveId("categoryId", body.categoryId, errors, result, ErrorCode.VALIDATION_ERROR);
    assignOptionalPositiveId("subcategoryId", body.subcategoryId, errors, result, ErrorCode.VALIDATION_ERROR);
    assignOptionalEnum("transactionType", body.transactionType, TransactionType, errors, result);
    assignOptionalEnum("transactionSource", body.transactionSource, TransactionSource, errors, result);
    assignOptionalBoolean("isInstallment", body.isInstallment, errors, result);
    assignOptionalPositiveNumber("totalMonths", body.totalMonths, errors, result);
    assignOptionalBoolean("isRecurring", body.isRecurring, errors, result);

    if (body.paymentDay !== undefined && body.paymentDay !== null) {
        if (!isNumber(body.paymentDay) || body.paymentDay < 1 || body.paymentDay > 31) {
            errors.push(createValidationError("paymentDay", ErrorCode.PAYMENT_DAY_OUT_OF_RANGE));
        } else {
            result.paymentDay = body.paymentDay;
        }
    }

    assignOptionalPositiveId("accountId", body.accountId, errors, result, ErrorCode.INVALID_ACCOUNT_ID);
    assignOptionalPositiveId("creditCardId", body.creditCardId, errors, result, ErrorCode.INVALID_CREDIT_CARD_ID);
    assignOptionalObservation(body.observation, errors, result);
    assignOptionalTags(body.tags, errors, result);
    assignOptionalBoolean("active", body.active, errors, result);

    if (errors.length > 0) {
        return { success: false, errors };
    }

    return { success: true, data: result };
}
