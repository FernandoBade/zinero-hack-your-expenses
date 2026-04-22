import type { UserId } from '../user/user.types';
import type { ISODateString } from '../../types/format.types';
import type { PaginationInput, PaginatedResult } from '../../types/pagination.types';

/** @summary Unique identifier for a tag. */
export type TagId = number;

/** @summary Tag display name. */
export type TagName = string;

/** @summary Tag record persisted by the system. */
export interface TagEntity {
    id: TagId;
    userId: UserId;
    name: TagName | null;
    active: boolean;
    createdAt: ISODateString;
    updatedAt: ISODateString;
}

/** @summary Input payload for tag creation. */
export interface CreateTagInput {
    name: TagName;
    active?: boolean;
}

/** @summary Backend-only tag creation payload with derived ownership. */
export interface CreateOwnedTagInput extends CreateTagInput {
    userId: UserId;
}

/** @summary Input payload for tag updates. */
export interface UpdateTagInput {
    name?: TagName;
    active?: boolean;
}

/** @summary Input payload for listing tags. */
export interface GetTagsInput extends PaginationInput {}

/** @summary Input payload for fetching a tag by id. */
export interface GetTagByIdInput {
    id: TagId;
}

/** @summary Input payload for listing tags by user. */
export interface GetTagsByUserInput extends PaginationInput {
    userId: UserId;
}

/** @summary Update request payload with target id and data. */
export interface UpdateTagRequest {
    id: TagId;
    data: UpdateTagInput;
}

/** @summary Input payload for deleting a tag. */
export interface DeleteTagInput {
    id: TagId;
}

/** @summary Output payload for tag creation. */
export type CreateTagOutput = TagEntity;

/** @summary Output payload for listing tags. */
export type GetTagsOutput = PaginatedResult<TagEntity>;

/** @summary Output payload for fetching a tag by id. */
export type GetTagByIdOutput = TagEntity;

/** @summary Output payload for listing tags by user. */
export type GetTagsByUserOutput = PaginatedResult<TagEntity>;

/** @summary Output payload for tag updates. */
export type UpdateTagOutput = TagEntity;

/** @summary Output payload for tag deletion. */
export interface DeleteTagOutput {
    id: TagId;
}
