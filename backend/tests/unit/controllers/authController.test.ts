import AuthController from '../../../src/controller/authController';
import { makeUser } from '../../helpers/factories';
import { AuthService } from '../../../src/service/authService';
import { HTTPStatus } from '../../../../shared/enums/http-status.enums';
import { LogCategory, LogOperation, LogType } from '../../../../shared/enums/log.enums';
import { ClearCookieOptions, TokenCookie } from '../../../src/utils/auth/cookieConfig';
import { ErrorCode as Resource } from '../../../../shared/errors/error-codes';
import * as commons from '../../../src/utils/commons';
import { createMockRequest, createMockResponse, createNext } from '../../helpers/mockExpress';
import * as rateLimiter from '../../../src/utils/auth/rateLimiter';

describe('AuthController', () => {
    let logSpy: jest.SpyInstance;

    beforeEach(() => {
        jest.clearAllMocks();
        logSpy = jest.spyOn(commons, 'createLog').mockResolvedValue();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('login', () => {
        it('returns 400 when credentials are missing', async () => {
            const loginSpy = jest.spyOn(AuthService.prototype, 'login');
            const rateSpy = jest.spyOn(rateLimiter, 'recordLoginFailure');
            const req = createMockRequest({ body: { email: '', password: '' } });
            const res = createMockResponse();
            const next = createNext();

            await AuthController.login(req, res, next);

            expect(loginSpy).not.toHaveBeenCalled();
            expect(rateSpy).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(HTTPStatus.BAD_REQUEST);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    errorCode: Resource.INVALID_CREDENTIALS,
                    
                })
            );
            expect(logSpy).not.toHaveBeenCalled();
            expect(next).not.toHaveBeenCalled();
        });

        it('returns 401 when service rejects credentials', async () => {
            const loginSpy = jest.spyOn(AuthService.prototype, 'login').mockResolvedValue({ success: false, error: Resource.INVALID_CREDENTIALS });
            const rateSpy = jest.spyOn(rateLimiter, 'recordLoginFailure');
            const req = createMockRequest({ body: { email: 'a@b.com', password: 'wrong' } });
            const res = createMockResponse();
            const next = createNext();

            await AuthController.login(req, res, next);

            expect(loginSpy).toHaveBeenCalledTimes(1);
            expect(loginSpy).toHaveBeenCalledWith('a@b.com', 'wrong');
            expect(rateSpy).toHaveBeenCalledWith(req);
            expect(res.status).toHaveBeenCalledWith(HTTPStatus.UNAUTHORIZED);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    errorCode: Resource.INVALID_CREDENTIALS,
                    
                })
            );
            expect(logSpy).not.toHaveBeenCalled();
            expect(next).not.toHaveBeenCalled();
        });

        it('returns 401 with not verified error payload', async () => {
            const loginSpy = jest.spyOn(AuthService.prototype, 'login').mockResolvedValue({ success: false, error: Resource.EMAIL_NOT_VERIFIED });
            const rateSpy = jest.spyOn(rateLimiter, 'recordLoginFailure');
            const req = createMockRequest({ body: { email: 'user@example.com', password: 'secret' } });
            const res = createMockResponse();
            const next = createNext();

            await AuthController.login(req, res, next);

            expect(loginSpy).toHaveBeenCalledWith('user@example.com', 'secret');
            expect(rateSpy).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(HTTPStatus.UNAUTHORIZED);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    errorCode: Resource.EMAIL_NOT_VERIFIED,
                    
                    error: expect.objectContaining({
                        email: 'user@example.com',
                        canResend: true,
                    }),
                })
            );
            expect(logSpy).not.toHaveBeenCalled();
            expect(next).not.toHaveBeenCalled();
        });

        it('returns 200 and logs on successful login', async () => {
            const data = { token: 'token123', refreshToken: 'refresh', user: makeUser({ id: 7 }) };
            const loginSpy = jest.spyOn(AuthService.prototype, 'login').mockResolvedValue({ success: true, data });
            const resetSpy = jest.spyOn(rateLimiter, 'resetLoginRateLimit');
            const req = createMockRequest({
                body: { email: 'a@b.com', password: 'secret' },
                cookies: {},
                ip: '127.0.0.1',
                headers: { 'user-agent': 'jest' }
            });
            const res = createMockResponse();
            const next = createNext();

            await AuthController.login(req, res, next);

            expect(loginSpy).toHaveBeenCalledWith('a@b.com', 'secret');
            expect(resetSpy).toHaveBeenCalledWith(req);
            expect(res.cookie).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(HTTPStatus.OK);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, data: { token: data.token } }));
            expect(logSpy).toHaveBeenCalledWith(
                LogType.SUCCESS,
                LogOperation.LOGIN,
                LogCategory.AUTH,
                { userId: 7, ip: '127.0.0.1', userAgent: 'jest' },
                7
            );
            expect(next).not.toHaveBeenCalled();
        });

        it('returns 500 and logs when service throws', async () => {
            jest.spyOn(AuthService.prototype, 'login').mockRejectedValue(new Error('boom'));
            const req = createMockRequest({
                body: { email: 'a@b.com', password: 'secret' },
                ip: '127.0.0.1',
                headers: { 'user-agent': 'jest' }
            });
            const res = createMockResponse();
            const next = createNext();

            await AuthController.login(req, res, next);

            expect(res.status).toHaveBeenCalledWith(HTTPStatus.INTERNAL_SERVER_ERROR);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    errorCode: Resource.INTERNAL_SERVER_ERROR,
                })
            );
            expect(logSpy).toHaveBeenCalledWith(
                LogType.ERROR,
                LogOperation.LOGIN,
                LogCategory.AUTH,
                expect.objectContaining({ error: expect.any(Object), ip: '127.0.0.1', userAgent: 'jest' }),
                undefined,
                next
            );
            expect(next).not.toHaveBeenCalled();
        });
    });

    describe('refresh', () => {
        it('returns 401 when refresh token missing', async () => {
            const refreshSpy = jest.spyOn(AuthService.prototype, 'refresh');
            const rateSpy = jest.spyOn(rateLimiter, 'recordRefreshFailure');
            const req = createMockRequest({ cookies: {} });
            const res = createMockResponse();
            const next = createNext();

            await AuthController.refresh(req, res, next);

            expect(refreshSpy).not.toHaveBeenCalled();
            expect(rateSpy).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(HTTPStatus.UNAUTHORIZED);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    errorCode: Resource.EXPIRED_OR_INVALID_TOKEN,
                })
            );
            expect(logSpy).not.toHaveBeenCalled();
            expect(next).not.toHaveBeenCalled();
        });

        it('returns 401 when service rejects token', async () => {
            const refreshSpy = jest.spyOn(AuthService.prototype, 'refresh').mockResolvedValue({ success: false, error: Resource.EXPIRED_OR_INVALID_TOKEN });
            const rateSpy = jest.spyOn(rateLimiter, 'recordRefreshFailure');
            const req = createMockRequest({ cookies: { refreshToken: 'bad' } });
            const res = createMockResponse();
            const next = createNext();

            await AuthController.refresh(req, res, next);

            expect(refreshSpy).toHaveBeenCalledWith('bad');
            expect(rateSpy).toHaveBeenCalledWith(req);
            expect(res.status).toHaveBeenCalledWith(HTTPStatus.UNAUTHORIZED);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    errorCode: Resource.EXPIRED_OR_INVALID_TOKEN,
                })
            );
            expect(logSpy).not.toHaveBeenCalled();
            expect(next).not.toHaveBeenCalled();
        });

        it('returns 200 on success', async () => {
            const payload = { token: 'new-token', refreshToken: 'new-refresh' };
            const refreshSpy = jest.spyOn(AuthService.prototype, 'refresh').mockResolvedValue({ success: true, data: payload });
            const resetSpy = jest.spyOn(rateLimiter, 'resetRefreshRateLimit');
            const req = createMockRequest({ cookies: { refreshToken: 'good' } });
            const res = createMockResponse();
            const next = createNext();

            await AuthController.refresh(req, res, next);

            expect(refreshSpy).toHaveBeenCalledWith('good');
            expect(resetSpy).toHaveBeenCalledWith(req);
            expect(res.cookie).toHaveBeenCalledWith(TokenCookie.name, 'new-refresh', TokenCookie.options);
            expect(res.status).toHaveBeenCalledWith(HTTPStatus.OK);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, data: { token: 'new-token' } }));
            expect(logSpy).not.toHaveBeenCalled();
            expect(next).not.toHaveBeenCalled();
        });

        it('returns 500 and logs when service throws', async () => {
            jest.spyOn(AuthService.prototype, 'refresh').mockRejectedValue(new Error('boom'));
            const req = createMockRequest({ cookies: { refreshToken: 'x' } });
            const res = createMockResponse();
            const next = createNext();

            await AuthController.refresh(req, res, next);

            expect(res.status).toHaveBeenCalledWith(HTTPStatus.INTERNAL_SERVER_ERROR);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    errorCode: Resource.INTERNAL_SERVER_ERROR,
                })
            );
            expect(logSpy).toHaveBeenCalledWith(
                LogType.ERROR,
                LogOperation.UPDATE,
                LogCategory.AUTH,
                expect.any(Object),
                undefined,
                next
            );
            expect(next).not.toHaveBeenCalled();
        });
    });

    describe('logout', () => {
        it('returns 400 and logs alert when refresh token missing', async () => {
            const logoutSpy = jest.spyOn(AuthService.prototype, 'logout');
            const req = createMockRequest({ cookies: {} });
            const res = createMockResponse();
            const next = createNext();

            await AuthController.logout(req, res, next);

            expect(logoutSpy).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(HTTPStatus.BAD_REQUEST);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    errorCode: Resource.TOKEN_NOT_FOUND,
                })
            );
            expect(next).not.toHaveBeenCalled();
        });

        it('returns 400 when service returns failure', async () => {
            const logoutSpy = jest.spyOn(AuthService.prototype, 'logout').mockResolvedValue({ success: false, error: Resource.TOKEN_NOT_FOUND });
            const req = createMockRequest({ cookies: { refreshToken: 'bad' } });
            const res = createMockResponse();
            const next = createNext();

            await AuthController.logout(req, res, next);

            expect(logoutSpy).toHaveBeenCalledWith('bad');
            expect(res.status).toHaveBeenCalledWith(HTTPStatus.BAD_REQUEST);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    errorCode: Resource.TOKEN_NOT_FOUND,
                })
            );
            expect(logSpy).not.toHaveBeenCalled();
            expect(next).not.toHaveBeenCalled();
        });

        it('returns 200 and logs on success', async () => {
            const logoutSpy = jest.spyOn(AuthService.prototype, 'logout').mockResolvedValue({ success: true, data: { userId: 8 } });
            const req = createMockRequest({ cookies: { refreshToken: 'good' } });
            const res = createMockResponse();
            const next = createNext();

            await AuthController.logout(req, res, next);

            expect(logoutSpy).toHaveBeenCalledWith('good');
            expect(res.clearCookie).toHaveBeenCalledWith(TokenCookie.name, ClearCookieOptions);
            expect(res.status).toHaveBeenCalledWith(HTTPStatus.OK);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
            expect(logSpy).toHaveBeenCalledWith(
                LogType.SUCCESS,
                LogOperation.LOGOUT,
                LogCategory.AUTH,
                { userId: 8 },
                8
            );
            expect(next).not.toHaveBeenCalled();
        });

        it('returns 500 and logs when service throws', async () => {
            jest.spyOn(AuthService.prototype, 'logout').mockRejectedValue(new Error('boom'));
            const req = createMockRequest({ cookies: { refreshToken: 'x' } });
            const res = createMockResponse();
            const next = createNext();

            await AuthController.logout(req, res, next);

            expect(res.status).toHaveBeenCalledWith(HTTPStatus.INTERNAL_SERVER_ERROR);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    errorCode: Resource.INTERNAL_SERVER_ERROR,
                })
            );
            expect(logSpy).toHaveBeenCalledWith(
                LogType.ERROR,
                LogOperation.LOGOUT,
                LogCategory.AUTH,
                expect.any(Object),
                undefined,
                next
            );
            expect(next).not.toHaveBeenCalled();
        });
    });

    describe('verifyEmail', () => {
        it('returns 400 when token is missing', async () => {
            const verifySpy = jest.spyOn(AuthService.prototype, 'verifyEmail');
            const req = createMockRequest({ body: {} });
            const res = createMockResponse();
            const next = createNext();

            await AuthController.verifyEmail(req, res, next);

            expect(verifySpy).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(HTTPStatus.BAD_REQUEST);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    errorCode: Resource.EXPIRED_OR_INVALID_TOKEN,
                })
            );
        });

        it('returns 200 when verification succeeds', async () => {
            const verifySpy = jest.spyOn(AuthService.prototype, 'verifyEmail').mockResolvedValue({ success: true, data: { verified: true, alreadyVerified: false } });
            const req = createMockRequest({ body: { token: 'token' } });
            const res = createMockResponse();
            const next = createNext();

            await AuthController.verifyEmail(req, res, next);

            expect(verifySpy).toHaveBeenCalledWith('token');
            expect(res.status).toHaveBeenCalledWith(HTTPStatus.OK);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    data: { verified: true, alreadyVerified: false },
                })
            );
            expect(next).not.toHaveBeenCalled();
        });

        it('returns 200 with already verified message when token was consumed', async () => {
            jest.spyOn(AuthService.prototype, 'verifyEmail').mockResolvedValue({
                success: true,
                data: { verified: true, alreadyVerified: true },
            });
            const req = createMockRequest({ body: { token: 'token' } });
            const res = createMockResponse();
            const next = createNext();

            await AuthController.verifyEmail(req, res, next);

            expect(res.status).toHaveBeenCalledWith(HTTPStatus.OK);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    data: { verified: true, alreadyVerified: true },
                })
            );
            expect(next).not.toHaveBeenCalled();
        });
    });

    describe('resendVerificationEmail', () => {
        it('returns 400 when email is invalid', async () => {
            const resendSpy = jest.spyOn(AuthService.prototype, 'resendEmailVerification');
            const req = createMockRequest({ body: { email: 'bad-email' } });
            const res = createMockResponse();
            const next = createNext();

            await AuthController.resendVerificationEmail(req, res, next);

            expect(resendSpy).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(HTTPStatus.BAD_REQUEST);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    errorCode: Resource.EMAIL_INVALID,
                })
            );
            expect(next).not.toHaveBeenCalled();
        });

        it('returns 429 with cooldown payload when throttled', async () => {
            const resendSpy = jest.spyOn(AuthService.prototype, 'resendEmailVerification').mockResolvedValue({
                success: false,
                error: Resource.EMAIL_VERIFICATION_COOLDOWN,
                data: { cooldownSeconds: 30 },
            });
            const req = createMockRequest({ body: { email: 'user@example.com' } });
            const res = createMockResponse();
            const next = createNext();

            await AuthController.resendVerificationEmail(req, res, next);

            expect(resendSpy).toHaveBeenCalledWith('user@example.com');
            expect(res.status).toHaveBeenCalledWith(HTTPStatus.TOO_MANY_REQUESTS);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    errorCode: Resource.EMAIL_VERIFICATION_COOLDOWN,
                    
                    error: expect.objectContaining({
                        cooldownSeconds: 30,
                    }),
                })
            );
            expect(next).not.toHaveBeenCalled();
        });

        it('returns 200 when resend succeeds', async () => {
            const resendSpy = jest.spyOn(AuthService.prototype, 'resendEmailVerification').mockResolvedValue({
                success: true,
                data: { sent: true },
            });
            const req = createMockRequest({ body: { email: 'user@example.com' } });
            const res = createMockResponse();
            const next = createNext();

            await AuthController.resendVerificationEmail(req, res, next);

            expect(resendSpy).toHaveBeenCalledWith('user@example.com');
            expect(res.status).toHaveBeenCalledWith(HTTPStatus.OK);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    data: { sent: true },
                })
            );
            expect(next).not.toHaveBeenCalled();
        });

        it('returns 503 when delivery fails for an existing account', async () => {
            const resendSpy = jest.spyOn(AuthService.prototype, 'resendEmailVerification').mockResolvedValue({
                success: false,
                error: Resource.EMAIL_DELIVERY_FAILED,
            });
            const req = createMockRequest({ body: { email: 'user@example.com' } });
            const res = createMockResponse();
            const next = createNext();

            await AuthController.resendVerificationEmail(req, res, next);

            expect(resendSpy).toHaveBeenCalledWith('user@example.com');
            expect(res.status).toHaveBeenCalledWith(HTTPStatus.SERVICE_UNAVAILABLE);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    errorCode: Resource.EMAIL_DELIVERY_FAILED,
                })
            );
            expect(next).not.toHaveBeenCalled();
        });
    });

    describe('forgotPassword', () => {
        it('returns 400 when email is invalid', async () => {
            const resetSpy = jest.spyOn(AuthService.prototype, 'requestPasswordReset');
            const req = createMockRequest({ body: { email: 'bad-email' } });
            const res = createMockResponse();
            const next = createNext();

            await AuthController.forgotPassword(req, res, next);

            expect(resetSpy).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(HTTPStatus.BAD_REQUEST);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    errorCode: Resource.EMAIL_INVALID,
                })
            );
        });

        it('returns 200 when request succeeds', async () => {
            const resetSpy = jest.spyOn(AuthService.prototype, 'requestPasswordReset').mockResolvedValue({ success: true, data: { sent: true } });
            const req = createMockRequest({ body: { email: 'user@example.com' } });
            const res = createMockResponse();
            const next = createNext();

            await AuthController.forgotPassword(req, res, next);

            expect(resetSpy).toHaveBeenCalledWith('user@example.com');
            expect(res.status).toHaveBeenCalledWith(HTTPStatus.OK);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    data: { sent: true },
                })
            );
        });

        it('returns 503 when delivery fails for an existing account', async () => {
            const resetSpy = jest.spyOn(AuthService.prototype, 'requestPasswordReset').mockResolvedValue({
                success: false,
                error: Resource.EMAIL_DELIVERY_FAILED,
            });
            const req = createMockRequest({ body: { email: 'user@example.com' } });
            const res = createMockResponse();
            const next = createNext();

            await AuthController.forgotPassword(req, res, next);

            expect(resetSpy).toHaveBeenCalledWith('user@example.com');
            expect(res.status).toHaveBeenCalledWith(HTTPStatus.SERVICE_UNAVAILABLE);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    errorCode: Resource.EMAIL_DELIVERY_FAILED,
                })
            );
            expect(next).not.toHaveBeenCalled();
        });

        it('returns 500 when service throws', async () => {
            jest.spyOn(AuthService.prototype, 'requestPasswordReset').mockRejectedValue(new Error('boom'));
            const req = createMockRequest({ body: { email: 'user@example.com' } });
            const res = createMockResponse();
            const next = createNext();

            await AuthController.forgotPassword(req, res, next);

            expect(res.status).toHaveBeenCalledWith(HTTPStatus.INTERNAL_SERVER_ERROR);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    errorCode: Resource.INTERNAL_SERVER_ERROR,
                })
            );
            expect(logSpy).toHaveBeenCalledWith(
                LogType.ERROR,
                LogOperation.UPDATE,
                LogCategory.AUTH,
                expect.any(Object),
                undefined,
                next
            );
            expect(next).not.toHaveBeenCalled();
        });
    });

    describe('resetPassword', () => {
        it('returns 400 when token is missing', async () => {
            const resetSpy = jest.spyOn(AuthService.prototype, 'resetPassword');
            const req = createMockRequest({ body: { password: 'password123' } });
            const res = createMockResponse();
            const next = createNext();

            await AuthController.resetPassword(req, res, next);

            expect(resetSpy).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(HTTPStatus.BAD_REQUEST);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    errorCode: Resource.EXPIRED_OR_INVALID_TOKEN,
                })
            );
        });

        it('returns 400 when password is too short', async () => {
            const resetSpy = jest.spyOn(AuthService.prototype, 'resetPassword');
            const req = createMockRequest({ body: { token: 'token', password: '123' } });
            const res = createMockResponse();
            const next = createNext();

            await AuthController.resetPassword(req, res, next);

            expect(resetSpy).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(HTTPStatus.BAD_REQUEST);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    errorCode: Resource.PASSWORD_TOO_SHORT,
                })
            );
        });

        it('returns 200 when reset succeeds', async () => {
            const resetSpy = jest.spyOn(AuthService.prototype, 'resetPassword').mockResolvedValue({ success: true, data: { reset: true } });
            const req = createMockRequest({ body: { token: 'token', password: 'password123' } });
            const res = createMockResponse();
            const next = createNext();

            await AuthController.resetPassword(req, res, next);

            expect(resetSpy).toHaveBeenCalledWith('token', 'password123');
            expect(res.status).toHaveBeenCalledWith(HTTPStatus.OK);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    data: { reset: true },
                })
            );
        });
    });
});

