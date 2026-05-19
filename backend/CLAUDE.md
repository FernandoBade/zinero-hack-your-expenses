# Backend — Zinero

Express + Drizzle ORM + MySQL, TypeScript. Entrypoint: `src/server.ts`.

## Directory structure

```
backend/src/
├── @types/         express.d.ts — req.user and req.language type augmentation
├── controller/     HTTP orchestration — validate → call service → log → respond
├── db/             Drizzle client, schema, relations, migrations
├── dev/            Seed scripts and generators (not production code)
├── repositories/   Drizzle/MySQL query encapsulation per aggregate
├── routes/         Express route definitions with try/catch wrappers
├── service/        Business rules and orchestration
└── utils/
    ├── auth/       tokenUtils, cookieConfig, rateLimiter, tokenConfig
    ├── email/      authEmail, feedbackEmail
    ├── upload/     upload constants and helpers
    ├── validation/ validateRequest.ts + guards.ts + errors.ts
    ├── commons.ts  answerAPI, createLog, buildLogDelta, formatError
    ├── language.ts Accept-Language middleware
    ├── monetary.utils.ts  monetary arithmetic — the ONLY place for monetary math
    └── pagination.ts      parsePagination, buildMeta
```

## Layer pattern

```
routes/ → controller/ → service/ → repositories/ → Drizzle → MySQL
```

| Layer | Responsibility |
|---|---|
| Routes | Define endpoints, apply middleware — no logic |
| Controllers | Validate input, call service, `createLog()`, respond via `answerAPI()` |
| Services | All business rules — return `{ success: true; data: T } \| { success: false; error: ErrorCode }` |
| Repositories | Drizzle queries — accept `connection: typeof db = db` for transactional context |

## Key utilities

| Utility | Purpose |
|---|---|
| `answerAPI()` | The **only** response builder — never `res.json()` directly |
| `createLog()` | The **only** log entry point — `createLog(LogType, LogOperation, LogCategory)` |
| `validateRequest.*` | Input validation — returns `{ success, data } \| { success, errors }` |
| `monetary.utils.ts` | All monetary arithmetic — `MonetaryString` only, never floats |
| `withTransaction()` | Required for every multi-table write |

## Response format

```typescript
// Success
{ success: true, data: T }
// Paginated success
{ success: true, data: T[], page, pageSize, pageCount, totalItems }
// Error
{ success: false, errorCode: ErrorCode, error?, params?, field? }
```

- `ErrorCode` from `shared/errors/error-codes.ts` — never raw strings
- `FieldKey` from `shared/fields/field-keys.ts` — never raw strings
- `HTTPStatus` from `shared/enums/http-status.enums.ts` — never raw numbers

## Shared contract imports (backend)

```typescript
import { ErrorCode } from '../../../shared/errors/error-codes';
import { FieldKey } from '../../../shared/fields/field-keys';
import { LogType, LogOperation, LogCategory } from '../../../shared/enums/log.enums';
import { HTTPStatus } from '../../../shared/enums/http-status.enums';
import { MonetaryString } from '../../../shared/types/format.types';
// All domain types from shared/domains/*
// All runtime identifiers from shared/enums/*
```

## Financial consistency rule

`TransactionService` is the **only** place that mutates account/card balances. Any balance mutation outside it is a critical financial consistency risk.

## Authorization policy

Every endpoint accessing user-owned data must compare `req.user.id` against the resource owner.

Known gap: `updateUser`, `deleteUser`, `getAccounts`, `getTransactions`, and several others currently lack this check. Do not repeat this pattern in new endpoints.

## Tests

Jest, located in `backend/tests/`. Run with `npm test` from the `backend/` workspace or the repository root.

---

For deep implementation standards, review checklists, and known risks:
→ load `skills/staff-backend/SKILL.md`
