# Zinero — Cross-cutting constraints

These rules apply in every layer and every skill. An agent must follow them regardless of which skill is loaded or whether CLAUDE.md is in context.

## 1. Shared contracts first

Use `shared/` enums, types, error codes, field keys, and i18n keys. Never define a local equivalent when a shared contract already exists or should exist.

- `ErrorCode` — all error identifiers
- `FieldKey` — all form field identifiers
- `I18nKey` — all user-visible string references
- Domain types from `shared/domains/*` — never redefine locally

## 2. English identifiers everywhere

All method names, variable names, type names, file names, and identifiers must be in English. User-facing copy uses the locale files — code identifiers do not.

## 3. No floating-point monetary arithmetic

Monetary values are always `MonetaryString` (`shared/types/format.types.ts`). All arithmetic goes through `backend/src/utils/monetary.utils.ts` only. Never use `number` or `float` for money.

## 4. No hardcoded user-visible strings

All user-facing text must reference an `I18nKey` from `@shared/i18n/`. Raw string literals for UI copy are forbidden in `frontend/src/pages/**` and `frontend/src/components/**`. ESLint enforces this.

## 5. Layer boundaries are strict

Each layer has defined responsibilities. Violations (pages calling API directly, services calling httpClient, backend skipping the service layer) are tracked as known risks. See each segment's CLAUDE.md for the boundary rules.
