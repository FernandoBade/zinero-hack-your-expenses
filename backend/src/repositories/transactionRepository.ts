import { eq, and, inArray, between, desc, asc, SQL, or, gte, lte } from 'drizzle-orm';
import { db } from '../db';
import { transactions, transactionTags, SelectTransaction, InsertTransaction } from '../db/schema';
import { FilterOperator, SortOrder } from '../../../shared/enums/operator.enums';
import { TransactionSource, TransactionType } from '../../../shared/enums/transaction.enums';

export type TransactionFilters = {
    accountId?: { operator: FilterOperator.EQ | FilterOperator.IN; value: number | number[] };
    creditCardId?: { operator: FilterOperator.EQ | FilterOperator.IN; value: number | number[] };
    categoryId?: { operator: FilterOperator.EQ | FilterOperator.IN; value: number | number[] };
    subcategoryId?: { operator: FilterOperator.EQ | FilterOperator.IN; value: number | number[] };
    tagIds?: { operator: FilterOperator.IN; value: number[] };
    transactionType?: { operator: FilterOperator.EQ | FilterOperator.IN; value: TransactionType | TransactionType[] };
    transactionSource?: { operator: FilterOperator.EQ | FilterOperator.IN; value: TransactionSource | TransactionSource[] };
    active?: { operator: FilterOperator.EQ; value: boolean };
    date?: { operator: FilterOperator.BETWEEN; value: [Date | null, Date | null] };
};

/**
 * Repository for transaction database operations.
 * Provides type-safe CRUD operations for transactions using Drizzle ORM.
 */
export class TransactionRepository {
    /**
     * Finds a transaction by its ID.
     *
     * @summary Retrieves a single transaction by ID.
     * @param transactionId - Transaction ID to search for.
     * @returns Transaction record if found, null otherwise.
     */
    async findById(transactionId: number, connection: typeof db = db): Promise<SelectTransaction | null> {
        const result = await connection.select().from(transactions).where(eq(transactions.id, transactionId)).limit(1);
        return result[0] || null;
    }

    /**
     * Finds a transaction by ID and locks the selected row for update.
     *
     * @summary Retrieves and pessimistically locks a transaction row.
     * @param transactionId - Transaction ID to search for.
     * @param connection - Transactional connection that owns the lock scope.
     * @returns Locked transaction record if found, null otherwise.
     */
    async findByIdForUpdate(transactionId: number, connection: typeof db = db): Promise<SelectTransaction | null> {
        const result = await connection
            .select()
            .from(transactions)
            .where(eq(transactions.id, transactionId))
            .limit(1)
            // InnoDB FOR UPDATE provides pessimistic row lock for update/delete transaction flows.
            .for('update');
        return result[0] || null;
    }

    /**
     * Finds multiple transactions with optional filters and pagination.
     *
     * @summary Retrieves a list of transactions with filtering and sorting.
     * @param filters - Optional filter conditions.
     * @param options - Optional pagination and sorting options.
     * @returns Array of transaction records.
     */
    async findMany(
        filters?: TransactionFilters,
        options?: {
            limit?: number;
            offset?: number;
            sort?: keyof SelectTransaction;
            order?: SortOrder;
        },
        connection: typeof db = db
    ): Promise<SelectTransaction[]> {
        let query = connection.select().from(transactions);

        const conditions: SQL[] = [];
        if (filters?.transactionType) {
            const typeValue = filters.transactionType.value;
            if (filters.transactionType.operator === FilterOperator.EQ && !Array.isArray(typeValue)) {
                conditions.push(eq(transactions.transactionType, typeValue));
            } else if (Array.isArray(typeValue)) {
                conditions.push(inArray(transactions.transactionType, typeValue));
            }
        }
        if (filters?.transactionSource) {
            const sourceValue = filters.transactionSource.value;
            if (filters.transactionSource.operator === FilterOperator.EQ && !Array.isArray(sourceValue)) {
                conditions.push(eq(transactions.transactionSource, sourceValue));
            } else if (Array.isArray(sourceValue)) {
                conditions.push(inArray(transactions.transactionSource, sourceValue));
            }
        }
        let accountCondition: SQL | undefined;
        if (filters?.accountId) {
            if (filters.accountId.operator === FilterOperator.EQ) {
                accountCondition = eq(transactions.accountId, filters.accountId.value as number);
            } else if (Array.isArray(filters.accountId.value)) {
                accountCondition = inArray(transactions.accountId, filters.accountId.value);
            }
        }
        let cardCondition: SQL | undefined;
        if (filters?.creditCardId) {
            if (filters.creditCardId.operator === FilterOperator.EQ) {
                cardCondition = eq(transactions.creditCardId, filters.creditCardId.value as number);
            } else if (Array.isArray(filters.creditCardId.value)) {
                cardCondition = inArray(transactions.creditCardId, filters.creditCardId.value);
            }
        }
        if (accountCondition && cardCondition) {
            const orCondition = or(accountCondition, cardCondition);
            if (orCondition) {
                conditions.push(orCondition);
            }
        } else if (accountCondition) {
            conditions.push(accountCondition);
        } else if (cardCondition) {
            conditions.push(cardCondition);
        }
        if (filters?.categoryId) {
            if (filters.categoryId.operator === FilterOperator.EQ) {
                conditions.push(eq(transactions.categoryId, filters.categoryId.value as number));
            } else if (Array.isArray(filters.categoryId.value)) {
                conditions.push(inArray(transactions.categoryId, filters.categoryId.value));
            }
        }
        if (filters?.subcategoryId) {
            if (filters.subcategoryId.operator === FilterOperator.EQ) {
                conditions.push(eq(transactions.subcategoryId, filters.subcategoryId.value as number));
            } else if (Array.isArray(filters.subcategoryId.value)) {
                conditions.push(inArray(transactions.subcategoryId, filters.subcategoryId.value));
            }
        }
        if (filters?.tagIds && Array.isArray(filters.tagIds.value) && filters.tagIds.value.length) {
            const tagRows = await connection
                .select({ transactionId: transactionTags.transactionId })
                .from(transactionTags)
                .where(inArray(transactionTags.tagId, filters.tagIds.value));
            const tagTransactionIds = Array.from(
                new Set(tagRows.map((row) => row.transactionId))
            );
            if (!tagTransactionIds.length) {
                return [];
            }
            conditions.push(inArray(transactions.id, tagTransactionIds));
        }
        if (filters?.active) {
            conditions.push(eq(transactions.active, filters.active.value));
        }
        if (filters?.date) {
            const [start, end] = filters.date.value;
            if (start && end) {
                conditions.push(between(transactions.date, start, end));
            } else if (start) {
                conditions.push(gte(transactions.date, start));
            } else if (end) {
                conditions.push(lte(transactions.date, end));
            }
        }

        if (conditions.length > 0) {
            query = query.where(and(...conditions)) as typeof query;
        }

        if (options?.sort) {
            const column = transactions[options.sort];
            if (column) {
                query = query.orderBy(options.order === SortOrder.DESC ? desc(column) : asc(column)) as typeof query;
            }
        }

        if (options?.limit) {
            query = query.limit(options.limit) as typeof query;
        }

        if (options?.offset) {
            query = query.offset(options.offset) as typeof query;
        }

        return await query;
    }

    /**
     * Counts transactions matching optional filters.
     *
     * @summary Counts total transactions matching filter criteria.
     * @param filters - Optional filter conditions.
     * @returns Total count of matching transactions.
     */
    async count(
        filters?: TransactionFilters,
        connection: typeof db = db
    ): Promise<number> {
        let query = connection.select({ count: transactions.id }).from(transactions);

        const conditions: SQL[] = [];
        if (filters?.transactionType) {
            const typeValue = filters.transactionType.value;
            if (filters.transactionType.operator === FilterOperator.EQ && !Array.isArray(typeValue)) {
                conditions.push(eq(transactions.transactionType, typeValue));
            } else if (Array.isArray(typeValue)) {
                conditions.push(inArray(transactions.transactionType, typeValue));
            }
        }
        if (filters?.transactionSource) {
            const sourceValue = filters.transactionSource.value;
            if (filters.transactionSource.operator === FilterOperator.EQ && !Array.isArray(sourceValue)) {
                conditions.push(eq(transactions.transactionSource, sourceValue));
            } else if (Array.isArray(sourceValue)) {
                conditions.push(inArray(transactions.transactionSource, sourceValue));
            }
        }
        let accountCondition: SQL | undefined;
        if (filters?.accountId) {
            if (filters.accountId.operator === FilterOperator.EQ) {
                accountCondition = eq(transactions.accountId, filters.accountId.value as number);
            } else if (Array.isArray(filters.accountId.value)) {
                accountCondition = inArray(transactions.accountId, filters.accountId.value);
            }
        }
        let cardCondition: SQL | undefined;
        if (filters?.creditCardId) {
            if (filters.creditCardId.operator === FilterOperator.EQ) {
                cardCondition = eq(transactions.creditCardId, filters.creditCardId.value as number);
            } else if (Array.isArray(filters.creditCardId.value)) {
                cardCondition = inArray(transactions.creditCardId, filters.creditCardId.value);
            }
        }
        if (accountCondition && cardCondition) {
            const orCondition = or(accountCondition, cardCondition);
            if (orCondition) {
                conditions.push(orCondition);
            }
        } else if (accountCondition) {
            conditions.push(accountCondition);
        } else if (cardCondition) {
            conditions.push(cardCondition);
        }
        if (filters?.categoryId) {
            if (filters.categoryId.operator === FilterOperator.EQ) {
                conditions.push(eq(transactions.categoryId, filters.categoryId.value as number));
            } else if (Array.isArray(filters.categoryId.value)) {
                conditions.push(inArray(transactions.categoryId, filters.categoryId.value));
            }
        }
        if (filters?.subcategoryId) {
            if (filters.subcategoryId.operator === FilterOperator.EQ) {
                conditions.push(eq(transactions.subcategoryId, filters.subcategoryId.value as number));
            } else if (Array.isArray(filters.subcategoryId.value)) {
                conditions.push(inArray(transactions.subcategoryId, filters.subcategoryId.value));
            }
        }
        if (filters?.tagIds && Array.isArray(filters.tagIds.value) && filters.tagIds.value.length) {
            const tagRows = await connection
                .select({ transactionId: transactionTags.transactionId })
                .from(transactionTags)
                .where(inArray(transactionTags.tagId, filters.tagIds.value));
            const tagTransactionIds = Array.from(
                new Set(tagRows.map((row) => row.transactionId))
            );
            if (!tagTransactionIds.length) {
                return 0;
            }
            conditions.push(inArray(transactions.id, tagTransactionIds));
        }
        if (filters?.active) {
            conditions.push(eq(transactions.active, filters.active.value));
        }
        if (filters?.date) {
            const [start, end] = filters.date.value;
            if (start && end) {
                conditions.push(between(transactions.date, start, end));
            } else if (start) {
                conditions.push(gte(transactions.date, start));
            } else if (end) {
                conditions.push(lte(transactions.date, end));
            }
        }

        if (conditions.length > 0) {
            query = query.where(and(...conditions)) as typeof query;
        }

        const result = await query;
        return result.length;
    }

    /**
     * Creates a new transaction.
     *
     * @summary Inserts a new transaction record.
     * @param data - Transaction data to insert.
     * @returns The created transaction record with generated ID.
     */
    async create(data: InsertTransaction, connection: typeof db = db): Promise<SelectTransaction> {
        const result = await connection.insert(transactions).values(data);
        const insertedId = result[0].insertId;
        const created = await this.findById(Number(insertedId), connection);
        if (!created) {
            throw new Error('RepositoryInvariantViolation: created record not found');
        }
        return created;
    }

    /**
     * Updates an existing transaction by ID.
     *
     * @summary Updates transaction record with new data.
     * @param transactionId - Transaction ID to update.
     * @param data - Partial transaction data to update.
     * @returns The updated transaction record.
     */
    async update(transactionId: number, data: Partial<InsertTransaction>, connection: typeof db = db): Promise<SelectTransaction> {
        await connection.update(transactions).set(data).where(eq(transactions.id, transactionId));
        const updated = await this.findById(transactionId, connection);
        if (!updated) {
            throw new Error('RepositoryInvariantViolation: updated record not found');
        }
        return updated;
    }

    /**
     * Deletes a transaction by ID.
     *
     * @summary Removes a transaction record from the database.
     * @param transactionId - Transaction ID to delete.
     */
    async delete(transactionId: number, connection: typeof db = db): Promise<void> {
        await connection.delete(transactions).where(eq(transactions.id, transactionId));
    }
}
