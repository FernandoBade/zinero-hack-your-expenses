import type { CreateOwnedTagInput, UpdateTagInput } from "../../../../../shared/domains/tag/tag.types";
import { ErrorCode } from "../../../../../shared/errors/error-codes";
import type { Locale } from "../../../../../shared/i18n/types/locale";
import { createValidationError, type ValidationError, type ValidationResult } from "../errors";
import { isBoolean, isNumber, isString } from "../guards";
import { parseValidationBody } from "../common/body";
import { isBlankString } from "../common/money";

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
): ValidationResult<CreateOwnedTagInput> {
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
): ValidationResult<UpdateTagInput> {
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
