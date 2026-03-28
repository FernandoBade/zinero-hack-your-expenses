import type { FieldKey } from "../fields/field-keys";
import type { ErrorCode } from "./error-codes";
import type { TranslationParams } from "../i18n/types/catalog";

export interface ErrorPayload {
  readonly errorCode: ErrorCode;
  readonly params?: TranslationParams;
  readonly field?: FieldKey;
}

/** @summary Field-scoped validation payload returned by API validation responses. */
export interface ValidationErrorPayload {
  readonly field: FieldKey;
  readonly errorCode: ErrorCode;
  readonly params?: TranslationParams;
}