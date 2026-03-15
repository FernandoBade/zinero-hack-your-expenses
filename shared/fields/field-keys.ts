export const FieldKey = {
  ACCOUNT_ID: "accountId",
  ACTIVE: "active",
  AVATAR: "avatar",
  BALANCE: "balance",
  BIRTH_DATE: "birthDate",
  BODY: "body",
  CANONICAL_VALUE: "canonicalValue",
  CATEGORY_ID: "categoryId",
  COLOR: "color",
  COUNTRY: "country",
  CREDIT_CARD_ID: "creditCardId",
  CURRENCY: "currency",
  DATE: "date",
  DISPLAY_VALUE: "displayValue",
  EMAIL: "email",
  FIRST_NAME: "firstName",
  FLAG: "flag",
  HIDE_VALUES: "hideValues",
  INSTITUTION: "institution",
  IS_INSTALLMENT: "isInstallment",
  IS_RECURRING: "isRecurring",
  LANGUAGE: "language",
  LAST_NAME: "lastName",
  LIMIT: "limit",
  MESSAGE: "message",
  NAME: "name",
  OBSERVATION: "observation",
  PASSWORD: "password",
  PAYMENT_DAY: "paymentDay",
  PHONE: "phone",
  PROFILE: "profile",
  SUBCATEGORY_ID: "subcategoryId",
  TAGS: "tags",
  THEME: "theme",
  TITLE: "title",
  TOTAL_MONTHS: "totalMonths",
  TRANSACTION_SOURCE: "transactionSource",
  TRANSACTION_TYPE: "transactionType",
  TYPE: "type",
  USER_ID: "userId",
  VALUE: "value",
  IMAGE: "image",
  AUDIO: "audio",
  FILE: "file",
} as const;

export type FieldKey = (typeof FieldKey)[keyof typeof FieldKey];

const FIELD_KEY_SET: ReadonlySet<string> = new Set<string>(
  Object.values(FieldKey)
);

export function isFieldKey(value: string): value is FieldKey {
  return FIELD_KEY_SET.has(value);
}