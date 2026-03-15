import { Request, Response, NextFunction } from 'express';
import { AccountService } from '../service/accountService';
import { buildLogDelta, createLog, answerAPI, formatError, sanitizeLogDetail } from '../utils/commons';
import { validateCreateAccount, validateUpdateAccount } from '../utils/validation/validateRequest';
import { HTTPStatus } from '../../../shared/enums/http-status.enums';
import { LogCategory, LogOperation, LogType } from '../../../shared/enums/log.enums';
import { ErrorCode } from '../../../shared/errors/error-codes';
import { parsePagination, buildMeta } from '../utils/pagination';
import { Locale } from '../../../shared/i18n/types/locale';

/** @summary Orchestrates HTTP request flows for account resource endpoints. */
class AccountController {
    /** @summary Creates a new financial account using validated input.
     * Logs the result and returns the created account on success.
     *
     * @param req - Express request containing account data.
     * @param res - Express response returning the created account.
     * @param next - Express next function for error handling.
     * @returns HTTP 201 with new account data or appropriate error.
     */
    static async createAccount(req: Request, res: Response, next: NextFunction) {
        const accountService = new AccountService();

        try {

            const parseResult = validateCreateAccount(req.body, req.language as Locale);

            if (!parseResult.success) {
                return answerAPI(
                    req,
                    res,
                    HTTPStatus.BAD_REQUEST,
                    parseResult.errors,
                    ErrorCode.VALIDATION_ERROR
                );
            }

            const created = await accountService.createAccount(parseResult.data);

            if (!created.success) {
                return answerAPI(req, res, HTTPStatus.BAD_REQUEST, undefined, created.error);
            }

            await createLog(LogType.SUCCESS, LogOperation.CREATE, LogCategory.ACCOUNT, created.data, created.data!.userId);
            return answerAPI(req, res, HTTPStatus.CREATED, created.data!);
        } catch (error) {
            await createLog(LogType.ERROR, LogOperation.CREATE, LogCategory.ACCOUNT, formatError(error), req.user?.id, next);
            return answerAPI(req, res, HTTPStatus.INTERNAL_SERVER_ERROR, undefined, ErrorCode.INTERNAL_SERVER_ERROR);
        }
    }

    /** @summary Retrieves all financial accounts from the database.
     *
     * @param req - Express request object.
     * @param res - Express response returning the account list or an error.
     * @param next - Express next function for error handling.
     * @returns HTTP 200 with account list or appropriate error. May be empty.
     */
    static async getAccounts(req: Request, res: Response, next: NextFunction) {
        const accountService = new AccountService();

        try {
            const { page, pageSize, limit, offset, sort, order } = parsePagination(req.query);
            const [rows, total] = await Promise.all([
                accountService.getAccounts({ limit, offset, sort, order }),
                accountService.countAccounts()
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
            await createLog(LogType.ERROR, LogOperation.CREATE, LogCategory.ACCOUNT, formatError(error), req.user?.id, next);
            return answerAPI(req, res, HTTPStatus.INTERNAL_SERVER_ERROR, undefined, ErrorCode.INTERNAL_SERVER_ERROR);
        }
    }

    /** @summary Retrieves a specific account by its ID.
     * Validates the ID before querying.
     *
     * @param req - Express request containing account ID in the URL.
     * @param res - Express response returning the account or an error.
     * @param next - Express next function for error handling.
     * @returns HTTP 200 with account data or appropriate error.
     */
    static async getAccountById(req: Request, res: Response, next: NextFunction) {
        const id = Number(req.params.id);
        if (isNaN(id) || id <= 0) {
            return answerAPI(req, res, HTTPStatus.BAD_REQUEST, undefined, ErrorCode.INVALID_ACCOUNT_ID);
        }

        const accountService = new AccountService();

        try {
            const account = await accountService.getAccountById(id);

            if (!account.success) {
                return answerAPI(req, res, HTTPStatus.BAD_REQUEST, undefined, account.error);
            }

            return answerAPI(req, res, HTTPStatus.OK, account.data);
        } catch (error) {
            await createLog(LogType.ERROR, LogOperation.CREATE, LogCategory.ACCOUNT, formatError(error), req.user?.id, next);
            return answerAPI(req, res, HTTPStatus.INTERNAL_SERVER_ERROR, undefined, ErrorCode.INTERNAL_SERVER_ERROR);
        }
    }

    /** @summary Retrieves all accounts belonging to a specific user.
     * Validates the user ID before searching.
     *
     * @param req - Express request containing user ID in the URL.
     * @param res - Express response returning the user's accounts.
     * @param next - Express next function for error handling.
     * @returns HTTP 200 with account list or appropriate error. May be empty.
     */
    static async getAccountsByUser(req: Request, res: Response, next: NextFunction) {
        const userId = Number(req.params.userId);
        if (isNaN(userId) || userId <= 0) {
            return answerAPI(req, res, HTTPStatus.BAD_REQUEST, undefined, ErrorCode.INVALID_USER_ID);
        }

        const accountService = new AccountService();

        try {
            const { page, pageSize, limit, offset, sort, order } = parsePagination(req.query);
            const [rows, total] = await Promise.all([
                accountService.getAccountsByUser(userId, { limit, offset, sort, order }),
                accountService.countAccountsByUser(userId)
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
            await createLog(LogType.ERROR, LogOperation.CREATE, LogCategory.ACCOUNT, formatError(error), req.user?.id, next);
            return answerAPI(req, res, HTTPStatus.INTERNAL_SERVER_ERROR, undefined, ErrorCode.INTERNAL_SERVER_ERROR);
        }
    }

    /** @summary Updates an existing account by ID using validated input.
     * Ensures account exists before updating and logs the operation.
     *
     * @param req - Express request with account ID and updated data.
     * @param res - Express response returning the updated account.
     * @param next - Express next function for error handling.
     * @returns HTTP 200 with updated account or appropriate error.
     */
    static async updateAccount(req: Request, res: Response, next: NextFunction) {
        const id = Number(req.params.id);
        if (isNaN(id) || id <= 0) {
            return answerAPI(req, res, HTTPStatus.BAD_REQUEST, undefined, ErrorCode.INVALID_ACCOUNT_ID);
        }

        const accountService = new AccountService();

        try {
            const existing = await accountService.getAccountById(id);
            if (!existing.success) {
                return answerAPI(req, res, HTTPStatus.BAD_REQUEST, undefined, existing.error);
            }

            const parseResult = validateUpdateAccount(req.body, req.language as Locale);

            if (!parseResult.success) {
                return answerAPI(
                    req,
                    res,
                    HTTPStatus.BAD_REQUEST,
                    parseResult.errors,
                    ErrorCode.VALIDATION_ERROR
                );
            }

            const updated = await accountService.updateAccount(id, parseResult.data);
            if (!updated.success) {
                return answerAPI(req, res, HTTPStatus.BAD_REQUEST, undefined, updated.error);
            }

            const delta = buildLogDelta(existing.data, updated.data);
            await createLog(LogType.SUCCESS, LogOperation.UPDATE, LogCategory.ACCOUNT, delta, updated.data!.userId);
            return answerAPI(req, res, HTTPStatus.OK, updated.data!);
        } catch (error) {
            await createLog(LogType.ERROR, LogOperation.UPDATE, LogCategory.ACCOUNT, formatError(error), req.user?.id, next);
            return answerAPI(req, res, HTTPStatus.INTERNAL_SERVER_ERROR, undefined, ErrorCode.INTERNAL_SERVER_ERROR);
        }
    }

    /** @summary Deletes an account by its unique ID.
     * Validates the ID and logs the result upon successful deletion.
     *
     * @param req - Express request with the ID of the account to delete.
     * @param res - Express response confirming deletion.
     * @param next - Express next function for error handling.
     * @returns HTTP 200 with deleted ID or apropriate error.
     */
    static async deleteAccount(req: Request, res: Response, next: NextFunction) {
        const id = Number(req.params.id);

        if (isNaN(id) || id <= 0) {
            return answerAPI(req, res, HTTPStatus.BAD_REQUEST, undefined, ErrorCode.INVALID_ACCOUNT_ID);
        }

        const accountService = new AccountService();

        try {
            const snapshotResult = await accountService.getAccountById(id);
            const snapshot = snapshotResult.success ? sanitizeLogDetail(snapshotResult.data) : undefined;
            const result = await accountService.deleteAccount(id);

            if (!result.success) {
                return answerAPI(req, res, HTTPStatus.BAD_REQUEST, undefined, result.error);
            }

            await createLog(
                LogType.SUCCESS,
                LogOperation.DELETE,
                LogCategory.ACCOUNT,
                snapshot ?? result.data,
                req.user?.id
            );
            return answerAPI(req, res, HTTPStatus.OK, result.data);
        } catch (error) {
            await createLog(LogType.ERROR, LogOperation.DELETE, LogCategory.ACCOUNT, formatError(error), req.user?.id, next);
            return answerAPI(req, res, HTTPStatus.INTERNAL_SERVER_ERROR, undefined, ErrorCode.INTERNAL_SERVER_ERROR);
        }
    }
}

export default AccountController;

