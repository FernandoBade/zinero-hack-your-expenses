import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { TokenType } from '../../../shared/enums/auth.enums';
import { LogCategory, LogEvent, LogType, LogOperation } from '../../../shared/enums/log.enums';
import { TokenUtils } from '../utils/auth/tokenUtils';
import { ErrorCode } from '../../../shared/errors/error-codes';
import { TokenService } from './tokenService';
import { UserService } from './userService';
import { createLog } from '../utils/commons';
import { buildPersistedTokenExpiresAt, buildSessionExpiresAt, EMAIL_VERIFICATION_RESEND_COOLDOWN_SECONDS } from '../utils/auth/tokenConfig';
import { sendEmailVerificationEmail, sendPasswordResetEmail } from '../utils/email/authEmail';
import type { LoginContext, LogoutContext, RefreshContext, ResetPasswordOutput, VerifyEmailOutput } from '../../../shared/domains/auth/auth.types';

/**
 * Service for authentication operations.
 * Handles user login, token refresh, and logout functionality.
 */
export class AuthService {
    private userService: UserService;
    private tokenService: TokenService;

    constructor() {
        this.userService = new UserService();
        this.tokenService = new TokenService();
    }

    /**
     * Authenticates a user based on email and password.
     * If valid, generates and returns an access token and a rotation token.
     * The token hash is persisted in the database with a finite lifetime.
     *
     * @summary Authenticates user and generates tokens.
     * @param email - User's email.
     * @param password - User's plain-text password.
     * @returns Access token and rotation token along with user data, or error if credentials are invalid.
     */
    async login(email: string, password: string): Promise<{ success: true; data: LoginContext } | { success: false; error: ErrorCode }> {
        if (!password) {
            return { success: false, error: ErrorCode.INVALID_CREDENTIALS };
        }

        // Find user by email
        const userResult = await this.userService.findUserByEmailExact(email.trim().toLowerCase());
        if (!userResult.success || !userResult.data) {
            return { success: false, error: ErrorCode.INVALID_CREDENTIALS };
        }

        // Get full user with password for comparison
        const userWithPassword = await this.userService.findOne(userResult.data.id);
        if (!userWithPassword.success || !userWithPassword.data) {
            return { success: false, error: ErrorCode.INVALID_CREDENTIALS };
        }

        const user = userWithPassword.data;
        if (!user.active) {
            return { success: false, error: ErrorCode.INVALID_CREDENTIALS };
        }
        if (!user.password || !(await bcrypt.compare(password, user.password))) {
            return { success: false, error: ErrorCode.INVALID_CREDENTIALS };
        }
        if (!user.emailVerifiedAt) {
            return { success: false, error: ErrorCode.EMAIL_NOT_VERIFIED };
        }

        const token = TokenUtils.generateAccessToken({ id: user.id });
        const tokenValue = TokenUtils.generateRefreshToken({ id: user.id });
        const tokenHash = TokenUtils.hashRefreshToken(tokenValue);

        const now = new Date();
        const expiresAt = buildPersistedTokenExpiresAt(now);
        const sessionExpiresAt = buildSessionExpiresAt(now);
        const sessionId = crypto.randomUUID();

        const tokenResult = await this.tokenService.createToken({
            tokenHash,
            userId: user.id,
            type: TokenType.REFRESH,
            expiresAt,
            sessionId,
            sessionExpiresAt
        });

        if (!tokenResult.success) {
            return { success: false, error: ErrorCode.INTERNAL_SERVER_ERROR };
        }

        await this.tokenService.deleteExpiredTokens();

        return {
            success: true,
            data: {
                token,
                refreshToken: tokenValue,
                user
            }
        };
    }

    /**
     * Validates a refresh token and issues a new access token if valid.
     * Checks for token existence, expiration, and signature validity.
     * Rotates the token on success.
     *
     * @summary Refreshes access token using refresh token.
     * @param token - Token from cookies.
     * @returns New access and refresh tokens or error if the token is expired or invalid.
     */
    async refresh(token: string): Promise<{ success: true; data: RefreshContext } | { success: false; error: ErrorCode }> {
        const tokenHash = TokenUtils.hashRefreshToken(token);
        const tokenResult = await this.tokenService.findByTokenHash(tokenHash);
        if (!tokenResult.success || !tokenResult.data) {
            return { success: false, error: ErrorCode.EXPIRED_OR_INVALID_TOKEN };
        }

        const storedToken = tokenResult.data;
        const now = new Date();
        /**
         * @summary Deletes the current persisted refresh token without propagating cleanup failures.
         */
        const discardStoredToken = () => this.tokenService.deleteToken(storedToken.id).catch(() => undefined);
        /**
         * @summary Revokes the full refresh session when available, otherwise removes only the current token.
         */
        const revokeSession = async () => {
            if (storedToken.sessionId) {
                await this.tokenService.deleteBySessionId(storedToken.sessionId);
                return;
            }
            await discardStoredToken();
        };

        if (storedToken.revokedAt) {
            await revokeSession();
            await createLog(
                LogType.ALERT,
                LogOperation.UPDATE,
                LogCategory.AUTH,
                LogEvent.REFRESH_REUSE_DETECTED,
                storedToken.userId || undefined
            );
            return { success: false, error: ErrorCode.EXPIRED_OR_INVALID_TOKEN };
        }

        if (!storedToken.sessionId || !storedToken.sessionExpiresAt) {
            await discardStoredToken();
            return { success: false, error: ErrorCode.EXPIRED_OR_INVALID_TOKEN };
        }

        if (new Date(storedToken.sessionExpiresAt) < now) {
            await this.tokenService.deleteBySessionId(storedToken.sessionId);
            return { success: false, error: ErrorCode.EXPIRED_OR_INVALID_TOKEN };
        }

        if (new Date(storedToken.expiresAt) < now) {
            await discardStoredToken();
            return { success: false, error: ErrorCode.EXPIRED_OR_INVALID_TOKEN };
        }

        let payload: { id: number };
        try {
            payload = TokenUtils.verifyRefreshToken(token) as { id: number };
        } catch {
            await discardStoredToken();
            return { success: false, error: ErrorCode.EXPIRED_OR_INVALID_TOKEN };
        }

        const userResult = await this.userService.findOne(payload.id);
        if (!userResult.success || !userResult.data || !userResult.data.active || !userResult.data.emailVerifiedAt) {
            await discardStoredToken();
            return { success: false, error: ErrorCode.EXPIRED_OR_INVALID_TOKEN };
        }

        const newToken = TokenUtils.generateAccessToken({ id: payload.id });
        const newTokenValue = TokenUtils.generateRefreshToken({ id: payload.id });
        const newTokenHash = TokenUtils.hashRefreshToken(newTokenValue);
        const newExpiresAt = buildPersistedTokenExpiresAt(now);

        const createResult = await this.tokenService.createToken({
            tokenHash: newTokenHash,
            userId: payload.id,
            type: TokenType.REFRESH,
            expiresAt: newExpiresAt,
            sessionId: storedToken.sessionId,
            sessionExpiresAt: storedToken.sessionExpiresAt
        });

        if (!createResult.success) {
            return { success: false, error: ErrorCode.INTERNAL_SERVER_ERROR };
        }

        try {
            const revoked = await this.tokenService.markTokenRevoked(storedToken.id, now);
            if (revoked === 0) {
                await this.tokenService.deleteByTokenHash(newTokenHash);
                await this.tokenService.deleteBySessionId(storedToken.sessionId);
                await createLog(
                    LogType.ALERT,
                    LogOperation.UPDATE,
                    LogCategory.AUTH,
                    LogEvent.REFRESH_REUSE_DETECTED,
                    storedToken.userId || undefined
                );
                return { success: false, error: ErrorCode.EXPIRED_OR_INVALID_TOKEN };
            }
        } catch {
            await this.tokenService.deleteByTokenHash(newTokenHash);
            return { success: false, error: ErrorCode.INTERNAL_SERVER_ERROR };
        }

        await this.tokenService.deleteExpiredTokens();

        return { success: true, data: { token: newToken, refreshToken: newTokenValue } };
    }

    /**
     * Logs out the user by removing the token from the database.
     * Logs the operation if the token is valid. Fails silently if token is not found.
     *
     * @summary Invalidates token on logout.
     * @param token - Token to invalidate.
     * @returns Success status and user ID if logout succeeds, or error if token is not found.
     */
    async logout(token: string): Promise<{ success: true; data: LogoutContext } | { success: false; error: ErrorCode }> {
        const tokenHash = TokenUtils.hashRefreshToken(token);
        const tokenResult = await this.tokenService.findByTokenHash(tokenHash);
        const stored = tokenResult.success ? tokenResult.data : null;
        if (!stored || stored.revokedAt) {
            await createLog(
                LogType.ALERT,
                LogOperation.LOGOUT,
                LogCategory.AUTH,
                LogEvent.LOGOUT_TOKEN_NOT_FOUND,
                stored?.userId || undefined
            );
            return { success: false, error: ErrorCode.TOKEN_NOT_FOUND };
        }

        await this.tokenService.deleteToken(stored.id);

        await createLog(
            LogType.SUCCESS,
            LogOperation.LOGOUT,
            LogCategory.AUTH,
            LogEvent.LOGOUT_SUCCESS,
            stored.userId || undefined
        );

        return { success: true, data: { userId: stored.userId || 0 } };
    }

    /**
     * Verifies an email verification token and marks the user as verified.
     *
     * @summary Confirms email verification token.
     * @param token - Verification token.
     * @returns Success status or error.
     */
    async verifyEmail(token: string): Promise<{ success: true; data: VerifyEmailOutput } | { success: false; error: ErrorCode }> {
        const tokenResult = await this.tokenService.verifyEmailVerificationToken(token);
        if (!tokenResult.success || !tokenResult.data) {
            return { success: false, error: ErrorCode.EXPIRED_OR_INVALID_TOKEN };
        }

        const userResult = await this.userService.markEmailVerified(tokenResult.data.userId);
        if (!userResult.success) {
            return { success: false, error: userResult.error };
        }

        const alreadyVerified = Boolean(tokenResult.data.alreadyVerified);
        return { success: true, data: { verified: true, alreadyVerified } };
    }

    /**
     * Resends an email verification token.
     *
     * @summary Issues a new email verification token and sends it.
     * @param email - User email.
     * @returns Success status.
     */
    async resendEmailVerification(
        email: string
    ): Promise<
        | { success: true; data: { sent: true } }
        | { success: false; error: ErrorCode; data?: { cooldownSeconds: number } }
    > {
        const userResult = await this.userService.findUserByEmailExact(email.trim().toLowerCase());
        if (!userResult.success || !userResult.data || !userResult.data.active) {
            return { success: true, data: { sent: true } };
        }

        if (userResult.data.emailVerifiedAt) {
            return { success: true, data: { sent: true } };
        }

        const latestToken = await this.tokenService.findLatestByUserIdAndType(
            userResult.data.id,
            TokenType.EMAIL_VERIFICATION
        );
        if (latestToken?.createdAt) {
            const now = new Date();
            const elapsedMs = now.getTime() - new Date(latestToken.createdAt).getTime();
            const cooldownMs = EMAIL_VERIFICATION_RESEND_COOLDOWN_SECONDS * 1000;
            if (elapsedMs < cooldownMs) {
                const remainingSeconds = Math.ceil((cooldownMs - elapsedMs) / 1000);
                return {
                    success: false,
                    error: ErrorCode.EMAIL_VERIFICATION_COOLDOWN,
                    data: { cooldownSeconds: remainingSeconds }
                };
            }
        }

        await this.tokenService.deleteByUserIdAndType(userResult.data.id, TokenType.EMAIL_VERIFICATION);

        const tokenResult = await this.tokenService.createEmailVerificationToken(userResult.data.id);
        if (!tokenResult.success || !tokenResult.data) {
            return { success: false, error: ErrorCode.INTERNAL_SERVER_ERROR };
        }

        try {
            await sendEmailVerificationEmail(
                userResult.data.email,
                tokenResult.data.token,
                userResult.data.id,
                userResult.data.language
            );
        } catch {
            // Ignore email failures to keep the response generic.
        }

        return { success: true, data: { sent: true } };
    }

    /**
     * Initiates a password reset flow.
     *
     * @summary Issues a password reset token and sends link.
     * @param email - User email.
     * @returns Success status.
     */
    async requestPasswordReset(email: string): Promise<{ success: true; data: { sent: true } } | { success: false; error: ErrorCode }> {
        const userResult = await this.userService.findUserByEmailExact(email.trim().toLowerCase());
        if (!userResult.success || !userResult.data || !userResult.data.active) {
            return { success: true, data: { sent: true } };
        }

        const tokenResult = await this.tokenService.createPasswordResetToken(userResult.data.id);
        if (!tokenResult.success || !tokenResult.data) {
            return { success: false, error: ErrorCode.INTERNAL_SERVER_ERROR };
        }

        try {
            await sendPasswordResetEmail(
                userResult.data.email,
                tokenResult.data.token,
                userResult.data.id,
                userResult.data.language
            );
        } catch {
            // Ignore email failures to keep the response generic.
        }
        return { success: true, data: { sent: true } };
    }

    /**
     * Resets a user's password using a valid password reset token.
     *
     * @summary Resets password and revokes refresh tokens.
     * @param token - Password reset token.
     * @param newPassword - New password.
     * @returns Success status or error.
     */
    async resetPassword(token: string, newPassword: string): Promise<{ success: true; data: ResetPasswordOutput } | { success: false; error: ErrorCode }> {
        const tokenResult = await this.tokenService.verifyPasswordResetToken(token);
        if (!tokenResult.success || !tokenResult.data) {
            return { success: false, error: ErrorCode.EXPIRED_OR_INVALID_TOKEN };
        }

        const updateResult = await this.userService.updateUser(tokenResult.data.userId, { password: newPassword });
        if (!updateResult.success) {
            return { success: false, error: updateResult.error };
        }

        await this.tokenService.deleteByUserIdAndType(tokenResult.data.userId, TokenType.REFRESH);
        return { success: true, data: { reset: true } };
    }
}


