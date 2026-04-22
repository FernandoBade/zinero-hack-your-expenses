import { FilterOperator, SortOrder } from '../../../shared/enums/operator.enums';
import { SubcategoryRepository } from '../repositories/subcategoryRepository';
import { CategoryService } from './categoryService';
import { ErrorCode } from '../../../shared/errors/error-codes';
import { SelectSubcategory, InsertSubcategory } from '../db/schema';
import { QueryOptions } from '../utils/pagination';
import type { CreateSubcategoryInput, SubcategoryEntity, UpdateSubcategoryInput } from '../../../shared/domains/subcategory/subcategory.types';

/**
 * Service for subcategory business logic.
 * Handles subcategory operations including validation and category linking.
 */
export class SubcategoryService {
    private subcategoryRepository: SubcategoryRepository;

    constructor() {
        this.subcategoryRepository = new SubcategoryRepository();
    }

        /**
     * @summary Maps subcategory rows to API entities with ISO timestamp serialization.
     */
    private toSubcategoryEntity(data: SelectSubcategory): SubcategoryEntity {
        return {
            ...data,
            createdAt: data.createdAt.toISOString(),
            updatedAt: data.updatedAt.toISOString(),
        };
    }

    /**
     * Creates a new subcategory.
     * Ensures the required data is present and linked to a valid and authorized category.
     *
     * @summary Creates a new subcategory for a category.
     * @param data - Subcategory creation data.
     * @param userId - Optional ID of the user performing the operation.
     * @returns The created subcategory record.
     */
    async createSubcategory(data: CreateSubcategoryInput, userId?: number): Promise<{ success: true; data: SubcategoryEntity } | { success: false; error: ErrorCode }> {
        const categoryService = new CategoryService();
        const category = await categoryService.getCategoryById(data.categoryId);

        if (!category.success || !category.data?.active) {
            return { success: false, error: ErrorCode.CATEGORY_NOT_FOUND_OR_INACTIVE };
        }

        if (userId !== undefined && category.data.userId !== userId) {
            return { success: false, error: ErrorCode.UNAUTHORIZED_OPERATION };
        }

        try {
            const created = await this.subcategoryRepository.create({
                ...data,
                categoryId: data.categoryId,
            } as InsertSubcategory);
            return { success: true, data: this.toSubcategoryEntity(created) };
        } catch {
            return { success: false, error: ErrorCode.INTERNAL_SERVER_ERROR };
        }
    }

        /**
     * @summary Retrieves subcategories with optional pagination and sorting.
     * @param options - Query options for pagination and sorting.
     * @returns A list of all subcategories.
     */

    async getSubcategories(options?: QueryOptions<SelectSubcategory>): Promise<{ success: true; data: SubcategoryEntity[] } | { success: false; error: ErrorCode }> {
        try {
            const subcategories = await this.subcategoryRepository.findMany(undefined, {
                limit: options?.limit,
                offset: options?.offset,
                sort: options?.sort as keyof SelectSubcategory,
                order: options?.order === SortOrder.DESC ? SortOrder.DESC : SortOrder.ASC,
            });
            return { success: true, data: subcategories.map(subcategory => this.toSubcategoryEntity(subcategory)) };
        } catch {
            return { success: false, error: ErrorCode.INTERNAL_SERVER_ERROR };
        }
    }

        /**
     * @summary Counts subcategories.
     * @returns Total subcategory count.
     */

    async countSubcategories(): Promise<{ success: true; data: number } | { success: false; error: ErrorCode }> {
        try {
            const count = await this.subcategoryRepository.count();
            return { success: true, data: count };
        } catch {
            return { success: false, error: ErrorCode.INTERNAL_SERVER_ERROR };
        }
    }

        /**
     * @summary Retrieves subcategories for a category.
     * @param categoryId - ID of the parent category.
     * @returns A list of subcategories under the specified category.
     */

    async getSubcategoriesByCategory(categoryId: number, options?: QueryOptions<SelectSubcategory>): Promise<{ success: true; data: SubcategoryEntity[] } | { success: false; error: ErrorCode }> {
        try {
            const subcategories = await this.subcategoryRepository.findMany({
                categoryId: { operator: FilterOperator.EQ, value: categoryId }
            }, {
                limit: options?.limit,
                offset: options?.offset,
                sort: options?.sort as keyof SelectSubcategory,
                order: options?.order === SortOrder.DESC ? SortOrder.DESC : SortOrder.ASC,
            });
            return { success: true, data: subcategories.map(subcategory => this.toSubcategoryEntity(subcategory)) };
        } catch {
            return { success: false, error: ErrorCode.INTERNAL_SERVER_ERROR };
        }
    }

        /**
     * @summary Counts subcategories for a category.
     * @param categoryId - Category ID.
     * @returns Count of subcategories.
     */

    async countSubcategoriesByCategory(categoryId: number): Promise<{ success: true; data: number } | { success: false; error: ErrorCode }> {
        try {
            const count = await this.subcategoryRepository.count({
                categoryId: { operator: FilterOperator.EQ, value: categoryId }
            });
            return { success: true, data: count };
        } catch {
            return { success: false, error: ErrorCode.INTERNAL_SERVER_ERROR };
        }
    }

        /**
     * @summary Retrieves a subcategory by ID.
     * @param id - ID of the subcategory.
     * @returns Subcategory record if found.
     */

    async getSubcategoryById(id: number): Promise<{ success: true; data: SubcategoryEntity } | { success: false; error: ErrorCode }> {
        const subcategory = await this.subcategoryRepository.findById(id);
        if (!subcategory) {
            return { success: false, error: ErrorCode.NO_RECORDS_FOUND };
        }
        return { success: true, data: this.toSubcategoryEntity(subcategory) };
    }

        /**
     * @summary Retrieves subcategories for a user's categories.
     * @param userId - ID of the user whose subcategories are being requested.
     * @returns A list of subcategories across all categories owned by the user.
     */

    async getSubcategoriesByUser(userId: number, options?: QueryOptions<SelectSubcategory>): Promise<{ success: true; data: SubcategoryEntity[] } | { success: false; error: ErrorCode }> {
        const categoryService = new CategoryService();
        const userCategories = await categoryService.getCategoriesByUser(userId);

        if (!userCategories.success || !userCategories.data?.length) {
            return { success: false, error: ErrorCode.NO_RECORDS_FOUND };
        }

        const categoryIds = userCategories.data.map(c => c.id);

        try {
            const allSubcategories = await this.subcategoryRepository.findMany({
                categoryId: { operator: FilterOperator.IN, value: categoryIds }
            }, {
                limit: options?.limit,
                offset: options?.offset,
                sort: options?.sort as keyof SelectSubcategory,
                order: options?.order === SortOrder.DESC ? SortOrder.DESC : SortOrder.ASC,
            });

            return { success: true, data: allSubcategories.map(subcategory => this.toSubcategoryEntity(subcategory)) };
        } catch {
            return { success: false, error: ErrorCode.INTERNAL_SERVER_ERROR };
        }
    }

        /**
     * @summary Counts subcategories for a user's categories.
     * @param userId - User ID.
     * @returns Count of subcategories.
     */

    async countSubcategoriesByUser(userId: number): Promise<{ success: true; data: number } | { success: false; error: ErrorCode }> {
        const categoryService = new CategoryService();
        const userCategories = await categoryService.getCategoriesByUser(userId);

        if (!userCategories.success || !userCategories.data?.length) {
            return { success: false, error: ErrorCode.NO_RECORDS_FOUND };
        }

        const categoryIds = userCategories.data.map(c => c.id);

        try {
            const total = await this.subcategoryRepository.count({
                categoryId: { operator: FilterOperator.IN, value: categoryIds }
            });
            return { success: true, data: total };
        } catch {
            return { success: false, error: ErrorCode.INTERNAL_SERVER_ERROR };
        }
    }

    /**
     * Updates a subcategory by ID.
     * Validates the category if the categoryId is being changed, including ownership.
     *
     * @summary Updates subcategory data.
     * @param id - ID of the subcategory.
     * @param data - Partial subcategory data to update.
     * @param userId - Optional ID of the user performing the operation.
     * @returns Updated subcategory record.
     */
    async updateSubcategory(id: number, data: UpdateSubcategoryInput, userId?: number): Promise<{ success: true; data: SubcategoryEntity } | { success: false; error: ErrorCode }> {
        if (data.categoryId !== undefined) {
            const categoryService = new CategoryService();
            const category = await categoryService.getCategoryById(data.categoryId);

            if (!category.success || !category.data?.active) {
                return { success: false, error: ErrorCode.CATEGORY_NOT_FOUND_OR_INACTIVE };
            }

            if (userId !== undefined && category.data.userId !== userId) {
                return { success: false, error: ErrorCode.UNAUTHORIZED_OPERATION };
            }
        }

        try {
            const updated = await this.subcategoryRepository.update(id, data);
            return { success: true, data: this.toSubcategoryEntity(updated) };
        } catch {
            return { success: false, error: ErrorCode.INTERNAL_SERVER_ERROR };
        }
    }

    /**
     * Deletes a subcategory by ID after verifying its existence.
     *
     * @summary Removes a subcategory from the database.
     * @param id - ID of the subcategory.
     * @returns Success with deleted ID, or error if subcategory does not exist.
     */
    async deleteSubcategory(id: number): Promise<{ success: true; data: { id: number } } | { success: false; error: ErrorCode }> {
        const existing = await this.subcategoryRepository.findById(id);
        if (!existing) {
            return { success: false, error: ErrorCode.SUBCATEGORY_NOT_FOUND };
        }

        try {
            await this.subcategoryRepository.delete(id);
            return { success: true, data: { id } };
        } catch {
            return { success: false, error: ErrorCode.INTERNAL_SERVER_ERROR };
        }
    }
}




