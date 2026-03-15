import { Request, Response, NextFunction } from 'express';
import { CategoryService } from '../service/categoryService';
import { validateCreateCategory, validateUpdateCategory } from '../utils/validation/validateRequest';
import { buildLogDelta, createLog, answerAPI, formatError, sanitizeLogDetail } from '../utils/commons';
import { HTTPStatus } from '../../../shared/enums/http-status.enums';
import { LogCategory, LogOperation, LogType } from '../../../shared/enums/log.enums';
import { ErrorCode } from '../../../shared/errors/error-codes';
import { Locale } from '../../../shared/i18n/types/locale';
import { parsePagination, buildMeta } from '../utils/pagination';

/** @summary Orchestrates HTTP request flows for category resource endpoints. */
class CategoryController {
    /** @summary Creates a new category using validated input from the request body.
     * Logs the result and returns the created category on success.
     *
     * @param req - Express request containing category data.
     * @param res - Express response returning the created category.
     * @param next - Express next function for error handling.
     * @returns HTTP 201 with category data or appropriate error.
     */
    static async createCategory(req: Request, res: Response, next: NextFunction) {
        const categoryService = new CategoryService();

        try {
            const parseResult = validateCreateCategory(req.body, req.language as Locale);

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
            await createLog(LogType.ERROR, LogOperation.CREATE, LogCategory.CATEGORY, formatError(error), req.user?.id, next);
            return answerAPI(req, res, HTTPStatus.INTERNAL_SERVER_ERROR, undefined, ErrorCode.INTERNAL_SERVER_ERROR);
        }
    }

    /** @summary Retrieves all categories from the database.
     *
     * @param req - Express request object.
     * @param res - Express response returning the list of categories.
     * @param next - Express next function for error handling.
     * @returns HTTP 200 with category list or appropriate error.
     */
    static async getCategories(req: Request, res: Response, next: NextFunction) {
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

    /** @summary Retrieves a category by its unique ID.
     *
     * @param req - Express request with category ID in the URL.
     * @param res - Express response returning the category or error.
     * @param next - Express next function for error handling.
     * @returns HTTP 200 with category data or appropriate error.
     */
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

            return answerAPI(req, res, HTTPStatus.OK, category.data);
        } catch (error) {
            await createLog(LogType.ERROR, LogOperation.CREATE, LogCategory.CATEGORY, formatError(error), req.user?.id, next);
            return answerAPI(req, res, HTTPStatus.INTERNAL_SERVER_ERROR, undefined, ErrorCode.INTERNAL_SERVER_ERROR);
        }
    }

    /** @summary Retrieves all categories for a specific user.
     * Validates the user ID before querying.
     *
     * @param req - Express request containing user ID.
     * @param res - Express response with user's categories.
     * @param next - Express next function for error handling.
     * @returns HTTP 200 with categories list or appropriate error. May be empty.
     */
    static async getCategoriesByUser(req: Request, res: Response, next: NextFunction) {
        const userId = Number(req.params.userId);
        if (isNaN(userId) || userId <= 0) {
            return answerAPI(req, res, HTTPStatus.BAD_REQUEST, undefined, ErrorCode.INVALID_USER_ID);
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

    /** @summary Updates an existing category by ID.
     * Validates the input and ensures the category exists.
     *
     * @param req - Express request with category ID and update data.
     * @param res - Express response with updated category or error.
     * @param next - Express next function for error handling.
     * @returns HTTP 200 with updated category or appropriate error.
     */
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

    /** @summary Deletes a category by ID.
     * Validates the ID and logs the result on success.
     *
     * @param req - Express request with the ID of the category to delete.
     * @param res - Express response confirming deletion or error.
     * @param next - Express next function for error handling.
     * @returns HTTP 200 with deleted ID or appropriate error.
     */
    static async deleteCategory(req: Request, res: Response, next: NextFunction) {
        const id = Number(req.params.id);
        if (isNaN(id) || id <= 0) {
            return answerAPI(req, res, HTTPStatus.BAD_REQUEST, undefined, ErrorCode.INVALID_CATEGORY_ID);
        }

        const categoryService = new CategoryService();

        try {
            const snapshotResult = await categoryService.getCategoryById(id);
            const snapshot = snapshotResult.success ? sanitizeLogDetail(snapshotResult.data) : undefined;
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

