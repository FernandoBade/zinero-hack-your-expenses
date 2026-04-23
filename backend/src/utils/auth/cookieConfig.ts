import { PERSISTED_TOKEN_MAX_AGE_MS } from './tokenConfig';
import { getBackendConfig } from '../../config/env';

const { runtime } = getBackendConfig();

/**
 * Base configuration for cookies used in authentication.
 * Ensures security settings based on environment and usage restrictions.
 */
const CookieOptions = {
    httpOnly: true, // Prevents JavaScript access to the cookie (protects from XSS)
    secure: runtime.nodeEnv === 'production', // Only sends cookie over HTTPS in production
    sameSite: 'strict' as const // Prevents cookie from being sent in cross-site requests
};

/**
 * Configuration for the token cookie used for session rotation.
 * This cookie is sent only via HTTP and is inaccessible to client-side scripts.
 */
export const TokenCookie = {
    name: 'refreshToken',
    options: {
        ...CookieOptions,
        maxAge: PERSISTED_TOKEN_MAX_AGE_MS
    }
};

/**
 * Configuration used when clearing cookies (e.g., during logout).
 * Matches the same security settings used when the cookie was set.
 */
export const ClearCookieOptions = {
    ...CookieOptions
};
