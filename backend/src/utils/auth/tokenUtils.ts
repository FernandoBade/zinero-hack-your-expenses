import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { createLog } from '../commons';
import { LogCategory, LogType, LogOperation } from '../../../../shared/enums/log.enums';
import { PERSISTED_TOKEN_EXPIRES_IN } from './tokenConfig';
import { getBackendConfig } from '../../config/env';

/**
 * Ensures that required JWT secrets are defined.
 * If any secret is missing, logs a DEBUG message and throws an internal error.
 *
 * @summary Validates required JWT secrets.
 */
function ensureSecrets() {
    const {
        auth: {
            jwt: {
                accessSecret,
                refreshSecret,
            },
        },
    } = getBackendConfig();

    if (accessSecret && refreshSecret) {
        return {
            accessSecret,
            refreshSecret,
        };
    }

    if (!accessSecret || !refreshSecret) {
        const message = `[TokenUtils] JWT secret(s) missing:

        - JWT_ACCESS_SECRET: ${accessSecret ? 'DEFINED' : 'MISSING'}
        - JWT_REFRESH_SECRET: ${refreshSecret ? 'DEFINED' : 'MISSING'}

        These secrets are required to sign and verify JWT tokens.

        Please define them in your .env file. Example:
            JWT_ACCESS_SECRET=your_super_secret_key
            JWT_REFRESH_SECRET=your_other_super_secret_key
        `;

        createLog(LogType.DEBUG, LogOperation.CREATE, LogCategory.AUTH, message);
        throw new Error('TokenUtilsInvariantViolation: jwt secrets missing');
    }

    return {
        accessSecret,
        refreshSecret,
    };
}

/**
 * Builds JWT sign options with optional issuer/audience.
 *
 * @summary Builds token-signing options with algorithm and optional issuer/audience constraints.
 */
function buildSignOptions(expiresIn: jwt.SignOptions['expiresIn']): jwt.SignOptions {
    const {
        auth: {
            jwt: {
                issuer,
                audience,
                algorithm,
            },
        },
    } = getBackendConfig();
    const options: jwt.SignOptions = { expiresIn, algorithm };

    if (issuer) {
        options.issuer = issuer;
    }

    if (audience) {
        options.audience = audience;
    }

    return options;
}

/**
 * Builds JWT verify options with optional issuer/audience enforcement.
 *
 * @summary Builds token-verification options enforcing configured issuer/audience values.
 */
function buildVerifyOptions(): jwt.VerifyOptions {
    const {
        auth: {
            jwt: {
                issuer,
                audience,
                algorithm,
            },
        },
    } = getBackendConfig();
    const options: jwt.VerifyOptions = { algorithms: [algorithm] };

    if (issuer) {
        options.issuer = issuer;
    }

    if (audience) {
        options.audience = audience;
    }

    return options;
}

export const TokenUtils = {
        /**
     * @summary Signs a short-lived JWT access token for authenticated requests.
     * @param payload - Data to embed in the token (e.g. user ID).
     * @returns Signed access token.
     */

    generateAccessToken(payload: object): string {
        const { accessSecret } = ensureSecrets();
        return jwt.sign(payload, accessSecret, buildSignOptions('1h'));
    },

        /**
     * @summary Signs a persisted JWT refresh token used for token rotation flows.
     * @param payload - Data to embed in the token.
     * @returns Signed refresh token.
     */

    generateRefreshToken(payload: object): string {
        const { refreshSecret } = ensureSecrets();
        return jwt.sign(payload, refreshSecret, buildSignOptions(PERSISTED_TOKEN_EXPIRES_IN));
    },

        /**
     * @summary Verifies an access token signature and returns its decoded payload.
     * @param token - Access token to verify.
     * @returns Decoded payload.
     */

    verifyAccessToken(token: string) {
        const { accessSecret } = ensureSecrets();
        return jwt.verify(token, accessSecret, buildVerifyOptions());
    },

        /**
     * @summary Verifies a refresh token signature and returns its decoded payload.
     * @param token - Refresh token to verify.
     * @returns Decoded payload.
     */

    verifyRefreshToken(token: string) {
        const { refreshSecret } = ensureSecrets();
        return jwt.verify(token, refreshSecret, buildVerifyOptions());
    },

        /**
     * @summary Hashes refresh tokens for secure persistence and comparison.
     * @param token - Refresh token to hash.
     * @returns HMAC-SHA256 hash in hex format.
     */

    hashRefreshToken(token: string): string {
        const { refreshSecret } = ensureSecrets();
        return crypto.createHmac('sha256', refreshSecret).update(token).digest('hex');
    }
};

