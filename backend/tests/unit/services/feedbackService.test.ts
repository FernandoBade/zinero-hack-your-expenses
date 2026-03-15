import { FeedbackService } from '../../../src/service/feedbackService';
import { sendFeedbackEmail } from '../../../src/utils/email/feedbackEmail';
import { ErrorCode as Resource } from '../../../../shared/errors/error-codes';

jest.mock('../../../src/utils/email/feedbackEmail', () => ({
    sendFeedbackEmail: jest.fn(),
}));

const sendFeedbackMock = sendFeedbackEmail as jest.MockedFunction<typeof sendFeedbackEmail>;

describe('FeedbackService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('returns success when email sender succeeds', async () => {
        sendFeedbackMock.mockResolvedValue({ success: true });

        const service = new FeedbackService();
        const result = await service.sendFeedback({
            userId: 1,
            userEmail: 'user@example.com',
            title: 'Title',
            message: 'Message',
        });

        expect(sendFeedbackMock).toHaveBeenCalledWith({
            userId: 1,
            userEmail: 'user@example.com',
            title: 'Title',
            message: 'Message',
        });
        expect(result).toEqual({ success: true, data: { sent: true } });
    });

    it('returns error when email sender fails', async () => {
        sendFeedbackMock.mockResolvedValue({ success: false });

        const service = new FeedbackService();
        const result = await service.sendFeedback({
            userId: 2,
            userEmail: 'user@example.com',
            title: 'Title',
            message: 'Message',
        });

        expect(result).toEqual({ success: false, error: Resource.FEEDBACK_SEND_FAILED });
    });
});
