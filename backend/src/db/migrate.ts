import { migrate } from 'drizzle-orm/mysql2/migrator';
import { db } from './client';

/**
 * @summary Executes all pending Drizzle migrations and exits with process status code.
 */
async function runMigrations() {
    try {
        await migrate(db, { migrationsFolder: './drizzle' });
        console.log('Database migrated successfully');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed', error);
        process.exit(1);
    }
}

runMigrations();
