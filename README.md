# Mero Jugx — Nepal's Business Operating System

Mero Jugx is a **multi-tenant ERP SaaS platform** for Nepal, bundling CRM, Inventory, Accounting, HR, Khata, Project Management, CMS, Social, Ticketing, and Chat under one subscription. It features unified authentication, role-based access, and Nepal-specific compliance.

---

## 🚀 Applications & Features

| App                | Status              | Key Features |
|--------------------|--------------------|--------------|
| **Mero CRM**       | ✅ Production Ready | Leads, Deals, Clients, Pipeline, Invoices, Quotes, Activities, Reports, Lead Scoring, Automation |
| **Mero Inventory** | ✅ Production Ready | Products, Warehouses, Stock, POs, GRN, Serial/Batch, Backorders, Commission, Audit, Aging Analysis |
| **Mero Accounting**| ✅ Production Ready | Chart of Accounts, Journal Entries, Invoices, Fixed Assets, Budgets, Banking, Tax/TDS, Excise, Year-End Closing |
| **Mero Board**     | ✅ Production Ready | Kanban, Gantt, Projects, Tasks, Tickets, Calendar, WIP, Privacy, Import/Export |
| **Mero HR**        | ⚠️ Beta            | Employees, Departments, Attendance, Payroll, Leave, Shifts, Recruitment, Performance, Training, Exit Management |
| **Mero Khata**     | ⚠️ Beta            | Ledger, Bank Reconciliation, Invoicing, VAT, Reports, WhatsApp Sharing |
| **Mero CMS**       | ✅ Production Ready | Pages, Posts, Media, Forms, Website Builder, SEO, E-commerce |
| **Mero Social**    | 🔧 In Progress      | Communication, Channels, Direct Messages, Announcements |
| **Ticket System**  | 🔧 In Progress      | Ticket creation, assignment, SLA, escalation, reporting |
| **Chat System**    | 🔧 In Progress      | Direct/group chat, file sharing, notifications, admin chat |

---

## 🏗️ Architecture & Tech Stack

See [ARCHITECTURE.md](ARCHITECTURE.md) for diagrams and details.

| Layer         | Technology |
|---------------|------------|
| **API**       | NestJS 10, TypeScript, TypeORM |
| **Database**  | PostgreSQL 15 |
| **Cache**     | Redis 7 |
| **Frontend**  | React 18, Vite, TypeScript, Tailwind CSS |
| **State**     | Zustand, React Query |
| **Auth**      | JWT, bcrypt, MFA (TOTP) |
| **Email**     | Nodemailer (SMTP) |
| **Payments**  | eSewa, ConnectIPS, PayPal, IME Pay |
| **Infra**     | Docker, Nginx, Docker Compose |

---

## 📝 Roadmap & Progress

See [Task_List.md](Task_List.md) for a detailed, prioritized breakdown of all features, modules, and completion status. Major remaining work:

- Mobile App (React Native/Flutter)
- Cross-app data integration (CRM, Inventory, Accounting, HR, CMS)
- Ticket & Chat systems
- Admin dashboard & controls
- Testing, documentation, Nepal localization

---

## 🛠️ Local Development & Setup

### Prerequisites
- Docker Desktop (recommended for easiest setup)
- Node.js 18+
- Git

### Quick Start (Docker)

```bash
# 1. Clone the repo
git clone https://github.com/your-org/mero-jugx.git
cd mero-jugx

# 2. Setup environment
cp .env.example .env
# Or run: bash scripts/create-env.sh
# Edit .env with your SMTP, DB, JWT, and payment secrets

# 3. Start all services (API, frontend, DB, Redis)
docker compose up --build

# 4. Initialize database (first time only)
docker compose exec api npm run db:init

# 5. Visit the app
open http://localhost:3001
```

### Manual Setup (No Docker)

See [Developer_Guide.md](Developer_Guide.md) and run:

```bash
# 1. Install dependencies
npm install
cd app && npm install && cd ..

# 2. Setup environment
cp .env.example .env
# Edit .env with your DB, SMTP, JWT, payment secrets

# 3. Start PostgreSQL and Redis locally
# 4. Initialize database
npm run db:init

# 5. Start servers
npm run start:dev
cd app && npm run dev
```

---

## 🧑‍💻 Contributing & Branching

- See [Developer_Guide.md](Developer_Guide.md) for coding standards, commit conventions, and workflow
- Branching strategy: [BRANCH_STRATEGY.md](.github/BRANCH_STRATEGY.md)
- CI/CD pipeline: [CI_CD_SETUP.md](.github/CI_CD_SETUP.md)
- Collaborator access: [COLLABORATOR_ACCESS.md](.github/COLLABORATOR_ACCESS.md)

---

## 🛡️ Admin & Security

- Admin dashboard: system health, user/app stats, error logs, feature toggles
- User management: invite, suspend, assign roles, audit logs
- App management: enable/disable apps per org, manage subscriptions
- Security: IP whitelisting, 2FA, session management, access logs
- Support tools: impersonate user, manage tickets/chats

---

## 📚 Documentation

- [ARCHITECTURE.md](ARCHITECTURE.md): System diagrams, module breakdown
- [DATABASE.md](DATABASE.md): Entity and migration documentation
- [Api.md](Api.md): API endpoints and conventions
- [Task_List.md](Task_List.md): Roadmap, progress, priorities
- [Developer_Guide.md](Developer_Guide.md): Setup, workflow, troubleshooting
- [shared/README.md](shared/README.md): Shared code usage

---

## ❓ Troubleshooting

- If Docker reset does not remove all containers/volumes, run:
	- `docker compose down -v`
	- `docker volume prune`
- For manual DB/Redis setup, see [setup-manual.sh](scripts/setup-manual.sh)
- For full reset, use `bash scripts/reset-all.sh` (removes everything, including Docker volumes)

---

## 🏁 Ready to get started?

1. Clone the repo and follow the setup above
2. Check [Task_List.md](Task_List.md) for current progress and priorities
3. See [Developer_Guide.md](Developer_Guide.md) for coding and contribution guidelines
4. Join the team and help build Nepal’s best business platform!

# Services running at:
# Frontend: http://localhost:3001
# API:      http://localhost:3000/api/v1
# Swagger:  http://localhost:3000/api/docs
```

### Development (without Docker)

```bash
# Start PostgreSQL + Redis via Docker, run API + App locally
docker compose up postgres redis -d

# API
cd api && npm install && npm run start:dev

# Frontend
cd app && npm install && npm run dev
```

---

## Project Structure

```
mero-jugx/
├── api/                    # NestJS backend
│   ├── src/                # Core: auth, orgs, users, packages, payments
│   ├── marketplace/        # Per-app modules
│   │   ├── organization/   # mero-crm, mero-inventory, mero-accounting, mero-hr, mero-khata, mero-cms
│   │   └── shared/         # mero-board, mero-social
│   └── Dockerfile
├── app/                    # React 18 frontend
│   ├── src/                # Core shell (auth, org switcher, dashboard)
│   ├── marketplace/        # Per-app UIs (mirrors api/marketplace structure)
│   └── Dockerfile
├── shared/                 # Shared frontend components and types
│   ├── frontend/components/ # 32+ reusable UI components
│   └── common/             # Shared TypeScript types
├── scripts/                # Setup and utility scripts
├── nginx/                  # Nginx reverse proxy config
└── docker-compose.yml      # Full stack orchestration
```

---

## Environment Variables

### Backend (`api/.env` or root `.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `NODE_ENV` | ✅ | `development` or `production` |
| `PORT` | ✅ | API port (default: 3000) |
| `JWT_SECRET` | ✅ | Min 32-char random string |
| `JWT_EXPIRES_IN` | ✅ | Access token TTL (e.g. `15m`) |
| `REFRESH_TOKEN_EXPIRES_IN` | ✅ | Refresh token TTL (e.g. `7d`) |
| `DB_HOST` | ✅ | PostgreSQL host |
| `DB_PORT` | ✅ | PostgreSQL port (default: 5432) |
| `DB_USER` | ✅ | PostgreSQL username |
| `DB_PASSWORD` | ✅ | PostgreSQL password |
| `DB_NAME` | ✅ | Database name (default: `mero_jugx`) |
| `REDIS_HOST` | ✅ | Redis host |
| `REDIS_PORT` | | Redis port (default: 6379) |
| `REDIS_PASSWORD` | | Redis password |
| `SMTP_HOST` | ✅ | SMTP server |
| `SMTP_PORT` | ✅ | SMTP port (587 or 465) |
| `SMTP_USER` | ✅ | SMTP username |
| `SMTP_PASS` | ✅ | SMTP password |
| `SMTP_FROM` | ✅ | From address |
| `FRONTEND_URL` | ✅ | Frontend base URL for email links |

### Frontend (`app/.env`)

| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | API base URL (e.g. `http://localhost:3000/api/v1`) |
| `VITE_APP_NAME` | App display name |

---

## Database

- **95 entities** across 9 domains
- **9 consolidated migrations** (run automatically on startup)
- **7 seed files** (packages, permissions, roles, chart-of-accounts)
- Multi-tenant isolation via `organization_id` on every table

See [DATABASE.md](DATABASE.md) for the full schema reference.

---

## Architecture

Mero Jugx uses a **modular monolith** pattern where each business application (CRM, Inventory, etc.) lives in its own NestJS module with its own controllers, services, and TypeORM entities — but all share a single PostgreSQL database with row-level tenant isolation.

See [ARCHITECTURE.md](ARCHITECTURE.md) for the detailed system design.

---

## Deployment

### Docker Compose (recommended for self-hosting)
```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

### Railway (cloud)
- Connect your GitHub repo to Railway
- Set all environment variables in Railway dashboard
- Railway auto-detects `Procfile` and deploys

### Vercel + Railway (hybrid)
- Deploy `app/` to Vercel (static frontend)
- Deploy `api/` to Railway (NestJS backend)
- Set `VITE_API_URL` in Vercel to point to Railway API URL

---

## Documentation

| Document | Description |
|----------|-------------|
| [ARCHITECTURE.md](ARCHITECTURE.md) | System design, module structure, data flow |
| [DATABASE.md](DATABASE.md) | Schema reference, entity domains, migration strategy |
| [Api.md](Api.md) | Full API endpoint reference |
| [Developer_Guide.md](Developer_Guide.md) | Development workflow, adding new apps |
| [.github/BRANCH_STRATEGY.md](.github/BRANCH_STRATEGY.md) | Git branching and PR conventions |

### Per-App Documentation

| App | Docs |
|-----|------|
| Mero CRM | [README](api/marketplace/organization/mero-crm/README.md) · [API](api/marketplace/organization/mero-crm/Api.md) |
| Mero Inventory | [README](api/marketplace/organization/mero-inventory/README.md) · [API](api/marketplace/organization/mero-inventory/Api.md) |
| Mero Accounting | [README](api/marketplace/organization/mero-accounting/README.md) · [API](api/marketplace/organization/mero-accounting/Api.md) |
| Mero HR | [README](api/marketplace/organization/mero-hr/README.md) · [API](api/marketplace/organization/mero-hr/Api.md) |
| Mero Khata | [README](api/marketplace/organization/mero-khata/README.md) · [API](api/marketplace/organization/mero-khata/Api.md) |
| Mero Board | [README](api/marketplace/shared/mero-board/README.md) · [API](api/marketplace/shared/mero-board/Api.md) |
| Mero CMS | [README](api/marketplace/organization/mero-cms/README.md) · [API](api/marketplace/organization/mero-cms/Api.md) |

---

## Contributing

1. Fork and create a feature branch from `main`
2. Follow the [Branch Strategy](.github/BRANCH_STRATEGY.md)
3. Run `npm run lint` and `npm run build` before PR
4. All PRs require review before merge

---

## License

Proprietary — Blendwit Pvt. Ltd. All rights reserved.
