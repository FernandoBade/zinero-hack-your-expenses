import AccountController from '../../../src/controller/accountController';
import { AccountService } from '../../../src/service/accountService';
import { HTTPStatus } from '../../../../shared/enums/http-status.enums';
import { LogCategory, LogOperation, LogType } from '../../../../shared/enums/log.enums';
import { SortOrder } from '../../../../shared/enums/operator.enums';
import { ErrorCode as Resource } from '../../../../shared/errors/error-codes';
import * as commons from '../../../src/utils/commons';
import { createMockRequest, createMockResponse, createNext } from '../../helpers/mockExpress';
import { makeAccount, makeAccountInput } from '../../helpers/factories';

const authUser = { id: 999 };
const createAuthRequest = (overrides: Parameters<typeof createMockRequest>[0] = {}) =>
  createMockRequest({ user: authUser, ...overrides });

describe('AccountController', () => {
  let logSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    logSpy = jest.spyOn(commons, 'createLog').mockResolvedValue();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('createAccount', () => {
    it('returns 400 without calling service when validation fails', async () => {
      const createSpy = jest.spyOn(AccountService.prototype, 'createAccount');
      const req = createMockRequest({ body: { name: '', institution: '', type: 'invalid', userId: 0 } });
      const res = createMockResponse();
      const next = createNext();

      await AccountController.createAccount(req, res, next);

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
      const serviceInput = makeAccountInput({ userId: 5 });
      const createSpy = jest
        .spyOn(AccountService.prototype, 'createAccount')
        .mockResolvedValue({ success: false, error: Resource.USER_NOT_FOUND });
      const req = createMockRequest({
        body: {
          name: serviceInput.name,
          institution: serviceInput.institution,
          type: serviceInput.type,
          userId: serviceInput.userId,
          observation: serviceInput.observation,
          active: serviceInput.active,
        },
      });
      const res = createMockResponse();
      const next = createNext();

      await AccountController.createAccount(req, res, next);

      expect(createSpy).toHaveBeenCalledTimes(1);
      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          name: serviceInput.name,
          institution: serviceInput.institution,
          type: serviceInput.type,
          userId: serviceInput.userId,
        })
      );
      expect(res.status).toHaveBeenCalledWith(HTTPStatus.BAD_REQUEST);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          errorCode: Resource.USER_NOT_FOUND,
        })
      );
      expect(logSpy).not.toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    });

    it('returns 201 and logs when account is created', async () => {
      const serviceInput = makeAccountInput({ userId: 2 });
      const created = makeAccount({ id: 10, userId: serviceInput.userId });
      const createSpy = jest.spyOn(AccountService.prototype, 'createAccount').mockResolvedValue({ success: true, data: created });
      const req = createAuthRequest({
        body: {
          name: serviceInput.name,
          institution: serviceInput.institution,
          type: serviceInput.type,
          userId: serviceInput.userId,
          observation: serviceInput.observation,
          active: serviceInput.active,
        },
      });
      const res = createMockResponse();
      const next = createNext();

      await AccountController.createAccount(req, res, next);

      expect(createSpy).toHaveBeenCalledTimes(1);
      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          name: serviceInput.name,
          institution: serviceInput.institution,
          type: serviceInput.type,
          observation: serviceInput.observation,
          userId: serviceInput.userId,
          active: serviceInput.active,
        })
      );
      expect(res.status).toHaveBeenCalledWith(HTTPStatus.CREATED);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: created,
        })
      );
      expect(logSpy).toHaveBeenCalledWith(
        LogType.SUCCESS,
        LogOperation.CREATE,
        LogCategory.ACCOUNT,
        created,
        created.userId
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('returns 500 and logs when service throws', async () => {
      const serviceInput = makeAccountInput({ userId: 3 });
      jest.spyOn(AccountService.prototype, 'createAccount').mockRejectedValue(new Error('boom'));
      const req = createAuthRequest({
        body: {
          name: serviceInput.name,
          institution: serviceInput.institution,
          type: serviceInput.type,
          userId: serviceInput.userId,
          observation: serviceInput.observation,
        },
      });
      const res = createMockResponse();
      const next = createNext();

      await AccountController.createAccount(req, res, next);

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
        LogCategory.ACCOUNT,
        expect.any(Object),
        authUser.id,
        next
      );
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('getAccounts', () => {
    it('returns 200 with data and pagination when service succeeds', async () => {
      const accounts = [makeAccount({ id: 1 }), makeAccount({ id: 2 })];
      jest.spyOn(AccountService.prototype, 'getAccounts').mockResolvedValue({ success: true, data: accounts });
      jest.spyOn(AccountService.prototype, 'countAccounts').mockResolvedValue({ success: true, data: accounts.length });

      const req = createMockRequest({ query: { page: '1', pageSize: '1', sort: 'name', order: 'desc' } });
      const res = createMockResponse();
      const next = createNext();

      await AccountController.getAccounts(req, res, next);

      expect(AccountService.prototype.getAccounts).toHaveBeenCalledTimes(1);
      expect(AccountService.prototype.getAccounts).toHaveBeenCalledWith({
        limit: 1,
        offset: 0,
        sort: 'name',
        order: SortOrder.DESC,
      });
      expect(AccountService.prototype.countAccounts).toHaveBeenCalledTimes(1);
      expect(res.status).toHaveBeenCalledWith(HTTPStatus.OK);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: accounts,
          page: 1,
          pageSize: 1,
          pageCount: expect.any(Number),
          totalItems: accounts.length,
        })
      );
      expect(logSpy).not.toHaveBeenCalled();
    });

    it('returns 400 when list service fails', async () => {
      const getSpy = jest.spyOn(AccountService.prototype, 'getAccounts').mockResolvedValue({ success: false, error: Resource.INTERNAL_SERVER_ERROR });
      const countSpy = jest.spyOn(AccountService.prototype, 'countAccounts').mockResolvedValue({ success: true, data: 0 });
      const req = createMockRequest({ query: {} });
      const res = createMockResponse();
      const next = createNext();

      await AccountController.getAccounts(req, res, next);

      expect(getSpy).toHaveBeenCalledTimes(1);
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
      const getSpy = jest.spyOn(AccountService.prototype, 'getAccounts').mockResolvedValue({ success: true, data: [] });
      const countSpy = jest.spyOn(AccountService.prototype, 'countAccounts').mockResolvedValue({ success: false, error: Resource.INTERNAL_SERVER_ERROR });
      const req = createMockRequest({ query: {} });
      const res = createMockResponse();
      const next = createNext();

      await AccountController.getAccounts(req, res, next);

      expect(getSpy).toHaveBeenCalledTimes(1);
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
      jest.spyOn(AccountService.prototype, 'getAccounts').mockRejectedValue(new Error('boom'));
      jest.spyOn(AccountService.prototype, 'countAccounts').mockResolvedValue({ success: true, data: 0 });
      const req = createAuthRequest({ query: {} });
      const res = createMockResponse();
      const next = createNext();

      await AccountController.getAccounts(req, res, next);

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
        LogCategory.ACCOUNT,
        expect.any(Object),
        authUser.id,
        next
      );
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('getAccountById', () => {
    it('returns 400 when id is invalid', async () => {
      const getSpy = jest.spyOn(AccountService.prototype, 'getAccountById');
      const req = createMockRequest({ params: { id: 'abc' } });
      const res = createMockResponse();
      const next = createNext();

      await AccountController.getAccountById(req, res, next);

      expect(getSpy).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(HTTPStatus.BAD_REQUEST);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          errorCode: Resource.INVALID_ACCOUNT_ID,
        })
      );
      expect(logSpy).not.toHaveBeenCalled();
    });

    it('returns 400 when service reports not found', async () => {
      jest.spyOn(AccountService.prototype, 'getAccountById').mockResolvedValue({ success: false, error: Resource.NO_RECORDS_FOUND });
      const req = createMockRequest({ params: { id: '15' } });
      const res = createMockResponse();
      const next = createNext();

      await AccountController.getAccountById(req, res, next);

      expect(res.status).toHaveBeenCalledWith(HTTPStatus.BAD_REQUEST);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          errorCode: Resource.NO_RECORDS_FOUND,
        })
      );
      expect(logSpy).not.toHaveBeenCalled();
    });

    it('returns 200 when account is found', async () => {
      const account = makeAccount({ id: 4 });
      jest.spyOn(AccountService.prototype, 'getAccountById').mockResolvedValue({ success: true, data: account });
      const req = createMockRequest({ params: { id: '4' } });
      const res = createMockResponse();
      const next = createNext();

      await AccountController.getAccountById(req, res, next);

      expect(AccountService.prototype.getAccountById).toHaveBeenCalledWith(4);
      expect(res.status).toHaveBeenCalledWith(HTTPStatus.OK);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, data: account }));
      expect(logSpy).not.toHaveBeenCalled();
    });

    it('returns 500 and logs when service throws', async () => {
      jest.spyOn(AccountService.prototype, 'getAccountById').mockRejectedValue(new Error('boom'));
      const req = createAuthRequest({ params: { id: '5' } });
      const res = createMockResponse();
      const next = createNext();

      await AccountController.getAccountById(req, res, next);

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
        LogCategory.ACCOUNT,
        expect.any(Object),
        authUser.id,
        next
      );
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('getAccountsByUser', () => {
    it('returns 400 when userId is invalid', async () => {
      const getSpy = jest.spyOn(AccountService.prototype, 'getAccountsByUser');
      const req = createMockRequest({ params: { userId: 'abc' } });
      const res = createMockResponse();
      const next = createNext();

      await AccountController.getAccountsByUser(req, res, next);

      expect(getSpy).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(HTTPStatus.BAD_REQUEST);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          errorCode: Resource.INVALID_USER_ID,
        })
      );
      expect(logSpy).not.toHaveBeenCalled();
    });

    it('returns 200 with data when service succeeds', async () => {
      const accounts = [makeAccount({ id: 7, userId: 3 })];
      jest.spyOn(AccountService.prototype, 'getAccountsByUser').mockResolvedValue({ success: true, data: accounts });
      jest.spyOn(AccountService.prototype, 'countAccountsByUser').mockResolvedValue({ success: true, data: accounts.length });
      const req = createMockRequest({ params: { userId: '3' }, query: { page: '1', pageSize: '2' } });
      const res = createMockResponse();
      const next = createNext();

      await AccountController.getAccountsByUser(req, res, next);

      expect(AccountService.prototype.getAccountsByUser).toHaveBeenCalledWith(3, {
        limit: 2,
        offset: 0,
        sort: undefined,
        order: SortOrder.ASC,
      });
      expect(AccountService.prototype.countAccountsByUser).toHaveBeenCalledWith(3);
      expect(res.status).toHaveBeenCalledWith(HTTPStatus.OK);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: accounts,
          page: 1,
          pageSize: 2,
          totalItems: accounts.length,
        })
      );
      expect(logSpy).not.toHaveBeenCalled();
    });

    it('returns 400 when count service fails', async () => {
      const getSpy = jest.spyOn(AccountService.prototype, 'getAccountsByUser').mockResolvedValue({ success: true, data: [] });
      const countSpy = jest.spyOn(AccountService.prototype, 'countAccountsByUser').mockResolvedValue({ success: false, error: Resource.INTERNAL_SERVER_ERROR });
      const req = createMockRequest({ params: { userId: '2' }, query: {} });
      const res = createMockResponse();
      const next = createNext();

      await AccountController.getAccountsByUser(req, res, next);

      expect(getSpy).toHaveBeenCalledTimes(1);
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
      jest.spyOn(AccountService.prototype, 'getAccountsByUser').mockRejectedValue(new Error('boom'));
      jest.spyOn(AccountService.prototype, 'countAccountsByUser').mockResolvedValue({ success: true, data: 0 });
      const req = createAuthRequest({ params: { userId: '4' }, query: {} });
      const res = createMockResponse();
      const next = createNext();

      await AccountController.getAccountsByUser(req, res, next);

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
        LogCategory.ACCOUNT,
        expect.any(Object),
        authUser.id,
        next
      );
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('updateAccount', () => {
    it('returns 400 for invalid id', async () => {
      const getSpy = jest.spyOn(AccountService.prototype, 'getAccountById');
      const req = createMockRequest({ params: { id: '0' } });
      const res = createMockResponse();
      const next = createNext();

      await AccountController.updateAccount(req, res, next);

      expect(getSpy).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(HTTPStatus.BAD_REQUEST);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, errorCode: Resource.INVALID_ACCOUNT_ID })
      );
      expect(logSpy).not.toHaveBeenCalled();
    });

    it('returns 400 when account does not exist', async () => {
      jest.spyOn(AccountService.prototype, 'getAccountById').mockResolvedValue({ success: false, error: Resource.NO_RECORDS_FOUND });
      const req = createMockRequest({ params: { id: '6' }, body: { name: 'Updated' } });
      const res = createMockResponse();
      const next = createNext();

      await AccountController.updateAccount(req, res, next);

      expect(res.status).toHaveBeenCalledWith(HTTPStatus.BAD_REQUEST);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, errorCode: Resource.NO_RECORDS_FOUND })
      );
      expect(logSpy).not.toHaveBeenCalled();
    });

    it('returns 400 when validation fails', async () => {
      const existing = makeAccount({ id: 8 });
      jest.spyOn(AccountService.prototype, 'getAccountById').mockResolvedValue({ success: true, data: existing });
      const updateSpy = jest.spyOn(AccountService.prototype, 'updateAccount');
      const req = createMockRequest({ params: { id: '8' }, body: { userId: -1 } });
      const res = createMockResponse();
      const next = createNext();

      await AccountController.updateAccount(req, res, next);

      expect(updateSpy).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(HTTPStatus.BAD_REQUEST);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, errorCode: Resource.VALIDATION_ERROR })
      );
      expect(logSpy).not.toHaveBeenCalled();
    });

    it('returns 400 when update service returns error', async () => {
      const existing = makeAccount({ id: 9 });
      jest.spyOn(AccountService.prototype, 'getAccountById').mockResolvedValue({ success: true, data: existing });
      jest.spyOn(AccountService.prototype, 'updateAccount').mockResolvedValue({ success: false, error: Resource.USER_NOT_FOUND });
      const req = createMockRequest({ params: { id: '9' }, body: { userId: 99 } });
      const res = createMockResponse();
      const next = createNext();

      await AccountController.updateAccount(req, res, next);

      expect(res.status).toHaveBeenCalledWith(HTTPStatus.BAD_REQUEST);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, errorCode: Resource.USER_NOT_FOUND })
      );
      expect(logSpy).not.toHaveBeenCalled();
    });

    it('returns 200 and logs when update succeeds', async () => {
      const existing = makeAccount({ id: 11, userId: 3 });
      const updated = makeAccount({ id: 11, userId: 3, name: 'Updated' });
      const expectedDelta = { name: { from: existing.name, to: updated.name } };
      jest.spyOn(AccountService.prototype, 'getAccountById').mockResolvedValue({ success: true, data: existing });
      jest.spyOn(AccountService.prototype, 'updateAccount').mockResolvedValue({ success: true, data: updated });
      const req = createAuthRequest({ params: { id: '11' }, body: { name: 'Updated', userId: existing.userId } });
      const res = createMockResponse();
      const next = createNext();

      await AccountController.updateAccount(req, res, next);

      expect(AccountService.prototype.updateAccount).toHaveBeenCalledWith(11, {
        name: 'Updated',
        userId: existing.userId,
      });
      expect(res.status).toHaveBeenCalledWith(HTTPStatus.OK);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, data: updated }));
      expect(logSpy).toHaveBeenCalledWith(
        LogType.SUCCESS,
        LogOperation.UPDATE,
        LogCategory.ACCOUNT,
        expectedDelta,
        updated.userId
      );
    });

    it('returns 500 and logs when service throws', async () => {
      const existing = makeAccount({ id: 12 });
      jest.spyOn(AccountService.prototype, 'getAccountById').mockResolvedValue({ success: true, data: existing });
      jest.spyOn(AccountService.prototype, 'updateAccount').mockRejectedValue(new Error('boom'));
      const req = createAuthRequest({ params: { id: '12' }, body: { name: 'Updated' } });
      const res = createMockResponse();
      const next = createNext();

      await AccountController.updateAccount(req, res, next);

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
        LogCategory.ACCOUNT,
        expect.any(Object),
        authUser.id,
        next
      );
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('deleteAccount', () => {
    it('returns 400 for invalid id', async () => {
      const deleteSpy = jest.spyOn(AccountService.prototype, 'deleteAccount');
      const req = createMockRequest({ params: { id: 'abc' } });
      const res = createMockResponse();
      const next = createNext();

      await AccountController.deleteAccount(req, res, next);

      expect(deleteSpy).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(HTTPStatus.BAD_REQUEST);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, errorCode: Resource.INVALID_ACCOUNT_ID })
      );
      expect(logSpy).not.toHaveBeenCalled();
    });

    it('returns 400 when service signals failure', async () => {
      jest.spyOn(AccountService.prototype, 'getAccountById').mockResolvedValue({ success: true, data: makeAccount({ id: 20 }) });
      jest.spyOn(AccountService.prototype, 'deleteAccount').mockResolvedValue({ success: false, error: Resource.ACCOUNT_NOT_FOUND });
      const req = createMockRequest({ params: { id: '20' } });
      const res = createMockResponse();
      const next = createNext();

      await AccountController.deleteAccount(req, res, next);

      expect(res.status).toHaveBeenCalledWith(HTTPStatus.BAD_REQUEST);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, errorCode: Resource.ACCOUNT_NOT_FOUND })
      );
      expect(logSpy).not.toHaveBeenCalled();
    });

    it('returns 200 and logs when deletion succeeds', async () => {
      const snapshot = makeAccount({ id: 21, userId: authUser.id });
      const expectedSnapshot = {
        id: snapshot.id,
        name: snapshot.name,
        institution: snapshot.institution,
        type: snapshot.type,
        observation: snapshot.observation,
        balance: snapshot.balance,
        active: snapshot.active,
        userId: snapshot.userId,
      };
      jest.spyOn(AccountService.prototype, 'getAccountById').mockResolvedValue({ success: true, data: snapshot });
      jest.spyOn(AccountService.prototype, 'deleteAccount').mockResolvedValue({ success: true, data: { id: 21 } });
      const req = createAuthRequest({ params: { id: '21' } });
      const res = createMockResponse();
      const next = createNext();

      await AccountController.deleteAccount(req, res, next);

      expect(AccountService.prototype.deleteAccount).toHaveBeenCalledWith(21);
      expect(res.status).toHaveBeenCalledWith(HTTPStatus.OK);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, data: { id: 21 } }));
      expect(logSpy).toHaveBeenCalledWith(
        LogType.SUCCESS,
        LogOperation.DELETE,
        LogCategory.ACCOUNT,
        expectedSnapshot,
        authUser.id
      );
    });

    it('returns 500 and logs when service throws', async () => {
      jest.spyOn(AccountService.prototype, 'getAccountById').mockResolvedValue({ success: true, data: makeAccount({ id: 22 }) });
      jest.spyOn(AccountService.prototype, 'deleteAccount').mockRejectedValue(new Error('boom'));
      const req = createAuthRequest({ params: { id: '22' } });
      const res = createMockResponse();
      const next = createNext();

      await AccountController.deleteAccount(req, res, next);

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
        LogCategory.ACCOUNT,
        expect.any(Object),
        authUser.id,
        next
      );
      expect(next).not.toHaveBeenCalled();
    });
  });
});


