import { LogType, LogOperation, LogCategory } from '../../../shared/enums/log.enums';
import { FilterOperator } from '../../../shared/enums/operator.enums';
import { LogRepository } from '../repositories/logRepository';
import { UserRepository } from '../repositories/userRepository';
import { ErrorCode } from '../../../shared/errors/error-codes';
import { SelectLog, InsertLog } from '../db/schema';
import { createLog } from '../utils/commons';
import { db } from '../db';
import { logs } from '../db/schema';
import { lt } from 'drizzle-orm';

/**
 * Service for log business logic.
 * Handles log operations including creation and cleanup.
 */
export class LogService {
    private logRepository: LogRepository;
    private userRepository: UserRepository;

    constructor() {
        this.logRepository = new LogRepository();
        this.userRepository = new UserRepository();
    }

    /**
     * Creates a new log entry.
     *
     * @summary Creates a log entry when audit rules allow persistence.
     * @param type - Severity of the log (e.g., DEBUG, ERROR).
     * @param operation - Action performed (e.g., CREATE, DELETE).
     * @param category - Functional category (e.g., USER, AUTH).
     * @param detail - Log message or payload.
     * @param userId - Optional ID of the user related to the log.
     * @returns Insertion result or success confirmation for DEBUG logs.
     */
    async createLog(
        type: LogType,
        operation: LogOperation,
        category: LogCategory,
        detail: string,
        userId?: number
    ): Promise<{ success: true; data?: { id: number } } | { success: false; error: ErrorCode }> {
        if (!this.shouldPersistLog(type, operation, detail)) {
            return { success: true };
        }

        const validUserId = await this.getValidUserId(userId);

        try {
            const created = await this.logRepository.create({
                type,
                operation,
                category,
                detail,
                userId: validUserId,
            } as InsertLog);
            return { success: true, data: { id: created.id } };
        } catch {
            return { success: false, error: ErrorCode.INTERNAL_SERVER_ERROR };
        }
    }

    /**
     * Determines whether a log should be persisted based on audit rules.
     *
     * @summary Applies audit persistence rules for logs.
     * @param type - Severity of the log.
     * @param operation - Operation associated with the log.
     * @param detail - Serialized log detail payload.
     * @returns True when the log should be persisted.
     */
    private shouldPersistLog(type: LogType, operation: LogOperation, detail: string): boolean {
        if (type === LogType.DEBUG) return false;

        if (operation === LogOperation.UPDATE && this.isEmptyUpdateDetail(detail)) {
            return false;
        }

        if (type === LogType.ERROR || type === LogType.ALERT) {
            return true;
        }

        return (
            operation === LogOperation.UPDATE ||
            operation === LogOperation.DELETE ||
            operation === LogOperation.LOGIN ||
            operation === LogOperation.LOGOUT
        );
    }

    /**
     * Checks whether a serialized UPDATE detail payload is empty.
     *
     * @summary Detects empty update deltas.
     * @param detail - Serialized log detail payload.
     * @returns True when the detail is an empty object.
     */
    private isEmptyUpdateDetail(detail: string): boolean {
        const trimmed = detail.trim();
        if (!trimmed) return true;
        if (trimmed === '{}') return true;

        if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
            try {
                const parsed = JSON.parse(trimmed);
                if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                    return Object.keys(parsed).length === 0;
                }
            } catch {
                return false;
            }
        }

        return false;
    }

    /**
     * Verifies whether a user ID exists before associating it with a log.
     *
     * @summary Validates a user ID for log association.
     * @param userId - ID to validate.
     * @returns Validated user ID or null if invalid.
     */
    private async getValidUserId(userId?: number): Promise<number | null> {
        if (!userId || isNaN(userId)) return null;

        const user = await this.userRepository.findById(userId);
        return user?.id ?? null;
    }

    /**
     * Deletes all log entries older than 120 days based on the timestamp field.
     * A DEBUG log is created to record the number of deleted entries.
     *
     * @summary Removes old log entries (older than 120 days).
     * @returns Total number of deleted entries or error on failure.
     */
    async deleteOldLogs(): Promise<{ success: true; data: { deleted: number } } | { success: false; error: ErrorCode }> {
        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - 120);

            const result = await db.delete(logs)
                .where(lt(logs.createdAt, cutoffDate));

            const total = result[0]?.affectedRows ?? 0;

            await createLog(
                LogType.DEBUG,
                LogOperation.DELETE,
                LogCategory.LOG,
                `Deleted ${total} logs older than 120 days`,
                undefined,
            );

            return { success: true, data: { deleted: total } };
        } catch {
            return { success: false, error: ErrorCode.INTERNAL_SERVER_ERROR };
        }
    }

        /**
     * @summary Retrieves logs for a user.
     * @param userId - User ID to filter logs by.
     * @returns Array of logs or error if ID is invalid.
     */

    async getLogsByUser(userId: number | null): Promise<{ success: true; data: SelectLog[] } | { success: false; error: ErrorCode }> {
        if (userId === null || isNaN(userId) || userId <= 0) {
            return { success: false, error: ErrorCode.INVALID_USER_ID };
        }

        try {
            const logList = await this.logRepository.findMany({
                userId: { operator: FilterOperator.EQ, value: userId }
            });
            return { success: true, data: logList };
        } catch {
            return { success: false, error: ErrorCode.INTERNAL_SERVER_ERROR };
        }
    }
}



