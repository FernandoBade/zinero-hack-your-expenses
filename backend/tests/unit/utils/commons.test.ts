import { HTTPStatus } from '../../../../shared/enums/http-status.enums';
import { LogCategory, LogOperation, LogType } from '../../../../shared/enums/log.enums';
import { ErrorCode as Resource } from '../../../../shared/errors/error-codes';
import { createMockRequest, createMockResponse, createNext } from '../../helpers/mockExpress';
import { Language } from '../../../../shared/enums/language.enums';

jest.mock('winston', () => ({
    createLogger: jest.fn(),
    format: {
        combine: jest.fn(),
        timestamp: jest.fn(),
        colorize: jest.fn(),
        printf: jest.fn(),
    },
    transports: {
        Console: jest.fn(),
    },
    addColors: jest.fn(),
}));

describe('commons utils', () => {
    let commons: typeof import('../../../src/utils/commons');
    let loggerMock: { log: jest.Mock };

    const loadCommons = async () => {
        jest.resetModules();
        const winston = await import('winston');
        loggerMock = { log: jest.fn() };
        jest.spyOn(winston, 'createLogger').mockReturnValue(
            loggerMock as unknown as ReturnType<typeof winston.createLogger>
        );
        jest.spyOn(winston, 'addColors').mockImplementation(() => { });
        commons = await import('../../../src/utils/commons');
    };

    beforeEach(async () => {
        await loadCommons();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('createLog', () => {
        it('logs to console and delegates empty UPDATE details', async () => {
            const logServiceModule = await import('../../../src/service/logService');
            const logServiceSpy = jest
                .spyOn(logServiceModule.LogService.prototype, 'createLog')
                .mockResolvedValue({ success: true });

            await commons.createLog(LogType.SUCCESS, LogOperation.UPDATE, LogCategory.USER, {});

            expect(loggerMock.log).toHaveBeenCalledWith(
                LogType.SUCCESS,
                `[${LogOperation.UPDATE}][${LogCategory.USER}]: {}`
            );
            expect(logServiceSpy).toHaveBeenCalledWith(
                LogType.SUCCESS,
                LogOperation.UPDATE,
                LogCategory.USER,
                '{}',
                undefined
            );
        });

        it('logs to console and delegates DEBUG logs', async () => {
            const logServiceModule = await import('../../../src/service/logService');
            const logServiceSpy = jest
                .spyOn(logServiceModule.LogService.prototype, 'createLog')
                .mockResolvedValue({ success: true });

            const detail = { ok: true };
            await commons.createLog(LogType.DEBUG, LogOperation.CREATE, LogCategory.AUTH, detail, 5);

            expect(loggerMock.log).toHaveBeenCalledWith(
                LogType.DEBUG,
                `[${LogOperation.CREATE}][${LogCategory.AUTH}]: ${JSON.stringify(detail)}`
            );
            expect(logServiceSpy).toHaveBeenCalledWith(
                LogType.DEBUG,
                LogOperation.CREATE,
                LogCategory.AUTH,
                JSON.stringify(detail),
                5
            );
        });

        it('persists non-DEBUG logs with correct arguments and handles missing userId', async () => {
            const logServiceModule = await import('../../../src/service/logService');
            const logServiceSpy = jest
                .spyOn(logServiceModule.LogService.prototype, 'createLog')
                .mockResolvedValue({ success: true });

            await commons.createLog(LogType.ERROR, LogOperation.CREATE, LogCategory.USER, 'boom');

            expect(loggerMock.log).toHaveBeenCalledWith(
                LogType.ERROR,
                `[${LogOperation.CREATE}][${LogCategory.USER}]: boom`
            );
            expect(logServiceSpy).toHaveBeenCalledWith(
                LogType.ERROR,
                LogOperation.CREATE,
                LogCategory.USER,
                'boom',
                undefined
            );
        });
    });

    describe('answerAPI', () => {
        it('returns success response with data', () => {
            const req = createMockRequest();
            const res = createMockResponse();

            commons.answerAPI(req, res, HTTPStatus.OK, { id: 1 });

            const response = (res.json as jest.Mock).mock.calls[0][0];
            expect(res.status).toHaveBeenCalledWith(HTTPStatus.OK);
            expect(response.success).toBe(true);
            expect(response.data).toEqual({ id: 1 });
            expect(typeof response.elapsedTime).toBe('number');
        });

        it('returns error response with resource', () => {
            const req = createMockRequest({ language: Language.PT_BR });
            const res = createMockResponse();

            commons.answerAPI(req, res, HTTPStatus.BAD_REQUEST, { reason: 'x' }, Resource.INVALID_TYPE);

            const response = (res.json as jest.Mock).mock.calls[0][0];
            expect(res.status).toHaveBeenCalledWith(HTTPStatus.BAD_REQUEST);
            expect(response.success).toBe(false);
            expect(response.errorCode).toBe(Resource.INVALID_TYPE);
            expect(response.error).toEqual({ reason: 'x' });
            expect(typeof response.elapsedTime).toBe('number');
        });

        it('injects default resource when an error response is sent without resource', () => {
            const req = createMockRequest({ language: Language.EN_US });
            const res = createMockResponse();

            commons.answerAPI(req, res, HTTPStatus.BAD_REQUEST, { reason: 'x' });

            const response = (res.json as jest.Mock).mock.calls[0][0];
            expect(res.status).toHaveBeenCalledWith(HTTPStatus.BAD_REQUEST);
            expect(response.success).toBe(false);
            expect(response.errorCode).toBe(Resource.INTERNAL_SERVER_ERROR);
            expect(response.error).toEqual({ reason: 'x' });
        });

        it('handles pagination meta payloads', () => {
            const req = createMockRequest();
            const res = createMockResponse();

            commons.answerAPI(req, res, HTTPStatus.OK, {
                data: [1],
                meta: {
                    page: 1,
                    pageSize: 10,
                    pageCount: 1,
                    total: 1,
                    extra: 'x',
                },
            });

            const response = (res.json as jest.Mock).mock.calls[0][0];
            expect(response.data).toEqual([1]);
            expect(response.meta).toEqual({ extra: 'x' });
            expect(response.page).toBe(1);
            expect(response.pageSize).toBe(10);
            expect(response.pageCount).toBe(1);
            expect(response.totalItems).toBe(1);
            expect(typeof response.elapsedTime).toBe('number');
        });

        it('returns early when headers already sent', () => {
            const req = createMockRequest();
            const res = createMockResponse();
            res.headersSent = true;

            const result = commons.answerAPI(req, res, HTTPStatus.OK, { id: 1 });

            expect(result).toBeUndefined();
            expect(res.status).not.toHaveBeenCalled();
            expect(res.json).not.toHaveBeenCalled();
        });

        it('returns success response with primitive data', () => {
            const req = createMockRequest();
            const res = createMockResponse();

            commons.answerAPI(req, res, HTTPStatus.OK, 'ok');

            const response = (res.json as jest.Mock).mock.calls[0][0];
            expect(response.success).toBe(true);
            expect(response.data).toBe('ok');
        });
    });

    describe('buildLogDelta', () => {
        it('treats equivalent Date values as unchanged', () => {
            const now = new Date('2024-01-01T00:00:00.000Z');
            const before = { lastSeen: now, name: 'User' };
            const after = { lastSeen: new Date('2024-01-01T00:00:00.000Z'), name: 'User' };

            const delta = commons.buildLogDelta(before, after);

            expect(delta).toEqual({});
        });
    });

    describe('formatError', () => {
        it('normalizes Error instances', () => {
            const result = commons.formatError(new Error('boom'));
            expect(result).toEqual(expect.objectContaining({ message: 'boom', name: 'Error' }));
        });

        it('handles SQL-like error objects', () => {
            const error = Object.assign(new Error(''), {
                sqlMessage: 'SQL failure',
                code: 'ER_BAD',
                errno: 10,
                sqlState: 'HY000',
            });

            const result = commons.formatError(error);

            expect(result).toEqual(
                expect.objectContaining({
                    message: 'SQL failure',
                    code: 'ER_BAD',
                    errno: 10,
                    sqlState: 'HY000',
                })
            );
        });

        it('passes through plain objects', () => {
            const error = { ok: false };
            expect(commons.formatError(error)).toEqual(error);
        });

        it('wraps primitive errors', () => {
            expect(commons.formatError('boom')).toEqual({ message: 'boom' });
        });
    });

    describe('sendErrorResponse', () => {
        it('sends translated error response with payload', () => {
            const req = createMockRequest({ language: Language.EN_US });
            const res = createMockResponse();

            commons.sendErrorResponse(req, res, HTTPStatus.BAD_REQUEST, Resource.INVALID_TYPE, new Error('boom'));

            const response = (res.json as jest.Mock).mock.calls[0][0];
            expect(res.status).toHaveBeenCalledWith(HTTPStatus.BAD_REQUEST);
            expect(response.success).toBe(false);
            expect(response.errorCode).toBe(Resource.INVALID_TYPE);
            expect(response.error).toEqual(expect.objectContaining({ message: 'boom', name: 'Error' }));
            expect(typeof response.elapsedTime).toBe('number');
        });

        it('omits error payload when not provided', () => {
            const req = createMockRequest({ language: Language.EN_US });
            const res = createMockResponse();

            commons.sendErrorResponse(req, res, HTTPStatus.BAD_REQUEST, Resource.INVALID_TYPE);

            const response = (res.json as jest.Mock).mock.calls[0][0];
            expect(response.error).toBeUndefined();
        });
    });

    describe('requestTimer and elapsed time', () => {
        it('stores start time and calls next', () => {
            const req = createMockRequest();
            const res = createMockResponse();
            res.locals = {};
            const next = createNext();

            commons.requestTimer()(req, res, next);

            expect(typeof res.locals._startNs).toBe('bigint');
            expect(next).toHaveBeenCalledTimes(1);
        });

        it('calculates elapsed time when timer is present', () => {
            const req = createMockRequest();
            const res = createMockResponse();
            res.locals._startNs = BigInt(1000000);
            const hrtimeSpy = jest.spyOn(process.hrtime, 'bigint').mockReturnValue(BigInt(4000000));

            commons.answerAPI(req, res, HTTPStatus.OK, { ok: true });

            const response = (res.json as jest.Mock).mock.calls[0][0];
            expect(response.elapsedTime).toBe(3);
            hrtimeSpy.mockRestore();
        });

        it('returns 0 when timer is missing', () => {
            const req = createMockRequest();
            const res = createMockResponse();
            res.locals = {};

            commons.answerAPI(req, res, HTTPStatus.OK);

            const response = (res.json as jest.Mock).mock.calls[0][0];
            expect(response.elapsedTime).toBe(0);
        });
    });
});

