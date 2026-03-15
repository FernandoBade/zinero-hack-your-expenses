import type { ErrorCode } from "@shared/errors/error-codes";
import type { FieldKey } from "@shared/fields/field-keys";
import type { TranslationParams } from "@shared/i18n/types/catalog";

interface ApiResponseMeta {
    error?: unknown;
    page?: number;
    pageSize?: number;
    totalItems?: number;
    pageCount?: number;
    elapsedTime?: string | number;
}

export type ApiErrorResponse = ApiResponseMeta & {
    success: false;
    errorCode: ErrorCode;
    params?: TranslationParams;
    field?: FieldKey;
    data?: never;
};

export type ApiSuccessResponse<T> = ApiResponseMeta & {
    success: true;
    data?: T;
};

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;
