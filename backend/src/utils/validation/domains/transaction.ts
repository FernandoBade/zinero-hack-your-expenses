import type { CreateTransactionInput, UpdateTransactionInput } from "../../../../../shared/domains/transaction/transaction.types";
import { TransactionType, TransactionSource } from "../../../../../shared/enums/transaction.enums";
import { ErrorCode } from "../../../../../shared/errors/error-codes";
import type { Locale } from "../../../../../shared/i18n/types/locale";
import { createValidationError, type ValidationError, type ValidationResult } from "../errors";
import { isBoolean, isEnum, isISODateString, isMonetaryString, isNumber, isNumberArray, isString } from "../guards";
import { parseValidationBody } from "../common/body";
import { isBlankString, isMonetaryGreaterThanZero, normalizeMonetaryValue } from "../common/money";

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
    const normalizedValue = normalizeMonetaryValue(body.value);
    const hasCategoryId = body.categoryId !== undefined && body.categoryId !== null;
    const hasSubcategoryId = body.subcategoryId !== undefined && body.subcategoryId !== null;

    if (body.value === undefined || body.value === null || (isString(body.value) && isBlankString(body.value))) {
        errors.push(createValidationError('value', ErrorCode.FIELD_REQUIRED, {
            field: 'value'
        }));
    } else if (!normalizedValue || !isMonetaryString(normalizedValue)) {
        errors.push(createValidationError('value', ErrorCode.INVALID_TYPE, {
            path: 'value',
            expected: 'string',
            received: String(body.value)
        }));
    } else if (!isMonetaryGreaterThanZero(normalizedValue)) {
        errors.push(createValidationError('value', ErrorCode.TOO_SMALL, {
            path: 'value',
            min: 1
        }));
    }

    if (!isISODateString(body.date)) {
        errors.push(createValidationError('date', ErrorCode.INVALID_DATE_VALUE));
    }

    if (hasCategoryId && (!isNumber(body.categoryId) || body.categoryId <= 0)) {
        errors.push(createValidationError('categoryId', ErrorCode.VALIDATION_ERROR));
    }

    if (hasSubcategoryId && (!isNumber(body.subcategoryId) || body.subcategoryId <= 0)) {
        errors.push(createValidationError('subcategoryId', ErrorCode.VALIDATION_ERROR));
    }

    if (!hasCategoryId && !hasSubcategoryId) {
        errors.push(createValidationError('categoryId', ErrorCode.CATEGORY_OR_SUBCATEGORY_REQUIRED));
        errors.push(createValidationError('subcategoryId', ErrorCode.CATEGORY_OR_SUBCATEGORY_REQUIRED));
    }

    if (!isEnum(body.transactionType, TransactionType)) {
        errors.push(createValidationError('transactionType', ErrorCode.INVALID_ENUM, {
            path: 'transactionType',
            received: body.transactionType === undefined ? 'undefined' : String(body.transactionType),
            options: Object.values(TransactionType).join(', ')
        }));
    }

    if (!isEnum(body.transactionSource, TransactionSource)) {
        errors.push(createValidationError('transactionSource', ErrorCode.INVALID_ENUM, {
            path: 'transactionSource',
            received: body.transactionSource === undefined ? 'undefined' : String(body.transactionSource),
            options: Object.values(TransactionSource).join(', ')
        }));
    }

    if (!isBoolean(body.isInstallment)) {
        errors.push(createValidationError('isInstallment', ErrorCode.INVALID_TYPE, {
            path: 'isInstallment',
            expected: 'boolean',
            received: String(body.isInstallment)
        }));
    }

    if (body.isInstallment && (!isNumber(body.totalMonths) || body.totalMonths <= 0)) {
        errors.push(createValidationError('totalMonths', ErrorCode.TOTAL_MONTHS_REQUIRED));
    }

    if (!isBoolean(body.isRecurring)) {
        errors.push(createValidationError('isRecurring', ErrorCode.INVALID_TYPE, {
            path: 'isRecurring',
            expected: 'boolean',
            received: String(body.isRecurring)
        }));
    }

    if (body.isRecurring && (!isNumber(body.paymentDay) || body.paymentDay < 1 || body.paymentDay > 31)) {
        errors.push(createValidationError('paymentDay', ErrorCode.PAYMENT_DAY_REQUIRED));
    }

    if (body.transactionSource === TransactionSource.ACCOUNT) {
        if (!isNumber(body.accountId) || body.accountId <= 0) {
            errors.push(createValidationError('accountId', ErrorCode.INVALID_ACCOUNT_ID));
        }
        if (body.creditCardId !== undefined) {
            errors.push(createValidationError('creditCardId', ErrorCode.INVALID_CREDIT_CARD_ID));
        }
    } else if (body.transactionSource === TransactionSource.CREDIT_CARD) {
        if (!isNumber(body.creditCardId) || body.creditCardId <= 0) {
            errors.push(createValidationError('creditCardId', ErrorCode.INVALID_CREDIT_CARD_ID));
        }
        if (body.accountId !== undefined) {
            errors.push(createValidationError('accountId', ErrorCode.INVALID_ACCOUNT_ID));
        }
    }

    if (body.observation !== undefined && !isString(body.observation)) {
        errors.push(createValidationError('observation', ErrorCode.INVALID_OBSERVATION_TYPE));
    }

    if (body.tags !== undefined) {
        if (!isNumberArray(body.tags) || (body.tags as number[]).some((tagId) => tagId <= 0)) {
            errors.push(createValidationError('tags', ErrorCode.VALIDATION_ERROR));
        }
    }

    if (body.active !== undefined && !isBoolean(body.active)) {
        errors.push(createValidationError('active', ErrorCode.INVALID_TYPE, {
            path: 'active',
            expected: 'boolean',
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
    const result: Record<string, unknown> = {};
    const bodyResult = parseValidationBody(data);

    if (!bodyResult.success) {
        return bodyResult;
    }

    const body = bodyResult.data;

    if (body.value !== undefined) {
        const normalizedValue = normalizeMonetaryValue(body.value);
        if (body.value === null || (isString(body.value) && isBlankString(body.value))) {
            errors.push(createValidationError('value', ErrorCode.FIELD_REQUIRED, {
                field: 'value'
            }));
        } else if (!normalizedValue || !isMonetaryString(normalizedValue)) {
            errors.push(createValidationError('value', ErrorCode.INVALID_TYPE, {
                path: 'value',
                expected: 'string',
                received: String(body.value)
            }));
        } else if (!isMonetaryGreaterThanZero(normalizedValue)) {
            errors.push(createValidationError('value', ErrorCode.TOO_SMALL, {
                path: 'value',
                min: 1
            }));
        } else {
            result.value = normalizedValue;
        }
    }

    if (body.date !== undefined) {
        if (!isISODateString(body.date)) {
            errors.push(createValidationError('date', ErrorCode.INVALID_DATE_VALUE));
        } else {
            result.date = body.date;
        }
    }

    if (body.categoryId !== undefined && body.categoryId !== null) {
        if (!isNumber(body.categoryId) || body.categoryId <= 0) {
            errors.push(createValidationError('categoryId', ErrorCode.VALIDATION_ERROR));
        } else {
            result.categoryId = body.categoryId;
        }
    }

    if (body.subcategoryId !== undefined && body.subcategoryId !== null) {
        if (!isNumber(body.subcategoryId) || body.subcategoryId <= 0) {
            errors.push(createValidationError('subcategoryId', ErrorCode.VALIDATION_ERROR));
        } else {
            result.subcategoryId = body.subcategoryId;
        }
    }

    if (body.transactionType !== undefined) {
        if (!isEnum(body.transactionType, TransactionType)) {
            errors.push(createValidationError('transactionType', ErrorCode.INVALID_ENUM, {
                path: 'transactionType',
                received: body.transactionType === undefined ? 'undefined' : String(body.transactionType),
                options: Object.values(TransactionType).join(', ')
            }));
        } else {
            result.transactionType = body.transactionType;
        }
    }

    if (body.transactionSource !== undefined) {
        if (!isEnum(body.transactionSource, TransactionSource)) {
            errors.push(createValidationError('transactionSource', ErrorCode.INVALID_ENUM, {
                path: 'transactionSource',
                received: body.transactionSource === undefined ? 'undefined' : String(body.transactionSource),
                options: Object.values(TransactionSource).join(', ')
            }));
        } else {
            result.transactionSource = body.transactionSource;
        }
    }

    if (body.isInstallment !== undefined) {
        if (!isBoolean(body.isInstallment)) {
            errors.push(createValidationError('isInstallment', ErrorCode.INVALID_TYPE, {
                path: 'isInstallment',
                expected: 'boolean',
                received: String(body.isInstallment)
            }));
        } else {
            result.isInstallment = body.isInstallment;
        }
    }

    if (body.totalMonths !== undefined && body.totalMonths !== null) {
        if (!isNumber(body.totalMonths) || body.totalMonths <= 0) {
            errors.push(createValidationError('totalMonths', ErrorCode.INVALID_TYPE, {
                path: 'totalMonths',
                expected: 'number',
                received: String(body.totalMonths)
            }));
        } else {
            result.totalMonths = body.totalMonths;
        }
    }

    if (body.isRecurring !== undefined) {
        if (!isBoolean(body.isRecurring)) {
            errors.push(createValidationError('isRecurring', ErrorCode.INVALID_TYPE, {
                path: 'isRecurring',
                expected: 'boolean',
                received: String(body.isRecurring)
            }));
        } else {
            result.isRecurring = body.isRecurring;
        }
    }

    if (body.paymentDay !== undefined && body.paymentDay !== null) {
        if (!isNumber(body.paymentDay) || body.paymentDay < 1 || body.paymentDay > 31) {
            errors.push(createValidationError('paymentDay', ErrorCode.PAYMENT_DAY_OUT_OF_RANGE));
        } else {
            result.paymentDay = body.paymentDay;
        }
    }

    if (body.accountId !== undefined && body.accountId !== null) {
        if (!isNumber(body.accountId) || body.accountId <= 0) {
            errors.push(createValidationError('accountId', ErrorCode.INVALID_ACCOUNT_ID));
        } else {
            result.accountId = body.accountId;
        }
    }

    if (body.creditCardId !== undefined && body.creditCardId !== null) {
        if (!isNumber(body.creditCardId) || body.creditCardId <= 0) {
            errors.push(createValidationError('creditCardId', ErrorCode.INVALID_CREDIT_CARD_ID));
        } else {
            result.creditCardId = body.creditCardId;
        }
    }

    if (body.observation !== undefined && body.observation !== null) {
        if (!isString(body.observation)) {
            errors.push(createValidationError('observation', ErrorCode.INVALID_OBSERVATION_TYPE));
        } else {
            result.observation = body.observation;
        }
    }

    if (body.tags !== undefined) {
        if (!isNumberArray(body.tags) || (body.tags as number[]).some((tagId) => tagId <= 0)) {
            errors.push(createValidationError('tags', ErrorCode.VALIDATION_ERROR));
        } else {
            result.tags = body.tags;
        }
    }

    if (body.active !== undefined && !isBoolean(body.active)) {
        errors.push(createValidationError('active', ErrorCode.INVALID_TYPE, {
            path: 'active',
            expected: 'boolean',
            received: String(body.active)
        }));
    } else if (body.active !== undefined) {
        result.active = body.active;
    }

    if (errors.length > 0) {
        return { success: false, errors };
    }

    return { success: true, data: result };
}
