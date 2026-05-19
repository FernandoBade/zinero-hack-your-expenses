# Shared — Zinero

Cross-layer contracts consumed by both `backend/` and `frontend/`. This is **not** a separate npm workspace — it is a common folder.

- Backend imports via relative paths: `../../../shared/errors/error-codes`
- Frontend imports via the `@shared/*` Vite alias: `@shared/errors/error-codes`

## Directory structure

```
shared/
├── assets/     fonts (IBM Plex Mono, Plus Jakarta Sans), images, logos, country flags
├── domains/    Per-aggregate TypeScript types
│               auth, user, account, creditCard, category, subcategory,
│               tag, transaction, feedback, phone
├── enums/      24+ enum files — all runtime identifiers
│               routes, storage, auth, UI, HTTP, log, language, transaction,
│               upload, input, icon, filter, operator, server, theme, email, user
├── errors/     error-codes.ts (ErrorCode enum), error-payload.ts
├── fields/     field-keys.ts (FieldKey enum), field-label-map.ts
├── i18n/       locales/ (en-US, pt-BR, es-ES), mappings/, types/, translate.ts
└── types/      format.types.ts (MonetaryString, ISODateString), pagination.types.ts
```

## What belongs here

Only genuine cross-layer contracts: types, enums, error codes, field keys, i18n, and assets used by both backend and frontend.

**Do NOT add:** application logic, backend-only schema types, frontend-only component logic, or anything that only one layer uses.

All additions to `shared/` require `staff-architecture` structural approval before implementation.

## Key contracts

| Contract | File | Purpose |
|---|---|---|
| `ErrorCode` | `errors/error-codes.ts` | Machine-stable error identifiers — never raw strings |
| `FieldKey` | `fields/field-keys.ts` | Typed field identifiers — never raw strings |
| `I18nKey` | `i18n/types/i18n-key.ts` | Derived from `en-US` catalog — the only valid i18n key type |
| `MonetaryString` | `types/format.types.ts` | Canonical monetary format — never `number` or `float` |
| `ISODateString` | `types/format.types.ts` | Typed ISO 8601 date strings |

## Conventions for adding entries

### New ErrorCode
1. Propose to `staff-architecture` for structural approval
2. Add to `errors/error-codes.ts`
3. Add `I18nKey` mapping in `i18n/mappings/error-code-map.ts` (coordinate with `staff-ux-writing`)
4. Add copy in all 3 locale files (`locales/en-US/errors.ts`, `pt-BR`, `es-ES`)

### New FieldKey
1. Propose to `staff-architecture` for structural approval
2. Add to `fields/field-keys.ts`
3. Add label entry in `fields/field-label-map.ts` (coordinate with `staff-ux-writing`)

### New i18n key
1. Add to `i18n/locales/en-US/` first — this is the canonical type source
2. Add to `i18n/locales/pt-BR/` and `i18n/locales/es-ES/` with `satisfies I18nCatalog`
3. TypeScript enforces completeness via `satisfies` — missing keys fail compilation
4. Key naming: dot-notation, domain-first — `auth.login.submit`, not `authLoginSubmit`
5. Place in the correct file: `ui.ts` (product UI), `errors.ts` (error messages), `email.ts` (email content)

### New enum
1. Propose to `staff-architecture` for structural approval
2. Create in `enums/` following existing naming conventions
3. If UI-facing (variants, sizes, types): also coordinate with `staff-design-system` for semantic fit

### New domain type
1. Propose to `staff-architecture` for structural approval
2. Create in `domains/<aggregate>/` following existing file structure

## i18n notes

- `I18nCatalog` is derived from `en-US` — it is the TypeScript type source for `I18nKey`
- `pt-BR` and `es-ES` use `satisfies I18nCatalog` — missing keys fail TypeScript at compile time
- Runtime default locale is `pt-BR` (different from the canonical type source `en-US`)
- `resource.keys.ts` is a legacy layer used by the sandbox — do **NOT** extend it

---

For ownership governance and structural review rules:
→ load `.claude/skills/staff-architecture/SKILL.md`

For i18n content quality, transcreation, and copy governance:
→ load `.claude/skills/staff-ux-writing/SKILL.md`
