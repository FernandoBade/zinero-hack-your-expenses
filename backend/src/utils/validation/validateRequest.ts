import { isString, isNumber, isNumberArray, isBoolean, isISODateString, isMonetaryString, isEnum, isValidEmail, hasMinLength } from './guards';
import { createValidationError, ValidationError } from './errors';
import { AccountType } from '../../../../shared/enums/account.enums';
import { CategoryType, CategoryColor } from '../../../../shared/enums/category.enums';
import { CreditCardFlag } from '../../../../shared/enums/creditCard.enums';
import { TransactionType, TransactionSource } from '../../../../shared/enums/transaction.enums';
import { Theme, Language, Currency, Profile } from '../../../../shared/enums/user.enums';
import { ErrorCode } from '../../../../shared/errors/error-codes';
import { Locale } from '../../../../shared/i18n/types/locale';
import type { CreateAccountInput, UpdateAccountInput } from '../../../../shared/domains/account/account.types';
import type { CreateCategoryInput, UpdateCategoryInput } from '../../../../shared/domains/category/category.types';
import type { CreateCreditCardInput, UpdateCreditCardInput } from '../../../../shared/domains/creditCard/creditCard.types';
import type { SendFeedbackInput } from '../../../../shared/domains/feedback/feedback.types';
import type { CreateSubcategoryInput, UpdateSubcategoryInput } from '../../../../shared/domains/subcategory/subcategory.types';
import type { CreateTagInput, UpdateTagInput } from '../../../../shared/domains/tag/tag.types';
import type { CreateTransactionInput, UpdateTransactionInput } from '../../../../shared/domains/transaction/transaction.types';
import type { CreateUserInput, UpdateUserInput } from '../../../../shared/domains/user/user.types';

/**
 * @summary Detects string values that are empty after trimming whitespace.
 */
function isBlankString(value: unknown): boolean {
    return typeof value === 'string' && value.trim().length === 0;
}

/**
 * @summary Normalizes localized monetary text into canonical dot-decimal numeric format.
 */
function normalizeMonetaryInput(value: string): string {
    const trimmed = value.trim();
    const cleaned = trimmed.replace(/\s+/g, '');
    const lastComma = cleaned.lastIndexOf(',');
    const lastDot = cleaned.lastIndexOf('.');
    let normalized = cleaned;

    if (lastComma !== -1 && lastDot !== -1) {
        if (lastComma > lastDot) {
            normalized = cleaned.replace(/\./g, '').replace(',', '.');
        } else {
            normalized = cleaned.replace(/,/g, '');
        }
    } else if (lastComma !== -1) {
        normalized = cleaned.replace(/\./g, '').replace(',', '.');
    } else {
        normalized = cleaned.replace(/,/g, '');
    }

    return normalized;
}

/**
 * @summary Normalizes unknown monetary inputs into canonical string values when possible.
 */
function normalizeMonetaryValue(value: unknown): string | undefined {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return String(value);
    }
    if (typeof value !== 'string') {
        return undefined;
    }
    return normalizeMonetaryInput(value);
}

/**
 * @summary Validates that canonical monetary input does not represent a negative value.
 */
function isMonetaryNonNegative(value: string): boolean {
    const trimmed = value.trim();
    if (trimmed.startsWith('-')) {
        return false;
    }
    return true;
}

/**
 * @summary Validates that canonical monetary input represents a value strictly above zero.
 */
function isMonetaryGreaterThanZero(value: string): boolean {
    const trimmed = value.trim();
    if (trimmed.startsWith('-')) {
        return false;
    }

    const unsigned = trimmed.startsWith('+') ? trimmed.slice(1) : trimmed;
    const [integerPart = '0', decimalPart = ''] = unsigned.split('.');
    const normalizedInteger = integerPart.replace(/^0+/, '');
    const normalizedDecimal = decimalPart.replace(/0/g, '');

    return normalizedInteger.length > 0 || normalizedDecimal.length > 0;
}

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
): { success: true; data: CreateUserInput } | { success: false; errors: ValidationError[] } {
    const errors: ValidationError[] = [];

    if (!data || typeof data !== 'object') {
        return { success: false, errors: [createValidationError('body', ErrorCode.VALIDATION_ERROR)] };
    }

    const body = data as Record<string, unknown>;

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

    if (body.profile !== undefined && !isEnum(body.profile, Profile)) {
        errors.push(createValidationError('profile', ErrorCode.INVALID_PROFILE_VALUE));
    }

    if (body.hideValues !== undefined && !isBoolean(body.hideValues)) {
        errors.push(createValidationError('hideValues', ErrorCode.INVALID_TYPE, {
            path: 'hideValues',
            expected: 'boolean',
            received: String(body.hideValues)
        }));
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
            firstName: body.firstName as string,
            lastName: body.lastName as string,
            email: (body.email as string).toLowerCase().trim(),
            password: body.password as string,
            phone: body.phone as string | undefined,
            birthDate: body.birthDate as string | undefined,
            theme: body.theme as Theme | undefined,
            language: body.language as Language | undefined,
            currency: body.currency as Currency | undefined,
            profile: body.profile as Profile | undefined,
            hideValues: body.hideValues as boolean | undefined,
            active: body.active as boolean | undefined,
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
): { success: true; data: UpdateUserInput } | { success: false; errors: ValidationError[] } {
    const errors: ValidationError[] = [];

    if (!data || typeof data !== 'object') {
        return { success: false, errors: [createValidationError('body', ErrorCode.VALIDATION_ERROR)] };
    }

    const body = data as Record<string, unknown>;
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

    if (body.profile !== undefined && !isEnum(body.profile, Profile)) {
        errors.push(createValidationError('profile', ErrorCode.INVALID_PROFILE_VALUE));
    } else if (body.profile !== undefined) {
        result.profile = body.profile;
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
): { success: true; data: CreateAccountInput } | { success: false; errors: ValidationError[] } {
    const errors: ValidationError[] = [];

    if (!data || typeof data !== 'object') {
        return { success: false, errors: [createValidationError('body', ErrorCode.VALIDATION_ERROR)] };
    }

    const body = data as Record<string, unknown>;
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
): { success: true; data: UpdateAccountInput } | { success: false; errors: ValidationError[] } {
    const errors: ValidationError[] = [];
    const result: Record<string, unknown> = {};

    if (!data || typeof data !== 'object') {
        return { success: false, errors: [createValidationError('body', ErrorCode.VALIDATION_ERROR)] };
    }

    const body = data as Record<string, unknown>;
    let normalizedBalance: string | undefined;

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
                normalizedBalance = candidate;
                result.balance = normalizedBalance;
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

/**
 * Validates category creation data.
 *
 * @summary Validates category creation request data.
 * @param data - Request body data.
 * @param lang - Language code for error messages.
 * @returns Validation result with data or errors.
 */
export function validateCreateCategory(
    data: unknown,
    _locale?: Locale
): { success: true; data: CreateCategoryInput } | { success: false; errors: ValidationError[] } {
    const errors: ValidationError[] = [];

    if (!data || typeof data !== 'object') {
        return { success: false, errors: [createValidationError('body', ErrorCode.VALIDATION_ERROR)] };
    }

    const body = data as Record<string, unknown>;

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

    if (!isEnum(body.type, CategoryType)) {
        errors.push(createValidationError('type', ErrorCode.INVALID_ENUM, {
            path: 'type',
            received: body.type === undefined ? 'undefined' : String(body.type),
            options: Object.values(CategoryType).join(', ')
        }));
    }

    if (body.color !== undefined && !isEnum(body.color, CategoryColor)) {
        errors.push(createValidationError('color', ErrorCode.INVALID_ENUM, {
            path: 'color',
            received: body.color === undefined ? 'undefined' : String(body.color),
            options: Object.values(CategoryColor).join(', ')
        }));
    }

    if (body.active !== undefined && !isBoolean(body.active)) {
        errors.push(createValidationError('active', ErrorCode.INVALID_TYPE, {
            path: 'active',
            expected: 'boolean',
            received: String(body.active)
        }));
    }

    if (!isNumber(body.userId) || body.userId <= 0) {
        errors.push(createValidationError('userId', ErrorCode.VALIDATION_ERROR));
    }

    if (errors.length > 0) {
        return { success: false, errors };
    }

    return {
        success: true,
        data: {
            name: body.name as string,
            type: body.type as CategoryType,
            color: body.color as CategoryColor | undefined,
            active: body.active as boolean | undefined,
            userId: body.userId as number,
        }
    };
}

/**
 * Validates category update data.
 *
 * @summary Validates category update request data.
 * @param data - Request body data.
 * @param lang - Language code for error messages.
 * @returns Validation result with data or errors.
 */
export function validateUpdateCategory(
    data: unknown,
    _locale?: Locale
): { success: true; data: UpdateCategoryInput } | { success: false; errors: ValidationError[] } {
    const errors: ValidationError[] = [];
    const result: Record<string, unknown> = {};

    if (!data || typeof data !== 'object') {
        return { success: false, errors: [createValidationError('body', ErrorCode.VALIDATION_ERROR)] };
    }

    const body = data as Record<string, unknown>;

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

    if (body.type !== undefined) {
        if (!isEnum(body.type, CategoryType)) {
            errors.push(createValidationError('type', ErrorCode.INVALID_ENUM, {
                path: 'type',
                received: body.type === undefined ? 'undefined' : String(body.type),
                options: Object.values(CategoryType).join(', ')
            }));
        } else {
            result.type = body.type;
        }
    }

    if (body.color !== undefined) {
        if (!isEnum(body.color, CategoryColor)) {
            errors.push(createValidationError('color', ErrorCode.INVALID_ENUM, {
                path: 'color',
                received: body.color === undefined ? 'undefined' : String(body.color),
                options: Object.values(CategoryColor).join(', ')
            }));
        } else {
            result.color = body.color;
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

    if (body.userId !== undefined) {
        if (!isNumber(body.userId) || body.userId <= 0) {
            errors.push(createValidationError('userId', ErrorCode.VALIDATION_ERROR));
        } else {
            result.userId = body.userId;
        }
    }

    if (errors.length > 0) {
        return { success: false, errors };
    }

    return { success: true, data: result };
}

/**
 * Validates subcategory creation data.
 *
 * @summary Validates subcategory creation request data.
 * @param data - Request body data.
 * @param lang - Language code for error messages.
 * @returns Validation result with data or errors.
 */
export function validateCreateSubcategory(
    data: unknown,
    _locale?: Locale
): { success: true; data: CreateSubcategoryInput } | { success: false; errors: ValidationError[] } {
    const errors: ValidationError[] = [];

    if (!data || typeof data !== 'object') {
        return { success: false, errors: [createValidationError('body', ErrorCode.VALIDATION_ERROR)] };
    }

    const body = data as Record<string, unknown>;

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

    if (!isNumber(body.categoryId) || body.categoryId <= 0) {
        errors.push(createValidationError('categoryId', ErrorCode.VALIDATION_ERROR));
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
            categoryId: body.categoryId as number,
            active: body.active as boolean | undefined,
        }
    };
}

/**
 * Validates subcategory update data.
 *
 * @summary Validates subcategory update request data.
 * @param data - Request body data.
 * @param lang - Language code for error messages.
 * @returns Validation result with data or errors.
 */
export function validateUpdateSubcategory(
    data: unknown,
    _locale?: Locale
): { success: true; data: UpdateSubcategoryInput } | { success: false; errors: ValidationError[] } {
    const errors: ValidationError[] = [];
    const result: Record<string, unknown> = {};

    if (!data || typeof data !== 'object') {
        return { success: false, errors: [createValidationError('body', ErrorCode.VALIDATION_ERROR)] };
    }

    const body = data as Record<string, unknown>;

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

    if (body.categoryId !== undefined) {
        if (!isNumber(body.categoryId) || body.categoryId <= 0) {
            errors.push(createValidationError('categoryId', ErrorCode.VALIDATION_ERROR));
        } else {
            result.categoryId = body.categoryId;
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
): { success: true; data: CreateCreditCardInput } | { success: false; errors: ValidationError[] } {
    const errors: ValidationError[] = [];

    if (!data || typeof data !== 'object') {
        return { success: false, errors: [createValidationError('body', ErrorCode.VALIDATION_ERROR)] };
    }

    const body = data as Record<string, unknown>;
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
): { success: true; data: UpdateCreditCardInput } | { success: false; errors: ValidationError[] } {
    const errors: ValidationError[] = [];
    const result: Record<string, unknown> = {};

    if (!data || typeof data !== 'object') {
        return { success: false, errors: [createValidationError('body', ErrorCode.VALIDATION_ERROR)] };
    }

    const body = data as Record<string, unknown>;
    let normalizedBalance: string | undefined;
    let normalizedLimit: string | undefined;

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
                normalizedBalance = candidate;
                result.balance = normalizedBalance;
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
                result.limit = normalizedLimit;
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

/**
 * Validates tag creation data.
 *
 * @summary Validates tag creation request data.
 * @param data - Request body data.
 * @param lang - Language code for error messages.
 * @returns Validation result with data or errors.
 */
export function validateCreateTag(
    data: unknown,
    _locale?: Locale
): { success: true; data: CreateTagInput } | { success: false; errors: ValidationError[] } {
    const errors: ValidationError[] = [];

    if (!data || typeof data !== 'object') {
        return { success: false, errors: [createValidationError('body', ErrorCode.VALIDATION_ERROR)] };
    }

    const body = data as Record<string, unknown>;

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
            userId: body.userId as number,
            active: body.active as boolean | undefined,
        }
    };
}

/**
 * Validates tag update data.
 *
 * @summary Validates tag update request data.
 * @param data - Request body data.
 * @param lang - Language code for error messages.
 * @returns Validation result with data or errors.
 */
export function validateUpdateTag(
    data: unknown,
    _locale?: Locale
): { success: true; data: UpdateTagInput } | { success: false; errors: ValidationError[] } {
    const errors: ValidationError[] = [];
    const result: Record<string, unknown> = {};

    if (!data || typeof data !== 'object') {
        return { success: false, errors: [createValidationError('body', ErrorCode.VALIDATION_ERROR)] };
    }

    const body = data as Record<string, unknown>;

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

    if (body.userId !== undefined) {
        if (!isNumber(body.userId) || body.userId <= 0) {
            errors.push(createValidationError('userId', ErrorCode.VALIDATION_ERROR));
        } else {
            result.userId = body.userId;
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
): { success: true; data: CreateTransactionInput } | { success: false; errors: ValidationError[] } {
    const errors: ValidationError[] = [];

    if (!data || typeof data !== 'object') {
        return { success: false, errors: [createValidationError('body', ErrorCode.VALIDATION_ERROR)] };
    }

    const body = data as Record<string, unknown>;
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
        if (!isNumberArray(body.tags) || (body.tags as number[]).some(tagId => tagId <= 0)) {
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
): { success: true; data: UpdateTransactionInput } | { success: false; errors: ValidationError[] } {
    const errors: ValidationError[] = [];
    const result: Record<string, unknown> = {};

    if (!data || typeof data !== 'object') {
        return { success: false, errors: [createValidationError('body', ErrorCode.VALIDATION_ERROR)] };
    }

    const body = data as Record<string, unknown>;

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
        if (!isNumberArray(body.tags) || (body.tags as number[]).some(tagId => tagId <= 0)) {
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

/**
 * Validates feedback submission data.
 *
 * @summary Validates feedback request payload.
 * @param data - Request body data.
 * @param lang - Language code for error messages.
 * @returns Validation result with data or errors.
 */
export function validateFeedbackRequest(
    data: unknown,
    _locale?: Locale
): { success: true; data: SendFeedbackInput } | { success: false; errors: ValidationError[] } {
    const errors: ValidationError[] = [];

    if (!data || typeof data !== 'object') {
        return { success: false, errors: [createValidationError('body', ErrorCode.VALIDATION_ERROR)] };
    }

    const body = data as Record<string, unknown>;
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    const message = typeof body.message === 'string' ? body.message.trim() : '';

    if (!title) {
        errors.push(createValidationError('title', ErrorCode.FIELD_REQUIRED, {
            field: 'title'
        }));
    }

    if (!message) {
        errors.push(createValidationError('message', ErrorCode.FIELD_REQUIRED, {
            field: 'message'
        }));
    }

    if (errors.length > 0) {
        return { success: false, errors };
    }

    return { success: true, data: { title, message } };
}

