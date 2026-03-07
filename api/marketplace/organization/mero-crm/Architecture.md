# Mero CRM - Architecture

## Module Structure
Mero CRM is implemented as an organization-level marketplace application. It follows the standard NestJS module pattern but is isolated within the `api/marketplace/organization/mero-crm` directory.

### Core Components
- **MeroCrmModule**: The main entry point that registers all sub-modules (Leads, Deals, Activities).
- **Leads Sub-module**: Handles initial prospect capture and scoring.
- **Deals Sub-module**: Manages the sales pipeline and financial opportunities.
- **Activities Sub-module**: Handles the CRM calendar and task logging.

## Data Isolation
Mero CRM strictly adheres to the project's multi-tenancy requirements. All CRM entities are linked to an `organization_id` and are protected by the `AppAccessGuard` which ensures the organization has an active CRM subscription.

## Integration Points
- **Mero Accounting**: Converts won deals into invoices.
- **Mero Board**: Integrates with CRM to spawn project tasks after a deal is closed.
- **Common Module**: Uses shared notification and audit logging services.
