# Developer Guide

## Prerequisites
- Node.js (v18+)
- PostgreSQL (v15+)
- Redis (v7+)
- npm
- Docker Desktop (recommended for easiest setup)

---

## Setup Procedure

### 1. Clone the Repository
```bash
git clone https://github.com/your-org/mero-jugx.git
cd mero-jugx
```

### 2. Install Dependencies
```bash
npm install
cd app && npm install && cd ..
```

### 3. Environment Setup
- Copy `.env.example` to `.env` (or run `bash scripts/create-env.sh`)
- Edit `.env` with your DB, SMTP, JWT, and payment secrets

### 4. Database Initialization
- **Docker**: `docker compose up -d postgres redis`
- **Manual**: Start PostgreSQL and Redis locally
- Run: `npm run db:init` (creates tables, seeds data)

### 5. Start Development Servers
- **Backend**: `npm run start:dev`
- **Frontend**: `cd app && npm run dev`

---

## Project Structure

- `api/`: NestJS backend (core platform, business modules, tickets, chat, admin)
- `app/`: Vite/React frontend (dashboard, apps, admin, tickets, chat)
- `shared/`: Shared TypeScript types, utils, components
- `scripts/`: Setup, reset, migration, utility scripts
- `.github/`: CI/CD, branch protection, collaborator docs

---

## Development Workflow

### Adding a New Feature
- Create a new module if standalone (use `nest generate ...` for backend)
- Define entities, create migration (`npm run migration:generate --name=Description`)
- Apply migration: `npm run migration:run`
- For frontend, use shared components and service wrappers

### Branching & Collaboration
- Follow [BRANCH_STRATEGY.md](.github/BRANCH_STRATEGY.md)
- All merges via PR, CI must pass, at least one approval
- See [COLLABORATOR_ACCESS.md](.github/COLLABORATOR_ACCESS.md)

### Coding Standards
- **TypeScript**: Use strict typing, avoid `any`
- **Formatting**: Run `npm run format`
- **Linting**: Run `npm run lint`
- **Commits**: Use descriptive messages (e.g., `feat: add ticket system`)

### Testing
- **Unit Tests**: `npm test`
- **E2E Tests**: `npm run test:e2e`
- **Integration Tests**: Add for all new modules

### Deployment
- Use Docker Compose for local/production parity: `docker compose up --build`
- CI/CD pipelines auto-deploy to AWS, Railway, or Vercel (see [CI_CD_SETUP.md](.github/CI_CD_SETUP.md))

---

## Troubleshooting & Tips

- **Full Reset**: `bash scripts/reset-all.sh` (removes everything, including Docker volumes)
- **Manual Setup**: See `scripts/setup-manual.sh` for step-by-step prompts
- **Docker Issues**: If containers/volumes persist, run `docker compose down -v` and `docker volume prune`
- **Database Issues**: Use `npm run db:reset` to drop and recreate tables
- **Logs**: Check `logs/` directory and `error-log.txt` for backend issues

---

## See Also
- [README.md](README.md): Quick start and overview
- [ARCHITECTURE.md](ARCHITECTURE.md): System diagrams, module breakdown
- [DATABASE.md](DATABASE.md): Entity and migration documentation
- [Api.md](Api.md): API endpoints and conventions
- [Task_List.md](Task_List.md): Roadmap, progress, priorities
- [shared/README.md](shared/README.md): Shared code usage
