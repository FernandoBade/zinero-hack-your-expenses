import type {
    ForgotPasswordInput,
    ForgotPasswordOutput,
    LoginInput,
    LoginOutput,
    RefreshOutput,
    ResetPasswordInput,
    ResetPasswordOutput,
    ResendVerificationEmailInput,
    ResendVerificationEmailOutput,
    VerifyEmailInput,
    VerifyEmailOutput,
} from "@shared/domains/auth/auth.types";
import { ApiRoutePath } from "@shared/enums/routes.enums";
import { HttpContentType, HttpHeaderName, HttpMethod } from "@shared/enums/http.enums";
import { request } from "@/api/http/httpClient";
import type { ApiResponse } from "@/api/http/httpTypes";

/**
 * @summary Calls the authentication login endpoint with user credentials.
 * @param email User email.
 * @param password User password.
 * @returns API response containing access token when successful.
 */
export async function login(email: string, password: string): Promise<ApiResponse<LoginOutput>> {
  const payload: LoginInput = { email, password };

  return request<LoginOutput>(ApiRoutePath.AUTH_LOGIN, {
    method: HttpMethod.POST,
    headers: {
      [HttpHeaderName.CONTENT_TYPE]: HttpContentType.APPLICATION_JSON,
    },
    body: JSON.stringify(payload),
  });
}

/**
 * @summary Requests a fresh access token using the server refresh session.
 * @returns API response containing a new access token when successful.
 */
export async function refresh(): Promise<ApiResponse<RefreshOutput>> {
  return request<RefreshOutput>(ApiRoutePath.AUTH_REFRESH, {
    method: HttpMethod.POST,
    headers: {
      [HttpHeaderName.CONTENT_TYPE]: HttpContentType.APPLICATION_JSON,
    },
  });
}

/**
 * @summary Calls the logout endpoint to invalidate the current server session.
 * @returns API response for logout operation.
 */
export async function logout(): Promise<ApiResponse<unknown>> {
  return request<unknown>(ApiRoutePath.AUTH_LOGOUT, {
    method: HttpMethod.POST,
    headers: {
      [HttpHeaderName.CONTENT_TYPE]: HttpContentType.APPLICATION_JSON,
    },
  });
}

/**
 * @summary Sends an email-verification token for validation.
 * @param token Verification token from the query string.
 * @returns API response describing the verification status.
 */
export async function verifyEmail(token: string): Promise<ApiResponse<VerifyEmailOutput>> {
  const payload: VerifyEmailInput = { token };

  return request<VerifyEmailOutput>(ApiRoutePath.AUTH_VERIFY_EMAIL, {
    method: HttpMethod.POST,
    headers: {
      [HttpHeaderName.CONTENT_TYPE]: HttpContentType.APPLICATION_JSON,
    },
    body: JSON.stringify(payload),
  });
}

/**
 * @summary Requests a new verification email for the provided address.
 * @param email User email.
 * @returns API response describing resend status and cooldown when present.
 */
export async function resendVerificationEmail(email: string): Promise<ApiResponse<ResendVerificationEmailOutput>> {
  const payload: ResendVerificationEmailInput = { email };

  return request<ResendVerificationEmailOutput>(ApiRoutePath.AUTH_RESEND_VERIFICATION, {
    method: HttpMethod.POST,
    headers: {
      [HttpHeaderName.CONTENT_TYPE]: HttpContentType.APPLICATION_JSON,
    },
    body: JSON.stringify(payload),
  });
}

/**
 * @summary Triggers the forgot-password email flow for the provided address.
 * @param email User email.
 * @returns API response describing the request status.
 */
export async function requestPasswordReset(email: string): Promise<ApiResponse<ForgotPasswordOutput>> {
  const payload: ForgotPasswordInput = { email };

  return request<ForgotPasswordOutput>(ApiRoutePath.AUTH_FORGOT_PASSWORD, {
    method: HttpMethod.POST,
    headers: {
      [HttpHeaderName.CONTENT_TYPE]: HttpContentType.APPLICATION_JSON,
    },
    body: JSON.stringify(payload),
  });
}

/**
 * @summary Resets the password using the token delivered by email.
 * @param token Password-reset token from the query string.
 * @param password New user password.
 * @returns API response describing reset completion.
 */
export async function resetPassword(token: string, password: string): Promise<ApiResponse<ResetPasswordOutput>> {
  const payload: ResetPasswordInput = { token, password };

  return request<ResetPasswordOutput>(ApiRoutePath.AUTH_RESET_PASSWORD, {
    method: HttpMethod.POST,
    headers: {
      [HttpHeaderName.CONTENT_TYPE]: HttpContentType.APPLICATION_JSON,
    },
    body: JSON.stringify(payload),
  });
}