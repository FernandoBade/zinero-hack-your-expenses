# Skills Analysis — Zinero Monorepo

**Scope:** `.claude/skills/` — all SKILL.md files, refs/, and index.md  
**Date:** 2026-05-19  
**Issue:** refs #35  
**Purpose:** Analysis only. No files were modified. Refactor in a follow-up issue.

---

## 1. Project-level diagnosis

### What is good

**Volatility separation is well-executed.** Every skill externalises volatile facts (repo state, known risks, implementation status) into `refs/state.md`. The main SKILL.md files contain only stable guidance. This is the most important token-efficiency pattern and it is consistently applied across all seven skills.

**Role boundaries are sharp and non-overlapping.** Each skill owns a clear domain. Trigger descriptions explicitly say what the skill is NOT for. The index.md loading rules include a "trivial edits = no skill needed" gate, which prevents unnecessary context load for mechanical tasks.

**Review checklists are concrete and codebase-specific.** Items reference real function names (`answerAPI`, `withTransaction`, `createXController`), real files (`validateRequest.ts`, `error-code-map.ts`), and real enums (`ErrorCode`, `FieldKey`, `I18nKey`). Generic checklists that could apply to any project are avoided.

**Output templates are well-defined.** Each skill specifies a structured output format (endpoint spec, page spec, copy block, component proposal, decision record, feature spec, test plan). This makes agent output predictable and reviewable.

**Handoff tables close every skill.** Explicit routing tables prevent agents from guessing where to escalate a problem. The pattern is consistent across all seven files.

**SKILL.md file sizes are well-controlled.** All seven files fall between 110–142 lines, well within the 500-line ideal. No skill is approaching the point where it needs an additional layer of hierarchy.

**index.md serves as a meta-router.** It prevents unnecessary skill loading by acting as a cheap first-pass decision layer (~65 lines, always available in context).

---

### What is risky

**Volatile state embedded in SKILL.md (staff-architecture, staff-qa).** Two skills contain volatile repository facts directly in the main file rather than in refs/state.md:

- `staff-architecture` SKILL.md, line 61: inline named known gap (`updateUser`, `deleteUser`, `getAccounts`, `getTransactions`) with the label "critical policy violation" — this will become stale when the backend team fixes ownership checks.
- `staff-qa` SKILL.md, lines 25–57: full directory trees for backend and frontend test folders, plus hard numbers (51 suites, 858 tests, thresholds, 12 executed files, 79 tests). These numbers change every time tests are added or reorganised.

**Duplicated product identity block.** The Zinero brand personality definition appears in both `staff-product` and `staff-ux-writing`. They are currently in sync, but they are maintained independently. If one is updated and the other is not, agents acting under each skill will hold contradictory brand guidance. (~14 lines duplicated across two files.)

**Component library list is volatile state in SKILL.md.** `staff-design-system` SKILL.md lists the current set of 30+ components by name on a single line. This is a snapshot of the library that will drift as components are added or renamed.

---

### What is overengineered

Nothing significant. The skill set is lean, well-scoped, and does not over-specify. The current structure is appropriate for the project's complexity.

---

### What is missing

**No cross-skill shared conventions file.** The CLAUDE.md root and segment files define cross-cutting rules (English identifiers, no floating-point arithmetic, MonetaryString, no hardcoded user-visible strings). None of the skills reference these rules explicitly. An agent that loads a skill without having CLAUDE.md in context could miss these constraints. A brief pointer in index.md or a shared `refs/conventions.md` would close this gap.

**No script or asset resources.** The `refs/` pattern is used well for documentation. For future automation (e.g., a script to scaffold a new endpoint, or a validation helper), a `scripts/` directory does not yet exist. This is not a problem now, but it is the natural next layer when repetitive multi-step tasks emerge.

**staff-architecture has no output template for security policy statements.** The skill says it produces "security policy statements" but the output section only provides a decision record template. A thin policy statement template would make that output type predictable.

---

### What is wasting tokens

| Source | Location | Estimated waste |
|---|---|---|
| Test infrastructure dir trees + counts | `staff-qa` SKILL.md, lines 25–57 | ~33 lines of volatile state in main file |
| Inline named known gap | `staff-architecture` SKILL.md, line 61 | 1–2 lines that should be in refs/state.md |
| Component library enumeration | `staff-design-system` SKILL.md, lines 60–63 | ~3 lines of driftable snapshot |
| Duplicate product identity | `staff-product` + `staff-ux-writing` SKILL.md | ~14 lines loaded twice when both skills are active |
| Skill paths list in index.md | `index.md`, lines 35–43 | ~9 lines redundant with the skills table above it |

---

## 2. Skill-by-skill review

### staff-architecture (110 lines)

**Purpose:** Structural and security authority. Governs `shared/` additions, enforces monorepo boundaries, issues architectural decision records.

**Current structure:** Role statement → shared/ governance rules → architecture review checklist (4 sections: monorepo/boundaries, backend architecture, frontend architecture, security, database) → decision record template → handoffs table.

**Strengths:** The checklist is specific enough to catch real violations — it names actual files (`validateRequest.ts`, `TransactionService`), patterns (`withTransaction()`), and known gaps. The decision record template is tight and useful. The refs pointer is correctly placed at the top.

**Problems:** Line 61 embeds a named list of specific endpoints (`updateUser`, `deleteUser`, `getAccounts`, `getTransactions`) as "known gap" directly in the checklist. This is volatile state — it should live in `refs/state.md`. Similarly, the checklist item checking whether `zinero: file:..` is still unused is a point-in-time repo observation, not an architectural principle.

**Token-efficiency issues:** Minor. The checklist is appropriate. The two volatile items noted above add ~3 lines but more importantly create a staleness risk.

**Accuracy risks:** The inline known gap on line 61 will mislead agents after the backend fixes ownership — the checklist will flag a problem that no longer exists, or stop flagging one that reappears elsewhere.

**Recommended changes:** Move the inline known gap reference (line 61) and the `zinero: file:..` check to `refs/state.md`. Rewrite the checklist item as a principle ("Authorization enforced on every endpoint accessing user-owned data?") without naming specific endpoints.

**Verdict:** Keep structure as-is. Minor targeted edits only.

---

### staff-backend (133 lines)

**Purpose:** Backend code quality. Owns controller, service, repository, validation patterns and review.

**Current structure:** Role statement → real patterns (4 code blocks: controller, service, repository, response contract) → layer responsibility table → review checklist (4 sections: controller, service, repository, validation, shared contracts) → endpoint spec template → handoffs table.

**Strengths:** The code block patterns are the highest-value content in this skill — they anchor all agent output to the actual codebase structure and reduce hallucination of invented patterns. The response contract note (always `answerAPI()`, never `res.json()`) is critical and correctly placed in the patterns section. The layer responsibility table is concise and eliminates ambiguity about what belongs where.

**Problems:** `withTransaction()` is mentioned in both the service code block example (as a comment) and the service review checklist. This is intentional redundancy (pattern vs review) and is acceptable, but it is worth noting. The shared contracts checklist section restates rules that also exist in CLAUDE.md cross-cutting rules — acceptable duplication because the skill needs to be self-contained.

**Token-efficiency issues:** The four code blocks total ~20 lines. This is high-density, high-value content. No meaningful cuts available without reducing precision.

**Accuracy risks:** Low. Patterns are grounded in the actual codebase layer structure.

**Recommended changes:** None required. The skill is well-calibrated.

**Verdict:** No change needed.

---

### staff-frontend (127 lines)

**Purpose:** Frontend code quality. Owns pages, controllers, services, API modules, stores, platform adapters.

**Current structure:** Role statement → owned files list → real patterns (layer diagram, controller factory code block, store pattern) → layer responsibility table → review checklist (6 sections) → page spec template → handoffs table.

**Strengths:** The owned files list scopes the skill precisely — agents know immediately what they are and are not responsible for. The layer diagram (Pages → Controllers → Services → API → httpClient) is compact and eliminates confusion about data flow. The controller factory code block shows the exact function signature. The page spec template is well-structured and covers auth, state, data dependencies, i18n, components, and error states.

**Problems:** The store pattern section lists four function signatures (`getX`, `setX`, `subscribeX`, `unsubscribeX`) as bullet points. These could be consolidated to one line ("Functions: `getX`, `setX`, `subscribeX`, `unsubscribeX`") with no information loss, saving 2 lines.

**Token-efficiency issues:** Minor. The owned files list is 8 lines — justified given how many files the frontend contains. The layer responsibility table is 6 rows, each earned.

**Accuracy risks:** Low. The layer diagram matches the actual architecture described in the codebase.

**Recommended changes:** Consolidate the store function list from 4 bullets to 1 line. Everything else is correct and proportionate.

**Verdict:** Minor tightening only.

---

### staff-design-system (120 lines)

**Purpose:** Design system governance. Owns shared components, variant decisions, design tokens, sandbox catalog, UI-facing enums.

**Current structure:** Role + owned files + shared/ scope → real patterns (component file structure, variant map code block, key principles) → component library list → design token reality → review checklist (3 sections) → component proposal template → handoffs table.

**Strengths:** The variant map code block is excellent — the exhaustive `Record<Enum, string>` pattern with the "ALL enum values must be present" comment prevents a common bug. The key principles list (5 items) is tight and actionable. The component proposal template covers all the right fields including sandbox states and shared enum changes.

**Problems:** The component library list (30+ component names) is volatile state — it is a snapshot of what exists today and will drift as components are added or renamed. It takes ~3 lines and belongs in `refs/state.md`. In the SKILL.md, it could be replaced with a single instruction: "Check `refs/state.md` for the current component library before proposing a new component."

**Token-efficiency issues:** The component library enumeration is the only issue. Everything else is stable guidance.

**Accuracy risks:** The component list will drift. An agent checking whether a component exists may rely on a stale list and create a duplicate.

**Recommended changes:** Move the component library list to `refs/state.md`. Reference it from SKILL.md with one line. This also makes `refs/state.md` the authoritative location to update when components are added.

**Verdict:** Single targeted change: move component list to refs/state.md.

---

### staff-ux-writing (114 lines)

**Purpose:** Language, copy, and localization authority. Owns i18n content, error messages, tone, transcreation.

**Current structure:** Role statement → product identity block → supported languages table → i18n structure tree → review checklist (3 sections) → copy block template → handoffs table.

**Strengths:** The product identity block is the most specific and memorable of any skill in the repo — "Zinero is NOT a bank" and the transcreation example ("Hack your money" → illegal-sounding in pt-BR) are high signal and directly prevent real mistakes. The i18n structure tree is compact and accurate. The copy block template with the five-column table (key, en-US, pt-BR, es-ES, notes) is exactly right for the output format.

**Problems:** The product identity block (lines 29–35, ~7 lines of "Zinero is / Zinero is NOT") is also present in `staff-product`. This is the most meaningful duplication in the skill set. Both skills need the personality context to do their jobs, so the duplication is somewhat justified. However, maintenance requires updating both files.

**Token-efficiency issues:** The duplication adds ~7 lines to total context when both skills are active simultaneously. Not critical but worth addressing.

**Accuracy risks:** Divergence between the two personality definitions if one is updated and the other is not.

**Recommended changes:** Accept the duplication deliberately as a documented choice, OR extract the identity block to a shared `refs/brand.md` at the skills level (e.g., `.claude/skills/refs/brand.md`) and reference it from both skills. Given both files are short, deliberate duplication is acceptable — but it should be documented so maintainers know to update both.

**Verdict:** Acceptable as-is if the duplication is deliberate and documented. Extracting to a shared ref is the cleaner long-term approach.

---

### staff-qa (142 lines)

**Purpose:** Test quality, coverage, testability guidance. Produces test plans, coverage assessments, and testability reports.

**Current structure:** Role statement → test infrastructure (2 directory trees + stats for backend and frontend) → core principles (2 subsections) → review checklist (4 sections) → test plan template → handoffs table.

**Strengths:** Core principles ("Meaningful coverage over metrics" and "Testability as a quality signal") are excellent — they give agents a philosophy to reason from, not just rules to follow. The testability assessment checklist (can dependencies be mocked? are error paths reachable?) is particularly strong. The test plan template covers all the right dimensions including observability.

**Problems:** This is the skill with the most significant token-efficiency problem. Lines 25–57 (~33 lines) contain:
- Full directory trees for `backend/tests/` and `frontend/tests/`
- Hard numbers: 51 suites, 858 tests
- Coverage thresholds: 40/30/40/40
- Hard numbers: 12 executed files, 79 frontend tests
- Coverage scope: "only `src/utils/intl/**/*.ts` and `src/state/userPreferences.store.ts`"

All of these are volatile facts. The test suite will grow. Numbers will change. A new test file added without updating this section leaves an agent with incorrect counts. These facts belong entirely in `refs/state.md`.

The SKILL.md should retain only the stable structural descriptions: "Backend uses Jest, organised into helpers/, integration/, unit/{controllers,repositories,routes,services,utils}. Frontend uses Vitest, organised into helpers/, mocks/, unit/{architecture,components,intl,pages,services,state}." The counts, thresholds, and current state belong in refs.

**Token-efficiency issues:** ~33 lines of volatile infrastructure detail loaded on every invocation of this skill. Worst offender in the skill set.

**Accuracy risks:** High. The test counts (51 suites, 858 tests, 79 frontend tests) will be wrong within weeks of active development. An agent relying on these counts to reason about coverage gap severity will make incorrect assessments.

**Recommended changes:** Extract all directory tree details, test counts, coverage thresholds, and coverage scope descriptions to `refs/state.md`. Retain only the structural shape (layer names, test framework names, factory file locations) in SKILL.md. Estimated savings: ~25 lines from SKILL.md with no loss of guidance quality.

**Verdict:** Targeted refactor needed. Largest single improvement available.

---

### staff-product (124 lines + refs/issue-playbook.md at 202 lines)

**Purpose:** Product definition and backlog authority. Produces feature specs, acceptance criteria, and GitHub issues.

**Current structure:** Role statement → product identity → feature definition (problem framing, 7-step checklist, acceptance criteria format, scope discipline, implementation readiness checklist) → backlog section (decomposition rule, issue checklist, board fields note) → feature spec template → handoffs table. Refs: issue-playbook.md (full gh CLI playbook).

**Strengths:** The implementation readiness section ("a spec is not done until each specialist has enough context") is among the best content in the skill set — it directly prevents the common failure mode of underspecified handoffs. The acceptance criteria format (`Given / when / then`) is correctly specified. The scope discipline section ("name 'maybe' items as ambiguity") is concise and useful. The delegation of all `gh` CLI mechanics to `refs/issue-playbook.md` is the right pattern — it keeps the main file focused on product thinking.

**Problems:** Product identity block is duplicated with `staff-ux-writing` (see above). The backlog section in SKILL.md previews decomposition rules that are also in `refs/issue-playbook.md`. There is slight drift risk if one is updated without the other, though the main SKILL.md version is appropriately summary-level and the ref is the detail level.

**Token-efficiency issues:** The product identity block duplication is the main concern. Otherwise proportionate.

**Accuracy risks:** Low for the spec-writing content. The GitHub issue workflow is entirely delegated to the ref file, which is the correct approach.

**Recommended changes:** Same as ux-writing: either document the duplication as deliberate, or extract to a shared brand ref. No structural changes needed.

**Verdict:** Well-designed. Accept identity duplication or extract it.

---

### index.md (65 lines)

**Purpose:** Meta-router. Determines which skill to load before loading any skill content.

**Current structure:** Loading rules table → skills table (name, trigger, produces) → skill paths list → handoff model table.

**Strengths:** The loading rules table is the most valuable part — the "trivial edits = no skill needed" rule prevents context bloat for mechanical tasks. The skills table trigger column uses natural-language triggers ("'Is this in scope?'") which closely match how users actually phrase requests. The handoff model table provides a second level of routing for cross-boundary work.

**Problems:** The skill paths list (lines 35–43) lists the filesystem path for each skill. This is entirely derivable from the skill names (`.claude/skills/<name>/SKILL.md`) and duplicates the skills table above it. It saves no lookup time and adds ~9 lines. The handoff model table at the bottom partially duplicates the per-skill handoff tables, but it serves a different purpose (pre-load routing) so the overlap is acceptable.

**Token-efficiency issues:** The skill paths list is the only redundant content. ~9 lines saved by removing it.

**Accuracy risks:** None. The index itself is stable.

**Recommended changes:** Remove the skill paths list (lines 35–43). It adds no information beyond what is in the skills table. Replace with a single line: `Skill paths follow the pattern: .claude/skills/<name>/SKILL.md`.

**Verdict:** Minor trim only.

---

## 3. Recommended skill architecture

The current layout is fundamentally correct. The recommended target structure makes three changes: externalises remaining volatile state, removes one piece of redundant navigation, and introduces an optional shared brand reference.

```
.claude/
├── skills/
│   ├── index.md                          # Meta-router — no structural change needed
│   ├── refs/                             # NEW: shared cross-skill references
│   │   └── brand.md                      # Optional: Zinero personality/identity (extracted from product + ux-writing)
│   ├── staff-architecture/
│   │   ├── SKILL.md                      # Remove inline known gaps → move to refs/state.md
│   │   └── refs/
│   │       └── state.md                  # Add: named endpoint ownership gaps, zinero file:.. status
│   ├── staff-backend/
│   │   ├── SKILL.md                      # No change needed
│   │   └── refs/
│   │       └── state.md                  # No change needed
│   ├── staff-frontend/
│   │   ├── SKILL.md                      # Minor: consolidate store function list to 1 line
│   │   └── refs/
│   │       └── state.md                  # No change needed
│   ├── staff-design-system/
│   │   ├── SKILL.md                      # Move component library list → refs/state.md
│   │   └── refs/
│   │       └── state.md                  # Add: current component library enumeration
│   ├── staff-ux-writing/
│   │   ├── SKILL.md                      # Accept identity duplication OR reference shared brand.md
│   │   └── refs/
│   │       └── state.md                  # No change needed
│   ├── staff-qa/
│   │   ├── SKILL.md                      # Move dir trees + counts → refs/state.md (saves ~25 lines)
│   │   └── refs/
│   │       └── state.md                  # Add: directory trees, test counts, thresholds, coverage scope
│   └── staff-product/
│       ├── SKILL.md                      # Accept identity duplication OR reference shared brand.md
│       └── refs/
│           ├── state.md                  # No change needed
│           └── issue-playbook.md         # No change needed
└── skills-analysis/
    └── review-existing-skills.md         # This file
```

The `refs/brand.md` at the skills level is optional — only needed if the product identity block is extracted from `staff-product` and `staff-ux-writing`. Both options (extract or deliberate duplication) are acceptable; the key is that the choice is documented.

No `scripts/` or `assets/` directories are needed at this time. The skills are guidance-only, not automation-oriented.

---

## 4. Recommended writing standards

### Tone

Terse and technical. Write for an AI agent, not a human reader. Avoid conversational filler ("please note that", "it's important to remember that"). Use imperative form for all instructions.

### Length

- SKILL.md: 80–150 lines is the target range for this project's skills. All current files are within range. Do not add content to reach a minimum.
- refs/state.md: No line limit. This is a living document. Update it frequently.
- refs/*.md reference files: As long as needed. The issue-playbook.md at 202 lines is appropriate because it is only loaded on demand.

### Formatting

- Use `##` and `###` for section headers only when the section genuinely changes topic.
- Use tables for: layer responsibilities, handoffs, supported values, skill triggers. Tables compress multi-column information efficiently.
- Use code blocks for: canonical patterns only — one per pattern type. Do not use code blocks for simple lists or configurations.
- Use `[ ]` checklists only for review checklists (items an agent is expected to work through). Do not use them for instructions.
- Use `> blockquote` for refs/ pointers at the top of each skill — consistent convention already in use, keep it.

### Instruction style

- State what to do, not what not to do, unless the prohibition prevents a specific common mistake.
- Explain the reason for a rule when it is non-obvious (e.g., "use `withTransaction()` for every multi-table write" — the reason is consistency and atomicity; stating it makes the rule memorable).
- Name real files and function names rather than generic terms. "Use `answerAPI()`" is better than "use the response helper". Specificity is a feature.
- Do not use ALL CAPS for emphasis. Use `code formatting` to highlight identifiers, and standard sentence structure for emphasis.

### Trigger descriptions (frontmatter)

- Lead with the domain, not the skill name.
- Use natural-language trigger phrases in quotes — these should match how users phrase real requests.
- Explicitly state what the skill is NOT for. This prevents cross-loading when domains are adjacent.
- Keep the description under 5 lines. The current descriptions are correctly sized.

### Examples

- Include at most one example per pattern in SKILL.md. If more examples are needed, they go in a `refs/examples.md` file.
- The current code blocks are at the right level of detail — they show structure, not exhaustive implementation.

### References

- Volatile state always goes in `refs/state.md`.
- Long reference content (playbooks, detailed conventions) goes in named `refs/` files.
- SKILL.md pointers to refs use `> For [topic], read refs/state.md.` — keep the existing convention.
- Do not inline content that belongs in a ref file. The `staff-qa` infrastructure stats are the canonical example of what not to do.

### Anti-patterns to avoid

| Anti-pattern | Why it hurts |
|---|---|
| Hard numbers (test counts, file counts) in SKILL.md | Stale within weeks; misleads agents about current state |
| Named specific endpoints/files as "known gaps" in SKILL.md | Same staleness risk; belongs in refs/state.md |
| Restating CLAUDE.md cross-cutting rules in full | Acceptable for self-containment but watch for drift |
| Prose paragraphs where a table would work | Higher token cost, lower scan efficiency |
| All-caps for emphasis | Reads as shouting; code formatting is cleaner |
| Checklist items that require explanation | If an item needs a note, add it as a brief parenthetical, not a sub-bullet |
| Duplicate content without marking it deliberate | Creates silent maintenance debt |

---

## 5. Token-efficiency checklist

Use this checklist before finalising any SKILL.md change:

- [ ] **No hard numbers in SKILL.md.** Test counts, file counts, line counts, threshold values → `refs/state.md` only.
- [ ] **No named known gaps in SKILL.md.** Specific files, functions, or endpoints flagged as broken → `refs/state.md` only.
- [ ] **No directory trees in SKILL.md.** Folder structures that reflect current state → `refs/state.md` only.
- [ ] **No component/entity enumerations in SKILL.md.** Lists of current components, routes, or endpoints → `refs/state.md` only.
- [ ] **Every code block is canonical.** Only one code block per pattern type. No variations, no alternatives in the same file.
- [ ] **Every checklist item is one line.** If it needs two lines, it is two items.
- [ ] **Handoff tables use ≤2 words per route cell.** "staff-backend" not "hand this off to staff-backend for implementation".
- [ ] **Frontmatter description is ≤5 lines.** Trigger phrases are in quotes. NOT-FOR clauses are explicit.
- [ ] **refs/ pointer is the second line of the role section.** Consistent placement for fast scanning.
- [ ] **No prose where a table communicates the same information.**
- [ ] **Duplication across skills is documented.** If content appears in two files, add a comment marking it deliberate.
- [ ] **index.md has no redundant skill paths list.** Paths are derivable; the table is sufficient.

---

## 6. Refactor plan

This is an ordered action plan for the follow-up implementation issue. Steps are ordered by impact (highest token savings and lowest risk first).

### Step 1 — staff-qa: Move test infrastructure to refs/state.md (high impact)

Remove from `staff-qa/SKILL.md`: the two directory tree blocks for `backend/tests/` and `frontend/tests/`, all hard counts (51 suites, 858 tests, thresholds, 12 files, 79 tests), the coverage scope list. Estimated: ~25 lines removed from SKILL.md.

Add to `staff-qa/refs/state.md`: the full directory trees, all counts, thresholds, and current coverage scope. Replace the SKILL.md section with a 3-line summary: "Backend: Jest, organised into helpers/, integration/, unit/{controllers,repositories,routes,services,utils}. Frontend: Vitest, organised into helpers/, mocks/, unit/{architecture,components,intl,pages,services,state}. For current counts, thresholds, and coverage scope, read refs/state.md."

### Step 2 — staff-architecture: Remove inline known gap (low risk, improves accuracy)

Remove from `staff-architecture/SKILL.md` line 61: the named endpoint list (`updateUser`, `deleteUser`, `getAccounts`, `getTransactions`). Replace with the principle: "Authorization enforced on every endpoint accessing user-owned data?"

Add to `staff-architecture/refs/state.md`: "Authorization gap — endpoints currently missing ownership checks: `updateUser`, `deleteUser`, `getAccounts`, `getTransactions`" (already partially covered, confirm/update).

### Step 3 — staff-design-system: Move component library to refs/state.md (improves accuracy)

Remove from `staff-design-system/SKILL.md`: the component names list (accordion through tooltip). Replace with: "Check `refs/state.md` for the current component library before proposing a new component — the list grows as the system evolves."

Add to `staff-design-system/refs/state.md`: the enumerated component list (current and maintained going forward).

### Step 4 — index.md: Remove redundant skill paths list (minor, clean)

Remove `index.md` lines 35–43 (the `## Skill paths` code block). The filesystem pattern is self-evident from the skill names. Replace with one line: `Skill paths: .claude/skills/<name>/SKILL.md`. Saves ~9 lines.

### Step 5 — staff-frontend: Consolidate store function list (minor)

Consolidate the four-bullet store function list to one line: `Functions: getX(), setX(), subscribeX(), unsubscribeX() — no API calls`. Saves 2–3 lines.

### Step 6 — Product identity duplication: Document or extract (decision required)

Choose one of two options and implement it:

**Option A (accept duplication):** Add a comment in both `staff-product/SKILL.md` and `staff-ux-writing/SKILL.md` above the identity block: `<!-- Deliberate duplication: also in staff-ux-writing/SKILL.md / staff-product/SKILL.md. Update both. -->`. Zero token savings, prevents silent drift.

**Option B (extract):** Create `.claude/skills/refs/brand.md` with the Zinero identity content. In both SKILL.md files, replace the block with: `> For Zinero's brand voice and personality, read .claude/skills/refs/brand.md.` Saves ~7 lines per skill when both are simultaneously loaded.

### Step 7 — staff-architecture: Remove volatile zinero file:.. check (optional)

The checklist item "zinero: file:.. in frontend/package.json — still unused?" is a point-in-time state observation. Move to refs/state.md after it is resolved (or remove once the unused dependency is cleaned up). Low priority — only worth doing when the dependency issue is acted on.

---

## 7. Final recommendation

The skill set is structurally sound. The architecture (role separation, refs/ volatility pattern, handoff tables, output templates, index.md routing) is well-designed and consistently applied. No skill requires a rewrite or reorganisation. All recommended changes are targeted edits.

**The one change with meaningful token impact is Step 1** (staff-qa infrastructure section). It removes ~25 lines of volatile content that will become stale quickly and could cause agents to reason incorrectly about test coverage. This should be the first change implemented.

**The change with the highest accuracy benefit is Step 2** (staff-architecture inline known gap). Once ownership checks are fixed in the backend, the inline named list will actively mislead agents into flagging false positives in code review.

**Steps 3–7 are maintenance improvements** — they do not affect correctness today but will prevent drift over the next several months of active development.

### Recommended target SKILL.md sizes after refactor

| Skill | Current | After refactor |
|---|---|---|
| staff-architecture | 110 lines | ~107 lines (−3) |
| staff-backend | 133 lines | 133 lines (no change) |
| staff-frontend | 127 lines | ~125 lines (−2) |
| staff-design-system | 120 lines | ~118 lines (−2) |
| staff-ux-writing | 114 lines | 114 or ~107 lines (depends on Step 6) |
| staff-qa | 142 lines | **~117 lines (−25)** |
| staff-product | 124 lines | 124 or ~117 lines (depends on Step 6) |
| index.md | 65 lines | ~56 lines (−9) |

Total reduction: ~41 lines from SKILL.md files (loaded on every skill invocation), relocated to refs/ files (loaded only on demand). The refs/state.md files will grow correspondingly — this is the intended trade-off.
