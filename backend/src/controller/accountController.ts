import { Request, Response, NextFunction } from 'express';
import { AccountService } from '../service/accountService';
import { buildLogDelta, createLog, answerAPI, formatError, sanitizeLogDetail } from '../utils/commons';
import { validateCreateAccount, validateUpdateAccount } from '../utils/validation/validateRequest';
import { HTTPStatus } from '../../../shared/enums/http-status.enums';
import { LogCategory, LogOperation, LogType } from '../../../shared/enums/log.enums';
import { Profile } from '../../../shared/enums/user.enums';
import { ErrorCode } from '../../../shared/errors/error-codes';
import { parsePagination, buildMeta } from '../utils/pagination';
import { Locale } from '../../../shared/i18n/types/locale';
import { getForbiddenFieldErrors } from '../utils/validation/forbiddenFields';
import { canAccessOwnedResource } from '../utils/auth/authorization';

/** @summary Orchestrates HTTP request flows for account resource endpoints. */
class AccountController {
    /** @summary Creates a new financial account using validated input.
     * The userId is always taken from the authenticated session — the client-supplied value is ignored.
     * Logs the result and returns the created account on success.
     *
     * @param req - Express request containing account data.
     * @param res - Express response returning the created account.
     * @param next - Express next function for error handling.
     * @returns HTTP 201 with new account data or appropriate error.
     */
    static async createAccount(req: Request, res: Response, next: NextFunction) {
        const requesterId = req.user?.id;
        if (!requesterId) {
            return answerAPI(req, res, HTTPStatus.UNAUTHORIZED, undefined, ErrorCode.EXPIRED_OR_INVALID_TOKEN);
        }

        const accountService = new AccountService();

        try {
            const forbiddenFieldErrors = getForbiddenFieldErrors(req.body, ['userId']);
            if (forbiddenFieldErrors.length > 0) {
                return answerAPI(req, res, HTTPStatus.BAD_REQUEST, forbiddenFieldErrors, ErrorCode.VALIDATION_ERROR);
            }

            const parseResult = validateCreateAccount(
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

            const created = await accountService.createAccount(parseResult.data);

            if (!created.success) {
                return answerAPI(req, res, HTTPStatus.BAD_REQUEST, undefined, created.error);
            }

            await createLog(LogType.SUCCESS, LogOperation.CREATE, LogCategory.ACCOUNT, created.data, created.data!.userId);
            return answerAPI(req, res, HTTPStatus.CREATED, created.data!);
        } catch (error) {
            await createLog(LogType.ERROR, LogOperation.CREATE, LogCategory.ACCOUNT, formatError(error), requesterId, next);
            return answerAPI(req, res, HTTPStatus.INTERNAL_SERVER_ERROR, undefined, ErrorCode.INTERNAL_SERVER_ERROR);
        }
    }

    /** @summary Retrieves all financial accounts from the database.
     * Restricted to MASTER profile users only.
     *
     * @param req - Express request object.
     * @param res - Express response returning the account list or an error.
     * @param next - Express next function for error handling.
     * @returns HTTP 200 with account list or appropriate error. May be empty.
     */
    static async getAccounts(req: Request, res: Response, next: NextFunction) {
        if (req.user?.profile !== Profile.MASTER) {
            return answerAPI(req, res, HTTPStatus.FORBIDDEN, undefined, ErrorCode.UNAUTHORIZED_OPERATION);
        }

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
     * Validates the ID and enforces ownership before returning data.
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

            if (!canAccessOwnedResource(req.user?.id, account.data.userId, req.user?.profile)) {
                return answerAPI(req, res, HTTPStatus.FORBIDDEN, undefined, ErrorCode.UNAUTHORIZED_OPERATION);
            }

            return answerAPI(req, res, HTTPStatus.OK, account.data);
        } catch (error) {
            await createLog(LogType.ERROR, LogOperation.CREATE, LogCategory.ACCOUNT, formatError(error), req.user?.id, next);
            return answerAPI(req, res, HTTPStatus.INTERNAL_SERVER_ERROR, undefined, ErrorCode.INTERNAL_SERVER_ERROR);
        }
    }

    /** @summary Retrieves all accounts belonging to a specific user.
     * Validates the user ID and enforces ownership before searching.
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

        if (!canAccessOwnedResource(req.user?.id, userId, req.user?.profile)) {
            return answerAPI(req, res, HTTPStatus.FORBIDDEN, undefined, ErrorCode.UNAUTHORIZED_OPERATION);
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
     * Enforces ownership before updating and logs the operation.
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

            if (!canAccessOwnedResource(req.user?.id, existing.data.userId, req.user?.profile)) {
                return answerAPI(req, res, HTTPStatus.FORBIDDEN, undefined, ErrorCode.UNAUTHORIZED_OPERATION);
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
     * Enforces ownership before deletion and logs the result.
     *
     * @param req - Express request with the ID of the account to delete.
     * @param res - Express response confirming deletion.
     * @param next - Express next function for error handling.
     * @returns HTTP 200 with deleted ID or appropriate error.
     */
    static async deleteAccount(req: Request, res: Response, next: NextFunction) {
        const id = Number(req.params.id);

        if (isNaN(id) || id <= 0) {
            return answerAPI(req, res, HTTPStatus.BAD_REQUEST, undefined, ErrorCode.INVALID_ACCOUNT_ID);
        }

        const accountService = new AccountService();

        try {
            const snapshotResult = await accountService.getAccountById(id);

            if (!snapshotResult.success) {
                return answerAPI(req, res, HTTPStatus.BAD_REQUEST, undefined, snapshotResult.error);
            }

            if (!canAccessOwnedResource(req.user?.id, snapshotResult.data.userId, req.user?.profile)) {
                return answerAPI(req, res, HTTPStatus.FORBIDDEN, undefined, ErrorCode.UNAUTHORIZED_OPERATION);
            }

            const snapshot = sanitizeLogDetail(snapshotResult.data);
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
