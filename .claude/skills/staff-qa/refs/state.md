# staff-qa — current state

> Update this file when the real codebase state changes. Do not restate these facts inline in SKILL.md.

Last updated: 2026-05-19

## Known quality risks

| Risk | Location | Status |
|---|---|---|
| `button.test.tsx` excluded from `npm test` | `vitest.config.ts` includes only `**/*.test.ts` | Active gap |
| Frontend component testing is minimal | Only `button.test.tsx` exists | Low coverage |
| Frontend has no e2e tests | No e2e framework present | No e2e coverage |
| Frontend has no routing tests | No routing test coverage | Gap |
| Backend integration testing is minimal | Only `userProfileRoutes.test.ts` | Low integration coverage |
| Backend authorization inconsistency is under-tested | `userController`, `transactionController` | Coverage gap — critical |
| Backend thresholds are modest | 40/30/40/40 | Room for improvement |
| Frontend coverage scope is narrow | intl utils + userPreferences store only | Limited scope |
