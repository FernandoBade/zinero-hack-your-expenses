import type { Currency, Language, Profile, Theme } from './user.enums';
import type { FileUpload } from '../../types/file.types';
import type { ISODateString } from '../../types/format.types';
import type { PaginationInput, PaginatedResult } from '../../types/pagination.types';

/** @summary Unique identifier for a user. */
export type UserId = number;

/** @summary User email address. */
export type EmailAddress = string;

/** @summary Display name or personal name. */
export type UserName = string;

/** @summary User password credential (hashed or raw as defined by backend). */
export type Password = string;

/** @summary User phone number string. */
export type PhoneNumber = string;

/** @summary Public avatar URL. */
export type AvatarUrl = string;

/** @summary User record including credentials and settings. */
export interface UserEntity {
    id: UserId;
    firstName: UserName | null;
    lastName: UserName | null;
    email: EmailAddress;
    password: Password | null;
    birthDate: ISODateString | null;
    phone: PhoneNumber | null;
    avatarUrl: AvatarUrl | null;
    theme: Theme;
    language: Language;
    currency: Currency;
    profile: Profile;
    hideValues: boolean;
    active: boolean;
    emailVerifiedAt: ISODateString | null;
    createdAt: ISODateString;
    updatedAt: ISODateString;
}

/** @summary User record without password. */
export type SanitizedUser = Omit<UserEntity, 'password'>;

/** @summary Input payload for user creation. */
export interface CreateUserInput {
    firstName: UserName;
    lastName: UserName;
    email: EmailAddress;
    password: Password;
    phone?: PhoneNumber;
    birthDate?: ISODateString;
    theme?: Theme;
    language?: Language;
    currency?: Currency;
    hideValues?: boolean;
}

/** @summary Input payload for user updates. */
export interface UpdateUserInput {
    firstName?: UserName;
    lastName?: UserName;
    email?: EmailAddress;
    password?: Password;
    currentPassword?: Password;
    phone?: PhoneNumber;
    birthDate?: ISODateString;
    theme?: Theme;
    language?: Language;
    currency?: Currency;
    hideValues?: boolean;
}

/** @summary Input payload for listing users. */
export interface GetUsersInput extends PaginationInput {}

/** @summary Input payload for fetching a user by id. */
export interface GetUserByIdInput {
    id: UserId;
}

/** @summary Input payload for searching users by email. */
export interface GetUsersByEmailInput extends PaginationInput {
    email: EmailAddress;
}

/** @summary Update request payload with target id and data. */
export interface UpdateUserRequest {
    id: UserId;
    data: UpdateUserInput;
}

/** @summary Input payload for deleting a user. */
export interface DeleteUserInput {
    id: UserId;
}

/** @summary Input payload for uploading a user avatar. */
export interface UploadAvatarInput {
    file: FileUpload;
}

/** @summary Output payload for user creation. */
export type CreateUserOutput = SanitizedUser;

/** @summary Output payload for listing users. */
export type GetUsersOutput = PaginatedResult<SanitizedUser>;

/** @summary Output payload for fetching a user by id. */
export type GetUserByIdOutput = SanitizedUser;

/** @summary Output payload for searching users by email. */
export type GetUsersByEmailOutput = PaginatedResult<SanitizedUser>;

/** @summary Output payload for user updates. */
export type UpdateUserOutput = SanitizedUser;

/** @summary Output payload for user deletion. */
export interface DeleteUserOutput {
    id: UserId;
}

/** @summary Output payload for avatar upload. */
export interface UploadAvatarOutput {
    url: AvatarUrl;
}
