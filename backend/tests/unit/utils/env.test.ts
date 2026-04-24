const originalEnv = { ...process.env };

const applyEnv = (entries: Record<string, string | undefined>) => {
    Object.entries(entries).forEach(([key, value]) => {
        if (value === undefined) {
            process.env[key] = "";
            return;
        }

        process.env[key] = value;
    });
};

const restoreEnv = () => {
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

const setCoreStartupEnv = () => {
    applyEnv({
        PORT: "",
        CORS_ORIGINS: 'https://app.example.com, https://admin.example.com',
        WEB_PUBLIC_BASE_URL: 'https://app.example.com/',
        DB_HOST: 'localhost',
        DB_PORT: '3307',
        DB_USER: 'root',
        DB_PASSWORD: 'secret',
        DB_DATABASE: 'zinero',
        JWT_ACCESS_SECRET: 'access-secret',
        JWT_REFRESH_SECRET: 'refresh-secret',
        JWT_ISSUER: 'zinero-api',
        JWT_AUDIENCE: 'zinero-web',
        RESEND_API_KEY: 'resend-key',
        RESEND_FROM_EMAIL: 'no-reply@example.com',
        FEEDBACK_TO_EMAIL: 'support@example.com',
        AVATAR_PUBLIC_BASE_URL: undefined,
        FTP_HOST: undefined,
        FTP_PORT: undefined,
        FTP_USER: undefined,
        FTP_PASSWORD: undefined,
        FTP_UPLOAD_PATH: undefined,
    });
};

describe('backend env config', () => {
    afterEach(() => {
        restoreEnv();
    });

    it('builds typed config with normalized urls and parsed lists', async () => {
        setCoreStartupEnv();
        applyEnv({
            NODE_ENV: 'production',
            AVATAR_PUBLIC_BASE_URL: 'https://cdn.example.com/users/',
            FTP_HOST: 'ftp.example.com',
            FTP_PORT: '2121',
            FTP_USER: 'ftp-user',
            FTP_PASSWORD: 'ftp-pass',
            FTP_UPLOAD_PATH: '/public_html/zinero/users',
        });

        const { getBackendConfig } = await import('../../../src/config/env');
        const config = getBackendConfig();

        expect(config.runtime.nodeEnv).toBe('production');
        expect(config.server).toEqual(expect.objectContaining({
            port: 3000,
            corsOrigins: ['https://app.example.com', 'https://admin.example.com'],
            webPublicBaseUrl: 'https://app.example.com',
        }));
        expect(config.database).toEqual(expect.objectContaining({
            host: 'localhost',
            port: 3307,
            user: 'root',
            password: 'secret',
            database: 'zinero',
        }));
        expect(config.auth.jwt).toEqual(expect.objectContaining({
            accessSecret: 'access-secret',
            refreshSecret: 'refresh-secret',
            issuer: 'zinero-api',
            audience: 'zinero-web',
            algorithm: 'HS256',
        }));
        expect(config.avatarStorage).toEqual(expect.objectContaining({
            publicBaseUrl: 'https://cdn.example.com/users',
            ftpHost: 'ftp.example.com',
            ftpPort: 2121,
            ftpUser: 'ftp-user',
            ftpPassword: 'ftp-pass',
            ftpUploadPath: '/public_html/zinero/users',
        }));
    });

    it('fails startup validation when required core env vars are missing', async () => {
        applyEnv({
            CORS_ORIGINS: undefined,
            WEB_PUBLIC_BASE_URL: undefined,
            DB_HOST: undefined,
            DB_USER: undefined,
            DB_DATABASE: undefined,
            JWT_ACCESS_SECRET: undefined,
            JWT_REFRESH_SECRET: undefined,
            RESEND_API_KEY: undefined,
            RESEND_FROM_EMAIL: undefined,
            FEEDBACK_TO_EMAIL: undefined,
        });

        const { validateBackendStartupConfig } = await import('../../../src/config/env');

        expect(() => validateBackendStartupConfig()).toThrow(
            'BackendConfigValidationError: Missing required env vars: CORS_ORIGINS, WEB_PUBLIC_BASE_URL, DB_HOST, DB_USER, DB_DATABASE, JWT_ACCESS_SECRET, JWT_REFRESH_SECRET, RESEND_API_KEY, RESEND_FROM_EMAIL, FEEDBACK_TO_EMAIL'
        );
    });

    it('fails startup validation when avatar storage config is only partially provided', async () => {
        setCoreStartupEnv();
        applyEnv({
            AVATAR_PUBLIC_BASE_URL: 'https://cdn.example.com/users',
            FTP_HOST: 'ftp.example.com',
        });

        const { validateBackendStartupConfig } = await import('../../../src/config/env');

        expect(() => validateBackendStartupConfig()).toThrow(
            'BackendConfigValidationError: Missing required env vars: FTP_USER, FTP_PASSWORD, FTP_UPLOAD_PATH'
        );
    });
});
