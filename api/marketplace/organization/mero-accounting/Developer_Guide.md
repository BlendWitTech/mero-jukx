# Mero Khata & Accounting - Developer Guide

## Integrity: The Golden Rule
**Never** allow imbalanced journal entries in `Mero Accounting`. Every POST request to the journal service must be validated such that `sum(debit) == sum(credit)`.

## Date Handling: Bikram Sambat (BS)
All financial reports must support BS dates.
- Use the `CalendarService` to convert between Gregorian (storing in DB) and BS (displaying to user).
- Fiscal years are based on BS (Shrawan 1st).

## Audit Trails
Accounting data is highly sensitive.
- Every ledger change must be linked to a `journal_id`.
- **Soft deleting** is prohibited for posted ledger items; use "Reversal" journals instead.

## Integration Hooks
The `AccountingIntegrationService` is the central hub for other modules (CRM, Inventory, HR) to post to the ledger.
- Use the provided DTOs to ensure consistency in COA mappings.

## Best Practices
- Use **decimal precision** (PostgreSQL `numeric`) for all currency fields.
- Perform monthly **Closing procedures** to lock past periods from modification.
- Always validate that the `accounting_period` is open before allowing new entries.
