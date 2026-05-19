# staff-product — issue playbook

Use this when a feature spec is approved and needs to become GitHub issues.

**Mechanism:** `gh` CLI. Run `gh auth status` before starting. If not authenticated,
ask the user to run `gh auth login` first.

---

## Templates and when to use each

| Template | Use for | `--template` flag |
|---|---|---|
| `epic.yml` | Large initiative spanning multiple features | `epic.yml` |
| `feature.yml` | Single functional delivery with clear scope | `feature.yml` |
| `task.yml` | Direct implementation work inside a feature | `task.yml` |
| `bug.yml` | Defect found during development (not yet in production) | `bug.yml` |
| `docs.yml` | Documentation, onboarding material, guides | `docs.yml` |
| `incident.yml` | Production problem after deployment | `incident.yml` |

**Default decomposition from a spec:**
- One **Feature** issue for the overall capability
- N **Task** issues — one per layer concern (architecture, backend, frontend, UX writing, QA)
- One **Epic** only if the work spans multiple Feature issues

---

## Issue hierarchy

```
Epic (optional — only for multi-feature work)
  └── Feature (one per spec)
        └── Task × N (one per layer or implementation unit)
```

Link every Task to its parent Feature with "Part of #\<feature-issue-number\>" in the body.
Link every Feature to its parent Epic if one exists.

---

## Board fields

Set these on the GitHub Project Board after creating each issue.

| Field | Values | Notes |
|---|---|---|
| Status | `BACKLOG → PRIORITIZED → IN_PROGRESS → IN_REVIEW → DONE` | Issues land in BACKLOG by default |
| Type | `EPIC · FEATURE · TASK · BUG · DOCS · INCIDENT` | Must match the template used |
| Priority | `P0 - Critical · P1 - High · P2 - Normal · P3 - Low · P4 - Very Low` | Propose; confirm P0/P1 with team |
| Sprint | `YYYY-MMM-A` or `YYYY-MMM-B` (e.g. `2026-MAY-B`) | Propose; confirm with team before setting |

Do not assume authority over Sprint — propose and confirm.

---

## Labels

Labels describe **technical area**, not workflow.

| Label | Use for |
|---|---|
| `sql` | Database queries, migrations, schema changes |
| `test` | Tests, QA, test infrastructure |
| `ai` | AI features, prompts, agents, model integrations |
| `architecture` | System design, structure, technical decisions |
| `backend` | APIs, services, server-side logic |
| `frontend` | UI components, client-side logic, screens |
| `security` | Auth, permissions, vulnerabilities, hardening |
| `ux/ui` | UX design, interface design, accessibility, design system |
| `writing` | Copy, guides, documentation |

---

## AI Context field

Fill the AI Context field whenever a technical issue might be picked up by an AI
agent (Claude Code, Codex, etc.). A good AI Context gives the agent a briefing so
it does not rediscover everything from scratch.

Include:
- Relevant files and functions
- Existing patterns to follow
- Technical constraints and decisions already made
- Dependencies or services involved

Keep it concise — 5–15 lines. Do not paste the entire spec.

**Example for a backend Task:**
```
Auth flow: backend/src/auth/
JWT signing: jose library, RS256

Relevant files:
  backend/src/controllers/accountController.ts — static class pattern
  backend/src/services/accountService.ts — result union pattern
  shared/domains/account.types.ts — domain types

Pattern: use answerAPI() for all responses; ErrorCode from shared/errors/error-codes.ts.
Do not mutate balances outside TransactionService.
```

---

## From spec to issues

| Spec section | Issue field |
|---|---|
| Problem | Feature issue → **Problem** field |
| In scope | Feature issue → **Scope** field |
| Out of scope | Feature issue → Technical Notes — "Out of scope" |
| Acceptance criteria | Feature issue → **Acceptance Criteria** field |
| States + edge cases | Feature issue → **AI Context** |
| Dependencies (per layer) | One Task issue per layer, linked to the Feature |
| Suggested order | Task issue ordering / sprint placement |

Each Task issue gets its own AI Context with the relevant slice of the spec —
not the full spec. Backend Task AI Context: endpoint patterns and relevant files.
Frontend Task AI Context: page patterns and component names.

---

## gh CLI commands

### Create a Feature issue

```bash
gh issue create \
  --title "Outcome-oriented title describing the feature" \
  --template feature.yml \
  --label "frontend,backend" \
  --body "$(cat <<'EOF'
## Problem
<from spec: problem section>

## Solution
<from spec: in-scope summary>

## Acceptance Criteria
- Given …, when …, then …

## Scope
<from spec: in scope list>

## Technical Notes
**Out of scope:** <from spec: out of scope list>

## AI Context
<relevant files, patterns, and constraints>
EOF
)"
```

### Create a Task issue

```bash
gh issue create \
  --title "Implement <layer> for <feature name>" \
  --template task.yml \
  --label "backend" \
  --body "$(cat <<'EOF'
## Context
Part of #<feature-issue-number>: <feature name>

## What To Do
<concrete implementation steps for this layer>

## Acceptance Criteria
- <done condition>

## Technical Notes
<patterns to follow>

## AI Context
<relevant files and constraints for this specific layer>
EOF
)"
```

### After creating Task issues

Note the issue numbers and add them to the Feature issue body:
```
Tasks: #<n1> (backend) · #<n2> (frontend) · #<n3> (UX writing) · #<n4> (QA)
```

### Set board fields

Type and Priority are custom project fields — set them on the GitHub Project Board
after creation (web UI or GraphQL API). Sprint requires team confirmation before setting.

---

## Good issue checklist

Before submitting any issue:

- [ ] Title describes an **outcome**, not an action ("Google OAuth login fails for new accounts" — not "Fix OAuth bug")
- [ ] **One concern per issue** — if it has two unrelated problems, split it
- [ ] AI Context filled if an agent might work on it
- [ ] Correct label(s) for the technical area
- [ ] Task issues reference their parent Feature issue
- [ ] Board fields proposed (Type, Priority) — Sprint confirmed with team
