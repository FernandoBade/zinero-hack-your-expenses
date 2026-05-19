# Zinero — Repository Overview

Zinero is a personal finance platform built with an Express backend and a Preact frontend, TypeScript throughout.

## Workspace layout

```
.
├── backend/      Express + Drizzle ORM + MySQL — API, business logic, auth
├── frontend/     Preact + Vite + Tailwind CSS + DaisyUI — web UI
├── shared/       Cross-layer contracts: enums, types, errors, i18n, domains, assets
├── skills/       Agent governance — role-based SKILL.md files
└── package.json  npm workspaces: ["backend", "frontend"] only
```

`shared/` is a **common folder**, not a separate npm workspace. Backend imports it via relative paths; frontend imports it via the `@shared/*` alias.

## Navigate by segment

| Where you're working | Read first |
|---|---|
| `backend/` | [backend/CLAUDE.md](backend/CLAUDE.md) |
| `frontend/` | [frontend/CLAUDE.md](frontend/CLAUDE.md) |
| `shared/` | [shared/CLAUDE.md](shared/CLAUDE.md) |
| Choosing the right skill | [skills/index.md](skills/index.md) |

## Key cross-cutting rules

1. **Shared contracts first** — use `shared/` enums, types, error codes, field keys, and i18n keys. Never duplicate locally.
2. **English identifiers everywhere** — all method names, variable names, and identifiers must be in English.
3. **No floating-point monetary arithmetic** — monetary values are always `MonetaryString` (`shared/types/format.types.ts`). All arithmetic in `backend/src/utils/monetary.utils.ts` only.
4. **No hardcoded user-visible strings** — all user-facing text must use `I18nKey` from `@shared/i18n/`. ESLint enforces this in `frontend/src/pages/**` and `frontend/src/components/**`.
5. **Layer boundaries are enforced** — see segment CLAUDE.md files for layer rules. Violations are tracked as known risks in each SKILL.md.
6. **Read the code first** — documentation describes intent; the code is the source of truth. When they diverge, follow the code and update the documentation.

## Product maturity snapshot

| Area | Status |
|---|---|
| Backend | Stable — full auth + full CRUD for accounts, cards, categories, subcategories, tags, transactions |
| Frontend auth | Complete — login, signup, verify-email, forgot-password, reset-password |
| Frontend financial | **Not implemented** — backend is fully ready; frontend exposes none of it |
| Dashboard | Placeholder only |
| CI | `.github/workflows/ci.yml` — lint, typecheck, test on Node 22 |

## How to run

```bash
# From repository root
npm run dev            # start backend and frontend (see package.json for exact scripts)
npm run lint           # lint all workspaces
npm run typecheck      # typecheck all workspaces
npm test               # run all tests
```

## Governance

Code is the source of truth. CLAUDE.md files provide orientation. SKILL.md files provide deep role-specific standards. When documentation conflicts with code, the code wins — then update the documentation.

> `agents.md` at the root is the deprecated predecessor to this file. It is preserved for historical reference only.
