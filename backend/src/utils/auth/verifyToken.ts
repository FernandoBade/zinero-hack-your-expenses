import { Request, Response, NextFunction } from 'express';
import { TokenUtils } from './tokenUtils';
import { answerAPI } from '../commons';
import { AuthScheme } from '../../../../shared/enums/http.enums';
import { HTTPStatus } from '../../../../shared/enums/http-status.enums';
import { ErrorCode } from '../../../../shared/errors/error-codes';
import { UserService } from '../../service/userService';

/**
 * @summary Authenticates bearer tokens and populates request user context for protected routes.
 * @param req - Incoming request with optional Authorization header.
 * @param res - HTTP response used for error response.
 * @param next - Calls the next middleware if the token is valid.
 */

export async function verifyToken(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers['authorization'];
    const bearerPrefix = `${AuthScheme.BEARER} `;

    if (!authHeader || !authHeader.startsWith(bearerPrefix)) {
        answerAPI(req, res, HTTPStatus.UNAUTHORIZED, undefined, ErrorCode.EXPIRED_OR_INVALID_TOKEN);
        return;
    }

    const token = authHeader.slice(bearerPrefix.length);

    try {
        const tokenData = TokenUtils.verifyAccessToken(token) as { id: number };
        const userService = new UserService();
        const userResult = await userService.findOne(tokenData.id);

        if (!userResult.success || !userResult.data || !userResult.data.active || !userResult.data.emailVerifiedAt) {
            answerAPI(req, res, HTTPStatus.UNAUTHORIZED, undefined, ErrorCode.EXPIRED_OR_INVALID_TOKEN);
            return;
        }

        req.user = {
            id: tokenData.id,
            profile: userResult.data.profile,
        };
        next();
    } catch {
        answerAPI(req, res, HTTPStatus.UNAUTHORIZED, undefined, ErrorCode.EXPIRED_OR_INVALID_TOKEN);
        return;
    }
}

