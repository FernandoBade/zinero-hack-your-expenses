/** @summary Authentication lifecycle states for client session management. */
export enum AuthStatus {
    UNAUTHENTICATED = "unauthenticated",
    AUTHENTICATED = "authenticated",
    REFRESHING = "refreshing",
}

/** @summary Discrete auth events emitted through session state flows. */
export enum AuthEvent {
    LOGIN_SUCCESS = "login_success",
    LOGOUT = "logout",
    SESSION_EXPIRED = "session_expired",
}

/** @summary Token classification used by auth flows. */
export enum TokenType {
    REFRESH = "refresh",
    EMAIL_VERIFICATION = "emailVerification",
    PASSWORD_RESET = "passwordReset",
}
