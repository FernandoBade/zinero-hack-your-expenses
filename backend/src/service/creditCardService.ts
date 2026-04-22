import { FilterOperator, SortOrder } from '../../../shared/enums/operator.enums';
import { CreditCardRepository } from '../repositories/creditCardRepository';
import { UserService } from './userService';
import { AccountService } from './accountService';
import { ErrorCode } from '../../../shared/errors/error-codes';
import { SelectCreditCard, InsertCreditCard } from '../db/schema';
import { QueryOptions } from '../utils/pagination';
import type { CreditCardEntity, CreateOwnedCreditCardInput, UpdateCreditCardInput } from '../../../shared/domains/creditCard/creditCard.types';

export type CreditCardRow = CreditCardEntity;

/** @summary Service for credit card business logic.
 * Handles credit card operations including validation and user/account linking.
 */
export class CreditCardService {
    private creditCardRepository: CreditCardRepository;

    constructor() {
        this.creditCardRepository = new CreditCardRepository();
    }

        /**
     * @summary Maps credit-card rows to API entities with ISO timestamp serialization.
     */
    private toCreditCardEntity(data: SelectCreditCard): CreditCardEntity {
        return {
            ...data,
            createdAt: data.createdAt.toISOString(),
            updatedAt: data.updatedAt.toISOString(),
        };
    }

    /**
     * Creates a new credit card.
     *
     * @summary Creates a new credit card for a user.
     * @param data - Credit card creation data.
     * @returns The created credit card record.
     */
    async createCreditCard(data: CreateOwnedCreditCardInput): Promise<{ success: true; data: CreditCardEntity } | { success: false; error: ErrorCode }> {
        const userService = new UserService();
        const user = await userService.getUserById(data.userId);

        if (!user.success || !user.data) {
            return { success: false, error: ErrorCode.USER_NOT_FOUND };
        }

        if (data.accountId !== undefined) {
            const accountService = new AccountService();
            const account = await accountService.getAccountById(data.accountId);
            if (!account.success || !account.data) {
                return { success: false, error: ErrorCode.ACCOUNT_NOT_FOUND };
            }

            if (account.data.userId !== data.userId) {
                return { success: false, error: ErrorCode.UNAUTHORIZED_OPERATION };
            }

            const existing = await this.creditCardRepository.findMany({
                accountId: { operator: FilterOperator.EQ, value: data.accountId }
            });
            if (existing.length > 0) {
                return { success: false, error: ErrorCode.DATA_ALREADY_EXISTS };
            }
        }

        try {
            const created = await this.creditCardRepository.create({
                name: data.name,
                flag: data.flag,
                observation: data.observation,
                active: data.active,
                userId: data.userId,
                accountId: data.accountId,
                balance: data.balance,
                limit: data.limit,
            } as InsertCreditCard);
            return { success: true, data: this.toCreditCardEntity(created) };
        } catch {
            return { success: false, error: ErrorCode.INTERNAL_SERVER_ERROR };
        }
    }

        /**
     * @summary Retrieves credit cards with optional pagination and sorting.
     * @param options - Query options for pagination and sorting.
     * @returns A list of all credit cards.
     */

    async getCreditCards(options?: QueryOptions<SelectCreditCard>): Promise<{ success: true; data: CreditCardEntity[] } | { success: false; error: ErrorCode }> {
        try {
            const creditCards = await this.creditCardRepository.findMany(undefined, {
                limit: options?.limit,
                offset: options?.offset,
                sort: options?.sort as keyof SelectCreditCard,
                order: options?.order === SortOrder.DESC ? SortOrder.DESC : SortOrder.ASC,
            });
            return { success: true, data: creditCards.map(card => this.toCreditCardEntity(card)) };
        } catch {
            return { success: false, error: ErrorCode.INTERNAL_SERVER_ERROR };
        }
    }

        /**
     * @summary Counts credit cards.
     * @returns Total credit card count.
     */

    async countCreditCards(): Promise<{ success: true; data: number } | { success: false; error: ErrorCode }> {
        try {
            const count = await this.creditCardRepository.count();
            return { success: true, data: count };
        } catch {
            return { success: false, error: ErrorCode.INTERNAL_SERVER_ERROR };
        }
    }

        /**
     * @summary Retrieves a credit card by ID.
     * @param id - ID of the credit card.
     * @returns Credit card record if found.
     */

    async getCreditCardById(id: number): Promise<{ success: true; data: CreditCardEntity } | { success: false; error: ErrorCode }> {
        const creditCard = await this.creditCardRepository.findById(id);
        if (!creditCard) {
            return { success: false, error: ErrorCode.CREDIT_CARD_NOT_FOUND };
        }
        return { success: true, data: this.toCreditCardEntity(creditCard) };
    }

        /**
     * @summary Retrieves credit cards for a user.
     * @param userId - User ID.
     * @returns A list of credit cards owned by the user.
     */

    async getCreditCardsByUser(userId: number, options?: QueryOptions<SelectCreditCard>): Promise<{ success: true; data: CreditCardEntity[] } | { success: false; error: ErrorCode }> {
        try {
            const creditCards = await this.creditCardRepository.findMany({
                userId: { operator: FilterOperator.EQ, value: userId }
            }, {
                limit: options?.limit,
                offset: options?.offset,
                sort: options?.sort as keyof SelectCreditCard,
                order: options?.order === SortOrder.DESC ? SortOrder.DESC : SortOrder.ASC,
            });
            return { success: true, data: creditCards.map(card => this.toCreditCardEntity(card)) };
        } catch {
            return { success: false, error: ErrorCode.INTERNAL_SERVER_ERROR };
        }
    }

        /**
     * @summary Counts credit cards for a user.
     * @param userId - User ID.
     * @returns Count of user's credit cards.
     */

    async countCreditCardsByUser(userId: number): Promise<{ success: true; data: number } | { success: false; error: ErrorCode }> {
        try {
            const count = await this.creditCardRepository.count({
                userId: { operator: FilterOperator.EQ, value: userId }
            });
            return { success: true, data: count };
        } catch {
            return { success: false, error: ErrorCode.INTERNAL_SERVER_ERROR };
        }
    }

    /**
     * Updates a credit card by ID.
     *
     * @summary Updates credit card data.
     * @param id - ID of the credit card.
     * @param data - Partial credit card data to update.
     * @returns Updated credit card record.
     */
    async updateCreditCard(id: number, data: UpdateCreditCardInput): Promise<{ success: true; data: CreditCardEntity } | { success: false; error: ErrorCode }> {
        const current = await this.creditCardRepository.findById(id);
        if (!current) {
            return { success: false, error: ErrorCode.CREDIT_CARD_NOT_FOUND };
        }

        const safeData = { ...data } as UpdateCreditCardInput & { userId?: number };
        delete safeData.userId;
        const balance = safeData.balance;
        delete safeData.balance;

        if (safeData.accountId !== undefined) {
            if (safeData.accountId === null) {
                safeData.accountId = null;
            } else {
                const accountService = new AccountService();
                const account = await accountService.getAccountById(safeData.accountId);
                if (!account.success || !account.data) {
                    return { success: false, error: ErrorCode.ACCOUNT_NOT_FOUND };
                }

                if (account.data.userId !== current.userId) {
                    return { success: false, error: ErrorCode.UNAUTHORIZED_OPERATION };
                }

                const existing = await this.creditCardRepository.findMany({
                    accountId: { operator: FilterOperator.EQ, value: safeData.accountId }
                });
                if (existing.length > 0 && existing[0].id !== id) {
                    return { success: false, error: ErrorCode.DATA_ALREADY_EXISTS };
                }
            }
        }

        try {
            const dbData: Partial<InsertCreditCard> = {
                ...safeData,
                ...(balance !== undefined ? { balance } : {}),
            };
            const updated = await this.creditCardRepository.update(id, dbData);
            return { success: true, data: this.toCreditCardEntity(updated) };
        } catch {
            return { success: false, error: ErrorCode.INTERNAL_SERVER_ERROR };
        }
    }

    /**
     * Deletes a credit card by ID.
     *
     * @summary Removes a credit card from the database.
     * @param id - ID of the credit card to delete.
     * @returns Success with deleted ID, or error if credit card does not exist.
     */
    async deleteCreditCard(id: number): Promise<{ success: true; data: { id: number } } | { success: false; error: ErrorCode }> {
        const existing = await this.creditCardRepository.findById(id);
        if (!existing) {
            return { success: false, error: ErrorCode.CREDIT_CARD_NOT_FOUND };
        }

        try {
            await this.creditCardRepository.delete(id);
            return { success: true, data: { id } };
        } catch {
            return { success: false, error: ErrorCode.INTERNAL_SERVER_ERROR };
        }
    }
}




