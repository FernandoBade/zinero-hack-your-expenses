import { SubcategoryService } from '../../../src/service/subcategoryService';
import { SubcategoryRepository } from '../../../src/repositories/subcategoryRepository';
import { CategoryService } from '../../../src/service/categoryService';
import { CategoryColor, CategoryType } from '../../../../shared/enums/category.enums';
import { FilterOperator, SortOrder } from '../../../../shared/enums/operator.enums';
import { ErrorCode as Resource } from '../../../../shared/errors/error-codes';
import type { CategoryEntity } from '../../../../shared/domains/category/category.types';
import type { SubcategoryEntity } from '../../../../shared/domains/subcategory/subcategory.types';
import { SelectSubcategory } from '../../../src/db/schema';
const isResource = (value: string): value is Resource => Object.values(Resource).includes(value as Resource);

const DEFAULT_ISO_DATE = new Date('2024-01-01T00:00:00Z').toISOString();

const makeCategory = (overrides: Partial<CategoryEntity> = {}): CategoryEntity => {
    return {
        id: overrides.id ?? 1,
        name: overrides.name ?? 'Category',
        type: overrides.type ?? CategoryType.EXPENSE,
        color: overrides.color ?? CategoryColor.BLUE,
        active: overrides.active ?? true,
        userId: overrides.userId ?? 1,
        createdAt: overrides.createdAt ?? DEFAULT_ISO_DATE,
        updatedAt: overrides.updatedAt ?? DEFAULT_ISO_DATE,
    };
};

const makeDbSubcategory = (overrides: Partial<SelectSubcategory> = {}): SelectSubcategory => {
    const now = new Date('2024-01-01T00:00:00Z');
    return {
        id: overrides.id ?? 1,
        name: overrides.name ?? 'Restaurants',
        active: overrides.active ?? true,
        categoryId: overrides.categoryId ?? 1,
        createdAt: overrides.createdAt ?? now,
        updatedAt: overrides.updatedAt ?? now,
    };
};

const makeSubcategory = (overrides: Partial<SubcategoryEntity> = {}): SubcategoryEntity => {
    return {
        id: overrides.id ?? 1,
        name: overrides.name ?? 'Restaurants',
        active: overrides.active ?? true,
        categoryId: overrides.categoryId ?? 1,
        createdAt: overrides.createdAt ?? DEFAULT_ISO_DATE,
        updatedAt: overrides.updatedAt ?? DEFAULT_ISO_DATE,
    };
};

describe('SubcategoryService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('createSubcategory', () => {
        it('returns category not found or inactive when category is inactive', async () => {
            jest.spyOn(CategoryService.prototype, 'getCategoryById').mockResolvedValue({
                success: true,
                data: makeCategory({ id: 10, active: false, userId: 1 }),
            });
            const createSpy = jest.spyOn(SubcategoryRepository.prototype, 'create');

            const service = new SubcategoryService();
            const result = await service.createSubcategory({ name: 'Coffee', categoryId: 10 }, 1);

            expect(createSpy).not.toHaveBeenCalled();
            expect(result).toEqual({ success: false, error: Resource.CATEGORY_NOT_FOUND_OR_INACTIVE });
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error).toBe(Resource.CATEGORY_NOT_FOUND_OR_INACTIVE);
            }
        });

        it('returns unauthorized operation when user does not own category', async () => {
            jest.spyOn(CategoryService.prototype, 'getCategoryById').mockResolvedValue({
                success: true,
                data: makeCategory({ id: 11, active: true, userId: 2 }),
            });
            const createSpy = jest.spyOn(SubcategoryRepository.prototype, 'create');

            const service = new SubcategoryService();
            const result = await service.createSubcategory({ name: 'Coffee', categoryId: 11 }, 1);

            expect(createSpy).not.toHaveBeenCalled();
            expect(result).toEqual({ success: false, error: Resource.UNAUTHORIZED_OPERATION });
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error).toBe(Resource.UNAUTHORIZED_OPERATION);
            }
        });

        it('creates subcategory when category is valid', async () => {
            jest.spyOn(CategoryService.prototype, 'getCategoryById').mockResolvedValue({
                success: true,
                data: makeCategory({ id: 12, active: true, userId: 1 }),
            });
            const created = makeDbSubcategory({ id: 5, categoryId: 12 });
            const expected = makeSubcategory({ id: 5, categoryId: 12 });
            const createSpy = jest.spyOn(SubcategoryRepository.prototype, 'create').mockResolvedValue(created);

            const service = new SubcategoryService();
            const result = await service.createSubcategory({ name: 'Coffee', categoryId: 12 }, 1);

            expect(createSpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    name: 'Coffee',
                    categoryId: 12,
                })
            );
            expect(result).toEqual({ success: true, data: expected });
        });

        it('returns internal server error when repository create fails', async () => {
            jest.spyOn(CategoryService.prototype, 'getCategoryById').mockResolvedValue({
                success: true,
                data: makeCategory({ id: 13, active: true, userId: 1 }),
            });
            jest.spyOn(SubcategoryRepository.prototype, 'create').mockRejectedValue(new Error(Resource.INTERNAL_SERVER_ERROR));

            const service = new SubcategoryService();
            const result = await service.createSubcategory({ name: 'Coffee', categoryId: 13 }, 1);

            expect(result).toEqual({ success: false, error: Resource.INTERNAL_SERVER_ERROR });
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error).toBe(Resource.INTERNAL_SERVER_ERROR);
            }
        });
    });

    describe('getSubcategories', () => {
        it('returns subcategories when repository succeeds', async () => {
            const subcategories = [makeDbSubcategory({ id: 1 }), makeDbSubcategory({ id: 2 })];
            const expected = [makeSubcategory({ id: 1 }), makeSubcategory({ id: 2 })];
            const findManySpy = jest.spyOn(SubcategoryRepository.prototype, 'findMany').mockResolvedValue(subcategories);

            const service = new SubcategoryService();
            const result = await service.getSubcategories({ limit: 2, offset: 2, sort: 'name', order: SortOrder.DESC });

            expect(findManySpy).toHaveBeenCalledWith(undefined, {
                limit: 2,
                offset: 2,
                sort: 'name',
                order: 'desc',
            });
            expect(result).toEqual({ success: true, data: expected });
        });

        it('returns internal server error when repository throws', async () => {
            jest.spyOn(SubcategoryRepository.prototype, 'findMany').mockRejectedValue(new Error(Resource.INTERNAL_SERVER_ERROR));

            const service = new SubcategoryService();
            const result = await service.getSubcategories();

            expect(result).toEqual({ success: false, error: Resource.INTERNAL_SERVER_ERROR });
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error).toBe(Resource.INTERNAL_SERVER_ERROR);
            }
        });
    });

    describe('countSubcategories', () => {
        it('returns total count when repository succeeds', async () => {
            const countSpy = jest.spyOn(SubcategoryRepository.prototype, 'count').mockResolvedValue(4);

            const service = new SubcategoryService();
            const result = await service.countSubcategories();

            expect(countSpy).toHaveBeenCalledTimes(1);
            expect(result).toEqual({ success: true, data: 4 });
        });

        it('returns internal server error when repository throws', async () => {
            jest.spyOn(SubcategoryRepository.prototype, 'count').mockRejectedValue(new Error(Resource.INTERNAL_SERVER_ERROR));

            const service = new SubcategoryService();
            const result = await service.countSubcategories();

            expect(result).toEqual({ success: false, error: Resource.INTERNAL_SERVER_ERROR });
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error).toBe(Resource.INTERNAL_SERVER_ERROR);
            }
        });
    });

    describe('getSubcategoriesByCategory', () => {
        it('returns subcategories when repository succeeds', async () => {
            const subcategories = [makeDbSubcategory({ id: 3, categoryId: 7 })];
            const expected = [makeSubcategory({ id: 3, categoryId: 7 })];
            const findManySpy = jest.spyOn(SubcategoryRepository.prototype, 'findMany').mockResolvedValue(subcategories);

            const service = new SubcategoryService();
            const result = await service.getSubcategoriesByCategory(7, { limit: 2, offset: 0, sort: 'name', order: SortOrder.ASC });

            expect(findManySpy).toHaveBeenCalledWith(
                { categoryId: { operator: FilterOperator.EQ, value: 7 } },
                { limit: 2, offset: 0, sort: 'name', order: 'asc' }
            );
            expect(result).toEqual({ success: true, data: expected });
        });

        it('returns internal server error when repository throws', async () => {
            jest.spyOn(SubcategoryRepository.prototype, 'findMany').mockRejectedValue(new Error(Resource.INTERNAL_SERVER_ERROR));

            const service = new SubcategoryService();
            const result = await service.getSubcategoriesByCategory(7);

            expect(result).toEqual({ success: false, error: Resource.INTERNAL_SERVER_ERROR });
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error).toBe(Resource.INTERNAL_SERVER_ERROR);
            }
        });
    });

    describe('countSubcategoriesByCategory', () => {
        it('returns count when repository succeeds', async () => {
            const countSpy = jest.spyOn(SubcategoryRepository.prototype, 'count').mockResolvedValue(2);

            const service = new SubcategoryService();
            const result = await service.countSubcategoriesByCategory(7);

            expect(countSpy).toHaveBeenCalledWith({ categoryId: { operator: FilterOperator.EQ, value: 7 } });
            expect(result).toEqual({ success: true, data: 2 });
        });

        it('returns internal server error when repository throws', async () => {
            jest.spyOn(SubcategoryRepository.prototype, 'count').mockRejectedValue(new Error(Resource.INTERNAL_SERVER_ERROR));

            const service = new SubcategoryService();
            const result = await service.countSubcategoriesByCategory(7);

            expect(result).toEqual({ success: false, error: Resource.INTERNAL_SERVER_ERROR });
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error).toBe(Resource.INTERNAL_SERVER_ERROR);
            }
        });
    });

    describe('getSubcategoryById', () => {
        it('returns no records found when repository returns null', async () => {
            const findSpy = jest.spyOn(SubcategoryRepository.prototype, 'findById').mockResolvedValue(null);

            const service = new SubcategoryService();
            const result = await service.getSubcategoryById(9);

            expect(findSpy).toHaveBeenCalledWith(9);
            expect(result).toEqual({ success: false, error: Resource.NO_RECORDS_FOUND });
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error).toBe(Resource.NO_RECORDS_FOUND);
            }
        });

        it('returns subcategory when repository returns a record', async () => {
            const subcategory = makeDbSubcategory({ id: 10 });
            const expected = makeSubcategory({ id: 10 });
            jest.spyOn(SubcategoryRepository.prototype, 'findById').mockResolvedValue(subcategory);

            const service = new SubcategoryService();
            const result = await service.getSubcategoryById(10);

            expect(result).toEqual({ success: true, data: expected });
        });

        it('throws when repository lookup rejects', async () => {
            jest.spyOn(SubcategoryRepository.prototype, 'findById').mockRejectedValue(new Error(Resource.INTERNAL_SERVER_ERROR));

            const service = new SubcategoryService();
            let caught: unknown;

            try {
                await service.getSubcategoryById(11);
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

    describe('getSubcategoriesByUser', () => {
        it('returns no records found when user has no categories', async () => {
            const categoriesSpy = jest.spyOn(CategoryService.prototype, 'getCategoriesByUser').mockResolvedValue({
                success: false,
                error: Resource.NO_RECORDS_FOUND,
            });
            const findManySpy = jest.spyOn(SubcategoryRepository.prototype, 'findMany');

            const service = new SubcategoryService();
            const result = await service.getSubcategoriesByUser(5);

            expect(categoriesSpy).toHaveBeenCalledWith(5);
            expect(findManySpy).not.toHaveBeenCalled();
            expect(result).toEqual({ success: false, error: Resource.NO_RECORDS_FOUND });
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error).toBe(Resource.NO_RECORDS_FOUND);
            }
        });

        it('returns subcategories grouped across user categories', async () => {
            jest.spyOn(CategoryService.prototype, 'getCategoriesByUser').mockResolvedValue({
                success: true,
                data: [makeCategory({ id: 1 }), makeCategory({ id: 2 })],
            });
            const allBatch = [
                makeDbSubcategory({ id: 1, categoryId: 1 }),
                makeDbSubcategory({ id: 2, categoryId: 2 }),
            ];
            const expected = [
                makeSubcategory({ id: 1, categoryId: 1 }),
                makeSubcategory({ id: 2, categoryId: 2 }),
            ];
            const findManySpy = jest.spyOn(SubcategoryRepository.prototype, 'findMany')
                .mockResolvedValue(allBatch);

            const service = new SubcategoryService();
            const result = await service.getSubcategoriesByUser(5, { limit: 5, offset: 0, sort: 'name', order: SortOrder.ASC });

            expect(findManySpy).toHaveBeenCalledTimes(1);
            expect(findManySpy).toHaveBeenCalledWith(
                { categoryId: { operator: FilterOperator.IN, value: [1, 2] } },
                { limit: 5, offset: 0, sort: 'name', order: 'asc' }
            );
            expect(result).toEqual({ success: true, data: expected });
        });

        it('returns internal server error when repository throws', async () => {
            jest.spyOn(CategoryService.prototype, 'getCategoriesByUser').mockResolvedValue({
                success: true,
                data: [makeCategory({ id: 1 })],
            });
            jest.spyOn(SubcategoryRepository.prototype, 'findMany').mockRejectedValue(new Error(Resource.INTERNAL_SERVER_ERROR));

            const service = new SubcategoryService();
            const result = await service.getSubcategoriesByUser(5);

            expect(result).toEqual({ success: false, error: Resource.INTERNAL_SERVER_ERROR });
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error).toBe(Resource.INTERNAL_SERVER_ERROR);
            }
        });
    });

    describe('countSubcategoriesByUser', () => {
        it('returns no records found when user has no categories', async () => {
            jest.spyOn(CategoryService.prototype, 'getCategoriesByUser').mockResolvedValue({
                success: true,
                data: [],
            });
            const countSpy = jest.spyOn(SubcategoryRepository.prototype, 'count');

            const service = new SubcategoryService();
            const result = await service.countSubcategoriesByUser(6);

            expect(countSpy).not.toHaveBeenCalled();
            expect(result).toEqual({ success: false, error: Resource.NO_RECORDS_FOUND });
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error).toBe(Resource.NO_RECORDS_FOUND);
            }
        });

        it('returns count when repository succeeds', async () => {
            jest.spyOn(CategoryService.prototype, 'getCategoriesByUser').mockResolvedValue({
                success: true,
                data: [makeCategory({ id: 3 }), makeCategory({ id: 4 })],
            });
            const countSpy = jest.spyOn(SubcategoryRepository.prototype, 'count').mockResolvedValue(5);

            const service = new SubcategoryService();
            const result = await service.countSubcategoriesByUser(6);

            expect(countSpy).toHaveBeenCalledWith({ categoryId: { operator: FilterOperator.IN, value: [3, 4] } });
            expect(result).toEqual({ success: true, data: 5 });
        });

        it('returns internal server error when repository throws', async () => {
            jest.spyOn(CategoryService.prototype, 'getCategoriesByUser').mockResolvedValue({
                success: true,
                data: [makeCategory({ id: 3 })],
            });
            jest.spyOn(SubcategoryRepository.prototype, 'count').mockRejectedValue(new Error(Resource.INTERNAL_SERVER_ERROR));

            const service = new SubcategoryService();
            const result = await service.countSubcategoriesByUser(6);

            expect(result).toEqual({ success: false, error: Resource.INTERNAL_SERVER_ERROR });
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error).toBe(Resource.INTERNAL_SERVER_ERROR);
            }
        });
    });

    describe('updateSubcategory', () => {
        it('returns category not found or inactive when category is inactive', async () => {
            jest.spyOn(CategoryService.prototype, 'getCategoryById').mockResolvedValue({
                success: true,
                data: makeCategory({ id: 20, active: false, userId: 1 }),
            });
            const updateSpy = jest.spyOn(SubcategoryRepository.prototype, 'update');

            const service = new SubcategoryService();
            const result = await service.updateSubcategory(3, { categoryId: 20 }, 1);

            expect(updateSpy).not.toHaveBeenCalled();
            expect(result).toEqual({ success: false, error: Resource.CATEGORY_NOT_FOUND_OR_INACTIVE });
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error).toBe(Resource.CATEGORY_NOT_FOUND_OR_INACTIVE);
            }
        });

        it('returns unauthorized operation when user does not own category', async () => {
            jest.spyOn(CategoryService.prototype, 'getCategoryById').mockResolvedValue({
                success: true,
                data: makeCategory({ id: 21, active: true, userId: 2 }),
            });
            const updateSpy = jest.spyOn(SubcategoryRepository.prototype, 'update');

            const service = new SubcategoryService();
            const result = await service.updateSubcategory(4, { categoryId: 21 }, 1);

            expect(updateSpy).not.toHaveBeenCalled();
            expect(result).toEqual({ success: false, error: Resource.UNAUTHORIZED_OPERATION });
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error).toBe(Resource.UNAUTHORIZED_OPERATION);
            }
        });

        it('updates subcategory when validation succeeds', async () => {
            jest.spyOn(CategoryService.prototype, 'getCategoryById').mockResolvedValue({
                success: true,
                data: makeCategory({ id: 22, active: true, userId: 1 }),
            });
            const updated = makeDbSubcategory({ id: 5, categoryId: 22, name: 'Updated' });
            const expected = makeSubcategory({ id: 5, categoryId: 22, name: 'Updated' });
            const updateSpy = jest.spyOn(SubcategoryRepository.prototype, 'update').mockResolvedValue(updated);

            const service = new SubcategoryService();
            const result = await service.updateSubcategory(5, { categoryId: 22, name: 'Updated' }, 1);

            expect(updateSpy).toHaveBeenCalledWith(5, expect.objectContaining({ categoryId: 22, name: 'Updated' }));
            expect(result).toEqual({ success: true, data: expected });
        });

        it('returns internal server error when repository update throws', async () => {
            jest.spyOn(CategoryService.prototype, 'getCategoryById').mockResolvedValue({
                success: true,
                data: makeCategory({ id: 23, active: true, userId: 1 }),
            });
            jest.spyOn(SubcategoryRepository.prototype, 'update').mockRejectedValue(new Error(Resource.INTERNAL_SERVER_ERROR));

            const service = new SubcategoryService();
            const result = await service.updateSubcategory(6, { categoryId: 23 }, 1);

            expect(result).toEqual({ success: false, error: Resource.INTERNAL_SERVER_ERROR });
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error).toBe(Resource.INTERNAL_SERVER_ERROR);
            }
        });
    });

    describe('deleteSubcategory', () => {
        it('returns subcategory not found when repository returns null', async () => {
            const findSpy = jest.spyOn(SubcategoryRepository.prototype, 'findById').mockResolvedValue(null);
            const deleteSpy = jest.spyOn(SubcategoryRepository.prototype, 'delete');

            const service = new SubcategoryService();
            const result = await service.deleteSubcategory(7);

            expect(findSpy).toHaveBeenCalledWith(7);
            expect(deleteSpy).not.toHaveBeenCalled();
            expect(result).toEqual({ success: false, error: Resource.SUBCATEGORY_NOT_FOUND });
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error).toBe(Resource.SUBCATEGORY_NOT_FOUND);
            }
        });

        it('deletes and returns id when subcategory exists', async () => {
            const subcategory = makeDbSubcategory({ id: 8 });
            jest.spyOn(SubcategoryRepository.prototype, 'findById').mockResolvedValue(subcategory);
            const deleteSpy = jest.spyOn(SubcategoryRepository.prototype, 'delete').mockResolvedValue();

            const service = new SubcategoryService();
            const result = await service.deleteSubcategory(8);

            expect(deleteSpy).toHaveBeenCalledWith(8);
            expect(result).toEqual({ success: true, data: { id: 8 } });
        });

        it('returns internal server error when repository delete throws', async () => {
            const subcategory = makeDbSubcategory({ id: 9 });
            jest.spyOn(SubcategoryRepository.prototype, 'findById').mockResolvedValue(subcategory);
            jest.spyOn(SubcategoryRepository.prototype, 'delete').mockRejectedValue(new Error(Resource.INTERNAL_SERVER_ERROR));

            const service = new SubcategoryService();
            const result = await service.deleteSubcategory(9);

            expect(result).toEqual({ success: false, error: Resource.INTERNAL_SERVER_ERROR });
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error).toBe(Resource.INTERNAL_SERVER_ERROR);
            }
        });
    });
});



