# API Documentation

## Overview
The Mero Jugx API is a RESTful service built with NestJS. It follows standardized conventions for authentication, error handling, and data transfer.

## Base URL
`http://localhost:3000/api` (Local)
`https://api.merojugx.com/api` (Production)

## Authentication
Most endpoints require a Bearer Token (JWT).
- **Header**: `Authorization: Bearer <JWT_TOKEN>`
- **Login**: `POST /auth/login` returns the access token.

## Global Headers
- `x-organization-id`: Required for most requests to identify the current active organization context.

## Common API Conventions

### Success Responses
Status codes (200, 201) with JSON bodies representing the data.

### Error Responses
Standardized error object:
```json
{
  "statusCode": 403,
  "message": "Access Denied",
  "error": "Forbidden"
}
```

### Pagination
GET requests for lists usually support:
- `page`: Page number (starting from 1).
- `limit`: Number of items per page.

---

## Core API Endpoints

### 1. Account & Organization
- `GET /organizations`: List user's organizations
- `POST /organizations`: Create a new organization
- `GET /users/me`: Get current user profile
- `POST /organizations/verify-pan-vat`: Validate Nepal PAN/VAT
- `POST /organizations/ip-whitelist`: Add allowed IPs

### 2. Marketplace
- `GET /apps`: List all available apps
- `POST /apps/:slug/subscribe`: Subscribe to an application

### 3. ERP Applications
Each app has its own prefix:
- `/crm/*` (Leads, Deals, Contacts, Automation)
- `/boards/*` (Tasks, Lists, Tickets)
- `/inventory/*` (Products, Stock, Serial/Batch, Backorders)
- `/accounting/*` (General Ledger, Invoices, Excise, Year-End)
- `/hr/*` (Employees, Payroll, Recruitment, Performance)
- `/khata/*` (Ledger, Invoicing, VAT, Reports)
- `/cms/*` (Pages, Posts, Media, Forms, E-commerce)

### 4. Ticket System
- `POST /tickets`: Create a ticket
- `GET /tickets`: List/search tickets
- `GET /tickets/:id`: Get ticket details
- `POST /tickets/:id/comment`: Add comment
- `POST /tickets/:id/attachment`: Upload attachment
- `PATCH /tickets/:id/status`: Update status
- `GET /tickets/reports`: SLA, escalation, analytics

### 5. Chat System
- `POST /chats`: Create chat (direct/group/admin)
- `GET /chats`: List user/org chats
- `GET /chats/:id/messages`: Get chat messages
- `POST /chats/:id/message`: Send message
- `POST /chats/:id/file`: Upload file

### 6. Admin Controls
- `GET /admin/users`: List/manage users
- `PATCH /admin/users/:id`: Update user/role
- `GET /admin/apps`: Enable/disable apps per org
- `GET /admin/logs`: System/audit logs
- `GET /admin/health`: System health metrics
- `POST /admin/impersonate`: Impersonate user
- `POST /admin/broadcast`: Send org-wide message

---

## Rate Limiting
Public endpoints are rate-limited to 10 requests/minute/IP. Authenticated endpoints have higher limits depending on the organization's subscription tier.

---

## API Documentation & Swagger
- For full API docs and try-it-out, visit `/api/docs` in development mode.

---

## See Also
- [ARCHITECTURE.md](ARCHITECTURE.md): System diagrams, module breakdown
- [DATABASE.md](DATABASE.md): Entity and migration documentation
- [Task_List.md](Task_List.md): Roadmap and progress
