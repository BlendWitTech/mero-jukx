# Mero Inventory - API

## Base Path
`/api/inventory`

## Product Management
- `GET /products`: Filtered list of products and variants.
- `POST /products`: Create new SKU with multi-tier pricing.
- `GET /products/barcode/:code`: Quick lookup via barcode.

## Stock Operations
- `GET /stock`: Summary of stock across all warehouses.
- `POST /stock/transfer`: Move items between warehouses.
- `POST /stock/adjust`: Manually correct stock levels.

## Procurement (Purchase)
- `POST /purchase-orders`: Create PO for suppliers.
- `GET /purchase-orders/:id/grn`: Generate Goods Receipt Note.

## Fulfillment (Sales)
- `POST /sales-orders`: Create SO for customers.
- `PATCH /sales-orders/:id/ship`: Mark as shipped and adjust stock.

## Authentication
Requires `INVENTORY_VIEW`, `INVENTORY_MANAGE_STOCK` permissions. 

---
Swagger definitions available at `/api/docs#Inventory`.
