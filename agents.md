## Project Context

This repository is a monorepo containing:

- `backend/` - Node.js + TypeScript backend
- `shared/` - shared contracts (types, enums, DTOs, i18n keys, assets)
- `frontend/` - Preact + Vite + TypeScript frontend

### Core Principle

The frontend must mirror backend architecture conceptually so backend-oriented developers can navigate frontend quickly.

---

# Frontend Stack (Non-Negotiable)

- Preact
- Vite
- TypeScript (strict)
- TailwindCSS
- DaisyUI
- History API Router (no hash router)

UI must be mobile-first.

---

# Capacitor Future Readiness

This frontend must remain compatible with a future Capacitor migration.

### Forbidden

- Installing Capacitor
- Using native APIs
- Calling native plugins

### Required

All native integrations must be abstracted behind `src/platform/`.

Required modules:

```text
platform/
|-- storage/
|-- network/
|-- backButton/
`-- isNative.ts
```

Pages and components must never call platform APIs directly.

---

# UI Layer Policy (Tailwind + DaisyUI)

DaisyUI is styling only, not a component system.

The real component library lives in `src/components/`.

### Allowed

DaisyUI classes may appear:

- inside `src/components/`
- inside `<page>Assets/` when strictly page-specific

### Forbidden

DaisyUI classes directly in `src/pages/**`.

Pages must use components such as:

```tsx
<Button />
<Card />
<Input />
<DataTable />
```

---

# TypeScript, Enums, and Constants Policy

All system identifiers must be typed. Never use repeated string literals for core contracts.

Examples that must be typed:

- UI variants
- route paths
- storage keys
- theme names
- event names
- API modes
- feature flags

### Enum Scope Rules

Use runtime enums only when runtime enum semantics are actually useful.

- Business/domain enums: `shared/enums/*`
- UI/state enums: `shared/enums/*`
- Route/path enums: `shared/enums/routes.enums.ts`
- Storage/theme/mode enums: `shared/enums/*`

### i18n Exception (Critical)

i18n keys must NOT use runtime enums.

i18n keys must be derived from `as const` catalogs and typed via `keyof`.

---

# Internationalization Architecture (Canonical)

This project is fully internationalized.

No user-visible text may appear as a hardcoded string in page/component JSX.

### Canonical Shared Structure

```text
shared/
  errors/
    error-codes.ts
    error-payload.ts

  fields/
    field-keys.ts
    field-label-map.ts

  i18n/
    locales/
      en-US/
        ui.ts
        errors.ts
        email.ts
      pt-BR/
        ui.ts
        errors.ts
        email.ts
      es-ES/
        ui.ts
        errors.ts
        email.ts

    mappings/
      error-code-map.ts

    types/
      i18n-key.ts
      locale.ts
      catalog.ts

    translate.ts
```

### Key Identity Rules

- `ErrorCode` identifies machine/business/API errors.
- `I18nKey` identifies translatable messages.
- `ErrorCode` and `I18nKey` are different contracts and must not be conflated.

### Key Naming Rules

Use domain-first dot notation.

Examples:

- `auth.login.submit`
- `auth.login.email.placeholder`
- `auth.login.signup_prompt.text`
- `error.invalid_credentials`
- `field.user_id.label`

Do not use:

- vague camelCase keys such as `authSignupHint`
- natural-language sentence keys
- hash keys

### Typing Rules

- Canonical locale is `en-US` for key derivation.
- `I18nKey = keyof CanonicalCatalog`.
- Non-canonical locales must `satisfy` canonical key shape.
- Missing locale keys must fail TypeScript.

### Translation Runtime Rules

- Shared translator must support ICU message syntax.
- Frontend translates UI locally from `I18nKey`.
- Backend returns `ErrorCode` + `params?` + `field?` for API errors.
- Backend does not return localized UI text as primary API contract.
- Backend may translate backend-owned channels (email/notifications).
- Locale catalog loading must be compatible with locale-level lazy loading.

### Field Mapping Rules

- Field identifiers must be typed by `FieldKey`.
- Field-to-label mapping must be typed (`Record<FieldKey, I18nKey>`), not `Record<string, ...>`.

### Hardcoded Text Enforcement

Hardcoded UI text is a bug.

- Pages/components must use i18n keys for user-visible text.
- ESLint must enforce detection for hardcoded user-visible JSX strings.

---

# Structural Mirroring Rules

Backend layers:

```text
routes/
controller/
service/
repositories/
utils/
shared/
```

Frontend equivalents:

| Backend | Frontend |
| --- | --- |
| routes | routes |
| controller | pages/*/*.controller.ts |
| service | services/ |
| repositories | api/ |
| utils | utils/ |
| shared | @shared/* |

---

# Folder Architecture

```text
src/
 |-- pages/
 |-- components/
 |-- services/
 |-- api/
 |-- routes/
 |-- platform/
 |-- state/
 |-- utils/
 |-- config/
 `-- styles/
```

Forbidden: `src/shared/`

Shared contracts must come from monorepo `shared/`.

---

# Naming Conventions

### Pages

```text
src/pages/login/login.tsx
src/pages/dashboard/dashboard.tsx
```

### Controllers

```text
login.controller.ts
dashboard.controller.ts
```

Controllers orchestrate flows and state. Controllers must not call API directly.

---

# Dependency Rules

Allowed imports:

| From | Can import |
| --- | --- |
| pages | components, services, state |
| services | api, utils |
| api | platform, utils |
| components | components, utils |
| routes | pages, state |

Forbidden:

- components -> services
- components -> api
- pages -> api
- pages -> fetch()

---

# HTTP Rules

All HTTP must go through `src/api/http/httpClient.ts`.

No `fetch()` elsewhere.

---

# Auth Architecture

Auth must be centralized:

```text
services/auth/auth.service.ts
state/auth.store.ts
```

Forbidden:

- token logic in pages
- refresh logic in pages

---

# Navigation Rules

Navigation must go through `src/routes/navigation.ts`.

Forbidden:

- `window.location`
- `history.pushState`

---

# Storage Rules

All storage must go through `src/platform/storage/`.

Forbidden outside platform layer:

- `localStorage`
- `sessionStorage`

---

# Design System Integrity

Reusable components must live in `src/components/`.

Agents must not recreate existing UI primitives with ad-hoc raw elements.

Pages must not override component styling directly.

---

# Documentation Rules

Every exported function in `services`, `api`, `platform`, and `state` must have JSDoc.

---

# Necessary Differences

If frontend differs from backend architecture, document it as `NECESSARY DIFFERENCE`.

---

# PR Checklist

- [ ] No `shared/` folder inside frontend
- [ ] No duplicated types
- [ ] No `fetch()` outside `api/`
- [ ] No `localStorage`/`sessionStorage` outside platform layer
- [ ] Components contain no business logic
- [ ] Services contain no UI logic
- [ ] Pages remain thin
- [ ] Design system components are reused
- [ ] No component style overrides
- [ ] Images imported from shared assets
- [ ] Typography tokens respected
- [ ] Numeric fonts used for financial values
- [ ] Backend API errors use `ErrorCode` contract (`errorCode`, `params?`, `field?`)
- [ ] Frontend maps `ErrorCode -> I18nKey` locally
- [ ] i18n keys use dot notation and come from canonical catalogs
- [ ] i18n keys are not runtime enums
- [ ] Locale files follow `locales/<locale>/ui.ts|errors.ts|email.ts`
- [ ] No hardcoded user-visible UI text
- [ ] ESLint rule for hardcoded UI text is active
