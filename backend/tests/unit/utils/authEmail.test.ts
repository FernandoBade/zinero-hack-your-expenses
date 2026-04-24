import { LogCategory, LogOperation, LogType } from '../../../../shared/enums/log.enums';
import { Language } from '../../../../shared/enums/language.enums';
import { translateAsync } from '../../../../shared/i18n/translate';

const originalEnv = { ...process.env };

const setEnv = (overrides: Record<string, string | undefined>) => {
    Object.entries(overrides).forEach(([key, value]) => {
        process.env[key] = value ?? '';
    });
};

const resetEnv = () => {
    Object.keys(process.env).forEach((key) => {
        if (!(key in originalEnv)) {
            delete process.env[key];
        }
    });

    Object.entries(originalEnv).forEach(([key, value]) => {
        if (value === undefined) {
            delete process.env[key];
            return;
        }

        process.env[key] = value;
    });
};

const loadAuthEmail = async (env: Record<string, string | undefined>, mockLog = false) => {
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

    const module = await import('../../../src/utils/email/authEmail');
    return { module, createLog, resendSend };
};

describe('authEmail utils', () => {
    afterEach(() => {
        resetEnv();
        jest.resetModules();
        jest.restoreAllMocks();
    });

    it('builds verification link with configured web base url and encoded token', async () => {
        const { module } = await loadAuthEmail({
            WEB_PUBLIC_BASE_URL: 'https://app.example.com/',
        });

        const link = module.buildEmailVerificationLink('token value?');

        expect(link).toBe('https://app.example.com/verify-email?token=token%20value%3F');
    });

    it('builds relative link when no web base url is defined', async () => {
        const { module } = await loadAuthEmail({
            WEB_PUBLIC_BASE_URL: undefined,
        });

        const link = module.buildPasswordResetLink('abc');

        expect(link).toBe('/reset-password?token=abc');
    });

    it('sends verification email payload through custom sender', async () => {
        const { module } = await loadAuthEmail({
            WEB_PUBLIC_BASE_URL: 'https://app.example.com',
        });
        const sender = jest.fn().mockResolvedValue(undefined);

        await module.sendEmailVerificationEmail('user@example.com', 'verify-token', 12, undefined, sender);

        expect(sender).toHaveBeenCalledWith({
            type: 'emailVerification',
            to: 'user@example.com',
            link: 'https://app.example.com/verify-email?token=verify-token',
            userId: 12,
        });
    });

    it('sends password reset email via resend with localized content', async () => {
        const { module, resendSend } = await loadAuthEmail({
            WEB_PUBLIC_BASE_URL: 'https://app.example.com',
            RESEND_API_KEY: 'test-key',
            RESEND_FROM_EMAIL: 'no-reply@example.com',
        });

        await module.sendPasswordResetEmail('user@example.com', 'reset-token', 7);

        expect(resendSend).toHaveBeenCalledTimes(1);
        const payload = resendSend.mock.calls[0][0] as Record<string, unknown>;
        expect(payload).toEqual(expect.objectContaining({
            from: 'no-reply@example.com',
            to: 'user@example.com',
            subject: await translateAsync('email.auth.password_reset.subject', Language.PT_BR),
        }));

        const html = payload.html as string;
        expect(html).toContain(await translateAsync('email.auth.password_reset.body', Language.PT_BR));
        expect(html).toContain(await translateAsync('email.auth.password_reset.warning', Language.PT_BR));
        expect(html).toContain('https://app.example.com/reset-password?token=reset-token');
    });

    it('logs resend failures and rejects when the provider throws', async () => {
        const { module, resendSend, createLog } = await loadAuthEmail({
            WEB_PUBLIC_BASE_URL: 'https://app.example.com',
            RESEND_API_KEY: 'test-key',
            RESEND_FROM_EMAIL: 'no-reply@example.com',
        }, true);
        resendSend.mockRejectedValue(new Error('resend failed token=secret'));

        await expect(
            module.sendPasswordResetEmail('user@example.com', 'reset-token', 7)
        ).rejects.toThrow('AUTH_EMAIL_DELIVERY_FAILED');

        expect(createLog).toHaveBeenCalledWith(
            LogType.ERROR,
            LogOperation.CREATE,
            LogCategory.AUTH,
            expect.objectContaining({
                event: 'AUTH_EMAIL_SEND_FAILED',
                provider: 'resend',
                type: 'passwordReset',
                error: expect.objectContaining({ message: expect.stringContaining('token=[REDACTED]') }),
            }),
            7
        );
    });

    it('logs response errors and rejects when resend returns a provider error', async () => {
        const { module, resendSend, createLog } = await loadAuthEmail({
            WEB_PUBLIC_BASE_URL: 'https://app.example.com',
            RESEND_API_KEY: 'test-key',
            RESEND_FROM_EMAIL: 'no-reply@example.com',
        }, true);
        resendSend.mockResolvedValue({
            error: {
                message: 'provider failed token=secret-value',
                statusCode: 422,
            },
        });

        await expect(
            module.sendEmailVerificationEmail('user@example.com', 'verify-token', 33)
        ).rejects.toThrow('AUTH_EMAIL_DELIVERY_FAILED');

        expect(createLog).toHaveBeenCalledWith(
            LogType.ERROR,
            LogOperation.CREATE,
            LogCategory.AUTH,
            expect.objectContaining({
                event: 'AUTH_EMAIL_SEND_FAILED',
                provider: 'resend',
                type: 'emailVerification',
                error: expect.objectContaining({
                    message: expect.stringContaining('token=[REDACTED]'),
                    code: 422,
                }),
            }),
            33
        );
    });

    it('logs missing resend configuration and rejects honestly', async () => {
        const { module, createLog } = await loadAuthEmail({
            WEB_PUBLIC_BASE_URL: 'https://app.example.com',
            RESEND_API_KEY: undefined,
            RESEND_FROM_EMAIL: undefined,
        }, true);

        await expect(
            module.sendEmailVerificationEmail('user@example.com', 'verify-token', 15)
        ).rejects.toThrow('AUTH_EMAIL_DELIVERY_FAILED');

        expect(createLog).toHaveBeenCalledWith(
            LogType.ERROR,
            LogOperation.CREATE,
            LogCategory.AUTH,
            expect.objectContaining({
                event: 'AUTH_EMAIL_SEND_FAILED',
                provider: 'resend',
                type: 'emailVerification',
                error: expect.objectContaining({ message: 'Resend configuration missing' }),
            }),
            15
        );
    });

    it('swallows logging failures while still rejecting provider failures', async () => {
        const { module, resendSend, createLog } = await loadAuthEmail({
            WEB_PUBLIC_BASE_URL: 'https://app.example.com',
            RESEND_API_KEY: 'test-key',
            RESEND_FROM_EMAIL: 'no-reply@example.com',
        }, true);
        resendSend.mockRejectedValue(new Error('resend failed'));
        (createLog as jest.Mock).mockRejectedValue(new Error('log failed'));

        await expect(
            module.sendPasswordResetEmail('user@example.com', 'reset-token', 77)
        ).rejects.toThrow('AUTH_EMAIL_DELIVERY_FAILED');
    });
});
