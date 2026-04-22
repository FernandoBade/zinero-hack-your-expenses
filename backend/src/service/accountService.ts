import { FilterOperator, SortOrder } from '../../../shared/enums/operator.enums';
import { AccountRepository } from '../repositories/accountRepository';
import { UserService } from './userService';
import { ErrorCode } from '../../../shared/errors/error-codes';
import { SelectAccount, InsertAccount } from '../db/schema';
import { QueryOptions } from '../utils/pagination';
import type { AccountEntity, CreateOwnedAccountInput, UpdateAccountInput } from '../../../shared/domains/account/account.types';

/**
 * Service for account business logic.
 * Handles account operations including validation and user linking.
 */
export class AccountService {
    private accountRepository: AccountRepository;

    constructor() {
        this.accountRepository = new AccountRepository();
    }

        /**
     * @summary Maps account rows to API entities with ISO timestamp serialization.
     */
    private toAccountEntity(data: SelectAccount): AccountEntity {
        return {
            ...data,
            createdAt: data.createdAt.toISOString(),
            updatedAt: data.updatedAt.toISOString(),
        };
    }

    /**
     * Creates a new financial account.
     * Ensures the required data is present and linked to a valid user.
     *
     * @summary Creates a new account linked to a user.
     * @param data - Account creation data.
     * @returns The created account record.
     */
    async createAccount(data: CreateOwnedAccountInput): Promise<{ success: true; data: AccountEntity } | { success: false; error: ErrorCode }> {
        const userService = new UserService();
        const user = await userService.getUserById(data.userId);

        if (!user.success || !user.data) {
            return { success: false, error: ErrorCode.USER_NOT_FOUND };
        }

        try {
            const created = await this.accountRepository.create({
                name: data.name,
                institution: data.institution,
                type: data.type,
                observation: data.observation,
                balance: data.balance,
                active: data.active,
                userId: data.userId,
            } as InsertAccount);
            return { success: true, data: this.toAccountEntity(created) };
        } catch {
            return { success: false, error: ErrorCode.INTERNAL_SERVER_ERROR };
        }
    }

        /**
     * @summary Retrieves accounts with optional pagination and sorting.
     * @param options - Query options for pagination and sorting.
     * @returns A list of all account records.
     */

    async getAccounts(options?: QueryOptions<SelectAccount>): Promise<{ success: true; data: AccountEntity[] } | { success: false; error: ErrorCode }> {
        try {
            const accounts = await this.accountRepository.findMany(undefined, {
                limit: options?.limit,
                offset: options?.offset,
                sort: options?.sort as keyof SelectAccount,
                order: options?.order === SortOrder.DESC ? SortOrder.DESC : SortOrder.ASC,
            });
            return { success: true, data: accounts.map(account => this.toAccountEntity(account)) };
        } catch {
            return { success: false, error: ErrorCode.INTERNAL_SERVER_ERROR };
        }
    }

        /**
     * @summary Counts accounts.
     * @returns Total account count.
     */

    async countAccounts(): Promise<{ success: true; data: number } | { success: false; error: ErrorCode }> {
        try {
            const count = await this.accountRepository.count();
            return { success: true, data: count };
        } catch {
            return { success: false, error: ErrorCode.INTERNAL_SERVER_ERROR };
        }
    }

        /**
     * @summary Retrieves an account by ID.
     * @param id - ID of the account.
     * @returns Account record if found.
     */

    async getAccountById(id: number): Promise<{ success: true; data: AccountEntity } | { success: false; error: ErrorCode }> {
        const account = await this.accountRepository.findById(id);
        if (!account) {
            return { success: false, error: ErrorCode.NO_RECORDS_FOUND };
        }
        return { success: true, data: this.toAccountEntity(account) };
    }

        /**
     * @summary Retrieves accounts for a user.
     * @param userId - ID of the user.
     * @returns A list of accounts owned by the user.
     */

    async getAccountsByUser(userId: number, options?: QueryOptions<SelectAccount>): Promise<{ success: true; data: AccountEntity[] } | { success: false; error: ErrorCode }> {
        try {
            const accounts = await this.accountRepository.findMany({
                userId: { operator: FilterOperator.EQ, value: userId }
            }, {
                limit: options?.limit,
                offset: options?.offset,
                sort: options?.sort as keyof SelectAccount,
                order: options?.order === SortOrder.DESC ? SortOrder.DESC : SortOrder.ASC,
            });
            return { success: true, data: accounts.map(account => this.toAccountEntity(account)) };
        } catch {
            return { success: false, error: ErrorCode.INTERNAL_SERVER_ERROR };
        }
    }

        /**
     * @summary Counts accounts for a user.
     * @param userId - User ID.
     * @returns Count of user's accounts.
     */

    async countAccountsByUser(userId: number): Promise<{ success: true; data: number } | { success: false; error: ErrorCode }> {
        try {
            const count = await this.accountRepository.count({
                userId: { operator: FilterOperator.EQ, value: userId }
            });
            return { success: true, data: count };
        } catch {
            return { success: false, error: ErrorCode.INTERNAL_SERVER_ERROR };
        }
    }

    /**
     * Updates an account by ID.
     * Ignores any attempted ownership reassignment in the incoming payload.
     *
     * @summary Updates account data.
     * @param id - ID of the account.
     * @param data - Partial account data to update.
     * @returns Updated account record.
     */
    async updateAccount(id: number, data: UpdateAccountInput): Promise<{ success: true; data: AccountEntity } | { success: false; error: ErrorCode }> {
        const safeData = { ...data } as UpdateAccountInput & { userId?: number };
        delete safeData.userId;

        try {
            const updated = await this.accountRepository.update(id, safeData as Partial<InsertAccount>);
            return { success: true, data: this.toAccountEntity(updated) };
        } catch {
            return { success: false, error: ErrorCode.INTERNAL_SERVER_ERROR };
        }
    }

    /**
     * Deletes an account by ID after validating its existence.
     *
     * @summary Removes an account from the database.
     * @param id - ID of the account to delete.
     * @returns Success with deleted ID, or error if account does not exist.
     */
    async deleteAccount(id: number): Promise<{ success: true; data: { id: number } } | { success: false; error: ErrorCode }> {
        const existing = await this.accountRepository.findById(id);
        if (!existing) {
            return { success: false, error: ErrorCode.ACCOUNT_NOT_FOUND };
        }

        try {
            await this.accountRepository.delete(id);
            return { success: true, data: { id } };
        } catch {
            return { success: false, error: ErrorCode.INTERNAL_SERVER_ERROR };
        }
    }
}




