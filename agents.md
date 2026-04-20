Document generated from direct inspection of the repository on `2026-04-19`.

Source of truth used here:
- versioned code in `backend/`, `frontend/`, and `shared/`
- monorepo manifests and configs
- existing documentation in the repository

`agents.md` was treated only as the desired guideline. When there is divergence, this file prioritizes what is actually implemented today.

The following were also validated locally on this date:
- `npm run lint`
- `npm run typecheck`
- `npm test`

## 1. Repository overview

`Zinero` is a TypeScript monorepo for a personal finance platform. The project’s stated goal, confirmed by `README.md`, is to turn transactions into structured financial understanding. The current codebase confirms that direction, but with different maturity levels between backend and frontend.

Real current state:
- `backend/` is the most complete part of the product. There is an Express API with authentication, users, accounts, cards, categories, subcategories, tags, transactions, feedback, logs, and MySQL persistence via Drizzle.
- `frontend/` exists and is active, but mainly covers authentication, application bootstrap, i18n, stores, the design system, and a demo `sandbox` page. The `dashboard` is still a simple placeholder.
- `shared/` centralizes contracts, enums, domain types, i18n, field labels, and assets reused by both sides.
- there is no `mobile/` package in the repository today.
- there is no sign of a native app implementation, extension plugin system, CI/CD, Docker, or automated deployment setup inside the repo.

Real high-level architecture:

```text
frontend (Preact + Vite)
  -> api/http/httpClient.ts
  -> backend REST (Express)
  -> controllers -> services -> repositories -> MySQL/Drizzle
  <- standardized responses with success/errorCode/error/params/field

shared/
  -> enums, types, DTO-like contracts, i18n, assets
```

Active parts:
- complete authentication with login, refresh, logout, email verification, and password reset
- backend CRUD for accounts, categories, subcategories, cards, tags, and transactions
- avatar upload
- transactional email sending and feedback flow
- frontend design system and web auth flow

Incomplete or transitional parts:
- business frontend beyond auth/sandbox
- real dashboard
- mobile readiness is still partial
- ownership-based authorization in the backend is inconsistent
- scripts and docs still reference structures that no longer exist

Planned parts or parts only suggested by the repository:
- future mobile app
- frontend expansion to cover financial modules that already exist in the API
- security hardening, observability, and automation

## 2. Monorepo structure

### Monorepo tool

The monorepo uses only `npm workspaces` in the root `package.json`.

Observed at the root:
- declared workspaces: `backend`, `frontend`
- there is no `turbo`, `nx`, `lerna`, `pnpm-workspace.yaml`, or other formal orchestrator
- `shared/` is not a published workspace; it is a common folder accessed directly by both sides

### Practical structure

```text
.
|-- backend/
|-- frontend/
|-- shared/
|-- README.md
`-- package.json
```

Main substructures:

```text
backend/src/
|-- @types/
|-- controller/
|-- db/
|-- dev/
|-- repositories/
|-- routes/
|-- service/
`-- utils/

frontend/src/
|-- api/
|-- bootstrap/
|-- components/
|-- config/
|-- pages/
|-- platform/
|-- routes/
|-- services/
|-- state/
|-- styles/
|-- types/
`-- utils/

shared/
|-- assets/
|-- domains/
|-- enums/
|-- errors/
|-- fields/
|-- i18n/
`-- types/
```

### Relationship between packages

- `backend` imports `shared` through relative paths such as `../../../shared/...`.
- `frontend` imports `shared` through the `@shared/*` alias, configured in `frontend/tsconfig.app.json` and `frontend/vite.config.ts`.
- `frontend` also declares `zinero: "file:.."` as a dependency in `frontend/package.json`, but the source code uses `@` and `@shared`; no actual use of that package name was found in the source.

### How reuse works

Real reuse across backend, frontend, and `shared`:
- route, auth, UI, HTTP, storage, theme, and language enums
- domain types for auth, user, account, category, creditCard, tag, transaction, feedback, and phone
- `ErrorCode`, error payloads, `FieldKey`, `fieldLabelMap`
- shared i18n, including `errorCodeMap`
- images, logos, flags, and fonts

### Shared dependencies and coupling

Dependencies or contracts shared in practice:
- `intl-messageformat` appears at the root and in the backend through `shared/i18n/translate.ts`
- the frontend depends heavily on the `@shared` alias
- the backend depends on `shared` through relative imports and through `tsconfig` with `rootDir: ".."` and `include` for `../shared/**/*`

Observed boundaries:
- `shared/` contains contracts and assets, not persistence or HTTP code
- `backend/` contains schema, repositories, database rules, and external integrations
- `frontend/` contains UI, state, routing, HTTP client logic, and web platform adapters

Risks of improper coupling:
- `shared` is not a versioned package or separate workspace; any change can break both sides at once
- backend relative imports into `shared` are long and fragile
- the frontend depends on access to the parent folder via Vite `server.fs.allow`
- the `zinero: file:..` dependency in the frontend suggests residual or legacy coupling that is not used by the current source

## 3. Updated architecture

### Layered architecture

Backend:
- `routes/`: endpoint definitions and `try/catch` wrappers
- `controller/`: HTTP validation, service calls, logging, and standardized responses
- `service/`: business rules and orchestration across repositories/services
- `repositories/`: Drizzle/MySQL queries
- `db/`: client, schema, relations, and migrations
- `utils/`: auth, email, validation, upload, language, pagination, logging, monetary logic

Frontend:
- `bootstrap/`: global initialization for locale, theme, and auth
- `routes/`: Wouter routing, centralized navigation, and auth guard
- `pages/`: screen composition
- `pages/*/*.controller.ts`: page-flow orchestration
- `services/`: frontend use cases
- `api/`: HTTP client and REST adapters
- `state/`: custom stores with listeners
- `platform/`: abstractions for storage, network, back button, and native runtime
- `components/`: reusable UI library
- `utils/`: i18n, intl, formatting, helpers

Shared:
- `domains/`: shared business contracts
- `enums/`: reused runtime identifiers
- `errors/`, `fields/`, `i18n/`, `types/`, `assets/`

### Main observed flows

Login:
1. `frontend/src/pages/login/login.tsx` calls `createLoginController`.
2. The controller uses `services/auth/auth.service.ts`.
3. The service calls `api/auth/auth.api.ts`.
4. `api/http/httpClient.ts` sends the request with `Accept-Language`, bearer token, and `credentials: include`.
5. `backend/src/routes/authRoutes.ts` calls `AuthController`.
6. `AuthService` validates credentials, generates an access token, generates a refresh token, persists the refresh token hash in the database, and responds with the access token.
7. The controller sets the httpOnly `refreshToken` cookie.

Session refresh:
1. `httpClient` intercepts `401`.
2. It calls the refresh handler registered by `initializeAuthService()`.
3. The backend validates the refresh token from the cookie, rotates the session, and returns a new access token.
4. The frontend updates `auth.store`.

User preferences:
1. `bootstrapApp()` initializes `userPreferences.store`.
2. In an authenticated session, the store decodes the user id from the local access token.
3. `services/user/userPreferences.service.ts` requests `/users/:id`.
4. The language and currency returned by the API drive locale and currency in the frontend.

Real financial flow:
- the backend already supports accounts, cards, categories, subcategories, tags, and transactions
- `TransactionService` adjusts account/card balances inside database transactions
- the frontend does not yet expose this business flow; `dashboard` does not implement those screens

### What is well defined

- `route -> controller -> service -> repository` separation in the backend
- error response contract based on `ErrorCode`
- shared i18n between backend and frontend
- centralized HTTP client in the frontend
- storage and navigation abstraction in the frontend
- design system with its own component library in `frontend/src/components`

### What is inconsistent

- authentication is centralized, but ownership-based authorization is not standardized
- `agents.md` requires thin pages and no direct DaisyUI classes; the frontend follows that only partially
- the canonical locale for typing is `en-US`, but the runtime default locale is `pt-BR`
- frontend test coverage is much smaller than the actual app surface

### What appears to be in transition

- the real financial frontend has not yet caught up with the backend scope
- `sandbox` works as living documentation for the design system and as an experimentation area
- `ResourceKey` in `shared/i18n/resource.keys.ts` exists as a compatibility layer for restored/legacy screens
- `dev:frontend:old` and `dev:full:old` point to a missing `frontend_old`

### What needs attention

- authorization and data exposure in the API
- frontend consolidation beyond auth/sandbox
- i18n and encoding fixes
- removal of legacy leftovers and unused dependencies
- real mobile readiness

## 4. Component and module specification

### Backend modules

#### Auth

Main files:
- `backend/src/routes/authRoutes.ts`
- `backend/src/controller/authController.ts`
- `backend/src/service/authService.ts`
- `backend/src/service/tokenService.ts`
- `backend/src/utils/auth/*`

Responsibility:
- login, refresh, logout, email verification, verification resend, and password reset

Dependencies:
- `UserService`
- `TokenService`
- `TokenUtils`
- `cookieConfig`
- `rateLimiter`
- `shared/errors/error-codes.ts`
- `backend/src/utils/email/authEmail.ts`

Usage:
- consumed directly by the current frontend

Reuse level:
- high, because auth is the main implemented flow in the frontend

Notes:
- the access token is returned in the body; the refresh token stays in an httpOnly cookie
- the refresh token is persisted as a hash in the `token` table
- refresh reuse detection exists
- rate limiting is only in memory, by IP/email

#### Users and profile

Main files:
- `backend/src/routes/userRoutes.ts`
- `backend/src/controller/userController.ts`
- `backend/src/service/userService.ts`
- `backend/src/repositories/userRepository.ts`

Responsibility:
- user creation, retrieval, update, deletion, and avatar upload

Dependencies:
- manual validators
- verification transactional email
- FTP for avatars
- `FieldKey`, `ErrorCode`, user and upload enums

Usage:
- signup and preference loading in the frontend

Reuse level:
- high

Notes:
- `getUserById` has an ownership/master check
- `updateUser` and `deleteUser` do not repeat that protection
- `getUsers` and `getUsersByEmail` allow any authenticated user
- avatar upload uses `basic-ftp` and a public URL configured by env

#### Financial catalogs

Main files:
- `account*`
- `category*`
- `subcategory*`
- `creditCard*`
- `tag*`

Responsibility:
- CRUD for entities that classify or group financial movements

Dependencies:
- per-domain repositories
- centralized manual validation in `validateRequest.ts`

Usage:
- the backend is complete in these modules
- the frontend does not yet consume them in business screens

Reuse level:
- medium in the backend, low in the frontend today

Notes:
- `SubcategoryService` already attempts ownership validation on create/update
- that pattern is not clearly generalized across the other modules

#### Transactions

Main files:
- `backend/src/routes/transactionRoutes.ts`
- `backend/src/controller/transactionController.ts`
- `backend/src/service/transactionService.ts`
- `backend/src/repositories/transactionRepository.ts`
- `backend/src/utils/monetary.utils.ts`

Responsibility:
- transaction CRUD and atomic balance maintenance

Dependencies:
- account, credit card, category, subcategory, tag
- `withTransaction()` from the Drizzle client

Usage:
- central financial backend module

Reuse level:
- high in the backend

Notes:
- `TransactionService` computes signed monetary deltas and applies them to account/card balances
- tags are maintained through the `transactions__to__tags` relation table
- create/update/delete operations are transactionally consistent
- the controller does not enforce ownership checks with `req.user.id`

#### Feedback, email, and logs

Main files:
- `backend/src/routes/feedbackRoutes.ts`
- `backend/src/controller/feedbackController.ts`
- `backend/src/service/feedbackService.ts`
- `backend/src/utils/email/feedbackEmail.ts`
- `backend/src/utils/commons.ts`
- `backend/src/service/logService.ts`

Responsibility:
- feedback submission with attachments
- transactional email sending
- console and database logging

Dependencies:
- `Resend`
- `multer`
- `winston`
- `translateAsync()`

Usage:
- feedback and emails are cross-cutting operations

Reuse level:
- medium

Notes:
- feedback accepts image and audio
- the feedback recipient is hardcoded as `FEEDBACK_TO_EMAIL = "fer@bade.digital"`
- logs are persisted to the database except for `DEBUG`

### Frontend modules

#### App shell, bootstrap, and navigation

Main files:
- `frontend/src/main.tsx`
- `frontend/src/bootstrap/app.bootstrap.ts`
- `frontend/src/routes/router.tsx`
- `frontend/src/routes/navigation.ts`
- `frontend/src/routes/guards/requireAuth.tsx`
- `frontend/src/components/layout/app-layout.tsx`

Responsibility:
- boot the app, initialize locale/theme/auth, define routes, and control navigation

Dependencies:
- stores (`auth`, `locale`, `theme`, `userPreferences`)
- `@shared/enums/routes.enums`

Usage:
- global

Reuse level:
- high

Notes:
- public routes: login, signup, verify-email, forgot-password, reset-password
- protected routes: dashboard and sandbox
- fallback goes to `LoginPage`

#### Frontend auth

Main files:
- `frontend/src/pages/login/*`
- `frontend/src/pages/signup/*`
- `frontend/src/pages/verify-email/*`
- `frontend/src/pages/forgot-password/*`
- `frontend/src/pages/reset-password/*`
- `frontend/src/services/auth/auth.service.ts`
- `frontend/src/api/auth/auth.api.ts`

Responsibility:
- auth forms, error messaging, API calls, and authenticated state updates

Dependencies:
- `httpClient`
- `auth.store`
- `errorCodeMap`
- shared i18n

Usage:
- the main implemented frontend flow

Reuse level:
- high

Notes:
- services translate `ErrorCode` into `I18nKey`
- `fieldErrors` are derived from backend validation payloads
- pages use controllers, not the API directly

#### State, preferences, and platform

Main files:
- `frontend/src/state/auth.store.ts`
- `frontend/src/state/userPreferences.store.ts`
- `frontend/src/state/theme.store.ts`
- `frontend/src/platform/storage/*`
- `frontend/src/platform/network/network.ts`
- `frontend/src/platform/backButton/backButton.ts`
- `frontend/src/platform/isNative.ts`

Responsibility:
- local auth
- language/currency/theme
- storage and platform events

Dependencies:
- `@shared/enums/storage.enums`
- `@shared/enums/user.enums`
- `services/user/userPreferences.service.ts`

Usage:
- cross-cutting

Reuse level:
- high

Notes:
- stores are custom listener-based stores; there is no Redux/Zustand
- `auth.store` persists the access token in platform storage
- `userPreferences.store` reconciles preferences with the API after login
- `isNative()` always returns `false`
- `backButton` is currently only a handler registry, with no real integration

#### Component library

Main groups in `frontend/src/components/`:
- forms: `input`, `select`, `checkbox`, `form`, `form-grid`, `password-input`
- actions: `button`
- layout/surfaces: `card`, `page-container`, `layout`, `fieldset`
- feedback/state: `alert`, `toast`, `loader`, `empty-state`, `error-state`, `status`, `tooltip`, `modal`
- data: `table`, `data-table`, `pagination`, `filter-bar`
- composition: `accordion`, `collapse`, `bullets`, `auth-shell`

Responsibility:
- compose an internal UI kit using Tailwind and DaisyUI as the styling layer

Dependencies:
- UI and icon enums in `shared/enums/*`
- i18n helpers

Usage:
- auth pages, dashboard, and sandbox

Reuse level:
- high, especially `Button`, `Input`, `Card`, `AuthShell`, `Modal`, and `DataTable`

Notes:
- DaisyUI is used as styling, not as an off-the-shelf component library
- `sandbox` functions as a living catalog for this UI kit

#### Sandbox and dashboard

Main files:
- `frontend/src/pages/sandbox/*`
- `frontend/src/pages/dashboard/*`

Responsibility:
- `sandbox`: internal demonstration of components, states, and utilities
- `dashboard`: minimal placeholder

Usage:
- both require auth

Reuse level:
- low as product surface, high as internal reference

Notes:
- `sandbox` contains a lot of hardcoded text and many direct utility classes
- `dashboard` does not currently reflect the backend financial domain; it only toggles theme and navigates

### Shared modules

#### Domain contracts

Directories:
- `shared/domains/account`
- `shared/domains/auth`
- `shared/domains/category`
- `shared/domains/creditCard`
- `shared/domains/feedback`
- `shared/domains/phone`
- `shared/domains/subcategory`
- `shared/domains/tag`
- `shared/domains/transaction`
- `shared/domains/user`

Responsibility:
- types consumed by backend and frontend

Notes:
- `shared` does not contain database schema; only application contracts

#### Enums, errors, and fields

Core files:
- `shared/enums/*.ts`
- `shared/errors/error-codes.ts`
- `shared/errors/error-payload.ts`
- `shared/fields/field-keys.ts`
- `shared/fields/field-label-map.ts`

Responsibility:
- standardize critical identifiers
- support `ErrorCode -> I18nKey` mapping
- support field labels for validation messages

## 5. Backend structure

### Entrypoint and framework

- main framework: `Express`
- entrypoint: `backend/src/server.ts`
- bootstrap:
  - `dotenv.config()`
  - manual CORS from `CORS_ORIGINS`
  - `requestTimer()`
  - `express.json()`
  - `cookieParser()`
  - locale middleware via `Accept-Language`

### Existing routes

Route files:
- `authRoutes.ts`
- `userRoutes.ts`
- `accountRoutes.ts`
- `creditCardRoutes.ts`
- `categoryRoutes.ts`
- `subcategoryRoutes.ts`
- `tagRoutes.ts`
- `transactionRoutes.ts`
- `feedbackRoutes.ts`

Real current state:
- auth has endpoints for login/refresh/logout/verify-email/resend-verification/forgot-password/reset-password
- financial modules expose CRUD and filtered listings by user/account/category id
- feedback accepts `POST /feedback`

### Controllers

Observed pattern:
- validate params/body
- call services
- register logs
- respond through `answerAPI()`

Strengths:
- consistent pattern across modules
- uniform response shape

Weaknesses:
- a lot of repeated boilerplate in route/controller layers
- authorization is not centralized consistently

### Services

Existing services:
- `accountService.ts`
- `authService.ts`
- `categoryService.ts`
- `creditCardService.ts`
- `feedbackService.ts`
- `logService.ts`
- `subcategoryService.ts`
- `tagService.ts`
- `tokenService.ts`
- `transactionService.ts`
- `userService.ts`

Observed pattern:
- classes instantiate dependencies directly
- there is no dependency injection container
- services accumulate business rules and small serialization responsibilities

Important examples:
- `AuthService` centralizes token rotation and email flows
- `TransactionService` centralizes monetary rules and balance consistency
- `UserService` centralizes creation, hashing, avatar FTP, and email verification

### Repositories

Existing repositories:
- `accountRepository.ts`
- `categoryRepository.ts`
- `creditCardRepository.ts`
- `logRepository.ts`
- `subcategoryRepository.ts`
- `tagRepository.ts`
- `tokenRepository.ts`
- `transactionRepository.ts`
- `userRepository.ts`

Responsibility:
- encapsulate Drizzle/MySQL query logic

Note:
- repositories are organized by aggregate, with no extra ORM abstraction layer on top

### Models, schema, and persistence

Real database:
- MySQL via `mysql2/promise`
- ORM/query builder: `drizzle-orm`

Core files:
- `backend/src/db/client.ts`
- `backend/src/db/schema/*.ts`
- `backend/src/db/schema/relations.ts`
- `backend/drizzle/*.sql`

Observed tables:
- `user`
- `account`
- `credit_card`
- `category`
- `subcategory`
- `tag`
- `transaction`
- `transactions__to__tags`
- `token`
- `log`

Notes:
- Drizzle relations are in place
- `withTransaction()` casts the `tx` object to `typeof db` to work around typing incompatibility; this works today, but it is an acknowledged workaround in the file’s own comment

### Validation

HTTP and domain validation:
- mainly centralized in `backend/src/utils/validation/validateRequest.ts`
- helpers in `backend/src/utils/validation/errors.ts` and `guards.ts`

Characteristics:
- manual validation, with no Zod/Joi in runtime use
- returns typed error arrays with `field`, `errorCode`, and `params`
- many rules for currency, enums, required fields, ranges, and coercions are concentrated in a single large file

### Authentication and authorization

Authentication:
- JWT access token in bearer header
- refresh token in httpOnly `refreshToken` cookie
- refresh token persisted in the database via hash
- `verifyToken` middleware populates `req.user`

Authorization:
- inconsistent
- `userController.getUserById()` compares `req.user` against the requested resource
- `userController.updateUser()` and `deleteUser()` do not repeat that check
- `AccountController` and `TransactionController` accept authenticated requests without comparing ownership to `req.user.id`
- `SubcategoryService` already includes part of that validation on create/update

Conclusion:
- authn is centralized
- authz is partial and is currently one of the main backend risks

### Error handling

Real pattern:
- `answerAPI()` and `sendErrorResponse()` standardize responses
- success returns `success: true` and `data`
- errors return `success: false`, `errorCode`, and optionally `error`, `params`, `field`
- `server.ts` handles invalid JSON as `INVALID_JSON`

Note:
- paginated responses flatten `page`, `pageSize`, `pageCount`, and `totalItems` at the root

### Middlewares

Observed:
- custom CORS
- `requestTimer()`
- `express.json()`
- `cookieParser()`
- locale middleware
- `verifyToken`
- `rateLimitLogin`
- `rateLimitRefresh`
- upload parsing via `multer`
- upload error normalization

### External integrations

Observed:
- MySQL
- Resend for email
- FTP for avatars

Not observed:
- queues
- cron jobs
- analytics providers
- external monitoring
- webhooks

### Configuration

Configuration mainly comes from env vars:
- database
- JWT
- CORS
- frontend base URL
- Resend
- FTP

Not found:
- structured env validation
- a single strongly typed config module for the entire backend

### Logs

Observed:
- console logger with `winston`
- database persistence through `LogService`
- `DEBUG` logs go to the console, but are not necessarily persisted

Gaps:
- `winston-daily-rotate-file` is in `package.json` but does not appear to be used in the source
- there is no formal observability pipeline

### Jobs, queues, and cron

No code was found for:
- workers
- cron
- queues
- scheduler

There is cleanup logic such as `deleteLogsOlderThanDays`, but no automatic process was found executing it.

### Recurring patterns

- controllers and routes with repeated boilerplate
- services returning union types `{ success: true } | { success: false }`
- repositories per entity
- responses based on `ErrorCode`
- centralized manual validation

### Relevant technical gaps

- partial authorization
- unused backend dependencies (`express-session`, `translation-check`, `winston-daily-rotate-file`)
- absence of CI/CD and env validation
- rate limiting only in memory

## 6. Frontend structure

### Main stack

- `Preact`
- `Vite`
- `TypeScript` strict mode
- `wouter-preact`
- `TailwindCSS`
- `DaisyUI`
- `Vitest`

### Bootstrap

Core file:
- `frontend/src/bootstrap/app.bootstrap.ts`

The real bootstrap does:
- initialize `userPreferences.store`
- preload the current locale catalog
- subscribe to locale changes to keep catalogs loaded
- initialize theme
- initialize auth/refresh integration
- update `document.title`

### Routing

Core files:
- `frontend/src/routes/router.tsx`
- `frontend/src/routes/navigation.ts`
- `frontend/src/routes/guards/requireAuth.tsx`

Observed state:
- uses History API via `wouter-preact`
- navigates through a centralized helper, not via `window.location`
- `dashboard` and `sandbox` are protected

### Pages and controllers

Existing pages:
- `dashboard`
- `forgot-password`
- `login`
- `reset-password`
- `sandbox`
- `signup`
- `verify-email`

Notes:
- all current pages have a corresponding controller
- pages call services or navigation, not the API directly
- no `fetch()` was found outside `src/api/http/httpClient.ts`

### API layer

Core files:
- `frontend/src/api/http/httpClient.ts`
- `frontend/src/api/auth/auth.api.ts`
- `frontend/src/api/users/users.api.ts`

Real `httpClient` behavior:
- adds `Accept-Language`
- adds bearer token when present
- sends `credentials: include`
- performs exponential retry on GET requests for 5xx and network errors
- handles `401` with a single refresh flow and request replay
- expires the session and redirects to login when refresh fails

### Services

Current services:
- `services/auth/auth.service.ts`
- `services/user/userPreferences.service.ts`

Notes:
- `auth.service` centralizes auth, translatable errors, and refresh wiring
- `userPreferences.service` consumes `/users/:id` for language/currency
- the service surface is still small, which is coherent with the frontend currently having limited scope

### State management

Current stores:
- `auth.store.ts`
- `locale.store.ts`
- `theme.store.ts`
- `toast.store.ts`
- `userPreferences.store.ts`

Observed pattern:
- manual store with listener set/unsubscribe
- no Redux, MobX, Zustand, or similar

Relevant points:
- `auth.store` persists the access token in storage
- `theme.store` applies `data-theme` to the document
- `userPreferences.store` reconciles with the API after authentication

### Platform abstraction

The structure required by `agents.md` exists:

```text
frontend/src/platform/
|-- storage/
|-- network/
|-- backButton/
`-- isNative.ts
```

Real current state:
- `storage` is operational
- `network` uses `navigator.onLine` and web listeners
- `backButton` only registers/removes handlers
- `isNative()` always returns `false`

Conclusion:
- the abstraction exists
- functional coverage for a native runtime is still early-stage

### Components and design system

Real current state:
- there is an internal component library in `src/components`
- `global.css` defines fonts, typographic utilities, and custom effects
- DaisyUI is used as a styling layer, but several pages still apply utility classes directly

### Assets and config

Assets:
- images, logos, flags, and fonts come mostly from `shared/assets`

Config:
- `frontend/src/config/env.ts` reads `VITE_API_BASE_URL`
- Vite allows access to the parent dir to import `shared`

### Real composition conventions

The frontend follows several `agents.md` directives:
- pages use controllers
- services call the API
- the API uses a centralized HTTP client
- navigation is centralized
- storage stays in the platform layer

But it does not follow everything:
- pages still contain a lot of markup and utility classes
- `sandbox` is intentionally outside the hardcoded-text discipline
- `dashboard` still does not materialize the backend financial domain

### How closely the frontend follows `agents.md`

Strong adherence:
- `Preact`, `Vite`, strict `TS`, `Tailwind`, `DaisyUI`, History API router
- `src/platform/` exists
- `pages` do not call the API directly
- `fetch()` is centralized
- `localStorage/sessionStorage` are restricted to the platform layer
- `src/shared/` does not exist inside the frontend

Partial adherence:
- the backend mental-model mirroring exists, but the real app is still concentrated around auth + sandbox
- pages are relatively thin in terms of flow, but still carry a lot of layout and local state
- the design system exists, but pages still apply DaisyUI/Tailwind classes directly

Not adherent today:
- total prohibition of DaisyUI classes in `src/pages/**`
- total prohibition of hardcoded text across the entire UI, because of the sandbox

## 7. Shared: enums, contracts, DTOs, types, and everything shared

### What exists in `shared/`

Subfolders:
- `assets/`
- `domains/`
- `enums/`
- `errors/`
- `fields/`
- `i18n/`
- `types/`

### Enums and identifiers

`shared/enums/` covers:
- account
- auth
- category
- country
- creditCard
- email
- filter
- http / http-status
- icon / icon-position
- input / input-validation
- language
- log
- operator
- routes
- server
- storage
- theme
- transaction
- ui
- upload
- user

Note:
- many critical identifiers are typed as runtime enums
- `ErrorCode` and `FieldKey` use `as const` objects, not `enum`, which aligns better with contract and i18n usage

### Domain types and contracts

`shared/domains/` centralizes contracts consumed by both sides:
- auth types for login/refresh/logout/verify/reset
- user types for create/update/entity
- account/category/creditCard/tag/subcategory/transaction
- feedback
- phone metadata and options

### Errors and payloads

Core files:
- `shared/errors/error-codes.ts`
- `shared/errors/error-payload.ts`

Usage:
- the backend responds with `ErrorCode`
- the frontend translates `ErrorCode` into `I18nKey`

This is a critical system contract.

### Fields

Core files:
- `shared/fields/field-keys.ts`
- `shared/fields/field-label-map.ts`

Usage:
- backend validation
- field-label i18n
- frontend UI

The `Record<FieldKey, I18nKey>` mapping is implemented as expected.

### Utility types

Relevant files:
- `shared/types/format.types.ts`
- `shared/types/pagination.types.ts`

Usage:
- ISO dates
- monetary values in canonical string form
- pagination contracts

### Shared assets

Observed in `shared/assets/`:
- product logos
- Google logo
- login/brand images
- flags
- fonts used by the frontend

### Boundary of what belongs in `shared`

Today `shared` contains:
- common identifiers
- cross-layer traffic contracts
- i18n
- reusable assets

Today `shared` does not contain:
- database schema
- repositories
- backend services
- frontend HTTP client
- frontend stores

### Areas depending on `shared`

- the entire backend for enums, types, and i18n
- the entire frontend for contracts, routes, UI enums, assets, and i18n

### What is well defined

- `ErrorCode`
- `FieldKey`
- route enums
- auth/user/transaction domain contracts
- shared assets

### What needs review

- `shared` is still not its own package/workspace
- the `ResourceKey` compatibility layer suggests legacy leftovers
- the shared surface is broad; without a package boundary, coupling is easy

### Duplication or duplication risk

Main risk:
- because `shared` is not a separate package, it is easy to mix application contract with local convenience
- `ResourceKey` conceptually duplicates typed key access, even though it serves a compatibility role

## 8. Internationalization system

### Real structure

The layout documented in `agents.md` exists almost entirely:

```text
shared/i18n/
|-- locales/
|   |-- en-US/
|   |-- pt-BR/
|   `-- es-ES/
|-- mappings/error-code-map.ts
|-- types/
|-- resource.keys.ts
`-- translate.ts
```

Observed files per locale:
- `ui.ts`
- `errors.ts`
- `email.ts`

### Supported languages

Supported today:
- `en-US`
- `pt-BR`
- `es-ES`

### Canonical locale and typing

The code confirms:
- `I18nCatalog` is derived from the `en-US` catalog
- `I18nKey = keyof I18nCatalog`
- `pt-BR` and `es-ES` use `satisfies` against canonical types

Important divergence:
- the runtime default locale in `shared/i18n/types/locale.ts` is `Language.PT_BR`, not `en-US`

### Translation loading

In `shared/i18n/translate.ts`:
- `pt-BR` is preloaded by default
- `en-US` and `es-ES` are lazy-loaded through dynamic import
- `preloadLocaleCatalog()` loads and caches catalogs by locale

In the frontend:
- `bootstrapApp()` preloads the active locale before mounting the app
- locale changes trigger additional preloading

### Fallback strategy

Real fallback behavior:
- `resolveLocale()` falls back to `DEFAULT_LOCALE`
- if the requested locale has not been loaded yet and is not the default, `translate()` uses the already loaded default catalog and triggers async preload

In practice:
- the operational fallback today is `pt-BR`

### Frontend usage

- `frontend/src/utils/i18n/translate.ts` wraps `translate()`
- auth pages use `I18nKey`
- components accept `label`, `message`, `title`, `placeholder`, and similar props as i18n keys

### Backend usage

Observed usage:
- transactional emails (`authEmail.ts`, `feedbackEmail.ts`)
- request-locale resolution via `Accept-Language`

Not observed:
- the backend does not return localized text as the primary API contract

### Error mapping and field labels

Core files:
- `shared/i18n/mappings/error-code-map.ts`
- `shared/fields/field-label-map.ts`

Real flow:
- the backend returns `errorCode`, `params`, and `field`
- the frontend translates locally
- `translate()` can also translate `path` and `field` params when they are `FieldKey`

### Emails and notifications

Existing today:
- account verification email
- password reset email
- feedback email

All of them use `translateAsync()` and `email.ts` catalogs.

### Enforcement against hardcoded text

Real enforcement exists in `frontend/eslint.config.mjs`:
- forbids `JSXText`
- forbids string literals in user-visible props
- applies to `src/pages/**/*.tsx` and `src/components/**/*.tsx`

Explicit exception:
- `src/pages/sandbox/**/*.tsx` disables that restriction

Conclusion:
- enforcement exists, but it is not absolute

### Differences between the documented rule and the real implementation

- canonical typing based on `en-US`: yes
- runtime default locale: no, today it is `pt-BR`
- no hardcoded text: partial, because of the sandbox
- locale-level lazy loading: yes

### Observed fragilities

- several texts in `shared/i18n/locales/*/ui.ts` show mojibake/encoding corruption in the source as read today
- `ResourceKey` in `shared/i18n/resource.keys.ts` exists as a legacy/compatibility layer and is used by the sandbox

## 9. Plugins, integrations, and tooling

### Monorepo and build tooling

Root:
- `npm workspaces`
- `concurrently` to run backend and frontend together

Backend:
- TypeScript
- `ts-node`
- `nodemon`
- `drizzle-kit`

Frontend:
- `vite`
- `@preact/preset-vite`
- `tailwindcss`
- `daisyui`

### External integrations

Backend:
- MySQL
- Resend
- FTP

Frontend:
- no third-party analytics integration, real social auth, or external storage provider was found

### Plugins and extensions

Found:
- Vite plugin: only `@preact/preset-vite`
- Tailwind plugin: `daisyui`

Not found:
- internal product plugin system
- dynamically loaded extension modules
- plugin marketplace

### Lint, format, and typecheck

Backend:
- `eslint.config.mjs`
- `tsc --noEmit`

Frontend:
- `eslint.config.mjs` with architectural and i18n rules
- `tsc --noEmit -p tsconfig.app.json`

Note:
- `eslint-config-prettier` exists, but no Prettier config file or dedicated format script was found

### Tests

Backend:
- `jest`

Frontend:
- `vitest`
- `@vitest/coverage-v8`
- `jsdom` is installed, but the default config environment is `node`

### Automation and scripts

Useful root scripts:
- `dev`, `dev:backend`, `dev:frontend`, `dev:full`
- `db:migrate`, `db:sync`
- `seed`, `seed:10`, `seed:100`, `seed:1000`
- `lint`, `typecheck`, `build`, `test`, `test:coverage`

Notes:
- `dev:frontend:old` and `dev:full:old` reference `frontend_old`, but that folder does not exist
- `README.md` still mentions `mobile/` and legacy scripts

### Husky, lint-staged, hooks

Not found:
- `.husky/`
- `lint-staged`
- commit hooks

### CI/CD

The repository does not contain:
- `.github/workflows/`
- CI pipelines
- deploy scripts
- container manifests

### Monitoring and analytics

Not found:
- Sentry
- Datadog
- Prometheus
- Mixpanel
- GA
- PostHog

### Dependencies that look leftover or legacy

Observed by searching the source:
- `backend/package.json` includes `express-session`, `translation-check`, and `winston-daily-rotate-file`, but no usage was found in the code
- `frontend/package.json` includes `drizzle-kit`, but no usage was found in the frontend
- `frontend/package.json` includes `zinero: file:..`, but the source uses `@` and `@shared`

## 10. Existing test suite

### State validated locally

Commands executed successfully:
- `npm test`
- `npm run lint`
- `npm run typecheck`

Result of `npm test` during this analysis:
- backend: `51` suites, `858` tests
- frontend: `12` executed files, `79` tests

### Backend

Framework:
- `Jest`

Structure:

```text
backend/tests/
|-- helpers/
|-- integration/
`-- unit/
    |-- controllers/
    |-- repositories/
    |-- routes/
    |-- services/
    `-- utils/
```

What exists:
- unit tests for controllers, services, repositories, routes, and utils
- `1` integration test in `tests/integration/userProfileRoutes.test.ts`

Documented conventions:
- `backend/tests/README.md`
- shared mocks and factories in `tests/helpers`

Coverage/config:
- modest global thresholds in `backend/jest.config.js` (`40/30/40/40`)
- `db`, `routes`, `server`, `dev`, and `index.ts` are excluded from coverage collection

Maturity:
- the backend is reasonably well tested for services/controllers/utils
- there is still no real end-to-end coverage with database and external integrations

### Frontend

Framework:
- `Vitest`

Structure:

```text
frontend/tests/
|-- helpers/
|-- mocks/
`-- unit/
    |-- architecture/
    |-- components/
    |-- intl/
    |-- pages/
    |-- services/
    `-- state/
```

What exists:
- architecture tests
- intl utility tests
- auth page controller tests
- `auth.service` tests
- preference store tests
- a `button` component test

Important config gap:
- there are `13` test files (`.test.ts` and `.test.tsx`)
- `frontend/vitest.config.ts` includes only `tests/unit/**/*.test.ts`
- because of that, `tests/unit/components/button.test.tsx` is not part of the default `npm test` run

Coverage/config:
- default Vitest environment is `node`
- coverage includes only `src/utils/intl/**/*.ts` and `src/state/userPreferences.store.ts`
- threshold is `80%`, but over a deliberately small scope

Maturity:
- the frontend shows good discipline for utilities and the current auth flow
- there are no e2e tests, no end-to-end routing tests, no visual tests, and no meaningful coverage for pages/components UI

### What is covered

- backend auth
- backend validations and utilities
- several backend services and repositories
- frontend intl
- frontend stores
- frontend login/signup controllers

### What is undertested

- backend authorization
- frontend visual components
- `httpClient` and refresh flows across varied scenarios
- `sandbox`
- `dashboard`

### What has no observable tests

- CI test pipeline
- real product e2e
- contract tests between frontend and backend
- FTP/Resend tests against a real sandbox environment

## 11. The mobile app does not exist yet, but it should influence the architecture

### Current state

There is no mobile app in the repository today.

This needs to be explicit:
- there is no `mobile/` package
- Capacitor is not installed
- there are no native plugins
- `isNative()` always returns `false`

### What already helps a future app expansion

- `shared/` centralizes contracts, enums, i18n, and assets
- the frontend already has `src/platform/storage`, `src/platform/network`, `src/platform/backButton`, and `src/platform/isNative.ts`
- `httpClient` is centralized
- navigation is centralized
- pages do not call the API directly

### What still makes the architecture web-only

Direct web API usage outside `platform/`:
- `document` in bootstrap, modal, form, theme store, and userPreferences store
- `navigator` in `network.ts` and `userPreferences.store`
- `window` in storage/network
- `atob` for JWT decoding in `userPreferences.store`

Impact:
- the platform abstraction exists, but the app is not yet fully isolated from browser APIs

### What would need adjustment for a future app layer

Without proposing implementation now, the attention points are:
- push more `document/window/navigator` access into adapters
- give `backButton` real semantics
- replace fixed `isNative()` with runtime detection
- review components that manipulate the DOM directly, such as `Modal` and `PhoneInput`

### Decisions worth preserving

- keep `platform/` as the boundary
- keep `navigation.ts` centralized
- keep a single `httpClient`
- keep `shared/` as the source of contracts and i18n
- keep preventing direct `fetch()` and direct storage access in pages

Conclusion:
- the current architecture helps a future mobile expansion
- readiness is partial, not complete

## 12. Divergences between the guideline and the real implementation

| Guideline in `agents.md` | Real observed state | Status |
|---|---|---|
| Monorepo with `backend/`, `frontend/`, `shared/` | Structurally yes, but only `backend` and `frontend` are npm workspaces; `shared` is a common folder | Partial |
| Future mobile should influence the architecture | `src/platform/` exists, but there is no mobile app or native runtime | Partial |
| Do not install Capacitor now | Capacitor is not present in the repo | Adherent |
| All native integration must go through `src/platform/` | The boundary exists, but there are still several direct DOM/browser accesses outside it | Partial |
| Pages must not call the API directly | Current pages use controllers/services; no API imports were found in pages | Adherent |
| Do not use `fetch()` outside `src/api/http/httpClient.ts` | Source search confirms only one frontend `fetch()`, inside `httpClient` | Adherent |
| Do not use `localStorage/sessionStorage` outside the platform layer | Source search confirms usage only in `platform/storage` | Adherent |
| DaisyUI is styling only; do not use DaisyUI classes directly in `src/pages/**` | Pages such as `login.tsx`, `signup.tsx`, `verify-email.tsx`, `dashboard.tsx`, and `sandbox.tsx` apply utility classes directly | Divergent |
| Pages must use components such as `<Button />`, `<Card />`, `<Input />` | This happens in many pages, but together with direct markup and classes | Partial |
| Frontend should conceptually mirror the backend | The `pages/controllers/services/api/state/routes` structure exists and works | Adherent in structure, partial in maturity |
| No user-visible hardcoded text | ESLint tries to enforce this, but `sandbox` is an explicit exception and contains a lot of fixed text | Partial |
| i18n keys must not use runtime enums | `I18nKey` is derived from the catalog, not from an enum | Adherent |
| Canonical locale for key derivation is `en-US` | Typing is derived from `en-US`, but the runtime default locale is `pt-BR` | Partial |
| Locale files must follow `locales/<locale>/ui.ts|errors.ts|email.ts` | The structure exists in all three languages | Adherent |
| Backend must return `ErrorCode`, not localized text | The API follows this contract | Adherent |
| Frontend maps `ErrorCode -> I18nKey` locally | `auth.service` and `shared/i18n/mappings/error-code-map.ts` do this | Adherent |
| `frontend/src/shared/` is forbidden | There is no `src/shared/` in the frontend | Adherent |
| JSDoc on exported functions in services/api/platform/state | Most sampled files follow this, but no automatic enforcement was found | Partial |

## 13. Risks, technical debt, and attention points

### 1. Inconsistent backend authorization

Evidence:
- `verifyToken` authenticates, but ownership is not applied uniformly
- `getUsers`, `getUsersByEmail`, `getAccounts`, `getTransactions`, and operations by `:id` accept authenticated users without control equivalent to `getUserById`
- `updateUser` and `deleteUser` do not repeat the guard that exists in `getUserById`

Impact:
- real risk of improper data exposure or mutation across users

### 2. Backend surface is larger than the current frontend

The backend covers several financial modules, but the delivered frontend is currently concentrated on auth, sandbox, and a placeholder dashboard.

Impact:
- mismatch between API capability and the available web experience

### 3. `shared/` has no package boundary of its own

Today `shared` is a common folder, not a workspace/public package.

Impact:
- high coupling
- fragile imports
- easier architectural drift

### 4. Scripts and documentation still contain legacy leftovers

Evidence:
- `dev:frontend:old` and `dev:full:old` point to a non-existent `frontend_old`
- `README.md` mentions `mobile/`, which does not exist

Impact:
- more confusing onboarding
- risk of incorrect instructions

### 5. Frontend suite has a real execution gap

Evidence:
- `button.test.tsx` exists
- `vitest.config.ts` includes only `.test.ts`

Impact:
- part of the suite is outside `npm test`

### 6. i18n has a default mismatch and encoding issues

Evidence:
- the canonical type source is `en-US`, but the runtime default is `pt-BR`
- strings with broken encoding appear in `ui.ts` catalogs

Impact:
- conceptual confusion risk
- poor text quality in runtime/build depending on actual environment encoding behavior

### 7. Unused dependencies

Evidence from source search:
- backend: `express-session`, `translation-check`, `winston-daily-rotate-file`
- frontend: `drizzle-kit`
- frontend: `zinero: file:..` dependency does not appear in the source

Impact:
- noisier maintenance
- unnecessary dependency surface

### 8. Rate limiting and auth resilience are still simple

Evidence:
- `rateLimiter.ts` uses in-memory `Map`

Impact:
- does not scale across multiple instances
- loses state on restart

### 9. Mobile readiness is still partial

Evidence:
- abstractions exist
- DOM/browser APIs still appear outside `platform/`

Impact:
- future app migration will require real refactoring, not just adapter swaps

### 10. Lack of operational automation

Not found:
- CI/CD
- local hooks
- structured observability
- centralized env validation

Impact:
- quality depends heavily on local manual discipline

### 11. Operational hardcode in feedback flow

Evidence:
- fixed recipient `fer@bade.digital` in `backend/src/utils/email/feedbackEmail.ts`

Impact:
- low operational flexibility
- sensitive configuration embedded in code

### 12. Monolithic backend validation

Evidence:
- `validateRequest.ts` concentrates a large amount of rules for many domains

Impact:
- harder maintenance
- a file that will tend to keep growing

## 14. Final executive summary

Today the project is an npm monorepo with a relatively mature Express/Drizzle backend, a strong `shared/` layer for contracts and i18n, and a well-structured Preact frontend that is still functionally concentrated on authentication, bootstrap, and a UI kit/sandbox.

The current architectural pillars are:
- shared contracts in `shared/`
- backend organized as `routes/controller/service/repository`
- frontend organized as `pages/controllers/services/api/state/platform/components`
- shared i18n with `ErrorCode -> I18nKey`
- centralized HTTP client and navigation

Current maturity:
- backend: medium to high for the implemented scope
- shared: strong as a contract layer, weak as an isolated package
- frontend: good structural base, low functional coverage of the financial domain

Preparedness for evolution:
- good for preserving architectural coherence
- partial for a future app/mobile layer
- fragile around backend authorization, automation, and operational rigor

Natural care points to preserve coherence:
- close the authorization gaps
- align the frontend with the real API surface
- fix i18n/encoding and legacy leftovers
- keep `platform/`, `navigation`, and `httpClient` as mandatory boundaries
- decide whether `shared/` will remain a common folder or should become a real monorepo package
