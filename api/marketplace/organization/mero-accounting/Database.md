# Mero Khata & Accounting - Database

## Overview
The accounting suite uses a tiered database approach to accommodate both simplified and enterprise accounting needs within a multi-tenant environment.

## Mero Khata Tables (`simplified`)

### 1. Transactions (`khata_transactions`)
- `type`: Enum (INCOME, EXPENSE).
- `amount`, `currency`: Values.
- `vat_amount`: Automated 13% tracking.
- `category_id`: Link to simplified COA.
- `payment_method`: Cash, Bank, eSewa, etc.

## Mero Accounting Tables (`enterprise`)

### 1. Chart of Accounts (`accounting_accounts`)
- `code`, `name`: identifiers.
- `type`: Enum (ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE).
- `parent_id`: Hierarchical structure.

### 2. Journal Entries (`accounting_journals`)
- `reference`, `date`: Metadata.
- `status`: Enum (DRAFT, POSTED).

### 3. Ledger Items (`accounting_ledgers`)
- `journal_id`: Parent link.
- `account_id`: Account affected.
- `debit`, `credit`: Balanced amounts.

## Shared Infrastructure
- `inventory_integration`: Mapping of product categories to GL accounts.
- `tax_settings`: Configuration for VAT and TDS rates.

## Migrations
- `1796000000004-AddAccountingModule.ts`
- `1796000000005-AddKhataModule.ts`
- `1825000000000-SeedMeroKhataAndAccounting.ts`
- `1828000000000-AddAccountingSalesModule.ts`
