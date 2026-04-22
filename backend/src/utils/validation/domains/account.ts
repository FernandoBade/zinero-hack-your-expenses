import type { CreateOwnedAccountInput, UpdateAccountInput } from "../../../../../shared/domains/account/account.types";
import { AccountType } from "../../../../../shared/enums/account.enums";
import { ErrorCode } from "../../../../../shared/errors/error-codes";
import type { Locale } from "../../../../../shared/i18n/types/locale";
import { createValidationError, type ValidationError, type ValidationResult } from "../errors";
import { isBoolean, isEnum, isMonetaryString, isNumber, isString } from "../guards";
import { parseValidationBody } from "../common/body";
import { isBlankString, isMonetaryNonNegative, normalizeMonetaryValue } from "../common/money";

/**
 * Validates account creation data.
 *
 * @summary Validates account creation request data.
 * @param data - Request body data.
 * @param lang - Language code for error messages.
 * @returns Validation result with data or errors.
 */
export function validateCreateAccount(
    data: unknown,
    _locale?: Locale
): ValidationResult<CreateOwnedAccountInput> {
    const errors: ValidationError[] = [];
    const bodyResult = parseValidationBody(data);

    if (!bodyResult.success) {
        return bodyResult;
    }

    const body = bodyResult.data;
    let normalizedBalance: string | undefined;

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

    if (body.institution === undefined || body.institution === null || isBlankString(body.institution)) {
        errors.push(createValidationError('institution', ErrorCode.FIELD_REQUIRED, {
            field: 'institution'
        }));
    } else if (!isString(body.institution)) {
        errors.push(createValidationError('institution', ErrorCode.INVALID_TYPE, {
            path: 'institution',
            expected: 'string',
            received: String(body.institution)
        }));
    }

    if (!isEnum(body.type, AccountType)) {
        errors.push(createValidationError('type', ErrorCode.INVALID_ENUM, {
            path: 'type',
            received: body.type === undefined ? 'undefined' : String(body.type),
            options: Object.values(AccountType).join(', ')
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

    if (!isNumber(body.userId) || body.userId <= 0) {
        errors.push(createValidationError('userId', ErrorCode.VALIDATION_ERROR));
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
            institution: body.institution as string,
            type: body.type as AccountType,
            observation: body.observation as string | undefined,
            balance: normalizedBalance,
            userId: body.userId as number,
            active: body.active as boolean | undefined,
        }
    };
}

/**
 * Validates account update data.
 *
 * @summary Validates account update request data.
 * @param data - Request body data.
 * @param lang - Language code for error messages.
 * @returns Validation result with data or errors.
 */
export function validateUpdateAccount(
    data: unknown,
    _locale?: Locale
): ValidationResult<UpdateAccountInput> {
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

    if (body.institution !== undefined) {
        if (body.institution === null || isBlankString(body.institution)) {
            errors.push(createValidationError('institution', ErrorCode.FIELD_REQUIRED, {
                field: 'institution'
            }));
        } else if (!isString(body.institution)) {
            errors.push(createValidationError('institution', ErrorCode.INVALID_TYPE, {
                path: 'institution',
                expected: 'string',
                received: String(body.institution)
            }));
        } else {
            result.institution = body.institution;
        }
    }

    if (body.type !== undefined) {
        if (!isEnum(body.type, AccountType)) {
            errors.push(createValidationError('type', ErrorCode.INVALID_ENUM, {
                path: 'type',
                received: body.type === undefined ? 'undefined' : String(body.type),
                options: Object.values(AccountType).join(', ')
            }));
        } else {
            result.type = body.type;
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
