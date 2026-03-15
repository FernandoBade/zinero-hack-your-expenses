import TransactionController from '../../../src/controller/transactionController';
import { TransactionService } from '../../../src/service/transactionService';
import { HTTPStatus } from '../../../../shared/enums/http-status.enums';
import { LogCategory, LogOperation, LogType } from '../../../../shared/enums/log.enums';
import { SortOrder } from '../../../../shared/enums/operator.enums';
import { TransactionSource, TransactionType } from '../../../../shared/enums/transaction.enums';
import { ErrorCode as Resource } from '../../../../shared/errors/error-codes';
import * as commons from '../../../src/utils/commons';
import { createMockRequest, createMockResponse, createNext } from '../../helpers/mockExpress';
import { makeTransaction, makeTransactionInput } from '../../helpers/factories';

const authUser = { id: 999 };
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
        it('returns 400 without calling service when validation fails', async () => {
            const createSpy = jest.spyOn(TransactionService.prototype, 'createTransaction');
            const req = createMockRequest({ body: { value: '-1' } });
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
            const req = createMockRequest({ body: input });
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
                })
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
                })
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
    });

    describe('getTransactions', () => {
        it('returns 200 with data and pagination when service succeeds', async () => {
            const transactions = [makeTransaction({ id: 1 }), makeTransaction({ id: 2 })];
            jest.spyOn(TransactionService.prototype, 'getTransactions').mockResolvedValue({ success: true, data: transactions });
            jest.spyOn(TransactionService.prototype, 'countTransactions').mockResolvedValue({ success: true, data: transactions.length });
            const req = createMockRequest({ query: { page: '1', pageSize: '2', sort: 'date', order: 'desc' } });
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
            const req = createMockRequest({ query: {} });
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
            const req = createMockRequest({ query: {} });
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
            const req = createAuthRequest({ query: {} });
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
                authUser.id,
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
            const transaction = makeTransaction({ id: 6 });
            jest.spyOn(TransactionService.prototype, 'getTransactionById').mockResolvedValue({ success: true, data: transaction });
            const req = createMockRequest({ params: { id: '6' } });
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
            jest.spyOn(TransactionService.prototype, 'getTransactionsByAccount').mockResolvedValue({ success: true, data: transactions });
            jest.spyOn(TransactionService.prototype, 'countTransactionsByAccount').mockResolvedValue({ success: true, data: transactions.length });
            const req = createMockRequest({ params: { accountId: '3' }, query: { page: '2', pageSize: '5', sort: 'date', order: 'desc' } });
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
            const listSpy = jest.spyOn(TransactionService.prototype, 'getTransactionsByAccount').mockResolvedValue({ success: false, error: Resource.INTERNAL_SERVER_ERROR });
            const countSpy = jest.spyOn(TransactionService.prototype, 'countTransactionsByAccount').mockResolvedValue({ success: true, data: 0 });
            const req = createMockRequest({ params: { accountId: '2' }, query: {} });
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
            const listSpy = jest.spyOn(TransactionService.prototype, 'getTransactionsByAccount').mockResolvedValue({ success: true, data: [] });
            const countSpy = jest.spyOn(TransactionService.prototype, 'countTransactionsByAccount').mockResolvedValue({ success: false, error: Resource.INTERNAL_SERVER_ERROR });
            const req = createMockRequest({ params: { accountId: '2' }, query: {} });
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
            jest.spyOn(TransactionService.prototype, 'getTransactionsByAccount').mockRejectedValue(new Error('boom'));
            jest.spyOn(TransactionService.prototype, 'countTransactionsByAccount').mockResolvedValue({ success: true, data: 0 });
            const req = createAuthRequest({ params: { accountId: '4' }, query: {} });
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
                authUser.id,
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
            const req = createMockRequest({ params: { userId: '3' }, query: { page: '1', pageSize: '2' } });
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
            const req = createMockRequest({ params: { userId: '3' }, query: {} });
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
            const req = createMockRequest({ params: { userId: '3' }, query: {} });
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
            const req = createAuthRequest({ params: { userId: '4' }, query: {} });
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
                authUser.id,
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
            const existing = makeTransaction({ id: 8 });
            jest.spyOn(TransactionService.prototype, 'getTransactionById').mockResolvedValue({ success: true, data: existing });
            const updateSpy = jest.spyOn(TransactionService.prototype, 'updateTransaction');
            const req = createMockRequest({ params: { id: '8' }, body: { value: '-5.00' } });
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
            jest.spyOn(TransactionService.prototype, 'updateTransaction').mockResolvedValue({ success: false, error: Resource.ACCOUNT_NOT_FOUND });
            const req = createMockRequest({
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

        it('returns 200 and logs when update succeeds', async () => {
            const existing = makeTransaction({ id: 11, accountId: 3 });
            const updated = makeTransaction({ id: 11, accountId: 3, value: '200.00' });
            const expectedDelta = { value: { from: existing.value, to: updated.value } };
            jest.spyOn(TransactionService.prototype, 'getTransactionById').mockResolvedValue({ success: true, data: existing });
            jest.spyOn(TransactionService.prototype, 'updateTransaction').mockResolvedValue({ success: true, data: updated });
            const req = createAuthRequest({
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
                authUser.id
            );
        });

        it('returns 500 and logs when service throws', async () => {
            const existing = makeTransaction({ id: 12 });
            jest.spyOn(TransactionService.prototype, 'getTransactionById').mockResolvedValue({ success: true, data: existing });
            jest.spyOn(TransactionService.prototype, 'updateTransaction').mockRejectedValue(new Error('boom'));
            const req = createAuthRequest({
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
                authUser.id,
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
            jest.spyOn(TransactionService.prototype, 'getTransactionById').mockResolvedValue({ success: true, data: makeTransaction({ id: 20 }) });
            jest.spyOn(TransactionService.prototype, 'deleteTransaction').mockResolvedValue({ success: false, error: Resource.TRANSACTION_NOT_FOUND });
            const req = createMockRequest({ params: { id: '20' } });
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
            const snapshot = makeTransaction({ id: 21 });
            const { createdAt, updatedAt, ...expectedSnapshot } = snapshot;
            void createdAt;
            void updatedAt;
            jest.spyOn(TransactionService.prototype, 'getTransactionById').mockResolvedValue({ success: true, data: snapshot });
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
            jest.spyOn(TransactionService.prototype, 'getTransactionById').mockResolvedValue({ success: true, data: makeTransaction({ id: 22 }) });
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


