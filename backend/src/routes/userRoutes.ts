import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { LogType, LogOperation, LogCategory } from '../../../shared/enums/log.enums';
import { FieldKey } from '../../../shared/fields/field-keys';
import { createLog, formatError } from '../utils/commons';
import { verifyToken } from '../utils/auth/verifyToken';
import UserController from '../controller/userController';
import { UploadValidation } from '../utils/upload/upload.constants';
import { handleMulterUploadError } from '../utils/upload/upload.middleware';

const router = Router();
const avatarUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: UploadValidation.MAX_FILE_SIZE_BYTES },
});

/**
 * @summary Applies avatar upload parsing and normalizes multer failures for API responses.
 */
const handleAvatarUpload = (req: Request, res: Response, next: NextFunction) => {
    avatarUpload.single('avatar')(req, res, (error: unknown) => {
        const handled = handleMulterUploadError(req, res, error, {
            defaultFieldName: FieldKey.AVATAR,
            invalidTypeExpected: UploadValidation.AVATAR_FILE_EXPECTED,
        });
        if (handled) {
            return;
        }
        next();
    });
};

/**
 * @route GET /search
 * @description Searches for users by partial email. Requires authentication.
 */
router.get('/search', verifyToken, async (req: Request, res: Response, next: NextFunction) => {
    try {
        await UserController.getUsersByEmail(req, res, next);
    } catch (error) {
        await createLog(
            LogType.DEBUG,
            LogOperation.CREATE,
            LogCategory.USER,
            formatError(error),
            undefined,
            next
        );
    }
});

/**
 * @route POST /
 * @description Creates a new user with validated input data.
 */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
        await UserController.createUser(req, res, next);
    } catch (error) {
        await createLog(
            LogType.DEBUG,
            LogOperation.CREATE,
            LogCategory.USER,
            formatError(error),
            req.body?.userId,
            next
        );
    }
});

/**
 * @route POST /upload/avatar
 * @description Uploads an avatar for the authenticated user.
 */
router.post('/upload/avatar', verifyToken, handleAvatarUpload, async (req: Request, res: Response, next: NextFunction) => {
    try {
        await UserController.uploadAvatar(req, res, next);
    } catch (error) {
        await createLog(
            LogType.DEBUG,
            LogOperation.UPDATE,
            LogCategory.USER,
            formatError(error),
            req.user?.id,
            next
        );
    }
});

/**
 * @route GET /:id
 * @description Retrieves a user by ID. Requires authentication.
 */
router.get('/:id', verifyToken, async (req: Request, res: Response, next: NextFunction) => {
    try {
        await UserController.getUserById(req, res, next);
    } catch (error) {
        await createLog(
            LogType.DEBUG,
            LogOperation.CREATE,
            LogCategory.USER,
            formatError(error),
            Number(req.params.id) || undefined,
            next
        );
    }
});

/**
 * @route GET /
 * @description Lists all users in the system. Requires authentication.
 */
router.get('/', verifyToken, async (req: Request, res: Response, next: NextFunction) => {
    try {
        await UserController.getUsers(req, res, next);
    } catch (error) {
        await createLog(
            LogType.DEBUG,
            LogOperation.CREATE,
            LogCategory.USER,
            formatError(error),
            undefined,
            next
        );
    }
});

/**
 * @route PUT /:id
 * @description Updates an existing user by ID. Requires authentication.
 */
router.put('/:id', verifyToken, async (req: Request, res: Response, next: NextFunction) => {
    try {
        await UserController.updateUser(req, res, next);
    } catch (error) {
        await createLog(
            LogType.DEBUG,
            LogOperation.UPDATE,
            LogCategory.USER,
            formatError(error),
            Number(req.params.id) || undefined,
            next
        );
    }
});

/**
 * @route DELETE /:id
 * @description Deletes a user by ID. Requires authentication.
 */
router.delete('/:id', verifyToken, async (req: Request, res: Response, next: NextFunction) => {
    try {
        await UserController.deleteUser(req, res, next);
    } catch (error) {
        await createLog(
            LogType.DEBUG,
            LogOperation.DELETE,
            LogCategory.USER,
            formatError(error),
            Number(req.params.id) || undefined,
            next
        );
    }
});

export default router;