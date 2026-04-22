import TransactionController from '../../../src/controller/transactionController';
import { TransactionService } from '../../../src/service/transactionService';
import { AccountService } from '../../../src/service/accountService';
import { CreditCardService } from '../../../src/service/creditCardService';
import { HTTPStatus } from '../../../../shared/enums/http-status.enums';
import { LogCategory, LogOperation, LogType } from '../../../../shared/enums/log.enums';
import { SortOrder } from '../../../../shared/enums/operator.enums';
import { TransactionSource, TransactionType } from '../../../../shared/enums/transaction.enums';
import { Profile } from '../../../../shared/enums/user.enums';
import { ErrorCode as Resource } from '../../../../shared/errors/error-codes';
import * as commons from '../../../src/utils/commons';
import { createMockRequest, createMockResponse, createNext } from '../../helpers/mockExpress';
import { makeAccount, makeTransaction, makeTransactionInput } from '../../helpers/factories';

const authUser = { id: 999 };
const masterUser = { id: 1, profile: Profile.MASTER };
const createAuthRequest = (overrides: Parameters<typeof createMockRequest>[0] = {}) =>
    createMockRequest({ user: authUser, ...overrides });

describe('TransactionController', () => {
    let logSpy: jest.SpyInstance;

    beforeEach(() => {
        jest.clearAllMocks();
        logSpy = jest.spyOn(commons, 'createLog').mockResolvedValue();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('createTransaction', () => {
        it('returns 401 without calling service when the requester is missing', async () => {
            const createSpy = jest.spyOn(TransactionService.prototype, 'createTransaction');
            const req = createMockRequest({ body: makeTransactionInput({ accountId: 1 }) });
            const res = createMockResponse();
            const next = createNext();

            await TransactionController.createTransaction(req, res, next);

            expect(createSpy).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(HTTPStatus.UNAUTHORIZED);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    errorCode: Resource.EXPIRED_OR_INVALID_TOKEN,
                })
            );
        });

        it('returns 400 without calling service when validation fails', async () => {
            const createSpy = jest.spyOn(TransactionService.prototype, 'createTransaction');
            const req = createAuthRequest({ body: { value: '-1' } });
            const res = createMockResponse();
            const next = createNext();

            await TransactionController.createTransaction(req, res, next);

            expect(createSpy).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(HTTPStatus.BAD_REQUEST);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    errorCode: Resource.VALIDATION_ERROR,
                })
            );
            expect(logSpy).not.toHaveBeenCalled();
            expect(next).not.toHaveBeenCalled();
        });

        it('maps service error to HTTP 400', async () => {
            const input = makeTransactionInput({ accountId: 9 });
            const createSpy = jest
                .spyOn(TransactionService.prototype, 'createTransaction')
                .mockResolvedValue({ success: false, error: Resource.ACCOUNT_NOT_FOUND });
            const req = createAuthRequest({ body: input });
            const res = createMockResponse();
            const next = createNext();

            await TransactionController.createTransaction(req, res, next);

            expect(createSpy).toHaveBeenCalledTimes(1);
            expect(createSpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    value: input.value,
                    date: input.date,
                    categoryId: input.categoryId,
                    transactionType: input.transactionType,
                    transactionSource: input.transactionSource,
                    isInstallment: input.isInstallment,
                    isRecurring: input.isRecurring,
                    accountId: input.accountId,
                    creditCardId: input.creditCardId,
                }),
                authUser.id
            );
            expect(res.status).toHaveBeenCalledWith(HTTPStatus.BAD_REQUEST);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    errorCode: Resource.ACCOUNT_NOT_FOUND,
                })
            );
            expect(logSpy).not.toHaveBeenCalled();
            expect(next).not.toHaveBeenCalled();
        });

        it('returns 201 and logs when transaction is created', async () => {
            const input = makeTransactionInput({ accountId: 2 });
            const created = makeTransaction({ id: 10, accountId: input.accountId as number });
            const createSpy = jest.spyOn(TransactionService.prototype, 'createTransaction').mockResolvedValue({ success: true, data: created });
            const req = createAuthRequest({ body: input });
            const res = createMockResponse();
            const next = createNext();

            await TransactionController.createTransaction(req, res, next);

            expect(createSpy).toHaveBeenCalledTimes(1);
            expect(createSpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    value: input.value,
                    date: input.date,
                    categoryId: input.categoryId,
                    transactionType: input.transactionType,
                    transactionSource: input.transactionSource,
                    isInstallment: input.isInstallment,
                    isRecurring: input.isRecurring,
                    accountId: input.accountId,
                    creditCardId: input.creditCardId,
                    active: input.active,
                }),
                authUser.id
            );
            expect(res.status).toHaveBeenCalledWith(HTTPStatus.CREATED);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, data: created }));
            expect(logSpy).toHaveBeenCalledWith(
                LogType.SUCCESS,
                LogOperation.CREATE,
                LogCategory.TRANSACTION,
                created,
                authUser.id
            );
            expect(next).not.toHaveBeenCalled();
        });

        it('returns 500 and logs when service throws', async () => {
            const input = makeTransactionInput({ accountId: 3 });
            jest.spyOn(TransactionService.prototype, 'createTransaction').mockRejectedValue(new Error('boom'));
            const req = createAuthRequest({ body: input });
            const res = createMockResponse();
            const next = createNext();

            await TransactionController.createTransaction(req, res, next);

            expect(res.status).toHaveBeenCalledWith(HTTPStatus.INTERNAL_SERVER_ERROR);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    errorCode: Resource.INTERNAL_SERVER_ERROR,
                })
            );
            expect(logSpy).toHaveBeenCalledWith(
                LogType.ERROR,
                LogOperation.CREATE,
                LogCategory.TRANSACTION,
                expect.any(Object),
                authUser.id,
                next
            );
            expect(next).not.toHaveBeenCalled();
        });

        it('maps unauthorized service errors to HTTP 403', async () => {
            const input = makeTransactionInput({ accountId: 9 });
            jest.spyOn(TransactionService.prototype, 'createTransaction').mockResolvedValue({
                success: false,
                error: Resource.UNAUTHORIZED_OPERATION,
            });
            const req = createAuthRequest({ body: input });
            const res = createMockResponse();
            const next = createNext();

            await TransactionController.createTransaction(req, res, next);

            expect(res.status).toHaveBeenCalledWith(HTTPStatus.FORBIDDEN);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    errorCode: Resource.UNAUTHORIZED_OPERATION,
                })
            );
        });
    });

    describe('getTransactions', () => {
        it('returns 200 with data and pagination when service succeeds', async () => {
            const transactions = [makeTransaction({ id: 1 }), makeTransaction({ id: 2 })];
            jest.spyOn(TransactionService.prototype, 'getTransactions').mockResolvedValue({ success: true, data: transactions });
            jest.spyOn(TransactionService.prototype, 'countTransactions').mockResolvedValue({ success: true, data: transactions.length });
            const req = createMockRequest({ user: masterUser, query: { page: '1', pageSize: '2', sort: 'date', order: 'desc' } });
            const res = createMockResponse();
            const next = createNext();

            await TransactionController.getTransactions(req, res, next);

            expect(TransactionService.prototype.getTransactions).toHaveBeenCalledWith({}, {
                limit: 2,
                offset: 0,
                sort: 'date',
                order: SortOrder.DESC,
            });
            expect(TransactionService.prototype.countTransactions).toHaveBeenCalledTimes(1);
            expect(res.status).toHaveBeenCalledWith(HTTPStatus.OK);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    data: transactions,
                    page: 1,
                    pageSize: 2,
                    pageCount: expect.any(Number),
                    totalItems: transactions.length,
                })
            );
            expect(logSpy).not.toHaveBeenCalled();
        });

        it('returns 400 when listing service fails', async () => {
            const listSpy = jest.spyOn(TransactionService.prototype, 'getTransactions').mockResolvedValue({ success: false, error: Resource.INTERNAL_SERVER_ERROR });
            const countSpy = jest.spyOn(TransactionService.prototype, 'countTransactions').mockResolvedValue({ success: true, data: 0 });
            const req = createMockRequest({ user: masterUser, query: {} });
            const res = createMockResponse();
            const next = createNext();

            await TransactionController.getTransactions(req, res, next);

            expect(listSpy).toHaveBeenCalledTimes(1);
            expect(countSpy).toHaveBeenCalledTimes(1);
            expect(res.status).toHaveBeenCalledWith(HTTPStatus.BAD_REQUEST);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    errorCode: Resource.INTERNAL_SERVER_ERROR,
                })
            );
            expect(logSpy).not.toHaveBeenCalled();
        });

        it('returns 400 when count service fails', async () => {
            const listSpy = jest.spyOn(TransactionService.prototype, 'getTransactions').mockResolvedValue({ success: true, data: [] });
            const countSpy = jest.spyOn(TransactionService.prototype, 'countTransactions').mockResolvedValue({ success: false, error: Resource.INTERNAL_SERVER_ERROR });
            const req = createMockRequest({ user: masterUser, query: {} });
            const res = createMockResponse();
            const next = createNext();

            await TransactionController.getTransactions(req, res, next);

            expect(listSpy).toHaveBeenCalledTimes(1);
            expect(countSpy).toHaveBeenCalledTimes(1);
            expect(res.status).toHaveBeenCalledWith(HTTPStatus.BAD_REQUEST);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    errorCode: Resource.INTERNAL_SERVER_ERROR,
                })
            );
            expect(logSpy).not.toHaveBeenCalled();
        });

        it('returns 500 and logs when service throws', async () => {
            jest.spyOn(TransactionService.prototype, 'getTransactions').mockRejectedValue(new Error('boom'));
            jest.spyOn(TransactionService.prototype, 'countTransactions').mockResolvedValue({ success: true, data: 0 });
            const req = createMockRequest({ user: masterUser, query: {} });
            const res = createMockResponse();
            const next = createNext();

            await TransactionController.getTransactions(req, res, next);

            expect(res.status).toHaveBeenCalledWith(HTTPStatus.INTERNAL_SERVER_ERROR);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    errorCode: Resource.INTERNAL_SERVER_ERROR,
                })
            );
            expect(logSpy).toHaveBeenCalledWith(
                LogType.ERROR,
                LogOperation.CREATE,
                LogCategory.TRANSACTION,
                expect.any(Object),
                masterUser.id,
                next
            );
            expect(next).not.toHaveBeenCalled();
        });
    });

    describe('getTransactionById', () => {
        it('returns 400 when id is invalid', async () => {
            const getSpy = jest.spyOn(TransactionService.prototype, 'getTransactionById');
            const req = createMockRequest({ params: { id: 'abc' } });
            const res = createMockResponse();
            const next = createNext();

            await TransactionController.getTransactionById(req, res, next);

            expect(getSpy).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(HTTPStatus.BAD_REQUEST);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    errorCode: Resource.INVALID_TRANSACTION_ID,
                })
            );
            expect(logSpy).not.toHaveBeenCalled();
        });

        it('returns 400 when service reports not found', async () => {
            jest.spyOn(TransactionService.prototype, 'getTransactionById').mockResolvedValue({ success: false, error: Resource.NO_RECORDS_FOUND });
            const req = createMockRequest({ params: { id: '5' } });
            const res = createMockResponse();
            const next = createNext();

            await TransactionController.getTransactionById(req, res, next);

            expect(res.status).toHaveBeenCalledWith(HTTPStatus.BAD_REQUEST);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    errorCode: Resource.NO_RECORDS_FOUND,
                })
            );
            expect(logSpy).not.toHaveBeenCalled();
        });

        it('returns 200 when transaction is found', async () => {
            const transaction = makeTransaction({ id: 6, accountId: 6, transactionSource: TransactionSource.ACCOUNT });
            jest.spyOn(TransactionService.prototype, 'getTransactionById').mockResolvedValue({ success: true, data: transaction });
            jest.spyOn(AccountService.prototype, 'getAccountById').mockResolvedValue({
                success: true,
                data: makeAccount({ id: 6, userId: 6 }),
            });
            const req = createMockRequest({ user: { id: 6 }, params: { id: '6' } });
            const res = createMockResponse();
            const next = createNext();

            await TransactionController.getTransactionById(req, res, next);

            expect(TransactionService.prototype.getTransactionById).toHaveBeenCalledWith(6);
            expect(res.status).toHaveBeenCalledWith(HTTPStatus.OK);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, data: transaction }));
            expect(logSpy).not.toHaveBeenCalled();
        });

        it('returns 500 and logs when service throws', async () => {
            jest.spyOn(TransactionService.prototype, 'getTransactionById').mockRejectedValue(new Error('boom'));
            const req = createAuthRequest({ params: { id: '7' } });
            const res = createMockResponse();
            const next = createNext();

            await TransactionController.getTransactionById(req, res, next);

            expect(res.status).toHaveBeenCalledWith(HTTPStatus.INTERNAL_SERVER_ERROR);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    errorCode: Resource.INTERNAL_SERVER_ERROR,
                })
            );
            expect(logSpy).toHaveBeenCalledWith(
                LogType.ERROR,
                LogOperation.CREATE,
                LogCategory.TRANSACTION,
                expect.any(Object),
                authUser.id,
                next
            );
            expect(next).not.toHaveBeenCalled();
        });
    });

    describe('getTransactionsByAccount', () => {
        it('returns 400 when accountId is invalid', async () => {
            const listSpy = jest.spyOn(TransactionService.prototype, 'getTransactionsByAccount');
            const req = createMockRequest({ params: { accountId: 'abc' } });
            const res = createMockResponse();
            const next = createNext();

            await TransactionController.getTransactionsByAccount(req, res, next);

            expect(listSpy).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(HTTPStatus.BAD_REQUEST);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    errorCode: Resource.INVALID_ACCOUNT_ID,
                })
            );
            expect(logSpy).not.toHaveBeenCalled();
        });

        it('returns 200 with data and pagination when service succeeds', async () => {
            const transactions = [makeTransaction({ id: 1, accountId: 3 })];
            jest.spyOn(AccountService.prototype, 'getAccountById').mockResolvedValue({
                success: true,
                data: makeAccount({ id: 3, userId: 3 }),
            });
            jest.spyOn(TransactionService.prototype, 'getTransactionsByAccount').mockResolvedValue({ success: true, data: transactions });
            jest.spyOn(TransactionService.prototype, 'countTransactionsByAccount').mockResolvedValue({ success: true, data: transactions.length });
            const req = createMockRequest({ user: { id: 3 }, params: { accountId: '3' }, query: { page: '2', pageSize: '5', sort: 'date', order: 'desc' } });
            const res = createMockResponse();
            const next = createNext();

            await TransactionController.getTransactionsByAccount(req, res, next);

            expect(TransactionService.prototype.getTransactionsByAccount).toHaveBeenCalledWith(3, {
                limit: 5,
                offset: 5,
                sort: 'date',
                order: SortOrder.DESC,
            });
            expect(TransactionService.prototype.countTransactionsByAccount).toHaveBeenCalledWith(3);
            expect(res.status).toHaveBeenCalledWith(HTTPStatus.OK);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    data: transactions,
                    page: 2,
                    pageSize: 5,
                    totalItems: transactions.length,
                    pageCount: expect.any(Number),
                })
            );
            expect(logSpy).not.toHaveBeenCalled();
        });

        it('returns 400 when list service fails', async () => {
            jest.spyOn(AccountService.prototype, 'getAccountById').mockResolvedValue({
                success: true,
                data: makeAccount({ id: 2, userId: 2 }),
            });
            const listSpy = jest.spyOn(TransactionService.prototype, 'getTransactionsByAccount').mockResolvedValue({ success: false, error: Resource.INTERNAL_SERVER_ERROR });
            const countSpy = jest.spyOn(TransactionService.prototype, 'countTransactionsByAccount').mockResolvedValue({ success: true, data: 0 });
            const req = createMockRequest({ user: { id: 2 }, params: { accountId: '2' }, query: {} });
            const res = createMockResponse();
            const next = createNext();

            await TransactionController.getTransactionsByAccount(req, res, next);

            expect(listSpy).toHaveBeenCalledTimes(1);
            expect(countSpy).toHaveBeenCalledTimes(1);
            expect(res.status).toHaveBeenCalledWith(HTTPStatus.BAD_REQUEST);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    errorCode: Resource.INTERNAL_SERVER_ERROR,
                })
            );
            expect(logSpy).not.toHaveBeenCalled();
        });

        it('returns 400 when count service fails', async () => {
            jest.spyOn(AccountService.prototype, 'getAccountById').mockResolvedValue({
                success: true,
                data: makeAccount({ id: 2, userId: 2 }),
            });
            const listSpy = jest.spyOn(TransactionService.prototype, 'getTransactionsByAccount').mockResolvedValue({ success: true, data: [] });
            const countSpy = jest.spyOn(TransactionService.prototype, 'countTransactionsByAccount').mockResolvedValue({ success: false, error: Resource.INTERNAL_SERVER_ERROR });
            const req = createMockRequest({ user: { id: 2 }, params: { accountId: '2' }, query: {} });
            const res = createMockResponse();
            const next = createNext();

            await TransactionController.getTransactionsByAccount(req, res, next);

            expect(listSpy).toHaveBeenCalledTimes(1);
            expect(countSpy).toHaveBeenCalledTimes(1);
            expect(res.status).toHaveBeenCalledWith(HTTPStatus.BAD_REQUEST);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    errorCode: Resource.INTERNAL_SERVER_ERROR,
                })
            );
            expect(logSpy).not.toHaveBeenCalled();
        });

        it('returns 500 and logs when service throws', async () => {
            jest.spyOn(AccountService.prototype, 'getAccountById').mockResolvedValue({
                success: true,
                data: makeAccount({ id: 4, userId: 4 }),
            });
            jest.spyOn(TransactionService.prototype, 'getTransactionsByAccount').mockRejectedValue(new Error('boom'));
            jest.spyOn(TransactionService.prototype, 'countTransactionsByAccount').mockResolvedValue({ success: true, data: 0 });
            const req = createMockRequest({ user: { id: 4 }, params: { accountId: '4' }, query: {} });
            const res = createMockResponse();
            const next = createNext();

            await TransactionController.getTransactionsByAccount(req, res, next);

            expect(res.status).toHaveBeenCalledWith(HTTPStatus.INTERNAL_SERVER_ERROR);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    errorCode: Resource.INTERNAL_SERVER_ERROR,
                })
            );
            expect(logSpy).toHaveBeenCalledWith(
                LogType.ERROR,
                LogOperation.CREATE,
                LogCategory.TRANSACTION,
                expect.any(Object),
                4,
                next
            );
            expect(next).not.toHaveBeenCalled();
        });
    });

    describe('getTransactionsByUser', () => {
        it('returns 400 when userId is invalid', async () => {
            const listSpy = jest.spyOn(TransactionService.prototype, 'getTransactionsByUser');
            const req = createMockRequest({ params: { userId: 'abc' } });
            const res = createMockResponse();
            const next = createNext();

            await TransactionController.getTransactionsByUser(req, res, next);

            expect(listSpy).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(HTTPStatus.BAD_REQUEST);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    errorCode: Resource.INVALID_USER_ID,
                })
            );
            expect(logSpy).not.toHaveBeenCalled();
        });

        it('returns 200 with data and pagination when service succeeds', async () => {
            const transactions = [{ accountId: 3, transactions: [makeTransaction({ id: 2, accountId: 3 })] }];
            jest.spyOn(TransactionService.prototype, 'getTransactionsByUser').mockResolvedValue({ success: true, data: transactions });
            jest.spyOn(TransactionService.prototype, 'countTransactionsByUser').mockResolvedValue({ success: true, data: 1 });
            const req = createMockRequest({ user: { id: 3 }, params: { userId: '3' }, query: { page: '1', pageSize: '2' } });
            const res = createMockResponse();
            const next = createNext();

            await TransactionController.getTransactionsByUser(req, res, next);

            expect(TransactionService.prototype.getTransactionsByUser).toHaveBeenCalledWith(3, {
                limit: 2,
                offset: 0,
                sort: undefined,
                order: SortOrder.ASC,
            });
            expect(TransactionService.prototype.countTransactionsByUser).toHaveBeenCalledWith(3);
            expect(res.status).toHaveBeenCalledWith(HTTPStatus.OK);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    data: transactions,
                    page: 1,
                    pageSize: 2,
                    totalItems: 1,
                })
            );
            expect(logSpy).not.toHaveBeenCalled();
        });

        it('returns 400 when list service fails', async () => {
            const listSpy = jest.spyOn(TransactionService.prototype, 'getTransactionsByUser').mockResolvedValue({ success: false, error: Resource.ACCOUNT_NOT_FOUND });
            const countSpy = jest.spyOn(TransactionService.prototype, 'countTransactionsByUser').mockResolvedValue({ success: true, data: 0 });
            const req = createMockRequest({ user: { id: 3 }, params: { userId: '3' }, query: {} });
            const res = createMockResponse();
            const next = createNext();

            await TransactionController.getTransactionsByUser(req, res, next);

            expect(listSpy).toHaveBeenCalledTimes(1);
            expect(countSpy).toHaveBeenCalledTimes(1);
            expect(res.status).toHaveBeenCalledWith(HTTPStatus.BAD_REQUEST);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    errorCode: Resource.ACCOUNT_NOT_FOUND,
                })
            );
            expect(logSpy).not.toHaveBeenCalled();
        });

        it('returns 400 when count service fails', async () => {
            const listSpy = jest.spyOn(TransactionService.prototype, 'getTransactionsByUser').mockResolvedValue({ success: true, data: [] });
            const countSpy = jest.spyOn(TransactionService.prototype, 'countTransactionsByUser').mockResolvedValue({ success: false, error: Resource.INTERNAL_SERVER_ERROR });
            const req = createMockRequest({ user: { id: 3 }, params: { userId: '3' }, query: {} });
            const res = createMockResponse();
            const next = createNext();

            await TransactionController.getTransactionsByUser(req, res, next);

            expect(listSpy).toHaveBeenCalledTimes(1);
            expect(countSpy).toHaveBeenCalledTimes(1);
            expect(res.status).toHaveBeenCalledWith(HTTPStatus.BAD_REQUEST);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    errorCode: Resource.INTERNAL_SERVER_ERROR,
                })
            );
            expect(logSpy).not.toHaveBeenCalled();
        });

        it('returns 500 and logs when service throws', async () => {
            jest.spyOn(TransactionService.prototype, 'getTransactionsByUser').mockRejectedValue(new Error('boom'));
            jest.spyOn(TransactionService.prototype, 'countTransactionsByUser').mockResolvedValue({ success: true, data: 0 });
            const req = createMockRequest({ user: { id: 4 }, params: { userId: '4' }, query: {} });
            const res = createMockResponse();
            const next = createNext();

            await TransactionController.getTransactionsByUser(req, res, next);

            expect(res.status).toHaveBeenCalledWith(HTTPStatus.INTERNAL_SERVER_ERROR);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    errorCode: Resource.INTERNAL_SERVER_ERROR,
                })
            );
            expect(logSpy).toHaveBeenCalledWith(
                LogType.ERROR,
                LogOperation.CREATE,
                LogCategory.TRANSACTION,
                expect.any(Object),
                4,
                next
            );
            expect(next).not.toHaveBeenCalled();
        });
    });

    describe('updateTransaction', () => {
        it('returns 400 for invalid id', async () => {
            const getSpy = jest.spyOn(TransactionService.prototype, 'getTransactionById');
            const req = createMockRequest({ params: { id: '0' } });
            const res = createMockResponse();
            const next = createNext();

            await TransactionController.updateTransaction(req, res, next);

            expect(getSpy).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(HTTPStatus.BAD_REQUEST);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({ success: false, errorCode: Resource.INVALID_TRANSACTION_ID })
            );
            expect(logSpy).not.toHaveBeenCalled();
        });

        it('returns 400 when transaction does not exist', async () => {
            jest.spyOn(TransactionService.prototype, 'getTransactionById').mockResolvedValue({ success: false, error: Resource.NO_RECORDS_FOUND });
            const req = createMockRequest({ params: { id: '6' }, body: { value: '50.00' } });
            const res = createMockResponse();
            const next = createNext();

            await TransactionController.updateTransaction(req, res, next);

            expect(res.status).toHaveBeenCalledWith(HTTPStatus.BAD_REQUEST);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({ success: false, errorCode: Resource.NO_RECORDS_FOUND })
            );
            expect(logSpy).not.toHaveBeenCalled();
        });

        it('returns 400 when validation fails', async () => {
            const existing = makeTransaction({ id: 8, accountId: 8, transactionSource: TransactionSource.ACCOUNT });
            jest.spyOn(TransactionService.prototype, 'getTransactionById').mockResolvedValue({ success: true, data: existing });
            jest.spyOn(AccountService.prototype, 'getAccountById').mockResolvedValue({
                success: true,
                data: makeAccount({ id: 8, userId: 8 }),
            });
            const updateSpy = jest.spyOn(TransactionService.prototype, 'updateTransaction');
            const req = createMockRequest({ user: { id: 8 }, params: { id: '8' }, body: { value: '-5.00' } });
            const res = createMockResponse();
            const next = createNext();

            await TransactionController.updateTransaction(req, res, next);

            expect(updateSpy).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(HTTPStatus.BAD_REQUEST);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({ success: false, errorCode: Resource.VALIDATION_ERROR })
            );
            expect(logSpy).not.toHaveBeenCalled();
        });

        it('returns 400 when update service returns error', async () => {
            const existing = makeTransaction({ id: 9 });
            jest.spyOn(TransactionService.prototype, 'getTransactionById').mockResolvedValue({ success: true, data: existing });
            jest.spyOn(AccountService.prototype, 'getAccountById').mockResolvedValue({
                success: true,
                data: makeAccount({ id: existing.accountId ?? 1, userId: authUser.id }),
            });
            jest.spyOn(TransactionService.prototype, 'updateTransaction').mockResolvedValue({ success: false, error: Resource.ACCOUNT_NOT_FOUND });
            const req = createAuthRequest({
                params: { id: '9' },
                body: { value: '50.00', accountId: 99, transactionSource: TransactionSource.ACCOUNT, transactionType: TransactionType.EXPENSE, isInstallment: false, isRecurring: false },
            });
            const res = createMockResponse();
            const next = createNext();

            await TransactionController.updateTransaction(req, res, next);

            expect(res.status).toHaveBeenCalledWith(HTTPStatus.BAD_REQUEST);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({ success: false, errorCode: Resource.ACCOUNT_NOT_FOUND })
            );
            expect(logSpy).not.toHaveBeenCalled();
        });

        it('maps unauthorized update errors to HTTP 403', async () => {
            const existing = makeTransaction({ id: 19 });
            jest.spyOn(TransactionService.prototype, 'getTransactionById').mockResolvedValue({ success: true, data: existing });
            jest.spyOn(AccountService.prototype, 'getAccountById').mockResolvedValue({
                success: true,
                data: makeAccount({ id: existing.accountId ?? 1, userId: authUser.id }),
            });
            jest.spyOn(TransactionService.prototype, 'updateTransaction').mockResolvedValue({
                success: false,
                error: Resource.UNAUTHORIZED_OPERATION,
            });
            const req = createAuthRequest({
                params: { id: '19' },
                body: {
                    value: '50.00',
                    accountId: existing.accountId,
                    transactionSource: TransactionSource.ACCOUNT,
                    transactionType: TransactionType.EXPENSE,
                    isInstallment: false,
                    isRecurring: false,
                },
            });
            const res = createMockResponse();
            const next = createNext();

            await TransactionController.updateTransaction(req, res, next);

            expect(res.status).toHaveBeenCalledWith(HTTPStatus.FORBIDDEN);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({ success: false, errorCode: Resource.UNAUTHORIZED_OPERATION })
            );
            expect(logSpy).not.toHaveBeenCalled();
        });

        it('returns 200 and logs when update succeeds', async () => {
            const existing = makeTransaction({ id: 11, accountId: 3 });
            const updated = makeTransaction({ id: 11, accountId: 3, value: '200.00' });
            const expectedDelta = { value: { from: existing.value, to: updated.value } };
            jest.spyOn(TransactionService.prototype, 'getTransactionById').mockResolvedValue({ success: true, data: existing });
            jest.spyOn(AccountService.prototype, 'getAccountById').mockResolvedValue({
                success: true,
                data: makeAccount({ id: existing.accountId ?? 3, userId: 3 }),
            });
            jest.spyOn(TransactionService.prototype, 'updateTransaction').mockResolvedValue({ success: true, data: updated });
            const req = createMockRequest({
                user: { id: 3 },
                params: { id: '11' },
                body: { value: '200.00', accountId: existing.accountId, transactionSource: TransactionSource.ACCOUNT, transactionType: TransactionType.EXPENSE, isInstallment: false, isRecurring: false },
            });
            const res = createMockResponse();
            const next = createNext();

            await TransactionController.updateTransaction(req, res, next);

            expect(TransactionService.prototype.updateTransaction).toHaveBeenCalledWith(11, expect.objectContaining({
                value: '200.00',
                accountId: existing.accountId,
                transactionSource: TransactionSource.ACCOUNT,
                transactionType: TransactionType.EXPENSE,
                isInstallment: false,
                isRecurring: false,
            }));
            expect(res.status).toHaveBeenCalledWith(HTTPStatus.OK);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, data: updated }));
            expect(logSpy).toHaveBeenCalledWith(
                LogType.SUCCESS,
                LogOperation.UPDATE,
                LogCategory.TRANSACTION,
                expectedDelta,
                3
            );
        });

        it('returns 500 and logs when service throws', async () => {
            const existing = makeTransaction({ id: 12, accountId: 12, transactionSource: TransactionSource.ACCOUNT });
            jest.spyOn(TransactionService.prototype, 'getTransactionById').mockResolvedValue({ success: true, data: existing });
            jest.spyOn(AccountService.prototype, 'getAccountById').mockResolvedValue({
                success: true,
                data: makeAccount({ id: 12, userId: 12 }),
            });
            jest.spyOn(TransactionService.prototype, 'updateTransaction').mockRejectedValue(new Error('boom'));
            const req = createMockRequest({
                user: { id: 12 },
                params: { id: '12' },
                body: { value: '150.00', accountId: existing.accountId, transactionSource: TransactionSource.ACCOUNT, transactionType: TransactionType.EXPENSE, isInstallment: false, isRecurring: false },
            });
            const res = createMockResponse();
            const next = createNext();

            await TransactionController.updateTransaction(req, res, next);

            expect(res.status).toHaveBeenCalledWith(HTTPStatus.INTERNAL_SERVER_ERROR);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    errorCode: Resource.INTERNAL_SERVER_ERROR,
                })
            );
            expect(logSpy).toHaveBeenCalledWith(
                LogType.ERROR,
                LogOperation.UPDATE,
                LogCategory.TRANSACTION,
                expect.any(Object),
                12,
                next
            );
            expect(next).not.toHaveBeenCalled();
        });
    });

    describe('deleteTransaction', () => {
        it('returns 400 for invalid id', async () => {
            const deleteSpy = jest.spyOn(TransactionService.prototype, 'deleteTransaction');
            const req = createMockRequest({ params: { id: 'abc' } });
            const res = createMockResponse();
            const next = createNext();

            await TransactionController.deleteTransaction(req, res, next);

            expect(deleteSpy).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(HTTPStatus.BAD_REQUEST);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({ success: false, errorCode: Resource.INVALID_TRANSACTION_ID })
            );
            expect(logSpy).not.toHaveBeenCalled();
        });

        it('returns 400 when service signals failure', async () => {
            const snapshot = makeTransaction({ id: 20, accountId: 20, transactionSource: TransactionSource.ACCOUNT });
            jest.spyOn(TransactionService.prototype, 'getTransactionById').mockResolvedValue({ success: true, data: snapshot });
            jest.spyOn(AccountService.prototype, 'getAccountById').mockResolvedValue({
                success: true,
                data: makeAccount({ id: 20, userId: 20 }),
            });
            jest.spyOn(TransactionService.prototype, 'deleteTransaction').mockResolvedValue({ success: false, error: Resource.TRANSACTION_NOT_FOUND });
            const req = createMockRequest({ user: { id: 20 }, params: { id: '20' } });
            const res = createMockResponse();
            const next = createNext();

            await TransactionController.deleteTransaction(req, res, next);

            expect(res.status).toHaveBeenCalledWith(HTTPStatus.BAD_REQUEST);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({ success: false, errorCode: Resource.TRANSACTION_NOT_FOUND })
            );
            expect(logSpy).not.toHaveBeenCalled();
        });

        it('returns 200 and logs when deletion succeeds', async () => {
            const snapshot = makeTransaction({ id: 21, accountId: 21, transactionSource: TransactionSource.ACCOUNT });
            const { createdAt, updatedAt, ...expectedSnapshot } = snapshot;
            void createdAt;
            void updatedAt;
            jest.spyOn(TransactionService.prototype, 'getTransactionById').mockResolvedValue({ success: true, data: snapshot });
            jest.spyOn(AccountService.prototype, 'getAccountById').mockResolvedValue({
                success: true,
                data: makeAccount({ id: 21, userId: authUser.id }),
            });
            jest.spyOn(TransactionService.prototype, 'deleteTransaction').mockResolvedValue({ success: true, data: { id: 21 } });
            const req = createAuthRequest({ params: { id: '21' } });
            const res = createMockResponse();
            const next = createNext();

            await TransactionController.deleteTransaction(req, res, next);

            expect(TransactionService.prototype.deleteTransaction).toHaveBeenCalledWith(21);
            expect(res.status).toHaveBeenCalledWith(HTTPStatus.OK);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, data: { id: 21 } }));
            expect(logSpy).toHaveBeenCalledWith(
                LogType.SUCCESS,
                LogOperation.DELETE,
                LogCategory.TRANSACTION,
                expectedSnapshot,
                authUser.id
            );
        });

        it('returns 500 and logs when service throws', async () => {
            const snapshot = makeTransaction({ id: 22, accountId: 22, transactionSource: TransactionSource.ACCOUNT });
            jest.spyOn(TransactionService.prototype, 'getTransactionById').mockResolvedValue({ success: true, data: snapshot });
            jest.spyOn(AccountService.prototype, 'getAccountById').mockResolvedValue({
                success: true,
                data: makeAccount({ id: 22, userId: authUser.id }),
            });
            jest.spyOn(TransactionService.prototype, 'deleteTransaction').mockRejectedValue(new Error('boom'));
            const req = createAuthRequest({ params: { id: '22' } });
            const res = createMockResponse();
            const next = createNext();

            await TransactionController.deleteTransaction(req, res, next);

            expect(res.status).toHaveBeenCalledWith(HTTPStatus.INTERNAL_SERVER_ERROR);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    errorCode: Resource.INTERNAL_SERVER_ERROR,
                })
            );
            expect(logSpy).toHaveBeenCalledWith(
                LogType.ERROR,
                LogOperation.DELETE,
                LogCategory.TRANSACTION,
                expect.any(Object),
                authUser.id,
                next
            );
            expect(next).not.toHaveBeenCalled();
        });
    });
});



// ─── Authorization regression tests ────────────────────────────────────────

describe('TransactionController — authorization enforcement', () => {
    let logSpy: jest.SpyInstance;

    beforeEach(() => {
        jest.clearAllMocks();
        logSpy = jest.spyOn(commons, 'createLog').mockResolvedValue();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('getTransactions — MASTER only', () => {
        it('returns 403 for a non-MASTER authenticated user', async () => {
            const getSpy = jest.spyOn(TransactionService.prototype, 'getTransactions');
            const req = createMockRequest({ user: { id: 1, profile: undefined } });
            const res = createMockResponse();
            const next = createNext();

            await TransactionController.getTransactions(req, res, next);

            expect(getSpy).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(HTTPStatus.FORBIDDEN);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ errorCode: Resource.UNAUTHORIZED_OPERATION }));
        });

        it('allows a MASTER user to list all transactions', async () => {
            jest.spyOn(TransactionService.prototype, 'getTransactions').mockResolvedValue({ success: true, data: [] });
            jest.spyOn(TransactionService.prototype, 'countTransactions').mockResolvedValue({ success: true, data: 0 });
            const req = createMockRequest({ user: { id: 1, profile: Profile.MASTER }, query: {} });
            const res = createMockResponse();
            const next = createNext();

            await TransactionController.getTransactions(req, res, next);

            expect(res.status).toHaveBeenCalledWith(HTTPStatus.OK);
        });
    });

    describe('getTransactionById — ownership enforcement', () => {
        it('returns 403 when the transaction belongs to a different user', async () => {
            const tx = makeTransaction({ id: 10, accountId: 5, transactionSource: TransactionSource.ACCOUNT });
            const account = makeAccount({ id: 5, userId: 10 });
            jest.spyOn(TransactionService.prototype, 'getTransactionById').mockResolvedValue({ success: true, data: tx });
            jest.spyOn(AccountService.prototype, 'getAccountById').mockResolvedValue({ success: true, data: account });
            const req = createMockRequest({ user: { id: 99 }, params: { id: '10' } });
            const res = createMockResponse();
            const next = createNext();

            await TransactionController.getTransactionById(req, res, next);

            expect(res.status).toHaveBeenCalledWith(HTTPStatus.FORBIDDEN);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ errorCode: Resource.UNAUTHORIZED_OPERATION }));
        });

        it('returns 200 when the transaction belongs to the requester', async () => {
            const tx = makeTransaction({ id: 10, accountId: 5, transactionSource: TransactionSource.ACCOUNT });
            const account = makeAccount({ id: 5, userId: 99 });
            jest.spyOn(TransactionService.prototype, 'getTransactionById').mockResolvedValue({ success: true, data: tx });
            jest.spyOn(AccountService.prototype, 'getAccountById').mockResolvedValue({ success: true, data: account });
            const req = createMockRequest({ user: { id: 99 }, params: { id: '10' } });
            const res = createMockResponse();
            const next = createNext();

            await TransactionController.getTransactionById(req, res, next);

            expect(res.status).toHaveBeenCalledWith(HTTPStatus.OK);
        });

        it('allows a MASTER user to read any transaction', async () => {
            const tx = makeTransaction({ id: 10, accountId: 5, transactionSource: TransactionSource.ACCOUNT });
            const account = makeAccount({ id: 5, userId: 10 });
            jest.spyOn(TransactionService.prototype, 'getTransactionById').mockResolvedValue({ success: true, data: tx });
            jest.spyOn(AccountService.prototype, 'getAccountById').mockResolvedValue({ success: true, data: account });
            const req = createMockRequest({ user: { id: 99, profile: Profile.MASTER }, params: { id: '10' } });
            const res = createMockResponse();
            const next = createNext();

            await TransactionController.getTransactionById(req, res, next);

            expect(res.status).toHaveBeenCalledWith(HTTPStatus.OK);
        });
    });

    describe('getTransactionsByAccount — ownership enforcement', () => {
        it('returns 403 when the account belongs to a different user', async () => {
            const account = makeAccount({ id: 5, userId: 10 });
            jest.spyOn(AccountService.prototype, 'getAccountById').mockResolvedValue({ success: true, data: account });
            const getSpy = jest.spyOn(TransactionService.prototype, 'getTransactionsByAccount');
            const req = createMockRequest({ user: { id: 99 }, params: { accountId: '5' } });
            const res = createMockResponse();
            const next = createNext();

            await TransactionController.getTransactionsByAccount(req, res, next);

            expect(getSpy).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(HTTPStatus.FORBIDDEN);
        });

        it('returns 200 when the account belongs to the requester', async () => {
            const account = makeAccount({ id: 5, userId: 99 });
            jest.spyOn(AccountService.prototype, 'getAccountById').mockResolvedValue({ success: true, data: account });
            jest.spyOn(TransactionService.prototype, 'getTransactionsByAccount').mockResolvedValue({ success: true, data: [] });
            jest.spyOn(TransactionService.prototype, 'countTransactionsByAccount').mockResolvedValue({ success: true, data: 0 });
            const req = createMockRequest({ user: { id: 99 }, params: { accountId: '5' }, query: {} });
            const res = createMockResponse();
            const next = createNext();

            await TransactionController.getTransactionsByAccount(req, res, next);

            expect(res.status).toHaveBeenCalledWith(HTTPStatus.OK);
        });
    });

    describe('getTransactionsByUser — ownership enforcement', () => {
        it('returns 403 when requesting another user\'s transactions', async () => {
            const getSpy = jest.spyOn(TransactionService.prototype, 'getTransactionsByUser');
            const req = createMockRequest({ user: { id: 1 }, params: { userId: '2' } });
            const res = createMockResponse();
            const next = createNext();

            await TransactionController.getTransactionsByUser(req, res, next);

            expect(getSpy).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(HTTPStatus.FORBIDDEN);
        });

        it('returns 200 when requesting own transactions', async () => {
            jest.spyOn(TransactionService.prototype, 'getTransactionsByUser').mockResolvedValue({ success: true, data: [] });
            jest.spyOn(TransactionService.prototype, 'countTransactionsByUser').mockResolvedValue({ success: true, data: 0 });
            const req = createMockRequest({ user: { id: 5 }, params: { userId: '5' }, query: {} });
            const res = createMockResponse();
            const next = createNext();

            await TransactionController.getTransactionsByUser(req, res, next);

            expect(res.status).toHaveBeenCalledWith(HTTPStatus.OK);
        });
    });

    describe('updateTransaction — ownership enforcement', () => {
        it('returns 403 when updating a transaction owned by another user', async () => {
            const tx = makeTransaction({ id: 10, accountId: 5, transactionSource: TransactionSource.ACCOUNT });
            const account = makeAccount({ id: 5, userId: 10 });
            jest.spyOn(TransactionService.prototype, 'getTransactionById').mockResolvedValue({ success: true, data: tx });
            jest.spyOn(AccountService.prototype, 'getAccountById').mockResolvedValue({ success: true, data: account });
            const updateSpy = jest.spyOn(TransactionService.prototype, 'updateTransaction');
            const req = createMockRequest({ user: { id: 99 }, params: { id: '10' }, body: { value: '200.00' } });
            const res = createMockResponse();
            const next = createNext();

            await TransactionController.updateTransaction(req, res, next);

            expect(updateSpy).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(HTTPStatus.FORBIDDEN);
        });
    });

    describe('deleteTransaction — ownership enforcement', () => {
        it('returns 403 when deleting a transaction owned by another user', async () => {
            const tx = makeTransaction({ id: 10, accountId: 5, transactionSource: TransactionSource.ACCOUNT });
            const account = makeAccount({ id: 5, userId: 10 });
            jest.spyOn(TransactionService.prototype, 'getTransactionById').mockResolvedValue({ success: true, data: tx });
            jest.spyOn(AccountService.prototype, 'getAccountById').mockResolvedValue({ success: true, data: account });
            const deleteSpy = jest.spyOn(TransactionService.prototype, 'deleteTransaction');
            const req = createMockRequest({ user: { id: 99 }, params: { id: '10' } });
            const res = createMockResponse();
            const next = createNext();

            await TransactionController.deleteTransaction(req, res, next);

            expect(deleteSpy).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(HTTPStatus.FORBIDDEN);
        });
    });
});
