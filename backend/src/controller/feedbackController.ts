import { Request, Response, NextFunction } from 'express';
import { FeedbackService } from '../service/feedbackService';
import { UserService } from '../service/userService';
import { answerAPI, createLog, formatError } from '../utils/commons';
import { HTTPStatus } from '../../../shared/enums/http-status.enums';
import { LogCategory, LogEvent, LogOperation, LogType } from '../../../shared/enums/log.enums';
import { validateFeedbackRequest } from '../utils/validation/validateRequest';
import { createValidationError, ValidationError } from '../utils/validation/errors';
import { ErrorCode } from '../../../shared/errors/error-codes';
import type { Locale } from '../../../shared/i18n/types/locale';
import type { FeedbackAttachmentInput } from '../utils/email/feedbackEmail';
import { ALLOWED_AUDIO_MIME_TYPES, ALLOWED_IMAGE_MIME_TYPES } from '../../../shared/enums/upload.enums';
import { UploadValidation } from '../utils/upload/upload.constants';

/**
 * @summary Normalizes the multer files payload into a field-to-files map.
 */
const getFileMap = (files: Request['files']) =>
    files as Record<string, Express.Multer.File[]> | undefined;

/**
 * @summary Validates optional feedback attachment MIME types and returns field-level errors.
 */
const validateAttachmentTypes = (
    imageFile: Express.Multer.File | undefined,
    audioFile: Express.Multer.File | undefined
) => {
    const errors: ValidationError[] = [];

    if (imageFile && !ALLOWED_IMAGE_MIME_TYPES.has(imageFile.mimetype)) {
        errors.push(
            createValidationError(
                'image',
                ErrorCode.INVALID_TYPE,
                {
                    path: 'image',
                    expected: UploadValidation.FEEDBACK_IMAGE_MIME_EXPECTED,
                    received: imageFile.mimetype,
                }
            )
        );
    }

    if (audioFile && !ALLOWED_AUDIO_MIME_TYPES.has(audioFile.mimetype)) {
        errors.push(
            createValidationError(
                'audio',
                ErrorCode.INVALID_TYPE,
                {
                    path: 'audio',
                    expected: UploadValidation.FEEDBACK_AUDIO_MIME_EXPECTED,
                    received: audioFile.mimetype,
                }
            )
        );
    }

    return errors;
};

/**
 * @summary Maps a multer file into email attachment payload expected by the sender layer.
 */
const mapAttachment = (
    file: Express.Multer.File | undefined
): FeedbackAttachmentInput | undefined => {
    if (!file) {
        return undefined;
    }
    return {
        filename: file.originalname || file.filename || file.fieldname,
        content: file.buffer,
        contentType: file.mimetype,
    };
};

class FeedbackController {
        /**
     * @summary Validates feedback input and dispatches support email delivery for the authenticated user.
     */
    static async sendFeedback(req: Request, res: Response, next: NextFunction) {
        const feedbackService = new FeedbackService();
        const userService = new UserService();

        try {
            const userId = req.user?.id;
            if (!userId) {
                return answerAPI(req, res, HTTPStatus.UNAUTHORIZED, undefined, ErrorCode.EXPIRED_OR_INVALID_TOKEN);
            }

            const parseResult = validateFeedbackRequest(req.body, req.language as Locale);
            if (!parseResult.success) {
                return answerAPI(
                    req,
                    res,
                    HTTPStatus.BAD_REQUEST,
                    parseResult.errors,
                    ErrorCode.VALIDATION_ERROR
                );
            }

            const files = getFileMap(req.files);
            const imageFile = files?.image?.[0];
            const audioFile = files?.audio?.[0];
            const fileErrors = validateAttachmentTypes(
                imageFile,
                audioFile
            );

            if (fileErrors.length > 0) {
                return answerAPI(
                    req,
                    res,
                    HTTPStatus.BAD_REQUEST,
                    fileErrors,
                    ErrorCode.VALIDATION_ERROR
                );
            }

            const userResult = await userService.findOne(userId);
            if (!userResult.success) {
                return answerAPI(req, res, HTTPStatus.BAD_REQUEST, undefined, userResult.error);
            }
            if (!userResult.data) {
                return answerAPI(req, res, HTTPStatus.BAD_REQUEST, undefined, ErrorCode.USER_NOT_FOUND);
            }

            const attachments = [mapAttachment(imageFile), mapAttachment(audioFile)].filter(
                (attachment): attachment is FeedbackAttachmentInput => Boolean(attachment)
            );

            const result = await feedbackService.sendFeedback({
                userId,
                userEmail: userResult.data.email,
                title: parseResult.data.title,
                message: parseResult.data.message,
                language: req.language as Locale,
                attachments: attachments.length > 0 ? attachments : undefined,
            });

            if (!result.success) {
                return answerAPI(req, res, HTTPStatus.INTERNAL_SERVER_ERROR, undefined, result.error);
            }

            await createLog(
                LogType.SUCCESS,
                LogOperation.CREATE,
                LogCategory.LOG,
                {
                    event: LogEvent.FEEDBACK_SENT,
                    hasImage: Boolean(imageFile),
                    hasAudio: Boolean(audioFile),
                },
                userId
            );

            return answerAPI(req, res, HTTPStatus.OK, result.data);
        } catch (error) {
            await createLog(
                LogType.ERROR,
                LogOperation.CREATE,
                LogCategory.LOG,
                formatError(error),
                req.user?.id,
                next
            );
            return answerAPI(req, res, HTTPStatus.INTERNAL_SERVER_ERROR, undefined, ErrorCode.INTERNAL_SERVER_ERROR);
        }
    }
}

export default FeedbackController;

