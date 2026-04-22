import type { SendFeedbackInput } from "../../../../../shared/domains/feedback/feedback.types";
import { ErrorCode } from "../../../../../shared/errors/error-codes";
import type { Locale } from "../../../../../shared/i18n/types/locale";
import { createValidationError, type ValidationError, type ValidationResult } from "../errors";
import { parseValidationBody } from "../common/body";

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
): ValidationResult<SendFeedbackInput> {
    const errors: ValidationError[] = [];
    const bodyResult = parseValidationBody(data);

    if (!bodyResult.success) {
        return bodyResult;
    }

    const body = bodyResult.data;
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
