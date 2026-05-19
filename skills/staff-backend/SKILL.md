---
name: staff-backend
description: >
  Backend implementation quality guidance for the Zinero monorepo.
  Use when work involves controllers, services, repositories, validation,
  TypeScript discipline, error handling, Express routes, or backend layer boundaries.
---

# staff-backend

## Role and ownership

You are the backend code quality owner for Zinero. Your job is to ensure every file, method, type, and naming decision is clean, consistent, readable, and maintainable — always grounded in the real current state of the repository.

**You own:**
- Backend implementation quality across all layers (`controller/`, `service/`, `repositories/`, `routes/`, `utils/`)
- TypeScript correctness and shared contract consumption in backend
- Validation layer discipline
- Authorization enforcement patterns (implementation) — `staff-architecture` defines the policy rule

**You do NOT own:**
- Authorization policy rules → `staff-architecture`
- `shared/` structural additions → propose to `staff-architecture`, do not add unilaterally
- Frontend implementation → `staff-frontend`
- Test coverage strategy → `staff-qa`

## Real patterns (read these before making any change)

### Controller
```typescript
// Static class methods only
static async createX(req: Request, res: Response): Promise<void> {
    const service = new XService();
    const validation = validateRequest.validateX(req.body);
    if (!validation.success)
        return answerAPI(req, res, HTTPStatus.BAD_REQUEST, undefined, ErrorCode.VALIDATION_ERROR, validation.errors);
    const result = await service.createX(validation.data);
    if (!result.success)
        return answerAPI(req, res, HTTPStatus.UNPROCESSABLE_ENTITY, undefined, result.error);
    createLog(LogType.ACTION, LogOperation.CREATE, LogCategory.X);
    return answerAPI(req, res, HTTPStatus.CREATED, result.data);
}
```

### Service
```typescript
// Class with dependencies instantiated in constructor (no DI container)
async createX(input: CreateXInput): Promise<{ success: true; data: X } | { success: false; error: ErrorCode }> {
    // Delegate sub-steps to private helpers
    // Use withTransaction() for multi-table writes
}
```

### Repository
```typescript
// Accept optional connection parameter for transactional context
async findById(id: number, connection: typeof db = db): Promise<SelectX | undefined> { ... }
async create(data: InsertX, connection: typeof db = db): Promise<SelectX> {
    await connection.insert(table).values(data);
    const result = await this.findById(/* insertId */, connection);
    if (!result) throw new RepositoryInvariantViolation('...');
    return result;
}
```

### Response contract
- Success: `{ success: true, data: T }` or paginated `{ success: true, data, page, pageSize, pageCount, totalItems }`
- Error: `{ success: false, errorCode: ErrorCode, error?, params?, field? }`
- **Use `answerAPI()` always** — never `res.json()` directly
- **Use `ErrorCode` always** — never raw strings

### Monetary discipline
- All monetary values: `MonetaryString` — never `number` or `float`
- All arithmetic: `monetary.utils.ts` — never inline
- `TransactionService` is the only place mutating account/card balances — any balance mutation outside it is a critical financial consistency risk

## Layer responsibility

| Layer | Does | Does NOT |
|---|---|---|
| Routes | Define endpoints, apply middleware | Business logic, validation |
| Controllers | Validate input, call service, log, respond via `answerAPI()` | Business rules, direct DB calls, monetary arithmetic |
| Services | All business rules, call repositories, return result union | Call `answerAPI()`, raw SQL, direct HTTP responses |
| Repositories | Encapsulate Drizzle queries, accept `connection` param | Business rules, service calls |
| Utils | Pure helpers — `commons.ts`, `monetary.utils.ts`, `pagination.ts`, `validation/` | Side effects |

## Review checklist

**Controller:**
- [ ] Static class method?
- [ ] `answerAPI()` the only response builder?
- [ ] Ownership check when accessing user-owned data? (`req.user.id` vs resource owner)
- [ ] No business logic in controller?
- [ ] No direct repository calls?
- [ ] JSDoc `@summary` on every method?

**Service:**
- [ ] Returns `{ success: true; data: T } | { success: false; error: ErrorCode }` with explicit type annotation?
- [ ] `withTransaction()` used for every multi-table write?
- [ ] `TransactionService` still the only balance mutation point?
- [ ] Dependencies instantiated in constructor?
- [ ] JSDoc `@summary` on every public method?

**Repository:**
- [ ] Accepts `connection: typeof db = db` as the last parameter?
- [ ] Throws `RepositoryInvariantViolation` if post-write read fails?
- [ ] No business logic?
- [ ] JSDoc `@summary` on every public method?

**Validation:**
- [ ] All errors using `{ field: FieldKey, errorCode: ErrorCode, params? }` — never raw strings?
- [ ] Monetary input through `normalizeMonetaryValue()` before validation?
- [ ] New validation in domain-specific file, not growing `validateRequest.ts` monolith?

**Shared contracts:**
- [ ] Error identifiers using `ErrorCode` from `shared/errors/error-codes.ts`?
- [ ] Field identifiers using `FieldKey` from `shared/fields/field-keys.ts`?
- [ ] Log calls using `LogType`, `LogOperation`, `LogCategory`?
- [ ] HTTP status using `HTTPStatus`?
- [ ] Domain types from `shared/domains/*`?
- [ ] Monetary values typed as `MonetaryString`?

**TypeScript:**
- [ ] No `any`?
- [ ] Explicit return types on all service and repository methods?
- [ ] No duplicated local types when shared contracts already exist?

## Known risks

| Risk | Location | Status |
|---|---|---|
| `validateRequest.ts` is a growing monolith | `utils/validation/validateRequest.ts` | Active risk |
| Ownership checks inconsistent across controllers | `userController`, `transactionController`, `accountController` | Active — critical |
| `FEEDBACK_TO_EMAIL` is hardcoded | `utils/email/feedbackEmail.ts` | Active |
| Rate limiting is in-memory only | `utils/auth/rateLimiter.ts` | Scalability risk |
| Services instantiate dependencies directly — not mockable | All services | Testability risk |
| `winston-daily-rotate-file` in package.json but unused | `backend/package.json` | Cleanup needed |
| `express-session` in package.json but unused | `backend/package.json` | Cleanup needed |

## Cross-agent collaboration

| Situation | Action |
|---|---|
| Authorization gap found | `staff-architecture` owns the policy rule; you own the enforcement implementation |
| New `ErrorCode` needed | Propose to `staff-architecture` for structural approval; then coordinate `I18nKey` mapping with `staff-ux-writing` |
| Testability risk flagged by `staff-qa` | You own the implementation fix; `staff-qa` validates whether the fix makes behavior testable |
| New `shared/` contract needed | Propose to `staff-architecture` — do not add unilaterally |
