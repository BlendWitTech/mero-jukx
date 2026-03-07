# Mero CRM - Database

## Overview
Mero CRM uses a set of tables specifically for managing sales and customer relationships. All tables are located in the public schema and are isolated by `organizationId`.

## Core Tables

### 1. Leads (`crm_leads`)
- `id`: UUID (Primary Key)
- `first_name`, `last_name`, `email`, `phone`: Contact details.
- `status`: Enum (NEW, CONTACTED, QUALIFIED, LOST).
- `source`: Tracking lead origin.
- `score`: Numeric lead quality score.
- `organization_id`: Multi-tenancy link.

### 2. Deals (`crm_deals`)
- `title`, `value`, `currency`: Financial details.
- `stage`: Pipeline stage (e.g., NEGOTIATION).
- `probability`: Winning chance %.
- `expected_close_date`: Forecast data.
- `client_id`: Link to the organization/contact being pitched.

### 3. Activities (`crm_activities`)
- `type`: Enum (CALL, EMAIL, MEETING, TASK).
- `subject`, `description`: Summary.
- `due_date`, `completed_at`: Timing.
- `lead_id` / `deal_id`: Context links.

## Relationships
- A **Lead** can be converted into a **Deal** and a **Contact**.
- **Activities** are linked to either a Lead or a Deal to track engagement history.
- All records are tied to an **Organization**.

## Migrations
CRM-specific migrations:
- `1784000000000-seed-mero-crm.ts`
- `1785000000000-create-crm-tables.ts`
- `1795000000000-CreateCrmMasterTables.ts`
