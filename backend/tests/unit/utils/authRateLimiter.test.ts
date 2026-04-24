import { HTTPStatus } from '../../../../shared/enums/http-status.enums';
import { ErrorCode as Resource } from '../../../../shared/errors/error-codes';
import {
    clearRateLimitState,
    rateLimitForgotPassword,
    rateLimitLogin,
    rateLimitRefresh,
    rateLimitSignup,
    recordLoginFailure,
    recordRefreshFailure,
    resetLoginRateLimit,
    resetRefreshRateLimit,
} from '../../../src/utils/auth/rateLimiter';
import { createMockRequest, createMockResponse, createNext } from '../../helpers/mockExpress';

describe('auth rate limiter', () => {
    beforeEach(() => {
        clearRateLimitState();
    });

    it('returns 429 after too many failed login attempts', () => {
        const req = createMockRequest({
            ip: '127.0.0.1',
            body: { email: 'user@example.com' },
        });

        for (let i = 0; i < 5; i += 1) {
            recordLoginFailure(req);
        }

        const res = createMockResponse();
        const next = createNext();

        rateLimitLogin(req, res, next);

        expect(res.status).toHaveBeenCalledWith(HTTPStatus.TOO_MANY_REQUESTS);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                success: false,
                errorCode: Resource.TOO_MANY_REQUESTS,
            })
        );
        expect(next).not.toHaveBeenCalled();
    });

    it('resets login limiter after success', () => {
        const req = createMockRequest({
            ip: '127.0.0.1',
            body: { email: 'user@example.com' },
        });

        for (let i = 0; i < 5; i += 1) {
            recordLoginFailure(req);
        }

        resetLoginRateLimit(req);

        const res = createMockResponse();
        const next = createNext();

        rateLimitLogin(req, res, next);

        expect(next).toHaveBeenCalledTimes(1);
        expect(res.status).not.toHaveBeenCalled();
    });

    it('allows more conservative refresh recovery and blocks only after ten failures', () => {
        const req = createMockRequest({ ip: '127.0.0.1', cookies: { refreshToken: 'bad' } });

        for (let i = 0; i < 10; i += 1) {
            recordRefreshFailure(req);
        }

        const res = createMockResponse();
        const next = createNext();

        rateLimitRefresh(req, res, next);

        expect(res.status).toHaveBeenCalledWith(HTTPStatus.TOO_MANY_REQUESTS);
        expect(next).not.toHaveBeenCalled();
    });

    it('resets refresh limiter after success', () => {
        const req = createMockRequest({ ip: '127.0.0.1', cookies: { refreshToken: 'bad' } });

        for (let i = 0; i < 10; i += 1) {
            recordRefreshFailure(req);
        }

        resetRefreshRateLimit(req);

        const res = createMockResponse();
        const next = createNext();

        rateLimitRefresh(req, res, next);

        expect(next).toHaveBeenCalledTimes(1);
        expect(res.status).not.toHaveBeenCalled();
    });

    it('blocks signup after five requests per ip and normalized email window', () => {
        const req = createMockRequest({
            ip: '127.0.0.1',
            body: { email: ' User@Example.com ' },
        });

        for (let i = 0; i < 5; i += 1) {
            rateLimitSignup(req, createMockResponse(), createNext());
        }

        const res = createMockResponse();
        const next = createNext();

        rateLimitSignup(req, res, next);

        expect(res.status).toHaveBeenCalledWith(HTTPStatus.TOO_MANY_REQUESTS);
        expect(next).not.toHaveBeenCalled();
    });

    it('blocks forgot-password abuse after five public requests in the active window', () => {
        const req = createMockRequest({
            ip: '127.0.0.1',
            body: { email: 'user@example.com' },
        });

        for (let i = 0; i < 5; i += 1) {
            rateLimitForgotPassword(req, createMockResponse(), createNext());
        }

        const res = createMockResponse();
        const next = createNext();

        rateLimitForgotPassword(req, res, next);

        expect(res.status).toHaveBeenCalledWith(HTTPStatus.TOO_MANY_REQUESTS);
        expect(next).not.toHaveBeenCalled();
    });
});
