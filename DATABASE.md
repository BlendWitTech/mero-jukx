
# Database Documentation — Mero Jugx

## Overview

- **Database**: PostgreSQL 15
- **ORM**: TypeORM 0.3.x (`synchronize: false` — migrations only)
- **Primary keys**: UUID everywhere (tenant entities), SERIAL for reference/lookup tables
- **Multi-tenancy**: Shared schema with `organization_id` row-level isolation on every tenant table
- **Total entities**: 100+ across 12 domains
- **Connection pool**: max 20, min 5

---

## Domain Map

| Domain | Tables | Key Entities |
|--------|--------|--------------|
| **Core Platform** | 26 | `users`, `organizations`, `packages`, `apps`, `roles`, `payments`, `audit_logs` |
| **Mero Board** | 12 | `boards`, `tasks`, `tickets`, `board_workspaces`, `board_projects` |
| **Mero CRM** | 13 | `crm_clients`, `crm_leads`, `crm_deals`, `crm_invoices`, `crm_quotes` |
| **Mero Inventory** | 15 | `products`, `warehouses`, `purchase_orders`, `shipments`, `serial_numbers` |
| **Mero Accounting** | 20 | `accounts`, `journal_entries`, `sales_invoices`, `fixed_assets`, `budgets` |
| **Mero HR** | 10 | `hr_employees`, `hr_attendance`, `hr_payroll`, `hr_departments` |
| **Mero Khata** | 6 | `khata_customers`, `khata_transactions`, `khata_suppliers` |
| **Mero CMS** | 6 | `cms_pages`, `cms_posts`, `cms_forms`, `cms_media` |
| **Communication** | 10 | `chats`, `messages`, `admin_chats`, `call_sessions` |
| **Ticket System** | 6 | `tickets`, `ticket_comments`, `ticket_attachments`, `ticket_categories`, `ticket_statuses`, `ticket_sla` |
| **Chat System** | 5 | `chats`, `chat_messages`, `chat_participants`, `chat_files`, `admin_chats` |
| **Admin** | 4 | `admin_users`, `admin_logs`, `feature_flags`, `system_health` |

---


## Migration Strategy

### File Layout (after consolidation)

Migrations live in `api/src/database/migrations/` and are loaded by the glob pattern `[0-9]*-*{.ts,.js}`.

| File | Description |
|------|-------------|
| `2000000000001-CoreSchema.ts` | All platform-level tables (auth, orgs, apps, payments, chat, admin, tickets) |
| `2000000000002-MeroBoardSchema.ts` | Boards, tasks, tickets, workspaces, projects |
| `2000000000003-MeroCrmSchema.ts` | CRM clients, leads, deals, invoices, quotes |
| `2000000000004-MeroInventorySchema.ts` | Products, warehouses, stock, POs, shipments, advanced |
| `2000000000005-MeroAccountingSchema.ts` | Accounts, journal entries, invoices, assets, banking |
| `2000000000006-MeroKhataSchema.ts` | Simplified ledger: customers, transactions, suppliers |
| `2000000000007-MeroHrSchema.ts` | Employees, attendance, payroll, leave, departments |
| `2000000000008-MeroCmsSchema.ts` | Pages, posts, media, forms, settings |
| `2000000000009-SeedData.ts` | App registrations and role/permission seed data |

### Idempotency Pattern

Every migration file checks table existence before creating:

```typescript
if (!(await queryRunner.hasTable('table_name'))) {
  await queryRunner.query(`CREATE TABLE "table_name" (...)`);
}
// For column additions:
const table = await queryRunner.getTable('table_name');
if (table && !table.findColumnByName('column_name')) {
  await queryRunner.addColumn('table_name', new TableColumn({...}));
}
```

---

## Key Entities (New/Updated)

### Ticket System
- `tickets`: id, organization_id, created_by, assigned_to, status_id, category_id, priority, subject, description, created_at, updated_at, closed_at
- `ticket_comments`: id, ticket_id, user_id, comment, created_at
- `ticket_attachments`: id, ticket_id, file_url, uploaded_by, uploaded_at
- `ticket_categories`: id, name, description
- `ticket_statuses`: id, name, is_closed
- `ticket_sla`: id, ticket_id, response_due, resolution_due, escalated

### Chat System
- `chats`: id, organization_id, type (direct/group/admin), created_by, created_at
- `chat_messages`: id, chat_id, sender_id, message, file_url, sent_at
- `chat_participants`: id, chat_id, user_id, joined_at
- `chat_files`: id, chat_id, file_url, uploaded_by, uploaded_at
- `admin_chats`: id, admin_id, chat_id

### Admin
- `admin_users`: id, user_id, role, created_at
- `admin_logs`: id, admin_id, action, target_type, target_id, details, created_at
- `feature_flags`: id, name, enabled, description
- `system_health`: id, metric, value, checked_at

---

## Integration Flows

- **Tickets** can be linked to CRM clients, Board tasks, HR employees
- **Chat** can be linked to tickets, tasks, or users
- **Admin** can impersonate users, manage tickets/chats, broadcast messages

---

## See Also

- [ARCHITECTURE.md](ARCHITECTURE.md): System diagrams, module breakdown
- [Task_List.md](Task_List.md): Roadmap and progress
- [Api.md](Api.md): API endpoints and conventions

Enum types use `DO $$ BEGIN ... IF NOT EXISTS ... END $$;` blocks to prevent duplicate-type errors.

---

## Seed Files

Seeds live in `api/src/database/seeds/` and run via `npm run seed`:

| File | Description |
|------|-------------|
| `001-packages.seed.ts` | Freemium, Basic, Platinum, Diamond subscription tiers |
| `002-permissions.seed.ts` | All RBAC permission slugs for all 8 apps |
| `003-roles.seed.ts` | System roles (Owner, Admin, Member) per organization |
| `004-package-features.seed.ts` | Feature flags per subscription package |
| `005-role-templates.seed.ts` | Default role templates with permission sets |
| `006-system-admin.seed.ts` | Creates the initial system admin user |
| `007-nepal-chart-of-accounts.seed.ts` | Standard Nepal COA seeded to system accounts |

> App registration data (which apps exist) is seeded in migration `2000000000009-SeedData.ts` for atomic delivery with schema.

---

## Entity Reference

### Core Platform

#### `users`
| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `email` | varchar(255) UNIQUE | |
| `password_hash` | varchar(255) | bcrypt |
| `first_name` | varchar(100) | |
| `last_name` | varchar(100) | |
| `email_verified` | boolean DEFAULT false | |
| `email_verified_at` | timestamp | |
| `is_system_admin` | boolean DEFAULT false | |
| `system_admin_role` | varchar(50) | |
| `mfa_enabled` | boolean DEFAULT false | |
| `mfa_secret` | varchar(255) | |
| `mfa_backup_codes` | json | |
| `status` | enum(active, suspended, deleted) | |
| `created_at` / `updated_at` / `deleted_at` | timestamp | soft delete |

#### `organizations`
| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `name` | varchar(255) | |
| `slug` | varchar(100) UNIQUE | URL-safe identifier |
| `email` | varchar(255) | nullable |
| `phone` | varchar(50) | |
| `logo_url` | varchar(500) | |
| `package_id` | integer FK→packages | |
| `package_expires_at` | timestamp | |
| `package_auto_renew_credentials` | text | encrypted |
| `email_verified` | boolean DEFAULT false | |
| `status` | enum(active, suspended, cancelled) | |
| `org_type` | enum(MAIN, BRANCH) | |
| `parent_id` | UUID FK→organizations | nullable, for branches |
| `branch_limit` | integer DEFAULT 1 | |
| `currency` | varchar(10) DEFAULT 'NPR' | |
| `timezone` | varchar(100) | |
| `language` | varchar(10) DEFAULT 'en' | |
| `date_format` | varchar(20) | |
| `tax_id`, `registration_number`, `industry` | varchar | |

#### `packages`
| Column | Type | Notes |
|--------|------|-------|
| `id` | SERIAL PK | |
| `name` | varchar(100) | |
| `slug` | varchar(100) UNIQUE | freemium/basic/platinum/diamond |
| `price` | decimal(10,2) | |
| `billing_period` | varchar(20) | |
| `base_branch_limit` | integer | |
| `features` | jsonb | |
| `max_users` | integer | |
| `max_storage_gb` | decimal | |

#### `roles`
| Column | Type | Notes |
|--------|------|-------|
| `id` | SERIAL PK | |
| `organization_id` | UUID FK | nullable for system roles |
| `app_id` | integer FK→apps | nullable for org-level roles |
| `name` | varchar(100) | |
| `slug` | varchar(100) | |
| `is_system_role` | boolean | |
| `is_organization_owner` | boolean | |
| `hierarchy_level` | integer | Owner=1, Admin=2, custom≥3 |

#### `permissions`
| Column | Type | Notes |
|--------|------|-------|
| `id` | SERIAL PK | |
| `name` | varchar(100) | |
| `slug` | varchar(100) UNIQUE | e.g. `crm:leads:create` |
| `category` | varchar(100) | |

#### `sessions`
| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `user_id` | UUID FK | |
| `organization_id` | UUID FK | nullable |
| `refresh_token` | varchar(500) | |
| `expires_at` | timestamp | 7-day TTL |
| `ip_address` | varchar(45) | |

#### `email_verifications`
| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `user_id` | UUID FK | |
| `email` | varchar(255) | |
| `token` | varchar(128) UNIQUE | 64-char hex |
| `type` | enum(registration, organization_email, password_reset) | |
| `expires_at` | timestamp | |
| `verified_at` | timestamp | nullable |

#### `apps`
| Column | Type | Notes |
|--------|------|-------|
| `id` | SERIAL PK | |
| `name` | varchar(255) | |
| `slug` | varchar(100) UNIQUE | e.g. `mero-crm` |
| `category` | varchar(100) | |
| `status` | enum(active, inactive, maintenance) | |
| `target_audience` | enum(organization, creator, both) | |
| `features` | json | displayed in app launcher |
| `permissions` | json | permission slugs for this app |

#### `organization_apps`
| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `organization_id` | UUID FK | |
| `app_id` | integer FK→apps | |
| `status` | enum(active, inactive, pending_payment) | |
| `installed_at` | timestamp | |

#### `payments`
| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `organization_id` | UUID FK | |
| `transaction_id` | varchar(255) UNIQUE | |
| `gateway` | enum(esewa, stripe) | |
| `payment_type` | enum(package_upgrade, subscription, one_time) | |
| `amount` | decimal(10,2) | |
| `currency` | varchar(10) DEFAULT 'NPR' | |
| `status` | enum(pending, completed, failed, cancelled, refunded) | |

#### `audit_logs`
| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `organization_id` | UUID FK | |
| `user_id` | UUID FK | |
| `action` | varchar(255) | |
| `resource_type` | varchar(100) | |
| `resource_id` | varchar(100) | |
| `severity` | enum(critical, warning, info) | |
| `metadata` | jsonb | |

---

### Mero Board

#### `boards`
| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `organization_id` | UUID | |
| `workspace_id` | UUID FK→board_workspaces | nullable |
| `project_id` | UUID FK→board_projects | nullable |
| `name` | varchar(255) | |
| `description` | text | |
| `type` | enum(kanban, scrum, list) | |
| `is_public` | boolean | |
| `created_by` | UUID FK→users | |

#### `board_columns`
| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `board_id` | UUID FK→boards | |
| `name` | varchar(255) | |
| `position` | integer | |
| `color` | varchar(20) | |
| `wip_limit` | integer | nullable |

#### `tasks`
| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `organization_id` | UUID | |
| `board_id` | UUID FK→boards | nullable |
| `column_id` | UUID FK→board_columns | nullable |
| `project_id` | UUID FK→board_projects | nullable |
| `title` | varchar(500) | |
| `description` | text | |
| `status` | varchar(50) | |
| `priority` | enum(low, medium, high, urgent) | |
| `assigned_to` | UUID FK→users | nullable |
| `created_by` | UUID FK→users | |
| `due_date` | date | nullable |
| `estimated_hours` | decimal | nullable |
| `logged_hours` | decimal | |
| `position` | integer | for ordering |
| `parent_task_id` | UUID FK→tasks | subtasks |
| `crm_deal_id` | UUID | nullable, links to CRM |

#### `tickets`
| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `organization_id` | UUID | |
| `board_id` | UUID FK→boards | nullable |
| `project_id` | UUID FK→board_projects | nullable |
| `title` | varchar(500) | |
| `description` | text | |
| `status` | varchar(50) | |
| `priority` | varchar(20) | |
| `type` | varchar(50) | bug/feature/task |
| `reporter_id` | UUID FK→users | |
| `assignee_id` | UUID FK→users | nullable |

#### `board_workspaces`
| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `organization_id` | UUID | |
| `name` | varchar(255) | |
| `description` | text | |
| `created_by` | UUID FK→users | |

#### `board_projects`
| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `organization_id` | UUID | |
| `workspace_id` | UUID FK→board_workspaces | nullable |
| `name` | varchar(255) | |
| `description` | text | |
| `status` | varchar(50) | |
| `start_date` | date | nullable |
| `end_date` | date | nullable |
| `created_by` | UUID FK→users | |

Additional board tables: `task_attachments`, `task_comments`, `task_checklist_items`, `task_time_logs`, `task_dependencies`, `task_templates`

---

### Mero CRM

#### `crm_clients`
| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `organization_id` | UUID | |
| `name` | varchar(255) | |
| `email` | varchar(255) | |
| `phone` | varchar(50) | |
| `company` | varchar(255) | |
| `city` | varchar(100) | |
| `state` | varchar(100) | |
| `country` | varchar(100) | |
| `removed` | boolean DEFAULT false | soft delete flag |

#### `crm_leads`
| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `organization_id` | UUID | |
| `first_name` | varchar(255) | |
| `last_name` | varchar(255) | |
| `email` | varchar(255) | |
| `phone` | varchar(20) | |
| `company` | varchar(255) | |
| `job_title` | varchar(100) | |
| `source` | varchar(100) | |
| `status` | enum(NEW, CONTACTED, QUALIFIED, PROPOSAL, NEGOTIATION, WON, LOST) | |
| `estimated_value` | decimal(15,2) | |
| `assigned_to` | UUID FK→users | |
| `converted_to_client_id` | UUID FK→crm_clients | nullable |
| `deleted_at` | timestamp | soft delete |

#### `crm_deals`
| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `organization_id` | UUID | |
| `lead_id` | UUID FK→crm_leads | nullable |
| `client_id` | UUID FK→crm_clients | nullable |
| `title` | varchar(255) | |
| `value` | decimal(15,2) | |
| `stage` | varchar(50) | pipeline stage |
| `probability` | integer DEFAULT 0 | 0–100% |
| `currency` | varchar(10) DEFAULT 'NPR' | |
| `expected_close_date` | date | |
| `assigned_to` | UUID FK→users | |
| `deleted_at` | timestamp | soft delete |

#### `crm_activities`
| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `organization_id` | UUID | |
| `entity_type` | enum(LEAD, DEAL, CLIENT) | |
| `entity_id` | UUID | polymorphic |
| `type` | enum(CALL, EMAIL, MEETING, NOTE, TASK, WHATSAPP) | |
| `subject` | varchar(255) | |
| `scheduled_at` | timestamp | |
| `completed_at` | timestamp | |
| `created_by` | UUID FK→users | |

Additional CRM tables: `crm_invoices`, `crm_invoice_items`, `crm_payments`, `crm_quotes`, `crm_quote_items`, `crm_taxes`, `crm_settings`, `crm_payment_modes`

---

### Mero Inventory

#### `products` (also `inventory_products`)
| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `organization_id` | UUID | |
| `name` | varchar(255) | |
| `sku` | varchar(100) | |
| `barcode` | varchar(100) | |
| `category` | varchar(100) | |
| `unit` | varchar(50) | |
| `cost_price` | decimal(10,2) | |
| `selling_price` | decimal(10,2) | |
| `reorder_level` | decimal(10,2) | |
| `track_serial` | boolean DEFAULT false | |
| `track_batch` | boolean DEFAULT false | |
| `expiry_date` | date | nullable |
| `expiry_alert_days` | integer DEFAULT 30 | |

#### `warehouses`
| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `organization_id` | UUID | |
| `name` | varchar(255) | |
| `type` | varchar(50) DEFAULT 'main' | |
| `address` | text | |
| `is_active` | boolean | |

#### `inventory_stock`
Tracks current stock level per product per warehouse.

#### `inventory_stock_movements`
Tracks every stock in/out event with quantity and reason.

#### `purchase_orders`
| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `organization_id` | UUID | |
| `supplier_id` | UUID FK→suppliers | |
| `status` | enum(draft, ordered, received, cancelled) | |
| `total_amount` | decimal(12,2) | |

Additional inventory tables: `suppliers`, `purchase_order_items`, `sales_orders`, `sales_order_items`, `shipments`, `inventory_serial_numbers`, `inventory_batch_lots`, `purchase_requisitions`, `purchase_requisition_items`, `goods_receipt_notes`, `grn_items`, `inventory_backorders`, `commission_rules`, `commission_records`

---

### Mero Accounting

#### `accounts` (Chart of Accounts)
| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `organization_id` | UUID | nullable for system accounts |
| `code` | varchar(50) | |
| `name` | varchar(255) | |
| `name_nepali` | varchar(255) | |
| `account_type` | enum(ASSET, LIABILITY, EQUITY, INCOME, EXPENSE) | |
| `category` | varchar(100) | |
| `parent_id` | UUID FK→accounts | hierarchical |
| `is_system` | boolean | system-seeded accounts |
| `balance` | decimal(15,2) | |

#### `journal_entries`
| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `organization_id` | UUID | |
| `date` | date | |
| `reference_number` | varchar(100) | |
| `description` | text | |
| `status` | enum(DRAFT, POSTED, VOID) | |
| `is_intercompany` | boolean DEFAULT false | |
| `created_by` | UUID FK→users | |

#### `journal_entry_lines`
| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `journal_entry_id` | UUID FK | |
| `account_id` | UUID FK→accounts | |
| `debit` | decimal(15,2) | |
| `credit` | decimal(15,2) | |
| `currency` | varchar(10) DEFAULT 'NPR' | |
| `exchange_rate` | decimal(15,6) DEFAULT 1 | |
| `department_id` | UUID FK→hr_departments | nullable |
| `project_id` | UUID FK→projects | nullable |
| `cost_center_id` | UUID FK→cost_centers | nullable |

#### `sales_invoices`
| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `organization_id` | UUID | |
| `customer_id` | UUID FK | |
| `invoice_number` | varchar(100) | |
| `date` | date | |
| `due_date` | date | |
| `subtotal` | decimal(15,2) | |
| `vat_amount` | decimal(15,2) | 13% Nepal VAT |
| `tds_amount` | decimal(15,2) | TDS deduction |
| `discount_amount` | decimal(15,2) | |
| `total_amount` | decimal(15,2) | |
| `paid_amount` | decimal(15,2) | |
| `status` | enum(DRAFT, SENT, PAID, PARTIALLY_PAID, OVERDUE, CANCELLED) | |
| `type` | enum(INVOICE, CREDIT_NOTE) | |
| `items` | jsonb | line items array |

#### `fixed_assets`
| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `organization_id` | UUID | |
| `name` | varchar(255) | |
| `asset_account_id` | UUID FK→accounts | |
| `purchase_date` | date | |
| `purchase_cost` | decimal(15,2) | |
| `depreciation_method` | enum(STRAIGHT_LINE, DECLINING_BALANCE, UNIT_OF_PRODUCTION) | |
| `depreciation_block` | enum(A, B, C, D, E) | Nepal tax depreciation blocks |
| `useful_life_months` | integer | |
| `salvage_value` | decimal(15,2) | |
| `current_book_value` | decimal(15,2) | |
| `status` | enum(ACTIVE, DISPOSED, IMPAIRED, REVALUED) | |

Additional accounting tables: `vendors`, `purchase_invoices`, `customers`, `bank_accounts`, `fiscal_years`, `budgets`, `budget_lines`, `cost_centers`, `bank_statements`, `bank_statement_lines`, `cheques`, `payment_allocations`, `recurring_transactions`, `depreciation_logs`, `asset_maintenance_logs`, `exchange_rates`, `excise_duty_rates`, `financial_notes`

---

### Mero HR

#### `hr_employees`
| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `organization_id` | UUID | |
| `user_id` | UUID FK→users | nullable |
| `employee_id` | varchar(50) UNIQUE | |
| `first_name` / `last_name` | varchar | |
| `email` / `phone` | varchar | |
| `date_of_birth` | date | |
| `gender` | varchar(20) | |
| `marital_status` | enum(SINGLE, MARRIED) | |
| `department_id` | UUID FK→hr_departments | |
| `designation_id` | UUID FK→hr_designations | |
| `supervisor_id` | UUID FK→hr_employees | self-referential |
| `joining_date` | date | |
| `status` | enum(ACTIVE, ON_LEAVE, TERMINATED, RESIGNED) | |
| `pan_number` | varchar(50) | Nepal PAN |
| `citizenship_number` | varchar(50) | |
| `base_salary` | decimal(15,2) | |
| `bank_details` | jsonb | |

#### `hr_payroll`
| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `organization_id` | UUID | |
| `employee_id` | UUID FK | |
| `month` | varchar(20) | |
| `basic_salary` | decimal(15,2) | |
| `allowances` | decimal(15,2) | |
| `ssf_contribution_employee` | decimal(15,2) | Nepal SSF |
| `ssf_contribution_employer` | decimal(15,2) | |
| `cit_contribution` | decimal(15,2) | Citizen Investment Trust |
| `income_tax` | decimal(15,2) | |
| `loan_deduction` | decimal(15,2) | |
| `advance_deduction` | decimal(15,2) | |
| `net_salary` | decimal(15,2) | |
| `status` | enum(DRAFT, PROCESSED, PAID) | |

Additional HR tables: `hr_departments`, `hr_designations`, `hr_attendance`, `hr_leave_requests`, `hr_leave_balances`, `hr_shifts`, `hr_public_holidays`, `hr_documents`

---

### Mero Khata

| Table | Description |
|-------|-------------|
| `khata_customers` | Customer ledger accounts |
| `khata_transactions` | Credit/debit transactions for customers |
| `khata_suppliers` | Supplier ledger accounts |
| `khata_supplier_transactions` | Payment/purchase transactions for suppliers |
| `khata_bank_entries` | Bank statement entries for reconciliation |
| `khata_settings` | Per-organization Khata settings |

---

### Mero CMS

| Table | Description |
|-------|-------------|
| `cms_pages` | Static pages with jsonb content blocks |
| `cms_posts` | Blog/news posts with category and tags |
| `cms_media` | Uploaded files and images |
| `cms_forms` | Dynamic form definitions |
| `cms_form_submissions` | Submitted form data |
| `cms_settings` | Site name, logo, custom domain, CSS |

---

### Communication

| Table | Description |
|-------|-------------|
| `chats` | Direct and group chat rooms |
| `chat_members` | Members of each chat |
| `messages` | Individual messages |
| `message_attachments` | File attachments on messages |
| `message_reactions` | Emoji reactions |
| `message_read_status` | Per-user read status |
| `call_sessions` | Audio/video calls |
| `call_participants` | Participants in calls |
| `admin_chats` | Support chat between users and admins |
| `admin_chat_messages` | Messages in admin chats |

---

## Key Relationships

```
packages ─── 1:N ─── organizations ─── 1:N ─── organization_members ─── N:1 ─── users
                           │
                           ├── 1:N ─── organization_apps ─── N:1 ─── apps
                           │
                           ├── 1:N ─── roles ─── N:N ─── permissions
                           │
                           ├── 1:N ─── crm_clients / crm_leads / crm_deals
                           │
                           ├── 1:N ─── hr_employees ─── 1:N ─── hr_payroll
                           │
                           ├── 1:N ─── accounts ─── 1:N ─── journal_entry_lines
                           │
                           └── 1:N ─── board_workspaces ─── 1:N ─── board_projects
                                                                          │
                                                                          └── 1:N ─── boards ─── 1:N ─── tasks
```

---

## PostgreSQL Enum Types

| Enum Name | Values |
|-----------|--------|
| `users_status_enum` | active, suspended, deleted |
| `organizations_status_enum` | active, suspended, cancelled |
| `organizations_org_type_enum` | MAIN, BRANCH |
| `email_verifications_type_enum` | registration, organization_email, password_reset |
| `payments_status_enum` | pending, completed, failed, cancelled, refunded |
| `payments_gateway_enum` | esewa, stripe |
| `payments_payment_type_enum` | package_upgrade, subscription, one_time |
| `organization_apps_status_enum` | active, inactive, pending_payment |
| `apps_target_audience_enum` | organization, creator, both |
| `chats_type_enum` | direct, group |
| `messages_type_enum` | text, image, file, audio, video, system |
| `crm_leads_status_enum` | NEW, CONTACTED, QUALIFIED, PROPOSAL, NEGOTIATION, WON, LOST |
| `crm_quotes_status_enum` | draft, pending, sent, accepted, declined, cancelled, on hold |
| `purchase_orders_status_enum` | draft, ordered, received, cancelled |
| `sales_invoices_status_enum` | DRAFT, SENT, PAID, PARTIALLY_PAID, OVERDUE, CANCELLED |
| `sales_invoices_type_enum` | INVOICE, CREDIT_NOTE |
| `purchase_invoices_type_enum` | INVOICE, DEBIT_NOTE |
| `fixed_assets_depreciation_method_enum` | STRAIGHT_LINE, DECLINING_BALANCE, UNIT_OF_PRODUCTION |
| `fixed_assets_depreciation_block_enum` | A, B, C, D, E |
| `budgets_type_enum` | GLOBAL, DEPARTMENT, PROJECT |
| `cost_centers_type_enum` | COST_CENTER, PROFIT_CENTER |
| `bank_statements_status_enum` | IMPORTED, RECONCILING, RECONCILED |
| `cheques_type_enum` | ISSUED, RECEIVED |
| `cheques_status_enum` | DRAFT, PRINTED, CLEARED, BOUNCED, CANCELLED |
| `hr_employees_marital_status_enum` | SINGLE, MARRIED |

---

## Nepal-Specific Schema Notes

| Feature | Implementation |
|---------|---------------|
| VAT (13%) | `vat_amount` columns on all invoice tables |
| TDS | `tds_amount` + `tds_category_id` on invoices |
| SSF / CIT | Separate columns in `hr_payroll` |
| Excise duty | `excise_duty_rates` table with rate per category |
| PAN / Citizenship | `pan_number`, `citizenship_number` on `hr_employees` |
| Bikram Sambat | `nepali_year` column on `hr_public_holidays` |
| IRD compliance | Invoice number format fields on accounting invoices |
| Nepali COA | 50+ system accounts seeded in `007-nepal-chart-of-accounts.seed.ts` |
| Depreciation blocks | A/B/C/D/E blocks per Income Tax Act Nepal |
| Nepali names | `name_nepali` columns on `accounts`, `khata_customers`, `khata_suppliers` |

---

## Running Migrations

```bash
# Run all pending migrations
cd api && npm run migration:run

# Revert last migration
cd api && npm run migration:revert

# Full reset (drops and recreates database)
./scripts/reset-db.sh

# Fresh start with migrations + seeds
docker compose down -v && docker compose up --build
docker compose exec api npm run db:init
```

> **Never run** `synchronize: true` in TypeORM config. All schema changes go through migration files.
