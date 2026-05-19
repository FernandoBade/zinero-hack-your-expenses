<div align="center">
  <img src="shared/assets/images/ZINERO by Badixy_transparent_vertical.png" alt="Zinero" width="320" />
</div>

# Zinero

Zinero is a TypeScript monorepo for a personal finance product focused on
turning transactions into structured financial understanding.

## Current status

- `backend/` is the most mature part of the repository. It currently provides
  authentication, users, accounts, credit cards, categories, subcategories,
  tags, transactions, feedback, logging, and MySQL persistence through Drizzle.
- `frontend/` currently covers authentication, bootstrap, shared UI
  foundations, state, i18n, a `sandbox` page, and a placeholder `dashboard`.
  Financial product screens are not implemented yet.
- `shared/` centralizes cross-layer contracts, enums, field keys, error codes,
  i18n, and reusable assets.
- There is no `mobile/` package, no checked-in CI/CD pipeline, and no
  deployment setup in the repository today.


## Governance

The authoritative governance source for this repository lives in `.claude/skills/`.

Use the relevant skill file for execution standards and ownership boundaries:

- [`.claude/skills/staff-architecture/SKILL.md`](.claude/skills/staff-architecture/SKILL.md)
- [`.claude/skills/staff-backend/SKILL.md`](.claude/skills/staff-backend/SKILL.md)
- [`.claude/skills/staff-frontend/SKILL.md`](.claude/skills/staff-frontend/SKILL.md)
- [`.claude/skills/staff-design-system/SKILL.md`](.claude/skills/staff-design-system/SKILL.md)
- [`.claude/skills/staff-ux-writing/SKILL.md`](.claude/skills/staff-ux-writing/SKILL.md)
- [`.claude/skills/staff-qa/SKILL.md`](.claude/skills/staff-qa/SKILL.md)
- [`.claude/skills/staff-product/SKILL.md`](.claude/skills/staff-product/SKILL.md)

[`agents.md`](agents.md) and this `README.md` are secondary orientation
documents. When documentation and code differ, the code is the source of truth.
When documentation and the governance model differ, follow the relevant skill
file.

## Repository structure

```text
.
|-- backend/
|-- frontend/
|-- shared/
|-- .claude/
|-- agents.md
|-- README.md
`-- package.json
```

Notes:

- The root workspaces are `backend` and `frontend`.
- `shared/` is a common folder used by both applications, not a separate npm
  workspace.
- `.claude/skills/` contains the current governance model for architecture, backend,
  frontend, design system, UX writing, QA, and product definition.

## Architecture snapshot

```text
frontend (Preact + Vite)
  -> api/http/httpClient.ts
  -> backend REST API (Express)
  -> controllers -> services -> repositories -> MySQL/Drizzle
  <- standardized ErrorCode-based responses

shared/
  -> domain contracts, enums, fields, i18n, assets
```

Backend conventions today:

- Ownership-sensitive endpoints use owner-or-`MASTER` checks through
  `canAccessOwnedResource()` and `canAccessRequestedUser()`.
- `updateUser` is treated as an identity-sensitive flow: self-service email and
  password changes require `currentPassword`; email changes clear verification
  state and revoke refresh sessions.
- `backend/src/utils/validation/validateRequest.ts` is a compatibility facade.
  Domain validators live in `backend/src/utils/validation/domains/`.

Frontend conventions today:

- Pages use controllers and services instead of calling the API directly.
- All HTTP traffic goes through `frontend/src/api/http/httpClient.ts`.
- The delivered product surface is still auth-first; the financial domain has
  not been surfaced in the frontend yet.

## Getting started

### Prerequisites

- Node.js LTS
- npm
- MySQL

### Install dependencies

```bash
npm install
```

### Configure environment variables

Backend runtime configuration lives in `backend/.env`.

Common backend keys:

- `PORT`, `NODE_ENV`, `CORS_ORIGINS`
- `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_DATABASE`
- `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`
- `JWT_ISSUER`, `JWT_AUDIENCE`
- `FRONTEND_BASE_URL`
- `RESEND_API_KEY`, `RESEND_FROM_EMAIL`
- `FTP_HOST`, `FTP_PORT`, `FTP_USER`, `FTP_PASSWORD`, `FTP_UPLOAD_PATH`
- `AVATAR_PUBLIC_BASE_URL`

Frontend runtime configuration lives in `frontend/.env.development` and
`frontend/.env.production`.

Required frontend key:

- `VITE_API_BASE_URL`

### Run the current local stack

```bash
npm run dev
```

This runs backend migrations, starts the API, and starts the current frontend.

## Supported root commands

Current supported workflows:

- `npm run dev`
- `npm run dev:backend`
- `npm run dev:frontend`
- `npm run db:migrate`
- `npm run db:sync`
- `npm run seed`
- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`

Those commands depend on a missing `frontend_old/` directory and are not part
of the current supported workflow.

## Current direction

Current reality:

- The backend is stable enough to serve as the foundation for future financial
  frontend work.
- The frontend is still in an auth/bootstrap/design-system stage.
- Operational hardening and CI/CD are still future work, not current repository
  capabilities.

Near-term direction:

- Expand the financial frontend on top of the current backend surface.
- Keep documentation aligned with code and the governance skills.
- Continue improving operational maturity without over-engineering the
  monorepo.

## License

This project is licensed under the Zinero Non-Commercial License. See
[`LICENCE`](LICENCE).
