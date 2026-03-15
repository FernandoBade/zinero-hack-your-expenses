import { createLogger, format, transports, addColors } from "winston";
import { NextFunction, Response, Request } from "express";
import { HTTPStatus } from "../../../shared/enums/http-status.enums";
import { LogType, LogOperation, LogCategory } from "../../../shared/enums/log.enums";
import { ErrorCode, type ErrorCode as ErrorCodeType } from "../../../shared/errors/error-codes";
import type { FieldKey } from "../../../shared/fields/field-keys";
import type { TranslationParams } from "../../../shared/i18n/types/catalog";

/**
 * @summary Lazily resolves the log service to avoid eager circular imports during bootstrap.
 */
async function getLogService() {
    const { LogService } = await import("../service/logService");
    return new LogService();
}

const customLogs = {
    levels: {
        [LogType.ERROR]: 0,
        [LogType.ALERT]: 1,
        [LogType.SUCCESS]: 2,
        [LogType.DEBUG]: 3,
    },
    colors: {
        [LogType.ERROR]: "red",
        [LogType.ALERT]: "yellow",
        [LogType.SUCCESS]: "green",
        [LogType.DEBUG]: "magenta",
    },
} as const;

addColors(customLogs.colors);

const logger = createLogger({
    levels: customLogs.levels,
    format: format.combine(
        format.timestamp(),
        format.colorize({ all: true }),
        format.printf(({ timestamp, level, message }) => `[${timestamp}][${level}]${message}`)
    ),
    transports: [new transports.Console({ level: LogType.DEBUG })],
});

const LOG_DETAIL_IGNORED_FIELDS = ["createdAt", "updatedAt"];

function isPlainObject(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === "object" && value?.constructor === Object;
}

function isPaginatedData(value: unknown): value is { data: unknown; meta: Record<string, unknown> } {
    if (!isPlainObject(value)) {
        return false;
    }
    if (!("data" in value) || !("meta" in value)) {
        return false;
    }
    return isPlainObject(value.meta);
}

export function sanitizeLogDetail<T extends object>(detail: T, ignoreKeys: string[] = []): Record<string, unknown> {
    const ignored = new Set([...LOG_DETAIL_IGNORED_FIELDS, ...ignoreKeys]);
    const payload = detail as Record<string, unknown>;
    return Object.keys(payload).reduce((acc, key) => {
        if (!ignored.has(key)) {
            acc[key] = payload[key];
        }
        return acc;
    }, {} as Record<string, unknown>);
}

function areLogValuesEqual(left: unknown, right: unknown): boolean {
    if (left === right) {
        return true;
    }

    if (left instanceof Date && right instanceof Date) {
        return left.getTime() === right.getTime();
    }

    if (left && right && typeof left === "object" && typeof right === "object") {
        return JSON.stringify(left) === JSON.stringify(right);
    }

    return false;
}

export function buildLogDelta<T extends object>(
    before: T,
    after: T,
    ignoreKeys: string[] = []
): Record<string, { from: unknown; to: unknown }> {
    const safeBefore = sanitizeLogDetail(before, ignoreKeys);
    const safeAfter = sanitizeLogDetail(after, ignoreKeys);
    const keys = new Set([...Object.keys(safeBefore), ...Object.keys(safeAfter)]);
    const delta: Record<string, { from: unknown; to: unknown }> = {};

    for (const key of keys) {
        const previousValue = safeBefore[key];
        const currentValue = safeAfter[key];
        if (!areLogValuesEqual(previousValue, currentValue)) {
            delta[key] = { from: previousValue, to: currentValue };
        }
    }

    return delta;
}

/**
 * @summary Logs to console and delegates persistence.
 */
export async function createLog(
    logType: LogType,
    operation: LogOperation,
    category: LogCategory,
    detail: unknown,
    userId?: number,
    _next?: NextFunction
) {
    const normalizedDetail = isPlainObject(detail) ? sanitizeLogDetail(detail) : detail;
    const logMessage = typeof normalizedDetail === "object" ? JSON.stringify(normalizedDetail) : String(normalizedDetail);

    logger.log(logType, `[${operation}][${category}]: ${logMessage}`.trim());

    const logService = await getLogService();
    await logService.createLog(logType, operation, category, logMessage, userId);
}

/**
 * @summary Builds standardized API responses with machine-stable error contracts.
 */
export function answerAPI(
    _req: Request,
    res: Response,
    status: HTTPStatus,
    data?: unknown,
    errorCode?: ErrorCodeType,
    params?: TranslationParams,
    field?: FieldKey
) {
    if (res.headersSent) {
        return;
    }

    const success = status === HTTPStatus.OK || status === HTTPStatus.CREATED;
    const elapsedTime = getDurationMs(res);

    const response: Record<string, unknown> = {
        success,
        elapsedTime,
    };

    if (success) {
        if (data !== undefined) {
            if (isPaginatedData(data)) {
                const { data: payload, meta } = data;
                const { page, pageSize, pageCount, total, ...restMeta } = meta || {};
                response.data = payload;
                if (Object.keys(restMeta).length > 0) {
                    response.meta = restMeta;
                }
                if (page !== undefined) response.page = page;
                if (pageSize !== undefined) response.pageSize = pageSize;
                if (pageCount !== undefined) response.pageCount = pageCount;
                if (total !== undefined) response.totalItems = total;
            } else {
                response.data = data;
            }
        }
        return res.status(status).json(response);
    }

    response.errorCode = errorCode ?? ErrorCode.INTERNAL_SERVER_ERROR;
    if (params) {
        response.params = params;
    }
    if (field) {
        response.field = field;
    }
    if (data !== undefined) {
        response.error = JSON.parse(JSON.stringify(data));
    }

    return res.status(status).json(response);
}

/**
 * @summary Normalizes unknown thrown values into serializable payloads.
 */
export function formatError(error: unknown): Record<string, unknown> {
    if (error instanceof Error) {
        const detailedError = error as Error & {
            sqlMessage?: string;
            code?: string;
            errno?: number;
            sqlState?: string;
        };

        const message =
            error.message ||
            detailedError.sqlMessage ||
            detailedError.code ||
            ErrorCode.UNEXPECTED_ERROR;

        return {
            message,
            name: error.name,
            ...(detailedError.code && { code: detailedError.code }),
            ...(detailedError.errno && { errno: detailedError.errno }),
            ...(detailedError.sqlState && { sqlState: detailedError.sqlState }),
        };
    }

    if (typeof error === "object" && error !== null) {
        return error as Record<string, unknown>;
    }

    return { message: error };
}

/**
 * @summary Sends a standardized error response payload.
 */
export function sendErrorResponse(
    req: Request,
    res: Response,
    status: HTTPStatus,
    errorCode: ErrorCodeType,
    error?: unknown,
    params?: TranslationParams,
    field?: FieldKey
) {
    return answerAPI(
        req,
        res,
        status,
        error ? formatError(error) : undefined,
        errorCode,
        params,
        field
    );
}

/**
 * @summary Registers middleware that captures request start time for elapsed-time metrics.
 */
export function requestTimer() {
    return (_req: Request, res: Response, next: NextFunction) => {
        res.locals._startNs = process.hrtime.bigint();
        next();
    };
}

/**
 * @summary Computes elapsed request time in milliseconds from requestTimer middleware metadata.
 */
function getDurationMs(res: Response): number {
    const start: bigint | undefined = res.locals?._startNs;
    if (!start) {
        return 0;
    }
    const end = process.hrtime.bigint();
    return Number((end - start) / BigInt(1_000_000));
}
