import { sendFeedbackEmail, type FeedbackAttachmentInput } from '../utils/email/feedbackEmail';
import { ErrorCode } from '../../../shared/errors/error-codes';
import type { Locale } from '../../../shared/i18n/types/locale';
import type { SendFeedbackOutput } from '../../../shared/domains/feedback/feedback.types';

type FeedbackInput = {
    userId: number;
    userEmail: string;
    title: string;
    message: string;
    language?: Locale;
    attachments?: FeedbackAttachmentInput[];
};

export class FeedbackService {
        /**
     * @summary Sends feedback content through the configured email provider and normalizes the response.
     */
    async sendFeedback(
        payload: FeedbackInput
    ): Promise<{ success: true; data: SendFeedbackOutput } | { success: false; error: ErrorCode }> {
        const result = await sendFeedbackEmail(payload);
        if (!result.success) {
            return { success: false, error: ErrorCode.FEEDBACK_SEND_FAILED };
        }

        return { success: true, data: { sent: true } };
    }
}
