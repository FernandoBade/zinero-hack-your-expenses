import multer from "multer";
import { Request, Response } from "express";
import { HTTPStatus } from "../../../../shared/enums/http-status.enums";
import { MulterErrorCode } from "../../../../shared/enums/upload.enums";
import { ErrorCode } from "../../../../shared/errors/error-codes";
import { type FieldKey as FieldKeyType, isFieldKey } from "../../../../shared/fields/field-keys";
import { answerAPI } from "../commons";
import { createValidationError } from "../validation/errors";
import { UploadValidation } from "./upload.constants";

export interface MulterUploadErrorConfig {
    defaultFieldName: FieldKeyType;
    invalidTypeExpected: string;
}

function resolveFieldKey(fieldName: string | undefined, fallbackFieldName: FieldKeyType): FieldKeyType {
    if (fieldName && isFieldKey(fieldName)) {
        return fieldName;
    }

    return fallbackFieldName;
}

/**
 * @summary Converts Multer upload failures into standardized validation responses.
 */
export function handleMulterUploadError(
    req: Request,
    res: Response,
    error: unknown,
    config: MulterUploadErrorConfig
): boolean {
    if (error instanceof multer.MulterError) {
        const fieldName = resolveFieldKey(error.field, config.defaultFieldName);

        if (error.code === MulterErrorCode.LIMIT_FILE_SIZE) {
            const errors = [
                createValidationError(fieldName, ErrorCode.INVALID_TYPE, {
                    path: fieldName,
                    expected: UploadValidation.FILE_SIZE_EXPECTED,
                    received: UploadValidation.FILE_SIZE_EXCEEDED,
                }),
            ];
            answerAPI(req, res, HTTPStatus.BAD_REQUEST, errors, ErrorCode.VALIDATION_ERROR);
            return true;
        }

        const errors = [
            createValidationError(fieldName, ErrorCode.INVALID_TYPE, {
                path: fieldName,
                expected: config.invalidTypeExpected,
                received: error.field ?? error.code,
            }),
        ];
        answerAPI(req, res, HTTPStatus.BAD_REQUEST, errors, ErrorCode.VALIDATION_ERROR);
        return true;
    }

    if (error) {
        answerAPI(req, res, HTTPStatus.BAD_REQUEST, undefined, ErrorCode.INVALID_TYPE);
        return true;
    }

    return false;
}
