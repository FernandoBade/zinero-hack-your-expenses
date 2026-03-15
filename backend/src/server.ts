// #region Imports
import dotenv from 'dotenv';
dotenv.config();
import express, { Request, Response, NextFunction } from "express";
import cookieParser from 'cookie-parser';

import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
import accountRoutes from './routes/accountRoutes';
import transactionRoutes from './routes/transactionRoutes';
import categoryRoutes from './routes/categoryRoutes';
import subcategoryRoutes from './routes/subcategoryRoutes';
import creditCardRoutes from './routes/creditCardRoutes';
import tagRoutes from './routes/tagRoutes';
import feedbackRoutes from './routes/feedbackRoutes';

import { createLog, sendErrorResponse, requestTimer } from './utils/commons';
import { HTTPStatus } from '../../shared/enums/http-status.enums';
import { LogCategory, LogOperation, LogType } from '../../shared/enums/log.enums';
import { ServerEnvKey, ServerHeaderValue, ServerHttpMethod, ServerRequestHeader, ServerResponseHeader, ServerRoutePath, ServerToken } from '../../shared/enums/server.enums';
import { ErrorCode } from '../../shared/errors/error-codes';
import { resolveRequestLanguage } from './utils/language';

// #endregion Imports

const app = express();
const port = process.env[ServerEnvKey.PORT] || 5050;

const envOrigins = (process.env[ServerEnvKey.CORS_ORIGINS] ?? ServerToken.EMPTY)
    .split(ServerToken.CSV_SEPARATOR)
    .map((origin) => origin.trim())
    .filter(Boolean);

// Middleware to handle CORS
app.use((req: Request, res: Response, next: NextFunction) => {
    const origin = req.headers[ServerRequestHeader.ORIGIN];
    if (origin && envOrigins.includes(origin)) {
        res.setHeader(ServerResponseHeader.ACCESS_CONTROL_ALLOW_ORIGIN, origin);
        res.setHeader(ServerResponseHeader.ACCESS_CONTROL_ALLOW_CREDENTIALS, ServerHeaderValue.TRUE);
        res.setHeader(ServerResponseHeader.VARY, ServerHeaderValue.ORIGIN);
    }

    res.setHeader(ServerResponseHeader.ACCESS_CONTROL_ALLOW_METHODS, ServerHeaderValue.ALLOW_METHODS);
    const requestHeaders = req.headers[ServerRequestHeader.ACCESS_CONTROL_REQUEST_HEADERS];
    res.setHeader(
        ServerResponseHeader.ACCESS_CONTROL_ALLOW_HEADERS,
        typeof requestHeaders === 'string'
            ? requestHeaders
            : ServerHeaderValue.ALLOW_HEADERS_DEFAULT
    );

    if (req.method === ServerHttpMethod.OPTIONS) {
        return res.sendStatus(HTTPStatus.NO_CONTENT);
    }

    return next();
});

// Middleware to track request time
app.use(requestTimer());


// Middleware to parse JSON bodies
app.use(express.json());
app.use(cookieParser());

// Middleware to resolve language from Accept-Language header
app.use((req: Request, res: Response, next: NextFunction) => {
    req.language = resolveRequestLanguage(req.headers[ServerRequestHeader.ACCEPT_LANGUAGE]);
    next();
});

// Register application routes
app.use(ServerRoutePath.AUTH, authRoutes);
app.use(ServerRoutePath.ACCOUNTS, accountRoutes);
app.use(ServerRoutePath.CREDIT_CARDS, creditCardRoutes);
app.use(ServerRoutePath.CATEGORIES, categoryRoutes);
app.use(ServerRoutePath.SUBCATEGORIES, subcategoryRoutes);
app.use(ServerRoutePath.TAGS, tagRoutes);
app.use(ServerRoutePath.TRANSACTIONS, transactionRoutes);
app.use(ServerRoutePath.USERS, userRoutes);
app.use(ServerRoutePath.FEEDBACK, feedbackRoutes);


/**
 * Global error handler to catch unhandled exceptions.
 *
 * @summary Normalizes uncaught request errors into machine-stable API error responses.
 *
 * @param error - Any unhandled error.
 * @param req - Express request object.
 * @param res - Express response object.
 * @param next - Next middleware function.
 */
function errorHandler(error: unknown, req: Request, res: Response, _next: NextFunction) {
    const isSyntaxError = error instanceof SyntaxError && ServerToken.ERROR_BODY_PROPERTY in error;

    const errorCode = isSyntaxError
        ? ErrorCode.INVALID_JSON
        : ErrorCode.INTERNAL_SERVER_ERROR;

    const status = isSyntaxError ? HTTPStatus.BAD_REQUEST : HTTPStatus.INTERNAL_SERVER_ERROR;

    return sendErrorResponse(req, res, status, errorCode, error);
}

app.use(errorHandler as unknown as express.ErrorRequestHandler);

/**
 * Starts the Express server.
 * Logs the active port to the console.
 *
 * @summary Boots the HTTP server and emits the startup log entry.
 */
function startServer() {
    app.listen(port, () => {
        createLog(
            LogType.DEBUG,
            LogOperation.CREATE,
            LogCategory.LOG,
            `${ServerToken.STARTUP_LOG_PREFIX}${port}`
        );
    });
}

startServer();



