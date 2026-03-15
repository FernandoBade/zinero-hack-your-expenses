import { enUSErrorCatalog } from "../locales/en-US/errors";
import { enUSEmailCatalog } from "../locales/en-US/email";
import { enUSUiCatalog } from "../locales/en-US/ui";

type StringValues<T extends Record<string, unknown>> = {
  [K in keyof T]: string;
};

export type UiCatalog = StringValues<typeof enUSUiCatalog>;
export type ErrorCatalog = StringValues<typeof enUSErrorCatalog>;
export type EmailCatalog = StringValues<typeof enUSEmailCatalog>;

export const enUSCatalog = {
  ...enUSUiCatalog,
  ...enUSErrorCatalog,
  ...enUSEmailCatalog,
} as const;

export type I18nCatalog = StringValues<typeof enUSCatalog>;

export type TranslationParam = string | number | boolean | null | undefined;
export type TranslationParams = Readonly<Record<string, TranslationParam>>;
