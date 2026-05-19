# Zinero Skill Index

Use this file to decide which skill to load — or whether to load one at all.

## Navigation hierarchy

```
CLAUDE.md (root)              Repository overview and navigation
  ↓
segment CLAUDE.md             Focused context for backend/, frontend/, shared/
  ↓
relevant SKILL.md             Deep role-specific standards, patterns, and checklists
```

Read the relevant segment CLAUDE.md first. Load a skill only when you need deep implementation standards, role-specific review guidance, or ownership checklists.

## Loading rules

| Situation | Action |
|---|---|
| Trivial edits, dependency installs, mechanical formatting | No skill needed |
| Deciding ownership, checking which guidance applies | This index only |
| Domain review, feature design, shared contract changes, nontrivial refactors | Load the relevant full skill |
| Work crosses ownership boundaries | Load the primary implementation skill first, then secondary if needed |

## Skills

| Skill | Load when work involves | Owns |
|---|---|---|
| `staff-architecture` | Cross-layer design, `shared/` additions, auth policy, security, database scalability, CI/CD readiness | Structural decisions and boundaries; authorization policy |
| `staff-backend` | Controllers, services, repositories, validation, backend TypeScript, Express routes | Backend implementation quality; authorization enforcement |
| `staff-frontend` | Pages, controllers, services, API modules, stores, routing, platform modules, bootstrap | Frontend implementation quality (all non-component layers) |
| `staff-design-system` | Shared components, component APIs, variants, tokens, accessibility, sandbox, global styles | Shared UI foundation; UI-facing enums in shared/ |
| `staff-ux-writing` | User-facing copy, i18n keys, localized strings, terminology, tone, error messages | Product language and localization; shared/i18n/ content |
| `staff-qa` | Test quality, coverage gaps, regression risk, testability, acceptance criteria review | Meaningful test coverage and confidence |
| `staff-product` | Scope, acceptance criteria, feature definition, implementation readiness | Implementation-ready product definition |

## Skill file paths

```
skills/staff-architecture/SKILL.md
skills/staff-backend/SKILL.md
skills/staff-frontend/SKILL.md
skills/staff-design-system/SKILL.md
skills/staff-ux-writing/SKILL.md
skills/staff-qa/SKILL.md
skills/staff-product/SKILL.md
```

## Handoffs

| Trigger | Route to |
|---|---|
| New `shared/` addition (enum, type, error code, domain type) | `staff-architecture` — structural review and approval |
| Authorization gap found | `staff-architecture` (policy) + `staff-backend` (implementation) |
| New UI-facing enum in `shared/enums/` | `staff-architecture` (structure) + `staff-design-system` (semantics) |
| New `ErrorCode` — i18n mapping needed | `staff-ux-writing` (after `staff-architecture` approves) |
| `shared/i18n/` structural change | `staff-architecture` first, then `staff-ux-writing` for content |
| Backend implementation fixes | `staff-backend` |
| Frontend page or state fixes | `staff-frontend` |
| Shared component changes | `staff-design-system` |
| Copy and locale content changes | `staff-ux-writing` |
| Test confidence and regression coverage | `staff-qa` |
| Ambiguous scope or acceptance criteria | `staff-product` |
| Product page bypasses a component (system gap) | `staff-design-system` (decide) → `staff-frontend` (fix pages) |
