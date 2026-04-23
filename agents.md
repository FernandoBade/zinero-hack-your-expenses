# Zinero Repository Orientation


## Purpose and precedence

This file is a secondary orientation document for humans and agents working in
the repository.

Governance and truth precedence:

1. Current code in `backend/`, `frontend/`, and `shared/`
2. The relevant skill file in `skills/`
3. This file and `README.md`

Do not treat this file as the primary governance source. If this document
conflicts with the current code or the relevant skill, follow the code and the
skill.

## Authoritative governance source

The authoritative governance model lives in `skills/`:

- `skills/staff-architecture/SKILL.md`: monorepo boundaries, shared-layer
  ownership, security and authorization policy, long-term structure
- `skills/staff-backend/SKILL.md`: backend implementation quality, controller
  and service discipline, authorization enforcement pattern
- `skills/staff-frontend/SKILL.md`: frontend implementation quality outside the
  shared component system
- `skills/staff-design-system/SKILL.md`: shared components, styles, sandbox,
  and UI-facing shared enums
- `skills/staff-ux-writing/SKILL.md`: shared i18n content, terminology, and
  user-facing copy
- `skills/staff-qa/SKILL.md`: regression protection, verification quality, and
  coverage confidence
- `skills/staff-product/SKILL.md`: feature definition, scope control, and
  acceptance criteria quality

If a governance rule changes, update the relevant skill first. Align
`agents.md` and `README.md` afterward.

## Current repository reality

- The monorepo uses npm workspaces for `backend` and `frontend`.
- `shared/` is a common cross-layer folder, not a separate npm workspace.
- `skills/` is part of the repository and is the active governance source.
- `backend/` is the most mature product surface.
- `frontend/` is active, but still centered on authentication, bootstrap,
  shared UI foundations, and a sandbox page.
- There is no `mobile/` package in the repository today.
- There is no checked-in CI/CD pipeline or deployment setup in the repository
  today.
- `dev:frontend:old` and `dev:full:old` are legacy leftovers that depend on a
  missing `frontend_old/` directory and are not part of the current supported
  workflow.

## Backend state this document assumes

- Baseline stabilization, authorization hardening, and the backend finalization
  pass are complete.
- Ownership-sensitive endpoints currently follow an owner-or-`MASTER` access
  model through `canAccessOwnedResource()` and `canAccessRequestedUser()`.
- `updateUser` is treated as an identity-sensitive flow: self-service email and
  password changes require `currentPassword`; email changes clear verification
  state and revoke refresh sessions.
- `backend/src/utils/validation/validateRequest.ts` is now a compatibility
  facade that re-exports domain validators from
  `backend/src/utils/validation/domains/`.
- The root quality gates were verified green on `2026-04-23`:
  `npm run lint`, `npm run typecheck`, and `npm test`.
- The backend is stable enough to freeze documentation and support future
  financial frontend work, but operational hardening remains separate work.

## Frontend state this document assumes

- Implemented today: login, signup, verify-email, forgot-password,
  reset-password, bootstrap, theme and locale state, auth state, shared
  components, sandbox, and a placeholder dashboard.
- Not implemented yet: the real financial product screens that consume the
  backend account, card, category, subcategory, tag, and transaction modules.
- `staff-frontend` owns product-page implementation quality.
- `staff-design-system` owns shared component internals, styles, and sandbox
  quality.

## Practical guidance

- Re-read the current code before making claims about architecture, security,
  validation, or repo maturity.
- Use `shared/` only for real cross-layer contracts, enums, i18n, and assets.
  Do not turn it into an application layer.
- Do not document future mobile, CI, or operational capabilities as if they
  already exist.
- Keep documentation short, current, and explicit about what is implemented now
  versus what is still future intent.

## What this file is not

- Not a replacement for the skill files
- Not a full architecture specification
- Not a promise of future product scope
- Not a source of truth over the code
