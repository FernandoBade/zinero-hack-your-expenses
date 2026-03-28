import type {
    CreateUserInput,
    CreateUserOutput,
    GetUserByIdOutput,
    UserId,
} from "@shared/domains/user/user.types";
import { HttpContentType, HttpHeaderName, HttpMethod } from "@shared/enums/http.enums";
import { ApiRoutePath } from "@shared/enums/routes.enums";
import { request } from "@/api/http/httpClient";
import type { ApiResponse } from "@/api/http/httpTypes";

function buildGetUserByIdPath(userId: UserId): string {
    return ApiRoutePath.USER_BY_ID.replace(":id", String(userId));
}

/**
 * @summary Creates a new user account using the shared signup contract.
 * @param payload User creation payload.
 * @returns Standard API response with the created user payload.
 */
export async function createUser(payload: CreateUserInput): Promise<ApiResponse<CreateUserOutput>> {
    return request<CreateUserOutput>(ApiRoutePath.USERS, {
        method: HttpMethod.POST,
        headers: {
            [HttpHeaderName.CONTENT_TYPE]: HttpContentType.APPLICATION_JSON,
        },
        body: JSON.stringify(payload),
    });
}

/**
 * @summary Fetches profile and preference payload for a specific user id.
 * @param userId User identifier from the authenticated session context.
 * @returns Standard API response with the resolved user payload.
 */
export async function getUserById(userId: UserId): Promise<ApiResponse<GetUserByIdOutput>> {
    return request<GetUserByIdOutput>(buildGetUserByIdPath(userId), {
        method: HttpMethod.GET,
    });
}