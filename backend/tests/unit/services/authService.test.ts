import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { AuthService } from '../../../src/service/authService';
import { TokenService } from '../../../src/service/tokenService';
import { UserService } from '../../../src/service/userService';
import { TokenType } from '../../../../shared/enums/auth.enums';
import { LogCategory, LogOperation, LogType } from '../../../../shared/enums/log.enums';
import { TokenUtils } from '../../../src/utils/auth/tokenUtils';
import { PERSISTED_TOKEN_TTL_DAYS, SESSION_TTL_DAYS } from '../../../src/utils/auth/tokenConfig';
import { ErrorCode as Resource } from '../../../../shared/errors/error-codes';
import { SelectToken } from '../../../src/db/schema';
import * as commons from '../../../src/utils/commons';
import { makeSanitizedUser, makeUser } from '../../helpers/factories';
import { sendEmailVerificationEmail, sendPasswordResetEmail } from '../../../src/utils/email/authEmail';

jest.mock('bcrypt', () => ({
    hash: jest.fn(),
    compare: jest.fn(),
}));

jest.mock('../../../src/utils/email/authEmail', () => ({
    sendEmailVerificationEmail: jest.fn(),
    sendPasswordResetEmail: jest.fn(),
}));

type CompareFn = (data: string | Buffer, encrypted: string) => Promise<boolean>;

const compareMock = bcrypt.compare as jest.MockedFunction<CompareFn>;
const isResource = (value: string): value is Resource => Object.values(Resource).includes(value as Resource);
const SESSION_ID = '00000000-0000-4000-8000-000000000000';
const sendEmailVerificationMock = sendEmailVerificationEmail as jest.MockedFunction<typeof sendEmailVerificationEmail>;
const sendPasswordResetMock = sendPasswordResetEmail as jest.MockedFunction<typeof sendPasswordResetEmail>;

const makeToken = (overrides: Partial<SelectToken> = {}): SelectToken => {
    const now = new Date('2024-01-01T00:00:00Z');
    return {
        id: overrides.id ?? 1,
        tokenHash: overrides.tokenHash ?? 'refresh-token-hash',
        type: overrides.type ?? TokenType.REFRESH,
        expiresAt: overrides.expiresAt ?? new Date('2099-01-01T00:00:00Z'),
        userId: overrides.userId ?? 1,
        sessionId: overrides.sessionId ?? SESSION_ID,
        sessionExpiresAt: overrides.sessionExpiresAt ?? new Date('2099-01-01T00:00:00Z'),
        revokedAt: overrides.revokedAt ?? null,
        createdAt: overrides.createdAt ?? now,
        updatedAt: overrides.updatedAt ?? now,
    };
};

describe('AuthService', () => {
    let logSpy: jest.SpyInstance;
    let cleanupSpy: jest.SpyInstance;

    beforeEach(() => {
        jest.clearAllMocks();
        logSpy = jest.spyOn(commons, 'createLog').mockResolvedValue();
        cleanupSpy = jest.spyOn(TokenService.prototype, 'deleteExpiredTokens').mockResolvedValue({ success: true, data: { deleted: 0 } });
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('login', () => {
        it('returns invalid credentials when password is missing', async () => {
            const getUsersSpy = jest.spyOn(UserService.prototype, 'findUserByEmailExact');

            const service = new AuthService();
            const result = await service.login('user@example.com', '');

            expect(getUsersSpy).not.toHaveBeenCalled();
            expect(result).toEqual({ success: false, error: Resource.INVALID_CREDENTIALS });
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error).toBe(Resource.INVALID_CREDENTIALS);
            }
            expect(logSpy).not.toHaveBeenCalled();
        });

        it('returns invalid credentials when user lookup yields no data', async () => {
            const getUsersSpy = jest.spyOn(UserService.prototype, 'findUserByEmailExact').mockResolvedValue({
                success: false,
                error: Resource.USER_NOT_FOUND,
            });
            const findOneSpy = jest.spyOn(UserService.prototype, 'findOne');

            const service = new AuthService();
            const result = await service.login('user@example.com', 'secret');

            expect(getUsersSpy).toHaveBeenCalledWith('user@example.com');
            expect(findOneSpy).not.toHaveBeenCalled();
            expect(result).toEqual({ success: false, error: Resource.INVALID_CREDENTIALS });
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error).toBe(Resource.INVALID_CREDENTIALS);
            }
            expect(logSpy).not.toHaveBeenCalled();
        });

        it('returns invalid credentials when full user lookup fails', async () => {
            const sanitized = makeSanitizedUser({ id: 3 });
            jest.spyOn(UserService.prototype, 'findUserByEmailExact').mockResolvedValue({ success: true, data: sanitized });
            const findOneSpy = jest.spyOn(UserService.prototype, 'findOne').mockResolvedValue({
                success: false,
                error: Resource.USER_NOT_FOUND,
            });

            const service = new AuthService();
            const result = await service.login('user@example.com', 'secret');

            expect(findOneSpy).toHaveBeenCalledWith(3);
            expect(result).toEqual({ success: false, error: Resource.INVALID_CREDENTIALS });
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error).toBe(Resource.INVALID_CREDENTIALS);
            }
            expect(logSpy).not.toHaveBeenCalled();
        });

        it('returns invalid credentials when user is inactive', async () => {
            const user = makeUser({ id: 4, email: 'user@example.com', active: false });
            const sanitized = makeSanitizedUser({ id: user.id, email: user.email, active: false });
            jest.spyOn(UserService.prototype, 'findUserByEmailExact').mockResolvedValue({ success: true, data: sanitized });
            jest.spyOn(UserService.prototype, 'findOne').mockResolvedValue({ success: true, data: user });

            const service = new AuthService();
            const result = await service.login('user@example.com', 'secret');

            expect(compareMock).not.toHaveBeenCalled();
            expect(result).toEqual({ success: false, error: Resource.INVALID_CREDENTIALS });
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error).toBe(Resource.INVALID_CREDENTIALS);
            }
            expect(logSpy).not.toHaveBeenCalled();
        });

        it('returns email not verified when credentials are valid', async () => {
            const user = makeUser({ id: 4, email: 'user@example.com', emailVerifiedAt: null });
            const sanitized = makeSanitizedUser({ id: user.id, email: user.email, emailVerifiedAt: null });
            jest.spyOn(UserService.prototype, 'findUserByEmailExact').mockResolvedValue({ success: true, data: sanitized });
            jest.spyOn(UserService.prototype, 'findOne').mockResolvedValue({ success: true, data: user });
            compareMock.mockResolvedValue(true);

            const service = new AuthService();
            const result = await service.login('user@example.com', 'secret');

            expect(compareMock).toHaveBeenCalledWith('secret', user.password);
            expect(result).toEqual({ success: false, error: Resource.EMAIL_NOT_VERIFIED });
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error).toBe(Resource.EMAIL_NOT_VERIFIED);
            }
            expect(logSpy).not.toHaveBeenCalled();
        });

        it('returns invalid credentials when password does not match', async () => {
            const user = makeUser({ id: 4, email: 'user@example.com' });
            const sanitized = makeSanitizedUser({ id: user.id, email: user.email });
            jest.spyOn(UserService.prototype, 'findUserByEmailExact').mockResolvedValue({ success: true, data: sanitized });
            jest.spyOn(UserService.prototype, 'findOne').mockResolvedValue({ success: true, data: user });
            compareMock.mockResolvedValue(false);

            const service = new AuthService();
            const result = await service.login('user@example.com', 'wrong');

            expect(compareMock).toHaveBeenCalledWith('wrong', user.password);
            expect(result).toEqual({ success: false, error: Resource.INVALID_CREDENTIALS });
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error).toBe(Resource.INVALID_CREDENTIALS);
            }
            expect(logSpy).not.toHaveBeenCalled();
        });

        it('returns internal server error when refresh token persistence fails', async () => {
            const user = makeUser({ id: 5, email: 'user@example.com' });
            const sanitized = makeSanitizedUser({ id: user.id, email: user.email });
            jest.spyOn(UserService.prototype, 'findUserByEmailExact').mockResolvedValue({ success: true, data: sanitized });
            jest.spyOn(UserService.prototype, 'findOne').mockResolvedValue({ success: true, data: user });
            compareMock.mockResolvedValue(true);
            jest.spyOn(crypto, 'randomUUID').mockReturnValue(SESSION_ID);
            jest.spyOn(TokenUtils, 'generateAccessToken').mockReturnValue('access-token');
            jest.spyOn(TokenUtils, 'generateRefreshToken').mockReturnValue('refresh-token');
            const hashSpy = jest.spyOn(TokenUtils, 'hashRefreshToken').mockReturnValue('refresh-token-hash');
            const createTokenSpy = jest.spyOn(TokenService.prototype, 'createToken').mockResolvedValue({
                success: false,
                error: Resource.INTERNAL_SERVER_ERROR,
            });

            const service = new AuthService();
            const result = await service.login('user@example.com', 'secret');

            expect(hashSpy).toHaveBeenCalledWith('refresh-token');
            expect(createTokenSpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    tokenHash: 'refresh-token-hash',
                    userId: user.id,
                    type: TokenType.REFRESH,
                    sessionId: SESSION_ID,
                    sessionExpiresAt: expect.any(Date),
                })
            );
            expect(result).toEqual({ success: false, error: Resource.INTERNAL_SERVER_ERROR });
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error).toBe(Resource.INTERNAL_SERVER_ERROR);
            }
            expect(logSpy).not.toHaveBeenCalled();
        });

        it('returns tokens and user when login succeeds', async () => {
            const now = new Date('2024-01-01T00:00:00Z');
            jest.useFakeTimers().setSystemTime(now);

            try {
                const user = makeUser({ id: 6, email: 'user@example.com' });
                const getUsersSpy = jest.spyOn(UserService.prototype, 'findUserByEmailExact').mockResolvedValue({
                    success: true,
                    data: makeSanitizedUser({ id: user.id, email: user.email }),
                });
                const findOneSpy = jest.spyOn(UserService.prototype, 'findOne').mockResolvedValue({ success: true, data: user });
                compareMock.mockResolvedValue(true);
                jest.spyOn(crypto, 'randomUUID').mockReturnValue(SESSION_ID);
                jest.spyOn(TokenUtils, 'generateAccessToken').mockReturnValue('access-token');
                jest.spyOn(TokenUtils, 'generateRefreshToken').mockReturnValue('refresh-token');
                const hashSpy = jest.spyOn(TokenUtils, 'hashRefreshToken').mockReturnValue('refresh-token-hash');
                const createTokenSpy = jest.spyOn(TokenService.prototype, 'createToken').mockResolvedValue({
                    success: true,
                    data: makeToken({ id: 99, tokenHash: 'refresh-token-hash', userId: user.id }),
                });

                const service = new AuthService();
                const result = await service.login('  USER@Example.com ', 'secret');

                const createPayload = createTokenSpy.mock.calls[0][0];
                const expectedExpiresAt = new Date(now);
                expectedExpiresAt.setDate(expectedExpiresAt.getDate() + PERSISTED_TOKEN_TTL_DAYS);
                const expectedSessionExpiresAt = new Date(now);
                expectedSessionExpiresAt.setDate(expectedSessionExpiresAt.getDate() + SESSION_TTL_DAYS);

                expect(getUsersSpy).toHaveBeenCalledWith('user@example.com');
                expect(findOneSpy).toHaveBeenCalledWith(user.id);
                expect(compareMock).toHaveBeenCalledWith('secret', user.password);
                expect(hashSpy).toHaveBeenCalledWith('refresh-token');
                expect(createPayload).toEqual(expect.objectContaining({
                    tokenHash: 'refresh-token-hash',
                    userId: user.id,
                    type: TokenType.REFRESH,
                    sessionId: SESSION_ID,
                }));
                expect(createPayload.expiresAt.getTime()).toBe(expectedExpiresAt.getTime());
                expect(createPayload.sessionExpiresAt).toEqual(expectedSessionExpiresAt);
                expect(result).toEqual({
                    success: true,
                    data: {
                        token: 'access-token',
                        refreshToken: 'refresh-token',
                        user,
                    },
                });
                expect(cleanupSpy).toHaveBeenCalled();
                expect(logSpy).not.toHaveBeenCalled();
            } finally {
                jest.useRealTimers();
            }
        });

        it('throws when user lookup rejects', async () => {
            jest.spyOn(UserService.prototype, 'findUserByEmailExact').mockRejectedValue(new Error(Resource.INTERNAL_SERVER_ERROR));

            const service = new AuthService();
            let caught: unknown;

            try {
                await service.login('user@example.com', 'secret');
            } catch (error) {
                caught = error;
            }

            expect(caught).toBeInstanceOf(Error);
            if (caught instanceof Error) {
                expect(isResource(caught.message)).toBe(true);
                if (isResource(caught.message)) {
                }
            }
            expect(logSpy).not.toHaveBeenCalled();
        });
    });

    describe('refresh', () => {
        it('returns expired token error when token is not found', async () => {
            const findTokenSpy = jest.spyOn(TokenService.prototype, 'findByTokenHash').mockResolvedValue({
                success: false,
                error: Resource.TOKEN_NOT_FOUND,
            });
            const hashSpy = jest.spyOn(TokenUtils, 'hashRefreshToken').mockReturnValue('missing-hash');
            const verifySpy = jest.spyOn(TokenUtils, 'verifyRefreshToken');

            const service = new AuthService();
            const result = await service.refresh('missing');

            expect(hashSpy).toHaveBeenCalledWith('missing');
            expect(findTokenSpy).toHaveBeenCalledWith('missing-hash');
            expect(verifySpy).not.toHaveBeenCalled();
            expect(result).toEqual({ success: false, error: Resource.EXPIRED_OR_INVALID_TOKEN });
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error).toBe(Resource.EXPIRED_OR_INVALID_TOKEN);
            }
            expect(logSpy).not.toHaveBeenCalled();
        });

        it('returns expired token error when token is expired', async () => {
            jest.spyOn(TokenService.prototype, 'findByTokenHash').mockResolvedValue({
                success: true,
                data: makeToken({ id: 1, tokenHash: 'expired-hash', expiresAt: new Date('2000-01-01T00:00:00Z'), userId: 1 }),
            });
            const hashSpy = jest.spyOn(TokenUtils, 'hashRefreshToken').mockReturnValue('expired-hash');
            const verifySpy = jest.spyOn(TokenUtils, 'verifyRefreshToken');
            const deleteSpy = jest.spyOn(TokenService.prototype, 'deleteToken').mockResolvedValue(1);

            const service = new AuthService();
            const result = await service.refresh('expired');

            expect(hashSpy).toHaveBeenCalledWith('expired');
            expect(verifySpy).not.toHaveBeenCalled();
            expect(deleteSpy).toHaveBeenCalledWith(1);
            expect(result).toEqual({ success: false, error: Resource.EXPIRED_OR_INVALID_TOKEN });
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error).toBe(Resource.EXPIRED_OR_INVALID_TOKEN);
            }
            expect(logSpy).not.toHaveBeenCalled();
        });

        it('returns expired token error when session has expired', async () => {
            const now = new Date('2024-02-01T00:00:00Z');
            jest.useFakeTimers().setSystemTime(now);

            try {
                const sessionExpiresAt = new Date('2024-01-01T00:00:00Z');
                jest.spyOn(TokenService.prototype, 'findByTokenHash').mockResolvedValue({
                    success: true,
                    data: makeToken({ id: 10, tokenHash: 'session-hash', sessionExpiresAt, userId: 42 }),
                });
                const hashSpy = jest.spyOn(TokenUtils, 'hashRefreshToken').mockReturnValue('session-hash');
                const verifySpy = jest.spyOn(TokenUtils, 'verifyRefreshToken');
                const deleteBySessionSpy = jest.spyOn(TokenService.prototype, 'deleteBySessionId').mockResolvedValue(1);

                const service = new AuthService();
                const result = await service.refresh('expired-session');

                expect(hashSpy).toHaveBeenCalledWith('expired-session');
                expect(verifySpy).not.toHaveBeenCalled();
                expect(deleteBySessionSpy).toHaveBeenCalledWith(SESSION_ID);
                expect(result).toEqual({ success: false, error: Resource.EXPIRED_OR_INVALID_TOKEN });
                expect(logSpy).not.toHaveBeenCalled();
            } finally {
                jest.useRealTimers();
            }
        });

        it('returns expired token error when token verification throws', async () => {
            jest.spyOn(TokenService.prototype, 'findByTokenHash').mockResolvedValue({
                success: true,
                data: makeToken({ id: 1, tokenHash: 'bad-hash', expiresAt: new Date('2099-01-01T00:00:00Z'), userId: 1 }),
            });
            const hashSpy = jest.spyOn(TokenUtils, 'hashRefreshToken').mockReturnValue('bad-hash');
            jest.spyOn(TokenUtils, 'verifyRefreshToken').mockImplementation(() => {
                throw new Error(Resource.EXPIRED_OR_INVALID_TOKEN);
            });
            const deleteSpy = jest.spyOn(TokenService.prototype, 'deleteToken').mockResolvedValue(1);

            const service = new AuthService();
            const result = await service.refresh('bad');

            expect(hashSpy).toHaveBeenCalledWith('bad');
            expect(deleteSpy).toHaveBeenCalledWith(1);
            expect(result).toEqual({ success: false, error: Resource.EXPIRED_OR_INVALID_TOKEN });
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error).toBe(Resource.EXPIRED_OR_INVALID_TOKEN);
            }
            expect(logSpy).not.toHaveBeenCalled();
        });

        it('returns new access token when refresh succeeds', async () => {
            const now = new Date('2024-01-01T00:00:00Z');
            jest.useFakeTimers().setSystemTime(now);

            try {
                jest.spyOn(TokenService.prototype, 'findByTokenHash').mockResolvedValue({
                    success: true,
                    data: makeToken({ id: 2, tokenHash: 'old-hash', expiresAt: new Date('2099-01-01T00:00:00Z'), userId: 42 }),
                });
                const hashSpy = jest.spyOn(TokenUtils, 'hashRefreshToken').mockReturnValueOnce('old-hash').mockReturnValueOnce('new-hash');
                jest.spyOn(TokenUtils, 'verifyRefreshToken').mockReturnValue({ id: 42 });
                jest.spyOn(UserService.prototype, 'findOne').mockResolvedValue({ success: true, data: makeUser({ id: 42, active: true }) });
                const generateAccessSpy = jest.spyOn(TokenUtils, 'generateAccessToken').mockReturnValue('new-access-token');
                const generateRefreshSpy = jest.spyOn(TokenUtils, 'generateRefreshToken').mockReturnValue('new-refresh-token');
                const createTokenSpy = jest.spyOn(TokenService.prototype, 'createToken').mockResolvedValue({
                    success: true,
                    data: makeToken({ id: 3, tokenHash: 'new-hash', userId: 42 }),
                });
                const revokeSpy = jest.spyOn(TokenService.prototype, 'markTokenRevoked').mockResolvedValue(1);

                const service = new AuthService();
                const result = await service.refresh('valid');

                const createPayload = createTokenSpy.mock.calls[0][0];
                const expectedExpiresAt = new Date(now);
                expectedExpiresAt.setDate(expectedExpiresAt.getDate() + PERSISTED_TOKEN_TTL_DAYS);

                expect(hashSpy).toHaveBeenNthCalledWith(1, 'valid');
                expect(hashSpy).toHaveBeenNthCalledWith(2, 'new-refresh-token');
                expect(generateAccessSpy).toHaveBeenCalledWith({ id: 42 });
                expect(generateRefreshSpy).toHaveBeenCalledWith({ id: 42 });
                expect(createPayload).toEqual(expect.objectContaining({
                    tokenHash: 'new-hash',
                    userId: 42,
                    type: TokenType.REFRESH,
                    sessionId: SESSION_ID,
                }));
                expect(createPayload.expiresAt.getTime()).toBe(expectedExpiresAt.getTime());
                expect(createPayload.sessionExpiresAt).toEqual(expect.any(Date));
                expect(revokeSpy).toHaveBeenCalledWith(2, expect.any(Date));
                expect(result).toEqual({ success: true, data: { token: 'new-access-token', refreshToken: 'new-refresh-token' } });
                expect(result.success).toBe(true);
                if (result.success) {
                    expect(result.data).toEqual({ token: 'new-access-token', refreshToken: 'new-refresh-token' });
                }
                expect(cleanupSpy).toHaveBeenCalled();
                expect(logSpy).not.toHaveBeenCalled();
            } finally {
                jest.useRealTimers();
            }
        });

        it('rejects refresh when stored token is already consumed', async () => {
            jest.spyOn(TokenService.prototype, 'findByTokenHash').mockResolvedValue({
                success: true,
                data: makeToken({ id: 4, tokenHash: 'old-hash', expiresAt: new Date('2099-01-01T00:00:00Z'), userId: 42 }),
            });
            jest.spyOn(TokenUtils, 'hashRefreshToken').mockReturnValueOnce('old-hash').mockReturnValueOnce('new-hash');
            jest.spyOn(TokenUtils, 'verifyRefreshToken').mockReturnValue({ id: 42 });
            jest.spyOn(UserService.prototype, 'findOne').mockResolvedValue({ success: true, data: makeUser({ id: 42, active: true }) });
            jest.spyOn(TokenUtils, 'generateAccessToken').mockReturnValue('new-access-token');
            jest.spyOn(TokenUtils, 'generateRefreshToken').mockReturnValue('new-refresh-token');
            jest.spyOn(TokenService.prototype, 'createToken').mockResolvedValue({
                success: true,
                data: makeToken({ id: 5, tokenHash: 'new-hash', userId: 42 }),
            });
            const revokeSpy = jest.spyOn(TokenService.prototype, 'markTokenRevoked').mockResolvedValue(0);
            const deleteByHashSpy = jest.spyOn(TokenService.prototype, 'deleteByTokenHash').mockResolvedValue();
            const deleteBySessionSpy = jest.spyOn(TokenService.prototype, 'deleteBySessionId').mockResolvedValue(1);

            const service = new AuthService();
            const result = await service.refresh('valid');

            expect(revokeSpy).toHaveBeenCalledWith(4, expect.any(Date));
            expect(deleteByHashSpy).toHaveBeenCalledWith('new-hash');
            expect(deleteBySessionSpy).toHaveBeenCalledWith(SESSION_ID);
            expect(logSpy).toHaveBeenCalledWith(
                LogType.ALERT,
                LogOperation.UPDATE,
                LogCategory.AUTH,
                'REFRESH_REUSE_DETECTED',
                42
            );
            expect(result).toEqual({ success: false, error: Resource.EXPIRED_OR_INVALID_TOKEN });
            expect(cleanupSpy).not.toHaveBeenCalled();
        });

        it('returns expired token error when user is inactive', async () => {
            jest.spyOn(TokenService.prototype, 'findByTokenHash').mockResolvedValue({
                success: true,
                data: makeToken({ id: 3, tokenHash: 'old-hash', expiresAt: new Date('2099-01-01T00:00:00Z'), userId: 42 }),
            });
            const hashSpy = jest.spyOn(TokenUtils, 'hashRefreshToken').mockReturnValue('old-hash');
            jest.spyOn(TokenUtils, 'verifyRefreshToken').mockReturnValue({ id: 42 });
            jest.spyOn(UserService.prototype, 'findOne').mockResolvedValue({ success: true, data: makeUser({ id: 42, active: false }) });
            const createTokenSpy = jest.spyOn(TokenService.prototype, 'createToken');
            const deleteSpy = jest.spyOn(TokenService.prototype, 'deleteToken').mockResolvedValue(1);

            const service = new AuthService();
            const result = await service.refresh('valid');

            expect(hashSpy).toHaveBeenCalledWith('valid');
            expect(createTokenSpy).not.toHaveBeenCalled();
            expect(deleteSpy).toHaveBeenCalledWith(3);
            expect(result).toEqual({ success: false, error: Resource.EXPIRED_OR_INVALID_TOKEN });
        });

        it('returns expired token error when email is not verified', async () => {
            jest.spyOn(TokenService.prototype, 'findByTokenHash').mockResolvedValue({
                success: true,
                data: makeToken({ id: 4, tokenHash: 'old-hash', expiresAt: new Date('2099-01-01T00:00:00Z'), userId: 42 }),
            });
            const hashSpy = jest.spyOn(TokenUtils, 'hashRefreshToken').mockReturnValue('old-hash');
            jest.spyOn(TokenUtils, 'verifyRefreshToken').mockReturnValue({ id: 42 });
            jest.spyOn(UserService.prototype, 'findOne').mockResolvedValue({
                success: true,
                data: makeUser({ id: 42, active: true, emailVerifiedAt: null }),
            });
            const createTokenSpy = jest.spyOn(TokenService.prototype, 'createToken');
            const deleteSpy = jest.spyOn(TokenService.prototype, 'deleteToken').mockResolvedValue(1);

            const service = new AuthService();
            const result = await service.refresh('valid');

            expect(hashSpy).toHaveBeenCalledWith('valid');
            expect(createTokenSpy).not.toHaveBeenCalled();
            expect(deleteSpy).toHaveBeenCalledWith(4);
            expect(result).toEqual({ success: false, error: Resource.EXPIRED_OR_INVALID_TOKEN });
        });

        it('revokes the session when a refresh token is reused', async () => {
            const revokedAt = new Date('2024-01-02T00:00:00Z');
            const findTokenSpy = jest.spyOn(TokenService.prototype, 'findByTokenHash')
                .mockResolvedValue({
                    success: true,
                    data: makeToken({ id: 4, tokenHash: 'old-hash', expiresAt: new Date('2099-01-01T00:00:00Z'), userId: 42, revokedAt }),
                });
            const hashSpy = jest.spyOn(TokenUtils, 'hashRefreshToken').mockReturnValue('old-hash');
            const verifySpy = jest.spyOn(TokenUtils, 'verifyRefreshToken');
            const deleteBySessionSpy = jest.spyOn(TokenService.prototype, 'deleteBySessionId').mockResolvedValue(2);

            const service = new AuthService();
            const result = await service.refresh('valid');

            expect(hashSpy).toHaveBeenCalledWith('valid');
            expect(findTokenSpy).toHaveBeenCalledTimes(1);
            expect(verifySpy).not.toHaveBeenCalled();
            expect(deleteBySessionSpy).toHaveBeenCalledWith(SESSION_ID);
            expect(logSpy).toHaveBeenCalledWith(
                LogType.ALERT,
                LogOperation.UPDATE,
                LogCategory.AUTH,
                'REFRESH_REUSE_DETECTED',
                42
            );
            expect(result).toEqual({ success: false, error: Resource.EXPIRED_OR_INVALID_TOKEN });
        });

        it('throws when refresh token lookup rejects', async () => {
            jest.spyOn(TokenService.prototype, 'findByTokenHash').mockRejectedValue(new Error(Resource.INTERNAL_SERVER_ERROR));
            jest.spyOn(TokenUtils, 'hashRefreshToken').mockReturnValue('token-hash');

            const service = new AuthService();
            let caught: unknown;

            try {
                await service.refresh('token');
            } catch (error) {
                caught = error;
            }

            expect(caught).toBeInstanceOf(Error);
            if (caught instanceof Error) {
                expect(isResource(caught.message)).toBe(true);
                if (isResource(caught.message)) {
                }
            }
            expect(logSpy).not.toHaveBeenCalled();
        });
    });

    describe('logout', () => {
        it('logs alert and returns token not found when refresh token is missing', async () => {
            const findTokenSpy = jest.spyOn(TokenService.prototype, 'findByTokenHash').mockResolvedValue({
                success: false,
                error: Resource.TOKEN_NOT_FOUND,
            });
            const deleteSpy = jest.spyOn(TokenService.prototype, 'deleteToken');
            const hashSpy = jest.spyOn(TokenUtils, 'hashRefreshToken').mockReturnValue('missing-hash');

            const service = new AuthService();
            const result = await service.logout('missing-token');

            expect(hashSpy).toHaveBeenCalledWith('missing-token');
            expect(findTokenSpy).toHaveBeenCalledWith('missing-hash');
            expect(deleteSpy).not.toHaveBeenCalled();
            expect(result).toEqual({ success: false, error: Resource.TOKEN_NOT_FOUND });
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error).toBe(Resource.TOKEN_NOT_FOUND);
            }
            expect(logSpy).toHaveBeenCalledWith(
                LogType.ALERT,
                LogOperation.LOGOUT,
                LogCategory.AUTH,
                'LOGOUT_TOKEN_NOT_FOUND',
                undefined
            );
        });

        it('logs success and deletes refresh token when token exists', async () => {
            const stored = makeToken({ id: 77, tokenHash: 'stored-hash', userId: 9 });
            jest.spyOn(TokenService.prototype, 'findByTokenHash').mockResolvedValue({ success: true, data: stored });
            const deleteSpy = jest.spyOn(TokenService.prototype, 'deleteToken').mockResolvedValue(1);
            const hashSpy = jest.spyOn(TokenUtils, 'hashRefreshToken').mockReturnValue('stored-hash');

            const service = new AuthService();
            const result = await service.logout('stored');

            expect(hashSpy).toHaveBeenCalledWith('stored');
            expect(deleteSpy).toHaveBeenCalledWith(77);
            expect(logSpy).toHaveBeenCalledWith(
                LogType.SUCCESS,
                LogOperation.LOGOUT,
                LogCategory.AUTH,
                'LOGOUT_SUCCESS',
                stored.userId
            );
            expect(result).toEqual({ success: true, data: { userId: stored.userId } });
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data).toEqual({ userId: stored.userId });
            }
        });

        it('throws when refresh token lookup rejects', async () => {
            jest.spyOn(TokenService.prototype, 'findByTokenHash').mockRejectedValue(new Error(Resource.INTERNAL_SERVER_ERROR));
            jest.spyOn(TokenUtils, 'hashRefreshToken').mockReturnValue('token-hash');

            const service = new AuthService();
            let caught: unknown;

            try {
                await service.logout('token');
            } catch (error) {
                caught = error;
            }

            expect(caught).toBeInstanceOf(Error);
            if (caught instanceof Error) {
                expect(isResource(caught.message)).toBe(true);
                if (isResource(caught.message)) {
                }
            }
            expect(logSpy).not.toHaveBeenCalled();
        });
    });

    describe('verifyEmail', () => {
        it('returns success when token is valid', async () => {
            jest.spyOn(TokenService.prototype, 'verifyEmailVerificationToken').mockResolvedValue({
                success: true,
                data: { userId: 12, alreadyVerified: false },
            });
            const markSpy = jest.spyOn(UserService.prototype, 'markEmailVerified').mockResolvedValue({
                success: true,
                data: makeSanitizedUser({ id: 12 }),
            });

            const service = new AuthService();
            const result = await service.verifyEmail('token');

            expect(markSpy).toHaveBeenCalledWith(12);
            expect(result).toEqual({ success: true, data: { verified: true, alreadyVerified: false } });
        });

        it('returns already verified when token was previously used', async () => {
            jest.spyOn(TokenService.prototype, 'verifyEmailVerificationToken').mockResolvedValue({
                success: true,
                data: { userId: 12, alreadyVerified: true },
            });
            jest.spyOn(UserService.prototype, 'markEmailVerified').mockResolvedValue({
                success: true,
                data: makeSanitizedUser({ id: 12 }),
            });

            const service = new AuthService();
            const result = await service.verifyEmail('token');

            expect(result).toEqual({ success: true, data: { verified: true, alreadyVerified: true } });
        });

        it('returns invalid token when token verification fails', async () => {
            jest.spyOn(TokenService.prototype, 'verifyEmailVerificationToken').mockResolvedValue({
                success: false,
                error: Resource.EXPIRED_OR_INVALID_TOKEN,
            });

            const service = new AuthService();
            const result = await service.verifyEmail('token');

            expect(result).toEqual({ success: false, error: Resource.EXPIRED_OR_INVALID_TOKEN });
        });
    });

    describe('resendEmailVerification', () => {
        it('returns cooldown when a recent token exists', async () => {
            const now = new Date('2024-01-01T00:00:00Z');
            jest.useFakeTimers().setSystemTime(now);

            try {
                const user = makeSanitizedUser({ id: 20, email: 'user@example.com', emailVerifiedAt: null });
                jest.spyOn(UserService.prototype, 'findUserByEmailExact').mockResolvedValue({ success: true, data: user });
                const latestToken = makeToken({
                    id: 101,
                    userId: user.id,
                    type: TokenType.EMAIL_VERIFICATION,
                    createdAt: new Date(now.getTime() - 30 * 1000),
                });
                const latestSpy = jest.spyOn(TokenService.prototype, 'findLatestByUserIdAndType').mockResolvedValue(latestToken);
                const createSpy = jest.spyOn(TokenService.prototype, 'createEmailVerificationToken');
                const deleteSpy = jest.spyOn(TokenService.prototype, 'deleteByUserIdAndType');

                const service = new AuthService();
                const result = await service.resendEmailVerification(user.email);

                expect(latestSpy).toHaveBeenCalledWith(user.id, TokenType.EMAIL_VERIFICATION);
                expect(deleteSpy).not.toHaveBeenCalled();
                expect(createSpy).not.toHaveBeenCalled();
                expect(sendEmailVerificationMock).not.toHaveBeenCalled();
                expect(result).toEqual({
                    success: false,
                    error: Resource.EMAIL_VERIFICATION_COOLDOWN,
                    data: { cooldownSeconds: 30 },
                });
            } finally {
                jest.useRealTimers();
            }
        });

        it('creates token and sends email when cooldown passes', async () => {
            const now = new Date('2024-01-01T00:00:00Z');
            jest.useFakeTimers().setSystemTime(now);

            try {
                const user = makeSanitizedUser({ id: 21, email: 'user@example.com', emailVerifiedAt: null });
                jest.spyOn(UserService.prototype, 'findUserByEmailExact').mockResolvedValue({ success: true, data: user });
                jest.spyOn(TokenService.prototype, 'findLatestByUserIdAndType').mockResolvedValue(
                    makeToken({
                        id: 102,
                        userId: user.id,
                        type: TokenType.EMAIL_VERIFICATION,
                        createdAt: new Date(now.getTime() - 120 * 1000),
                    })
                );
                const deleteSpy = jest.spyOn(TokenService.prototype, 'deleteByUserIdAndType').mockResolvedValue(1);
                jest.spyOn(TokenService.prototype, 'createEmailVerificationToken').mockResolvedValue({
                    success: true,
                    data: { token: 'verify-token', expiresAt: new Date('2099-01-01T00:00:00Z') },
                });
                sendEmailVerificationMock.mockResolvedValue();

                const service = new AuthService();
                const result = await service.resendEmailVerification(user.email);

                expect(deleteSpy).toHaveBeenCalledWith(user.id, TokenType.EMAIL_VERIFICATION);
                expect(sendEmailVerificationMock).toHaveBeenCalledWith(
                    user.email,
                    'verify-token',
                    user.id,
                    user.language
                );
                expect(result).toEqual({ success: true, data: { sent: true } });
            } finally {
                jest.useRealTimers();
            }
        });

        it('returns delivery failure and cleans verification tokens when email send fails', async () => {
            const user = makeSanitizedUser({ id: 22, email: 'user@example.com', emailVerifiedAt: null });
            jest.spyOn(UserService.prototype, 'findUserByEmailExact').mockResolvedValue({ success: true, data: user });
            jest.spyOn(TokenService.prototype, 'findLatestByUserIdAndType').mockResolvedValue(null);
            const deleteSpy = jest.spyOn(TokenService.prototype, 'deleteByUserIdAndType').mockResolvedValue(1);
            jest.spyOn(TokenService.prototype, 'createEmailVerificationToken').mockResolvedValue({
                success: true,
                data: { token: 'verify-token', expiresAt: new Date('2099-01-01T00:00:00Z') },
            });
            sendEmailVerificationMock.mockRejectedValueOnce(new Error('email failed'));

            const service = new AuthService();
            const result = await service.resendEmailVerification(user.email);

            expect(sendEmailVerificationMock).toHaveBeenCalledWith(
                user.email,
                'verify-token',
                user.id,
                user.language
            );
            expect(deleteSpy).toHaveBeenNthCalledWith(1, user.id, TokenType.EMAIL_VERIFICATION);
            expect(deleteSpy).toHaveBeenNthCalledWith(2, user.id, TokenType.EMAIL_VERIFICATION);
            expect(result).toEqual({ success: false, error: Resource.EMAIL_DELIVERY_FAILED });
        });
    });

    describe('requestPasswordReset', () => {
        it('returns success even when user is not found', async () => {
            jest.spyOn(UserService.prototype, 'findUserByEmailExact').mockResolvedValue({
                success: false,
                error: Resource.USER_NOT_FOUND,
            });
            const createTokenSpy = jest.spyOn(TokenService.prototype, 'createPasswordResetToken');

            const service = new AuthService();
            const result = await service.requestPasswordReset('missing@example.com');

            expect(createTokenSpy).not.toHaveBeenCalled();
            expect(result).toEqual({ success: true, data: { sent: true } });
        });

        it('creates reset token and sends email when user exists', async () => {
            const user = makeSanitizedUser({ id: 15, email: 'user@example.com' });
            jest.spyOn(UserService.prototype, 'findUserByEmailExact').mockResolvedValue({
                success: true,
                data: user,
            });
            const deleteSpy = jest.spyOn(TokenService.prototype, 'deleteByUserIdAndType').mockResolvedValue(1);
            const createTokenSpy = jest.spyOn(TokenService.prototype, 'createPasswordResetToken').mockResolvedValue({
                success: true,
                data: { token: 'reset-token', expiresAt: new Date('2099-01-01T00:00:00Z') },
            });
            sendPasswordResetMock.mockResolvedValue();

            const service = new AuthService();
            const result = await service.requestPasswordReset(user.email);

            expect(deleteSpy).toHaveBeenCalledWith(user.id, TokenType.PASSWORD_RESET);
            expect(createTokenSpy).toHaveBeenCalledWith(user.id);
            expect(sendPasswordResetMock).toHaveBeenCalledWith(
                user.email,
                'reset-token',
                user.id,
                user.language
            );
            expect(result).toEqual({ success: true, data: { sent: true } });
        });

        it('returns delivery failure when email sending fails for an existing account', async () => {
            const user = makeSanitizedUser({ id: 16, email: 'user@example.com' });
            jest.spyOn(UserService.prototype, 'findUserByEmailExact').mockResolvedValue({
                success: true,
                data: user,
            });
            const deleteSpy = jest.spyOn(TokenService.prototype, 'deleteByUserIdAndType').mockResolvedValue(1);
            jest.spyOn(TokenService.prototype, 'createPasswordResetToken').mockResolvedValue({
                success: true,
                data: { token: 'reset-token', expiresAt: new Date('2099-01-01T00:00:00Z') },
            });
            sendPasswordResetMock.mockRejectedValueOnce(new Error('email failed'));

            const service = new AuthService();
            const result = await service.requestPasswordReset(user.email);

            expect(sendPasswordResetMock).toHaveBeenCalledWith(
                user.email,
                'reset-token',
                user.id,
                user.language
            );
            expect(deleteSpy).toHaveBeenNthCalledWith(1, user.id, TokenType.PASSWORD_RESET);
            expect(deleteSpy).toHaveBeenNthCalledWith(2, user.id, TokenType.PASSWORD_RESET);
            expect(result).toEqual({ success: false, error: Resource.EMAIL_DELIVERY_FAILED });
        });
    });

    describe('resetPassword', () => {
        it('updates password and revokes reset plus refresh tokens on success', async () => {
            jest.spyOn(TokenService.prototype, 'verifyPasswordResetToken').mockResolvedValue({
                success: true,
                data: { userId: 44 },
            });
            const updateSpy = jest.spyOn(UserService.prototype, 'updateUser').mockResolvedValue({
                success: true,
                data: makeSanitizedUser({ id: 44 }),
            });
            const revokeSpy = jest.spyOn(TokenService.prototype, 'deleteByUserIdAndType').mockResolvedValue(2);

            const service = new AuthService();
            const result = await service.resetPassword('reset-token', 'new-password');

            expect(updateSpy).toHaveBeenCalledWith(
                44,
                { password: 'new-password' },
                { skipCurrentPasswordCheck: true }
            );
            expect(revokeSpy).toHaveBeenNthCalledWith(1, 44, TokenType.PASSWORD_RESET);
            expect(revokeSpy).toHaveBeenNthCalledWith(2, 44, TokenType.REFRESH);
            expect(result).toEqual({ success: true, data: { reset: true } });
        });

        it('returns invalid token when verification fails', async () => {
            jest.spyOn(TokenService.prototype, 'verifyPasswordResetToken').mockResolvedValue({
                success: false,
                error: Resource.EXPIRED_OR_INVALID_TOKEN,
            });

            const service = new AuthService();
            const result = await service.resetPassword('reset-token', 'new-password');

            expect(result).toEqual({ success: false, error: Resource.EXPIRED_OR_INVALID_TOKEN });
        });
    });
});

