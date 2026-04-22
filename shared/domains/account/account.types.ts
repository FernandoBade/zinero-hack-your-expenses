import type { AccountType } from '../../enums/account.enums';
import type { UserId } from '../user/user.types';
import type { ISODateString, MonetaryString } from '../../types/format.types';
import type { PaginationInput, PaginatedResult } from '../../types/pagination.types';

/** @summary Unique identifier for an account. */
export type AccountId = number;

/** @summary Account display name. */
export type AccountName = string;

/** @summary Financial institution name. */
export type InstitutionName = string;

/** @summary Free-form account observation. */
export type AccountObservation = string;

/** @summary Account balance represented as a monetary string. */
export type AccountBalance = MonetaryString;

/** @summary Account record persisted by the system. */
export interface AccountEntity {
    id: AccountId;
    name: AccountName | null;
    institution: InstitutionName | null;
    type: AccountType;
    observation: AccountObservation | null;
    balance: AccountBalance;
    active: boolean;
    userId: UserId;
    createdAt: ISODateString;
    updatedAt: ISODateString;
}

/** @summary Input payload for account creation. */
export interface CreateAccountInput {
    name: AccountName;
    institution: InstitutionName;
    type: AccountType;
    observation?: AccountObservation;
    balance?: AccountBalance;
    active?: boolean;
}

/** @summary Backend-only account creation payload with derived ownership. */
export interface CreateOwnedAccountInput extends CreateAccountInput {
    userId: UserId;
}

/** @summary Input payload for account updates. */
export interface UpdateAccountInput {
    name?: AccountName;
    institution?: InstitutionName;
    type?: AccountType;
    observation?: AccountObservation;
    balance?: AccountBalance;
    active?: boolean;
}

/** @summary Input payload for listing accounts. */
export interface GetAccountsInput extends PaginationInput {}

/** @summary Input payload for fetching an account by id. */
export interface GetAccountByIdInput {
    id: AccountId;
}

/** @summary Input payload for listing accounts by user. */
export interface GetAccountsByUserInput extends PaginationInput {
    userId: UserId;
}

/** @summary Update request payload with target id and data. */
export interface UpdateAccountRequest {
    id: AccountId;
    data: UpdateAccountInput;
}

/** @summary Input payload for deleting an account. */
export interface DeleteAccountInput {
    id: AccountId;
}

/** @summary Output payload for account creation. */
export type CreateAccountOutput = AccountEntity;

/** @summary Output payload for listing accounts. */
export type GetAccountsOutput = PaginatedResult<AccountEntity>;

/** @summary Output payload for fetching an account by id. */
export type GetAccountByIdOutput = AccountEntity;

/** @summary Output payload for listing accounts by user. */
export type GetAccountsByUserOutput = PaginatedResult<AccountEntity>;

/** @summary Output payload for account updates. */
export type UpdateAccountOutput = AccountEntity;

/** @summary Output payload for account deletion. */
export interface DeleteAccountOutput {
    id: AccountId;
}
