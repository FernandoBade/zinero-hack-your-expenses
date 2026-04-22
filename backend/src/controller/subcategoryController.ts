import { Request, Response, NextFunction } from 'express';
import { SubcategoryService } from '../service/subcategoryService';
import { CategoryService } from '../service/categoryService';
import { validateCreateSubcategory, validateUpdateSubcategory } from '../utils/validation/validateRequest';
import { buildLogDelta, createLog, answerAPI, formatError, sanitizeLogDetail } from '../utils/commons';
import { HTTPStatus } from '../../../shared/enums/http-status.enums';
import { LogCategory, LogOperation, LogType } from '../../../shared/enums/log.enums';
import { Profile } from '../../../shared/enums/user.enums';
import { ErrorCode } from '../../../shared/errors/error-codes';
import { Locale } from '../../../shared/i18n/types/locale';
import { parsePagination, buildMeta } from '../utils/pagination';
import { canAccessOwnedResource } from '../utils/auth/authorization';

/** @summary Orchestrates HTTP request flows for subcategory resource endpoints. */
class SubcategoryController {
    /** @summary Creates a new subcategory using validated input from the request body.
     * The userId is always taken from the authenticated session.
     * Validates the category before proceeding and logs the result.
     */
    static async createSubcategory(req: Request, res: Response, next: NextFunction) {
        const requesterId = req.user?.id;
        if (!requesterId) {
            return answerAPI(req, res, HTTPStatus.UNAUTHORIZED, undefined, ErrorCode.EXPIRED_OR_INVALID_TOKEN);
        }

        const subcategoryService = new SubcategoryService();

        try {
            const parseResult = validateCreateSubcategory(req.body, req.language as Locale);

            if (!parseResult.success) {
                return answerAPI(req, res, HTTPStatus.BAD_REQUEST, parseResult.errors, ErrorCode.VALIDATION_ERROR);
            }

            const created = await subcategoryService.createSubcategory(parseResult.data, requesterId);

            if (!created.success) {
                const status = created.error === ErrorCode.UNAUTHORIZED_OPERATION
                    ? HTTPStatus.FORBIDDEN
                    : HTTPStatus.BAD_REQUEST;
                return answerAPI(req, res, status, undefined, created.error);
            }

            await createLog(LogType.SUCCESS, LogOperation.CREATE, LogCategory.CATEGORY, created.data, requesterId);
            return answerAPI(req, res, HTTPStatus.CREATED, created.data!);
        } catch (error) {
            await createLog(LogType.ERROR, LogOperation.CREATE, LogCategory.CATEGORY, formatError(error), requesterId, next);
            return answerAPI(req, res, HTTPStatus.INTERNAL_SERVER_ERROR, undefined, ErrorCode.INTERNAL_SERVER_ERROR);
        }
    }

    /** @summary Retrieves all subcategories from the database. Restricted to MASTER profile users only. */
    static async getSubcategories(req: Request, res: Response, next: NextFunction) {
        if (req.user?.profile !== Profile.MASTER) {
            return answerAPI(req, res, HTTPStatus.FORBIDDEN, undefined, ErrorCode.UNAUTHORIZED_OPERATION);
        }

        const subcategoryService = new SubcategoryService();

        try {
            const { page, pageSize, limit, offset, sort, order } = parsePagination(req.query);
            const [rows, total] = await Promise.all([
                subcategoryService.getSubcategories({ limit, offset, sort, order }),
                subcategoryService.countSubcategories()
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

    /** @summary Retrieves all subcategories for a given category ID.
     * Validates the category ID and enforces ownership via the parent category.
     */
    static async getSubcategoriesByCategory(req: Request, res: Response, next: NextFunction) {
        const categoryId = Number(req.params.categoryId);
        if (isNaN(categoryId) || categoryId <= 0) {
            return answerAPI(req, res, HTTPStatus.BAD_REQUEST, undefined, ErrorCode.INVALID_CATEGORY_ID);
        }

        const categoryService = new CategoryService();
        const category = await categoryService.getCategoryById(categoryId);
        if (!category.success) {
            return answerAPI(req, res, HTTPStatus.BAD_REQUEST, undefined, category.error);
        }

        if (!canAccessOwnedResource(req.user?.id, category.data.userId, req.user?.profile)) {
            return answerAPI(req, res, HTTPStatus.FORBIDDEN, undefined, ErrorCode.UNAUTHORIZED_OPERATION);
        }

        const subcategoryService = new SubcategoryService();

        try {
            const { page, pageSize, limit, offset, sort, order } = parsePagination(req.query);
            const [rows, total] = await Promise.all([
                subcategoryService.getSubcategoriesByCategory(categoryId, { limit, offset, sort, order }),
                subcategoryService.countSubcategoriesByCategory(categoryId)
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

    /** @summary Retrieves a specific subcategory by ID.
     * Enforces ownership via the parent category.
     */
    static async getSubcategoryById(req: Request, res: Response, next: NextFunction) {
        const id = Number(req.params.id);
        if (isNaN(id) || id <= 0) {
            return answerAPI(req, res, HTTPStatus.BAD_REQUEST, undefined, ErrorCode.INVALID_SUBCATEGORY_ID);
        }

        const subcategoryService = new SubcategoryService();

        try {
            const result = await subcategoryService.getSubcategoryById(id);

            if (!result.success) {
                return answerAPI(req, res, HTTPStatus.BAD_REQUEST, undefined, result.error);
            }

            const categoryService = new CategoryService();
            const category = await categoryService.getCategoryById(result.data.categoryId);
            if (!category.success) {
                return answerAPI(req, res, HTTPStatus.BAD_REQUEST, undefined, category.error);
            }

            if (!canAccessOwnedResource(req.user?.id, category.data.userId, req.user?.profile)) {
                return answerAPI(req, res, HTTPStatus.FORBIDDEN, undefined, ErrorCode.UNAUTHORIZED_OPERATION);
            }

            return answerAPI(req, res, HTTPStatus.OK, result.data);
        } catch (error) {
            await createLog(LogType.ERROR, LogOperation.CREATE, LogCategory.CATEGORY, formatError(error), req.user?.id, next);
            return answerAPI(req, res, HTTPStatus.INTERNAL_SERVER_ERROR, undefined, ErrorCode.INTERNAL_SERVER_ERROR);
        }
    }

    /** @summary Retrieves all subcategories associated with a specific user. Enforces ownership. */
    static async getSubcategoriesByUser(req: Request, res: Response, next: NextFunction) {
        const userId = Number(req.params.userId);
        if (isNaN(userId) || userId <= 0) {
            return answerAPI(req, res, HTTPStatus.BAD_REQUEST, undefined, ErrorCode.INVALID_USER_ID);
        }

        if (!canAccessOwnedResource(req.user?.id, userId, req.user?.profile)) {
            return answerAPI(req, res, HTTPStatus.FORBIDDEN, undefined, ErrorCode.UNAUTHORIZED_OPERATION);
        }

        const subcategoryService = new SubcategoryService();

        try {
            const { page, pageSize, limit, offset, sort, order } = parsePagination(req.query);
            const [rows, total] = await Promise.all([
                subcategoryService.getSubcategoriesByUser(userId, { limit, offset, sort, order }),
                subcategoryService.countSubcategoriesByUser(userId)
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

    /** @summary Updates an existing subcategory by ID.
     * Enforces ownership via the parent category and logs the result.
     */
    static async updateSubcategory(req: Request, res: Response, next: NextFunction) {
        const id = Number(req.params.id);
        if (isNaN(id) || id <= 0) {
            return answerAPI(req, res, HTTPStatus.BAD_REQUEST, undefined, ErrorCode.INVALID_SUBCATEGORY_ID);
        }

        const requesterId = req.user?.id;
        if (!requesterId) {
            return answerAPI(req, res, HTTPStatus.UNAUTHORIZED, undefined, ErrorCode.EXPIRED_OR_INVALID_TOKEN);
        }

        const subcategoryService = new SubcategoryService();

        try {
            const existing = await subcategoryService.getSubcategoryById(id);
            if (!existing.success) {
                return answerAPI(req, res, HTTPStatus.BAD_REQUEST, undefined, existing.error);
            }

            const categoryService = new CategoryService();
            const category = await categoryService.getCategoryById(existing.data.categoryId);
            if (!category.success) {
                return answerAPI(req, res, HTTPStatus.BAD_REQUEST, undefined, category.error);
            }

            if (!canAccessOwnedResource(requesterId, category.data.userId, req.user?.profile)) {
                return answerAPI(req, res, HTTPStatus.FORBIDDEN, undefined, ErrorCode.UNAUTHORIZED_OPERATION);
            }

            const parseResult = validateUpdateSubcategory(req.body, req.language as Locale);

            if (!parseResult.success) {
                return answerAPI(req, res, HTTPStatus.BAD_REQUEST, parseResult.errors, ErrorCode.VALIDATION_ERROR);
            }

            const updated = await subcategoryService.updateSubcategory(id, parseResult.data, requesterId);

            if (!updated.success) {
                const status = updated.error === ErrorCode.UNAUTHORIZED_OPERATION
                    ? HTTPStatus.FORBIDDEN
                    : HTTPStatus.BAD_REQUEST;
                return answerAPI(req, res, status, undefined, updated.error);
            }

            const delta = buildLogDelta(existing.data, updated.data);
            await createLog(LogType.SUCCESS, LogOperation.UPDATE, LogCategory.CATEGORY, delta, requesterId);
            return answerAPI(req, res, HTTPStatus.OK, updated.data!);
        } catch (error) {
            await createLog(LogType.ERROR, LogOperation.UPDATE, LogCategory.CATEGORY, formatError(error), requesterId, next);
            return answerAPI(req, res, HTTPStatus.INTERNAL_SERVER_ERROR, undefined, ErrorCode.INTERNAL_SERVER_ERROR);
        }
    }

    /** @summary Deletes a subcategory by its ID.
     * Enforces ownership via the parent category and logs the result.
     */
    static async deleteSubcategory(req: Request, res: Response, next: NextFunction) {
        const id = Number(req.params.id);

        if (isNaN(id) || id <= 0) {
            return answerAPI(req, res, HTTPStatus.BAD_REQUEST, undefined, ErrorCode.INVALID_SUBCATEGORY_ID);
        }

        const subcategoryService = new SubcategoryService();

        try {
            const snapshotResult = await subcategoryService.getSubcategoryById(id);

            if (!snapshotResult.success) {
                return answerAPI(req, res, HTTPStatus.BAD_REQUEST, undefined, snapshotResult.error);
            }

            const categoryService = new CategoryService();
            const category = await categoryService.getCategoryById(snapshotResult.data.categoryId);
            if (!category.success) {
                return answerAPI(req, res, HTTPStatus.BAD_REQUEST, undefined, category.error);
            }

            if (!canAccessOwnedResource(req.user?.id, category.data.userId, req.user?.profile)) {
                return answerAPI(req, res, HTTPStatus.FORBIDDEN, undefined, ErrorCode.UNAUTHORIZED_OPERATION);
            }

            const snapshot = sanitizeLogDetail(snapshotResult.data);
            const result = await subcategoryService.deleteSubcategory(id);

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

export default SubcategoryController;
