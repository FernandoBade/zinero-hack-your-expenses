import { Request, Response, NextFunction } from 'express';
import { CreditCardService } from '../service/creditCardService';
import { buildLogDelta, createLog, answerAPI, formatError, sanitizeLogDetail } from '../utils/commons';
import { validateCreateCreditCard, validateUpdateCreditCard } from '../utils/validation/validateRequest';
import { HTTPStatus } from '../../../shared/enums/http-status.enums';
import { LogCategory, LogOperation, LogType } from '../../../shared/enums/log.enums';
import { Profile } from '../../../shared/enums/user.enums';
import { ErrorCode } from '../../../shared/errors/error-codes';
import { parsePagination, buildMeta } from '../utils/pagination';
import { Locale } from '../../../shared/i18n/types/locale';
import { getForbiddenFieldErrors } from '../utils/validation/forbiddenFields';
import { canAccessOwnedResource } from '../utils/auth/authorization';

/** @summary Orchestrates HTTP request flows for credit-card resource endpoints. */
class CreditCardController {
    /** @summary Creates a credit card using validated input.
     * The userId is always taken from the authenticated session.
     */
    static async createCreditCard(req: Request, res: Response, next: NextFunction) {
        const requesterId = req.user?.id;
        if (!requesterId) {
            return answerAPI(req, res, HTTPStatus.UNAUTHORIZED, undefined, ErrorCode.EXPIRED_OR_INVALID_TOKEN);
        }

        const creditCardService = new CreditCardService();

        try {
            const forbiddenFieldErrors = getForbiddenFieldErrors(req.body, ['userId']);
            if (forbiddenFieldErrors.length > 0) {
                return answerAPI(req, res, HTTPStatus.BAD_REQUEST, forbiddenFieldErrors, ErrorCode.VALIDATION_ERROR);
            }

            const parseResult = validateCreateCreditCard(
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

            const created = await creditCardService.createCreditCard(parseResult.data);

            if (!created.success) {
                const status = created.error === ErrorCode.UNAUTHORIZED_OPERATION
                    ? HTTPStatus.FORBIDDEN
                    : HTTPStatus.BAD_REQUEST;
                return answerAPI(req, res, status, undefined, created.error);
            }

            await createLog(LogType.SUCCESS, LogOperation.CREATE, LogCategory.CREDIT_CARD, created.data, created.data!.userId);
            return answerAPI(req, res, HTTPStatus.CREATED, created.data!);
        } catch (error) {
            await createLog(LogType.ERROR, LogOperation.CREATE, LogCategory.CREDIT_CARD, formatError(error), requesterId, next);
            return answerAPI(req, res, HTTPStatus.INTERNAL_SERVER_ERROR, undefined, ErrorCode.INTERNAL_SERVER_ERROR);
        }
    }

    /** @summary Retrieves all credit cards with optional pagination. Restricted to MASTER profile users only. */
    static async getCreditCards(req: Request, res: Response, next: NextFunction) {
        if (req.user?.profile !== Profile.MASTER) {
            return answerAPI(req, res, HTTPStatus.FORBIDDEN, undefined, ErrorCode.UNAUTHORIZED_OPERATION);
        }

        const creditCardService = new CreditCardService();

        try {
            const { page, pageSize, limit, offset, sort, order } = parsePagination(req.query);
            const [rows, total] = await Promise.all([
                creditCardService.getCreditCards({ limit, offset, sort, order }),
                creditCardService.countCreditCards()
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
            await createLog(LogType.ERROR, LogOperation.CREATE, LogCategory.CREDIT_CARD, formatError(error), req.user?.id, next);
            return answerAPI(req, res, HTTPStatus.INTERNAL_SERVER_ERROR, undefined, ErrorCode.INTERNAL_SERVER_ERROR);
        }
    }

    /** @summary Retrieves a credit card by its unique identifier. Enforces ownership. */
    static async getCreditCardById(req: Request, res: Response, next: NextFunction) {
        const id = Number(req.params.id);
        if (isNaN(id) || id <= 0) {
            return answerAPI(req, res, HTTPStatus.BAD_REQUEST, undefined, ErrorCode.INVALID_CREDIT_CARD_ID);
        }

        const creditCardService = new CreditCardService();

        try {
            const creditCard = await creditCardService.getCreditCardById(id);

            if (!creditCard.success) {
                return answerAPI(req, res, HTTPStatus.BAD_REQUEST, undefined, creditCard.error);
            }

            if (!canAccessOwnedResource(req.user?.id, creditCard.data.userId, req.user?.profile)) {
                return answerAPI(req, res, HTTPStatus.FORBIDDEN, undefined, ErrorCode.UNAUTHORIZED_OPERATION);
            }

            return answerAPI(req, res, HTTPStatus.OK, creditCard.data);
        } catch (error) {
            await createLog(LogType.ERROR, LogOperation.CREATE, LogCategory.CREDIT_CARD, formatError(error), req.user?.id, next);
            return answerAPI(req, res, HTTPStatus.INTERNAL_SERVER_ERROR, undefined, ErrorCode.INTERNAL_SERVER_ERROR);
        }
    }

    /** @summary Retrieves all credit cards owned by a specific user. Enforces ownership. */
    static async getCreditCardsByUser(req: Request, res: Response, next: NextFunction) {
        const userId = Number(req.params.userId);
        if (isNaN(userId) || userId <= 0) {
            return answerAPI(req, res, HTTPStatus.BAD_REQUEST, undefined, ErrorCode.INVALID_USER_ID);
        }

        if (!canAccessOwnedResource(req.user?.id, userId, req.user?.profile)) {
            return answerAPI(req, res, HTTPStatus.FORBIDDEN, undefined, ErrorCode.UNAUTHORIZED_OPERATION);
        }

        const creditCardService = new CreditCardService();

        try {
            const { page, pageSize, limit, offset, sort, order } = parsePagination(req.query);
            const [rows, total] = await Promise.all([
                creditCardService.getCreditCardsByUser(userId, { limit, offset, sort, order }),
                creditCardService.countCreditCardsByUser(userId)
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
            await createLog(LogType.ERROR, LogOperation.CREATE, LogCategory.CREDIT_CARD, formatError(error), req.user?.id, next);
            return answerAPI(req, res, HTTPStatus.INTERNAL_SERVER_ERROR, undefined, ErrorCode.INTERNAL_SERVER_ERROR);
        }
    }

    /** @summary Updates credit card information using validated input. Enforces ownership. */
    static async updateCreditCard(req: Request, res: Response, next: NextFunction) {
        const id = Number(req.params.id);
        if (isNaN(id) || id <= 0) {
            return answerAPI(req, res, HTTPStatus.BAD_REQUEST, undefined, ErrorCode.INVALID_CREDIT_CARD_ID);
        }

        const creditCardService = new CreditCardService();

        try {
            const existing = await creditCardService.getCreditCardById(id);
            if (!existing.success) {
                return answerAPI(req, res, HTTPStatus.BAD_REQUEST, undefined, existing.error);
            }

            if (!canAccessOwnedResource(req.user?.id, existing.data.userId, req.user?.profile)) {
                return answerAPI(req, res, HTTPStatus.FORBIDDEN, undefined, ErrorCode.UNAUTHORIZED_OPERATION);
            }

            const forbiddenFieldErrors = getForbiddenFieldErrors(req.body, ['userId']);
            if (forbiddenFieldErrors.length > 0) {
                return answerAPI(req, res, HTTPStatus.BAD_REQUEST, forbiddenFieldErrors, ErrorCode.VALIDATION_ERROR);
            }

            const parseResult = validateUpdateCreditCard(req.body, req.language as Locale);

            if (!parseResult.success) {
                return answerAPI(req, res, HTTPStatus.BAD_REQUEST, parseResult.errors, ErrorCode.VALIDATION_ERROR);
            }

            const updated = await creditCardService.updateCreditCard(id, parseResult.data);
            if (!updated.success) {
                const status = updated.error === ErrorCode.UNAUTHORIZED_OPERATION
                    ? HTTPStatus.FORBIDDEN
                    : HTTPStatus.BAD_REQUEST;
                return answerAPI(req, res, status, undefined, updated.error);
            }

            const delta = buildLogDelta(existing.data, updated.data);
            await createLog(LogType.SUCCESS, LogOperation.UPDATE, LogCategory.CREDIT_CARD, delta, updated.data!.userId);
            return answerAPI(req, res, HTTPStatus.OK, updated.data!);
        } catch (error) {
            await createLog(LogType.ERROR, LogOperation.UPDATE, LogCategory.CREDIT_CARD, formatError(error), req.user?.id, next);
            return answerAPI(req, res, HTTPStatus.INTERNAL_SERVER_ERROR, undefined, ErrorCode.INTERNAL_SERVER_ERROR);
        }
    }

    /** @summary Deletes a credit card by ID. Enforces ownership. */
    static async deleteCreditCard(req: Request, res: Response, next: NextFunction) {
        const id = Number(req.params.id);

        if (isNaN(id) || id <= 0) {
            return answerAPI(req, res, HTTPStatus.BAD_REQUEST, undefined, ErrorCode.INVALID_CREDIT_CARD_ID);
        }

        const creditCardService = new CreditCardService();

        try {
            const snapshotResult = await creditCardService.getCreditCardById(id);

            if (!snapshotResult.success) {
                return answerAPI(req, res, HTTPStatus.BAD_REQUEST, undefined, snapshotResult.error);
            }

            if (!canAccessOwnedResource(req.user?.id, snapshotResult.data.userId, req.user?.profile)) {
                return answerAPI(req, res, HTTPStatus.FORBIDDEN, undefined, ErrorCode.UNAUTHORIZED_OPERATION);
            }

            const snapshot = sanitizeLogDetail(snapshotResult.data);
            const result = await creditCardService.deleteCreditCard(id);

            if (!result.success) {
                return answerAPI(req, res, HTTPStatus.BAD_REQUEST, undefined, result.error);
            }

            await createLog(
                LogType.SUCCESS,
                LogOperation.DELETE,
                LogCategory.CREDIT_CARD,
                snapshot ?? result.data,
                req.user?.id
            );
            return answerAPI(req, res, HTTPStatus.OK, result.data);
        } catch (error) {
            await createLog(LogType.ERROR, LogOperation.DELETE, LogCategory.CREDIT_CARD, formatError(error), req.user?.id, next);
            return answerAPI(req, res, HTTPStatus.INTERNAL_SERVER_ERROR, undefined, ErrorCode.INTERNAL_SERVER_ERROR);
        }
    }
}

export default CreditCardController;
