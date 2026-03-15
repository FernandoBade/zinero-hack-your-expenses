import { eq, inArray } from 'drizzle-orm';
import { FilterOperator, SortOrder } from '../../../shared/enums/operator.enums';
import { TransactionSortField, TransactionSource, TransactionType } from '../../../shared/enums/transaction.enums';
import { ErrorCode } from '../../../shared/errors/error-codes';
import { SelectTransaction, InsertTransaction, transactionTags } from '../db/schema';
import { withTransaction, db } from '../db';
import { AccountRepository } from '../repositories/accountRepository';
import { CreditCardRepository } from '../repositories/creditCardRepository';
import { TagRepository } from '../repositories/tagRepository';
import { TransactionRepository } from '../repositories/transactionRepository';
import { getSignedTransactionDelta, invertMonetaryDelta, isZeroMonetaryDelta } from '../utils/monetary.utils';
import { QueryOptions } from '../utils/pagination';
import { AccountService } from './accountService';
import { CategoryService } from './categoryService';
import { CreditCardService } from './creditCardService';
import { SubcategoryService } from './subcategoryService';
import type { AccountTransactions, CreateTransactionInput, TransactionWithTags, UpdateTransactionInput } from '../../../shared/domains/transaction/transaction.types';
import type { MonetaryString } from '../../../shared/types/format.types';

/**
 * Service for transaction business logic.
 * Handles transaction operations including validation and account/card linking.
 */
export class TransactionService {
    private transactionRepository: TransactionRepository;
    private accountRepository: AccountRepository;
    private creditCardRepository: CreditCardRepository;
    private tagRepository: TagRepository;

    constructor() {
        this.transactionRepository = new TransactionRepository();
        this.accountRepository = new AccountRepository();
        this.creditCardRepository = new CreditCardRepository();
        this.tagRepository = new TagRepository();
    }

    /**
     * Creates a new transaction linked to a valid account.
     * Validates required fields and the existence of the target account.
     *
     * @summary Creates a new transaction.
     * @param data - Transaction creation data.
     * @returns The created transaction record.
     */
    async createTransaction(data: CreateTransactionInput): Promise<{ success: true; data: TransactionWithTags } | { success: false; error: ErrorCode }> {
        let ownerUserId: number;
        if (data.transactionSource === TransactionSource.ACCOUNT) {
            if (!data.accountId) {
                return { success: false, error: ErrorCode.ACCOUNT_NOT_FOUND };
            }

            const account = await new AccountService().getAccountById(data.accountId);
            if (!account.success || !account.data) {
                return { success: false, error: ErrorCode.ACCOUNT_NOT_FOUND };
            }

            ownerUserId = account.data.userId;
        } else {
            if (!data.creditCardId) {
                return { success: false, error: ErrorCode.CREDIT_CARD_NOT_FOUND };
            }

            const creditCard = await new CreditCardService().getCreditCardById(data.creditCardId);
            if (!creditCard.success || !creditCard.data) {
                return { success: false, error: ErrorCode.CREDIT_CARD_NOT_FOUND };
            }

            ownerUserId = creditCard.data.userId;
        }

        const classificationError = await this.validateTransactionClassification(
            data.categoryId,
            data.subcategoryId
        );
        if (classificationError) {
            return { success: false, error: classificationError };
        }

        try {
            const tagIds = this.normalizeTagIds(data.tags);
            if (tagIds) {
                const isValid = await this.validateTagsByUser(ownerUserId, tagIds);
                if (!isValid) {
                    return { success: false, error: ErrorCode.TAG_NOT_FOUND };
                }
            }

            const created = await withTransaction(async (connection) => {
                const created = await this.transactionRepository.create({
                    value: String(data.value),
                    date: new Date(data.date),
                    transactionType: data.transactionType,
                    transactionSource: data.transactionSource,
                    isInstallment: data.isInstallment,
                    totalMonths: data.totalMonths,
                    isRecurring: data.isRecurring,
                    paymentDay: data.paymentDay,
                    active: data.active,
                    observation: data.observation,
                    accountId: data.accountId,
                    creditCardId: data.creditCardId,
                    categoryId: data.categoryId,
                    subcategoryId: data.subcategoryId,
                } as InsertTransaction, connection);

                const delta = getSignedTransactionDelta(data.transactionType, data.transactionSource, data.value);
                const applyDeltaResult = await this.applyBalanceDelta(connection, created, delta);
                if (!applyDeltaResult.success) {
                    throw applyDeltaResult.error;
                }

                if (tagIds) {
                    await this.replaceTransactionTags(connection, created.id, tagIds);
                }

                return this.toTransactionWithTags(created, tagIds ?? []);
            });
            return { success: true, data: created };
        } catch {
            return { success: false, error: ErrorCode.INTERNAL_SERVER_ERROR };
        }
    }

        /**
     * @summary Retrieves transactions with optional pagination and sorting.
     * @param options - Query options for pagination and sorting.
     * @returns A list of all transaction records.
     */

    async getTransactions(
        filters?: {
            accountId?: { operator: FilterOperator.EQ | FilterOperator.IN; value: number | number[] };
            creditCardId?: { operator: FilterOperator.EQ | FilterOperator.IN; value: number | number[] };
            categoryId?: { operator: FilterOperator.EQ | FilterOperator.IN; value: number | number[] };
            subcategoryId?: { operator: FilterOperator.EQ | FilterOperator.IN; value: number | number[] };
            tagIds?: { operator: FilterOperator.IN; value: number[] };
            transactionType?: { operator: FilterOperator.EQ | FilterOperator.IN; value: TransactionType | TransactionType[] };
            transactionSource?: { operator: FilterOperator.EQ | FilterOperator.IN; value: TransactionSource | TransactionSource[] };
            active?: { operator: FilterOperator.EQ; value: boolean };
            date?: { operator: FilterOperator.BETWEEN; value: [Date | null, Date | null] };
        },
        options?: QueryOptions<SelectTransaction>
    ): Promise<{ success: true; data: TransactionWithTags[] } | { success: false; error: ErrorCode }> {
        try {
            const transactions = await this.transactionRepository.findMany(filters, {
                limit: options?.limit,
                offset: options?.offset,
                sort: (options?.sort as keyof SelectTransaction) || TransactionSortField.DATE,
                order: options?.order === SortOrder.DESC ? SortOrder.DESC : SortOrder.ASC,
            });
            const withTags = await this.attachTags(transactions);
            return { success: true, data: withTags };
        } catch {
            return { success: false, error: ErrorCode.INTERNAL_SERVER_ERROR };
        }
    }

        /**
     * @summary Counts transactions.
     * @returns Total transaction count.
     */

    async countTransactions(filters?: {
        accountId?: { operator: FilterOperator.EQ | FilterOperator.IN; value: number | number[] };
        creditCardId?: { operator: FilterOperator.EQ | FilterOperator.IN; value: number | number[] };
        categoryId?: { operator: FilterOperator.EQ | FilterOperator.IN; value: number | number[] };
        subcategoryId?: { operator: FilterOperator.EQ | FilterOperator.IN; value: number | number[] };
        tagIds?: { operator: FilterOperator.IN; value: number[] };
        transactionType?: { operator: FilterOperator.EQ | FilterOperator.IN; value: TransactionType | TransactionType[] };
        transactionSource?: { operator: FilterOperator.EQ | FilterOperator.IN; value: TransactionSource | TransactionSource[] };
        active?: { operator: FilterOperator.EQ; value: boolean };
        date?: { operator: FilterOperator.BETWEEN; value: [Date | null, Date | null] };
    }): Promise<{ success: true; data: number } | { success: false; error: ErrorCode }> {
        try {
            const count = await this.transactionRepository.count(filters);
            return { success: true, data: count };
        } catch {
            return { success: false, error: ErrorCode.INTERNAL_SERVER_ERROR };
        }
    }

        /**
     * @summary Retrieves a transaction by ID.
     * @param id - ID of the transaction.
     * @returns Transaction record if found.
     */

    async getTransactionById(id: number): Promise<{ success: true; data: TransactionWithTags } | { success: false; error: ErrorCode }> {
        const transaction = await this.transactionRepository.findById(id);
        if (!transaction) {
            return { success: false, error: ErrorCode.NO_RECORDS_FOUND };
        }
        const [withTags] = await this.attachTags([transaction]);
        return { success: true, data: withTags };
    }

        /**
     * @summary Retrieves transactions for an account.
     * @param accountId - ID of the account.
     * @returns A list of transactions linked to the account.
     */

    async getTransactionsByAccount(
        accountId: number,
        options?: QueryOptions<SelectTransaction>
    ): Promise<{ success: true; data: TransactionWithTags[] } | { success: false; error: ErrorCode }> {
        try {
            const transactions = await this.transactionRepository.findMany({
                accountId: { operator: FilterOperator.EQ, value: accountId }
            }, {
                limit: options?.limit,
                offset: options?.offset,
                sort: (options?.sort as keyof SelectTransaction) || TransactionSortField.DATE,
                order: options?.order === SortOrder.DESC ? SortOrder.DESC : SortOrder.ASC,
            });
            const withTags = await this.attachTags(transactions);
            return { success: true, data: withTags };
        } catch {
            return { success: false, error: ErrorCode.INTERNAL_SERVER_ERROR };
        }
    }

        /**
     * @summary Counts transactions for an account.
     * @param accountId - Account ID.
     * @returns Count of transactions.
     */

    async countTransactionsByAccount(accountId: number): Promise<{ success: true; data: number } | { success: false; error: ErrorCode }> {
        try {
            const count = await this.transactionRepository.count({
                accountId: { operator: FilterOperator.EQ, value: accountId }
            });
            return { success: true, data: count };
        } catch {
            return { success: false, error: ErrorCode.INTERNAL_SERVER_ERROR };
        }
    }

        /**
     * @summary Retrieves transactions for a user grouped by account.
     * @param userId - ID of the user.
     * @returns A list of grouped transactions by account.
     */

    async getTransactionsByUser(
        userId: number,
        options?: QueryOptions<SelectTransaction>
    ): Promise<{ success: true; data: AccountTransactions[] } | { success: false; error: ErrorCode }> {
        const accountService = new AccountService();
        const userAccounts = await accountService.getAccountsByUser(userId);

        if (!userAccounts.success || !userAccounts.data?.length) {
            return { success: false, error: ErrorCode.ACCOUNT_NOT_FOUND };
        }

        const accountIds = userAccounts.data.map(acc => acc.id);

        try {
            const allTransactions = await this.transactionRepository.findMany({
                accountId: { operator: FilterOperator.IN, value: accountIds }
            }, {
                limit: options?.limit,
                offset: options?.offset,
                sort: (options?.sort as keyof SelectTransaction) || TransactionSortField.DATE,
                order: options?.order === SortOrder.DESC ? SortOrder.DESC : SortOrder.ASC,
            });

            const transactionsWithTags = await this.attachTags(allTransactions);
            const grouped: AccountTransactions[] = accountIds.map(accountId => ({
                accountId,
                transactions: transactionsWithTags.filter(t => t.accountId === accountId)
            }));

            return { success: true, data: grouped };
        } catch {
            return { success: false, error: ErrorCode.INTERNAL_SERVER_ERROR };
        }
    }

        /**
     * @summary Counts transactions for a user.
     * @param userId - User ID.
     * @returns Count of transactions.
     */

    async countTransactionsByUser(
        userId: number
    ): Promise<{ success: true; data: number } | { success: false; error: ErrorCode }> {
        const accountService = new AccountService();
        const userAccounts = await accountService.getAccountsByUser(userId);

        if (!userAccounts.success || !userAccounts.data?.length) {
            return { success: false, error: ErrorCode.ACCOUNT_NOT_FOUND };
        }

        const accountIds = userAccounts.data.map(acc => acc.id);

        try {
            const count = await this.transactionRepository.count({
                accountId: { operator: FilterOperator.IN, value: accountIds }
            });
            return { success: true, data: count };
        } catch {
            return { success: false, error: ErrorCode.INTERNAL_SERVER_ERROR };
        }
    }

    /**
     * Updates a transaction by ID.
     *
     * @summary Updates transaction data.
     * @param id - ID of the transaction.
     * @param data - Partial transaction data to update.
     * @returns Updated transaction record.
     */
    async updateTransaction(
        id: number,
        data: UpdateTransactionInput
    ): Promise<{ success: true; data: TransactionWithTags } | { success: false; error: ErrorCode }> {
        try {
            const txResult = await withTransaction((connection) => this.applyUpdateWithinTransaction(connection, id, data));
            if (!txResult.success) {
                return txResult;
            }

            const [withTags] = await this.attachTags([txResult.data]);
            return { success: true, data: withTags };
        } catch {
            return { success: false, error: ErrorCode.INTERNAL_SERVER_ERROR };
        }
    }

    /**
     * Deletes a transaction by ID after verifying its existence.
     *
     * @summary Removes a transaction from the database.
     * @param id - ID of the transaction to delete.
     * @returns Success with deleted ID, or error if transaction does not exist.
     */
    async deleteTransaction(id: number): Promise<{ success: true; data: { id: number } } | { success: false; error: ErrorCode }> {
        try {
            return await withTransaction((connection) => this.deleteTransactionWithinTransaction(connection, id));
        } catch {
            return { success: false, error: ErrorCode.INTERNAL_SERVER_ERROR };
        }
    }

        /**
     * @summary Maps transaction rows to API payloads with ISO dates and attached tag ids.
     */
    private toTransactionWithTags(transaction: SelectTransaction, tags: number[]): TransactionWithTags {
        return {
            ...transaction,
            date: transaction.date.toISOString(),
            createdAt: transaction.createdAt.toISOString(),
            updatedAt: transaction.updatedAt.toISOString(),
            tags,
        };
    }

        /**
     * @summary Deduplicates incoming tag ids while preserving insertion order.
     */
    private normalizeTagIds(tags?: number[]): number[] | undefined {
        if (!tags) return undefined;
        const unique = new Set(tags);
        return Array.from(unique);
    }

        /**
     * @summary Ensures category and subcategory references are active and consistent for classification.
     */
    private async validateTransactionClassification(
        categoryId: number | null | undefined,
        subcategoryId: number | null | undefined
    ): Promise<ErrorCode | null> {
        if (!categoryId && !subcategoryId) {
            return ErrorCode.CATEGORY_OR_SUBCATEGORY_REQUIRED;
        }

        if (categoryId) {
            const category = await new CategoryService().getCategoryById(categoryId);
            if (!category.success || !category.data?.active) {
                return ErrorCode.CATEGORY_NOT_FOUND_OR_INACTIVE;
            }
        }

        if (subcategoryId) {
            const subcategory = await new SubcategoryService().getSubcategoryById(subcategoryId);
            if (!subcategory.success || !subcategory.data?.active) {
                return ErrorCode.SUBCATEGORY_NOT_FOUND_OR_INACTIVE;
            }
        }

        return null;
    }

        /**
     * @summary Validates that all informed tags are active and owned by the target user.
     */
    private async validateTagsByUser(
        userId: number,
        tagIds: number[],
        connection: typeof db = db
    ): Promise<boolean> {
        if (tagIds.length === 0) return true;

        const existing = await this.tagRepository.findMany({
            id: { operator: FilterOperator.IN, value: tagIds },
            userId: { operator: FilterOperator.EQ, value: userId },
            active: { operator: FilterOperator.EQ, value: true },
        }, undefined, connection);

        return existing.length === tagIds.length;
    }

        /**
     * @summary Replaces transaction-tag relations within the active database transaction.
     */
    private async replaceTransactionTags(
        connection: typeof db,
        transactionId: number,
        tagIds: number[]
    ): Promise<void> {
        await connection.delete(transactionTags).where(eq(transactionTags.transactionId, transactionId));

        if (tagIds.length === 0) return;

        await connection.insert(transactionTags).values(
            tagIds.map(tagId => ({
                transactionId,
                tagId,
            }))
        );
    }

        /**
     * @summary Hydrates transaction rows with their related tag identifiers.
     */
    private async attachTags(
        transactions: SelectTransaction[],
        connection: typeof db = db
    ): Promise<TransactionWithTags[]> {
        if (!transactions.length) {
            return [];
        }

        const transactionIds = transactions.map(transaction => transaction.id);
        const tagRows = await connection
            .select()
            .from(transactionTags)
            .where(inArray(transactionTags.transactionId, transactionIds));

        const tagMap = new Map<number, number[]>();
        for (const row of tagRows) {
            const existing = tagMap.get(row.transactionId) ?? [];
            existing.push(row.tagId);
            tagMap.set(row.transactionId, existing);
        }

        return transactions.map(transaction =>
            this.toTransactionWithTags(transaction, tagMap.get(transaction.id) ?? [])
        );
    }

        /**
     * @summary Normalizes transaction update payloads and resolves ownership constraints by source.
     */
    private async normalizeUpdateInput(
        current: SelectTransaction,
        data: UpdateTransactionInput
    ): Promise<
        { updateData: UpdateTransactionInput; ownerUserId: number }
        | { error: ErrorCode }
    > {
        const { value, ...restUpdateData } = data;
        const updateData: UpdateTransactionInput = value !== undefined
            ? { ...restUpdateData, value: String(value) }
            : { ...restUpdateData };
        const effectiveSource = updateData.transactionSource !== undefined ? updateData.transactionSource : current.transactionSource;

        if (effectiveSource === TransactionSource.ACCOUNT) {
            const effectiveAccountId = updateData.accountId !== undefined ? updateData.accountId : current.accountId;
            if (!effectiveAccountId) {
                return { error: ErrorCode.ACCOUNT_NOT_FOUND };
            }

            const account = await new AccountService().getAccountById(effectiveAccountId);
            if (!account.success || !account.data) {
                return { error: ErrorCode.ACCOUNT_NOT_FOUND };
            }

            if (updateData.creditCardId !== undefined) {
                updateData.creditCardId = null;
            }

            const effectiveCategoryId = updateData.categoryId !== undefined ? updateData.categoryId : current.categoryId;
            const effectiveSubcategoryId = updateData.subcategoryId !== undefined ? updateData.subcategoryId : current.subcategoryId;
            const classificationError = await this.validateTransactionClassification(effectiveCategoryId, effectiveSubcategoryId);
            if (classificationError) {
                return { error: classificationError };
            }

            return { updateData, ownerUserId: account.data.userId };
        }

        const effectiveCreditCardId = updateData.creditCardId !== undefined ? updateData.creditCardId : current.creditCardId;
        if (!effectiveCreditCardId) {
            return { error: ErrorCode.CREDIT_CARD_NOT_FOUND };
        }

        const creditCard = await new CreditCardService().getCreditCardById(effectiveCreditCardId);
        if (!creditCard.success || !creditCard.data) {
            return { error: ErrorCode.CREDIT_CARD_NOT_FOUND };
        }

        if (updateData.accountId !== undefined) {
            updateData.accountId = null;
        }

        const effectiveCategoryId = updateData.categoryId !== undefined ? updateData.categoryId : current.categoryId;
        const effectiveSubcategoryId = updateData.subcategoryId !== undefined ? updateData.subcategoryId : current.subcategoryId;
        const classificationError = await this.validateTransactionClassification(effectiveCategoryId, effectiveSubcategoryId);
        if (classificationError) {
            return { error: classificationError };
        }

        return { updateData, ownerUserId: creditCard.data.userId };
    }

        /**
     * @summary Executes transactional updates with balance recalculation and tag synchronization.
     */
    private async applyUpdateWithinTransaction(
        connection: typeof db,
        id: number,
        data: UpdateTransactionInput
    ): Promise<{ success: true; data: SelectTransaction } | { success: false; error: ErrorCode }> {
        const current = await this.transactionRepository.findByIdForUpdate(id, connection);
        if (!current) {
            return { success: false, error: ErrorCode.TRANSACTION_NOT_FOUND };
        }

        const normalizedUpdate = await this.normalizeUpdateInput(current, data);
        if ('error' in normalizedUpdate) {
            return { success: false, error: normalizedUpdate.error };
        }

        const { updateData, ownerUserId } = normalizedUpdate;
        const tagIds = this.normalizeTagIds(data.tags);
        if (tagIds) {
            const isValid = await this.validateTagsByUser(ownerUserId, tagIds, connection);
            if (!isValid) {
                return { success: false, error: ErrorCode.TAG_NOT_FOUND };
            }
        }

        const { value, date, ...restUpdate } = updateData;
        const dbUpdateData: Partial<InsertTransaction> = { ...restUpdate };
        if (value !== undefined) {
            dbUpdateData.value = String(value);
        }
        if (date !== undefined) {
            dbUpdateData.date = new Date(date);
        }

        const updated = await this.transactionRepository.update(id, dbUpdateData, connection);
        const applyUpdateResult = await this.applyBalanceUpdate(connection, current, updated);
        if (!applyUpdateResult.success) {
            throw applyUpdateResult.error;
        }

        if (tagIds) {
            await this.replaceTransactionTags(connection, updated.id, tagIds);
        }

        return { success: true, data: updated };
    }

        /**
     * @summary Deletes a transaction and reverts its monetary impact atomically.
     */
    private async deleteTransactionWithinTransaction(
        connection: typeof db,
        id: number
    ): Promise<{ success: true; data: { id: number } } | { success: false; error: ErrorCode }> {
        const existing = await this.transactionRepository.findByIdForUpdate(id, connection);
        if (!existing) {
            return { success: false, error: ErrorCode.TRANSACTION_NOT_FOUND };
        }

        await this.transactionRepository.delete(id, connection);
        await connection.delete(transactionTags).where(eq(transactionTags.transactionId, id));

        const delta = invertMonetaryDelta(
            getSignedTransactionDelta(existing.transactionType, existing.transactionSource, existing.value)
        );
        const applyDeltaResult = await this.applyBalanceDelta(connection, existing, delta);
        if (!applyDeltaResult.success) {
            throw applyDeltaResult.error;
        }

        return { success: true, data: { id } };
    }

        /**
     * @summary Recalculates source balances when transaction identity or value changes.
     */
    private async applyBalanceUpdate(
        connection: typeof db,
        current: SelectTransaction,
        updated: SelectTransaction
    ): Promise<{ success: true } | { success: false; error: ErrorCode }> {
        const currentDelta = getSignedTransactionDelta(current.transactionType, current.transactionSource, current.value);
        const updatedDelta = getSignedTransactionDelta(updated.transactionType, updated.transactionSource, updated.value);

        const sameSource = current.transactionSource === updated.transactionSource;
        const sameAccount = current.accountId === updated.accountId;
        const sameCard = current.creditCardId === updated.creditCardId;

        if (
            sameSource
            && (
                (current.transactionSource === TransactionSource.ACCOUNT && sameAccount)
                || (current.transactionSource === TransactionSource.CREDIT_CARD && sameCard)
            )
            && currentDelta === updatedDelta
        ) {
            return { success: true };
        }

        const revertCurrentResult = await this.applyBalanceDelta(connection, current, invertMonetaryDelta(currentDelta));
        if (!revertCurrentResult.success) {
            return revertCurrentResult;
        }

        const applyUpdatedResult = await this.applyBalanceDelta(connection, updated, updatedDelta);
        if (!applyUpdatedResult.success) {
            return applyUpdatedResult;
        }

        return { success: true };
    }

        /**
     * @summary Applies a signed monetary delta to account or credit-card balances.
     */
    private async applyBalanceDelta(
        connection: typeof db,
        transaction: SelectTransaction,
        delta: MonetaryString
    ): Promise<{ success: true } | { success: false; error: ErrorCode }> {
        if (isZeroMonetaryDelta(delta)) {
            return { success: true };
        }

        if (transaction.transactionSource === TransactionSource.ACCOUNT) {
            if (!transaction.accountId) {
                return { success: false, error: ErrorCode.INTERNAL_SERVER_ERROR };
            }

            await this.accountRepository.applyBalanceDelta(transaction.accountId, delta, connection);
            return { success: true };
        }

        if (!transaction.creditCardId) {
            return { success: false, error: ErrorCode.INTERNAL_SERVER_ERROR };
        }

        await this.creditCardRepository.applyCreditCardDelta(transaction.creditCardId, delta, connection);
        return { success: true };
    }
}

