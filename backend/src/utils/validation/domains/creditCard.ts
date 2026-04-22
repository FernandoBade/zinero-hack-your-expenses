import type { CreateCreditCardInput, UpdateCreditCardInput } from "../../../../../shared/domains/creditCard/creditCard.types";
import { CreditCardFlag } from "../../../../../shared/enums/creditCard.enums";
import { ErrorCode } from "../../../../../shared/errors/error-codes";
import type { Locale } from "../../../../../shared/i18n/types/locale";
import { createValidationError, type ValidationError, type ValidationResult } from "../errors";
import { isBoolean, isEnum, isMonetaryString, isNumber, isString } from "../guards";
import { parseValidationBody } from "../common/body";
import { isBlankString, isMonetaryNonNegative, normalizeMonetaryValue } from "../common/money";

/**
 * Validates credit card creation data.
 *
 * @summary Validates credit card creation request data.
 * @param data - Request body data.
 * @param lang - Language code for error messages.
 * @returns Validation result with data or errors.
 */
export function validateCreateCreditCard(
    data: unknown,
    _locale?: Locale
): ValidationResult<CreateCreditCardInput> {
    const errors: ValidationError[] = [];
    const bodyResult = parseValidationBody(data);

    if (!bodyResult.success) {
        return bodyResult;
    }

    const body = bodyResult.data;
    let normalizedBalance: string | undefined;
    let normalizedLimit: string | undefined;

    if (body.name === undefined || body.name === null || isBlankString(body.name)) {
        errors.push(createValidationError('name', ErrorCode.FIELD_REQUIRED, {
            field: 'name'
        }));
    } else if (!isString(body.name)) {
        errors.push(createValidationError('name', ErrorCode.INVALID_TYPE, {
            path: 'name',
            expected: 'string',
            received: String(body.name)
        }));
    }

    if (!isEnum(body.flag, CreditCardFlag)) {
        errors.push(createValidationError('flag', ErrorCode.INVALID_ENUM, {
            path: 'flag',
            received: body.flag === undefined ? 'undefined' : String(body.flag),
            options: Object.values(CreditCardFlag).join(', ')
        }));
    }

    if (body.observation !== undefined && !isString(body.observation)) {
        errors.push(createValidationError('observation', ErrorCode.INVALID_OBSERVATION_TYPE));
    }

    if (body.balance !== undefined) {
        if (body.balance === null || (isString(body.balance) && isBlankString(body.balance))) {
            errors.push(createValidationError('balance', ErrorCode.FIELD_REQUIRED, {
                field: 'balance'
            }));
        } else {
            const candidate = normalizeMonetaryValue(body.balance);
            if (!candidate || !isMonetaryString(candidate)) {
                errors.push(createValidationError('balance', ErrorCode.INVALID_TYPE, {
                    path: 'balance',
                    expected: 'string',
                    received: String(body.balance)
                }));
            } else if (!isMonetaryNonNegative(candidate)) {
                errors.push(createValidationError('balance', ErrorCode.TOO_SMALL, {
                    path: 'balance',
                    min: 0
                }));
            } else {
                normalizedBalance = candidate;
            }
        }
    }

    if (body.limit !== undefined) {
        if (body.limit === null || (isString(body.limit) && isBlankString(body.limit))) {
            errors.push(createValidationError('limit', ErrorCode.FIELD_REQUIRED, {
                field: 'limit'
            }));
        } else {
            const candidate = normalizeMonetaryValue(body.limit);
            if (!candidate || !isMonetaryString(candidate)) {
                errors.push(createValidationError('limit', ErrorCode.INVALID_TYPE, {
                    path: 'limit',
                    expected: 'string',
                    received: String(body.limit)
                }));
            } else if (!isMonetaryNonNegative(candidate)) {
                errors.push(createValidationError('limit', ErrorCode.TOO_SMALL, {
                    path: 'limit',
                    min: 0
                }));
            } else {
                normalizedLimit = candidate;
            }
        }
    }

    if (!isNumber(body.userId) || body.userId <= 0) {
        errors.push(createValidationError('userId', ErrorCode.VALIDATION_ERROR));
    }

    if (body.accountId !== undefined && (!isNumber(body.accountId) || body.accountId <= 0)) {
        errors.push(createValidationError('accountId', ErrorCode.VALIDATION_ERROR));
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
            name: body.name as string,
            flag: body.flag as CreditCardFlag,
            observation: body.observation as string | undefined,
            balance: normalizedBalance,
            limit: normalizedLimit,
            userId: body.userId as number,
            accountId: body.accountId as number | undefined,
            active: body.active as boolean | undefined,
        }
    };
}

/**
 * Validates credit card update data.
 *
 * @summary Validates credit card update request data.
 * @param data - Request body data.
 * @param lang - Language code for error messages.
 * @returns Validation result with data or errors.
 */
export function validateUpdateCreditCard(
    data: unknown,
    _locale?: Locale
): ValidationResult<UpdateCreditCardInput> {
    const errors: ValidationError[] = [];
    const result: Record<string, unknown> = {};
    const bodyResult = parseValidationBody(data);

    if (!bodyResult.success) {
        return bodyResult;
    }

    const body = bodyResult.data;

    if (body.name !== undefined) {
        if (body.name === null || isBlankString(body.name)) {
            errors.push(createValidationError('name', ErrorCode.FIELD_REQUIRED, {
                field: 'name'
            }));
        } else if (!isString(body.name)) {
            errors.push(createValidationError('name', ErrorCode.INVALID_TYPE, {
                path: 'name',
                expected: 'string',
                received: String(body.name)
            }));
        } else {
            result.name = body.name;
        }
    }

    if (body.flag !== undefined) {
        if (!isEnum(body.flag, CreditCardFlag)) {
            errors.push(createValidationError('flag', ErrorCode.INVALID_ENUM, {
                path: 'flag',
                received: body.flag === undefined ? 'undefined' : String(body.flag),
                options: Object.values(CreditCardFlag).join(', ')
            }));
        } else {
            result.flag = body.flag;
        }
    }

    if (body.observation !== undefined && body.observation !== null) {
        if (!isString(body.observation)) {
            errors.push(createValidationError('observation', ErrorCode.INVALID_OBSERVATION_TYPE));
        } else {
            result.observation = body.observation;
        }
    }

    if (body.balance !== undefined) {
        if (body.balance === null || (isString(body.balance) && isBlankString(body.balance))) {
            errors.push(createValidationError('balance', ErrorCode.FIELD_REQUIRED, {
                field: 'balance'
            }));
        } else {
            const candidate = normalizeMonetaryValue(body.balance);
            if (!candidate || !isMonetaryString(candidate)) {
                errors.push(createValidationError('balance', ErrorCode.INVALID_TYPE, {
                    path: 'balance',
                    expected: 'string',
                    received: String(body.balance)
                }));
            } else if (!isMonetaryNonNegative(candidate)) {
                errors.push(createValidationError('balance', ErrorCode.TOO_SMALL, {
                    path: 'balance',
                    min: 0
                }));
            } else {
                result.balance = candidate;
            }
        }
    }

    if (body.limit !== undefined) {
        if (body.limit === null || (isString(body.limit) && isBlankString(body.limit))) {
            errors.push(createValidationError('limit', ErrorCode.FIELD_REQUIRED, {
                field: 'limit'
            }));
        } else {
            const candidate = normalizeMonetaryValue(body.limit);
            if (!candidate || !isMonetaryString(candidate)) {
                errors.push(createValidationError('limit', ErrorCode.INVALID_TYPE, {
                    path: 'limit',
                    expected: 'string',
                    received: String(body.limit)
                }));
            } else if (!isMonetaryNonNegative(candidate)) {
                errors.push(createValidationError('limit', ErrorCode.TOO_SMALL, {
                    path: 'limit',
                    min: 0
                }));
            } else {
                result.limit = candidate;
            }
        }
    }

    if (body.userId !== undefined) {
        if (!isNumber(body.userId) || body.userId <= 0) {
            errors.push(createValidationError('userId', ErrorCode.VALIDATION_ERROR));
        } else {
            result.userId = body.userId;
        }
    }

    if (body.accountId !== undefined && body.accountId !== null) {
        if (!isNumber(body.accountId) || body.accountId <= 0) {
            errors.push(createValidationError('accountId', ErrorCode.VALIDATION_ERROR));
        } else {
            result.accountId = body.accountId;
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
