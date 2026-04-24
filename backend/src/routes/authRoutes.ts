import { Router, Request, Response, NextFunction } from 'express';
import { AuthController } from '../controller/authController';
import { createLog, formatError } from '../utils/commons';
import { LogType, LogCategory, LogOperation } from '../../../shared/enums/log.enums';
import {
    rateLimitForgotPassword,
    rateLimitLogin,
    rateLimitRefresh,
    rateLimitResendVerification,
    rateLimitResetPassword,
    rateLimitVerifyEmail
} from '../utils/auth/rateLimiter';

const router = Router();

/**
 * @route POST /login
 * @description Authenticates a user and sets a token cookie for rotation.
 */
router.post('/login', rateLimitLogin, async (req: Request, res: Response, next: NextFunction) => {
    try {
        await AuthController.login(req, res, next);
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
    }
});

/**
 * @route POST /refresh
 * @description Issues a new access token using a valid token from cookies.
 */
router.post('/refresh', rateLimitRefresh, async (req: Request, res: Response, next: NextFunction) => {
    try {
        await AuthController.refresh(req, res, next);
    } catch (error) {
        await createLog(LogType.ERROR, LogOperation.UPDATE, LogCategory.AUTH, formatError(error), undefined, next);
    }
});

/**
 * @route POST /logout
 * @description Logs out the user by revoking the token and clearing the cookie.
 */
router.post('/logout', async (req: Request, res: Response, next: NextFunction) => {
    try {
        await AuthController.logout(req, res, next);
    } catch (error) {
        await createLog(LogType.ERROR, LogOperation.LOGOUT, LogCategory.AUTH, formatError(error), undefined, next);
    }
});

/**
 * @route POST /verify-email
 * @description Verifies user email using a token.
 */
router.post('/verify-email', rateLimitVerifyEmail, async (req: Request, res: Response, next: NextFunction) => {
    try {
        await AuthController.verifyEmail(req, res, next);
    } catch (error) {
        await createLog(LogType.ERROR, LogOperation.UPDATE, LogCategory.AUTH, formatError(error), undefined, next);
    }
});

/**
 * @route POST /resend-verification
 * @description Resends email verification token.
 */
router.post('/resend-verification', rateLimitResendVerification, async (req: Request, res: Response, next: NextFunction) => {
    try {
        await AuthController.resendVerificationEmail(req, res, next);
    } catch (error) {
        await createLog(LogType.ERROR, LogOperation.UPDATE, LogCategory.AUTH, formatError(error), undefined, next);
    }
});

/**
 * @route POST /forgot-password
 * @description Sends a password reset token to the user email.
 */
router.post('/forgot-password', rateLimitForgotPassword, async (req: Request, res: Response, next: NextFunction) => {
    try {
        await AuthController.forgotPassword(req, res, next);
    } catch (error) {
        await createLog(LogType.ERROR, LogOperation.UPDATE, LogCategory.AUTH, formatError(error), undefined, next);
    }
});

/**
 * @route POST /reset-password
 * @description Resets the password using a valid reset token.
 */
router.post('/reset-password', rateLimitResetPassword, async (req: Request, res: Response, next: NextFunction) => {
    try {
        await AuthController.resetPassword(req, res, next);
    } catch (error) {
        await createLog(LogType.ERROR, LogOperation.UPDATE, LogCategory.AUTH, formatError(error), undefined, next);
    }
});

export default router;

