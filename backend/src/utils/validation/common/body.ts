import { ErrorCode } from "../../../../../shared/errors/error-codes";
import { createValidationError, type ValidationResult } from "../errors";

export type ValidationBody = Record<string, unknown>;

/**
 * @summary Narrows unknown request data into a plain validation body record.
 */
export function parseValidationBody(
    data: unknown
): ValidationResult<ValidationBody> {
    if (!data || typeof data !== 'object') {
        return {
            success: false,
            errors: [createValidationError('body', ErrorCode.VALIDATION_ERROR)],
        };
    }

    return {
        success: true,
        data: data as ValidationBody,
    };
}
