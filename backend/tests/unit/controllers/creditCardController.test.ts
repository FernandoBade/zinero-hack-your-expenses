import CreditCardController from '../../../src/controller/creditCardController';
import { CreditCardService } from '../../../src/service/creditCardService';
import { CreditCardFlag } from '../../../../shared/enums/creditCard.enums';
import { HTTPStatus } from '../../../../shared/enums/http-status.enums';
import { LogCategory, LogOperation, LogType } from '../../../../shared/enums/log.enums';
import { SortOrder } from '../../../../shared/enums/operator.enums';
import { ErrorCode as Resource } from '../../../../shared/errors/error-codes';
import * as commons from '../../../src/utils/commons';
import { createMockRequest, createMockResponse, createNext } from '../../helpers/mockExpress';

const authUser = { id: 999 };
const DEFAULT_ISO_DATE = '2024-01-01T00:00:00.000Z';
const createAuthRequest = (overrides: Parameters<typeof createMockRequest>[0] = {}) =>
  createMockRequest({ user: authUser, ...overrides });

const makeCreditCardInput = (
  overrides: Partial<{ name: string; flag: CreditCardFlag; observation?: string; userId: number; accountId?: number; active?: boolean }> = {}
) => ({
  name: overrides.name ?? 'Visa Card',
  flag: overrides.flag ?? CreditCardFlag.VISA,
  observation: overrides.observation,
  userId: overrides.userId ?? 1,
  accountId: overrides.accountId,
  active: overrides.active ?? true,
});

const makeCreditCard = (
  overrides: Partial<{ id: number; name: string; flag: CreditCardFlag; observation?: string; balance?: string; limit?: string; userId: number; accountId?: number; active?: boolean; createdAt: string; updatedAt: string }> = {}
) => ({
  id: overrides.id ?? 1,
  name: overrides.name ?? 'Visa Card',
  flag: overrides.flag ?? CreditCardFlag.VISA,
  observation: overrides.observation ?? null,
  balance: overrides.balance ?? '0.00',
  limit: overrides.limit ?? '0.00',
  userId: overrides.userId ?? 1,
  accountId: overrides.accountId ?? null,
  active: overrides.active ?? true,
  createdAt: overrides.createdAt ?? DEFAULT_ISO_DATE,
  updatedAt: overrides.updatedAt ?? DEFAULT_ISO_DATE,
});

describe('CreditCardController', () => {
  let logSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    logSpy = jest.spyOn(commons, 'createLog').mockResolvedValue();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('createCreditCard', () => {
    it('returns 400 without calling service when validation fails', async () => {
      const createSpy = jest.spyOn(CreditCardService.prototype, 'createCreditCard');
      const req = createMockRequest({ body: { name: '', flag: 'invalid', userId: 0 } });
      const res = createMockResponse();
      const next = createNext();

      await CreditCardController.createCreditCard(req, res, next);

      expect(createSpy).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(HTTPStatus.BAD_REQUEST);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          errorCode: Resource.VALIDATION_ERROR,
        })
      );

      // also assert validation details are present and formatted
      const payload = (res.json as jest.Mock).mock.calls[0][0];
      expect(payload.error).toBeDefined();
      expect(Array.isArray(payload.error)).toBe(true);
      const flagError = (payload.error as Array<{ field?: string; errorCode?: string; params?: Record<string, unknown> }>).find((e) => e.field === 'flag');
      expect(flagError).toBeDefined();
      expect(flagError).toEqual(expect.objectContaining({
        errorCode: Resource.INVALID_ENUM,
        params: expect.objectContaining({ received: 'invalid' }),
      }));

      expect(logSpy).not.toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    });

    it('maps service error to HTTP 400', async () => {
      const input = makeCreditCardInput({ userId: 3 });
      const createSpy = jest
        .spyOn(CreditCardService.prototype, 'createCreditCard')
        .mockResolvedValue({ success: false, error: Resource.USER_NOT_FOUND });
      const req = createMockRequest({ body: input });
      const res = createMockResponse();
      const next = createNext();

      await CreditCardController.createCreditCard(req, res, next);

      expect(createSpy).toHaveBeenCalledTimes(1);
      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          name: input.name,
          flag: input.flag,
          observation: input.observation,
          userId: input.userId,
          accountId: input.accountId,
          active: input.active,
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

    it('returns 201 and logs when credit card is created', async () => {
      const input = makeCreditCardInput({ userId: 2 });
      const created = makeCreditCard({ id: 10, userId: input.userId });
      const createSpy = jest.spyOn(CreditCardService.prototype, 'createCreditCard').mockResolvedValue({ success: true, data: created });
      const req = createAuthRequest({ body: input });
      const res = createMockResponse();
      const next = createNext();

      await CreditCardController.createCreditCard(req, res, next);

      expect(createSpy).toHaveBeenCalledTimes(1);
      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          name: input.name,
          flag: input.flag,
          observation: input.observation,
          userId: input.userId,
          accountId: input.accountId,
          active: input.active,
        })
      );
      expect(res.status).toHaveBeenCalledWith(HTTPStatus.CREATED);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, data: created }));
      expect(logSpy).toHaveBeenCalledWith(
        LogType.SUCCESS,
        LogOperation.CREATE,
        LogCategory.CREDIT_CARD,
        created,
        created.userId
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('returns 500 and logs when service throws', async () => {
      const input = makeCreditCardInput({ userId: 3 });
      jest.spyOn(CreditCardService.prototype, 'createCreditCard').mockRejectedValue(new Error('boom'));
      const req = createAuthRequest({ body: input });
      const res = createMockResponse();
      const next = createNext();

      await CreditCardController.createCreditCard(req, res, next);

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
        LogCategory.CREDIT_CARD,
        expect.any(Object),
        authUser.id,
        next
      );
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('getCreditCards', () => {
    it('returns 200 with data and pagination when service succeeds', async () => {
      const cards = [makeCreditCard({ id: 1 }), makeCreditCard({ id: 2 })];
      jest.spyOn(CreditCardService.prototype, 'getCreditCards').mockResolvedValue({ success: true, data: cards });
      jest.spyOn(CreditCardService.prototype, 'countCreditCards').mockResolvedValue({ success: true, data: cards.length });
      const req = createMockRequest({ query: { page: '1', pageSize: '1', sort: 'name', order: 'asc' } });
      const res = createMockResponse();
      const next = createNext();

      await CreditCardController.getCreditCards(req, res, next);

      expect(CreditCardService.prototype.getCreditCards).toHaveBeenCalledWith({
        limit: 1,
        offset: 0,
        sort: 'name',
        order: SortOrder.ASC,
      });
      expect(CreditCardService.prototype.countCreditCards).toHaveBeenCalledTimes(1);
      expect(res.status).toHaveBeenCalledWith(HTTPStatus.OK);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: cards,
          page: 1,
          pageSize: 1,
          pageCount: expect.any(Number),
          totalItems: cards.length,
        })
      );
      expect(logSpy).not.toHaveBeenCalled();
    });

    it('returns 400 when list service fails', async () => {
      const listSpy = jest.spyOn(CreditCardService.prototype, 'getCreditCards').mockResolvedValue({ success: false, error: Resource.INTERNAL_SERVER_ERROR });
      const countSpy = jest.spyOn(CreditCardService.prototype, 'countCreditCards').mockResolvedValue({ success: true, data: 0 });
      const req = createMockRequest({ query: {} });
      const res = createMockResponse();
      const next = createNext();

      await CreditCardController.getCreditCards(req, res, next);

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
      const listSpy = jest.spyOn(CreditCardService.prototype, 'getCreditCards').mockResolvedValue({ success: true, data: [] });
      const countSpy = jest.spyOn(CreditCardService.prototype, 'countCreditCards').mockResolvedValue({ success: false, error: Resource.INTERNAL_SERVER_ERROR });
      const req = createMockRequest({ query: {} });
      const res = createMockResponse();
      const next = createNext();

      await CreditCardController.getCreditCards(req, res, next);

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
      jest.spyOn(CreditCardService.prototype, 'getCreditCards').mockRejectedValue(new Error('boom'));
      jest.spyOn(CreditCardService.prototype, 'countCreditCards').mockResolvedValue({ success: true, data: 0 });
      const req = createAuthRequest({ query: {} });
      const res = createMockResponse();
      const next = createNext();

      await CreditCardController.getCreditCards(req, res, next);

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
        LogCategory.CREDIT_CARD,
        expect.any(Object),
        authUser.id,
        next
      );
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('getCreditCardById', () => {
    it('returns 400 when id is invalid', async () => {
      const getSpy = jest.spyOn(CreditCardService.prototype, 'getCreditCardById');
      const req = createMockRequest({ params: { id: 'abc' } });
      const res = createMockResponse();
      const next = createNext();

      await CreditCardController.getCreditCardById(req, res, next);

      expect(getSpy).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(HTTPStatus.BAD_REQUEST);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          errorCode: Resource.INVALID_CREDIT_CARD_ID,
        })
      );
      expect(logSpy).not.toHaveBeenCalled();
    });

    it('returns 400 when service reports not found', async () => {
      jest.spyOn(CreditCardService.prototype, 'getCreditCardById').mockResolvedValue({ success: false, error: Resource.NO_RECORDS_FOUND });
      const req = createMockRequest({ params: { id: '5' } });
      const res = createMockResponse();
      const next = createNext();

      await CreditCardController.getCreditCardById(req, res, next);

      expect(res.status).toHaveBeenCalledWith(HTTPStatus.BAD_REQUEST);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          errorCode: Resource.NO_RECORDS_FOUND,
        })
      );
      expect(logSpy).not.toHaveBeenCalled();
    });

    it('returns 200 when credit card is found', async () => {
      const card = makeCreditCard({ id: 6 });
      jest.spyOn(CreditCardService.prototype, 'getCreditCardById').mockResolvedValue({ success: true, data: card });
      const req = createMockRequest({ params: { id: '6' } });
      const res = createMockResponse();
      const next = createNext();

      await CreditCardController.getCreditCardById(req, res, next);

      expect(CreditCardService.prototype.getCreditCardById).toHaveBeenCalledWith(6);
      expect(res.status).toHaveBeenCalledWith(HTTPStatus.OK);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, data: card }));
      expect(logSpy).not.toHaveBeenCalled();
    });

    it('returns 500 and logs when service throws', async () => {
      jest.spyOn(CreditCardService.prototype, 'getCreditCardById').mockRejectedValue(new Error('boom'));
      const req = createAuthRequest({ params: { id: '7' } });
      const res = createMockResponse();
      const next = createNext();

      await CreditCardController.getCreditCardById(req, res, next);

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
        LogCategory.CREDIT_CARD,
        expect.any(Object),
        authUser.id,
        next
      );
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('getCreditCardsByUser', () => {
    it('returns 400 when userId is invalid', async () => {
      const getSpy = jest.spyOn(CreditCardService.prototype, 'getCreditCardsByUser');
      const req = createMockRequest({ params: { userId: 'abc' } });
      const res = createMockResponse();
      const next = createNext();

      await CreditCardController.getCreditCardsByUser(req, res, next);

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
      const cards = [makeCreditCard({ id: 3, userId: 2 })];
      jest.spyOn(CreditCardService.prototype, 'getCreditCardsByUser').mockResolvedValue({ success: true, data: cards });
      jest.spyOn(CreditCardService.prototype, 'countCreditCardsByUser').mockResolvedValue({ success: true, data: cards.length });
      const req = createMockRequest({ params: { userId: '2' }, query: { page: '1', pageSize: '2' } });
      const res = createMockResponse();
      const next = createNext();

      await CreditCardController.getCreditCardsByUser(req, res, next);

      expect(CreditCardService.prototype.getCreditCardsByUser).toHaveBeenCalledWith(2, {
        limit: 2,
        offset: 0,
        sort: undefined,
        order: SortOrder.ASC,
      });
      expect(CreditCardService.prototype.countCreditCardsByUser).toHaveBeenCalledWith(2);
      expect(res.status).toHaveBeenCalledWith(HTTPStatus.OK);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: cards,
          page: 1,
          pageSize: 2,
          totalItems: cards.length,
        })
      );
      expect(logSpy).not.toHaveBeenCalled();
    });

    it('returns 400 when count service fails', async () => {
      const listSpy = jest.spyOn(CreditCardService.prototype, 'getCreditCardsByUser').mockResolvedValue({ success: true, data: [] });
      const countSpy = jest.spyOn(CreditCardService.prototype, 'countCreditCardsByUser').mockResolvedValue({ success: false, error: Resource.INTERNAL_SERVER_ERROR });
      const req = createMockRequest({ params: { userId: '2' }, query: {} });
      const res = createMockResponse();
      const next = createNext();

      await CreditCardController.getCreditCardsByUser(req, res, next);

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
      jest.spyOn(CreditCardService.prototype, 'getCreditCardsByUser').mockRejectedValue(new Error('boom'));
      jest.spyOn(CreditCardService.prototype, 'countCreditCardsByUser').mockResolvedValue({ success: true, data: 0 });
      const req = createAuthRequest({ params: { userId: '4' }, query: {} });
      const res = createMockResponse();
      const next = createNext();

      await CreditCardController.getCreditCardsByUser(req, res, next);

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
        LogCategory.CREDIT_CARD,
        expect.any(Object),
        authUser.id,
        next
      );
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('updateCreditCard', () => {
    it('returns 400 for invalid id', async () => {
      const getSpy = jest.spyOn(CreditCardService.prototype, 'getCreditCardById');
      const req = createMockRequest({ params: { id: '0' } });
      const res = createMockResponse();
      const next = createNext();

      await CreditCardController.updateCreditCard(req, res, next);

      expect(getSpy).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(HTTPStatus.BAD_REQUEST);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, errorCode: Resource.INVALID_CREDIT_CARD_ID })
      );
      expect(logSpy).not.toHaveBeenCalled();
    });

    it('returns 400 when credit card does not exist', async () => {
      jest.spyOn(CreditCardService.prototype, 'getCreditCardById').mockResolvedValue({ success: false, error: Resource.NO_RECORDS_FOUND });
      const req = createMockRequest({ params: { id: '6' }, body: { name: 'Updated' } });
      const res = createMockResponse();
      const next = createNext();

      await CreditCardController.updateCreditCard(req, res, next);

      expect(res.status).toHaveBeenCalledWith(HTTPStatus.BAD_REQUEST);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, errorCode: Resource.NO_RECORDS_FOUND })
      );
      expect(logSpy).not.toHaveBeenCalled();
    });

    it('returns 400 when validation fails', async () => {
      const existing = makeCreditCard({ id: 8 });
      jest.spyOn(CreditCardService.prototype, 'getCreditCardById').mockResolvedValue({ success: true, data: existing });
      const updateSpy = jest.spyOn(CreditCardService.prototype, 'updateCreditCard');
      const req = createMockRequest({ params: { id: '8' }, body: { flag: 'invalid' } });
      const res = createMockResponse();
      const next = createNext();

      await CreditCardController.updateCreditCard(req, res, next);

      expect(updateSpy).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(HTTPStatus.BAD_REQUEST);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, errorCode: Resource.VALIDATION_ERROR })
      );
      expect(logSpy).not.toHaveBeenCalled();
    });

    it('returns 400 when update service returns error', async () => {
      const existing = makeCreditCard({ id: 9 });
      jest.spyOn(CreditCardService.prototype, 'getCreditCardById').mockResolvedValue({ success: true, data: existing });
      jest.spyOn(CreditCardService.prototype, 'updateCreditCard').mockResolvedValue({ success: false, error: Resource.USER_NOT_FOUND });
      const req = createMockRequest({ params: { id: '9' }, body: { userId: 99 } });
      const res = createMockResponse();
      const next = createNext();

      await CreditCardController.updateCreditCard(req, res, next);

      expect(res.status).toHaveBeenCalledWith(HTTPStatus.BAD_REQUEST);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, errorCode: Resource.USER_NOT_FOUND })
      );
      expect(logSpy).not.toHaveBeenCalled();
    });

    it('returns 200 and logs when update succeeds', async () => {
      const existing = makeCreditCard({ id: 11, userId: 3 });
      const updated = makeCreditCard({ id: 11, userId: 3, name: 'Updated' });
      const expectedDelta = { name: { from: existing.name, to: updated.name } };
      jest.spyOn(CreditCardService.prototype, 'getCreditCardById').mockResolvedValue({ success: true, data: existing });
      jest.spyOn(CreditCardService.prototype, 'updateCreditCard').mockResolvedValue({ success: true, data: updated });
      const req = createAuthRequest({ params: { id: '11' }, body: { name: 'Updated', userId: existing.userId } });
      const res = createMockResponse();
      const next = createNext();

      await CreditCardController.updateCreditCard(req, res, next);

      expect(CreditCardService.prototype.updateCreditCard).toHaveBeenCalledWith(11, {
        name: 'Updated',
        userId: existing.userId,
      });
      expect(res.status).toHaveBeenCalledWith(HTTPStatus.OK);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, data: updated }));
      expect(logSpy).toHaveBeenCalledWith(
        LogType.SUCCESS,
        LogOperation.UPDATE,
        LogCategory.CREDIT_CARD,
        expectedDelta,
        updated.userId
      );
    });

    it('returns 500 and logs when service throws', async () => {
      const existing = makeCreditCard({ id: 12 });
      jest.spyOn(CreditCardService.prototype, 'getCreditCardById').mockResolvedValue({ success: true, data: existing });
      jest.spyOn(CreditCardService.prototype, 'updateCreditCard').mockRejectedValue(new Error('boom'));
      const req = createAuthRequest({ params: { id: '12' }, body: { name: 'Updated' } });
      const res = createMockResponse();
      const next = createNext();

      await CreditCardController.updateCreditCard(req, res, next);

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
        LogCategory.CREDIT_CARD,
        expect.any(Object),
        authUser.id,
        next
      );
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('deleteCreditCard', () => {
    it('returns 400 for invalid id', async () => {
      const deleteSpy = jest.spyOn(CreditCardService.prototype, 'deleteCreditCard');
      const req = createMockRequest({ params: { id: 'abc' } });
      const res = createMockResponse();
      const next = createNext();

      await CreditCardController.deleteCreditCard(req, res, next);

      expect(deleteSpy).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(HTTPStatus.BAD_REQUEST);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, errorCode: Resource.INVALID_CREDIT_CARD_ID })
      );
      expect(logSpy).not.toHaveBeenCalled();
    });

    it('returns 400 when service signals failure', async () => {
      jest.spyOn(CreditCardService.prototype, 'getCreditCardById').mockResolvedValue({ success: true, data: makeCreditCard({ id: 20 }) });
      jest.spyOn(CreditCardService.prototype, 'deleteCreditCard').mockResolvedValue({ success: false, error: Resource.CREDIT_CARD_NOT_FOUND });
      const req = createMockRequest({ params: { id: '20' } });
      const res = createMockResponse();
      const next = createNext();

      await CreditCardController.deleteCreditCard(req, res, next);

      expect(res.status).toHaveBeenCalledWith(HTTPStatus.BAD_REQUEST);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, errorCode: Resource.CREDIT_CARD_NOT_FOUND })
      );
      expect(logSpy).not.toHaveBeenCalled();
    });

    it('returns 200 and logs when deletion succeeds', async () => {
      const snapshot = makeCreditCard({ id: 21, userId: authUser.id });
      const expectedSnapshot = {
        id: snapshot.id,
        name: snapshot.name,
        flag: snapshot.flag,
        observation: snapshot.observation,
        balance: snapshot.balance,
        limit: snapshot.limit,
        userId: snapshot.userId,
        accountId: snapshot.accountId,
        active: snapshot.active,
      };
      jest.spyOn(CreditCardService.prototype, 'getCreditCardById').mockResolvedValue({ success: true, data: snapshot });
      jest.spyOn(CreditCardService.prototype, 'deleteCreditCard').mockResolvedValue({ success: true, data: { id: 21 } });
      const req = createAuthRequest({ params: { id: '21' } });
      const res = createMockResponse();
      const next = createNext();

      await CreditCardController.deleteCreditCard(req, res, next);

      expect(CreditCardService.prototype.deleteCreditCard).toHaveBeenCalledWith(21);
      expect(res.status).toHaveBeenCalledWith(HTTPStatus.OK);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, data: { id: 21 } }));
      expect(logSpy).toHaveBeenCalledWith(
        LogType.SUCCESS,
        LogOperation.DELETE,
        LogCategory.CREDIT_CARD,
        expectedSnapshot,
        authUser.id
      );
    });

    it('returns 500 and logs when service throws', async () => {
      jest.spyOn(CreditCardService.prototype, 'getCreditCardById').mockResolvedValue({ success: true, data: makeCreditCard({ id: 22 }) });
      jest.spyOn(CreditCardService.prototype, 'deleteCreditCard').mockRejectedValue(new Error('boom'));
      const req = createAuthRequest({ params: { id: '22' } });
      const res = createMockResponse();
      const next = createNext();

      await CreditCardController.deleteCreditCard(req, res, next);

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
        LogCategory.CREDIT_CARD,
        expect.any(Object),
        authUser.id,
        next
      );
      expect(next).not.toHaveBeenCalled();
    });
  });
});


