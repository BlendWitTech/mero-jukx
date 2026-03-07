# Mero CRM - API

## Base Path
`/api/crm`

## Lead Management
- `GET /leads`: List leads with filters (status, source).
- `POST /leads`: Create a new lead.
- `GET /leads/:id`: Detailed lead view.
- `PATCH /leads/:id`: Update lead status or details.
- `POST /leads/:id/convert`: Convert lead to customer/deal.

## Deal Management
- `GET /deals`: List deals (Kanban view data).
- `POST /deals`: Create a potential opportunity.
- `PATCH /deals/:id`: Update deal stage or expected value.

## Activity Management
- `GET /activities`: List upcoming CRM activities.
- `POST /activities`: Schedule a call or meeting.
- `PATCH /activities/:id/complete`: Log activity completion.

## Authentication
Requires an active JWT with CRM-specific permissions (e.g., `CRM_VIEW_LEADS`, `CRM_MANAGE_DEALS`). Headers must include `x-organization-id`.

## Example: Create Lead
```json
POST /api/crm/leads
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "source": "Website",
  "status": "NEW"
}
```
