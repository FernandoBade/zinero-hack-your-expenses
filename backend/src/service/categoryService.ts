import { FilterOperator, SortOrder } from '../../../shared/enums/operator.enums';
import { CategoryRepository } from '../repositories/categoryRepository';
import { UserService } from './userService';
import { ErrorCode } from '../../../shared/errors/error-codes';
import { SelectCategory, InsertCategory } from '../db/schema';
import { QueryOptions } from '../utils/pagination';
import type { CategoryEntity, CreateCategoryInput, UpdateCategoryInput } from '../../../shared/domains/category/category.types';

/**
 * Service for category business logic.
 * Handles category operations including validation and user linking.
 */
export class CategoryService {
    private categoryRepository: CategoryRepository;

    constructor() {
        this.categoryRepository = new CategoryRepository();
    }

        /**
     * @summary Maps category rows to API entities with ISO timestamp serialization.
     */
    private toCategoryEntity(data: SelectCategory): CategoryEntity {
        return {
            ...data,
            createdAt: data.createdAt.toISOString(),
            updatedAt: data.updatedAt.toISOString(),
        };
    }

    /**
     * Creates a new category linked to a valid user.
     *
     * @summary Creates a new category for a user.
     * @param data - Category creation data.
     * @returns The created category record.
     */
    async createCategory(data: CreateCategoryInput): Promise<{ success: true; data: CategoryEntity } | { success: false; error: ErrorCode }> {
        const userService = new UserService();
        const user = await userService.getUserById(data.userId);

        if (!user.success || !user.data) {
            return { success: false, error: ErrorCode.USER_NOT_FOUND };
        }

        try {
            const created = await this.categoryRepository.create({
                ...data,
                userId: data.userId,
            } as InsertCategory);
            return { success: true, data: this.toCategoryEntity(created) };
        } catch {
            return { success: false, error: ErrorCode.INTERNAL_SERVER_ERROR };
        }
    }

        /**
     * @summary Retrieves categories with optional pagination and sorting.
     * @param options - Query options for pagination and sorting.
     * @returns A list of all categories.
     */

    async getCategories(options?: QueryOptions<SelectCategory>): Promise<{ success: true; data: CategoryEntity[] } | { success: false; error: ErrorCode }> {
        try {
            const categories = await this.categoryRepository.findMany(undefined, {
                limit: options?.limit,
                offset: options?.offset,
                sort: options?.sort as keyof SelectCategory,
                order: options?.order === SortOrder.DESC ? SortOrder.DESC : SortOrder.ASC,
            });
            return { success: true, data: categories.map(category => this.toCategoryEntity(category)) };
        } catch {
            return { success: false, error: ErrorCode.INTERNAL_SERVER_ERROR };
        }
    }

        /**
     * @summary Counts categories.
     * @returns Total category count.
     */

    async countCategories(): Promise<{ success: true; data: number } | { success: false; error: ErrorCode }> {
        try {
            const count = await this.categoryRepository.count();
            return { success: true, data: count };
        } catch {
            return { success: false, error: ErrorCode.INTERNAL_SERVER_ERROR };
        }
    }

        /**
     * @summary Retrieves a category by ID.
     * @param id - ID of the category.
     * @returns The category if found.
     */

    async getCategoryById(id: number): Promise<{ success: true; data: CategoryEntity } | { success: false; error: ErrorCode }> {
        const category = await this.categoryRepository.findById(id);
        if (!category) {
            return { success: false, error: ErrorCode.NO_RECORDS_FOUND };
        }
        return { success: true, data: this.toCategoryEntity(category) };
    }

        /**
     * @summary Retrieves categories for a user.
     * @param userId - ID of the user.
     * @returns A list of categories owned by the user.
     */

    async getCategoriesByUser(userId: number, options?: QueryOptions<SelectCategory>): Promise<{ success: true; data: CategoryEntity[] } | { success: false; error: ErrorCode }> {
        try {
            const categories = await this.categoryRepository.findMany({
                userId: { operator: FilterOperator.EQ, value: userId }
            }, {
                limit: options?.limit,
                offset: options?.offset,
                sort: options?.sort as keyof SelectCategory,
                order: options?.order === SortOrder.DESC ? SortOrder.DESC : SortOrder.ASC,
            });
            return { success: true, data: categories.map(category => this.toCategoryEntity(category)) };
        } catch {
            return { success: false, error: ErrorCode.INTERNAL_SERVER_ERROR };
        }
    }

        /**
     * @summary Counts categories for a user.
     * @param userId - User ID.
     * @returns Count of user's categories.
     */

    async countCategoriesByUser(userId: number): Promise<{ success: true; data: number } | { success: false; error: ErrorCode }> {
        try {
            const count = await this.categoryRepository.count({
                userId: { operator: FilterOperator.EQ, value: userId }
            });
            return { success: true, data: count };
        } catch {
            return { success: false, error: ErrorCode.INTERNAL_SERVER_ERROR };
        }
    }

    /**
     * Updates a category by ID.
     * Validates the user if the userId is being changed.
     *
     * @summary Updates category data.
     * @param id - ID of the category.
     * @param data - Partial category data to update.
     * @returns Updated category record.
     */
    async updateCategory(id: number, data: UpdateCategoryInput): Promise<{ success: true; data: CategoryEntity } | { success: false; error: ErrorCode }> {
        if (data.userId !== undefined) {
            const userService = new UserService();
            const user = await userService.getUserById(data.userId);

            if (!user.success || !user.data) {
                return { success: false, error: ErrorCode.USER_NOT_FOUND };
            }
        }

        try {
            const updated = await this.categoryRepository.update(id, data);
            return { success: true, data: this.toCategoryEntity(updated) };
        } catch {
            return { success: false, error: ErrorCode.INTERNAL_SERVER_ERROR };
        }
    }

    /**
     * Deletes a category by ID after validating its existence.
     *
     * @summary Removes a category from the database.
     * @param id - ID of the category to delete.
     * @returns Success with deleted ID, or error if category does not exist.
     */
    async deleteCategory(id: number): Promise<{ success: true; data: { id: number } } | { success: false; error: ErrorCode }> {
        const existing = await this.categoryRepository.findById(id);
        if (!existing) {
            return { success: false, error: ErrorCode.CATEGORY_NOT_FOUND };
        }

        try {
            await this.categoryRepository.delete(id);
            return { success: true, data: { id } };
        } catch {
            return { success: false, error: ErrorCode.INTERNAL_SERVER_ERROR };
        }
    }
}




