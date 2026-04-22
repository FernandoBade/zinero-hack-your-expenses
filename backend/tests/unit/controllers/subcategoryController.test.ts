import SubcategoryController from '../../../src/controller/subcategoryController';
import { SubcategoryService } from '../../../src/service/subcategoryService';
import { CategoryService } from '../../../src/service/categoryService';
import { HTTPStatus } from '../../../../shared/enums/http-status.enums';
import { LogCategory, LogOperation, LogType } from '../../../../shared/enums/log.enums';
import { SortOrder } from '../../../../shared/enums/operator.enums';
import { Profile } from '../../../../shared/enums/user.enums';
import { ErrorCode as Resource } from '../../../../shared/errors/error-codes';
import * as commons from '../../../src/utils/commons';
import { createMockRequest, createMockResponse, createNext } from '../../helpers/mockExpress';

const authUser = { id: 999 };
const masterUser = { id: 1, profile: Profile.MASTER };
const DEFAULT_ISO_DATE = '2024-01-01T00:00:00.000Z';
const createAuthRequest = (overrides: Parameters<typeof createMockRequest>[0] = {}) =>
  createMockRequest({ user: authUser, ...overrides });

const makeSubcategoryInput = (overrides: Partial<{ name: string; categoryId: number; active?: boolean; userId?: number }> = {}) => ({
  name: overrides.name ?? 'Groceries',
  categoryId: overrides.categoryId ?? 1,
  active: overrides.active ?? true,
  userId: overrides.userId ?? 1,
});

const makeSubcategory = (
  overrides: Partial<{ id: number; name: string; categoryId: number; active?: boolean; createdAt: string; updatedAt: string }> = {}
) => ({
  id: overrides.id ?? 1,
  name: overrides.name ?? 'Groceries',
  categoryId: overrides.categoryId ?? 1,
  active: overrides.active ?? true,
  createdAt: overrides.createdAt ?? DEFAULT_ISO_DATE,
  updatedAt: overrides.updatedAt ?? DEFAULT_ISO_DATE,
});

describe('SubcategoryController', () => {
  let logSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    logSpy = jest.spyOn(commons, 'createLog').mockResolvedValue();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('createSubcategory', () => {
    it('returns 400 without calling service when validation fails', async () => {
      const createSpy = jest.spyOn(SubcategoryService.prototype, 'createSubcategory');
      const req = createAuthRequest({ body: { name: '', categoryId: 0 } });
      const res = createMockResponse();
      const next = createNext();

      await SubcategoryController.createSubcategory(req, res, next);

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
      const input = makeSubcategoryInput({ userId: 3 });
      const createSpy = jest
        .spyOn(SubcategoryService.prototype, 'createSubcategory')
        .mockResolvedValue({ success: false, error: Resource.CATEGORY_NOT_FOUND });
      const req = createMockRequest({ user: { id: input.userId }, body: input });
      const res = createMockResponse();
      const next = createNext();

      await SubcategoryController.createSubcategory(req, res, next);

      expect(createSpy).toHaveBeenCalledTimes(1);
      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          name: input.name,
          categoryId: input.categoryId,
          active: input.active,
        }),
        input.userId
      );
      expect(res.status).toHaveBeenCalledWith(HTTPStatus.BAD_REQUEST);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          errorCode: Resource.CATEGORY_NOT_FOUND,
        })
      );
      expect(logSpy).not.toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    });

    it('maps unauthorized create errors to HTTP 403', async () => {
      const input = makeSubcategoryInput({ userId: authUser.id });
      jest.spyOn(SubcategoryService.prototype, 'createSubcategory').mockResolvedValue({
        success: false,
        error: Resource.UNAUTHORIZED_OPERATION,
      });
      const req = createAuthRequest({ body: input });
      const res = createMockResponse();
      const next = createNext();

      await SubcategoryController.createSubcategory(req, res, next);

      expect(res.status).toHaveBeenCalledWith(HTTPStatus.FORBIDDEN);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ errorCode: Resource.UNAUTHORIZED_OPERATION }));
    });

    it('returns 201 and logs when subcategory is created', async () => {
      const input = makeSubcategoryInput({ userId: 4 });
      const created = makeSubcategory({ id: 12, categoryId: input.categoryId });
      const createSpy = jest.spyOn(SubcategoryService.prototype, 'createSubcategory').mockResolvedValue({ success: true, data: created });
      const req = createMockRequest({ user: { id: input.userId }, body: input });
      const res = createMockResponse();
      const next = createNext();

      await SubcategoryController.createSubcategory(req, res, next);

      expect(createSpy).toHaveBeenCalledTimes(1);
      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          name: input.name,
          categoryId: input.categoryId,
          active: input.active,
        }),
        input.userId
      );
      expect(res.status).toHaveBeenCalledWith(HTTPStatus.CREATED);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, data: created }));
      expect(logSpy).toHaveBeenCalledWith(
        LogType.SUCCESS,
        LogOperation.CREATE,
        LogCategory.CATEGORY,
        created,
        input.userId
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('returns 500 and logs when service throws', async () => {
      const input = makeSubcategoryInput({ userId: 3 });
      jest.spyOn(SubcategoryService.prototype, 'createSubcategory').mockRejectedValue(new Error('boom'));
      const req = createMockRequest({ user: { id: input.userId }, body: input });
      const res = createMockResponse();
      const next = createNext();

      await SubcategoryController.createSubcategory(req, res, next);

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
        LogCategory.CATEGORY,
        expect.any(Object),
        input.userId,
        next
      );
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('getSubcategories', () => {
    it('returns 200 with data and pagination when service succeeds', async () => {
      const subs = [makeSubcategory({ id: 1 }), makeSubcategory({ id: 2 })];
      jest.spyOn(SubcategoryService.prototype, 'getSubcategories').mockResolvedValue({ success: true, data: subs });
      jest.spyOn(SubcategoryService.prototype, 'countSubcategories').mockResolvedValue({ success: true, data: subs.length });
      const req = createMockRequest({ user: masterUser, query: { page: '1', pageSize: '1', sort: 'name', order: 'asc' } });
      const res = createMockResponse();
      const next = createNext();

      await SubcategoryController.getSubcategories(req, res, next);

      expect(SubcategoryService.prototype.getSubcategories).toHaveBeenCalledWith({
        limit: 1,
        offset: 0,
        sort: 'name',
        order: SortOrder.ASC,
      });
      expect(SubcategoryService.prototype.countSubcategories).toHaveBeenCalledTimes(1);
      expect(res.status).toHaveBeenCalledWith(HTTPStatus.OK);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: subs,
          page: 1,
          pageSize: 1,
          pageCount: expect.any(Number),
          totalItems: subs.length,
        })
      );
      expect(logSpy).not.toHaveBeenCalled();
    });

    it('returns 400 when listing service fails', async () => {
      const listSpy = jest.spyOn(SubcategoryService.prototype, 'getSubcategories').mockResolvedValue({ success: false, error: Resource.INTERNAL_SERVER_ERROR });
      const countSpy = jest.spyOn(SubcategoryService.prototype, 'countSubcategories').mockResolvedValue({ success: true, data: 0 });
      const req = createMockRequest({ user: masterUser, query: {} });
      const res = createMockResponse();
      const next = createNext();

      await SubcategoryController.getSubcategories(req, res, next);

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
      const listSpy = jest.spyOn(SubcategoryService.prototype, 'getSubcategories').mockResolvedValue({ success: true, data: [] });
      const countSpy = jest.spyOn(SubcategoryService.prototype, 'countSubcategories').mockResolvedValue({ success: false, error: Resource.INTERNAL_SERVER_ERROR });
      const req = createMockRequest({ user: masterUser, query: {} });
      const res = createMockResponse();
      const next = createNext();

      await SubcategoryController.getSubcategories(req, res, next);

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
      jest.spyOn(SubcategoryService.prototype, 'getSubcategories').mockRejectedValue(new Error('boom'));
      jest.spyOn(SubcategoryService.prototype, 'countSubcategories').mockResolvedValue({ success: true, data: 0 });
      const req = createMockRequest({ user: masterUser, query: {} });
      const res = createMockResponse();
      const next = createNext();

      await SubcategoryController.getSubcategories(req, res, next);

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
        LogCategory.CATEGORY,
        expect.any(Object),
        masterUser.id,
        next
      );
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('getSubcategoriesByCategory', () => {
    it('returns 400 when categoryId is invalid', async () => {
      const getSpy = jest.spyOn(SubcategoryService.prototype, 'getSubcategoriesByCategory');
      const req = createMockRequest({ params: { categoryId: 'abc' } });
      const res = createMockResponse();
      const next = createNext();

      await SubcategoryController.getSubcategoriesByCategory(req, res, next);

      expect(getSpy).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(HTTPStatus.BAD_REQUEST);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          errorCode: Resource.INVALID_CATEGORY_ID,
        })
      );
      expect(logSpy).not.toHaveBeenCalled();
    });

    it('returns 200 with data when service succeeds', async () => {
      const subs = [makeSubcategory({ id: 2, categoryId: 3 })];
      jest.spyOn(CategoryService.prototype, 'getCategoryById').mockResolvedValue({
        success: true,
        data: { id: 3, userId: 3, active: true },
      } as any);
      jest.spyOn(SubcategoryService.prototype, 'getSubcategoriesByCategory').mockResolvedValue({ success: true, data: subs });
      jest.spyOn(SubcategoryService.prototype, 'countSubcategoriesByCategory').mockResolvedValue({ success: true, data: subs.length });
      const req = createMockRequest({ user: { id: 3 }, params: { categoryId: '3' }, query: { page: '1', pageSize: '2' } });
      const res = createMockResponse();
      const next = createNext();

      await SubcategoryController.getSubcategoriesByCategory(req, res, next);

      expect(SubcategoryService.prototype.getSubcategoriesByCategory).toHaveBeenCalledWith(3, {
        limit: 2,
        offset: 0,
        sort: undefined,
        order: SortOrder.ASC,
      });
      expect(SubcategoryService.prototype.countSubcategoriesByCategory).toHaveBeenCalledWith(3);
      expect(res.status).toHaveBeenCalledWith(HTTPStatus.OK);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: subs,
          page: 1,
          pageSize: 2,
          totalItems: subs.length,
        })
      );
      expect(logSpy).not.toHaveBeenCalled();
    });

    it('returns 400 when count service fails', async () => {
      jest.spyOn(CategoryService.prototype, 'getCategoryById').mockResolvedValue({
        success: true,
        data: { id: 2, userId: 2, active: true },
      } as any);
      const listSpy = jest.spyOn(SubcategoryService.prototype, 'getSubcategoriesByCategory').mockResolvedValue({ success: true, data: [] });
      const countSpy = jest.spyOn(SubcategoryService.prototype, 'countSubcategoriesByCategory').mockResolvedValue({ success: false, error: Resource.INTERNAL_SERVER_ERROR });
      const req = createMockRequest({ user: { id: 2 }, params: { categoryId: '2' }, query: {} });
      const res = createMockResponse();
      const next = createNext();

      await SubcategoryController.getSubcategoriesByCategory(req, res, next);

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
      jest.spyOn(CategoryService.prototype, 'getCategoryById').mockResolvedValue({
        success: true,
        data: { id: 4, userId: 4, active: true },
      } as any);
      jest.spyOn(SubcategoryService.prototype, 'getSubcategoriesByCategory').mockRejectedValue(new Error('boom'));
      jest.spyOn(SubcategoryService.prototype, 'countSubcategoriesByCategory').mockResolvedValue({ success: true, data: 0 });
      const req = createMockRequest({ user: { id: 4 }, params: { categoryId: '4' }, query: {} });
      const res = createMockResponse();
      const next = createNext();

      await SubcategoryController.getSubcategoriesByCategory(req, res, next);

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
        LogCategory.CATEGORY,
        expect.any(Object),
        4,
        next
      );
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('getSubcategoryById', () => {
    it('returns 400 when id is invalid', async () => {
      const getSpy = jest.spyOn(SubcategoryService.prototype, 'getSubcategoryById');
      const req = createMockRequest({ params: { id: 'abc' } });
      const res = createMockResponse();
      const next = createNext();

      await SubcategoryController.getSubcategoryById(req, res, next);

      expect(getSpy).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(HTTPStatus.BAD_REQUEST);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          errorCode: Resource.INVALID_SUBCATEGORY_ID,
        })
      );
      expect(logSpy).not.toHaveBeenCalled();
    });

    it('returns 400 when service reports not found', async () => {
      jest.spyOn(SubcategoryService.prototype, 'getSubcategoryById').mockResolvedValue({ success: false, error: Resource.NO_RECORDS_FOUND });
      const req = createMockRequest({ params: { id: '5' } });
      const res = createMockResponse();
      const next = createNext();

      await SubcategoryController.getSubcategoryById(req, res, next);

      expect(res.status).toHaveBeenCalledWith(HTTPStatus.BAD_REQUEST);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          errorCode: Resource.NO_RECORDS_FOUND,
        })
      );
      expect(logSpy).not.toHaveBeenCalled();
    });

    it('returns 200 when subcategory is found', async () => {
      const sub = makeSubcategory({ id: 6, categoryId: 3 });
      jest.spyOn(SubcategoryService.prototype, 'getSubcategoryById').mockResolvedValue({ success: true, data: sub });
      jest.spyOn(CategoryService.prototype, 'getCategoryById').mockResolvedValue({
        success: true,
        data: { id: 3, userId: 3, active: true },
      } as any);
      const req = createMockRequest({ user: { id: 3 }, params: { id: '6' } });
      const res = createMockResponse();
      const next = createNext();

      await SubcategoryController.getSubcategoryById(req, res, next);

      expect(SubcategoryService.prototype.getSubcategoryById).toHaveBeenCalledWith(6);
      expect(res.status).toHaveBeenCalledWith(HTTPStatus.OK);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, data: sub }));
      expect(logSpy).not.toHaveBeenCalled();
    });

    it('returns 500 and logs when service throws', async () => {
      jest.spyOn(SubcategoryService.prototype, 'getSubcategoryById').mockRejectedValue(new Error('boom'));
      const req = createAuthRequest({ params: { id: '7' } });
      const res = createMockResponse();
      const next = createNext();

      await SubcategoryController.getSubcategoryById(req, res, next);

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
        LogCategory.CATEGORY,
        expect.any(Object),
        authUser.id,
        next
      );
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('getSubcategoriesByUser', () => {
    it('returns 400 when userId is invalid', async () => {
      const getSpy = jest.spyOn(SubcategoryService.prototype, 'getSubcategoriesByUser');
      const req = createMockRequest({ params: { userId: 'abc' } });
      const res = createMockResponse();
      const next = createNext();

      await SubcategoryController.getSubcategoriesByUser(req, res, next);

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
      const subs = [makeSubcategory({ id: 2, categoryId: 3 })];
      jest.spyOn(SubcategoryService.prototype, 'getSubcategoriesByUser').mockResolvedValue({ success: true, data: subs });
      jest.spyOn(SubcategoryService.prototype, 'countSubcategoriesByUser').mockResolvedValue({ success: true, data: subs.length });
      const req = createMockRequest({ user: { id: 3 }, params: { userId: '3' }, query: { page: '1', pageSize: '2' } });
      const res = createMockResponse();
      const next = createNext();

      await SubcategoryController.getSubcategoriesByUser(req, res, next);

      expect(SubcategoryService.prototype.getSubcategoriesByUser).toHaveBeenCalledWith(3, {
        limit: 2,
        offset: 0,
        sort: undefined,
        order: SortOrder.ASC,
      });
      expect(SubcategoryService.prototype.countSubcategoriesByUser).toHaveBeenCalledWith(3);
      expect(res.status).toHaveBeenCalledWith(HTTPStatus.OK);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: subs,
          page: 1,
          pageSize: 2,
          totalItems: subs.length,
        })
      );
      expect(logSpy).not.toHaveBeenCalled();
    });

    it('returns 400 when count service fails', async () => {
      const listSpy = jest.spyOn(SubcategoryService.prototype, 'getSubcategoriesByUser').mockResolvedValue({ success: true, data: [] });
      const countSpy = jest.spyOn(SubcategoryService.prototype, 'countSubcategoriesByUser').mockResolvedValue({ success: false, error: Resource.INTERNAL_SERVER_ERROR });
      const req = createMockRequest({ user: { id: 2 }, params: { userId: '2' }, query: {} });
      const res = createMockResponse();
      const next = createNext();

      await SubcategoryController.getSubcategoriesByUser(req, res, next);

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
      jest.spyOn(SubcategoryService.prototype, 'getSubcategoriesByUser').mockRejectedValue(new Error('boom'));
      jest.spyOn(SubcategoryService.prototype, 'countSubcategoriesByUser').mockResolvedValue({ success: true, data: 0 });
      const req = createMockRequest({ user: { id: 4 }, params: { userId: '4' }, query: {} });
      const res = createMockResponse();
      const next = createNext();

      await SubcategoryController.getSubcategoriesByUser(req, res, next);

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
        LogCategory.CATEGORY,
        expect.any(Object),
        4,
        next
      );
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('updateSubcategory', () => {
    it('returns 400 for invalid id', async () => {
      const getSpy = jest.spyOn(SubcategoryService.prototype, 'getSubcategoryById');
      const req = createMockRequest({ params: { id: '0' } });
      const res = createMockResponse();
      const next = createNext();

      await SubcategoryController.updateSubcategory(req, res, next);

      expect(getSpy).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(HTTPStatus.BAD_REQUEST);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, errorCode: Resource.INVALID_SUBCATEGORY_ID })
      );
      expect(logSpy).not.toHaveBeenCalled();
    });

    it('returns 400 when subcategory does not exist', async () => {
      jest.spyOn(SubcategoryService.prototype, 'getSubcategoryById').mockResolvedValue({ success: false, error: Resource.NO_RECORDS_FOUND });
      const req = createAuthRequest({ params: { id: '6' }, body: { name: 'Updated' } });
      const res = createMockResponse();
      const next = createNext();

      await SubcategoryController.updateSubcategory(req, res, next);

      expect(res.status).toHaveBeenCalledWith(HTTPStatus.BAD_REQUEST);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, errorCode: Resource.NO_RECORDS_FOUND })
      );
      expect(logSpy).not.toHaveBeenCalled();
    });

    it('returns 400 when validation fails', async () => {
      const existing = makeSubcategory({ id: 8 });
      jest.spyOn(SubcategoryService.prototype, 'getSubcategoryById').mockResolvedValue({ success: true, data: existing });
      jest.spyOn(CategoryService.prototype, 'getCategoryById').mockResolvedValue({
        success: true,
        data: { id: existing.categoryId, userId: 8, active: true },
      } as any);
      const updateSpy = jest.spyOn(SubcategoryService.prototype, 'updateSubcategory');
      const req = createMockRequest({ user: { id: 8 }, params: { id: '8' }, body: { name: '' } });
      const res = createMockResponse();
      const next = createNext();

      await SubcategoryController.updateSubcategory(req, res, next);

      expect(updateSpy).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(HTTPStatus.BAD_REQUEST);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, errorCode: Resource.VALIDATION_ERROR })
      );
      expect(logSpy).not.toHaveBeenCalled();
    });

    it('returns 400 when update service returns error', async () => {
      const existing = makeSubcategory({ id: 9 });
      jest.spyOn(SubcategoryService.prototype, 'getSubcategoryById').mockResolvedValue({ success: true, data: existing });
      jest.spyOn(CategoryService.prototype, 'getCategoryById').mockResolvedValue({
        success: true,
        data: { id: existing.categoryId, userId: authUser.id, active: true },
      } as any);
      jest.spyOn(SubcategoryService.prototype, 'updateSubcategory').mockResolvedValue({ success: false, error: Resource.CATEGORY_NOT_FOUND });
      const req = createAuthRequest({ params: { id: '9' }, body: { name: 'Updated' } });
      const res = createMockResponse();
      const next = createNext();

      await SubcategoryController.updateSubcategory(req, res, next);

      expect(res.status).toHaveBeenCalledWith(HTTPStatus.BAD_REQUEST);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, errorCode: Resource.CATEGORY_NOT_FOUND })
      );
      expect(logSpy).not.toHaveBeenCalled();
    });

    it('returns 200 and logs when update succeeds', async () => {
      const existing = makeSubcategory({ id: 11, categoryId: 3 });
      const updated = makeSubcategory({ id: 11, categoryId: 3, name: 'Updated' });
      const expectedDelta = { name: { from: existing.name, to: updated.name } };
      jest.spyOn(SubcategoryService.prototype, 'getSubcategoryById').mockResolvedValue({ success: true, data: existing });
      jest.spyOn(CategoryService.prototype, 'getCategoryById').mockResolvedValue({
        success: true,
        data: { id: existing.categoryId, userId: authUser.id, active: true },
      } as any);
      jest.spyOn(SubcategoryService.prototype, 'updateSubcategory').mockResolvedValue({ success: true, data: updated });
      const req = createAuthRequest({ params: { id: '11' }, body: { name: 'Updated' } });
      const res = createMockResponse();
      const next = createNext();

      await SubcategoryController.updateSubcategory(req, res, next);

      expect(SubcategoryService.prototype.updateSubcategory).toHaveBeenCalledWith(11, { name: 'Updated' }, authUser.id);
      expect(res.status).toHaveBeenCalledWith(HTTPStatus.OK);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, data: updated }));
      expect(logSpy).toHaveBeenCalledWith(
        LogType.SUCCESS,
        LogOperation.UPDATE,
        LogCategory.CATEGORY,
        expectedDelta,
        authUser.id
      );
    });

    it('maps unauthorized update errors to HTTP 403', async () => {
      const existing = makeSubcategory({ id: 13 });
      jest.spyOn(SubcategoryService.prototype, 'getSubcategoryById').mockResolvedValue({ success: true, data: existing });
      jest.spyOn(CategoryService.prototype, 'getCategoryById').mockResolvedValue({
        success: true,
        data: { id: existing.categoryId, userId: authUser.id, active: true },
      } as any);
      jest.spyOn(SubcategoryService.prototype, 'updateSubcategory').mockResolvedValue({
        success: false,
        error: Resource.UNAUTHORIZED_OPERATION,
      });
      const req = createAuthRequest({ params: { id: '13' }, body: { name: 'Updated' } });
      const res = createMockResponse();
      const next = createNext();

      await SubcategoryController.updateSubcategory(req, res, next);

      expect(res.status).toHaveBeenCalledWith(HTTPStatus.FORBIDDEN);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ errorCode: Resource.UNAUTHORIZED_OPERATION }));
    });

    it('returns 500 and logs when service throws', async () => {
      const existing = makeSubcategory({ id: 12 });
      jest.spyOn(SubcategoryService.prototype, 'getSubcategoryById').mockResolvedValue({ success: true, data: existing });
      jest.spyOn(CategoryService.prototype, 'getCategoryById').mockResolvedValue({
        success: true,
        data: { id: existing.categoryId, userId: authUser.id, active: true },
      } as any);
      jest.spyOn(SubcategoryService.prototype, 'updateSubcategory').mockRejectedValue(new Error('boom'));
      const req = createAuthRequest({ params: { id: '12' }, body: { name: 'Updated' } });
      const res = createMockResponse();
      const next = createNext();

      await SubcategoryController.updateSubcategory(req, res, next);

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
        LogCategory.CATEGORY,
        expect.any(Object),
        authUser.id,
        next
      );
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('deleteSubcategory', () => {
    it('returns 400 for invalid id', async () => {
      const deleteSpy = jest.spyOn(SubcategoryService.prototype, 'deleteSubcategory');
      const req = createMockRequest({ params: { id: 'abc' } });
      const res = createMockResponse();
      const next = createNext();

      await SubcategoryController.deleteSubcategory(req, res, next);

      expect(deleteSpy).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(HTTPStatus.BAD_REQUEST);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, errorCode: Resource.INVALID_SUBCATEGORY_ID })
      );
      expect(logSpy).not.toHaveBeenCalled();
    });

    it('returns 400 when service signals failure', async () => {
      const snapshot = makeSubcategory({ id: 20, categoryId: 20 });
      jest.spyOn(SubcategoryService.prototype, 'getSubcategoryById').mockResolvedValue({ success: true, data: snapshot });
      jest.spyOn(CategoryService.prototype, 'getCategoryById').mockResolvedValue({
        success: true,
        data: { id: snapshot.categoryId, userId: 20, active: true },
      } as any);
      jest.spyOn(SubcategoryService.prototype, 'deleteSubcategory').mockResolvedValue({ success: false, error: Resource.SUBCATEGORY_NOT_FOUND });
      const req = createMockRequest({ user: { id: 20 }, params: { id: '20' } });
      const res = createMockResponse();
      const next = createNext();

      await SubcategoryController.deleteSubcategory(req, res, next);

      expect(res.status).toHaveBeenCalledWith(HTTPStatus.BAD_REQUEST);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, errorCode: Resource.SUBCATEGORY_NOT_FOUND })
      );
      expect(logSpy).not.toHaveBeenCalled();
    });

    it('returns 200 and logs when deletion succeeds', async () => {
      const snapshot = makeSubcategory({ id: 21 });
      const expectedSnapshot = {
        id: snapshot.id,
        name: snapshot.name,
        categoryId: snapshot.categoryId,
        active: snapshot.active,
      };
      jest.spyOn(SubcategoryService.prototype, 'getSubcategoryById').mockResolvedValue({ success: true, data: snapshot });
      jest.spyOn(CategoryService.prototype, 'getCategoryById').mockResolvedValue({
        success: true,
        data: { id: snapshot.categoryId, userId: authUser.id, active: true },
      } as any);
      jest.spyOn(SubcategoryService.prototype, 'deleteSubcategory').mockResolvedValue({ success: true, data: { id: 21 } });
      const req = createAuthRequest({ params: { id: '21' } });
      const res = createMockResponse();
      const next = createNext();

      await SubcategoryController.deleteSubcategory(req, res, next);

      expect(SubcategoryService.prototype.deleteSubcategory).toHaveBeenCalledWith(21);
      expect(res.status).toHaveBeenCalledWith(HTTPStatus.OK);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, data: { id: 21 } }));
      expect(logSpy).toHaveBeenCalledWith(
        LogType.SUCCESS,
        LogOperation.DELETE,
        LogCategory.CATEGORY,
        expectedSnapshot,
        authUser.id
      );
    });

    it('returns 500 and logs when service throws', async () => {
      const snapshot = makeSubcategory({ id: 22 });
      jest.spyOn(SubcategoryService.prototype, 'getSubcategoryById').mockResolvedValue({ success: true, data: snapshot });
      jest.spyOn(CategoryService.prototype, 'getCategoryById').mockResolvedValue({
        success: true,
        data: { id: snapshot.categoryId, userId: authUser.id, active: true },
      } as any);
      jest.spyOn(SubcategoryService.prototype, 'deleteSubcategory').mockRejectedValue(new Error('boom'));
      const req = createAuthRequest({ params: { id: '22' } });
      const res = createMockResponse();
      const next = createNext();

      await SubcategoryController.deleteSubcategory(req, res, next);

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
        LogCategory.CATEGORY,
        expect.any(Object),
        authUser.id,
        next
      );
      expect(next).not.toHaveBeenCalled();
    });
  });
});


