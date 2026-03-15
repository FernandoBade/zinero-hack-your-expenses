import { verifyToken } from '../../../src/utils/auth/verifyToken';
import { HTTPStatus } from '../../../../shared/enums/http-status.enums';
import { Profile } from '../../../../shared/enums/user.enums';
import { ErrorCode as Resource } from '../../../../shared/errors/error-codes';
import { TokenUtils } from '../../../src/utils/auth/tokenUtils';
import { createMockRequest, createMockResponse, createNext } from '../../helpers/mockExpress';
import { UserService } from '../../../src/service/userService';
import { makeUser } from '../../helpers/factories';

declare module 'express-serve-static-core' {
    interface Request {
        user?: { id: number; profile?: Profile };
    }
}

jest.mock('../../../src/utils/auth/tokenUtils', () => ({
    TokenUtils: {
        verifyAccessToken: jest.fn(),
    },
}));

const verifyAccessTokenMock = TokenUtils.verifyAccessToken as jest.Mock;

describe('verifyToken middleware', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('responds with 401 when Authorization header is missing', async () => {
        const req = createMockRequest({ headers: {} });
        const res = createMockResponse();
        const next = createNext();

        await verifyToken(req, res, next);

        expect(res.status).toHaveBeenCalledWith(HTTPStatus.UNAUTHORIZED);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                success: false,
                errorCode: Resource.EXPIRED_OR_INVALID_TOKEN,
            })
        );
        expect(next).not.toHaveBeenCalled();
    });

    it('attaches user to request and calls next when token is valid', async () => {
        verifyAccessTokenMock.mockReturnValue({ id: 42 });
        jest.spyOn(UserService.prototype, 'findOne').mockResolvedValue({ success: true, data: makeUser({ id: 42, active: true }) });
        const req = createMockRequest({ headers: { authorization: 'Bearer validtoken' } });
        const res = createMockResponse();
        const next = createNext();

        await verifyToken(req, res, next);

        expect(verifyAccessTokenMock).toHaveBeenCalledWith('validtoken');
        expect(req.user).toEqual({ id: 42, profile: Profile.STARTER });
        expect(res.status).not.toHaveBeenCalled();
        expect(res.json).not.toHaveBeenCalled();
        expect(next).toHaveBeenCalledTimes(1);
    });

    it('returns 401 when token verification throws', async () => {
        verifyAccessTokenMock.mockImplementation(() => {
            throw new Error('invalid');
        });
        const req = createMockRequest({ headers: { authorization: 'Bearer broken' } });
        const res = createMockResponse();
        const next = createNext();

        await verifyToken(req, res, next);

        expect(res.status).toHaveBeenCalledWith(HTTPStatus.UNAUTHORIZED);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                success: false,
                errorCode: Resource.EXPIRED_OR_INVALID_TOKEN,
            })
        );
        expect(next).not.toHaveBeenCalled();
    });

    it('returns 401 when user is inactive', async () => {
        verifyAccessTokenMock.mockReturnValue({ id: 99 });
        jest.spyOn(UserService.prototype, 'findOne').mockResolvedValue({ success: true, data: makeUser({ id: 99, active: false }) });
        const req = createMockRequest({ headers: { authorization: 'Bearer validtoken' } });
        const res = createMockResponse();
        const next = createNext();

        await verifyToken(req, res, next);

        expect(res.status).toHaveBeenCalledWith(HTTPStatus.UNAUTHORIZED);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                success: false,
                errorCode: Resource.EXPIRED_OR_INVALID_TOKEN,
            })
        );
        expect(next).not.toHaveBeenCalled();
    });

    it('returns 401 when email is not verified', async () => {
        verifyAccessTokenMock.mockReturnValue({ id: 100 });
        jest.spyOn(UserService.prototype, 'findOne').mockResolvedValue({
            success: true,
            data: makeUser({ id: 100, active: true, emailVerifiedAt: null }),
        });
        const req = createMockRequest({ headers: { authorization: 'Bearer validtoken' } });
        const res = createMockResponse();
        const next = createNext();

        await verifyToken(req, res, next);

        expect(res.status).toHaveBeenCalledWith(HTTPStatus.UNAUTHORIZED);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                success: false,
                errorCode: Resource.EXPIRED_OR_INVALID_TOKEN,
            })
        );
        expect(next).not.toHaveBeenCalled();
    });
});

