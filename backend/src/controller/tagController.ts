import { Request, Response, NextFunction } from 'express';
import { TagService } from '../service/tagService';
import { buildLogDelta, createLog, answerAPI, formatError, sanitizeLogDetail } from '../utils/commons';
import { validateCreateTag, validateUpdateTag } from '../utils/validation/validateRequest';
import { HTTPStatus } from '../../../shared/enums/http-status.enums';
import { LogCategory, LogOperation, LogType } from '../../../shared/enums/log.enums';
import { Profile } from '../../../shared/enums/user.enums';
import { ErrorCode } from '../../../shared/errors/error-codes';
import { parsePagination, buildMeta } from '../utils/pagination';
import { Locale } from '../../../shared/i18n/types/locale';
import { getForbiddenFieldErrors } from '../utils/validation/forbiddenFields';
import { canAccessOwnedResource } from '../utils/auth/authorization';

/** @summary Orchestrates HTTP request flows for tag resource endpoints. */
class TagController {
    /** @summary Creates a new tag using validated input.
     * The userId is always taken from the authenticated session.
     */
    static async createTag(req: Request, res: Response, next: NextFunction) {
        const requesterId = req.user?.id;
        if (!requesterId) {
            return answerAPI(req, res, HTTPStatus.UNAUTHORIZED, undefined, ErrorCode.EXPIRED_OR_INVALID_TOKEN);
        }

        const tagService = new TagService();

        try {
            const forbiddenFieldErrors = getForbiddenFieldErrors(req.body, ['userId']);
            if (forbiddenFieldErrors.length > 0) {
                return answerAPI(req, res, HTTPStatus.BAD_REQUEST, forbiddenFieldErrors, ErrorCode.VALIDATION_ERROR);
            }

            const parseResult = validateCreateTag(
                { ...req.body, userId: requesterId },
                req.language as Locale
            );

            if (!parseResult.success) {
                return answerAPI(
                    req,
                    res,
                    HTTPStatus.BAD_REQUEST,
                    parseResult.errors,
                    ErrorCode.VALIDATION_ERROR
                );
            }

            const created = await tagService.createTag(parseResult.data);

            if (!created.success) {
                return answerAPI(req, res, HTTPStatus.BAD_REQUEST, undefined, created.error);
            }

            await createLog(LogType.SUCCESS, LogOperation.CREATE, LogCategory.TAG, created.data, created.data!.userId);
            return answerAPI(req, res, HTTPStatus.CREATED, created.data!);
        } catch (error) {
            await createLog(LogType.ERROR, LogOperation.CREATE, LogCategory.TAG, formatError(error), requesterId, next);
            return answerAPI(req, res, HTTPStatus.INTERNAL_SERVER_ERROR, undefined, ErrorCode.INTERNAL_SERVER_ERROR);
        }
    }

    /** @summary Retrieves all tags with optional pagination. Restricted to MASTER profile users only. */
    static async getTags(req: Request, res: Response, next: NextFunction) {
        if (req.user?.profile !== Profile.MASTER) {
            return answerAPI(req, res, HTTPStatus.FORBIDDEN, undefined, ErrorCode.UNAUTHORIZED_OPERATION);
        }

        const tagService = new TagService();

        try {
            const { page, pageSize, limit, offset, sort, order } = parsePagination(req.query);
            const [rows, total] = await Promise.all([
                tagService.getTags({ limit, offset, sort, order }),
                tagService.countTags()
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
            await createLog(LogType.ERROR, LogOperation.CREATE, LogCategory.TAG, formatError(error), req.user?.id, next);
            return answerAPI(req, res, HTTPStatus.INTERNAL_SERVER_ERROR, undefined, ErrorCode.INTERNAL_SERVER_ERROR);
        }
    }

    /** @summary Retrieves a tag by its unique identifier. Enforces ownership. */
    static async getTagById(req: Request, res: Response, next: NextFunction) {
        const id = Number(req.params.id);
        if (isNaN(id) || id <= 0) {
            return answerAPI(req, res, HTTPStatus.BAD_REQUEST, undefined, ErrorCode.INVALID_TAG_ID);
        }

        const tagService = new TagService();

        try {
            const tag = await tagService.getTagById(id);

            if (!tag.success) {
                return answerAPI(req, res, HTTPStatus.BAD_REQUEST, undefined, tag.error);
            }

            if (!canAccessOwnedResource(req.user?.id, tag.data.userId, req.user?.profile)) {
                return answerAPI(req, res, HTTPStatus.FORBIDDEN, undefined, ErrorCode.UNAUTHORIZED_OPERATION);
            }

            return answerAPI(req, res, HTTPStatus.OK, tag.data);
        } catch (error) {
            await createLog(LogType.ERROR, LogOperation.CREATE, LogCategory.TAG, formatError(error), req.user?.id, next);
            return answerAPI(req, res, HTTPStatus.INTERNAL_SERVER_ERROR, undefined, ErrorCode.INTERNAL_SERVER_ERROR);
        }
    }

    /** @summary Retrieves all tags owned by a specific user. Enforces ownership. */
    static async getTagsByUser(req: Request, res: Response, next: NextFunction) {
        const userId = Number(req.params.userId);
        if (isNaN(userId) || userId <= 0) {
            return answerAPI(req, res, HTTPStatus.BAD_REQUEST, undefined, ErrorCode.INVALID_USER_ID);
        }

        if (!canAccessOwnedResource(req.user?.id, userId, req.user?.profile)) {
            return answerAPI(req, res, HTTPStatus.FORBIDDEN, undefined, ErrorCode.UNAUTHORIZED_OPERATION);
        }

        const tagService = new TagService();

        try {
            const { page, pageSize, limit, offset, sort, order } = parsePagination(req.query);
            const [rows, total] = await Promise.all([
                tagService.getTagsByUser(userId, { limit, offset, sort, order }),
                tagService.countTagsByUser(userId)
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
            await createLog(LogType.ERROR, LogOperation.CREATE, LogCategory.TAG, formatError(error), req.user?.id, next);
            return answerAPI(req, res, HTTPStatus.INTERNAL_SERVER_ERROR, undefined, ErrorCode.INTERNAL_SERVER_ERROR);
        }
    }

    /** @summary Updates tag information using validated input. Enforces ownership. */
    static async updateTag(req: Request, res: Response, next: NextFunction) {
        const id = Number(req.params.id);
        if (isNaN(id) || id <= 0) {
            return answerAPI(req, res, HTTPStatus.BAD_REQUEST, undefined, ErrorCode.INVALID_TAG_ID);
        }

        const tagService = new TagService();

        try {
            const existing = await tagService.getTagById(id);
            if (!existing.success) {
                return answerAPI(req, res, HTTPStatus.BAD_REQUEST, undefined, existing.error);
            }

            if (!canAccessOwnedResource(req.user?.id, existing.data.userId, req.user?.profile)) {
                return answerAPI(req, res, HTTPStatus.FORBIDDEN, undefined, ErrorCode.UNAUTHORIZED_OPERATION);
            }

            const parseResult = validateUpdateTag(req.body, req.language as Locale);

            if (!parseResult.success) {
                return answerAPI(req, res, HTTPStatus.BAD_REQUEST, parseResult.errors, ErrorCode.VALIDATION_ERROR);
            }

            const updated = await tagService.updateTag(id, parseResult.data);
            if (!updated.success) {
                return answerAPI(req, res, HTTPStatus.BAD_REQUEST, undefined, updated.error);
            }

            const delta = buildLogDelta(existing.data, updated.data);
            await createLog(LogType.SUCCESS, LogOperation.UPDATE, LogCategory.TAG, delta, updated.data!.userId);
            return answerAPI(req, res, HTTPStatus.OK, updated.data!);
        } catch (error) {
            await createLog(LogType.ERROR, LogOperation.UPDATE, LogCategory.TAG, formatError(error), req.user?.id, next);
            return answerAPI(req, res, HTTPStatus.INTERNAL_SERVER_ERROR, undefined, ErrorCode.INTERNAL_SERVER_ERROR);
        }
    }

    /** @summary Deletes a tag by ID. Enforces ownership. */
    static async deleteTag(req: Request, res: Response, next: NextFunction) {
        const id = Number(req.params.id);

        if (isNaN(id) || id <= 0) {
            return answerAPI(req, res, HTTPStatus.BAD_REQUEST, undefined, ErrorCode.INVALID_TAG_ID);
        }

        const tagService = new TagService();

        try {
            const snapshotResult = await tagService.getTagById(id);

            if (!snapshotResult.success) {
                return answerAPI(req, res, HTTPStatus.BAD_REQUEST, undefined, snapshotResult.error);
            }

            if (!canAccessOwnedResource(req.user?.id, snapshotResult.data.userId, req.user?.profile)) {
                return answerAPI(req, res, HTTPStatus.FORBIDDEN, undefined, ErrorCode.UNAUTHORIZED_OPERATION);
            }

            const snapshot = sanitizeLogDetail(snapshotResult.data);
            const result = await tagService.deleteTag(id);

            if (!result.success) {
                return answerAPI(req, res, HTTPStatus.BAD_REQUEST, undefined, result.error);
            }

            await createLog(
                LogType.SUCCESS,
                LogOperation.DELETE,
                LogCategory.TAG,
                snapshot ?? result.data,
                req.user?.id
            );
            return answerAPI(req, res, HTTPStatus.OK, result.data);
        } catch (error) {
            await createLog(LogType.ERROR, LogOperation.DELETE, LogCategory.TAG, formatError(error), req.user?.id, next);
            return answerAPI(req, res, HTTPStatus.INTERNAL_SERVER_ERROR, undefined, ErrorCode.INTERNAL_SERVER_ERROR);
        }
    }
}

export default TagController;
