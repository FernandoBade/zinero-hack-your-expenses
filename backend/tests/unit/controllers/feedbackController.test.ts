import FeedbackController from '../../../src/controller/feedbackController';
import { FeedbackService } from '../../../src/service/feedbackService';
import { UserService } from '../../../src/service/userService';
import { HTTPStatus } from '../../../../shared/enums/http-status.enums';
import { LogCategory, LogOperation, LogType } from '../../../../shared/enums/log.enums';
import { ErrorCode as Resource } from '../../../../shared/errors/error-codes';
import * as commons from '../../../src/utils/commons';
import { createMockRequest, createMockResponse, createNext } from '../../helpers/mockExpress';
import { makeUser } from '../../helpers/factories';
import type { Request } from 'express';

const authUser = { id: 42 };
const createAuthRequest = (overrides: Parameters<typeof createMockRequest>[0] = {}) =>
    createMockRequest({ user: authUser, ...overrides });

const makeFile = (overrides: Partial<Express.Multer.File> = {}): Express.Multer.File => ({
    fieldname: overrides.fieldname ?? 'image',
    originalname: overrides.originalname ?? 'file.png',
    encoding: overrides.encoding ?? '7bit',
    mimetype: overrides.mimetype ?? 'image/png',
    size: overrides.size ?? 100,
    buffer: overrides.buffer ?? Buffer.from('test'),
    destination: overrides.destination ?? '',
    filename: overrides.filename ?? 'file.png',
    path: overrides.path ?? '',
    stream: overrides.stream ?? process.stdin,
});

describe('FeedbackController', () => {
    let logSpy: jest.SpyInstance;

    beforeEach(() => {
        jest.clearAllMocks();
        logSpy = jest.spyOn(commons, 'createLog').mockResolvedValue();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('returns 400 when validation fails', async () => {
        const sendSpy = jest.spyOn(FeedbackService.prototype, 'sendFeedback');
        const req = createAuthRequest({ body: { title: '', message: '' } });
        const res = createMockResponse();
        const next = createNext();

        await FeedbackController.sendFeedback(req, res, next);

        expect(sendSpy).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(HTTPStatus.BAD_REQUEST);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                success: false,
                errorCode: Resource.VALIDATION_ERROR,
            })
        );
        expect(logSpy).not.toHaveBeenCalled();
    });

    it('returns 400 when attachment type is invalid', async () => {
        const sendSpy = jest.spyOn(FeedbackService.prototype, 'sendFeedback');
        const req = createAuthRequest({
            body: { title: 'Title', message: 'Message' },
            files: { image: [makeFile({ mimetype: 'text/plain' })] } as unknown as Request['files'],
        });
        const res = createMockResponse();
        const next = createNext();

        await FeedbackController.sendFeedback(req, res, next);

        expect(sendSpy).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(HTTPStatus.BAD_REQUEST);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                success: false,
                errorCode: Resource.VALIDATION_ERROR,
            })
        );
    });

    it('returns 200 and logs when feedback is sent', async () => {
        const user = makeUser({ id: authUser.id, email: 'user@example.com' });
        jest.spyOn(UserService.prototype, 'findOne').mockResolvedValue({ success: true, data: user });
        jest.spyOn(FeedbackService.prototype, 'sendFeedback').mockResolvedValue({ success: true, data: { sent: true } });

        const req = createAuthRequest({ body: { title: 'Title', message: 'Message' } });
        const res = createMockResponse();
        const next = createNext();

        await FeedbackController.sendFeedback(req, res, next);

        expect(res.status).toHaveBeenCalledWith(HTTPStatus.OK);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                success: true,
                data: { sent: true },
            })
        );
        expect(logSpy).toHaveBeenCalledWith(
            LogType.SUCCESS,
            LogOperation.CREATE,
            LogCategory.LOG,
            expect.objectContaining({
                event: 'FEEDBACK_SENT',
                hasImage: false,
                hasAudio: false,
            }),
            authUser.id
        );
    });
});

