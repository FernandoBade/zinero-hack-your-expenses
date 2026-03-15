import 'jest';
import CategoryController from '../../../src/controller/categoryController';
import { CategoryService } from '../../../src/service/categoryService';
import { CategoryColor, CategoryType } from '../../../../shared/enums/category.enums';
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

const makeCategoryInput = (overrides: Partial<{ name: string; type: CategoryType; color?: CategoryColor; userId: number; active?: boolean }> = {}) => ({
  name: overrides.name ?? 'Food',
  type: overrides.type ?? CategoryType.EXPENSE,
  color: overrides.color ?? CategoryColor.RED,
  userId: overrides.userId ?? 1,
  active: overrides.active ?? true,
});

const makeCategory = (
  overrides: Partial<{ id: number; name: string; type: CategoryType; color?: CategoryColor; userId: number; active?: boolean; createdAt: string; updatedAt: string }> = {}
) => ({
  id: overrides.id ?? 1,
  name: overrides.name ?? 'Food',
  type: overrides.type ?? CategoryType.EXPENSE,
  color: overrides.color ?? CategoryColor.RED,
  active: overrides.active ?? true,
  userId: overrides.userId ?? 1,
  createdAt: overrides.createdAt ?? DEFAULT_ISO_DATE,
  updatedAt: overrides.updatedAt ?? DEFAULT_ISO_DATE,
});

describe('CategoryController', () => {
  let logSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    logSpy = jest.spyOn(commons, 'createLog').mockResolvedValue();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('createCategory', () => {
    it('returns 400 without calling service when validation fails', async () => {
      const createSpy = jest.spyOn(CategoryService.prototype, 'createCategory');
      const req = createMockRequest({ body: { name: '', type: 'invalid', userId: 0 } });
      const res = createMockResponse();
      const next = createNext();

      await CategoryController.createCategory(req, res, next);

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
      const input = makeCategoryInput({ userId: 9 });
      const createSpy = jest
        .spyOn(CategoryService.prototype, 'createCategory')
        .mockResolvedValue({ success: false, error: Resource.USER_NOT_FOUND });
      const req = createMockRequest({ body: input });
      const res = createMockResponse();
      const next = createNext();

      await CategoryController.createCategory(req, res, next);

      expect(createSpy).toHaveBeenCalledTimes(1);
      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          name: input.name,
          type: input.type,
          color: input.color,
          userId: input.userId,
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

    it('returns 201 and logs when category is created', async () => {
      const input = makeCategoryInput({ userId: 4 });
      const created = makeCategory({ id: 12, userId: input.userId });
      const createSpy = jest.spyOn(CategoryService.prototype, 'createCategory').mockResolvedValue({ success: true, data: created });
      const req = createAuthRequest({ body: input });
      const res = createMockResponse();
      const next = createNext();

      await CategoryController.createCategory(req, res, next);

      expect(createSpy).toHaveBeenCalledTimes(1);
      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          name: input.name,
          type: input.type,
          color: input.color,
          userId: input.userId,
          active: input.active,
        })
      );
      expect(res.status).toHaveBeenCalledWith(HTTPStatus.CREATED);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, data: created }));
      expect(logSpy).toHaveBeenCalledWith(
        LogType.SUCCESS,
        LogOperation.CREATE,
        LogCategory.CATEGORY,
        created,
        created.userId
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('returns 500 and logs when service throws', async () => {
      const input = makeCategoryInput({ userId: 3 });
      jest.spyOn(CategoryService.prototype, 'createCategory').mockRejectedValue(new Error('boom'));
      const req = createAuthRequest({ body: input });
      const res = createMockResponse();
      const next = createNext();

      await CategoryController.createCategory(req, res, next);

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

  describe('getCategories', () => {
    it('returns 200 with data and pagination when service succeeds', async () => {
      const categories = [makeCategory({ id: 1 }), makeCategory({ id: 2 })];
      jest.spyOn(CategoryService.prototype, 'getCategories').mockResolvedValue({ success: true, data: categories });
      jest.spyOn(CategoryService.prototype, 'countCategories').mockResolvedValue({ success: true, data: categories.length });
      const req = createMockRequest({ query: { page: '1', pageSize: '1', sort: 'name', order: 'asc' } });
      const res = createMockResponse();
      const next = createNext();

      await CategoryController.getCategories(req, res, next);

      expect(CategoryService.prototype.getCategories).toHaveBeenCalledWith({
        limit: 1,
        offset: 0,
        sort: 'name',
        order: SortOrder.ASC,
      });
      expect(CategoryService.prototype.countCategories).toHaveBeenCalledTimes(1);
      expect(res.status).toHaveBeenCalledWith(HTTPStatus.OK);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: categories,
          page: 1,
          pageSize: 1,
          pageCount: expect.any(Number),
          totalItems: categories.length,
        })
      );
      expect(logSpy).not.toHaveBeenCalled();
    });

    it('returns 400 when listing service fails', async () => {
      const listSpy = jest.spyOn(CategoryService.prototype, 'getCategories').mockResolvedValue({ success: false, error: Resource.INTERNAL_SERVER_ERROR });
      const countSpy = jest.spyOn(CategoryService.prototype, 'countCategories').mockResolvedValue({ success: true, data: 0 });
      const req = createMockRequest({ query: {} });
      const res = createMockResponse();
      const next = createNext();

      await CategoryController.getCategories(req, res, next);

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
      const listSpy = jest.spyOn(CategoryService.prototype, 'getCategories').mockResolvedValue({ success: true, data: [] });
      const countSpy = jest.spyOn(CategoryService.prototype, 'countCategories').mockResolvedValue({ success: false, error: Resource.INTERNAL_SERVER_ERROR });
      const req = createMockRequest({ query: {} });
      const res = createMockResponse();
      const next = createNext();

      await CategoryController.getCategories(req, res, next);

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
      jest.spyOn(CategoryService.prototype, 'getCategories').mockRejectedValue(new Error('boom'));
      jest.spyOn(CategoryService.prototype, 'countCategories').mockResolvedValue({ success: true, data: 0 });
      const req = createAuthRequest({ query: {} });
      const res = createMockResponse();
      const next = createNext();

      await CategoryController.getCategories(req, res, next);

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

  describe('getCategoryById', () => {
    it('returns 400 when id is invalid', async () => {
      const getSpy = jest.spyOn(CategoryService.prototype, 'getCategoryById');
      const req = createMockRequest({ params: { id: 'abc' } });
      const res = createMockResponse();
      const next = createNext();

      await CategoryController.getCategoryById(req, res, next);

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

    it('returns 400 when service reports not found', async () => {
      jest.spyOn(CategoryService.prototype, 'getCategoryById').mockResolvedValue({ success: false, error: Resource.NO_RECORDS_FOUND });
      const req = createMockRequest({ params: { id: '5' } });
      const res = createMockResponse();
      const next = createNext();

      await CategoryController.getCategoryById(req, res, next);

      expect(res.status).toHaveBeenCalledWith(HTTPStatus.BAD_REQUEST);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          errorCode: Resource.NO_RECORDS_FOUND,
        })
      );
      expect(logSpy).not.toHaveBeenCalled();
    });

    it('returns 200 when category is found', async () => {
      const category = makeCategory({ id: 6 });
      jest.spyOn(CategoryService.prototype, 'getCategoryById').mockResolvedValue({ success: true, data: category });
      const req = createMockRequest({ params: { id: '6' } });
      const res = createMockResponse();
      const next = createNext();

      await CategoryController.getCategoryById(req, res, next);

      expect(CategoryService.prototype.getCategoryById).toHaveBeenCalledWith(6);
      expect(res.status).toHaveBeenCalledWith(HTTPStatus.OK);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, data: category }));
      expect(logSpy).not.toHaveBeenCalled();
    });

    it('returns 500 and logs when service throws', async () => {
      jest.spyOn(CategoryService.prototype, 'getCategoryById').mockRejectedValue(new Error('boom'));
      const req = createAuthRequest({ params: { id: '7' } });
      const res = createMockResponse();
      const next = createNext();

      await CategoryController.getCategoryById(req, res, next);

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

  describe('getCategoriesByUser', () => {
    it('returns 400 when userId is invalid', async () => {
      const getSpy = jest.spyOn(CategoryService.prototype, 'getCategoriesByUser');
      const req = createMockRequest({ params: { userId: 'abc' } });
      const res = createMockResponse();
      const next = createNext();

      await CategoryController.getCategoriesByUser(req, res, next);

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
      const categories = [makeCategory({ id: 2, userId: 3 })];
      jest.spyOn(CategoryService.prototype, 'getCategoriesByUser').mockResolvedValue({ success: true, data: categories });
      jest.spyOn(CategoryService.prototype, 'countCategoriesByUser').mockResolvedValue({ success: true, data: categories.length });
      const req = createMockRequest({ params: { userId: '3' }, query: { page: '1', pageSize: '2' } });
      const res = createMockResponse();
      const next = createNext();

      await CategoryController.getCategoriesByUser(req, res, next);

      expect(CategoryService.prototype.getCategoriesByUser).toHaveBeenCalledWith(3, {
        limit: 2,
        offset: 0,
        sort: undefined,
        order: SortOrder.ASC,
      });
      expect(CategoryService.prototype.countCategoriesByUser).toHaveBeenCalledWith(3);
      expect(res.status).toHaveBeenCalledWith(HTTPStatus.OK);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: categories,
          page: 1,
          pageSize: 2,
          totalItems: categories.length,
        })
      );
      expect(logSpy).not.toHaveBeenCalled();
    });

    it('returns 400 when count service fails', async () => {
      const listSpy = jest.spyOn(CategoryService.prototype, 'getCategoriesByUser').mockResolvedValue({ success: true, data: [] });
      const countSpy = jest.spyOn(CategoryService.prototype, 'countCategoriesByUser').mockResolvedValue({ success: false, error: Resource.INTERNAL_SERVER_ERROR });
      const req = createMockRequest({ params: { userId: '2' }, query: {} });
      const res = createMockResponse();
      const next = createNext();

      await CategoryController.getCategoriesByUser(req, res, next);

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
      jest.spyOn(CategoryService.prototype, 'getCategoriesByUser').mockRejectedValue(new Error('boom'));
      jest.spyOn(CategoryService.prototype, 'countCategoriesByUser').mockResolvedValue({ success: true, data: 0 });
      const req = createAuthRequest({ params: { userId: '4' }, query: {} });
      const res = createMockResponse();
      const next = createNext();

      await CategoryController.getCategoriesByUser(req, res, next);

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

  describe('updateCategory', () => {
    it('returns 400 for invalid id', async () => {
      const getSpy = jest.spyOn(CategoryService.prototype, 'getCategoryById');
      const req = createMockRequest({ params: { id: '0' } });
      const res = createMockResponse();
      const next = createNext();

      await CategoryController.updateCategory(req, res, next);

      expect(getSpy).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(HTTPStatus.BAD_REQUEST);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, errorCode: Resource.INVALID_CATEGORY_ID })
      );
      expect(logSpy).not.toHaveBeenCalled();
    });

    it('returns 400 when category does not exist', async () => {
      jest.spyOn(CategoryService.prototype, 'getCategoryById').mockResolvedValue({ success: false, error: Resource.NO_RECORDS_FOUND });
      const req = createMockRequest({ params: { id: '6' }, body: { name: 'Updated' } });
      const res = createMockResponse();
      const next = createNext();

      await CategoryController.updateCategory(req, res, next);

      expect(res.status).toHaveBeenCalledWith(HTTPStatus.BAD_REQUEST);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, errorCode: Resource.NO_RECORDS_FOUND })
      );
      expect(logSpy).not.toHaveBeenCalled();
    });

    it('returns 400 when validation fails', async () => {
      const existing = makeCategory({ id: 8 });
      jest.spyOn(CategoryService.prototype, 'getCategoryById').mockResolvedValue({ success: true, data: existing });
      const updateSpy = jest.spyOn(CategoryService.prototype, 'updateCategory');
      const req = createMockRequest({ params: { id: '8' }, body: { name: '' } });
      const res = createMockResponse();
      const next = createNext();

      await CategoryController.updateCategory(req, res, next);

      expect(updateSpy).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(HTTPStatus.BAD_REQUEST);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, errorCode: Resource.VALIDATION_ERROR })
      );
      expect(logSpy).not.toHaveBeenCalled();
    });

    it('returns 400 when update service returns error', async () => {
      const existing = makeCategory({ id: 9 });
      jest.spyOn(CategoryService.prototype, 'getCategoryById').mockResolvedValue({ success: true, data: existing });
      jest.spyOn(CategoryService.prototype, 'updateCategory').mockResolvedValue({ success: false, error: Resource.USER_NOT_FOUND });
      const req = createMockRequest({ params: { id: '9' }, body: { userId: 99 } });
      const res = createMockResponse();
      const next = createNext();

      await CategoryController.updateCategory(req, res, next);

      expect(res.status).toHaveBeenCalledWith(HTTPStatus.BAD_REQUEST);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, errorCode: Resource.USER_NOT_FOUND })
      );
      expect(logSpy).not.toHaveBeenCalled();
    });

    it('returns 200 and logs when update succeeds', async () => {
      const existing = makeCategory({ id: 11, userId: 3 });
      const updated = makeCategory({ id: 11, userId: 3, name: 'Updated' });
      const expectedDelta = { name: { from: existing.name, to: updated.name } };
      jest.spyOn(CategoryService.prototype, 'getCategoryById').mockResolvedValue({ success: true, data: existing });
      jest.spyOn(CategoryService.prototype, 'updateCategory').mockResolvedValue({ success: true, data: updated });
      const req = createAuthRequest({ params: { id: '11' }, body: { name: 'Updated', userId: existing.userId } });
      const res = createMockResponse();
      const next = createNext();

      await CategoryController.updateCategory(req, res, next);

      expect(CategoryService.prototype.updateCategory).toHaveBeenCalledWith(11, {
        name: 'Updated',
        userId: existing.userId,
      });
      expect(res.status).toHaveBeenCalledWith(HTTPStatus.OK);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, data: updated }));
      expect(logSpy).toHaveBeenCalledWith(
        LogType.SUCCESS,
        LogOperation.UPDATE,
        LogCategory.CATEGORY,
        expectedDelta,
        updated.userId
      );
    });

    it('returns 500 and logs when service throws', async () => {
      const existing = makeCategory({ id: 12 });
      jest.spyOn(CategoryService.prototype, 'getCategoryById').mockResolvedValue({ success: true, data: existing });
      jest.spyOn(CategoryService.prototype, 'updateCategory').mockRejectedValue(new Error('boom'));
      const req = createAuthRequest({ params: { id: '12' }, body: { name: 'Updated' } });
      const res = createMockResponse();
      const next = createNext();

      await CategoryController.updateCategory(req, res, next);

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

  describe('deleteCategory', () => {
    it('returns 400 for invalid id', async () => {
      const deleteSpy = jest.spyOn(CategoryService.prototype, 'deleteCategory');
      const req = createMockRequest({ params: { id: 'abc' } });
      const res = createMockResponse();
      const next = createNext();

      await CategoryController.deleteCategory(req, res, next);

      expect(deleteSpy).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(HTTPStatus.BAD_REQUEST);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, errorCode: Resource.INVALID_CATEGORY_ID })
      );
      expect(logSpy).not.toHaveBeenCalled();
    });

    it('returns 400 when service signals failure', async () => {
      jest.spyOn(CategoryService.prototype, 'getCategoryById').mockResolvedValue({ success: true, data: makeCategory({ id: 20 }) });
      jest.spyOn(CategoryService.prototype, 'deleteCategory').mockResolvedValue({ success: false, error: Resource.CATEGORY_NOT_FOUND });
      const req = createMockRequest({ params: { id: '20' } });
      const res = createMockResponse();
      const next = createNext();

      await CategoryController.deleteCategory(req, res, next);

      expect(res.status).toHaveBeenCalledWith(HTTPStatus.BAD_REQUEST);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, errorCode: Resource.CATEGORY_NOT_FOUND })
      );
      expect(logSpy).not.toHaveBeenCalled();
    });

    it('returns 200 and logs when deletion succeeds', async () => {
      const snapshot = makeCategory({ id: 21, userId: authUser.id });
      const expectedSnapshot = {
        id: snapshot.id,
        name: snapshot.name,
        type: snapshot.type,
        color: snapshot.color,
        active: snapshot.active,
        userId: snapshot.userId,
      };
      jest.spyOn(CategoryService.prototype, 'getCategoryById').mockResolvedValue({ success: true, data: snapshot });
      jest.spyOn(CategoryService.prototype, 'deleteCategory').mockResolvedValue({ success: true, data: { id: 21 } });
      const req = createAuthRequest({ params: { id: '21' } });
      const res = createMockResponse();
      const next = createNext();

      await CategoryController.deleteCategory(req, res, next);

      expect(CategoryService.prototype.deleteCategory).toHaveBeenCalledWith(21);
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
      jest.spyOn(CategoryService.prototype, 'getCategoryById').mockResolvedValue({ success: true, data: makeCategory({ id: 22 }) });
      jest.spyOn(CategoryService.prototype, 'deleteCategory').mockRejectedValue(new Error('boom'));
      const req = createAuthRequest({ params: { id: '22' } });
      const res = createMockResponse();
      const next = createNext();

      await CategoryController.deleteCategory(req, res, next);

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


