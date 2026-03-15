import { AuthEvent } from "@shared/enums/auth.enums";
import { ApiRoutePath, AppRoutePath } from "@shared/enums/routes.enums";
import { AuthScheme, FetchCredentialsMode, HttpHeaderName, HttpMethod } from "@shared/enums/http.enums";
import { StorageKey } from "@shared/enums/storage.enums";
import { ErrorCode } from "@shared/errors/error-codes";
import { APP_ENV } from "@/config/env";
import { storage } from "@/platform/storage/storage";
import { replace } from "@/routes/navigation";
import { getLocale } from "@/state/locale.store";
import { emitAuthEvent, getAccessToken, setUnauthenticated } from "@/state/auth.store";
import type { ApiResponse } from "./httpTypes";

const AUTHORIZATION_SCHEME = {
    BEARER: AuthScheme.BEARER,
} as const;

const AUTH_REFRESH_BLOCKLIST = new Set<string>([
    ApiRoutePath.AUTH_LOGIN,
    ApiRoutePath.AUTH_REFRESH,
    ApiRoutePath.AUTH_LOGOUT,
]);

const MAX_GET_ATTEMPTS = 3;
const BASE_RETRY_DELAY_MS = 300;

const ERROR_CODE_BY_FAILURE = {
    NETWORK: ErrorCode.UNEXPECTED_ERROR,
    REQUEST_FAILED: ErrorCode.UNEXPECTED_ERROR,
} as const;

interface RequestExecutionContext {
    attempt: number;
    hasReplayedAfterRefresh: boolean;
}

type RefreshHandler = () => Promise<boolean>;

let refreshPromise: Promise<boolean> | null = null;
let refreshHandler: RefreshHandler | null = null;

function isAbsoluteUrl(value: string): boolean {
    return value.startsWith("http://") || value.startsWith("https://");
}

function resolvePath(input: string): string {
    if (isAbsoluteUrl(input)) {
        return new URL(input).pathname;
    }

    return input.startsWith("/") ? input : `/${input}`;
}

function buildRequestUrl(input: string): string {
    if (isAbsoluteUrl(input)) {
        return input;
    }

    const normalizedPath = resolvePath(input);
    const normalizedBaseUrl = APP_ENV.apiBaseUrl.endsWith("/")
        ? APP_ENV.apiBaseUrl.slice(0, -1)
        : APP_ENV.apiBaseUrl;

    return `${normalizedBaseUrl}${normalizedPath}`;
}

function buildRequestHeaders(init?: HeadersInit): Headers {
    const headers = new Headers(init);
    headers.set(HttpHeaderName.ACCEPT_LANGUAGE, getLocale());

    const accessToken = getAccessToken();
    if (accessToken !== null && !headers.has(HttpHeaderName.AUTHORIZATION)) {
        headers.set(HttpHeaderName.AUTHORIZATION, `${AUTHORIZATION_SCHEME.BEARER} ${accessToken}`);
    }

    return headers;
}

function resolveMethod(init?: RequestInit): string {
    return (init?.method ?? HttpMethod.GET).toUpperCase();
}

function isRetryableGetMethod(method: string): boolean {
    return method === HttpMethod.GET;
}

function computeBackoffMs(attempt: number): number {
    return BASE_RETRY_DELAY_MS * Math.pow(2, attempt - 1);
}

function isNetworkError(error: unknown): boolean {
    return error instanceof TypeError;
}

function isApiResponseShape<T>(value: unknown): value is ApiResponse<T> {
    if (typeof value !== "object" || value === null) {
        return false;
    }

    if (!("success" in value) || typeof (value as { success: unknown }).success !== "boolean") {
        return false;
    }

    if ((value as { success: boolean }).success === false) {
        return typeof (value as { errorCode?: unknown }).errorCode === "string";
    }

    return true;
}

function normalizeResponse<T>(response: Response, payload: unknown): ApiResponse<T> {
    if (isApiResponseShape<T>(payload)) {
        return payload;
    }

    if (response.ok) {
        return {
            success: true,
            data: payload as T,
        };
    }

    return {
        success: false,
        errorCode: ERROR_CODE_BY_FAILURE.REQUEST_FAILED,
        error: payload,
    };
}

function normalizeNetworkError<T>(error: unknown): ApiResponse<T> {
    return {
        success: false,
        errorCode: ERROR_CODE_BY_FAILURE.NETWORK,
        error,
    };
}

async function sleep(milliseconds: number): Promise<void> {
    await new Promise<void>((resolve) => {
        globalThis.setTimeout(resolve, milliseconds);
    });
}

async function parseResponsePayload(response: Response): Promise<unknown> {
    const rawBody = await response.text();
    if (!rawBody) {
        return undefined;
    }

    try {
        return JSON.parse(rawBody) as unknown;
    } catch {
        return rawBody;
    }
}

function shouldRunRefreshFlow(path: string, hasReplayedAfterRefresh: boolean): boolean {
    if (hasReplayedAfterRefresh) {
        return false;
    }

    return !AUTH_REFRESH_BLOCKLIST.has(path);
}

async function runRefreshOnce(): Promise<boolean> {
    if (refreshHandler === null) {
        return false;
    }

    if (refreshPromise === null) {
        refreshPromise = refreshHandler().finally(() => {
            refreshPromise = null;
        });
    }

    return refreshPromise;
}

function handleSessionExpired(): void {
    setUnauthenticated();
    storage.remove(StorageKey.ACCESS_TOKEN);
    emitAuthEvent(AuthEvent.SESSION_EXPIRED);
    replace(AppRoutePath.LOGIN);
}

async function executeRequest<T>(
    input: string,
    init: RequestInit | undefined,
    context: RequestExecutionContext
): Promise<ApiResponse<T>> {
    const method = resolveMethod(init);
    const path = resolvePath(input);
    const requestUrl = buildRequestUrl(input);
    const headers = buildRequestHeaders(init?.headers);

    const requestInit: RequestInit = {
        ...init,
        method,
        headers,
        credentials: FetchCredentialsMode.INCLUDE,
    };

    try {
        const response = await fetch(requestUrl, requestInit);

        if (response.status === 401 && shouldRunRefreshFlow(path, context.hasReplayedAfterRefresh)) {
            const refreshSucceeded = await runRefreshOnce();
            if (refreshSucceeded) {
                return executeRequest<T>(input, init, {
                    attempt: context.attempt,
                    hasReplayedAfterRefresh: true,
                });
            }

            handleSessionExpired();
        }

        const shouldRetry5xx =
            isRetryableGetMethod(method) &&
            response.status >= 500 &&
            context.attempt < MAX_GET_ATTEMPTS;

        if (shouldRetry5xx) {
            await sleep(computeBackoffMs(context.attempt));
            return executeRequest<T>(input, init, {
                ...context,
                attempt: context.attempt + 1,
            });
        }

        const payload = await parseResponsePayload(response);
        return normalizeResponse<T>(response, payload);
    } catch (error) {
        const shouldRetryNetworkError =
            isRetryableGetMethod(method) && isNetworkError(error) && context.attempt < MAX_GET_ATTEMPTS;

        if (shouldRetryNetworkError) {
            await sleep(computeBackoffMs(context.attempt));
            return executeRequest<T>(input, init, {
                ...context,
                attempt: context.attempt + 1,
            });
        }

        return normalizeNetworkError<T>(error);
    }
}

/**
 * @summary Executes an HTTP request with unified error normalization, retries, and auth refresh handling.
 * @param input Relative or absolute request URL.
 * @param init Optional request configuration.
 * @returns Standardized API response payload.
 */
export async function request<T>(input: string, init?: RequestInit): Promise<ApiResponse<T>> {
    return executeRequest<T>(input, init, {
        attempt: 1,
        hasReplayedAfterRefresh: false,
    });
}

/**
 * @summary Registers the refresh callback used when unauthorized responses require token renewal.
 * @param handler Refresh function from auth service.
 * @returns No return value.
 */
export function setAuthRefreshHandler(handler: RefreshHandler): void {
    refreshHandler = handler;
}
