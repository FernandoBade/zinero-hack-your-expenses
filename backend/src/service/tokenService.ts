import crypto from 'crypto';
import { TokenRepository } from '../repositories/tokenRepository';
import { SelectToken, InsertToken, tokens } from '../db/schema';
import { ErrorCode } from '../../../shared/errors/error-codes';
import { TokenType } from '../../../shared/enums/auth.enums';
import { LogCategory, LogOperation, LogType } from '../../../shared/enums/log.enums';
import { db } from '../db';
import { lt } from 'drizzle-orm';
import { createLog } from '../utils/commons';
import { buildEmailVerificationExpiresAt, buildPasswordResetExpiresAt } from '../utils/auth/tokenConfig';

const ONE_TIME_TOKEN_BYTES = 32;

/**
 * @summary Generates a cryptographically secure one-time token using URL-safe encoding.
 */
const generateOneTimeToken = (): string => {
    return crypto.randomBytes(ONE_TIME_TOKEN_BYTES).toString('base64url');
};

/**
 * @summary Hashes one-time tokens before persistence to avoid storing raw token values.
 */
const hashOneTimeToken = (token: string): string => {
    return crypto.createHash('sha256').update(token).digest('hex');
};

/**
 * Service for managing token operations in the database.
 * Provides CRUD functionality for tokens.
 */
export class TokenService {
    private tokenRepository: TokenRepository;

    constructor() {
        this.tokenRepository = new TokenRepository();
    }

        /**
     * @summary Retrieves a token by ID.
     * @param id - token ID.
     * @returns token if found, null otherwise.
     */

    async findById(id: number): Promise<SelectToken | null> {
        return await this.tokenRepository.findById(id);
    }

        /**
     * @summary Retrieves a token by token hash.
     * @param tokenHash - Token hash.
     * @returns token if found, or error.
     */

    async findByTokenHash(tokenHash: string): Promise<{ success: true; data: SelectToken } | { success: false; error: ErrorCode }> {
        const tokenRecord = await this.tokenRepository.findByTokenHash(tokenHash);
        if (!tokenRecord) {
            return { success: false, error: ErrorCode.TOKEN_NOT_FOUND };
        }
        return { success: true, data: tokenRecord };
    }

    /**
     * Creates a new token.
     *
     * @summary Creates a token record.
     * @param data - token data.
     * @returns Created token or error.
     */
    async createToken(data: InsertToken): Promise<{ success: true; data: SelectToken } | { success: false; error: ErrorCode }> {
        try {
            const created = await this.tokenRepository.create(data);
            return { success: true, data: created };
        } catch {
            return { success: false, error: ErrorCode.INTERNAL_SERVER_ERROR };
        }
    }

    /**
     * Creates a short-lived email verification token.
     *
     * @summary Generates and stores an email verification token.
     * @param userId - User ID.
     * @returns Raw token and expiration or error.
     */
    async createEmailVerificationToken(userId: number): Promise<{ success: true; data: { token: string; expiresAt: Date } } | { success: false; error: ErrorCode }> {
        try {
            const token = generateOneTimeToken();
            const tokenHash = hashOneTimeToken(token);
            const expiresAt = buildEmailVerificationExpiresAt();

            await this.tokenRepository.create({
                tokenHash,
                userId,
                type: TokenType.EMAIL_VERIFICATION,
                expiresAt,
                sessionId: null,
                sessionExpiresAt: null,
                revokedAt: null,
            });

            return { success: true, data: { token, expiresAt } };
        } catch {
            return { success: false, error: ErrorCode.INTERNAL_SERVER_ERROR };
        }
    }

    /**
     * Validates a email verification token and revokes it.
     *
     * @summary Verifies and consumes an email verification token.
     * @param rawToken - Raw token value.
     * @returns User ID or error if invalid or expired.
     */
    async verifyEmailVerificationToken(rawToken: string): Promise<{ success: true; data: { userId: number; alreadyVerified?: boolean } } | { success: false; error: ErrorCode }> {
        const tokenHash = hashOneTimeToken(rawToken);
        const tokenRecord = await this.tokenRepository.findByTokenHashAndType(tokenHash, TokenType.EMAIL_VERIFICATION);

        if (!tokenRecord) {
            return { success: false, error: ErrorCode.EXPIRED_OR_INVALID_TOKEN };
        }

        const now = new Date();
        if (tokenRecord.revokedAt) {
            return { success: true, data: { userId: tokenRecord.userId, alreadyVerified: true } };
        }

        if (new Date(tokenRecord.expiresAt) < now) {
            await this.tokenRepository.delete(tokenRecord.id);
            return { success: false, error: ErrorCode.EXPIRED_OR_INVALID_TOKEN };
        }

        const revoked = await this.tokenRepository.markTokenRevoked(tokenRecord.id, now);
        if (revoked === 0) {
            return { success: false, error: ErrorCode.EXPIRED_OR_INVALID_TOKEN };
        }

        return { success: true, data: { userId: tokenRecord.userId, alreadyVerified: false } };
    }

    /**
     * Creates a short-lived password reset token.
     *
     * @summary Generates and stores a password reset token.
     * @param userId - User ID.
     * @returns Raw token and expiration or error.
     */
    async createPasswordResetToken(userId: number): Promise<{ success: true; data: { token: string; expiresAt: Date } } | { success: false; error: ErrorCode }> {
        try {
            const token = generateOneTimeToken();
            const tokenHash = hashOneTimeToken(token);
            const expiresAt = buildPasswordResetExpiresAt();

            await this.tokenRepository.create({
                tokenHash,
                userId,
                type: TokenType.PASSWORD_RESET,
                expiresAt,
                sessionId: null,
                sessionExpiresAt: null,
                revokedAt: null,
            });

            return { success: true, data: { token, expiresAt } };
        } catch {
            return { success: false, error: ErrorCode.INTERNAL_SERVER_ERROR };
        }
    }

    /**
     * Validates a password reset token and revokes it.
     *
     * @summary Verifies and consumes a password reset token.
     * @param rawToken - Raw token value.
     * @returns User ID or error if invalid or expired.
     */
    async verifyPasswordResetToken(rawToken: string): Promise<{ success: true; data: { userId: number } } | { success: false; error: ErrorCode }> {
        const tokenHash = hashOneTimeToken(rawToken);
        const tokenRecord = await this.tokenRepository.findByTokenHashAndType(tokenHash, TokenType.PASSWORD_RESET);

        if (!tokenRecord) {
            return { success: false, error: ErrorCode.EXPIRED_OR_INVALID_TOKEN };
        }

        const now = new Date();
        if (tokenRecord.revokedAt) {
            return { success: false, error: ErrorCode.EXPIRED_OR_INVALID_TOKEN };
        }

        if (new Date(tokenRecord.expiresAt) < now) {
            await this.tokenRepository.delete(tokenRecord.id);
            return { success: false, error: ErrorCode.EXPIRED_OR_INVALID_TOKEN };
        }

        const revoked = await this.tokenRepository.markTokenRevoked(tokenRecord.id, now);
        if (revoked === 0) {
            return { success: false, error: ErrorCode.EXPIRED_OR_INVALID_TOKEN };
        }

        return { success: true, data: { userId: tokenRecord.userId } };
    }

    /**
     * Deletes a token by ID.
     *
     * @summary Removes a token by ID.
     * @param id - token ID.
     * @returns Total rows affected.
     */
    async deleteToken(id: number): Promise<number> {
        return await this.tokenRepository.delete(id);
    }

    /**
     * Marks a refresh token as revoked.
     *
     * @summary Revokes a token by ID.
     * @param id - token ID.
     * @param revokedAt - Optional timestamp.
     * @returns Total rows affected.
     */
    async markTokenRevoked(id: number, revokedAt: Date = new Date()): Promise<number> {
        return await this.tokenRepository.markTokenRevoked(id, revokedAt);
    }

    /**
     * Creates a new token (alias for compatibility).
     *
     * @summary Creates a token record.
     * @param data - token data.
     * @returns Created token.
     */
    async create(data: InsertToken): Promise<SelectToken> {
        return await this.tokenRepository.create(data);
    }

    /**
     * Deletes a token by ID (alias for compatibility).
     *
     * @summary Removes a token by ID.
     * @param id - token ID.
     * @returns Total rows affected.
     */
    async delete(id: number): Promise<number> {
        return await this.tokenRepository.delete(id);
    }

    /**
     * Deletes a token by token hash.
     *
     * @summary Removes a token by token hash.
     * @param tokenHash - Token hash.
     */
    async deleteByTokenHash(tokenHash: string): Promise<void> {
        await this.tokenRepository.deleteByTokenHash(tokenHash);
    }

    /**
     * Deletes a token by token hash and type.
     *
     * @summary Removes a token record by its token hash and type.
     * @param tokenHash - Token hash.
     * @param type - Token type.
     */
    async deleteByTokenHashAndType(tokenHash: string, type: TokenType): Promise<void> {
        await this.tokenRepository.deleteByTokenHashAndType(tokenHash, type);
    }

        /**
     * @summary Retrieves latest token by user and type.
     * @param userId - User ID.
     * @param type - Token type.
     * @returns Latest token record or null.
     */

    async findLatestByUserIdAndType(userId: number, type: TokenType): Promise<SelectToken | null> {
        return await this.tokenRepository.findLatestByUserIdAndType(userId, type);
    }

    /**
     * Deletes tokens by session ID.
     *
     * @summary Removes refresh tokens by session ID.
     * @param sessionId - Session identifier.
     * @returns Total rows affected.
     */
    async deleteBySessionId(sessionId: string): Promise<number> {
        return await this.tokenRepository.deleteBySessionId(sessionId);
    }

    /**
     * Deletes tokens by user ID and type.
     *
     * @summary Removes tokens for a user and token type.
     * @param userId - User ID.
     * @param type - Token type.
     * @returns Total rows affected.
     */
    async deleteByUserIdAndType(userId: number, type: TokenType): Promise<number> {
        return await this.tokenRepository.deleteByUserIdAndType(userId, type);
    }

    /**
     * Deletes all expired tokens.
     *
     * @summary Removes tokens that have expired.
     * @returns Total number of deleted entries or error on failure.
     */
    async deleteExpiredTokens(): Promise<{ success: true; data: { deleted: number } } | { success: false; error: ErrorCode }> {
        try {
            const result = await db.delete(tokens)
                .where(lt(tokens.expiresAt, new Date()));

            const total = result[0]?.affectedRows ?? 0;

            await createLog(
                LogType.DEBUG,
                LogOperation.DELETE,
                LogCategory.AUTH,
                `Deleted ${total} expired tokens`,
                undefined
            );

            return { success: true, data: { deleted: total } };
        } catch {
            return { success: false, error: ErrorCode.INTERNAL_SERVER_ERROR };
        }
    }
}


