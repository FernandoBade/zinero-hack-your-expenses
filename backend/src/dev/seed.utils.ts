import { Request, Response, NextFunction } from 'express';
import { Locale } from '../../../shared/i18n/types/locale';
import { SeedConfig } from './seed.config';

export type SeedRegistry = {
    emails: Set<string>;
};

export type SeedContext = {
    config: SeedConfig;
    random: SeedRandom;
    logger: SeedLogger;
    language: Locale;
    registry: SeedRegistry;
};

export type SeedRequestOptions = {
    body?: unknown;
    params?: Record<string, string>;
    query?: Record<string, string | string[]>;
    language?: Locale;
    userId?: number;
};

type ControllerPayload<T> = {
    success: boolean;
    data?: T;
    error?: unknown;
    message?: string;
};

type ControllerHandler = (req: Request, res: Response, next: NextFunction) => Promise<unknown> | unknown;

class MockResponse<T> {
    headersSent = false;
    locals: Record<string, unknown> = { _startNs: process.hrtime.bigint() };
    statusCode?: number;
    payload?: ControllerPayload<T>;

    /**
     * @summary Stores the mocked HTTP status code for controller execution tests.
     */
    status(code: number) {
        this.statusCode = code;
        return this;
    }

        /**
     * @summary Stores the mocked JSON payload and marks the response as sent.
     */
    json(data: ControllerPayload<T>) {
        this.payload = data;
        this.headersSent = true;
        return this;
    }
}

/**
 * Error wrapper used when controller execution fails during seeding.
 *
 * @summary Represents an error returned by a controller invocation.
 */
export class SeedControllerError extends Error {
    statusCode?: number;
    payload?: unknown;

    constructor(message: string, statusCode?: number, payload?: unknown) {
        super(message);
        this.statusCode = statusCode;
        this.payload = payload;
    }
}

/**
 * Invokes a controller handler with mocked Express request/response objects.
 *
 * @summary Executes a controller and returns the response payload data.
 */
export async function executeController<T>(
    handler: ControllerHandler,
    options: SeedRequestOptions
): Promise<T> {
    const req = createMockRequest(options);
    const res = new MockResponse<T>();
    let nextError: unknown;

    /**
     * @summary Captures controller errors passed through Express next.
     */
    const next: NextFunction = (error?: unknown) => {
        if (error) {
            nextError = error;
        }
    };

    await handler(req, res as unknown as Response, next);

    if (nextError) {
        throw new SeedControllerError('Controller execution failed with next() error.', res.statusCode, nextError);
    }

    if (!res.payload) {
        throw new SeedControllerError('Controller did not return a response payload.', res.statusCode);
    }

    if (!res.payload.success) {
        const message = buildPayloadMessage(res.payload);
        throw new SeedControllerError(message, res.statusCode, res.payload);
    }

    return res.payload.data as T;
}

/**
 * Seed-friendly random number generator with optional deterministic seeding.
 *
 * @summary Provides deterministic random values when a seed is supplied.
 */
export class SeedRandom {
    private readonly rng: () => number;

    constructor(seed?: number) {
        this.rng = seed === undefined ? Math.random : createMulberry32(seed);
    }

    /**
     * @summary Returns a random float between min and max.
     */
    float(min: number, max: number): number {
        return min + (max - min) * this.rng();
    }

    /**
     * @summary Returns a random integer between min and max (inclusive).
     */
    int(min: number, max: number): number {
        const low = Math.ceil(min);
        const high = Math.floor(max);
        return Math.floor(this.rng() * (high - low + 1)) + low;
    }

    /**
     * @summary Returns true based on the given probability.
     */
    chance(probability: number): boolean {
        return this.rng() < probability;
    }

    /**
     * @summary Picks a random item from a list.
     */
    pickOne<T>(items: T[]): T {
        if (items.length === 0) {
            throw new Error('SeedInvariantViolation: pickOne called with empty list.');
        }
        return items[this.int(0, items.length - 1)];
    }

    /**
     * @summary Returns a shuffled copy of a list.
     */
    shuffle<T>(items: T[]): T[] {
        const copy = [...items];
        for (let i = copy.length - 1; i > 0; i -= 1) {
            const j = this.int(0, i);
            [copy[i], copy[j]] = [copy[j], copy[i]];
        }
        return copy;
    }

    /**
     * @summary Picks a set of unique items from a list.
     */
    pickMany<T>(items: T[], count: number): T[] {
        if (count <= 0) return [];
        return this.shuffle(items).slice(0, Math.min(count, items.length));
    }
}

/**
 * Lightweight logger for seed progress output.
 *
 * @summary Logs progress messages during seed execution.
 */
export class SeedLogger {
    private readonly startTime = Date.now();

    /**
     * @summary Logs a section header for seed progress.
     */
    section(message: string) {
        console.log(`\n[seed] ${message}`);
    }

    /**
     * @summary Logs an informational seed message.
     */
    info(message: string) {
        console.log(`[seed] ${message}`);
    }

    /**
     * @summary Returns elapsed seconds since seed start.
     */
    elapsedSeconds(): number {
        return Math.round((Date.now() - this.startTime) / 1000);
    }
}

/**
 * Suppresses non-seed stdout/stderr output during heavy data generation.
 *
 * @summary Filters noisy logs while preserving seed progress and errors.
 */
export function suppressNonSeedOutput(): () => void {
    const originalStdoutWrite = process.stdout.write.bind(process.stdout);
    const originalStderrWrite = process.stderr.write.bind(process.stderr);
    const allowedPatterns = [
        /^\[seed]/i,
        /\bseed\b/i,
        /\berror\b/i,
        /\balert\b/i,
        /SeedInvariantViolation/,
    ];

    /**
     * @summary Allows only seed-relevant output chunks to pass through stdout/stderr.
     */
    const shouldAllow = (chunk: unknown) => {
        const text = stripAnsi(bufferToString(chunk));
        return allowedPatterns.some(pattern => pattern.test(text));
    };

    /**
     * @summary Writes output chunks only when they match allowed seed logging patterns.
     */
    const writeFiltered = (
        originalWrite: typeof process.stdout.write,
        chunk: unknown,
        encoding?: BufferEncoding,
        callback?: (error?: Error | null) => void
    ) => {
        if (shouldAllow(chunk)) {
            return originalWrite(chunk as never, encoding as never, callback as never);
        }
        if (typeof callback === 'function') {
            callback();
        }
        return true;
    };

    process.stdout.write = ((chunk: unknown, encoding?: BufferEncoding, callback?: (error?: Error | null) => void) =>
        writeFiltered(originalStdoutWrite, chunk, encoding, callback)) as typeof process.stdout.write;

    process.stderr.write = ((chunk: unknown, encoding?: BufferEncoding, callback?: (error?: Error | null) => void) =>
        writeFiltered(originalStderrWrite, chunk, encoding, callback)) as typeof process.stderr.write;

    return () => {
        process.stdout.write = originalStdoutWrite;
        process.stderr.write = originalStderrWrite;
    };
}

/**
 * Parses the user count from CLI args or npm lifecycle event.
 *
 * @summary Extracts the target number of users for seeding.
 */
export function parseUserCount(args: string[], env: NodeJS.ProcessEnv): number {
    const directArg = args.find(arg => /^\d+$/.test(arg));
    const lifecycleMatch = env.npm_lifecycle_event?.match(/seed:(\d+)$/);
    const envValue = env.SEED_USERS;
    const fallbackValue = env.SEED_USERS_DEFAULT ?? '1';

    const value = envValue ?? directArg ?? lifecycleMatch?.[1] ?? fallbackValue;

    if (!value) {
        throw new Error('Seed requires a user count. Example: npm run seed:10 or npm run seed -- 10');
    }

    const count = Number(value);
    if (!Number.isInteger(count) || count <= 0) {
        throw new Error('Seed user count must be a positive integer.');
    }

    return count;
}

/**
 * Creates a URL-safe lowercase slug.
 *
 * @summary Normalizes strings for email generation.
 */
export function slugify(value: string): string {
    return value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '.')
        .replace(/^\.+|\.+$/g, '')
        .replace(/\.+/g, '.');
}

/**
 * Formats a template string using the provided tokens.
 *
 * @summary Generates transaction observation strings.
 */
export function formatObservation(template: string, tokens: Record<string, string>): string {
    return Object.entries(tokens).reduce((acc, [key, val]) => {
        return acc.replace(new RegExp(`\\{${key}\\}`, 'g'), val);
    }, template);
}

/**
 * Generates a random date within a range.
 *
 * @summary Returns a random date between start and end.
 */
export function randomDateBetween(random: SeedRandom, start: Date, end: Date): Date {
    const startMs = start.getTime();
    const endMs = end.getTime();
    const timestamp = random.int(startMs, endMs);
    return new Date(timestamp);
}

/**
 * Generates a random date within a range with a fixed day of month.
 *
 * @summary Returns a random date aligned to the provided day of month.
 */
export function randomDateWithDay(random: SeedRandom, start: Date, end: Date, day: number): Date {
    for (let attempt = 0; attempt < 6; attempt += 1) {
        const year = random.int(start.getFullYear(), end.getFullYear());
        const month = random.int(0, 11);
        const candidate = new Date(year, month, day);
        if (candidate >= start && candidate <= end) {
            return candidate;
        }
    }
    return randomDateBetween(random, start, end);
}

/**
 * Rounds a numeric value to two decimal places.
 *
 * @summary Ensures currency values match decimal storage.
 */
export function roundCurrency(value: number): number {
    return Math.round(value * 100) / 100;
}

/**
 * Clamps a number into a given range.
 *
 * @summary Ensures values stay within min/max bounds.
 */
export function clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
}

/**
 * Distributes a total count across buckets with an optional minimum per bucket.
 *
 * @summary Creates a randomized distribution array with a fixed total.
 */
export function distributeCount(random: SeedRandom, total: number, buckets: number, minPerBucket = 0): number[] {
    if (buckets <= 0) return [];
    const safeMin = Math.min(minPerBucket, Math.floor(total / buckets));
    const counts = Array.from({ length: buckets }, () => safeMin);
    let remaining = total - safeMin * buckets;

    while (remaining > 0) {
        const index = random.int(0, buckets - 1);
        counts[index] += 1;
        remaining -= 1;
    }

    return counts;
}

/**
 * Builds a minimal Express request mock.
 *
 * @summary Creates a Request object compatible with controllers.
 */
function createMockRequest(options: SeedRequestOptions): Request {
    return {
        body: options.body ?? {},
        params: options.params ?? {},
        query: options.query ?? {},
        language: options.language,
        user: options.userId ? { id: options.userId } : undefined,
    } as Request;
}

/**
 * Builds a descriptive error message from a controller payload.
 *
 * @summary Normalizes controller error messages for seed failures.
 */
function buildPayloadMessage(payload: ControllerPayload<unknown>): string {
    if (payload.message) {
        return payload.message;
    }

    if (payload.error) {
        return `Controller error: ${JSON.stringify(payload.error)}`;
    }

    return 'Controller returned an error response.';
}

/**
 * Creates a deterministic RNG using the mulberry32 algorithm.
 *
 * @summary Returns a seeded random number generator.
 */
function createMulberry32(seed: number): () => number {
    let t = seed;
    return () => {
        t += 0x6D2B79F5;
        let r = Math.imul(t ^ (t >>> 15), 1 | t);
        r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
        return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
}

/**
 * Converts stdout chunks into a string for filtering.
 *
 * @summary Normalizes output chunks into string values.
 */
function bufferToString(value: unknown): string {
    if (typeof value === 'string') {
        return value;
    }
    if (Buffer.isBuffer(value)) {
        return value.toString('utf8');
    }
    return String(value);
}

/**
 * Removes ANSI escape sequences from log output.
 *
 * @summary Strips color codes for reliable pattern matching.
 */
function stripAnsi(value: string): string {
    let output = '';
    let index = 0;

    while (index < value.length) {
        const escapeIndex = value.indexOf('\u001b[', index);
        if (escapeIndex === -1) {
            output += value.slice(index);
            break;
        }

        output += value.slice(index, escapeIndex);

        let cursor = escapeIndex + 2;
        while (cursor < value.length) {
            const char = value[cursor];
            const isDigit = char >= '0' && char <= '9';
            if (!isDigit && char !== ';') {
                break;
            }
            cursor++;
        }

        if (cursor < value.length && value[cursor] === 'm') {
            index = cursor + 1;
            continue;
        }

        output += value[escapeIndex];
        index = escapeIndex + 1;
    }

    return output;
}
