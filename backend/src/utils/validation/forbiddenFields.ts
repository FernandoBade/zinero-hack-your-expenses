import type { FieldKey } from "../../../../shared/fields/field-keys";
import { ErrorCode } from "../../../../shared/errors/error-codes";
import { createValidationError, type ValidationError } from "./errors";

/**
 * @summary Builds validation errors for client-controlled fields that are forbidden on the current endpoint.
 */
export function getForbiddenFieldErrors(
    data: unknown,
    fields: FieldKey[]
): ValidationError[] {
    if (!data || typeof data !== "object") {
        return [];
    }

    return fields
        .filter((field) => Object.prototype.hasOwnProperty.call(data, field))
        .map((field) =>
            createValidationError(field, ErrorCode.VALIDATION_ERROR, {
                path: field,
                reason: "forbidden",
            })
        );
}
