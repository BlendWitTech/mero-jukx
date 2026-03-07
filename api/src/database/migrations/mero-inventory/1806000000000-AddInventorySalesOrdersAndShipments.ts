import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from "typeorm";

export class AddInventorySalesOrdersAndShipments1806000000000 implements MigrationInterface {
    name = 'AddInventorySalesOrdersAndShipments1806000000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create Sales Orders Table
        await queryRunner.createTable(new Table({
            name: "sales_orders",
            columns: [
                {
                    name: "id",
                    type: "uuid",
                    isPrimary: true,
                    isGenerated: true,
                    generationStrategy: "uuid",
                    default: "uuid_generate_v4()",
                },
                {
                    name: "order_number",
                    type: "varchar",
                    length: "50",
                    isUnique: true,
                },
                {
                    name: "organization_id",
                    type: "uuid",
                },
                {
                    name: "customer_id",
                    type: "uuid",
                    isNullable: true,
                },
                {
                    name: "customer_name",
                    type: "varchar",
                    length: "255",
                    isNullable: true,
                },
                {
                    name: "customer_email",
                    type: "varchar",
                    length: "255",
                    isNullable: true,
                },
                {
                    name: "status",
                    type: "varchar",
                    length: "50",
                    default: "'DRAFT'",
                },
                {
                    name: "order_date",
                    type: "date",
                    isNullable: true,
                },
                {
                    name: "expected_shipment_date",
                    type: "date",
                    isNullable: true,
                },
                {
                    name: "total_amount",
                    type: "numeric(10,2)",
                    default: "'0'",
                },
                {
                    name: "tax_amount",
                    type: "numeric(10,2)",
                    default: "'0'",
                },
                {
                    name: "discount_amount",
                    type: "numeric(10,2)",
                    default: "'0'",
                },
                {
                    name: "notes",
                    type: "text",
                    isNullable: true,
                },
                {
                    name: "created_by",
                    type: "uuid",
                },
                {
                    name: "created_at",
                    type: "timestamp",
                    default: "now()",
                },
                {
                    name: "updated_at",
                    type: "timestamp",
                    default: "now()",
                },
            ],
        }), true);

        const soTable = await queryRunner.getTable("sales_orders");
        if (soTable) {
            // Indices
            if (!soTable.indices.find(idx => idx.name === 'IDX_sales_orders_organization_id' || idx.columnNames.includes('organization_id'))) {
                await queryRunner.createIndex("sales_orders", new TableIndex({
                    name: "IDX_sales_orders_organization_id",
                    columnNames: ["organization_id"],
                }));
            }
            if (!soTable.indices.find(idx => idx.name === 'IDX_sales_orders_status' || idx.columnNames.includes('status'))) {
                await queryRunner.createIndex("sales_orders", new TableIndex({
                    name: "IDX_sales_orders_status",
                    columnNames: ["status"],
                }));
            }

            // FKs
            if (!soTable.foreignKeys.find(fk => fk.name === 'FK_sales_orders_organization' || fk.columnNames.includes('organization_id'))) {
                await queryRunner.createForeignKey("sales_orders", new TableForeignKey({
                    name: "FK_sales_orders_organization",
                    columnNames: ["organization_id"],
                    referencedColumnNames: ["id"],
                    referencedTableName: "organizations",
                    onDelete: "NO ACTION"
                }));
            }
            if (!soTable.foreignKeys.find(fk => fk.name === 'FK_sales_orders_created_by' || fk.columnNames.includes('created_by'))) {
                await queryRunner.createForeignKey("sales_orders", new TableForeignKey({
                    name: "FK_sales_orders_created_by",
                    columnNames: ["created_by"],
                    referencedColumnNames: ["id"],
                    referencedTableName: "users",
                    onDelete: "NO ACTION"
                }));
            }
        }

        // Create Sales Order Items Table
        await queryRunner.createTable(new Table({
            name: "sales_order_items",
            columns: [
                {
                    name: "id",
                    type: "uuid",
                    isPrimary: true,
                    isGenerated: true,
                    generationStrategy: "uuid",
                    default: "uuid_generate_v4()",
                },
                {
                    name: "sales_order_id",
                    type: "uuid",
                },
                {
                    name: "product_id",
                    type: "uuid",
                },
                {
                    name: "quantity",
                    type: "integer",
                },
                {
                    name: "unit_price",
                    type: "numeric(10,2)",
                },
                {
                    name: "total_price",
                    type: "numeric(10,2)",
                },
                {
                    name: "tax_amount",
                    type: "numeric(10,2)",
                    default: "'0'",
                },
                {
                    name: "discount_amount",
                    type: "numeric(10,2)",
                    default: "'0'",
                },
            ],
        }), true);

        const soiTable = await queryRunner.getTable("sales_order_items");
        if (soiTable) {
            // Index
            if (!soiTable.indices.find(idx => idx.name === 'IDX_sales_order_items_sales_order_id' || idx.columnNames.includes('sales_order_id'))) {
                await queryRunner.createIndex("sales_order_items", new TableIndex({
                    name: "IDX_sales_order_items_sales_order_id",
                    columnNames: ["sales_order_id"],
                }));
            }
            if (!soiTable.indices.find(idx => idx.name === 'IDX_sales_order_items_product_id' || idx.columnNames.includes('product_id'))) {
                await queryRunner.createIndex("sales_order_items", new TableIndex({
                    name: "IDX_sales_order_items_product_id",
                    columnNames: ["product_id"],
                }));
            }

            // FK
            if (!soiTable.foreignKeys.find(fk => fk.name === 'FK_sales_order_items_sales_order' || fk.columnNames.includes('sales_order_id'))) {
                await queryRunner.createForeignKey("sales_order_items", new TableForeignKey({
                    name: "FK_sales_order_items_sales_order",
                    columnNames: ["sales_order_id"],
                    referencedColumnNames: ["id"],
                    referencedTableName: "sales_orders",
                    onDelete: "CASCADE"
                }));
            }
            if (!soiTable.foreignKeys.find(fk => fk.name === 'FK_sales_order_items_product' || fk.columnNames.includes('product_id'))) {
                await queryRunner.createForeignKey("sales_order_items", new TableForeignKey({
                    name: "FK_sales_order_items_product",
                    columnNames: ["product_id"],
                    referencedColumnNames: ["id"],
                    referencedTableName: "products",
                    onDelete: "NO ACTION"
                }));
            }
        }

        // Create Shipments Table
        await queryRunner.createTable(new Table({
            name: "shipments",
            columns: [
                {
                    name: "id",
                    type: "uuid",
                    isPrimary: true,
                    isGenerated: true,
                    generationStrategy: "uuid",
                    default: "uuid_generate_v4()",
                },
                {
                    name: "shipment_number",
                    type: "varchar",
                    length: "50",
                    isUnique: true,
                },
                {
                    name: "sales_order_id",
                    type: "uuid",
                },
                {
                    name: "status",
                    type: "varchar",
                    length: "50",
                    default: "'PENDING'",
                },
                {
                    name: "shipped_date",
                    type: "date",
                    isNullable: true,
                },
                {
                    name: "delivered_date",
                    type: "date",
                    isNullable: true,
                },
                {
                    name: "carrier",
                    type: "varchar",
                    length: "100",
                    isNullable: true,
                },
                {
                    name: "tracking_number",
                    type: "varchar",
                    length: "100",
                    isNullable: true,
                },
                {
                    name: "shipping_address",
                    type: "text",
                    isNullable: true,
                },
                {
                    name: "created_by",
                    type: "uuid",
                },
                {
                    name: "created_at",
                    type: "timestamp",
                    default: "now()",
                },
                {
                    name: "updated_at",
                    type: "timestamp",
                    default: "now()",
                },
            ],
        }), true);

        const sTable = await queryRunner.getTable("shipments");
        if (sTable) {
            // Index
            if (!sTable.indices.find(idx => idx.name === 'IDX_shipments_sales_order_id' || idx.columnNames.includes('sales_order_id'))) {
                await queryRunner.createIndex("shipments", new TableIndex({
                    name: "IDX_shipments_sales_order_id",
                    columnNames: ["sales_order_id"],
                }));
            }
            if (!sTable.indices.find(idx => idx.name === 'IDX_shipments_status' || idx.columnNames.includes('status'))) {
                await queryRunner.createIndex("shipments", new TableIndex({
                    name: "IDX_shipments_status",
                    columnNames: ["status"],
                }));
            }

            // FK
            if (!sTable.foreignKeys.find(fk => fk.name === 'FK_shipments_sales_order' || fk.columnNames.includes('sales_order_id'))) {
                await queryRunner.createForeignKey("shipments", new TableForeignKey({
                    name: "FK_shipments_sales_order",
                    columnNames: ["sales_order_id"],
                    referencedColumnNames: ["id"],
                    referencedTableName: "sales_orders",
                    onDelete: "NO ACTION"
                }));
            }
            if (!sTable.foreignKeys.find(fk => fk.name === 'FK_shipments_created_by' || fk.columnNames.includes('created_by'))) {
                await queryRunner.createForeignKey("shipments", new TableForeignKey({
                    name: "FK_shipments_created_by",
                    columnNames: ["created_by"],
                    referencedColumnNames: ["id"],
                    referencedTableName: "users",
                    onDelete: "NO ACTION"
                }));
            }
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable("shipments", true);
        await queryRunner.dropTable("sales_order_items", true);
        await queryRunner.dropTable("sales_orders", true);
    }
}
