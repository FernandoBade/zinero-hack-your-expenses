import { Request, Response, NextFunction } from 'express';
import { answerAPI } from '../commons';
import { HTTPStatus } from '../../../../shared/enums/http-status.enums';
import { ErrorCode } from '../../../../shared/errors/error-codes';

type AttemptStore = Map<string, number[]>;

type Scope =
    | 'login'
    | 'refresh'
    | 'signup'
    | 'resendVerification'
    | 'forgotPassword'
    | 'verifyEmail'
    | 'resetPassword';

type RateLimitConfig = {
    maxAttempts: number;
    windowMs: number;
};

const MINUTE_IN_MS = 60 * 1000;

const RATE_LIMITS: Record<Scope, RateLimitConfig> = {
    login: {
        maxAttempts: 5,
        windowMs: 15 * MINUTE_IN_MS,
    },
    refresh: {
        maxAttempts: 10,
        windowMs: 15 * MINUTE_IN_MS,
    },
    signup: {
        maxAttempts: 5,
        windowMs: 30 * MINUTE_IN_MS,
    },
    resendVerification: {
        maxAttempts: 5,
        windowMs: 15 * MINUTE_IN_MS,
    },
    forgotPassword: {
        maxAttempts: 5,
        windowMs: 15 * MINUTE_IN_MS,
    },
    verifyEmail: {
        maxAttempts: 10,
        windowMs: 15 * MINUTE_IN_MS,
    },
    resetPassword: {
        maxAttempts: 10,
        windowMs: 15 * MINUTE_IN_MS,
    },
};

const loginAttempts: AttemptStore = new Map();
const refreshAttempts: AttemptStore = new Map();
const signupAttempts: AttemptStore = new Map();
const resendVerificationAttempts: AttemptStore = new Map();
const forgotPasswordAttempts: AttemptStore = new Map();
const verifyEmailAttempts: AttemptStore = new Map();
const resetPasswordAttempts: AttemptStore = new Map();

const ATTEMPT_STORES: Record<Scope, AttemptStore> = {
    login: loginAttempts,
    refresh: refreshAttempts,
    signup: signupAttempts,
    resendVerification: resendVerificationAttempts,
    forgotPassword: forgotPasswordAttempts,
    verifyEmail: verifyEmailAttempts,
    resetPassword: resetPasswordAttempts,
};

/**
 * @summary Normalizes email input used to scope auth rate-limit fingerprints.
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
 * @summary Builds a rate-limit key combining scope, client IP, and optional email address.
 */
const buildKey = (scope: Scope, req: Request): string => {
    const ip = getClientIp(req);

    if (scope === 'refresh' || scope === 'verifyEmail' || scope === 'resetPassword') {
        return `${scope}:${ip}`;
    }

    const email = normalizeEmail(req.body?.email);
    return email ? `${scope}:${ip}:${email}` : `${scope}:${ip}`;
};

/**
 * @summary Removes expired attempts outside the configured rate-limit window.
 */
const pruneAttempts = (attempts: number[], now: number, windowMs: number): number[] =>
    attempts.filter((timestamp) => now - timestamp < windowMs);

/**
 * @summary Checks whether a key has exceeded the configured attempt window.
 */
const isRateLimited = (scope: Scope, key: string, now = Date.now()): boolean => {
    const config = RATE_LIMITS[scope];
    const store = ATTEMPT_STORES[scope];
    const attempts = pruneAttempts(store.get(key) ?? [], now, config.windowMs);

    if (attempts.length >= config.maxAttempts) {
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
 * @summary Records a failed or request-window attempt for the given auth scope.
 */
const registerAttempt = (scope: Scope, key: string, now = Date.now()): void => {
    const config = RATE_LIMITS[scope];
    const store = ATTEMPT_STORES[scope];
    const attempts = pruneAttempts(store.get(key) ?? [], now, config.windowMs);
    attempts.push(now);
    store.set(key, attempts);
};

/**
 * @summary Clears tracked attempts for the provided auth scope and key.
 */
const resetAttempts = (scope: Scope, key: string): void => {
    ATTEMPT_STORES[scope].delete(key);
};

/**
 * @summary Creates middleware that counts every request inside the configured auth window.
 */
const createWindowRateLimiter = (scope: Scope) => (req: Request, res: Response, next: NextFunction) => {
    const key = buildKey(scope, req);
    if (isRateLimited(scope, key)) {
        answerAPI(req, res, HTTPStatus.TOO_MANY_REQUESTS, undefined, ErrorCode.TOO_MANY_REQUESTS);
        return;
    }

    registerAttempt(scope, key);
    next();
};

/**
 * @summary Blocks login attempts that exceed the configured credential-failure window.
 */
export const rateLimitLogin = (req: Request, res: Response, next: NextFunction) => {
    const key = buildKey('login', req);
    if (isRateLimited('login', key)) {
        answerAPI(req, res, HTTPStatus.TOO_MANY_REQUESTS, undefined, ErrorCode.TOO_MANY_REQUESTS);
        return;
    }

    next();
};

/**
 * @summary Blocks refresh attempts that exceed the configured failure window.
 */
export const rateLimitRefresh = (req: Request, res: Response, next: NextFunction) => {
    const key = buildKey('refresh', req);
    if (isRateLimited('refresh', key)) {
        answerAPI(req, res, HTTPStatus.TOO_MANY_REQUESTS, undefined, ErrorCode.TOO_MANY_REQUESTS);
        return;
    }

    next();
};

/**
 * @summary Blocks signup requests that exceed the configured public window.
 */
export const rateLimitSignup = createWindowRateLimiter('signup');

/**
 * @summary Blocks verification resend requests that exceed the configured public window.
 */
export const rateLimitResendVerification = createWindowRateLimiter('resendVerification');

/**
 * @summary Blocks forgot-password requests that exceed the configured public window.
 */
export const rateLimitForgotPassword = createWindowRateLimiter('forgotPassword');

/**
 * @summary Blocks verify-email requests that exceed the configured public window.
 */
export const rateLimitVerifyEmail = createWindowRateLimiter('verifyEmail');

/**
 * @summary Blocks password-reset submissions that exceed the configured public window.
 */
export const rateLimitResetPassword = createWindowRateLimiter('resetPassword');

/**
 * @summary Registers a failed login attempt for the current request fingerprint.
 */
export const recordLoginFailure = (req: Request): void => {
    const key = buildKey('login', req);
    registerAttempt('login', key);
};

/**
 * @summary Clears stored login failures for the current request fingerprint.
 */
export const resetLoginRateLimit = (req: Request): void => {
    const key = buildKey('login', req);
    resetAttempts('login', key);
};

/**
 * @summary Registers a failed refresh attempt for the current request fingerprint.
 */
export const recordRefreshFailure = (req: Request): void => {
    const key = buildKey('refresh', req);
    registerAttempt('refresh', key);
};

/**
 * @summary Clears stored refresh failures for the current request fingerprint.
 */
export const resetRefreshRateLimit = (req: Request): void => {
    const key = buildKey('refresh', req);
    resetAttempts('refresh', key);
};

/**
 * @summary Clears all in-memory auth rate-limit state.
 */
export const clearRateLimitState = (): void => {
    Object.values(ATTEMPT_STORES).forEach((store) => {
        store.clear();
    });
};
