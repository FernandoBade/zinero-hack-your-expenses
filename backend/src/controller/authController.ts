import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../service/authService';
import { answerAPI, formatError, createLog } from '../utils/commons';
import { HTTPStatus } from '../../../shared/enums/http-status.enums';
import { LogType, LogCategory, LogOperation } from '../../../shared/enums/log.enums';
import { ErrorCode } from '../../../shared/errors/error-codes';
import { TokenCookie, ClearCookieOptions } from '../utils/auth/cookieConfig';
import { recordLoginFailure, recordRefreshFailure, resetLoginRateLimit, resetRefreshRateLimit } from '../utils/auth/rateLimiter';
import { isString, isValidEmail, hasMinLength } from '../utils/validation/guards';

const resolveEmailDeliveryStatus = (error: ErrorCode): HTTPStatus =>
    error === ErrorCode.EMAIL_DELIVERY_FAILED
        ? HTTPStatus.SERVICE_UNAVAILABLE
        : HTTPStatus.INTERNAL_SERVER_ERROR;

export class AuthController {
        /**
     * @summary Authenticates user credentials and returns a fresh access token with refresh-cookie rotation.
     * @param req - Express request containing email and password.
     * @param res - Express response used to return the access token.
     * @param next - Express next function for error handling.
     * @returns HTTP 200 with access token or appropriate error.
     */

    static async login(req: Request, res: Response, next: NextFunction) {
        const email = (req.body?.email ?? '').toString().trim().toLowerCase();
        const password = req.body?.password as string | undefined;

        if (!email || !password) {
            return answerAPI(req, res, HTTPStatus.BAD_REQUEST, undefined, ErrorCode.INVALID_CREDENTIALS);
        }

        const authService = new AuthService();

        try {
            const result = await authService.login(email, password);

            if (!result.success || !result.data) {
                if (!result.success && result.error === ErrorCode.INVALID_CREDENTIALS) {
                    recordLoginFailure(req);
                    return answerAPI(req, res, HTTPStatus.UNAUTHORIZED, undefined, ErrorCode.INVALID_CREDENTIALS);
                }
                if (!result.success && result.error === ErrorCode.EMAIL_NOT_VERIFIED) {
                    return answerAPI(req, res, HTTPStatus.UNAUTHORIZED, {
                        email,
                        canResend: true,
                    }, ErrorCode.EMAIL_NOT_VERIFIED);
                }
                return answerAPI(req, res, HTTPStatus.UNAUTHORIZED, undefined, ErrorCode.INVALID_CREDENTIALS);
            }

            resetLoginRateLimit(req);
            res.cookie(TokenCookie.name, result.data.refreshToken, TokenCookie.options);

            await createLog(
                LogType.SUCCESS,
                LogOperation.LOGIN,
                LogCategory.AUTH,
                {
                    userId: result.data.user.id,
                    ip: req.ip,
                    userAgent: req.headers['user-agent']
                },
                result.data.user.id
            );

            return answerAPI(req, res, HTTPStatus.OK, { token: result.data.token });
        } catch (error) {
            await createLog(
                LogType.ERROR,
                LogOperation.LOGIN,
                LogCategory.AUTH,
                {
                    error: formatError(error),
                    ip: req.ip,
                    userAgent: req.headers['user-agent']
                },
                undefined,
                next
            );
            return answerAPI(req, res, HTTPStatus.INTERNAL_SERVER_ERROR, undefined, ErrorCode.INTERNAL_SERVER_ERROR);
        }
    }

        /**
     * @summary Validates the refresh cookie and rotates the session with a new access token.
     * @param req - Express request containing the token in cookies.
     * @param res - Express response used to return the new access token.
     * @param next - Express next function for error handling.
     * @returns HTTP 200 with new access token or appropriate error.
     */

    static async refresh(req: Request, res: Response, next: NextFunction) {
        const token = req.cookies?.[TokenCookie.name];

        if (!token) {
            return answerAPI(req, res, HTTPStatus.UNAUTHORIZED, undefined, ErrorCode.EXPIRED_OR_INVALID_TOKEN);
        }

        const authService = new AuthService();

        try {
            const result = await authService.refresh(token);

            if (!result.success || !result.data) {
                if (!result.success && result.error === ErrorCode.EXPIRED_OR_INVALID_TOKEN) {
                    recordRefreshFailure(req);
                }
                return answerAPI(req, res, HTTPStatus.UNAUTHORIZED, undefined, ErrorCode.EXPIRED_OR_INVALID_TOKEN);
            }

            resetRefreshRateLimit(req);
            res.cookie(TokenCookie.name, result.data.refreshToken, TokenCookie.options);

            return answerAPI(req, res, HTTPStatus.OK, { token: result.data.token });
        } catch (error) {
            await createLog(LogType.ERROR, LogOperation.UPDATE, LogCategory.AUTH, formatError(error), undefined, next);
            return answerAPI(req, res, HTTPStatus.INTERNAL_SERVER_ERROR, undefined, ErrorCode.INTERNAL_SERVER_ERROR);
        }
    }

        /**
     * @summary Revokes the active refresh session and clears authentication cookies.
     * @param req - Express request containing the token.
     * @param res - Express response confirming logout.
     * @param next - Express next function for error handling.
     * @returns HTTP 200 on successful logout or appropriate error.
     */

    static async logout(req: Request, res: Response, next: NextFunction) {
        const token = req.cookies?.[TokenCookie.name];

        if (!token) {
            return answerAPI(req, res, HTTPStatus.BAD_REQUEST, undefined, ErrorCode.TOKEN_NOT_FOUND);
        }

        const authService = new AuthService();

        try {
            const result = await authService.logout(token);

            if (!result.success || !result.data) {
                return answerAPI(req, res, HTTPStatus.BAD_REQUEST, undefined, ErrorCode.TOKEN_NOT_FOUND);
            }

            res.clearCookie(TokenCookie.name, ClearCookieOptions);

            await createLog(
                LogType.SUCCESS,
                LogOperation.LOGOUT,
                LogCategory.AUTH,
                { userId: result.data.userId },
                result.data.userId
            );

            return answerAPI(req, res, HTTPStatus.OK);

        } catch (error) {
            await createLog(LogType.ERROR, LogOperation.LOGOUT, LogCategory.AUTH, formatError(error), undefined, next);
            return answerAPI(req, res, HTTPStatus.INTERNAL_SERVER_ERROR, undefined, ErrorCode.INTERNAL_SERVER_ERROR);
        }
    }

        /**
     * @summary Validates an email verification token and activates the user email when applicable.
     * @param req - Express request containing the verification token.
     * @param res - Express response indicating verification result.
     * @param next - Express next function for error handling.
     * @returns HTTP 200 on success or appropriate error.
     */

    static async verifyEmail(req: Request, res: Response, next: NextFunction) {
        const token = req.body?.token;

        if (!isString(token)) {
            return answerAPI(req, res, HTTPStatus.BAD_REQUEST, undefined, ErrorCode.EXPIRED_OR_INVALID_TOKEN);
        }

        const authService = new AuthService();

        try {
            const result = await authService.verifyEmail(token);

            if (!result.success) {
                return answerAPI(req, res, HTTPStatus.BAD_REQUEST, undefined, result.error);
            }

            const message = result.data?.alreadyVerified
                ? ErrorCode.EMAIL_ALREADY_VERIFIED
                : ErrorCode.EMAIL_VERIFICATION_SUCCESS;
            return answerAPI(req, res, HTTPStatus.OK, result.data, message);
        } catch (error) {
            await createLog(LogType.ERROR, LogOperation.UPDATE, LogCategory.AUTH, formatError(error), undefined, next);
            return answerAPI(req, res, HTTPStatus.INTERNAL_SERVER_ERROR, undefined, ErrorCode.INTERNAL_SERVER_ERROR);
        }
    }

        /**
     * @summary Requests a new email verification token respecting cooldown constraints.
     * @param req - Express request containing the email address.
     * @param res - Express response confirming request.
     * @param next - Express next function for error handling.
     * @returns HTTP 200 on success or appropriate error.
     */

    static async resendVerificationEmail(req: Request, res: Response, next: NextFunction) {
        const email = req.body?.email;

        if (!isString(email) || !isValidEmail(email)) {
            return answerAPI(req, res, HTTPStatus.BAD_REQUEST, undefined, ErrorCode.EMAIL_INVALID);
        }

        const authService = new AuthService();

        try {
            const result = await authService.resendEmailVerification(email);

            if (!result.success) {
                if (result.error === ErrorCode.EMAIL_VERIFICATION_COOLDOWN) {
                    return answerAPI(req, res, HTTPStatus.TOO_MANY_REQUESTS, {
                        cooldownSeconds: result.data?.cooldownSeconds ?? 0
                    }, ErrorCode.EMAIL_VERIFICATION_COOLDOWN);
                }
                return answerAPI(req, res, resolveEmailDeliveryStatus(result.error), undefined, result.error);
            }

            return answerAPI(req, res, HTTPStatus.OK, result.data, ErrorCode.EMAIL_VERIFICATION_REQUESTED);
        } catch (error) {
            await createLog(LogType.ERROR, LogOperation.UPDATE, LogCategory.AUTH, formatError(error), undefined, next);
            return answerAPI(req, res, HTTPStatus.INTERNAL_SERVER_ERROR, undefined, ErrorCode.INTERNAL_SERVER_ERROR);
        }
    }

        /**
     * @summary Creates a password reset request for a valid user email.
     * @param req - Express request containing the email address.
     * @param res - Express response confirming request.
     * @param next - Express next function for error handling.
     * @returns HTTP 200 on success or appropriate error.
     */

    static async forgotPassword(req: Request, res: Response, next: NextFunction) {
        const email = req.body?.email;

        if (!isString(email) || !isValidEmail(email)) {
            return answerAPI(req, res, HTTPStatus.BAD_REQUEST, undefined, ErrorCode.EMAIL_INVALID);
        }

        const authService = new AuthService();

        try {
            const result = await authService.requestPasswordReset(email);

            if (!result.success) {
                return answerAPI(req, res, resolveEmailDeliveryStatus(result.error), undefined, result.error);
            }

            return answerAPI(req, res, HTTPStatus.OK, result.data, ErrorCode.PASSWORD_RESET_REQUESTED);
        } catch (error) {
            await createLog(LogType.ERROR, LogOperation.UPDATE, LogCategory.AUTH, formatError(error), undefined, next);
            return answerAPI(req, res, HTTPStatus.INTERNAL_SERVER_ERROR, undefined, ErrorCode.INTERNAL_SERVER_ERROR);
        }
    }

        /**
     * @summary Consumes a password reset token and updates the user password.
     * @param req - Express request containing token and new password.
     * @param res - Express response indicating reset status.
     * @param next - Express next function for error handling.
     * @returns HTTP 200 on success or appropriate error.
     */

    static async resetPassword(req: Request, res: Response, next: NextFunction) {
        const token = req.body?.token;
        const password = req.body?.password;

        if (!isString(token)) {
            return answerAPI(req, res, HTTPStatus.BAD_REQUEST, undefined, ErrorCode.EXPIRED_OR_INVALID_TOKEN);
        }

        if (!isString(password) || !hasMinLength(password, 6)) {
            return answerAPI(req, res, HTTPStatus.BAD_REQUEST, undefined, ErrorCode.PASSWORD_TOO_SHORT);
        }

        const authService = new AuthService();

        try {
            const result = await authService.resetPassword(token, password);

            if (!result.success) {
                const status = result.error === ErrorCode.INTERNAL_SERVER_ERROR ? HTTPStatus.INTERNAL_SERVER_ERROR : HTTPStatus.BAD_REQUEST;
                return answerAPI(req, res, status, undefined, result.error);
            }

            return answerAPI(req, res, HTTPStatus.OK, result.data, ErrorCode.PASSWORD_RESET_SUCCESS);
        } catch (error) {
            await createLog(LogType.ERROR, LogOperation.UPDATE, LogCategory.AUTH, formatError(error), undefined, next);
            return answerAPI(req, res, HTTPStatus.INTERNAL_SERVER_ERROR, undefined, ErrorCode.INTERNAL_SERVER_ERROR);
        }
    }
}

export default AuthController;

