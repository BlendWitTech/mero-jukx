# Mero Inventory - Developer Guide

## Core Logic: Atomic Stock Updates
Inventory accuracy is paramount. Always use **database transactions** for operations that involve both Order status changes and Stock level adjustments.

## Product Variants
We use a "parent-child" relationship for variants. The parent product holds shared metadata, while child products (variants) hold specific SKUs, sizes, or colors.

## Barcode Integration
- SKUs are automatically mapped to Barcodes.
- Ensure that the frontend uses the generic `BarcodeScanner` component for compatibility with both web cameras and handheld devices.

## Performance
Stock level queries can be expensive in high-volume environments.
- Use `CachedStockService` for non-critical lookups.
- Heavily utilize TypeORM's `increment`/`decrement` instead of reading followed by writing to prevent race conditions.

## Best Practices
- **Verify** that `warehouseId` belongs to the authenticated organization before every stock write.
- Always include **Reason Codes** for manual stock adjustments for audit trails.
- Unit measurements (UOM) should be standardized across the organization to prevent conversion errors.
