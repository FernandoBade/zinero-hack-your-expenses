import type { CreateOwnedCategoryInput, UpdateCategoryInput } from "../../../../../shared/domains/category/category.types";
import { CategoryType, CategoryColor } from "../../../../../shared/enums/category.enums";
import { ErrorCode } from "../../../../../shared/errors/error-codes";
import type { Locale } from "../../../../../shared/i18n/types/locale";
import { createValidationError, type ValidationError, type ValidationResult } from "../errors";
import { isBoolean, isEnum, isNumber, isString } from "../guards";
import { parseValidationBody } from "../common/body";
import { isBlankString } from "../common/money";

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
): ValidationResult<CreateOwnedCategoryInput> {
    const errors: ValidationError[] = [];
    const bodyResult = parseValidationBody(data);

    if (!bodyResult.success) {
        return bodyResult;
    }

    const body = bodyResult.data;

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
): ValidationResult<UpdateCategoryInput> {
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
