# Mero Khata & Accounting - API

## Base Path
- Khata: `/api/khata`
- Accounting: `/api/accounting`

## Khata API (Simplified)
- `POST /khata/transactions`: Quick log of income or expense.
- `GET /khata/dashboard`: Monthly Cash-in vs Cash-out summary.
- `GET /khata/vat-report`: Prepared data for official VAT returns.

## Accounting API (Enterprise)
- `GET /accounting/coa`: Full multi-level Chart of Accounts.
- `POST /accounting/journals`: Create manual double-entry journals.
- `GET /accounting/reports/trial-balance`: Real-time financial position.
- `GET /accounting/reports/profit-loss`: NFRS compliant income statement.

## Shared Financial Services
- `GET /finance/currency/rates`: Current exchange rates for multi-currency transactions.
- `POST /finance/reconcile`: Match bank statements with internal records.

## Authentication & Permissions
Permissions are distinct:
- `KHATA_USER` vs `ACCOUNTANT`
- `FINANCE_MANAGE_SETTINGS` (for TAX and COA setup).
- Headers must include `x-organization-id`.

---
Detailed DTOs available in Swagger under `Accounting` and `Khata` tags.
