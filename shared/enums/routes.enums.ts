/** @summary History API route paths used by the frontend application shell. */
export enum AppRoutePath {
    LOGIN = "/login",
    SIGNUP = "/signup",
    VERIFY_EMAIL = "/verify-email",
    FORGOT_PASSWORD = "/forgot-password",
    RESET_PASSWORD = "/reset-password",
    DASHBOARD = "/dashboard",
    SANDBOX = "/sandbox",
}

/** @summary API route paths used by frontend HTTP clients. */
export enum ApiRoutePath {
    AUTH_LOGIN = "/auth/login",
    AUTH_REFRESH = "/auth/refresh",
    AUTH_LOGOUT = "/auth/logout",
    AUTH_VERIFY_EMAIL = "/auth/verify-email",
    AUTH_RESEND_VERIFICATION = "/auth/resend-verification",
    AUTH_FORGOT_PASSWORD = "/auth/forgot-password",
    AUTH_RESET_PASSWORD = "/auth/reset-password",
    USERS = "/users",
    USER_BY_ID = "/users/:id",
}