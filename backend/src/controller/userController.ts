import { Request, Response, NextFunction } from 'express';
import { UserService } from '../service/userService';
import { buildLogDelta, createLog, answerAPI, formatError, sanitizeLogDetail } from '../utils/commons';
import { HTTPStatus } from '../../../shared/enums/http-status.enums';
import { LogCategory, LogOperation, LogType } from '../../../shared/enums/log.enums';
import { Profile } from '../../../shared/enums/user.enums';
import { validateCreateUser, validateUpdateUser } from '../utils/validation/validateRequest';
import { createValidationError, ValidationError } from '../utils/validation/errors';
import { getForbiddenFieldErrors } from '../utils/validation/forbiddenFields';
import { ErrorCode } from '../../../shared/errors/error-codes';
import { Locale } from '../../../shared/i18n/types/locale';
import { parsePagination, buildMeta } from '../utils/pagination';
import { ALLOWED_IMAGE_MIME_TYPES } from '../../../shared/enums/upload.enums';
import { UploadValidation } from '../utils/upload/upload.constants';
import { canAccessRequestedUser } from '../utils/auth/authorization';

const hasUserCredentialFields = (value: unknown): boolean => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return false;
    }

    return ['email', 'password', 'currentPassword'].some((field) =>
        Object.prototype.hasOwnProperty.call(value, field)
    );
};

const resolveEmailDeliveryStatus = (error: ErrorCode): HTTPStatus =>
    error === ErrorCode.EMAIL_DELIVERY_FAILED
        ? HTTPStatus.SERVICE_UNAVAILABLE
        : HTTPStatus.BAD_REQUEST;

class UserController {
    /** @summary Creates a new user using validated input from the request body.
     * Logs the result and returns the created user on success.
     *
     * @param req - Express request containing new user data.
     * @param res - Express response returning the created user.
     * @param next - Express next function for error handling.
     * @returns HTTP 201 with new user data or appropriate error.
     */
    static async createUser(req: Request, res: Response, next: NextFunction) {
        const userService = new UserService();

        try {
            const forbiddenFieldErrors = getForbiddenFieldErrors(req.body, ['profile', 'active']);
            if (forbiddenFieldErrors.length > 0) {
                return answerAPI(req, res, HTTPStatus.BAD_REQUEST, forbiddenFieldErrors, ErrorCode.VALIDATION_ERROR);
            }

            const parseResult = validateCreateUser(req.body, req.language as Locale);

            if (!parseResult.success) {
                return answerAPI(
                    req,
                    res,
                    HTTPStatus.BAD_REQUEST,
                    parseResult.errors,
                    ErrorCode.VALIDATION_ERROR
                );
            }

            const newUser = await userService.createUser(parseResult.data);

            if (!newUser.success) {
                if (newUser.error === ErrorCode.EMAIL_NOT_VERIFIED) {
                    return answerAPI(req, res, HTTPStatus.BAD_REQUEST, {
                        email: parseResult.data.email,
                        canResend: true,
                    }, ErrorCode.EMAIL_NOT_VERIFIED);
                }
                return answerAPI(req, res, resolveEmailDeliveryStatus(newUser.error), undefined, newUser.error);
            }

            await createLog(LogType.SUCCESS, LogOperation.CREATE, LogCategory.USER, newUser.data, newUser.data!.id);
            return answerAPI(req, res, HTTPStatus.CREATED, newUser.data!, ErrorCode.EMAIL_VERIFICATION_REQUIRED);
        } catch (error) {
            await createLog(
                LogType.ERROR,
                LogOperation.CREATE,
                LogCategory.USER,
                formatError(error),
                req.user?.id,
                next
            );
            return answerAPI(req, res, HTTPStatus.INTERNAL_SERVER_ERROR, undefined, ErrorCode.INTERNAL_SERVER_ERROR);
        }
    }

        /**
     * @summary Returns paginated users. Restricted to MASTER profile users only.
     * @param req - Express request object.
     * @param res - Express response returning the user list or an error.
     * @param next - Express next function for error handling.
     * @returns HTTP 200 with user array or appropriate error. May be empty.
     */

    static async getUsers(req: Request, res: Response, next: NextFunction) {
        if (req.user?.profile !== Profile.MASTER) {
            return answerAPI(req, res, HTTPStatus.FORBIDDEN, undefined, ErrorCode.UNAUTHORIZED_OPERATION);
        }

        const userService = new UserService();

        try {
            const { page, pageSize, limit, offset, sort, order } = parsePagination(req.query);
            const [rows, total] = await Promise.all([
                userService.getUsers({ limit, offset, sort, order }),
                userService.countUsers()
            ]);

            if (!rows.success) {
                return answerAPI(req, res, HTTPStatus.BAD_REQUEST, undefined, rows.error);
            }

            if (!total.success) {
                return answerAPI(req, res, HTTPStatus.BAD_REQUEST, undefined, total.error);
            }

            return answerAPI(req, res, HTTPStatus.OK, {
                data: rows.data,
                meta: buildMeta({ page, pageSize, total: total.data })
            });
        } catch (error) {
            await createLog(LogType.ERROR, LogOperation.CREATE, LogCategory.USER, formatError(error), req.user?.id, next);
            return answerAPI(req, res, HTTPStatus.INTERNAL_SERVER_ERROR, undefined, ErrorCode.INTERNAL_SERVER_ERROR);
        }
    }

        /**
     * @summary Returns a user by id after ownership or privileged-access checks.
     * @param req - Express request containing user ID in the URL.
     * @param res - Express response returning the user or an error.
     * @param next - Express next function for error handling.
     * @returns HTTP 200 with user data or appropriate error.
     */

    static async getUserById(req: Request, res: Response, next: NextFunction) {
        const userId = Number(req.params.id);
        if (isNaN(userId) || userId <= 0) {
            return answerAPI(req, res, HTTPStatus.BAD_REQUEST, undefined, ErrorCode.INVALID_USER_ID);
        }

        if (!canAccessRequestedUser(req.user, userId)) {
            return answerAPI(req, res, HTTPStatus.FORBIDDEN, undefined, ErrorCode.UNAUTHORIZED_OPERATION);
        }

        const userService = new UserService();

        try {
            const user = await userService.getUserById(userId);
            if (!user.success) {
                return answerAPI(req, res, HTTPStatus.BAD_REQUEST, undefined, user.error);
            }

            return answerAPI(req, res, HTTPStatus.OK, user.data);
        } catch (error) {
            await createLog(LogType.ERROR, LogOperation.CREATE, LogCategory.USER, formatError(error), req.user?.id, next);
            return answerAPI(req, res, HTTPStatus.INTERNAL_SERVER_ERROR, undefined, ErrorCode.INTERNAL_SERVER_ERROR);
        }
    }

        /**
     * @summary Searches users by partial email. Restricted to MASTER profile users only.
     * @param req - Express request with email in the query string.
     * @param res - Express response returning matched users.
     * @param next - Express next function for error handling.
     * @returns HTTP 200 with result set or appropriate error. May be empty.
     */

    static async getUsersByEmail(req: Request, res: Response, next: NextFunction) {
        if (req.user?.profile !== Profile.MASTER) {
            return answerAPI(req, res, HTTPStatus.FORBIDDEN, undefined, ErrorCode.UNAUTHORIZED_OPERATION);
        }

        const searchTerm = req.query.email as string;

        if (!searchTerm || searchTerm.length < 3) {
            return answerAPI(req, res, HTTPStatus.BAD_REQUEST, undefined, ErrorCode.SEARCH_TERM_TOO_SHORT);
        }

        const userService = new UserService();

        try {
            const { page, pageSize, limit, offset, sort, order } = parsePagination(req.query);
            const [rows, total] = await Promise.all([
                userService.getUsersByEmail(searchTerm, { limit, offset, sort, order }),
                userService.countUsersByEmail(searchTerm)
            ]);

            if (!rows.success) {
                return answerAPI(req, res, HTTPStatus.BAD_REQUEST, undefined, rows.error);
            }

            if (!total.success) {
                return answerAPI(req, res, HTTPStatus.BAD_REQUEST, undefined, total.error);
            }

            return answerAPI(req, res, HTTPStatus.OK, {
                data: rows.data,
                meta: buildMeta({ page, pageSize, total: total.data })
            });
        } catch (error) {
            await createLog(LogType.ERROR, LogOperation.CREATE, LogCategory.USER, formatError(error), req.user?.id, next);
            return answerAPI(req, res, HTTPStatus.INTERNAL_SERVER_ERROR, undefined, ErrorCode.INTERNAL_SERVER_ERROR);
        }
    }

    /** @summary Updates an existing user by ID using validated input.
     * Enforces ownership before updating and logs the result.
     *
     * @param req - Express request with user ID and updated data.
     * @param res - Express response returning the updated user.
     * @param next - Express next function for error handling.
     * @returns HTTP 200 with updated user or appropriate error.
     */
    static async updateUser(req: Request, res: Response, next: NextFunction) {
        const userId = Number(req.params.id);
        if (isNaN(userId) || userId <= 0) {
            return answerAPI(req, res, HTTPStatus.BAD_REQUEST, undefined, ErrorCode.INVALID_USER_ID);
        }

        if (!canAccessRequestedUser(req.user, userId)) {
            return answerAPI(req, res, HTTPStatus.FORBIDDEN, undefined, ErrorCode.UNAUTHORIZED_OPERATION);
        }

        if (req.user?.id !== userId && hasUserCredentialFields(req.body)) {
            return answerAPI(req, res, HTTPStatus.FORBIDDEN, undefined, ErrorCode.UNAUTHORIZED_OPERATION);
        }

        const forbiddenFieldErrors = getForbiddenFieldErrors(req.body, ['profile', 'active']);
        if (forbiddenFieldErrors.length > 0) {
            return answerAPI(req, res, HTTPStatus.BAD_REQUEST, forbiddenFieldErrors, ErrorCode.VALIDATION_ERROR);
        }

        const userService = new UserService();

        try {
            const existingUser = await userService.findOne(userId);
            if (!existingUser.success) {
                return answerAPI(req, res, HTTPStatus.BAD_REQUEST, undefined, existingUser.error);
            }

            const parseResult = validateUpdateUser(req.body, req.language as Locale);

            if (!parseResult.success) {
                return answerAPI(req, res, HTTPStatus.BAD_REQUEST, parseResult.errors, ErrorCode.VALIDATION_ERROR);
            }

            const updatedUser = await userService.updateUser(userId, parseResult.data);
            if (!updatedUser.success) {
                const status = updatedUser.error === ErrorCode.INVALID_CREDENTIALS
                    ? HTTPStatus.UNAUTHORIZED
                    : resolveEmailDeliveryStatus(updatedUser.error);
                return answerAPI(req, res, status, undefined, updatedUser.error);
            }

            const delta = buildLogDelta(existingUser.data, updatedUser.data, ['password']);
            await createLog(LogType.SUCCESS, LogOperation.UPDATE, LogCategory.USER, delta, updatedUser.data!.id);
            return answerAPI(req, res, HTTPStatus.OK, updatedUser.data!);
        } catch (error) {
            await createLog(LogType.ERROR, LogOperation.UPDATE, LogCategory.USER, formatError(error), req.user?.id, next);
            return answerAPI(req, res, HTTPStatus.INTERNAL_SERVER_ERROR, undefined, ErrorCode.INTERNAL_SERVER_ERROR);
        }
    }

        /**
     * @summary Deletes a user by id after ownership check and records an audit snapshot when available.
     * @param req - Express request with the ID of the user to delete.
     * @param res - Express response confirming deletion.
     * @param next - Express next function for error handling.
     * @returns HTTP 200 with deleted ID or appropriate error.
     */

    static async deleteUser(req: Request, res: Response, next: NextFunction) {
        const userId = Number(req.params.id);

        if (isNaN(userId) || userId <= 0) {
            return answerAPI(req, res, HTTPStatus.BAD_REQUEST, undefined, ErrorCode.INVALID_USER_ID);
        }

        if (!canAccessRequestedUser(req.user, userId)) {
            return answerAPI(req, res, HTTPStatus.FORBIDDEN, undefined, ErrorCode.UNAUTHORIZED_OPERATION);
        }

        const userService = new UserService();

        try {
            const snapshotResult = await userService.getUserById(userId);
            const snapshot = snapshotResult.success ? sanitizeLogDetail(snapshotResult.data) : undefined;
            const result = await userService.deleteUser(userId);

            if (!result.success) {
                return answerAPI(req, res, HTTPStatus.BAD_REQUEST, undefined, result.error);
            }

            await createLog(
                LogType.SUCCESS,
                LogOperation.DELETE,
                LogCategory.USER,
                snapshot ?? result.data,
                userId
            );
            return answerAPI(req, res, HTTPStatus.OK, result.data);
        } catch (error) {
            await createLog(LogType.ERROR, LogOperation.DELETE, LogCategory.USER, formatError(error), req.user?.id, next);
            return answerAPI(req, res, HTTPStatus.INTERNAL_SERVER_ERROR, undefined, ErrorCode.INTERNAL_SERVER_ERROR);
        }
    }

        /**
     * @summary Validates avatar upload constraints and persists the user profile image URL.
     * @param req - Express request containing avatar file.
     * @param res - Express response with uploaded URL.
     * @param next - Express next function for error handling.
     * @returns HTTP 200 with avatar URL or appropriate error.
     */

    static async uploadAvatar(req: Request, res: Response, next: NextFunction) {
        const userId = req.user?.id;
        if (!userId) {
            return answerAPI(req, res, HTTPStatus.UNAUTHORIZED, undefined, ErrorCode.EXPIRED_OR_INVALID_TOKEN);
        }

        const errors: ValidationError[] = [];
        const file = req.file;

        if (!file) {
            errors.push(createValidationError('avatar', ErrorCode.FIELD_REQUIRED, {
                field: 'avatar'
            }));
        } else {
            if (!ALLOWED_IMAGE_MIME_TYPES.has(file.mimetype)) {
                errors.push(createValidationError('avatar', ErrorCode.INVALID_TYPE, {
                    path: 'avatar',
                    expected: UploadValidation.AVATAR_IMAGE_MIME_EXPECTED,
                    received: file.mimetype,
                }));
            }

            if (file.size > UploadValidation.MAX_FILE_SIZE_BYTES) {
                errors.push(createValidationError('avatar', ErrorCode.INVALID_TYPE, {
                    path: 'avatar',
                    expected: UploadValidation.FILE_SIZE_EXPECTED,
                    received: `${(file.size / 1024 / 1024).toFixed(2)}MB`,
                }));
            }
        }

        if (errors.length > 0) {
            return answerAPI(req, res, HTTPStatus.BAD_REQUEST, errors, ErrorCode.VALIDATION_ERROR);
        }

        const userService = new UserService();

        try {
            const result = await userService.uploadAvatar(userId, file as Express.Multer.File);

            if (!result.success) {
                const status = result.error === ErrorCode.INTERNAL_SERVER_ERROR
                    ? HTTPStatus.INTERNAL_SERVER_ERROR
                    : HTTPStatus.BAD_REQUEST;
                return answerAPI(req, res, status, undefined, result.error);
            }

            await createLog(LogType.SUCCESS, LogOperation.UPDATE, LogCategory.USER, { avatarUrl: result.data.url }, userId);
            return answerAPI(req, res, HTTPStatus.OK, result.data);
        } catch (error) {
            await createLog(LogType.ERROR, LogOperation.UPDATE, LogCategory.USER, formatError(error), userId, next);
            return answerAPI(req, res, HTTPStatus.INTERNAL_SERVER_ERROR, undefined, ErrorCode.INTERNAL_SERVER_ERROR);
        }
    }
}

export default UserController;

