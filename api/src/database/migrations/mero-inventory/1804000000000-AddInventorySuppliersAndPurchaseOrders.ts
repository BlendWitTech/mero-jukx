import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from "typeorm";

export class AddInventorySuppliersAndPurchaseOrders1804000000000 implements MigrationInterface {
    name = 'AddInventorySuppliersAndPurchaseOrders1804000000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create Suppliers Table
        await queryRunner.createTable(new Table({
            name: "suppliers",
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
                    name: "organization_id",
                    type: "uuid",
                },
                {
                    name: "name",
                    type: "varchar",
                },
                {
                    name: "email",
                    type: "varchar",
                    isNullable: true,
                },
                {
                    name: "phone",
                    type: "varchar",
                    isNullable: true,
                },
                {
                    name: "address",
                    type: "text",
                    isNullable: true,
                },
                {
                    name: "contact_person",
                    type: "varchar",
                    isNullable: true,
                },
                {
                    name: "tax_id",
                    type: "varchar",
                    isNullable: true,
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

        const suppliersTable = await queryRunner.getTable("suppliers");
        if (suppliersTable) {
            if (!suppliersTable.foreignKeys.find(fk => fk.name === 'FK_suppliers_organization' || fk.columnNames.includes('organization_id'))) {
                await queryRunner.createForeignKey("suppliers", new TableForeignKey({
                    name: "FK_suppliers_organization",
                    columnNames: ["organization_id"],
                    referencedColumnNames: ["id"],
                    referencedTableName: "organizations",
                    onDelete: "NO ACTION",
                    onUpdate: "NO ACTION"
                }));
            }
        }

        // Create Enum
        await queryRunner.query(`DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'purchase_orders_status_enum') THEN
                CREATE TYPE "purchase_orders_status_enum" AS ENUM ('draft', 'ordered', 'received', 'cancelled');
            END IF;
        END $$;`);

        // Create Purchase Orders Table
        await queryRunner.createTable(new Table({
            name: "purchase_orders",
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
                    name: "organization_id",
                    type: "uuid",
                },
                {
                    name: "number",
                    type: "varchar",
                },
                {
                    name: "supplier_id",
                    type: "uuid",
                },
                {
                    name: "status",
                    type: "purchase_orders_status_enum",
                    default: "'draft'",
                },
                {
                    name: "expected_date",
                    type: "date",
                    isNullable: true,
                },
                {
                    name: "total_amount",
                    type: "numeric(12,2)",
                    default: "'0'",
                },
                {
                    name: "notes",
                    type: "text",
                    isNullable: true,
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

        const poTable = await queryRunner.getTable("purchase_orders");
        if (poTable) {
            if (!poTable.foreignKeys.find(fk => fk.name === 'FK_purchase_orders_organization' || fk.columnNames.includes('organization_id'))) {
                await queryRunner.createForeignKey("purchase_orders", new TableForeignKey({
                    name: "FK_purchase_orders_organization",
                    columnNames: ["organization_id"],
                    referencedColumnNames: ["id"],
                    referencedTableName: "organizations",
                    onDelete: "NO ACTION",
                    onUpdate: "NO ACTION"
                }));
            }
            if (!poTable.foreignKeys.find(fk => fk.name === 'FK_purchase_orders_supplier' || fk.columnNames.includes('supplier_id'))) {
                await queryRunner.createForeignKey("purchase_orders", new TableForeignKey({
                    name: "FK_purchase_orders_supplier",
                    columnNames: ["supplier_id"],
                    referencedColumnNames: ["id"],
                    referencedTableName: "suppliers",
                    onDelete: "NO ACTION",
                    onUpdate: "NO ACTION"
                }));
            }
        }

        // Create Purchase Order Items Table
        await queryRunner.createTable(new Table({
            name: "purchase_order_items",
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
                    name: "purchase_order_id",
                    type: "uuid",
                },
                {
                    name: "product_id",
                    type: "uuid",
                },
                {
                    name: "quantity",
                    type: "numeric(10,2)",
                },
                {
                    name: "unit_price",
                    type: "numeric(12,2)",
                },
                {
                    name: "total",
                    type: "numeric(12,2)",
                },
            ],
        }), true);

        const poItemsTable = await queryRunner.getTable("purchase_order_items");
        if (poItemsTable) {
            if (!poItemsTable.foreignKeys.find(fk => fk.name === 'FK_purchase_order_items_purchase_order' || fk.columnNames.includes('purchase_order_id'))) {
                await queryRunner.createForeignKey("purchase_order_items", new TableForeignKey({
                    name: "FK_purchase_order_items_purchase_order",
                    columnNames: ["purchase_order_id"],
                    referencedColumnNames: ["id"],
                    referencedTableName: "purchase_orders",
                    onDelete: "CASCADE",
                    onUpdate: "NO ACTION"
                }));
            }
            if (!poItemsTable.foreignKeys.find(fk => fk.name === 'FK_purchase_order_items_product' || fk.columnNames.includes('product_id'))) {
                await queryRunner.createForeignKey("purchase_order_items", new TableForeignKey({
                    name: "FK_purchase_order_items_product",
                    columnNames: ["product_id"],
                    referencedColumnNames: ["id"],
                    referencedTableName: "products",
                    onDelete: "NO ACTION",
                    onUpdate: "NO ACTION"
                }));
            }
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable("purchase_order_items", true);
        await queryRunner.dropTable("purchase_orders", true);
        await queryRunner.query(`DROP TYPE IF EXISTS "purchase_orders_status_enum"`);
        await queryRunner.dropTable("suppliers", true);
    }
}
