import { Theme, Language, Currency } from "../../../../../shared/enums/user.enums";
import { ErrorCode } from "../../../../../shared/errors/error-codes";
import type { Locale } from "../../../../../shared/i18n/types/locale";
import type { CreateUserInput, UpdateUserInput } from "../../../../../shared/domains/user/user.types";
import { isString, isBoolean, isISODateString, isEnum, isValidEmail, hasMinLength } from "../guards";
import type { ValidationError, ValidationResult } from "../errors";
import { createValidationError } from "../errors";
import { parseValidationBody } from "../common/body";

/**
 * Validates user creation data.
 *
 * @summary Validates user creation request data.
 * @param data - Request body data.
 * @param lang - Language code for error messages.
 * @returns Validation result with data or errors.
 */
export function validateCreateUser(
    data: unknown,
    _locale?: Locale
): ValidationResult<CreateUserInput> {
    const errors: ValidationError[] = [];
    const bodyResult = parseValidationBody(data);

    if (!bodyResult.success) {
        return bodyResult;
    }

    const body = bodyResult.data;

    if (!isString(body.firstName) || !hasMinLength(body.firstName, 2)) {
        errors.push(createValidationError('firstName', ErrorCode.FIRST_NAME_TOO_SHORT));
    }

    if (!isString(body.lastName) || !hasMinLength(body.lastName, 2)) {
        errors.push(createValidationError('lastName', ErrorCode.LAST_NAME_TOO_SHORT));
    }

    if (!isString(body.email) || !isValidEmail(body.email)) {
        errors.push(createValidationError('email', ErrorCode.EMAIL_INVALID));
    }

    if (!isString(body.password) || !hasMinLength(body.password, 6)) {
        errors.push(createValidationError('password', ErrorCode.PASSWORD_TOO_SHORT));
    }

    if (body.phone !== undefined && !isString(body.phone)) {
        errors.push(createValidationError('phone', ErrorCode.INVALID_PHONE_TYPE));
    }

    if (body.birthDate !== undefined && !isISODateString(body.birthDate)) {
        errors.push(createValidationError('birthDate', ErrorCode.INVALID_DATE_VALUE));
    }

    if (body.theme !== undefined && !isEnum(body.theme, Theme)) {
        errors.push(createValidationError('theme', ErrorCode.INVALID_THEME_VALUE));
    }

    if (body.language !== undefined && !isEnum(body.language, Language)) {
        errors.push(createValidationError('language', ErrorCode.INVALID_LANGUAGE_VALUE));
    }

    if (body.currency !== undefined && !isEnum(body.currency, Currency)) {
        errors.push(createValidationError('currency', ErrorCode.INVALID_CURRENCY_VALUE));
    }

    if (body.hideValues !== undefined && !isBoolean(body.hideValues)) {
        errors.push(createValidationError('hideValues', ErrorCode.INVALID_TYPE, {
            path: 'hideValues',
            expected: 'boolean',
            received: String(body.hideValues)
        }));
    }

    if (errors.length > 0) {
        return { success: false, errors };
    }

    return {
        success: true,
        data: {
            firstName: body.firstName as string,
            lastName: body.lastName as string,
            email: (body.email as string).toLowerCase().trim(),
            password: body.password as string,
            phone: body.phone as string | undefined,
            birthDate: body.birthDate as string | undefined,
            theme: body.theme as Theme | undefined,
            language: body.language as Language | undefined,
            currency: body.currency as Currency | undefined,
            hideValues: body.hideValues as boolean | undefined,
        }
    };
}

/**
 * Validates user update data (all fields optional).
 *
 * @summary Validates user update request data.
 * @param data - Request body data.
 * @param lang - Language code for error messages.
 * @returns Validation result with data or errors.
 */
export function validateUpdateUser(
    data: unknown,
    _locale?: Locale
): ValidationResult<UpdateUserInput> {
    const errors: ValidationError[] = [];
    const bodyResult = parseValidationBody(data);

    if (!bodyResult.success) {
        return bodyResult;
    }

    const body = bodyResult.data;
    const result: Record<string, unknown> = {};

    if (body.firstName !== undefined) {
        if (!isString(body.firstName) || !hasMinLength(body.firstName, 2)) {
            errors.push(createValidationError('firstName', ErrorCode.FIRST_NAME_TOO_SHORT));
        } else {
            result.firstName = body.firstName;
        }
    }

    if (body.lastName !== undefined) {
        if (!isString(body.lastName) || !hasMinLength(body.lastName, 2)) {
            errors.push(createValidationError('lastName', ErrorCode.LAST_NAME_TOO_SHORT));
        } else {
            result.lastName = body.lastName;
        }
    }

    if (body.email !== undefined) {
        if (!isString(body.email) || !isValidEmail(body.email)) {
            errors.push(createValidationError('email', ErrorCode.EMAIL_INVALID));
        } else {
            result.email = (body.email as string).toLowerCase().trim();
        }
    }

    if (body.password !== undefined) {
        if (!isString(body.password) || !hasMinLength(body.password, 6)) {
            errors.push(createValidationError('password', ErrorCode.PASSWORD_TOO_SHORT));
        } else {
            result.password = body.password;
        }
    }

    if (body.phone !== undefined && body.phone !== null) {
        if (!isString(body.phone)) {
            errors.push(createValidationError('phone', ErrorCode.INVALID_PHONE_TYPE));
        } else {
            result.phone = body.phone;
        }
    }

    if (body.birthDate !== undefined && body.birthDate !== null) {
        if (!isISODateString(body.birthDate)) {
            errors.push(createValidationError('birthDate', ErrorCode.INVALID_DATE_VALUE));
        } else {
            result.birthDate = body.birthDate;
        }
    }

    if (body.theme !== undefined && !isEnum(body.theme, Theme)) {
        errors.push(createValidationError('theme', ErrorCode.INVALID_THEME_VALUE));
    } else if (body.theme !== undefined) {
        result.theme = body.theme;
    }

    if (body.language !== undefined && !isEnum(body.language, Language)) {
        errors.push(createValidationError('language', ErrorCode.INVALID_LANGUAGE_VALUE));
    } else if (body.language !== undefined) {
        result.language = body.language;
    }

    if (body.currency !== undefined && !isEnum(body.currency, Currency)) {
        errors.push(createValidationError('currency', ErrorCode.INVALID_CURRENCY_VALUE));
    } else if (body.currency !== undefined) {
        result.currency = body.currency;
    }

    if (body.hideValues !== undefined) {
        if (!isBoolean(body.hideValues)) {
            errors.push(createValidationError('hideValues', ErrorCode.INVALID_TYPE, {
                path: 'hideValues',
                expected: 'boolean',
                received: String(body.hideValues)
            }));
        } else {
            result.hideValues = body.hideValues;
        }
    }

    if (errors.length > 0) {
        return { success: false, errors };
    }

    return { success: true, data: result };
}
