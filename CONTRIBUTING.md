# Contributing to Mero Jugx

Welcome to the Mero Jugx codebase. This guide covers everything you need to develop, contribute, and release changes.

---

## Local Development Setup

### Prerequisites
- Node.js 20+
- PostgreSQL 15+
- Redis 7+
- Docker Desktop (recommended)

### Quick Start

```bash
# 1. Clone
git clone https://github.com/your-org/mero-jugx.git
cd mero-jugx

# 2. Install dependencies
npm install
cd app && npm install && cd ..

# 3. Environment
cp .env.example .env
# Edit .env with your DB, Redis, JWT, email, and payment keys

# 4. Start infrastructure (Docker)
docker compose up -d postgres redis

# 5. Initialize database (migrations + seeds)
npm run db:init

# 6. Start development servers
npm run start:dev          # NestJS backend  → http://localhost:3000
cd app && npm run dev      # Vite frontend   → http://localhost:3001
```

### Useful Commands

```bash
npm run db:reset           # Drop and recreate all tables
npm run db:init            # Run migrations + seeds
npm run migration:generate -- --name=MyChange  # Generate new migration
npm run migration:run      # Apply pending migrations
npm run migration:revert   # Revert last migration
npm run seed               # Re-run seed files
npm run format             # Prettier format
npm run lint               # ESLint check
npm test                   # Unit tests
npm run test:api           # E2E API tests (requires test DB)
```

### Testing Environment

For running automated E2E tests locally:

```bash
# Create a separate test database first
createdb mero_jugx_test

# .env.test is pre-configured — just run:
npm run test:api           # All E2E tests
npm run test:auth          # Auth tests only
npm run test:accounting    # Accounting tests only
npm run test:payroll       # Payroll tests only
npm run test:inventory     # Inventory tests only
npm run test:payments      # Payments tests only
npm run test:tenancy       # Multi-tenancy isolation tests
```

> The test suite uses `mero_jugx_test` database and will never touch `mero_jugx` (safety check enforced in `api/test/helpers/setup-env.ts`).

---

## Project Structure

```
mero-jugx/
├── api/                   NestJS backend
│   ├── src/
│   │   ├── auth/          Authentication & MFA
│   │   ├── roles/         RBAC & permissions
│   │   ├── organizations/ Multi-tenancy
│   │   ├── payments/      Payment gateways
│   │   └── ...            All other modules
│   └── test/              E2E test suite
├── app/                   Vite + React frontend
│   ├── src/               Core pages & components
│   └── marketplace/       Per-app frontend modules
├── shared/                Shared TypeScript types & utils
├── packages/ui/           Shared UI component library
├── scripts/               Dev tooling & automation
├── docs/                  Architecture, DB schema, API reference
└── .github/               CI/CD workflows & branch config
```

---

## Branching Strategy

```
main           ← Production releases (protected, owner-only merge)
  └── staging  ← Pre-production QA (deployed to Railway staging)
        └── develop  ← Active development (default branch)
              ├── feature/short-description
              ├── fix/bug-description
              ├── hotfix/critical-fix
              └── chore/task-description
```

### Rules

| Branch | Who can push | Requires PR | Deployed to |
|--------|-------------|-------------|-------------|
| `main` | Owner only (via PR) | Yes — owner approval + CI | Railway production + Vercel |
| `staging` | Maintainers (via PR) | Yes — 1 approval + CI | Railway staging |
| `develop` | All contributors (via PR) | Yes — 1 approval + CI | — |
| `feature/*` `fix/*` etc. | Author | No | — |

### Daily Workflow

```bash
# 1. Always branch from develop
git checkout develop
git pull origin develop
git checkout -b feature/add-invoice-pdf

# 2. Work and commit using Conventional Commits (see below)
git add -p
git commit -m "feat(accounting): add PDF export for invoices"

# 3. Push and open PR → develop
git push origin feature/add-invoice-pdf
# Open PR on GitHub targeting develop

# 4. After merge to develop, a maintainer promotes to staging for QA
# 5. After QA sign-off, owner merges staging → main and tags the release
```

---

## Commit Message Convention

We use **Conventional Commits** (`type(scope): description`).

### Types

| Type | When to use |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `chore` | Tooling, deps, non-code changes |
| `docs` | Documentation changes |
| `refactor` | Code restructure without behavior change |
| `test` | Adding or fixing tests |
| `perf` | Performance improvements |
| `ci` | CI/CD pipeline changes |
| `hotfix` | Critical production fix |

### Scope (optional)

Use the module name: `auth`, `accounting`, `inventory`, `payroll`, `crm`, `billing`, `roles`, `chat`, `tickets`, `hr`, `board`, `cms`

### Examples

```
feat(payroll): add Nepal PF deduction calculation
fix(auth): prevent token refresh race condition
test(accounting): add VAT 13% assertion for invoices
chore: upgrade TypeORM to 0.3.20
docs: update deployment guide for Railway v2
hotfix(payments): fix eSewa callback URL in production
ci: add staging deployment workflow
```

### Breaking Changes

Add `BREAKING CHANGE:` in the commit body or append `!` after the type:

```
feat(auth)!: replace session cookies with stateless JWT

BREAKING CHANGE: All clients must update to use Authorization header.
```

---

## Pull Request Process

1. **Branch from `develop`** (or `staging` for hotfixes going to production)
2. **Keep PRs small** — one feature or fix per PR
3. **PR title** follows commit convention: `feat(scope): description`
4. **Fill in the PR template** (auto-populated on GitHub)
5. **CI must pass** before requesting review
6. **One approval minimum** for `develop`; owner approval for `staging` → `main`
7. **Squash merge** preferred to keep history clean on `develop`

---

## Versioning & Release Process

Mero Jugx follows **Semantic Versioning**: `v{MAJOR}.{MINOR}.{PATCH}`

| Type | When to bump |
|------|-------------|
| `MAJOR` | Breaking API change, major architecture change |
| `MINOR` | New feature, new app module, backward-compatible |
| `PATCH` | Bug fix, hotfix, minor improvement |

### How to Create a Release

Only the repository owner performs releases.

```bash
# 1. Ensure staging is stable and QA-approved
git checkout main
git pull origin main

# 2. Merge staging into main
git merge staging --no-ff -m "release: v1.2.0"

# 3. Create and push the version tag
git tag -a v1.2.0 -m "Release v1.2.0

Changes:
- feat(payroll): Nepal PF deduction calculation
- fix(auth): token refresh race condition
- feat(inventory): backorder management
"

git push origin main
git push origin v1.2.0

# 4. GitHub Actions automatically:
#    - Deploys to Railway production
#    - Deploys to Vercel production
#    - Creates a GitHub Release with changelog
```

### Tag Naming

| Version | Example tag | Used for |
|---------|------------|---------|
| Stable release | `v1.2.0` | Production |
| Release candidate | `v1.2.0-rc.1` | Staging QA |
| Beta | `v1.2.0-beta.1` | Early testing |
| Hotfix | `v1.2.1` | Critical patch |

### Changelog

Changelogs are auto-generated by the GitHub Actions release workflow from commit messages. Follow the commit convention above and the changelog writes itself.

---

## Adding a New App Module

### Backend

```bash
# 1. Create the NestJS module
cd api
nest generate module apps/my-new-app
nest generate service apps/my-new-app
nest generate controller apps/my-new-app

# 2. Create entities in src/database/entities/
# 3. Generate migration
npm run migration:generate -- --name=CreateMyNewAppTables

# 4. Apply migration
npm run migration:run

# 5. Register the module in AppModule
```

### Frontend

```bash
# Create directory under app/marketplace/organization/my-new-app/
# Required files:
#   MyNewAppRouter.tsx   ← main router (follows MeroCmsRouter pattern)
#   pages/
#   components/
#   layouts/

# Add alias to app/vite.config.ts:
'@my-new-app': path.resolve(__dirname, './marketplace/organization/my-new-app'),

# Add lazy import in app/src/pages/apps/AppViewPage.tsx
```

---

## Code Standards

- **TypeScript**: Prefer explicit types, avoid `any`
- **NestJS**: Use dependency injection, guards, decorators
- **React**: Functional components only, use TanStack Query for server state
- **Multi-tenancy**: Every DB query **must** include `organization_id` filter
- **Permissions**: Use `@Permissions('module.action')` decorator on all protected endpoints
- **Nepal compliance**: All financial calculations must handle VAT 13%, TDS, PF 10%+10%

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Full reset | `bash scripts/reset-all.sh` |
| DB issues | `npm run db:reset` then `npm run db:init` |
| Docker stuck | `docker compose down -v && docker volume prune -f` |
| Migration conflict | `npm run migration:revert` then fix the migration |
| Port in use | Kill process on 3000/3001 or change port in `.env` |
| Redis not connecting | Check Redis is running: `redis-cli ping` |

---

## Further Reading

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — System diagrams, module breakdown
- [docs/DATABASE.md](docs/DATABASE.md) — Entity schema, relationships
- [docs/API.md](docs/API.md) — REST API endpoints reference
- [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) — Vercel + Railway setup
- [.github/CI_CD_SETUP.md](.github/CI_CD_SETUP.md) — GitHub Actions details
