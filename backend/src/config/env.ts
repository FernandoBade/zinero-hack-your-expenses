import dotenv from "dotenv";

dotenv.config();

export type BackendNodeEnv = "development" | "test" | "production";

type BackendConfig = {
    runtime: {
        nodeEnv: BackendNodeEnv;
    };
    server: {
        port: number;
        corsOrigins: string[];
        webPublicBaseUrl: string;
    };
    database: {
        host: string;
        port: number;
        user: string;
        password: string;
        database: string;
        waitForConnections: true;
        connectionLimit: 10;
        queueLimit: 0;
    };
    auth: {
        jwt: {
            accessSecret: string;
            refreshSecret: string;
            issuer?: string;
            audience?: string;
            algorithm: "HS256";
        };
    };
    email: {
        resendApiKey?: string;
        resendFromEmail?: string;
        feedbackToEmail?: string;
    };
    avatarStorage: {
        publicBaseUrl?: string;
        ftpHost?: string;
        ftpPort: number;
        ftpUser?: string;
        ftpPassword?: string;
        ftpUploadPath?: string;
    };
};

const DEFAULT_SERVER_PORT = 3000;
const DEFAULT_DB_PORT = 3306;
const DEFAULT_FTP_PORT = 21;

/**
 * @summary Reads an optional env var and trims blank values to undefined.
 */
function readOptionalString(name: string): string | undefined {
    const value = process.env[name]?.trim();
    return value ? value : undefined;
}

/**
 * @summary Reads a string env var with a fallback used only outside strict startup validation.
 */
function readString(name: string, fallback = ""): string {
    return readOptionalString(name) ?? fallback;
}

/**
 * @summary Reads a positive integer env var and throws when the value is malformed.
 */
function readPositiveInteger(name: string, fallback: number): number {
    const raw = readOptionalString(name);
    if (!raw) {
        return fallback;
    }

    const value = Number(raw);
    if (!Number.isInteger(value) || value <= 0) {
        throw new Error(`BackendConfigValidationError: ${name} must be a positive integer`);
    }

    return value;
}

/**
 * @summary Splits a comma-separated env var into a normalized string array.
 */
function readCsv(name: string): string[] {
    const raw = readOptionalString(name);
    if (!raw) {
        return [];
    }

    return raw
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean);
}

/**
 * @summary Removes trailing slashes from optional URL-like env vars.
 */
function normalizeBaseUrl(value: string | undefined): string | undefined {
    return value?.replace(/\/+$/, "");
}

/**
 * @summary Normalizes NODE_ENV into the supported runtime values.
 */
function readNodeEnv(): BackendNodeEnv {
    const value = readOptionalString("NODE_ENV");
    if (value === "production" || value === "test") {
        return value;
    }

    return "development";
}

/**
 * @summary Builds the typed backend runtime config from the current process environment.
 */
export function getBackendConfig(): BackendConfig {
    return {
        runtime: {
            nodeEnv: readNodeEnv(),
        },
        server: {
            port: readPositiveInteger("PORT", DEFAULT_SERVER_PORT),
            corsOrigins: readCsv("CORS_ORIGINS"),
            webPublicBaseUrl: normalizeBaseUrl(readOptionalString("WEB_PUBLIC_BASE_URL")) ?? "",
        },
        database: {
            host: readString("DB_HOST"),
            port: readPositiveInteger("DB_PORT", DEFAULT_DB_PORT),
            user: readString("DB_USER"),
            password: readString("DB_PASSWORD"),
            database: readString("DB_DATABASE"),
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0,
        },
        auth: {
            jwt: {
                accessSecret: readString("JWT_ACCESS_SECRET"),
                refreshSecret: readString("JWT_REFRESH_SECRET"),
                issuer: readOptionalString("JWT_ISSUER"),
                audience: readOptionalString("JWT_AUDIENCE"),
                algorithm: "HS256",
            },
        },
        email: {
            resendApiKey: readOptionalString("RESEND_API_KEY"),
            resendFromEmail: readOptionalString("RESEND_FROM_EMAIL"),
            feedbackToEmail: readOptionalString("FEEDBACK_TO_EMAIL"),
        },
        avatarStorage: {
            publicBaseUrl: normalizeBaseUrl(readOptionalString("AVATAR_PUBLIC_BASE_URL")),
            ftpHost: readOptionalString("FTP_HOST"),
            ftpPort: readPositiveInteger("FTP_PORT", DEFAULT_FTP_PORT),
            ftpUser: readOptionalString("FTP_USER"),
            ftpPassword: readOptionalString("FTP_PASSWORD"),
            ftpUploadPath: readOptionalString("FTP_UPLOAD_PATH"),
        },
    };
}

/**
 * @summary Validates the env required to boot the HTTP server with operationally complete core features.
 */
export function validateBackendStartupConfig(): BackendConfig {
    const config = getBackendConfig();
    const missing: string[] = [];

    if (!config.server.corsOrigins.length) {
        missing.push("CORS_ORIGINS");
    }
    if (!config.server.webPublicBaseUrl) {
        missing.push("WEB_PUBLIC_BASE_URL");
    }

    if (!config.database.host) {
        missing.push("DB_HOST");
    }
    if (!config.database.user) {
        missing.push("DB_USER");
    }
    if (!config.database.database) {
        missing.push("DB_DATABASE");
    }

    if (!config.auth.jwt.accessSecret) {
        missing.push("JWT_ACCESS_SECRET");
    }
    if (!config.auth.jwt.refreshSecret) {
        missing.push("JWT_REFRESH_SECRET");
    }

    if (!config.email.resendApiKey) {
        missing.push("RESEND_API_KEY");
    }
    if (!config.email.resendFromEmail) {
        missing.push("RESEND_FROM_EMAIL");
    }
    if (!config.email.feedbackToEmail) {
        missing.push("FEEDBACK_TO_EMAIL");
    }

    const avatarFields = [
        ["AVATAR_PUBLIC_BASE_URL", config.avatarStorage.publicBaseUrl],
        ["FTP_HOST", config.avatarStorage.ftpHost],
        ["FTP_USER", config.avatarStorage.ftpUser],
        ["FTP_PASSWORD", config.avatarStorage.ftpPassword],
        ["FTP_UPLOAD_PATH", config.avatarStorage.ftpUploadPath],
    ] as const;
    const avatarConfigStarted = avatarFields.some(([, value]) => Boolean(value));
    const avatarConfigComplete = avatarFields.every(([, value]) => Boolean(value));

    if (avatarConfigStarted && !avatarConfigComplete) {
        avatarFields.forEach(([name, value]) => {
            if (!value) {
                missing.push(name);
            }
        });
    }

    if (missing.length > 0) {
        throw new Error(
            `BackendConfigValidationError: Missing required env vars: ${Array.from(new Set(missing)).join(", ")}`
        );
    }

    return config;
}
