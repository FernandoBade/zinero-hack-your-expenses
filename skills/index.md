# Zinero Skill Index

Use this file before loading any full skill. Load the smallest relevant skill only.

## Loading Rules
- No skill: trivial edits, dependency installs, mechanical formatting, or direct fixes that are fully obvious from code.
- Index only: deciding ownership, validation scope, or which guidance applies.
- Full skill: domain review, feature design, shared contract changes, user-facing behavior, tests, or nontrivial refactors.
- Multiple skills: only when work crosses ownership boundaries; load the primary implementation skill first.

## Skills

| Skill | Use when task involves | Owns | Load next |
|---|---|---|---|
| `staff-architecture` | cross-layer design, `shared/`, auth policy, CI/env/observability, repo structure | structural decisions and boundaries | `skills/staff-architecture/SKILL.md` |
| `staff-backend` | controllers, services, repositories, backend validation, backend auth enforcement | backend implementation quality | `skills/staff-backend/SKILL.md` |
| `staff-frontend` | pages, controllers, services, API modules, stores, routing, platform modules | frontend implementation quality outside shared components | `skills/staff-frontend/SKILL.md` |
| `staff-design-system` | shared components, tokens, variants, accessibility, sandbox, global styles | shared UI foundation | `skills/staff-design-system/SKILL.md` |
| `staff-ux-writing` | copy, i18n keys, localized strings, terminology, tone | product language and localization | `skills/staff-ux-writing/SKILL.md` |
| `staff-qa` | test strategy, coverage gaps, regression risk, verification confidence | meaningful test coverage and testability | `skills/staff-qa/SKILL.md` |
| `staff-product` | scope, acceptance criteria, feature definition, readiness | implementation-ready product definition | `skills/staff-product/SKILL.md` |

## Handoffs
- Shared structural changes: `staff-architecture`.
- Backend implementation fixes: `staff-backend`.
- Frontend page or state fixes: `staff-frontend`.
- Shared component changes: `staff-design-system`.
- Copy and locale changes: `staff-ux-writing`.
- Test confidence and regression coverage: `staff-qa`.
- Ambiguous scope or acceptance criteria: `staff-product`.
