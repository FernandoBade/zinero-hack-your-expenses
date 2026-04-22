import { Request, Response, NextFunction } from 'express';
import { CategoryService } from '../service/categoryService';
import { validateCreateCategory, validateUpdateCategory } from '../utils/validation/validateRequest';
import { buildLogDelta, createLog, answerAPI, formatError, sanitizeLogDetail } from '../utils/commons';
import { HTTPStatus } from '../../../shared/enums/http-status.enums';
import { LogCategory, LogOperation, LogType } from '../../../shared/enums/log.enums';
import { Profile } from '../../../shared/enums/user.enums';
import { ErrorCode } from '../../../shared/errors/error-codes';
import { Locale } from '../../../shared/i18n/types/locale';
import { parsePagination, buildMeta } from '../utils/pagination';
import { getForbiddenFieldErrors } from '../utils/validation/forbiddenFields';
import { canAccessOwnedResource } from '../utils/auth/authorization';

/** @summary Orchestrates HTTP request flows for category resource endpoints. */
class CategoryController {
    /** @summary Creates a new category using validated input from the request body.
     * The userId is always taken from the authenticated session.
     * Logs the result and returns the created category on success.
     */
    static async createCategory(req: Request, res: Response, next: NextFunction) {
        const requesterId = req.user?.id;
        if (!requesterId) {
            return answerAPI(req, res, HTTPStatus.UNAUTHORIZED, undefined, ErrorCode.EXPIRED_OR_INVALID_TOKEN);
        }

        const categoryService = new CategoryService();

        try {
            const forbiddenFieldErrors = getForbiddenFieldErrors(req.body, ['userId']);
            if (forbiddenFieldErrors.length > 0) {
                return answerAPI(req, res, HTTPStatus.BAD_REQUEST, forbiddenFieldErrors, ErrorCode.VALIDATION_ERROR);
            }

            const parseResult = validateCreateCategory(
                { ...req.body, userId: requesterId },
                req.language as Locale
            );

            if (!parseResult.success) {
                return answerAPI(req, res, HTTPStatus.BAD_REQUEST, parseResult.errors, ErrorCode.VALIDATION_ERROR);
            }

            const created = await categoryService.createCategory(parseResult.data);

            if (!created.success) {
                return answerAPI(req, res, HTTPStatus.BAD_REQUEST, undefined, created.error);
            }

            await createLog(LogType.SUCCESS, LogOperation.CREATE, LogCategory.CATEGORY, created.data, created.data!.userId);
            return answerAPI(req, res, HTTPStatus.CREATED, created.data!);
        } catch (error) {
            await createLog(LogType.ERROR, LogOperation.CREATE, LogCategory.CATEGORY, formatError(error), requesterId, next);
            return answerAPI(req, res, HTTPStatus.INTERNAL_SERVER_ERROR, undefined, ErrorCode.INTERNAL_SERVER_ERROR);
        }
    }

    /** @summary Retrieves all categories from the database. Restricted to MASTER profile users only. */
    static async getCategories(req: Request, res: Response, next: NextFunction) {
        if (req.user?.profile !== Profile.MASTER) {
            return answerAPI(req, res, HTTPStatus.FORBIDDEN, undefined, ErrorCode.UNAUTHORIZED_OPERATION);
        }

        const categoryService = new CategoryService();

        try {
            const { page, pageSize, limit, offset, sort, order } = parsePagination(req.query);
            const [rows, total] = await Promise.all([
                categoryService.getCategories({ limit, offset, sort, order }),
                categoryService.countCategories()
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
            await createLog(LogType.ERROR, LogOperation.CREATE, LogCategory.CATEGORY, formatError(error), req.user?.id, next);
            return answerAPI(req, res, HTTPStatus.INTERNAL_SERVER_ERROR, undefined, ErrorCode.INTERNAL_SERVER_ERROR);
        }
    }

    /** @summary Retrieves a category by its unique ID. Enforces ownership. */
    static async getCategoryById(req: Request, res: Response, next: NextFunction) {
        const id = Number(req.params.id);
        if (isNaN(id) || id <= 0) {
            return answerAPI(req, res, HTTPStatus.BAD_REQUEST, undefined, ErrorCode.INVALID_CATEGORY_ID);
        }

        const categoryService = new CategoryService();

        try {
            const category = await categoryService.getCategoryById(id);

            if (!category.success) {
                return answerAPI(req, res, HTTPStatus.BAD_REQUEST, undefined, category.error);
            }

            if (!canAccessOwnedResource(req.user?.id, category.data.userId, req.user?.profile)) {
                return answerAPI(req, res, HTTPStatus.FORBIDDEN, undefined, ErrorCode.UNAUTHORIZED_OPERATION);
            }

            return answerAPI(req, res, HTTPStatus.OK, category.data);
        } catch (error) {
            await createLog(LogType.ERROR, LogOperation.CREATE, LogCategory.CATEGORY, formatError(error), req.user?.id, next);
            return answerAPI(req, res, HTTPStatus.INTERNAL_SERVER_ERROR, undefined, ErrorCode.INTERNAL_SERVER_ERROR);
        }
    }

    /** @summary Retrieves all categories for a specific user. Enforces ownership. */
    static async getCategoriesByUser(req: Request, res: Response, next: NextFunction) {
        const userId = Number(req.params.userId);
        if (isNaN(userId) || userId <= 0) {
            return answerAPI(req, res, HTTPStatus.BAD_REQUEST, undefined, ErrorCode.INVALID_USER_ID);
        }

        if (!canAccessOwnedResource(req.user?.id, userId, req.user?.profile)) {
            return answerAPI(req, res, HTTPStatus.FORBIDDEN, undefined, ErrorCode.UNAUTHORIZED_OPERATION);
        }

        const categoryService = new CategoryService();

        try {
            const { page, pageSize, limit, offset, sort, order } = parsePagination(req.query);
            const [rows, total] = await Promise.all([
                categoryService.getCategoriesByUser(userId, { limit, offset, sort, order }),
                categoryService.countCategoriesByUser(userId)
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
            await createLog(LogType.ERROR, LogOperation.CREATE, LogCategory.CATEGORY, formatError(error), req.user?.id, next);
            return answerAPI(req, res, HTTPStatus.INTERNAL_SERVER_ERROR, undefined, ErrorCode.INTERNAL_SERVER_ERROR);
        }
    }

    /** @summary Updates an existing category by ID. Enforces ownership. */
    static async updateCategory(req: Request, res: Response, next: NextFunction) {
        const id = Number(req.params.id);
        if (isNaN(id) || id <= 0) {
            return answerAPI(req, res, HTTPStatus.BAD_REQUEST, undefined, ErrorCode.INVALID_CATEGORY_ID);
        }

        const categoryService = new CategoryService();

        try {
            const existing = await categoryService.getCategoryById(id);
            if (!existing.success) {
                return answerAPI(req, res, HTTPStatus.BAD_REQUEST, undefined, existing.error);
            }

            if (!canAccessOwnedResource(req.user?.id, existing.data.userId, req.user?.profile)) {
                return answerAPI(req, res, HTTPStatus.FORBIDDEN, undefined, ErrorCode.UNAUTHORIZED_OPERATION);
            }

            const parseResult = validateUpdateCategory(req.body, req.language as Locale);
            if (!parseResult.success) {
                return answerAPI(req, res, HTTPStatus.BAD_REQUEST, parseResult.errors, ErrorCode.VALIDATION_ERROR);
            }

            const updated = await categoryService.updateCategory(id, parseResult.data);
            if (!updated.success) {
                return answerAPI(req, res, HTTPStatus.BAD_REQUEST, undefined, updated.error);
            }

            const delta = buildLogDelta(existing.data, updated.data);
            await createLog(LogType.SUCCESS, LogOperation.UPDATE, LogCategory.CATEGORY, delta, updated.data!.userId);
            return answerAPI(req, res, HTTPStatus.OK, updated.data!);
        } catch (error) {
            await createLog(LogType.ERROR, LogOperation.UPDATE, LogCategory.CATEGORY, formatError(error), req.user?.id, next);
            return answerAPI(req, res, HTTPStatus.INTERNAL_SERVER_ERROR, undefined, ErrorCode.INTERNAL_SERVER_ERROR);
        }
    }

    /** @summary Deletes a category by ID. Enforces ownership. */
    static async deleteCategory(req: Request, res: Response, next: NextFunction) {
        const id = Number(req.params.id);
        if (isNaN(id) || id <= 0) {
            return answerAPI(req, res, HTTPStatus.BAD_REQUEST, undefined, ErrorCode.INVALID_CATEGORY_ID);
        }

        const categoryService = new CategoryService();

        try {
            const snapshotResult = await categoryService.getCategoryById(id);

            if (!snapshotResult.success) {
                return answerAPI(req, res, HTTPStatus.BAD_REQUEST, undefined, snapshotResult.error);
            }

            if (!canAccessOwnedResource(req.user?.id, snapshotResult.data.userId, req.user?.profile)) {
                return answerAPI(req, res, HTTPStatus.FORBIDDEN, undefined, ErrorCode.UNAUTHORIZED_OPERATION);
            }

            const snapshot = sanitizeLogDetail(snapshotResult.data);
            const result = await categoryService.deleteCategory(id);

            if (!result.success) {
                return answerAPI(req, res, HTTPStatus.BAD_REQUEST, undefined, result.error);
            }

            await createLog(
                LogType.SUCCESS,
                LogOperation.DELETE,
                LogCategory.CATEGORY,
                snapshot ?? result.data,
                req.user?.id
            );
            return answerAPI(req, res, HTTPStatus.OK, result.data);
        } catch (error) {
            await createLog(LogType.ERROR, LogOperation.DELETE, LogCategory.CATEGORY, formatError(error), req.user?.id, next);
            return answerAPI(req, res, HTTPStatus.INTERNAL_SERVER_ERROR, undefined, ErrorCode.INTERNAL_SERVER_ERROR);
        }
    }
}

export default CategoryController;
