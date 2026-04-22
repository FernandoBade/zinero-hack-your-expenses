import type { CategoryColor, CategoryType } from './category.enums';
import type { UserId } from '../user/user.types';
import type { ISODateString } from '../../types/format.types';
import type { PaginationInput, PaginatedResult } from '../../types/pagination.types';

/** @summary Unique identifier for a category. */
export type CategoryId = number;

/** @summary Category display name. */
export type CategoryName = string;

/** @summary Category record persisted by the system. */
export interface CategoryEntity {
    id: CategoryId;
    name: CategoryName | null;
    type: CategoryType;
    color: CategoryColor;
    active: boolean;
    userId: UserId;
    createdAt: ISODateString;
    updatedAt: ISODateString;
}

/** @summary Input payload for category creation. */
export interface CreateCategoryInput {
    name: CategoryName;
    type: CategoryType;
    color?: CategoryColor;
    active?: boolean;
}

/** @summary Backend-only category creation payload with derived ownership. */
export interface CreateOwnedCategoryInput extends CreateCategoryInput {
    userId: UserId;
}

/** @summary Input payload for category updates. */
export interface UpdateCategoryInput {
    name?: CategoryName;
    type?: CategoryType;
    color?: CategoryColor;
    active?: boolean;
}

/** @summary Input payload for listing categories. */
export interface GetCategoriesInput extends PaginationInput {}

/** @summary Input payload for fetching a category by id. */
export interface GetCategoryByIdInput {
    id: CategoryId;
}

/** @summary Input payload for listing categories by user. */
export interface GetCategoriesByUserInput extends PaginationInput {
    userId: UserId;
}

/** @summary Update request payload with target id and data. */
export interface UpdateCategoryRequest {
    id: CategoryId;
    data: UpdateCategoryInput;
}

/** @summary Input payload for deleting a category. */
export interface DeleteCategoryInput {
    id: CategoryId;
}

/** @summary Output payload for category creation. */
export type CreateCategoryOutput = CategoryEntity;

/** @summary Output payload for listing categories. */
export type GetCategoriesOutput = PaginatedResult<CategoryEntity>;

/** @summary Output payload for fetching a category by id. */
export type GetCategoryByIdOutput = CategoryEntity;

/** @summary Output payload for listing categories by user. */
export type GetCategoriesByUserOutput = PaginatedResult<CategoryEntity>;

/** @summary Output payload for category updates. */
export type UpdateCategoryOutput = CategoryEntity;

/** @summary Output payload for category deletion. */
export interface DeleteCategoryOutput {
    id: CategoryId;
}
