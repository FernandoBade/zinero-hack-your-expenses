# staff-architecture — current state

> Update this file when the real codebase state changes. Do not restate these facts inline in SKILL.md.

Last updated: 2026-05-19

## Known divergences

| Guideline | Real state | Status |
|---|---|---|
| `shared/` is a monorepo package | Common folder, not a separate npm workspace | Divergent |
| No DaisyUI classes in `src/pages/**` | Login, signup, verify-email, dashboard, sandbox use them directly | Divergent |
| Ownership enforced on all protected endpoints | `updateUser`, `deleteUser`, `getAccounts`, `getTransactions` lack ownership checks | Divergent — critical |
| All native access through `platform/` | `document`/`window`/`navigator` still appear outside `platform/` in several files | Partial |
| CI/CD pipeline exists | No deployment pipeline; CI only (lint, typecheck, test on Node 22) | Divergent |
| Env vars validated at startup | No structured env validation exists | Divergent |
| No unused dependencies | `express-session`, `translation-check`, `winston-daily-rotate-file` (backend); `drizzle-kit`, `zinero: file:..` (frontend) | Divergent |
| `FEEDBACK_TO_EMAIL` in env | Hardcoded in `utils/email/feedbackEmail.ts` | Divergent |
| Rate limiting scales across instances | In-memory only — does not survive restarts or scale horizontally | Scalability risk |
