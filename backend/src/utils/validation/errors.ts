import type { ErrorCode } from "../../../../shared/errors/error-codes";
import type { FieldKey } from "../../../../shared/fields/field-keys";
import type { TranslationParams } from "../../../../shared/i18n/types/catalog";

/**
 * Represents a validation error for a specific field.
 */
export interface ValidationError {
    field: FieldKey;
    errorCode: ErrorCode;
    params?: TranslationParams;
}

/**
 * Represents the standard validation result shape used across request validators.
 */
export type ValidationResult<T> =
    | { success: true; data: T }
    | { success: false; errors: ValidationError[] };

/**
 * @summary Creates a structured validation error payload with machine-stable error identity.
 */
export function createValidationError(
    field: FieldKey,
    errorCode: ErrorCode,
    params?: TranslationParams
): ValidationError {
    return {
        field,
        errorCode,
        ...(params ? { params } : {}),
    };
}
