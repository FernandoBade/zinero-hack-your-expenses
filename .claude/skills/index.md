# Zinero Skill Index

Each skill is a deep-context role loaded on demand. Skills live at
`.claude/skills/<name>/SKILL.md`, with a `refs/` subfolder for volatile or
long-form content that changes frequently.

> Cross-cutting constraints all agents must follow regardless of which skill is loaded: read `.claude/skills/refs/conventions.md`.

## Loading rules

Load a skill when you need role-specific standards, review checklists, or output
templates. For trivial edits or mechanical tasks, skip skills entirely. When a task
crosses layer boundaries, load the primary skill first; load the secondary only if
a handoff is actively needed.

| Situation | Action |
|---|---|
| Trivial edits, dependency installs, mechanical formatting | No skill needed |
| Deciding ownership or checking which guidance applies | This index only |
| Domain review, feature design, shared contract changes, nontrivial implementation | Load the relevant skill |
| Work crosses layer boundaries | Primary skill first, secondary if needed |

## Skills

| Skill | Trigger when… | Produces |
|---|---|---|
| `staff-product` | "Is this in scope?", "Let's spec this out", "Break this into issues", defining a feature | Feature spec, acceptance criteria, GitHub issues |
| `staff-architecture` | "Should this go in shared/?", "Who can access this?", cross-layer design, auth or security policy | Decision record, shared/ ruling, policy statement |
| `staff-backend` | "Review this endpoint", "How do I write this controller?", backend implementation | Endpoint spec, code review, implementation |
| `staff-frontend` | "Review this page", "How should this layer work?", frontend implementation | Page spec, code review, implementation |
| `staff-design-system` | "Should this be a component?", "What variant do I need?", shared UI primitives | Component proposal, design token decision |
| `staff-ux-writing` | "How should this be worded?", "Translate this", i18n keys, error messages | Copy block, i18n key set, tone review |
| `staff-qa` | "Is this worth testing?", "What edge cases am I missing?", test coverage review | Test plan, coverage assessment, testability report |

Skill paths: `.claude/skills/<name>/SKILL.md`

## Handoff model

Work flows from product definition → structural approval → layer implementation →
confidence check. When a task triggers a handoff, finish the current skill's output
first, then route to the target skill.

| Trigger | Route to |
|---|---|
| New `shared/` addition (enum, type, error code, domain type) | `staff-architecture` — structural review before implementation |
| Authorization gap found | `staff-architecture` (policy) + `staff-backend` (enforcement) |
| New UI-facing enum in `shared/enums/` | `staff-architecture` (structure) + `staff-design-system` (semantics) |
| New `ErrorCode` — i18n mapping needed | `staff-ux-writing` (after `staff-architecture` approves) |
| `shared/i18n/` structural change | `staff-architecture` first, then `staff-ux-writing` for content |
| Backend implementation | `staff-backend` |
| Frontend page or state | `staff-frontend` |
| Shared component creation or change | `staff-design-system` |
| Copy, locale content, or error messages | `staff-ux-writing` |
| Test confidence and regression coverage | `staff-qa` |
| Ambiguous scope or acceptance criteria | `staff-product` |
| Product page bypasses a component (system gap) | `staff-design-system` (decide) → `staff-frontend` (fix) |
| Feature approved, needs GitHub issues | `staff-product` (backlog section) |
