# staff-design-system — current state

> Update this file when the real codebase state changes. Do not restate these facts inline in SKILL.md.

Last updated: 2026-05-19

## Component library (current)

```
accordion, alert, auth-shell, bullets, button, card, checkbox, collapse,
data-table, empty-state, error-state, fieldset, filter-bar, form, form-grid,
icon, input (+ integer, money, number, phone), layout, loader, modal,
page-container, pagination, password-input, select, status, table, toast, tooltip
```

## Known risks

| Risk | Location | Status |
|---|---|---|
| No explicit design token documentation | Design system as a whole | Documentation gap |
| Sandbox may drift from real component system | `frontend/src/pages/sandbox/` | Maintenance risk |
| Component API documentation is minimal | All components — only JSDoc `@summary` | Documentation gap |
| Product pages bypass the design system | `login.tsx`, `signup.tsx`, `verify-email.tsx`, `dashboard.tsx` use DaisyUI directly | Adoption gap — fix owned by `staff-frontend` |
