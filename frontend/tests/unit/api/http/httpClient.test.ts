import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const storageRemoveMock = vi.fn();
const replaceMock = vi.fn();
const getLocaleMock = vi.fn();
const emitAuthEventMock = vi.fn();
const getAccessTokenMock = vi.fn();
const setUnauthenticatedMock = vi.fn();

vi.mock("@/config/env", () => ({
    APP_ENV: {
        apiBaseUrl: "http://localhost:3000",
        isDev: true,
        isProd: false,
        mode: "test",
    },
}));

vi.mock("@/platform/storage/storage", () => ({
    storage: {
        remove: (...args: unknown[]) => storageRemoveMock(...args),
    },
}));

vi.mock("@/routes/navigation", () => ({
    replace: (...args: unknown[]) => replaceMock(...args),
}));

vi.mock("@/state/locale.store", () => ({
    getLocale: () => getLocaleMock(),
}));

vi.mock("@/state/auth.store", () => ({
    emitAuthEvent: (...args: unknown[]) => emitAuthEventMock(...args),
    getAccessToken: () => getAccessTokenMock(),
    setUnauthenticated: (...args: unknown[]) => setUnauthenticatedMock(...args),
}));

import { request } from "@/api/http/httpClient";

describe("httpClient", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        getLocaleMock.mockReturnValue("en-US");
        getAccessTokenMock.mockReturnValue(null);
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("always includes credentials for auth-capable API requests", async () => {
        const fetchMock = vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
            text: async () => JSON.stringify({ success: true, data: { ok: true } }),
        });
        vi.stubGlobal("fetch", fetchMock);

        const result = await request<{ ok: boolean }>("/auth/refresh", { method: "POST" });

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock).toHaveBeenCalledWith(
            "http://localhost:3000/auth/refresh",
            expect.objectContaining({
                method: "POST",
                credentials: "include",
            })
        );

        const requestInit = fetchMock.mock.calls[0]?.[1] as RequestInit;
        const headers = new Headers(requestInit.headers);
        expect(headers.get("Accept-Language")).toBe("en-US");
        expect(result).toEqual({ success: true, data: { ok: true } });
    });
});
