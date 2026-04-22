import type { CreditCardFlag } from './creditCard.enums';
import type { AccountId } from '../account/account.types';
import type { UserId } from '../user/user.types';
import type { ISODateString, MonetaryString } from '../../types/format.types';
import type { PaginationInput, PaginatedResult } from '../../types/pagination.types';

/** @summary Unique identifier for a credit card. */
export type CreditCardId = number;

/** @summary Credit card display name. */
export type CreditCardName = string;

/** @summary Free-form credit card observation. */
export type CreditCardObservation = string;

/** @summary Credit card balance represented as a monetary string. */
export type CreditCardBalance = MonetaryString;

/** @summary Credit card limit represented as a monetary string. */
export type CreditCardLimit = MonetaryString;

/** @summary Credit card record persisted by the system. */
export interface CreditCardEntity {
    id: CreditCardId;
    name: CreditCardName | null;
    flag: CreditCardFlag;
    observation: CreditCardObservation | null;
    balance: CreditCardBalance;
    limit: CreditCardLimit;
    active: boolean;
    userId: UserId;
    accountId: AccountId | null;
    createdAt: ISODateString;
    updatedAt: ISODateString;
}

/** @summary Input payload for credit card creation. */
export interface CreateCreditCardInput {
    name: CreditCardName;
    flag: CreditCardFlag;
    observation?: CreditCardObservation;
    balance?: CreditCardBalance;
    limit?: CreditCardLimit;
    accountId?: AccountId;
    active?: boolean;
}

/** @summary Backend-only credit-card creation payload with derived ownership. */
export interface CreateOwnedCreditCardInput extends CreateCreditCardInput {
    userId: UserId;
}

/** @summary Input payload for credit card updates. */
export interface UpdateCreditCardInput {
    name?: CreditCardName;
    flag?: CreditCardFlag;
    observation?: CreditCardObservation;
    balance?: CreditCardBalance;
    limit?: CreditCardLimit;
    accountId?: AccountId | null;
    active?: boolean;
}

/** @summary Input payload for listing credit cards. */
export interface GetCreditCardsInput extends PaginationInput {}

/** @summary Input payload for fetching a credit card by id. */
export interface GetCreditCardByIdInput {
    id: CreditCardId;
}

/** @summary Input payload for listing credit cards by user. */
export interface GetCreditCardsByUserInput extends PaginationInput {
    userId: UserId;
}

/** @summary Update request payload with target id and data. */
export interface UpdateCreditCardRequest {
    id: CreditCardId;
    data: UpdateCreditCardInput;
}

/** @summary Input payload for deleting a credit card. */
export interface DeleteCreditCardInput {
    id: CreditCardId;
}

/** @summary Output payload for credit card creation. */
export type CreateCreditCardOutput = CreditCardEntity;

/** @summary Output payload for listing credit cards. */
export type GetCreditCardsOutput = PaginatedResult<CreditCardEntity>;

/** @summary Output payload for fetching a credit card by id. */
export type GetCreditCardByIdOutput = CreditCardEntity;

/** @summary Output payload for listing credit cards by user. */
export type GetCreditCardsByUserOutput = PaginatedResult<CreditCardEntity>;

/** @summary Output payload for credit card updates. */
export type UpdateCreditCardOutput = CreditCardEntity;

/** @summary Output payload for credit card deletion. */
export interface DeleteCreditCardOutput {
    id: CreditCardId;
}
