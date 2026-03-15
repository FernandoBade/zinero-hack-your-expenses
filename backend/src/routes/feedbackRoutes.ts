import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { verifyToken } from '../utils/auth/verifyToken';
import FeedbackController from '../controller/feedbackController';
import { createLog, formatError } from '../utils/commons';
import { LogCategory, LogOperation, LogType } from '../../../shared/enums/log.enums';
import { FieldKey } from '../../../shared/fields/field-keys';
import { UploadValidation } from '../utils/upload/upload.constants';
import { handleMulterUploadError } from '../utils/upload/upload.middleware';

const router = Router();

const feedbackUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: UploadValidation.MAX_FILE_SIZE_BYTES },
});

/**
 * @summary Applies feedback multipart parsing and converts multer errors to validation responses.
 */
const handleFeedbackUpload = (req: Request, res: Response, next: NextFunction) => {
    feedbackUpload.fields([
        { name: 'image', maxCount: 1 },
        { name: 'audio', maxCount: 1 },
    ])(req, res, (error: unknown) => {
        const handled = handleMulterUploadError(req, res, error, {
            defaultFieldName: FieldKey.FILE,
            invalidTypeExpected: UploadValidation.FEEDBACK_ATTACHMENT_EXPECTED,
        });
        if (handled) {
            return;
        }
        next();
    });
};

/**
 * @route POST /
 * @description Sends beta feedback with optional attachments. Requires authentication.
 */
router.post('/', verifyToken, handleFeedbackUpload, async (req: Request, res: Response, next: NextFunction) => {
    try {
        await FeedbackController.sendFeedback(req, res, next);
    } catch (error) {
        await createLog(
            LogType.DEBUG,
            LogOperation.CREATE,
            LogCategory.LOG,
            formatError(error),
            req.user?.id,
            next
        );
    }
});

export default router;