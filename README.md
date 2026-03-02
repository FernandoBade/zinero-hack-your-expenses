<div align="center">
  <img src="shared/assets/images/ZINERO by Badixy_transparent_vertical.png" alt="Zinero" width="320" />
</div>

# 💸Zinero - Hack your expenses!

Zinero is a TypeScript-based personal finance platform focused on turning raw transactions into structured financial understanding.

This repository is a **monorepo** with a backend-first architecture: domain rules are defined in the API, shared contracts live in `shared/`, and the frontend mirrors the same mental model for consistency.

---

## Why Zinero Exists

Zinero started with a question that gave me a mild sense of panic during the pandemic: how much had I spent on snacks and Coca-Cola that year?

I wanted just one number. Something simple. But getting that answer turned into a side project on its own. I went through spreadsheets, ChatGPT, free apps, paid apps, exported bank CSVs, and card invoices, and still nothing felt truly clear. It felt like I was working to understand my own money, and that should not be this frustrating.

At the time, I was just beginning to study programming and did not yet have the technical foundation to build anything better. So that discomfort stayed with me.

Years later, with more experience, I came back to that old pain and decided to build this the way I always wanted to use it. I started carefully, designing the architecture, modeling the data properly, and organizing the foundation to scale. So far, this project has taken more than 300 hours across study, testing, code, design, and a lot of learning.

This is a personal project. I want to use it in my own life. And every time I mention it to friends, someone says, "I would definitely use this" or "I really need something like this." Deep down, I think many people have asked themselves questions like "How much did I spend on iFood this year?" or "How much did that trip to Macaé really cost?"

The goal is for Zinero to truly come to life in 2026, and I am very close to launching the beta version. I also want to include AI in a thoughtful way, to help identify patterns, anticipate behavior, and generate the kind of insights that make you think, "Now this makes sense."

    ✨ Sometimes what stands between a dream and reality is not earning more, but organizing better.

In the end, everything started with a simple question and a small frustration. It became something I am building with care, curiosity, and, honestly, a lot of excitement.

---

### **Overview** 🧭

Most personal finance tools are reactive. They track numbers, but rarely provide structural clarity or a reliable foundation for intelligent decision-making.

Zinero addresses this with:

- Strong domain modeling
- Clean architectural boundaries
- Shared typed contracts across backend and frontend
- Long-term scalability over short-term feature shortcuts

---

### **Monorepo Structure** 📦

| Workspace | Purpose |
|---|---|
| `backend/` | Node.js + TypeScript API, source of truth for business/domain rules |
| `frontend/` | Preact + Vite app that consumes backend APIs and shared contracts |
| `shared/` | Shared contracts: enums, domain types, i18n keys, and reusable assets |
| `mobile/` | Soon we will be talking about this ;) |

Root workspaces are managed via npm workspaces in [`package.json`](package.json).

---

### **Architecture Snapshot** 🧱

#### Backend (`backend/src`)

- `routes/` - HTTP route definitions
- `controller/` - request/response orchestration
- `service/` - business use cases
- `repositories/` - persistence and data access
- `db/` - schema, client, and migrations
- `utils/` - cross-cutting utilities

#### Frontend (`frontend/src`)

- `pages/` - screen composition and page-level controllers
- `services/` - frontend use cases
- `api/` - HTTP client layer
- `routes/` - routing and navigation control
- `platform/` - native-ready abstractions (storage/network/back-button)
- `components/` - reusable UI components
- `state/` - global stores

#### Shared (`shared/`)

- `domains/`, `types/`, `enums/`, `i18n/`, `assets/`

This keeps contracts aligned across layers and reduces integration drift. ✅

---

### **Tech Stack** ⚙️

#### Backend

- Node.js
- TypeScript
- Express
- MySQL
- Drizzle ORM
- Jest
- ESLint

#### Frontend

- Preact
- Vite
- TypeScript
- Wouter (history-based router)
- TailwindCSS + DaisyUI
- Vitest

---

### **Getting Started** 🚀

#### 1. Prerequisites

- Node.js (LTS recommended)
- npm
- MySQL instance available

#### 2. Install dependencies (root)

```bash
npm install
```

#### 3. Configure environment files

Backend uses `backend/.env`.

Required keys used by the backend runtime include:

- `PORT`, `CORS_ORIGINS`
- `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_DATABASE`
- `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`
- `JWT_ISSUER`, `JWT_AUDIENCE` (optional but supported)
- `FRONTEND_BASE_URL`
- `RESEND_API_KEY`, `RESEND_FROM_EMAIL`
- `FTP_HOST`, `FTP_PORT`, `FTP_USER`, `FTP_PASSWORD`, `FTP_UPLOAD_PATH`
- `AVATAR_PUBLIC_BASE_URL`
- `NODE_ENV`

Frontend uses `frontend/.env.development` and `frontend/.env.production`.

Required key:

- `VITE_API_BASE_URL`

#### 4. Run full development stack from root

```bash
npm run dev
```

This runs backend migrations and starts API + frontend together.

---

### **Root Scripts** 🧪

- `npm run dev:full` - full local stack (migrate + backend + frontend)
- `npm run dev:backend` - API only
- `npm run dev:frontend` - current frontend only
- `npm run dev:frontend:old` - legacy frontend only
- `npm run db:migrate` - run backend migrations
- `npm run db:sync` - generate + migrate backend schema
- `npm run seed` / `seed:10` / `seed:100` / `seed:1000` - seed database
- `npm run lint` - lint all workspaces
- `npm run test` - run all workspace tests
- `npm run test:coverage` - run coverage in all workspaces
- `npm run build` - lint + build all workspaces

---

### **Roadmap** 🎯

- Beta release in 2026
- Advanced analytics layer
- AI-assisted pattern recognition and insights
- Budget forecasting models
- Expanded API surface (REST and/or GraphQL)
- Authentication hardening and user management evolution
- Multi-tenant support
- Observability and monitoring improvements
- Build the mobile version

---

### **License** 📃

This project is licensed under the Zinero Non-Commercial License.

#### Summary

You may:

- Use the project for personal and educational purposes
- Study and modify the code for non-commercial use

You may NOT:

- Sell the project or any derivative work
- Offer it as a paid service (SaaS or otherwise)
- Monetize modified versions
- Use the code in commercial or revenue-generating systems

Commercial use of any kind is strictly prohibited.

For full terms, see the `LICENCE` file in the root of this repository.

---

### Final Note

Zinero is more than a financial tracker.

It is an architectural foundation built with product thinking, technical depth, and long-term scalability in mind.

Hack your expenses. 💸
