# Mero Inventory - Database

## Overview
Mero Inventory utilizes a comprehensive relational schema to manage physical goods and logistics. All tables are linked to `organization_id`.

## Core Tables

### 1. Products (`inventory_products`)
- `sku`, `barcode`: Identifiers.
- `name`, `description`: Metadata.
- `uom`: Unit of Measurement (e.g., Pcs, Kg).
- `is_variant`: Boolean for variant management.

### 2. Warehouses (`inventory_warehouses`)
- `name`, `location`: Physical data.
- `type`: Enum (MAIN, SECONDARY, RETAIL).

### 3. Stock (`inventory_stocks`)
- `product_id`, `warehouse_id`: Links.
- `quantity`: Physical count.
- `reserved_quantity`: Committed to sales.

### 4. Orders (`inventory_orders`)
- `type`: Enum (PURCHASE, SALES).
- `status`: Enum (DRAFT, APPROVED, SHIPPED, RECEIVED).
- `total_amount`, `currency`: Totals with multi-currency support.

## Relationships
- **Products** are stored in many **Warehouses** via a many-to-many link in **Stock**.
- **Purchase Orders** increase **Stock**.
- **Sales Orders** decrease **Stock**.

## Migrations
- `1796000000003-AddInventoryModule.ts`
- `1798000000000-AddInventoryWarehousesAndStock.ts`
- `1804000000000-AddInventorySuppliersAndPurchaseOrders.ts`
- `1806000000000-AddInventorySalesOrdersAndShipments.ts`
