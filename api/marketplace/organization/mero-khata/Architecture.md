# Mero Khata & Accounting - Shared Architecture

## Overview
While Mero Khata and Mero Accounting target different business segments, they share a common financial core infrastructure located within the `organization` marketplace tier.

## Mero Khata Persistence
Khata implements a "Cash Basis" or simplified "Accrual" model. It uses the `khata_transactions` table to store both income and expenses in a flat structure, which is then dynamically mapped to the simplified Chart of Accounts.

## Mero Accounting Persistence
Accounting implements a rigorous **Double-Entry System**.
- **Journal Entries**: Every transaction creates balanced debits and credits.
- **General Ledger**: Immutable records for financial accuracy.
- **NFRS Engine**: A reporting layer that consolidates GL entries into standard financial statements.

## Fiscal Year & Calendar
Both apps support the **Bikram Sambat (BS)** calendar for the Nepali fiscal year (Shrawan to Ashadh). Date conversions are handled by the `CalendarService` in the common module.

## Integration Points
- **Mero Inventory**: Real-time COGS and Inventory asset updates.
- **Mero Payroll**: Automatic salary and tax (TDS/Ssf) journal entries.
- **Billing Module**: Subscription invoices are automatically logged into the organization's own accounting system if opted-in.
