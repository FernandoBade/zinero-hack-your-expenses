// #region Imports
import { Request, Response, NextFunction } from 'express';
import { TransactionService } from '../service/transactionService';
import { validateCreateTransaction, validateUpdateTransaction } from '../utils/validation/validateRequest';
import { buildLogDelta, createLog, answerAPI, formatError, sanitizeLogDetail } from '../utils/commons';
import { HTTPStatus } from '../../../shared/enums/http-status.enums';
import { LogCategory, LogOperation, LogType } from '../../../shared/enums/log.enums';
import { FilterOperator } from '../../../shared/enums/operator.enums';
import { TransactionSource, TransactionType } from '../../../shared/enums/transaction.enums';
import { ErrorCode } from '../../../shared/errors/error-codes';
import { Locale } from '../../../shared/i18n/types/locale';
import { parsePagination, buildMeta } from '../utils/pagination';
// #endregion Imports

/**
 * @summary Parses comma-separated query values into a positive numeric ID list.
 */
const parseIdList = (value: unknown): number[] => {
    if (!value) {
        return [];
    }
    const raw = Array.isArray(value) ? value.join(',') : String(value);
    return raw
        .split(',')
        .map((item) => Number(item.trim()))
        .filter((item) => !Number.isNaN(item) && item > 0);
};

/**
 * @summary Parses date query values and returns null for invalid date inputs.
 */
const parseDateParam = (value: unknown): Date | null => {
    if (!value) {
        return null;
    }
    const date = new Date(String(value));
    if (Number.isNaN(date.getTime())) {
        return null;
    }
    return date;
};

/** @summary Orchestrates HTTP request flows for transaction resource endpoints. */
class TransactionController {
    /** @summary Creates a new transaction using validated input from the request body.
     * Logs the result and returns the created transaction on success.
     *
     * @param req - Express request containing new transaction data.
     * @param res - Express response returning the created transaction.
     * @param next - Express next function for error handling.
     * @returns HTTP 201 with new transaction data or appropriate error.
     */
    static async createTransaction(req: Request, res: Response, next: NextFunction) {
        const transactionService = new TransactionService();

        try {

            const parseResult = validateCreateTransaction(req.body, req.language as Locale);

            if (!parseResult.success) {
                return answerAPI(
                    req,
                    res,
                    HTTPStatus.BAD_REQUEST,
                    parseResult.errors,
                    ErrorCode.VALIDATION_ERROR
                );
            }

            const created = await transactionService.createTransaction(parseResult.data);

            if (!created.success) {
                return answerAPI(req, res, HTTPStatus.BAD_REQUEST, undefined, created.error);
            }

            await createLog(
                LogType.SUCCESS,
                LogOperation.CREATE,
                LogCategory.TRANSACTION,
                created.data,
                req.user?.id
            );
            return answerAPI(req, res, HTTPStatus.CREATED, created.data!);
        } catch (error) {
            await createLog(LogType.ERROR, LogOperation.CREATE, LogCategory.TRANSACTION, formatError(error), req.user?.id, next);
            return answerAPI(req, res, HTTPStatus.INTERNAL_SERVER_ERROR, undefined, ErrorCode.INTERNAL_SERVER_ERROR);
        }
    }

    /** @summary Retrieves all transactions from the database.
     * Validates the ID before querying.
     *
     * @param req - Express request object.
     * @param res - Express response returning the transaction or an error.
     * @param next - Express next function for error handling.
     * @returns HTTP 200 with transaction data or appropriate error. May be empty.
     */
    static async getTransactions(req: Request, res: Response, next: NextFunction) {
        const transactionService = new TransactionService();

        try {
            const { page, pageSize, limit, offset, sort, order } = parsePagination(req.query);
            const accountIds = parseIdList(req.query.accountIds);
            const creditCardIds = parseIdList(req.query.creditCardIds);
            const categoryIds = parseIdList(req.query.categoryIds);
            const subcategoryIds = parseIdList(req.query.subcategoryIds);
            const tagIds = parseIdList(req.query.tagIds);
            const transactionTypeRaw =
                typeof req.query.transactionType === 'string'
                    ? req.query.transactionType
                    : undefined;
            const transactionSourceRaw =
                typeof req.query.transactionSource === 'string'
                    ? req.query.transactionSource
                    : undefined;
            const transactionType = Object.values(TransactionType).includes(transactionTypeRaw as TransactionType)
                ? (transactionTypeRaw as TransactionType)
                : undefined;
            const transactionSource = Object.values(TransactionSource).includes(transactionSourceRaw as TransactionSource)
                ? (transactionSourceRaw as TransactionSource)
                : undefined;
            const startDate = parseDateParam(req.query.startDate);
            const endDate = parseDateParam(req.query.endDate);
            const filters: NonNullable<Parameters<InstanceType<typeof TransactionService>['countTransactions']>[0]> = {
                ...(accountIds.length
                    ? { accountId: { operator: FilterOperator.IN as FilterOperator.IN, value: accountIds } }
                    : {}),
                ...(creditCardIds.length
                    ? { creditCardId: { operator: FilterOperator.IN as FilterOperator.IN, value: creditCardIds } }
                    : {}),
                ...(transactionType
                    ? { transactionType: { operator: FilterOperator.EQ as FilterOperator.EQ, value: transactionType } }
                    : {}),
                ...(transactionSource
                    ? { transactionSource: { operator: FilterOperator.EQ as FilterOperator.EQ, value: transactionSource } }
                    : {}),
                ...(categoryIds.length
                    ? { categoryId: { operator: FilterOperator.IN as FilterOperator.IN, value: categoryIds } }
                    : {}),
                ...(subcategoryIds.length
                    ? { subcategoryId: { operator: FilterOperator.IN as FilterOperator.IN, value: subcategoryIds } }
                    : {}),
                ...(tagIds.length
                    ? { tagIds: { operator: FilterOperator.IN as FilterOperator.IN, value: tagIds } }
                    : {}),
                ...((startDate || endDate)
                    ? { date: { operator: FilterOperator.BETWEEN as FilterOperator.BETWEEN, value: [startDate, endDate] } }
                    : {}),
            };
            const [rows, total] = await Promise.all([
                transactionService.getTransactions(filters, { limit, offset, sort, order }),
                transactionService.countTransactions(filters)
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
            await createLog(LogType.ERROR, LogOperation.CREATE, LogCategory.TRANSACTION, formatError(error), req.user?.id, next);
            return answerAPI(req, res, HTTPStatus.INTERNAL_SERVER_ERROR, undefined, ErrorCode.INTERNAL_SERVER_ERROR);
        }
    }

    /** @summary Retrieves a specific transaction by its ID.
     * Validates the ID before querying.
     *
     * @param req - Express request containing transaction ID in the URL.
     * @param res - Express response returning the transaction or an error.
     * @param next - Express next function for error handling.
     * @returns HTTP 200 with transaction data or appropriate error.
     */
    static async getTransactionById(req: Request, res: Response, next: NextFunction) {
        const id = Number(req.params.id);
        if (isNaN(id) || id <= 0) {
            return answerAPI(req, res, HTTPStatus.BAD_REQUEST, undefined, ErrorCode.INVALID_TRANSACTION_ID);
        }

        const transactionService = new TransactionService();

        try {
            const transaction = await transactionService.getTransactionById(id);

            if (!transaction.success) {
                return answerAPI(req, res, HTTPStatus.BAD_REQUEST, undefined, transaction.error);
            }

            return answerAPI(req, res, HTTPStatus.OK, transaction.data);
        } catch (error) {
            await createLog(LogType.ERROR, LogOperation.CREATE, LogCategory.TRANSACTION, formatError(error), req.user?.id, next);
            return answerAPI(req, res, HTTPStatus.INTERNAL_SERVER_ERROR, undefined, ErrorCode.INTERNAL_SERVER_ERROR);
        }
    }

    /** @summary Retrieves all transactions for a specific account.
     * Validates the account ID before querying.
     *
     * @param req - Express request with account ID in the URL.
     * @param res - Express response returning the list of transactions.
     * @param next - Express next function for error handling.
     * @returns HTTP 200 with transaction list or appropriate error.
     */
    static async getTransactionsByAccount(req: Request, res: Response, next: NextFunction) {
        const accountId = Number(req.params.accountId);
        if (isNaN(accountId) || accountId <= 0) {
            return answerAPI(req, res, HTTPStatus.BAD_REQUEST, undefined, ErrorCode.INVALID_ACCOUNT_ID);
        }

        const transactionService = new TransactionService();

        try {
            const { page, pageSize, limit, offset, sort, order } = parsePagination(req.query);
            const [rows, total] = await Promise.all([
                transactionService.getTransactionsByAccount(accountId, { limit, offset, sort, order }),
                transactionService.countTransactionsByAccount(accountId)
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
            await createLog(LogType.ERROR, LogOperation.CREATE, LogCategory.TRANSACTION, formatError(error), req.user?.id, next);
            return answerAPI(req, res, HTTPStatus.INTERNAL_SERVER_ERROR, undefined, ErrorCode.INTERNAL_SERVER_ERROR);
        }
    }

    /** @summary Retrieves all transactions for a given user, grouped by account.
     * Validates the user ID before processing.
     *
     * @param req - Express request with user ID in the URL.
     * @param res - Express response returning the user's transactions.
     * @param next - Express next function for error handling.
     * @returns HTTP 200 with transaction list or appropriate error.
     */
    static async getTransactionsByUser(req: Request, res: Response, next: NextFunction) {
        const userId = Number(req.params.userId);
        if (isNaN(userId) || userId <= 0) {
            return answerAPI(req, res, HTTPStatus.BAD_REQUEST, undefined, ErrorCode.INVALID_USER_ID);
        }

        const transactionService = new TransactionService();

        try {
            const { page, pageSize, limit, offset, sort, order } = parsePagination(req.query);
            const [rows, total] = await Promise.all([
                transactionService.getTransactionsByUser(userId, { limit, offset, sort, order }),
                transactionService.countTransactionsByUser(userId)
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
            await createLog(LogType.ERROR, LogOperation.CREATE, LogCategory.TRANSACTION, formatError(error), req.user?.id, next);
            return answerAPI(req, res, HTTPStatus.INTERNAL_SERVER_ERROR, undefined, ErrorCode.INTERNAL_SERVER_ERROR);
        }
    }

    /** @summary Updates an existing transaction by ID using validated input.
     * Ensures transaction exists before updating and logs the operation.
     *
     * @param req - Express request with transaction ID and updated data.
     * @param res - Express response returning the updated transaction.
     * @param next - Express next function for error handling.
     * @returns HTTP 200 with updated transaction or appropriate error.
     */
    static async updateTransaction(req: Request, res: Response, next: NextFunction) {
        const id = Number(req.params.id);
        if (isNaN(id) || id <= 0) {
            return answerAPI(req, res, HTTPStatus.BAD_REQUEST, undefined, ErrorCode.INVALID_TRANSACTION_ID);
        }

        const transactionService = new TransactionService();

        try {
            const existing = await transactionService.getTransactionById(id);
            if (!existing.success) {
                return answerAPI(req, res, HTTPStatus.BAD_REQUEST, undefined, existing.error);
            }

            const parseResult = validateUpdateTransaction(req.body, req.language as Locale);

            if (!parseResult.success) {
                return answerAPI(req, res, HTTPStatus.BAD_REQUEST, parseResult.errors, ErrorCode.VALIDATION_ERROR);
            }

            const updated = await transactionService.updateTransaction(id, {
                ...parseResult.data,
            });
            if (!updated.success) {
                return answerAPI(req, res, HTTPStatus.BAD_REQUEST, undefined, updated.error);
            }

            const delta = buildLogDelta(existing.data, updated.data);
            await createLog(LogType.SUCCESS, LogOperation.UPDATE, LogCategory.TRANSACTION, delta, req.user?.id);
            return answerAPI(req, res, HTTPStatus.OK, updated.data!);
        } catch (error) {
            await createLog(LogType.ERROR, LogOperation.UPDATE, LogCategory.TRANSACTION, formatError(error), req.user?.id, next);
            return answerAPI(req, res, HTTPStatus.INTERNAL_SERVER_ERROR, undefined, ErrorCode.INTERNAL_SERVER_ERROR);
        }
    }

    /** @summary Deletes a transaction by its unique ID.
     * Validates the ID and logs the result upon successful deletion.
     *
     * @param req - Express request with the ID of the transaction to delete.
     * @param res - Express response confirming deletion.
     * @param next - Express next function for error handling.
     * @returns HTTP 200 with deleted ID or appropriate error.
     */
    static async deleteTransaction(req: Request, res: Response, next: NextFunction) {
        const id = Number(req.params.id);

        if (isNaN(id) || id <= 0) {
            return answerAPI(req, res, HTTPStatus.BAD_REQUEST, undefined, ErrorCode.INVALID_TRANSACTION_ID);
        }

        const transactionService = new TransactionService();

        try {
            const snapshotResult = await transactionService.getTransactionById(id);
            const snapshot = snapshotResult.success ? sanitizeLogDetail(snapshotResult.data) : undefined;
            const result = await transactionService.deleteTransaction(id);

            if (!result.success) {
                return answerAPI(req, res, HTTPStatus.BAD_REQUEST, undefined, result.error);
            }

            await createLog(
                LogType.SUCCESS,
                LogOperation.DELETE,
                LogCategory.TRANSACTION,
                snapshot ?? result.data,
                req.user?.id
            );
            return answerAPI(req, res, HTTPStatus.OK, result.data);
        } catch (error) {
            await createLog(LogType.ERROR, LogOperation.DELETE, LogCategory.TRANSACTION, formatError(error), req.user?.id, next);
            return answerAPI(req, res, HTTPStatus.INTERNAL_SERVER_ERROR, undefined, ErrorCode.INTERNAL_SERVER_ERROR);
        }
    }
}

export default TransactionController;


