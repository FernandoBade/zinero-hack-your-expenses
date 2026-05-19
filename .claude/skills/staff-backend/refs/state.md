# staff-backend — current state

> Update this file when the real codebase state changes. Do not restate these facts inline in SKILL.md.

Last updated: 2026-05-19

## Known risks

| Risk | Location | Status |
|---|---|---|
| `validateRequest.ts` is a growing monolith | `utils/validation/validateRequest.ts` | Active risk |
| Ownership checks missing on several controllers | `userController`, `transactionController`, `accountController` | Active — critical |
| `FEEDBACK_TO_EMAIL` is hardcoded | `utils/email/feedbackEmail.ts` | Active |
| Rate limiting is in-memory only | `utils/auth/rateLimiter.ts` | Scalability risk |
| Services instantiate dependencies directly — not mockable | All services | Testability risk |
| `winston-daily-rotate-file` in package.json but unused | `backend/package.json` | Cleanup needed |
| `express-session` in package.json but unused | `backend/package.json` | Cleanup needed |
