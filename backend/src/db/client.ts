import mysql from 'mysql2/promise';
import { drizzle } from 'drizzle-orm/mysql2';
import * as schema from './schema';
import { getBackendConfig } from '../config/env';

const { database } = getBackendConfig();

/**
 * Creates and exports a MySQL connection pool using environment variables.
 * Manages connection pooling for performance and scalability.
 */
const pool = mysql.createPool({
    host: database.host,
    port: database.port,
    user: database.user,
    password: database.password,
    database: database.database,
    waitForConnections: database.waitForConnections,
    connectionLimit: database.connectionLimit,
    queueLimit: database.queueLimit,
});

/**
 * Drizzle database instance with schema types.
 * Provides type-safe database access using Drizzle ORM.
 */
export const db = drizzle(pool, { mode: 'default', schema });

/**
 * Executes a function within a database transaction.
 * Automatically commits on success or rolls back on error.
 *
 * @summary Executes operations within a database transaction.
 * @param callback - Function to execute within the transaction.
 * @returns The result of the callback function.
 * @throws Re-throws any error that occurs during transaction execution.
 */
export async function withTransaction<T>(
    callback: (tx: typeof db) => Promise<T>
): Promise<T> {
    // The Drizzle transaction callback provides a transaction object (tx),
    // which is not the same as the full db instance (missing . $client, etc).
    // We need to cast tx to the db type but also supply a fake $client, though
    // it's only required for type compatibility in callbacks that expect db.

    // If your code relies on db.$client or anything else not present on tx,
    // you'll need to provide a more advanced adapter here.
    // For now, we cast tx to type 'typeof db' to suppress type errors.
    return await db.transaction(async (tx) => {
        return await callback(tx as unknown as typeof db);
    });
}



export default db;

