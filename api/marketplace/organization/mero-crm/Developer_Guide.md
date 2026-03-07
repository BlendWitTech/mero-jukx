# Mero CRM - Developer Guide

## Module Setup
CRM logic is encapsulated in `MeroCrmModule`. If adding new CRM features:
1.  Check if it belongs to Leads, Deals, or Activities.
2.  Follow the existing service-repository pattern.

## Permissions Logic
CRM uses granular permissions. 
- Ensure any new controller is protected with `@Permission(CrmPermissions.MANAGE_DEALS)` or similar.
- Check permissions in `CrmPermissions` enum in the shared directory.

## Lead Conversion Workflow
The `LeadsService.convert()` method is critical. It handles:
1.  Creating a new Client from lead data.
2.  Optionally creating an initial Deal.
3.  Closing the Lead record as `CONVERTED`.

## Frontend Integration
- CRM pages are located in `app/src/pages/crm`.
- Use the `CrmApi` wrapper for all frontend requests.
- Pipeline view uses `react-beautiful-dnd` for the Kanban interface.

## Best Practices
- **Always** validate lead scores on the backend.
- **Ensure** every CRM activity is linked to a user for ownership tracking.
- Do not bypass `organization_id` checks when fetching history.
