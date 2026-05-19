# staff-product — current state

> Update this file when the product or repo state changes. Do not restate these facts inline in SKILL.md.

Last updated: 2026-05-19

## Product maturity

| Area | State |
|---|---|
| Backend auth | Complete: login, refresh, logout, email verification, password reset |
| Backend financial | Complete: users, accounts, cards, categories, subcategories, tags, transactions |
| Frontend auth | Complete: login, signup, verify-email, forgot-password, reset-password |
| Frontend financial | **Not implemented** — backend is ready; frontend exposes none of it |
| Dashboard | Placeholder only — no financial data |
| Mobile | Not started — `isNative()` always returns `false` |
| CI/CD | CI only (`.github/workflows/ci.yml` — lint, typecheck, test on Node 22); no CD |

## Known product gaps

| Gap | Status |
|---|---|
| Financial frontend does not yet exist | Active — backend is fully ready |
| Dashboard is a placeholder | Active gap |
| Authorization inconsistency in backend | Active risk — ownership checks missing on several endpoints |
| No mobile app | Not started |
| No CD pipeline | CI exists; CD does not |
