import { CategoryService } from '../../../src/service/categoryService';
import { CategoryRepository } from '../../../src/repositories/categoryRepository';
import { UserService } from '../../../src/service/userService';
import { CategoryColor, CategoryType } from '../../../../shared/enums/category.enums';
import { FilterOperator, SortOrder } from '../../../../shared/enums/operator.enums';
import { ErrorCode as Resource } from '../../../../shared/errors/error-codes';
import { SelectCategory } from '../../../src/db/schema';
import type { CategoryEntity } from '../../../../shared/domains/category/category.types';
import { makeSanitizedUser } from '../../helpers/factories';
const isResource = (value: string): value is Resource => Object.values(Resource).includes(value as Resource);

const DEFAULT_ISO_DATE = new Date('2024-01-01T00:00:00Z').toISOString();

const makeDbCategory = (overrides: Partial<SelectCategory> = {}): SelectCategory => {
    const now = new Date('2024-01-01T00:00:00Z');
    return {
        id: overrides.id ?? 1,
        name: overrides.name ?? 'Groceries',
        type: overrides.type ?? CategoryType.EXPENSE,
        color: overrides.color ?? CategoryColor.BLUE,
        active: overrides.active ?? true,
        userId: overrides.userId ?? 1,
        createdAt: overrides.createdAt ?? now,
        updatedAt: overrides.updatedAt ?? now,
    };
};

const makeCategory = (overrides: Partial<CategoryEntity> = {}): CategoryEntity => {
    return {
        id: overrides.id ?? 1,
        name: overrides.name ?? 'Groceries',
        type: overrides.type ?? CategoryType.EXPENSE,
        color: overrides.color ?? CategoryColor.BLUE,
        active: overrides.active ?? true,
        userId: overrides.userId ?? 1,
        createdAt: overrides.createdAt ?? DEFAULT_ISO_DATE,
        updatedAt: overrides.updatedAt ?? DEFAULT_ISO_DATE,
    };
};

describe('CategoryService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('createCategory', () => {
        it('returns user not found when linked user is missing', async () => {
            const getUserSpy = jest.spyOn(UserService.prototype, 'getUserById').mockResolvedValue({
                success: false,
                error: Resource.USER_NOT_FOUND,
            });
            const createSpy = jest.spyOn(CategoryRepository.prototype, 'create');

            const service = new CategoryService();
            const result = await service.createCategory({
                name: 'Food',
                type: CategoryType.EXPENSE,
                color: CategoryColor.RED,
                userId: 9,
            });

            expect(getUserSpy).toHaveBeenCalledWith(9);
            expect(createSpy).not.toHaveBeenCalled();
            expect(result).toEqual({ success: false, error: Resource.USER_NOT_FOUND });
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error).toBe(Resource.USER_NOT_FOUND);
            }
        });

        it('creates category when user exists', async () => {
            const sanitized = makeSanitizedUser({ id: 2 });
            jest.spyOn(UserService.prototype, 'getUserById').mockResolvedValue({ success: true, data: sanitized });
            const created = makeDbCategory({ id: 10, userId: 2 });
            const expected = makeCategory({ id: 10, userId: 2 });
            const createSpy = jest.spyOn(CategoryRepository.prototype, 'create').mockResolvedValue(created);

            const service = new CategoryService();
            const result = await service.createCategory({
                name: 'Food',
                type: CategoryType.EXPENSE,
                color: CategoryColor.RED,
                userId: 2,
                active: true,
            });

            expect(createSpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    name: 'Food',
                    type: CategoryType.EXPENSE,
                    color: CategoryColor.RED,
                    userId: 2,
                    active: true,
                })
            );
            expect(result).toEqual({ success: true, data: expected });
        });

        it('returns internal server error when repository create fails', async () => {
            const sanitized = makeSanitizedUser({ id: 3 });
            jest.spyOn(UserService.prototype, 'getUserById').mockResolvedValue({ success: true, data: sanitized });
            jest.spyOn(CategoryRepository.prototype, 'create').mockRejectedValue(new Error(Resource.INTERNAL_SERVER_ERROR));

            const service = new CategoryService();
            const result = await service.createCategory({
                name: 'Food',
                type: CategoryType.EXPENSE,
                color: CategoryColor.GREEN,
                userId: 3,
            });

            expect(result).toEqual({ success: false, error: Resource.INTERNAL_SERVER_ERROR });
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error).toBe(Resource.INTERNAL_SERVER_ERROR);
            }
        });
    });

    describe('getCategories', () => {
        it('returns categories when repository succeeds', async () => {
            const dbCategories = [makeDbCategory({ id: 1 }), makeDbCategory({ id: 2 })];
            const expected = [makeCategory({ id: 1 }), makeCategory({ id: 2 })];
            const findManySpy = jest.spyOn(CategoryRepository.prototype, 'findMany').mockResolvedValue(dbCategories);

            const service = new CategoryService();
            const result = await service.getCategories({ limit: 2, offset: 2, sort: 'name', order: SortOrder.DESC });

            expect(findManySpy).toHaveBeenCalledWith(undefined, {
                limit: 2,
                offset: 2,
                sort: 'name',
                order: 'desc',
            });
            expect(result).toEqual({ success: true, data: expected });
        });

        it('returns internal server error when repository throws', async () => {
            jest.spyOn(CategoryRepository.prototype, 'findMany').mockRejectedValue(new Error(Resource.INTERNAL_SERVER_ERROR));

            const service = new CategoryService();
            const result = await service.getCategories();

            expect(result).toEqual({ success: false, error: Resource.INTERNAL_SERVER_ERROR });
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error).toBe(Resource.INTERNAL_SERVER_ERROR);
            }
        });
    });

    describe('countCategories', () => {
        it('returns total count when repository succeeds', async () => {
            const countSpy = jest.spyOn(CategoryRepository.prototype, 'count').mockResolvedValue(4);

            const service = new CategoryService();
            const result = await service.countCategories();

            expect(countSpy).toHaveBeenCalledTimes(1);
            expect(result).toEqual({ success: true, data: 4 });
        });

        it('returns internal server error when repository throws', async () => {
            jest.spyOn(CategoryRepository.prototype, 'count').mockRejectedValue(new Error(Resource.INTERNAL_SERVER_ERROR));

            const service = new CategoryService();
            const result = await service.countCategories();

            expect(result).toEqual({ success: false, error: Resource.INTERNAL_SERVER_ERROR });
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error).toBe(Resource.INTERNAL_SERVER_ERROR);
            }
        });
    });

    describe('getCategoryById', () => {
        it('returns no records found when repository returns null', async () => {
            const findSpy = jest.spyOn(CategoryRepository.prototype, 'findById').mockResolvedValue(null);

            const service = new CategoryService();
            const result = await service.getCategoryById(5);

            expect(findSpy).toHaveBeenCalledWith(5);
            expect(result).toEqual({ success: false, error: Resource.NO_RECORDS_FOUND });
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error).toBe(Resource.NO_RECORDS_FOUND);
            }
        });

        it('returns category when repository returns a record', async () => {
            const category = makeDbCategory({ id: 6 });
            const expected = makeCategory({ id: 6 });
            jest.spyOn(CategoryRepository.prototype, 'findById').mockResolvedValue(category);

            const service = new CategoryService();
            const result = await service.getCategoryById(6);

            expect(result).toEqual({ success: true, data: expected });
        });

        it('throws when repository lookup rejects', async () => {
            jest.spyOn(CategoryRepository.prototype, 'findById').mockRejectedValue(new Error(Resource.INTERNAL_SERVER_ERROR));

            const service = new CategoryService();
            let caught: unknown;

            try {
                await service.getCategoryById(7);
            } catch (error) {
                caught = error;
            }

            expect(caught).toBeInstanceOf(Error);
            if (caught instanceof Error) {
                expect(isResource(caught.message)).toBe(true);
                if (isResource(caught.message)) {
                }
            }
        });
    });

    describe('getCategoriesByUser', () => {
        it('returns categories when repository succeeds', async () => {
            const categories = [makeDbCategory({ id: 7, userId: 2 })];
            const expected = [makeCategory({ id: 7, userId: 2 })];
            const findManySpy = jest.spyOn(CategoryRepository.prototype, 'findMany').mockResolvedValue(categories);

            const service = new CategoryService();
            const result = await service.getCategoriesByUser(2, { limit: 3, offset: 3, sort: 'name', order: SortOrder.ASC });

            expect(findManySpy).toHaveBeenCalledWith(
                { userId: { operator: FilterOperator.EQ, value: 2 } },
                { limit: 3, offset: 3, sort: 'name', order: 'asc' }
            );
            expect(result).toEqual({ success: true, data: expected });
        });

        it('returns internal server error when repository throws', async () => {
            jest.spyOn(CategoryRepository.prototype, 'findMany').mockRejectedValue(new Error(Resource.INTERNAL_SERVER_ERROR));

            const service = new CategoryService();
            const result = await service.getCategoriesByUser(2);

            expect(result).toEqual({ success: false, error: Resource.INTERNAL_SERVER_ERROR });
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error).toBe(Resource.INTERNAL_SERVER_ERROR);
            }
        });
    });

    describe('countCategoriesByUser', () => {
        it('returns count when repository succeeds', async () => {
            const countSpy = jest.spyOn(CategoryRepository.prototype, 'count').mockResolvedValue(3);

            const service = new CategoryService();
            const result = await service.countCategoriesByUser(2);

            expect(countSpy).toHaveBeenCalledWith({ userId: { operator: FilterOperator.EQ, value: 2 } });
            expect(result).toEqual({ success: true, data: 3 });
        });

        it('returns internal server error when repository throws', async () => {
            jest.spyOn(CategoryRepository.prototype, 'count').mockRejectedValue(new Error(Resource.INTERNAL_SERVER_ERROR));

            const service = new CategoryService();
            const result = await service.countCategoriesByUser(2);

            expect(result).toEqual({ success: false, error: Resource.INTERNAL_SERVER_ERROR });
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error).toBe(Resource.INTERNAL_SERVER_ERROR);
            }
        });
    });

    describe('updateCategory', () => {
        it('ignores userId reassignment attempts', async () => {
            const updated = makeDbCategory({ id: 3, userId: 4, name: 'Updated' });
            const updateSpy = jest.spyOn(CategoryRepository.prototype, 'update').mockResolvedValue(updated);

            const service = new CategoryService();
            const result = await service.updateCategory(3, { userId: 99, name: 'Updated' } as any);

            expect(updateSpy).toHaveBeenCalledWith(3, expect.objectContaining({ name: 'Updated' }));
            expect(updateSpy).not.toHaveBeenCalledWith(3, expect.objectContaining({ userId: 99 }));
            expect(result).toEqual({ success: true, data: makeCategory({ id: 3, userId: 4, name: 'Updated' }) });
        });

        it('updates category when validation succeeds', async () => {
            const updated = makeDbCategory({ id: 4, userId: 4, name: 'Updated' });
            const expected = makeCategory({ id: 4, userId: 4, name: 'Updated' });
            const updateSpy = jest.spyOn(CategoryRepository.prototype, 'update').mockResolvedValue(updated);

            const service = new CategoryService();
            const result = await service.updateCategory(4, { name: 'Updated' });

            expect(updateSpy).toHaveBeenCalledWith(4, expect.objectContaining({ name: 'Updated' }));
            expect(result).toEqual({ success: true, data: expected });
        });

        it('returns internal server error when repository update throws', async () => {
            jest.spyOn(CategoryRepository.prototype, 'update').mockRejectedValue(new Error(Resource.INTERNAL_SERVER_ERROR));

            const service = new CategoryService();
            const result = await service.updateCategory(5, { name: 'Updated' });

            expect(result).toEqual({ success: false, error: Resource.INTERNAL_SERVER_ERROR });
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error).toBe(Resource.INTERNAL_SERVER_ERROR);
            }
        });
    });

    describe('deleteCategory', () => {
        it('returns category not found when repository returns null', async () => {
            const findSpy = jest.spyOn(CategoryRepository.prototype, 'findById').mockResolvedValue(null);
            const deleteSpy = jest.spyOn(CategoryRepository.prototype, 'delete');

            const service = new CategoryService();
            const result = await service.deleteCategory(10);

            expect(findSpy).toHaveBeenCalledWith(10);
            expect(deleteSpy).not.toHaveBeenCalled();
            expect(result).toEqual({ success: false, error: Resource.CATEGORY_NOT_FOUND });
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error).toBe(Resource.CATEGORY_NOT_FOUND);
            }
        });

        it('deletes and returns id when category exists', async () => {
            const category = makeDbCategory({ id: 11 });
            jest.spyOn(CategoryRepository.prototype, 'findById').mockResolvedValue(category);
            const deleteSpy = jest.spyOn(CategoryRepository.prototype, 'delete').mockResolvedValue();

            const service = new CategoryService();
            const result = await service.deleteCategory(11);

            expect(deleteSpy).toHaveBeenCalledWith(11);
            expect(result).toEqual({ success: true, data: { id: 11 } });
        });

        it('returns internal server error when repository delete throws', async () => {
            const category = makeDbCategory({ id: 12 });
            jest.spyOn(CategoryRepository.prototype, 'findById').mockResolvedValue(category);
            jest.spyOn(CategoryRepository.prototype, 'delete').mockRejectedValue(new Error(Resource.INTERNAL_SERVER_ERROR));

            const service = new CategoryService();
            const result = await service.deleteCategory(12);

            expect(result).toEqual({ success: false, error: Resource.INTERNAL_SERVER_ERROR });
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error).toBe(Resource.INTERNAL_SERVER_ERROR);
            }
        });
    });
});




