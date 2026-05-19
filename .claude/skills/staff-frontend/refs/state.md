# staff-frontend — current state

> Update this file when the real codebase state changes. Do not restate these facts inline in SKILL.md.

Last updated: 2026-05-19

## Implementation status

| Area | Status |
|---|---|
| Auth pages | Complete — login, signup, verify-email, forgot-password, reset-password |
| Financial pages | Not implemented — backend is fully ready; frontend exposes none of it |
| Dashboard | Placeholder only — no financial data displayed |
| Mobile | Not started — `isNative()` always returns `false` |

## Known risks

| Risk | Location | Status |
|---|---|---|
| Pages apply DaisyUI/Tailwind directly | `login.tsx`, `signup.tsx`, `verify-email.tsx`, `dashboard.tsx` | Active divergence |
| `document`/`window`/`navigator` outside `platform/` | `bootstrap/`, `modal`, `form`, `theme.store`, `userPreferences.store`, `network.ts` | Platform gap |
| `button.test.tsx` excluded from default test run | `vitest.config.ts` includes only `**/*.test.ts` | Coverage gap |
| `drizzle-kit` in `frontend/package.json` but unused | `frontend/package.json` | Cleanup needed |
| `zinero: file:..` dependency declared but unused | `frontend/package.json` | Cleanup needed |
