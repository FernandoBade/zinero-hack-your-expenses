import { LogCategory, LogOperation, LogType } from '../../../../shared/enums/log.enums';
import { Language } from '../../../../shared/enums/language.enums';
import { translateAsync } from '../../../../shared/i18n/translate';
const originalEnv = { ...process.env };

const setEnv = (overrides: Record<string, string | undefined>) => {
    Object.keys(overrides).forEach((key) => {
        const value = overrides[key];
        if (value === undefined) {
            process.env[key] = '';
        } else {
            process.env[key] = value;
        }
    });
};

const resetEnv = () => {
    Object.keys(process.env).forEach((key) => {
        if (!(key in originalEnv)) {
            delete process.env[key];
        }
    });
    Object.keys(originalEnv).forEach((key) => {
        const value = originalEnv[key];
        if (value === undefined) {
            delete process.env[key];
        } else {
            process.env[key] = value;
        }
    });
};

const loadFeedbackEmail = async (env: Record<string, string | undefined>, mockLog = false) => {
    jest.resetModules();
    setEnv(env);

    const resendSend = jest.fn().mockResolvedValue({ data: { id: 'email-id' } });
    const ResendMock = jest.fn().mockImplementation(() => ({
        emails: { send: resendSend },
    }));
    jest.doMock('resend', () => ({ Resend: ResendMock }));

    let createLog: jest.Mock | undefined;
    if (mockLog) {
        createLog = jest.fn().mockResolvedValue(undefined);
        jest.doMock('../../../src/utils/commons', () => ({ createLog }));
    } else {
        jest.dontMock('../../../src/utils/commons');
    }

    const module = await import('../../../src/utils/email/feedbackEmail');
    return { module, createLog, resendSend };
};

describe('feedbackEmail utils', () => {
    afterEach(() => {
        resetEnv();
        jest.resetModules();
        jest.restoreAllMocks();
    });

    it('sends feedback email via resend', async () => {
        const { module, resendSend } = await loadFeedbackEmail({
            RESEND_API_KEY: 'test-key',
            RESEND_FROM_EMAIL: 'no-reply@example.com',
            FEEDBACK_TO_EMAIL: 'support@example.com',
        });

        const result = await module.sendFeedbackEmail({
            userId: 12,
            userEmail: 'user@example.com',
            title: 'Title',
            message: 'Message',
            language: Language.EN_US,
            attachments: [
                {
                    filename: 'test.png',
                    content: Buffer.from('data'),
                    contentType: 'image/png',
                },
            ],
        });

        expect(result).toEqual({ success: true });
        expect(resendSend).toHaveBeenCalledTimes(1);
        const payload = resendSend.mock.calls[0][0] as Record<string, unknown>;
        expect(payload).toEqual(expect.objectContaining({
            from: 'no-reply@example.com',
            to: 'support@example.com',
            subject: await translateAsync('email.feedback.subject', Language.EN_US),
        }));
        expect(payload.attachments).toEqual([
            expect.objectContaining({
                filename: 'test.png',
                content: expect.any(Buffer),
                contentType: 'image/png',
            }),
        ]);

        const html = payload.html as string;
        expect(html).toContain(await translateAsync('email.feedback.intro', Language.EN_US));
        expect(html).toContain('Title');
        expect(html).toContain('Message');
    });

    it('logs errors when resend fails', async () => {
        const { module, resendSend, createLog } = await loadFeedbackEmail({
            RESEND_API_KEY: 'test-key',
            RESEND_FROM_EMAIL: 'no-reply@example.com',
            FEEDBACK_TO_EMAIL: 'support@example.com',
        }, true);
        resendSend.mockRejectedValue(new Error('resend failed token=secret'));

        await expect(module.sendFeedbackEmail({
            userId: 7,
            userEmail: 'user@example.com',
            title: 'Title',
            message: 'Message',
        })).resolves.toEqual({ success: false });

        expect(createLog).toHaveBeenCalledWith(
            LogType.ERROR,
            LogOperation.CREATE,
            LogCategory.LOG,
            expect.objectContaining({
                event: 'FEEDBACK_EMAIL_SEND_FAILED',
                provider: 'resend',
                error: expect.objectContaining({ message: expect.stringContaining('token=[REDACTED]') }),
            }),
            7
        );
    });

    it('returns false and logs configuration errors when resend credentials are missing', async () => {
        const { module, createLog } = await loadFeedbackEmail({
            RESEND_API_KEY: undefined,
            RESEND_FROM_EMAIL: undefined,
        }, true);

        await expect(module.sendFeedbackEmail({
            userId: 18,
            userEmail: 'user@example.com',
            title: 'Title',
            message: 'Message',
        })).resolves.toEqual({ success: false });

        expect(createLog).toHaveBeenCalledWith(
            LogType.ERROR,
            LogOperation.CREATE,
            LogCategory.LOG,
            expect.objectContaining({
                event: 'FEEDBACK_EMAIL_SEND_FAILED',
                provider: 'resend',
                error: expect.objectContaining({ message: 'Resend configuration missing' }),
            }),
            18
        );
    });

    it('returns false and logs provider response errors with status code', async () => {
        const { module, resendSend, createLog } = await loadFeedbackEmail({
            RESEND_API_KEY: 'test-key',
            RESEND_FROM_EMAIL: 'no-reply@example.com',
            FEEDBACK_TO_EMAIL: 'support@example.com',
        }, true);
        resendSend.mockResolvedValue({
            error: {
                message: 'provider failed token=private-token',
                status: 502,
            },
        });

        await expect(module.sendFeedbackEmail({
            userId: 23,
            userEmail: 'user@example.com',
            title: 'Title',
            message: 'Message',
        })).resolves.toEqual({ success: false });

        expect(createLog).toHaveBeenCalledWith(
            LogType.ERROR,
            LogOperation.CREATE,
            LogCategory.LOG,
            expect.objectContaining({
                event: 'FEEDBACK_EMAIL_SEND_FAILED',
                provider: 'resend',
                error: expect.objectContaining({
                    message: expect.stringContaining('token=[REDACTED]'),
                    code: 502,
                }),
            }),
            23
        );
    });

    it('falls back to generic provider message when resend error object has no message', async () => {
        const { module, resendSend, createLog } = await loadFeedbackEmail({
            RESEND_API_KEY: 'test-key',
            RESEND_FROM_EMAIL: 'no-reply@example.com',
            FEEDBACK_TO_EMAIL: 'support@example.com',
        }, true);
        resendSend.mockResolvedValue({
            error: {
                statusCode: 500,
            },
        });

        await expect(module.sendFeedbackEmail({
            userId: 29,
            userEmail: 'user@example.com',
            title: 'Title',
            message: 'Message',
        })).resolves.toEqual({ success: false });

        expect(createLog).toHaveBeenCalledWith(
            LogType.ERROR,
            LogOperation.CREATE,
            LogCategory.LOG,
            expect.objectContaining({
                event: 'FEEDBACK_EMAIL_SEND_FAILED',
                provider: 'resend',
                error: expect.objectContaining({
                    message: 'Email provider error',
                    code: 500,
                }),
            }),
            29
        );
    });

    it('logs primitive resend failures and keeps token values redacted', async () => {
        const { module, resendSend, createLog } = await loadFeedbackEmail({
            RESEND_API_KEY: 'test-key',
            RESEND_FROM_EMAIL: 'no-reply@example.com',
            FEEDBACK_TO_EMAIL: 'support@example.com',
        }, true);
        resendSend.mockRejectedValue('timeout token=unsafe');

        await expect(module.sendFeedbackEmail({
            userId: 31,
            userEmail: 'user@example.com',
            title: 'Title',
            message: 'Message',
        })).resolves.toEqual({ success: false });

        expect(createLog).toHaveBeenCalledWith(
            LogType.ERROR,
            LogOperation.CREATE,
            LogCategory.LOG,
            expect.objectContaining({
                event: 'FEEDBACK_EMAIL_SEND_FAILED',
                provider: 'resend',
                error: expect.objectContaining({
                    message: expect.stringContaining('token=[REDACTED]'),
                }),
            }),
            31
        );
    });

    it('sends feedback without attachments when no attachment list is provided', async () => {
        const { module, resendSend } = await loadFeedbackEmail({
            RESEND_API_KEY: 'test-key',
            RESEND_FROM_EMAIL: 'no-reply@example.com',
            FEEDBACK_TO_EMAIL: 'support@example.com',
        });

        await expect(module.sendFeedbackEmail({
            userId: 40,
            userEmail: 'user@example.com',
            title: 'Title',
            message: 'Message',
            language: Language.EN_US,
        })).resolves.toEqual({ success: true });

        const payload = resendSend.mock.calls[0][0] as Record<string, unknown>;
        expect(payload.attachments).toBeUndefined();
    });

    it('swallows logging failures while handling resend errors', async () => {
        const { module, resendSend, createLog } = await loadFeedbackEmail({
            RESEND_API_KEY: 'test-key',
            RESEND_FROM_EMAIL: 'no-reply@example.com',
            FEEDBACK_TO_EMAIL: 'support@example.com',
        }, true);
        resendSend.mockRejectedValue(new Error('provider down'));
        (createLog as jest.Mock).mockRejectedValue(new Error('log failure'));

        await expect(module.sendFeedbackEmail({
            userId: 52,
            userEmail: 'user@example.com',
            title: 'Title',
            message: 'Message',
        })).resolves.toEqual({ success: false });
    });

    it('returns false and logs configuration errors when feedback recipient is missing', async () => {
        const { module, createLog } = await loadFeedbackEmail({
            RESEND_API_KEY: 'test-key',
            RESEND_FROM_EMAIL: 'no-reply@example.com',
            FEEDBACK_TO_EMAIL: undefined,
        }, true);

        await expect(module.sendFeedbackEmail({
            userId: 61,
            userEmail: 'user@example.com',
            title: 'Title',
            message: 'Message',
        })).resolves.toEqual({ success: false });

        expect(createLog).toHaveBeenCalledWith(
            LogType.ERROR,
            LogOperation.CREATE,
            LogCategory.LOG,
            expect.objectContaining({
                event: 'FEEDBACK_EMAIL_SEND_FAILED',
                provider: 'resend',
                error: expect.objectContaining({ message: 'Resend configuration missing' }),
            }),
            61
        );
    });
});

