import { Request, Response, NextFunction } from 'express';
import { answerAPI } from '../commons';
import { HTTPStatus } from '../../../../shared/enums/http-status.enums';
import { ErrorCode } from '../../../../shared/errors/error-codes';

const RATE_LIMIT_MAX_ATTEMPTS = 5;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;

type AttemptStore = Map<string, number[]>;

const loginAttempts: AttemptStore = new Map();
const refreshAttempts: AttemptStore = new Map();

/**
 * @summary Normalizes email input used to scope login rate-limit fingerprints.
 */
const normalizeEmail = (value: unknown): string | null => {
    if (typeof value !== 'string') {
        return null;
    }
    const normalized = value.trim().toLowerCase();
    return normalized.length > 0 ? normalized : null;
};

/**
 * @summary Resolves the best-available client IP for in-memory rate-limit keys.
 */
const getClientIp = (req: Request): string => {
    if (typeof req.ip === 'string' && req.ip.trim().length > 0) {
        return req.ip;
    }
    return 'unknown';
};

/**
 * @summary Builds a rate-limit key combining scope, client IP, and optional login email.
 */
const buildKey = (scope: 'login' | 'refresh', req: Request): string => {
    const ip = getClientIp(req);
    if (scope === 'refresh') {
        return `${scope}:${ip}`;
    }

    const email = normalizeEmail(req.body?.email);
    return email ? `${scope}:${ip}:${email}` : `${scope}:${ip}`;
};

/**
 * @summary Removes expired attempts outside the configured rate-limit window.
 */
const pruneAttempts = (attempts: number[], now: number) =>
    attempts.filter((timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS);

/**
 * @summary Checks whether a key has exceeded the maximum number of attempts in the active window.
 */
const isRateLimited = (store: AttemptStore, key: string, now = Date.now()): boolean => {
    const attempts = pruneAttempts(store.get(key) ?? [], now);
    if (attempts.length >= RATE_LIMIT_MAX_ATTEMPTS) {
        store.set(key, attempts);
        return true;
    }
    if (attempts.length === 0) {
        store.delete(key);
    } else {
        store.set(key, attempts);
    }
    return false;
};

/**
 * @summary Records a failed attempt timestamp for the given in-memory rate-limit key.
 */
const registerFailure = (store: AttemptStore, key: string, now = Date.now()): void => {
    const attempts = pruneAttempts(store.get(key) ?? [], now);
    attempts.push(now);
    store.set(key, attempts);
};

/**
 * @summary Clears all tracked attempts for the provided rate-limit key.
 */
const resetFailures = (store: AttemptStore, key: string): void => {
    store.delete(key);
};

/**
 * @summary Blocks login attempts that exceed the configured rate-limit window.
 */
export const rateLimitLogin = (req: Request, res: Response, next: NextFunction) => {
    const key = buildKey('login', req);
    if (isRateLimited(loginAttempts, key)) {
        answerAPI(req, res, HTTPStatus.TOO_MANY_REQUESTS, undefined, ErrorCode.TOO_MANY_REQUESTS);
        return;
    }
    next();
};

/**
 * @summary Blocks refresh attempts that exceed the configured rate-limit window.
 */
export const rateLimitRefresh = (req: Request, res: Response, next: NextFunction) => {
    const key = buildKey('refresh', req);
    if (isRateLimited(refreshAttempts, key)) {
        answerAPI(req, res, HTTPStatus.TOO_MANY_REQUESTS, undefined, ErrorCode.TOO_MANY_REQUESTS);
        return;
    }
    next();
};

/**
 * @summary Registers a failed login attempt for the current request fingerprint.
 */
export const recordLoginFailure = (req: Request): void => {
    const key = buildKey('login', req);
    registerFailure(loginAttempts, key);
};

/**
 * @summary Clears stored login failures for the current request fingerprint.
 */
export const resetLoginRateLimit = (req: Request): void => {
    const key = buildKey('login', req);
    resetFailures(loginAttempts, key);
};

/**
 * @summary Registers a failed refresh attempt for the current request fingerprint.
 */
export const recordRefreshFailure = (req: Request): void => {
    const key = buildKey('refresh', req);
    registerFailure(refreshAttempts, key);
};

/**
 * @summary Clears stored refresh failures for the current request fingerprint.
 */
export const resetRefreshRateLimit = (req: Request): void => {
    const key = buildKey('refresh', req);
    resetFailures(refreshAttempts, key);
};

/**
 * @summary Clears all in-memory login and refresh rate-limit state.
 */
export const clearRateLimitState = (): void => {
    loginAttempts.clear();
    refreshAttempts.clear();
};

