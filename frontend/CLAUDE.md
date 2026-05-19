# Frontend — Zinero

Preact + Vite + TypeScript + Tailwind CSS + DaisyUI. Entrypoint: `src/bootstrap/app.bootstrap.ts`.

## Directory structure

```
frontend/src/
├── api/          HTTP adapters per domain + httpClient.ts
├── bootstrap/    App initialization (locale, theme, auth state)
├── components/   Shared UI library — owned by staff-design-system
├── config/       Env config
├── pages/        Screen composition
├── platform/     storage/, network/, backButton/, isNative.ts
├── routes/       Router, navigation.ts, auth guard
├── services/     Frontend use-case logic
├── state/        Custom listener-based stores
├── styles/       Global CSS — owned by staff-design-system
├── types/        Frontend-local types
└── utils/        i18n helpers, intl utilities
```

## Layer pattern

```
Pages (composition only — shared components, i18n keys, no business logic)
  → Controllers (createXController factory — flow orchestration)
  → Services (use-case logic, ErrorCode → I18nKey translation)
  → API modules (httpClient adapters — return ApiResponse<T>)
  → httpClient.ts (single fetch() entry — auth header, retry, 401 refresh)
  → Backend
```

**Hard boundaries — never cross these:**
- Pages do NOT call services or API directly
- Controllers do NOT call API directly
- Services do NOT call `httpClient` directly
- `localStorage`/`sessionStorage` only through `platform/storage/`
- `window.location`, `history.pushState` only through `navigation.ts`
- New `document`/`window`/`navigator` access only through `platform/` adapters

## Component library

`frontend/src/components/` — 35+ shared components. Each has a `.tsx` file and a `.types.ts` file.

Key components: accordion, alert, button, card, data-table, empty-state, error-state, form, icon, input (+ integer, money, number, phone), loader, modal, pagination, select, table, toast, tooltip.

When product code needs a component that doesn't exist — **escalate to `staff-design-system`**, do not create inline.

## State stores

Custom listener-based stores in `frontend/src/state/` — no Redux, MobX, or Zustand.

Pattern: `getX()`, `setX()`, `subscribeX()`, `unsubscribeX()`. No API calls inside stores. Persists to `platform/storage/` when appropriate.

## Shared contract imports (frontend)

```typescript
import { ErrorCode } from '@shared/errors/error-codes';
import { AppRoutePath } from '@shared/enums/routes.enums';
import { StorageKey } from '@shared/enums/storage.enums';
import { I18nKey } from '@shared/i18n/types/i18n-key';
import { errorCodeMap } from '@shared/i18n/mappings/error-code-map';
// All domain types from @shared/domains/*
// All runtime identifiers from @shared/enums/*
```

`@shared/*` is a Vite alias resolving to `../../shared/`.

## i18n

```typescript
import { translate } from '../utils/i18n/translate';
// All user-visible text must use I18nKey
// ESLint enforces this in pages/ and components/ — exception: sandbox/
```

- Canonical type source: `en-US`
- Runtime default: `pt-BR`
- Locales: `en-US`, `pt-BR`, `es-ES` — defined in `shared/i18n/locales/`

## Platform boundary

`platform/isNative.ts` always returns `false` today. The `platform/` layer exists to support a future mobile app. Protect it: keep all browser API access inside `platform/` adapters.

## Tests

Vitest, located in `frontend/tests/`. Run with `npm test` from the `frontend/` workspace or the repository root.

Note: `button.test.tsx` is excluded from the default run because `vitest.config.ts` only includes `**/*.test.ts`.

---

For deep implementation standards and review checklists:
→ load `.claude/skills/staff-frontend/SKILL.md`

For component internals, design tokens, and the sandbox:
→ load `.claude/skills/staff-design-system/SKILL.md`
