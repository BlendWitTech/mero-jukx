# System Architecture — Mero Jugx

## System Overview

```
                        ┌─────────────────────────────────────────┐
                        │              Client Browser              │
                        └──────────────────┬──────────────────────┘
                                           │ HTTPS
                        ┌──────────────────▼──────────────────────┐
                        │              Nginx (port 80/443)         │
                        │      Reverse proxy + SSL termination      │
                        └──────────┬─────────────────┬────────────┘
                                   │                 │
               ┌───────────────────▼───┐       ┌─────▼─────────────────┐
               │   React SPA (port 3001)│       │  NestJS API (port 3000)│
               │   Vite + React Router  │       │  REST /api/v1          │
               │   TypeScript           │       │  Swagger /api/docs     │
               └───────────────────────┘       └─────┬────────┬─────────┘
                                                      │        │
                                         ┌────────────▼──┐  ┌──▼──────────┐
                                         │  PostgreSQL 15 │  │   Redis 7   │
                                         │  Primary DB    │  │  Sessions + │
                                         │  95 entities   │  │  Cache      │
                                         └───────────────-┘  └─────────────┘
```

---

## Monorepo Structure

```
mero-jugx/
├── api/                          # NestJS Backend
│   ├── src/                      # Core platform modules
│   │   ├── auth/                 # JWT auth, MFA, email verification
│   │   ├── organizations/        # Org CRUD, branch management
│   │   ├── users/                # User profiles, roles
│   │   ├── apps/                 # App registry, org-app subscriptions
│   │   ├── packages/             # Subscription packages (Freemium/Pro/Enterprise)
│   │   ├── payments/             # eSewa, ConnectIPS, PayPal
│   │   ├── roles/                # RBAC engine
│   │   ├── invitations/          # Org and app invitations
│   │   ├── common/               # Guards, decorators, filters, services
│   │   ├── audit-logs/           # Audit trail
│   │   └── database/             # Entities, migrations, seeds
│   └── marketplace/              # Business application modules
│       ├── organization/
│       │   ├── mero-crm/         # CRM module
│       │   ├── mero-inventory/   # Inventory module
│       │   ├── mero-accounting/  # Accounting module
│       │   ├── mero-hr/          # HR module
│       │   ├── mero-khata/       # Simplified accounting
│       │   └── mero-cms/         # Content management
│       └── shared/
│           └── mero-board/       # Project management
│
├── app/                          # React 18 Frontend
│   ├── src/                      # Core shell
│   │   ├── pages/auth/           # Login, register, verify-email
│   │   ├── pages/dashboard/      # Main dashboard
│   │   ├── pages/apps/           # App launcher
│   │   ├── components/           # Org switcher, sidebar, header
│   │   ├── store/                # Zustand stores (auth, org)
│   │   ├── services/             # API client (Axios)
│   │   └── contexts/             # Theme, global state
│   └── marketplace/              # Per-app frontend bundles
│       ├── organization/         # Mirrors api/marketplace/organization
│       └── shared/               # Mirrors api/marketplace/shared
│
├── shared/
│   ├── frontend/components/      # 32+ shared UI components
│   │   ├── ui/                   # Button, Card, Table, Dialog, etc.
│   │   ├── layout/               # AppSidebar, TopHeader, etc.
│   │   └── feedback/             # Alert, ConfirmDialog, EmptyState
│   └── common/                   # Shared TypeScript types
│
├── scripts/                      # Setup, reset, migration scripts
├── nginx/                        # Nginx config
└── docker-compose.yml
```

---

## Multi-Tenancy Architecture

Mero Jugx uses **Shared Database, Shared Schema** multi-tenancy with row-level isolation.

### How It Works

1. **Every tenant-specific table has `organization_id UUID`** — no exceptions
2. **Every API request carries an organization context** extracted from the JWT payload
3. **Three NestJS guards run on every protected endpoint:**

```
Request → JwtAuthGuard → AppAccessGuard → PermissionsGuard → Controller
              ↓                ↓                  ↓
         Validates JWT    Checks user has     Checks user has
         extracts user    access to the       required permission
         + org context    requested app       for the action
```

### Guard Chain

```typescript
@UseGuards(JwtAuthGuard, AppAccessGuard, PermissionsGuard)
@AppSlug('mero-crm')
@RequirePermission('crm:leads:read')
```

- **`JwtAuthGuard`**: Validates JWT, attaches `req.user` and `req.organization`
- **`AppAccessGuard`**: Verifies the org has an active subscription to the app
- **`PermissionsGuard`**: Verifies the user's role has the required permission slug

### Organization Decorator

Every service receives the organization via:
```typescript
@CurrentOrganization() org: Organization
// or
req.organization.id  // in controllers
```

---

## Module Architecture

### Backend Module Pattern

Each marketplace app follows the flat-module pattern:

```typescript
// api/marketplace/organization/mero-crm/mero-crm.module.ts
@Module({
  imports: [
    TypeOrmModule.forFeature([CrmClient, CrmLead, ...]),
    AuditLogsModule,
    CommonModule,
  ],
  controllers: [ClientsController, LeadsController, ...],
  providers: [ClientsService, LeadsService, ...],
})
export class MeroCrmModule {}
```

Each module is registered in the root `AppModule` under the `/inventory/*`, `/crm/*`, etc. route namespaces.

### App Module Map

| App | Backend Module | Frontend Router | API Prefix | Status |
|-----|---------------|-----------------|------------|--------|
| Mero CRM | `MeroCrmModule` | `MeroCrmRouter` | `/api/v1/crm/` | ✅ |
| Mero Inventory | `MeroInventoryModule` | `MeroInventoryRouter` | `/api/v1/inventory/` | ✅ |
| Mero Accounting | `MeroAccountingModule` | `MeroAccountingRouter` | `/api/v1/accounting/` | ✅ |
| Mero Board | `MeroBoardModule` | `MeroBoardRouter` | `/api/v1/board/` | ✅ |
| Mero HR | `MeroHrModule` | `MeroHrRouter` | `/api/v1/hr/` | ⚠️ |
| Mero Khata | `MeroKhataModule` | `MeroKhataRouter` | `/api/v1/khata/` | ⚠️ |
| Mero CMS | `MeroCmsModule` | `MeroCmsRouter` | `/api/v1/cms/` | ✅ |

---

## Frontend Architecture

### App Shell

The React frontend has two layers:

1. **Core Shell** (`app/src/`) — authentication, org selection, app launcher, dashboard
2. **App Bundles** (`app/marketplace/`) — per-app lazy-loaded React Router sub-trees

```typescript
// App.tsx routing (simplified)
<Routes>
  <Route path="/login" element={<LoginPage />} />
  <Route element={<ProtectedRoute />}>
    <Route path="/org/:slug" element={<OrganizationDashboardLayout />}>
      <Route path="apps/mero-crm/*" element={<MeroCrmRouter />} />
      <Route path="apps/mero-inventory/*" element={<MeroInventoryRouter />} />
      ...
    </Route>
  </Route>
</Routes>
```

### State Management

| Concern | Tool | Location |
|---------|------|----------|
| Auth tokens + user | Zustand | `app/src/store/authStore.ts` |
| Organization context | Zustand | Part of authStore |
| Server data (queries) | React Query | Per-page `useQuery` hooks |
| Theme | React Context | `ThemeContext.tsx` |
| App context (per-app API) | React Context | Each app's `AppContext.tsx` |

### API Client Pattern

Each marketplace app uses an `AppContext` provider that wraps API calls with the correct organization headers:

```typescript
const { apiCall } = useAppContext();
const data = await apiCall('GET', '/crm/clients');
// → GET /api/v1/crm/clients with JWT + org headers
```

---

## Database Architecture

- **PostgreSQL 15** with UUID primary keys (all tenant entities)
- **TypeORM 0.3.x** with `synchronize: false` (migrations-only)
- **9 consolidated migration files** covering all 95 entities
- **Connection pooling**: max 20 connections, min 5

See [DATABASE.md](DATABASE.md) for full schema documentation.

---

## Authentication Flow

```
1. POST /api/v1/auth/login → validate credentials
2. Returns: { access_token (15m), refresh_token (7d), user, organization }
3. Frontend stores tokens in Zustand (memory) + localStorage
4. Every API request: Authorization: Bearer <access_token>
5. Token refresh: POST /api/v1/auth/refresh (automatic via Axios interceptor)
6. Optional MFA: TOTP via speakeasy, verified before token issuance
```

---

## Email Verification Flow

```
1. User registers → verificationToken (64-char hex) saved to email_verifications
2. Email sent with link: /verify-email?token=<hex>
3. User clicks → GET /api/v1/auth/verify-email?token=<hex>
4. Backend: raw SQL lookup → update email_verified=true
5. User can now login
6. Fallback: POST /api/v1/auth/resend-verification with email
```

---

## Infrastructure

### Docker Services

| Service | Image | Port | Purpose |
|---------|-------|------|---------|
| `postgres` | postgres:15 | 5432 | Primary database |
| `redis` | redis:7 | 6379 | Sessions, caching |
| `api` | Custom (NestJS) | 3000 | REST API |
| `app` | Custom (React/Nginx) | 3001 | Frontend SPA |

### Nginx Routing

- `/*` → React SPA (port 3001)
- `/api/*` → NestJS API (port 3000)
- `/api/docs` → Swagger UI

### Health Checks

All Docker services have health checks configured. API health endpoint: `GET /api/v1/health`

---

# System Architecture — Mero Jugx

## System Overview

```
                        ┌──────────────────────────────┐
                        │           Client Browser                │
                        └──────────────────────────────┘
                                         │ HTTPS
                        ┌──────────────────────────────┐
                        │           Nginx (80/443)                  │
                        │   Reverse proxy + SSL termination         │
                        └───────────────┬───────────────┘
                                   │                 │
               ┌───────────────┐       ┌───────────────┐
               │   React SPA (3001)   │       │  NestJS API (3000)   │
               │   Vite + React Router│       │  REST /api/v1        │
               │   TypeScript         │       │  Swagger /api/docs   │
               └───────────────┘       └───────────────┘
                                                      │        │
                                         ┌────────────┴────┐  ┌───────┐
                                         │  PostgreSQL 15 │  │   Redis 7   │
                                         │  Primary DB    │  │  Sessions + │
                                         │  100+ entities │  │  Cache      │
                                         └───────────────┘  └────────────┘
```

---

## Monorepo Structure

```
mero-jugx/
├── api/                          # NestJS Backend
│   ├── src/                      # Core platform modules
│   │   ├── auth/                 # JWT auth, MFA, email verification
│   │   ├── organizations/        # Org CRUD, hierarchy, PAN/VAT, IP whitelist
│   │   ├── users/                # User profiles, roles, permissions
│   │   ├── apps/                 # App registry, org-app subscriptions
│   │   ├── packages/             # Subscription packages (Freemium/Pro/Enterprise)
│   │   ├── payments/             # eSewa, ConnectIPS, PayPal, IME Pay
│   │   ├── roles/                # RBAC engine
│   │   ├── invitations/          # Org and app invitations
│   │   ├── common/               # Guards, decorators, filters, services
│   │   ├── audit-logs/           # Audit trail
│   │   ├── tickets/              # Ticket system (creation, assignment, SLA)
│   │   ├── chat/                 # Chat system (direct, group, admin)
│   │   ├── admin/                # Admin controls (user/app management, logs)
│   │   └── database/             # Entities, migrations, seeds
│   └── marketplace/              # Business application modules
│       ├── organization/
│       │   ├── mero-crm/         # CRM module
│       │   ├── mero-inventory/   # Inventory module
│       │   ├── mero-accounting/  # Accounting module
│       │   ├── mero-hr/          # HR module
│       │   ├── mero-khata/       # Simplified accounting
│       │   └── mero-cms/         # Content management
│       └── shared/
│           └── mero-board/       # Project management
│
├── app/                          # React 18 Frontend
│   ├── src/                      # Core shell, dashboard, admin, tickets, chat
│   └── marketplace/              # App-specific UIs (CRM, Inventory, etc.)
├── shared/                       # Shared code (types, utils, components)
├── scripts/                      # Setup, reset, migration, utility scripts
├── .github/                      # CI/CD, branch protection, access docs
```

---

## Key Integration Flows

- **Cross-app data**: CRM → Accounting, Inventory → Accounting, HR Payroll → Accounting, CMS → CRM, Inventory → CRM, CMS E-commerce → Inventory
- **Tickets/Chat**: Link tickets to CRM, Board, HR; chat linked to tickets, tasks, or users
- **Admin**: System health, user/app stats, error logs, feature toggles, impersonation, audit logs

---

## Admin Controls & Security

- **User Management**: Invite, suspend, assign roles, audit logs
- **App Management**: Enable/disable apps per org, manage subscriptions
- **Security**: IP whitelisting, 2FA, session management, access logs
- **Support Tools**: Impersonate user, manage tickets/chats, broadcast messages

---

## See Also

- [DATABASE.md](DATABASE.md): Entity and migration documentation
- [Task_List.md](Task_List.md): Roadmap and progress
- [Api.md](Api.md): API endpoints and conventions
