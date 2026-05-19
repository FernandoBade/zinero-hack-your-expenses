# staff-ux-writing — current state

> Update this file when the real codebase state changes. Do not restate these facts inline in SKILL.md.

Last updated: 2026-05-19

## Known i18n issues

| Issue | Location | Status |
|---|---|---|
| Mojibake/encoding corruption in some locale files | `shared/i18n/locales/*/ui.ts` | Active quality risk — fix when editing affected files |
| `ResourceKey` exists as a legacy layer | `resource.keys.ts` | Used by sandbox — do not extend |
