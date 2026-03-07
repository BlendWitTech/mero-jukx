# Mero Inventory - Architecture

## Module Structure
Mero Inventory follows a service-oriented approach within `api/marketplace/organization/mero-inventory`. It is tightly integrated with the core organization and billing modules.

### Core Components
- **ProductsModule**: Manages the master catalog and variants.
- **WarehouseModule**: Handles physical locations and transfers.
- **StockModule**: Real-time calculation of available, reserved, and incoming stock.
- **OrdersModule**: Orchestrates the procurement and fulfillment workflows.

## Stock Logic
Calculations are performed by consolidating events:
- **Available** = Total Physical - Reserved.
- **Reserved** = Sum of confirmed but unshipped Sales Orders.
- **Incoming** = Sum of approved but unreceived Purchase Orders.

## Integration Points
- **Mero Accounting**: Automatically posts COGS and Inventory GL entries.
- **Mero CRM**: Pulls customer data for Sales Orders.
- **Mero Board**: Can link shipments to delivery tasks.
