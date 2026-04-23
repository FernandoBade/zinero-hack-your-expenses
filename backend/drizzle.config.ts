import type { Config } from 'drizzle-kit';
import { getBackendConfig } from './src/config/env';

const { database } = getBackendConfig();

/**
 * Drizzle Kit configuration for database migrations and schema management.
 * Configures connection to MySQL database using environment variables.
 */
export default {
    schema: './src/db/schema/index.ts',
    out: './drizzle',
    dialect: 'mysql',
    dbCredentials: {
        host: database.host,
        user: database.user,
        password: database.password,
        database: database.database,
        port: database.port,
    },
} satisfies Config;

