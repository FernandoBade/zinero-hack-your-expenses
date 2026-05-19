# staff-qa — current state

> Update this file when the real codebase state changes. Do not restate these facts inline in SKILL.md.

Last updated: 2026-05-19

## Test infrastructure

### Backend — Jest

```
backend/tests/
├── helpers/         factories.ts, mockExpress.ts, mocks/
├── integration/     userProfileRoutes.test.ts (minimal coverage)
└── unit/
    ├── controllers/ (9 files)
    ├── repositories/ (9 files)
    ├── routes/ (9 files)
    ├── services/ (11 files)
    └── utils/ (12 files)
```

- 51 suites, 858 tests
- Thresholds: 40% statements, 30% branches, 40% functions, 40% lines
- Controllers mock services; services mock repositories
- Factories: `tests/helpers/factories.ts`; Express mocks: `tests/helpers/mockExpress.ts`

### Frontend — Vitest

```
frontend/tests/
├── helpers/         factories/
├── mocks/           accessToken.mock.ts
└── unit/
    ├── architecture/    no-intl-in-pages-services.test.ts
    ├── components/      button.test.tsx (excluded from npm test)
    ├── intl/            (6 files)
    ├── pages/           login.controller.test.ts, signup.controller.test.ts
    ├── services/        auth.service.test.ts
    └── state/           userPreferences.store.test.ts (2 files)
```

- 12 executed files, 79 tests
- Coverage scope: only `src/utils/intl/**/*.ts` and `src/state/userPreferences.store.ts`

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
