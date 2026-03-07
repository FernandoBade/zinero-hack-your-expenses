## 📋 Project Context

This repository is a monorepo containing:

- **backend/** — Node.js + TypeScript backend
- **shared/** — shared contracts (types, enums, DTOs, i18n keys, assets)
- **frontend/** — Preact + Vite + TypeScript frontend

### Core Principle

The frontend must mirror the backend architecture conceptually.

The goal is that developers familiar with backend layers can instantly navigate frontend code.

---

# 🏗️ Frontend Stack (Non-Negotiable)

- Preact
- Vite
- TypeScript (strict)
- TailwindCSS
- DaisyUI
- History API Router (NO hash router)

UI must always be **mobile-first**.

---

# 📱 Capacitor Future Readiness

This frontend must remain compatible with a future Capacitor migration.

### Forbidden

- Installing Capacitor
- Using native APIs
- Calling native plugins

### Required

All native integrations must be abstracted behind:

```

src/platform/

```

Required platform modules:

```

platform/
├ storage/
├ network/
├ backButton/
└ isNative.ts

```

Pages and components must never interact with platform APIs directly.

---

# 🎨 UI Layer Policy (Tailwind + DaisyUI)

DaisyUI is **styling only**, not a component system.

The real component library lives in:

```

src/components/

```

### Allowed

DaisyUI classes may appear:

- inside `src/components/`
- inside `<page>Assets/` when strictly page-specific

### Forbidden

DaisyUI classes directly in:

```

src/pages/**

```

Pages must always use components such as:

```

<Button />
<Card />
<Input />
<DataTable />
```

---

# 🧠 TypeScript & Enum Policy

All system identifiers must be typed.

### Hard Rule

Never use repeated string literals.

Examples that must be typed:

* UI variants
* route paths
* storage keys
* theme names
* event names
* API modes
* feature flags

### Enum Location

All enums must live in:

```
shared/enums/
```

Example:

```
shared/enums/ui.enums.ts
shared/enums/routes.enums.ts
shared/enums/theme.enums.ts
shared/enums/storage.enums.ts
```

Frontend must import them via:

```ts
import { Something } from "@shared/enums/..."
```

---

# 🌐 Internationalization Enforcement (Critical)

This project is **fully internationalized**.

No user-visible text may appear as a string literal.

### Forbidden

```
<h1>Welcome back!</h1>
<Button>Log in</Button>
<Input placeholder="Email" />
```

### Correct

```ts
import { t } from "@shared/i18n"
```

```
<h1>{t(I18nKey.AUTH_LOGIN_TITLE)}</h1>
<Button>{t(I18nKey.AUTH_LOGIN_BUTTON)}</Button>
<Input placeholder={t(I18nKey.AUTH_EMAIL_PLACEHOLDER)} />
```

### Rules

* All UI text must come from `@shared/i18n`
* Pages must never contain hardcoded text
* New text requires adding keys in `shared/i18n`

Hardcoded UI text is considered a **bug**.

---

# ✨ Golden Rule

> UI is composition. Business logic never lives inside components.

---

# 🔄 Structural Mirroring Rules

Backend layers:

```
routes/
controller/
service/
repositories/
utils/
shared/
```

Frontend equivalents:

| Backend      | Frontend                |
| ------------ | ----------------------- |
| routes       | routes                  |
| controller   | pages/*/*.controller.ts |
| service      | services/               |
| repositories | api/                    |
| utils        | utils/                  |
| shared       | @shared/*               |

---

# 📁 Folder Architecture

```
src/
 ├ pages/
 ├ components/
 ├ services/
 ├ api/
 ├ routes/
 ├ platform/
 ├ state/
 ├ utils/
 ├ config/
 └ styles/
```

### Forbidden

```
src/shared/
```

Shared contracts must always come from monorepo `shared/`.

---

# 📝 Naming Conventions

### Pages

```
src/pages/login/login.tsx
src/pages/dashboard/dashboard.tsx
```

### Controllers

```
login.controller.ts
dashboard.controller.ts
```

Controllers orchestrate flows and state.

They must not call API directly.

---

# 📦 Page Assets

Page-specific UI goes inside:

```
src/pages/<page>/<page>Assets/
```

Example:

```
src/pages/login/loginAssets/LoginForm.tsx
```

Never pollute global components with page-only UI.

---

# 🔗 Dependency Rules

Allowed imports:

| From       | Can import                  |
| ---------- | --------------------------- |
| pages      | components, services, state |
| services   | api, utils                  |
| api        | platform, utils             |
| components | components, utils           |
| routes     | pages, state                |

Forbidden:

* components → services
* components → api
* pages → api
* pages → fetch()

---

# 🌐 HTTP Rules

All HTTP must go through:

```
src/api/http/httpClient.ts
```

No `fetch()` elsewhere.

---

# 🔐 Auth Architecture

Auth must be centralized:

```
services/auth/auth.service.ts
state/auth.store.ts
```

Forbidden:

* token in pages
* refresh logic in pages

---

# 🧭 Navigation Rules

Navigation must go through:

```
src/routes/navigation.ts
```

Forbidden:

```
window.location
history.pushState
```

---

# 💾 Storage Rules

All storage must go through:

```
src/platform/storage/
```

Forbidden:

```
localStorage
sessionStorage
```

outside platform layer.

---

# 🎨 UI Componentization Rules

Reusable components must live in:

```
src/components/
```

Required primitives:

* Button
* Input
* Card
* Modal
* Table
* DataTable
* Accordion
* Bullets
* Loader
* Alert
* Tooltip
* PageContainer
* Layout
* ErrorState

---

# 🧩 Design System Integrity (Critical)

Agents must **never recreate UI primitives**.

### Forbidden

```
<input class="input input-bordered">
<button class="btn btn-primary">
<div class="card">
```

### Correct

```
<Input />
<Button />
<Card />
```

Always reuse components from:

```
src/components/
```

If a component exists, it must be used.

---

# 🧱 Component Style Protection

Pages must not override component styling.

Forbidden:

```
<Input class="text-white" />
<Card class="bg-gray-200" />
<Button class="bg-green-600" />
```

Allowed:

```
<Button variant={UI.ButtonVariant.PRIMARY} />
<Input type={InputType.EMAIL} />
```

Component styling is internal.

---

# 🎯 Visual Fidelity Enforcement

When implementing screens from designs:

* spacing must follow reference
* hierarchy must match reference
* surfaces must preserve component colors

Agents must **not invent styling overrides**.

If visual differences appear, verify component usage before modifying styles.

---

# 📐 Page Composition Pattern

Pages must follow this hierarchy:

```
Page
 └ Layout
    └ PageContainer
       └ PageAssets components
          └ Shared components
```

Pages must remain thin.

Large JSX trees must be extracted.

---

# 📱 Responsive Rules

Mobile-first layout.

Mobile:

* single column

Desktop:

* progressive enhancements

Illustrations and secondary visuals may be hidden on small screens.

---

# 🖼 Image and Illustration Policy

All images must live in:

```
shared/assets/images/
```

Forbidden:

```
frontend/src/assets/images
frontend/public/images
pages/**/assets/images
```

Import example:

```ts
import loginIllustration from "@shared/assets/images/login.png"
```

---

# 🔤 Typography Rules

Fonts must be self-hosted in:

```
shared/assets/fonts/
```

Primary font:

```
Plus Jakarta Sans
```

Numeric font:

```
IBM Plex Mono
```

Numeric content must use:

```
font-variant-numeric: tabular-nums
```

Pages must use semantic typography tokens only.

---

# 🎨 Color Rules

Allowed tokens:

```
bg-base-100
bg-base-200
text-base-content
bg-primary
bg-success
```

Forbidden:

```
text-red-500
bg-blue-100
text-black
bg-white
text-[#222]
```

---

# 🪟 Collapse / Accordion Standard

All collapsible behavior must use:

```
src/components/collapse/collapse.tsx
```

Accordion must compose Collapse.

Ad-hoc `details/summary` implementations are forbidden.

---

# 🏷 Brand Asset Policy

Logos must come from:

```
shared/assets/images/
```

Forbidden:

```
frontend/src/assets/logo.png
external logo URLs
inline logo SVG
```

---

# 🧠 Screen Development Phase

Current project phase focuses on building screens.

Agents must prioritize:

1. composing UI with existing components
2. respecting design system
3. maintaining responsive layout
4. avoiding new primitives unless necessary
5. preserving architecture boundaries

Consistency is more important than experimentation.

---

# 📚 Documentation Rules

Every exported function in:

* services
* api
* platform
* state

must have JSDoc.

Example:

```ts
/**
 * @summary Fetch all tags for authenticated user
 */
```

---

# 🔍 Necessary Differences

If frontend differs from backend architecture, document it as:

```
NECESSARY DIFFERENCE
```

---

# ✅ PR Checklist

* [ ] No `shared/` folder inside frontend
* [ ] All enums imported from `@shared/enums`
* [ ] No duplicated types
* [ ] No hardcoded UI text
* [ ] No DaisyUI classes in pages
* [ ] No fetch outside api/
* [ ] No localStorage outside platform/
* [ ] Components contain no business logic
* [ ] Services contain no UI logic
* [ ] Pages remain thin
* [ ] Design system components reused
* [ ] No component style overrides
* [ ] Images imported from shared assets
* [ ] Typography tokens respected
* [ ] Numeric fonts used for financial values

```
