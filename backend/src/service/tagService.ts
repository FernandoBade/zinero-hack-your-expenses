import { FilterOperator, SortOrder } from '../../../shared/enums/operator.enums';
import { TagRepository } from '../repositories/tagRepository';
import { UserService } from './userService';
import { ErrorCode } from '../../../shared/errors/error-codes';
import { SelectTag, InsertTag } from '../db/schema';
import { QueryOptions } from '../utils/pagination';
import type { CreateTagInput, TagEntity, UpdateTagInput } from '../../../shared/domains/tag/tag.types';

/**
 * Service for tag business logic.
 * Handles tag operations including validation and user linking.
 */
export class TagService {
    private tagRepository: TagRepository;

    constructor() {
        this.tagRepository = new TagRepository();
    }

        /**
     * @summary Maps tag rows to API entities with ISO timestamp serialization.
     */
    private toTagEntity(data: SelectTag): TagEntity {
        return {
            ...data,
            createdAt: data.createdAt.toISOString(),
            updatedAt: data.updatedAt.toISOString(),
        };
    }

    /**
     * Creates a new tag linked to a valid user.
     *
     * @summary Creates a new tag for a user.
     * @param data - Tag creation data.
     * @returns The created tag record.
     */
    async createTag(data: CreateTagInput): Promise<{ success: true; data: TagEntity } | { success: false; error: ErrorCode }> {
        const userService = new UserService();
        const user = await userService.getUserById(data.userId);

        if (!user.success || !user.data) {
            return { success: false, error: ErrorCode.USER_NOT_FOUND };
        }

        const existing = await this.tagRepository.findMany({
            userId: { operator: FilterOperator.EQ, value: data.userId },
            name: { operator: FilterOperator.EQ, value: data.name }
        });

        if (existing.length > 0) {
            return { success: false, error: ErrorCode.DATA_ALREADY_EXISTS };
        }

        try {
            const created = await this.tagRepository.create({
                name: data.name,
                active: data.active,
                userId: data.userId,
            } as InsertTag);
            return { success: true, data: this.toTagEntity(created) };
        } catch {
            return { success: false, error: ErrorCode.INTERNAL_SERVER_ERROR };
        }
    }

        /**
     * @summary Retrieves tags with optional pagination and sorting.
     * @param options - Query options for pagination and sorting.
     * @returns A list of all tags.
     */

    async getTags(options?: QueryOptions<SelectTag>): Promise<{ success: true; data: TagEntity[] } | { success: false; error: ErrorCode }> {
        try {
            const tags = await this.tagRepository.findMany(undefined, {
                limit: options?.limit,
                offset: options?.offset,
                sort: options?.sort as keyof SelectTag,
                order: options?.order === SortOrder.DESC ? SortOrder.DESC : SortOrder.ASC,
            });
            return { success: true, data: tags.map(tag => this.toTagEntity(tag)) };
        } catch {
            return { success: false, error: ErrorCode.INTERNAL_SERVER_ERROR };
        }
    }

        /**
     * @summary Counts tags.
     * @returns Total tag count.
     */

    async countTags(): Promise<{ success: true; data: number } | { success: false; error: ErrorCode }> {
        try {
            const count = await this.tagRepository.count();
            return { success: true, data: count };
        } catch {
            return { success: false, error: ErrorCode.INTERNAL_SERVER_ERROR };
        }
    }

        /**
     * @summary Retrieves a tag by ID.
     * @param id - ID of the tag.
     * @returns Tag record if found.
     */

    async getTagById(id: number): Promise<{ success: true; data: TagEntity } | { success: false; error: ErrorCode }> {
        const tag = await this.tagRepository.findById(id);
        if (!tag) {
            return { success: false, error: ErrorCode.TAG_NOT_FOUND };
        }
        return { success: true, data: this.toTagEntity(tag) };
    }

        /**
     * @summary Retrieves tags for a user.
     * @param userId - ID of the user.
     * @returns A list of tags owned by the user.
     */

    async getTagsByUser(userId: number, options?: QueryOptions<SelectTag>): Promise<{ success: true; data: TagEntity[] } | { success: false; error: ErrorCode }> {
        try {
            const tags = await this.tagRepository.findMany({
                userId: { operator: FilterOperator.EQ, value: userId }
            }, {
                limit: options?.limit,
                offset: options?.offset,
                sort: options?.sort as keyof SelectTag,
                order: options?.order === SortOrder.DESC ? SortOrder.DESC : SortOrder.ASC,
            });
            return { success: true, data: tags.map(tag => this.toTagEntity(tag)) };
        } catch {
            return { success: false, error: ErrorCode.INTERNAL_SERVER_ERROR };
        }
    }

        /**
     * @summary Counts tags for a user.
     * @param userId - User ID.
     * @returns Count of user's tags.
     */

    async countTagsByUser(userId: number): Promise<{ success: true; data: number } | { success: false; error: ErrorCode }> {
        try {
            const count = await this.tagRepository.count({
                userId: { operator: FilterOperator.EQ, value: userId }
            });
            return { success: true, data: count };
        } catch {
            return { success: false, error: ErrorCode.INTERNAL_SERVER_ERROR };
        }
    }

    /**
     * Updates a tag by ID.
     * Validates the user if the userId is being changed and enforces uniqueness.
     *
     * @summary Updates tag data.
     * @param id - ID of the tag.
     * @param data - Partial tag data to update.
     * @returns Updated tag record.
     */
    async updateTag(id: number, data: UpdateTagInput): Promise<{ success: true; data: TagEntity } | { success: false; error: ErrorCode }> {
        if (data.userId !== undefined) {
            const userService = new UserService();
            const user = await userService.getUserById(data.userId);

            if (!user.success || !user.data) {
                return { success: false, error: ErrorCode.USER_NOT_FOUND };
            }
        }

        if (data.userId !== undefined || data.name !== undefined) {
            const current = await this.tagRepository.findById(id);
            if (!current) {
                return { success: false, error: ErrorCode.TAG_NOT_FOUND };
            }

            const effectiveUserId = data.userId ?? current.userId;
            const effectiveName = data.name ?? current.name;

            if (effectiveName) {
                const existing = await this.tagRepository.findMany({
                    userId: { operator: FilterOperator.EQ, value: effectiveUserId },
                    name: { operator: FilterOperator.EQ, value: effectiveName }
                });
                if (existing.length > 0 && existing[0].id !== id) {
                    return { success: false, error: ErrorCode.DATA_ALREADY_EXISTS };
                }
            }
        }

        try {
            const updated = await this.tagRepository.update(id, data);
            return { success: true, data: this.toTagEntity(updated) };
        } catch {
            return { success: false, error: ErrorCode.INTERNAL_SERVER_ERROR };
        }
    }

    /**
     * Deletes a tag by ID after validating its existence.
     *
     * @summary Removes a tag from the database.
     * @param id - ID of the tag to delete.
     * @returns Success with deleted ID, or error if tag does not exist.
     */
    async deleteTag(id: number): Promise<{ success: true; data: { id: number } } | { success: false; error: ErrorCode }> {
        const existing = await this.tagRepository.findById(id);
        if (!existing) {
            return { success: false, error: ErrorCode.TAG_NOT_FOUND };
        }

        try {
            await this.tagRepository.delete(id);
            return { success: true, data: { id } };
        } catch {
            return { success: false, error: ErrorCode.INTERNAL_SERVER_ERROR };
        }
    }
}




