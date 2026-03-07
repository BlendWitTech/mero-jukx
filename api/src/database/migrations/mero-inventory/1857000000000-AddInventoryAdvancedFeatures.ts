import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddInventoryAdvancedFeatures1857000000000 implements MigrationInterface {
    name = 'AddInventoryAdvancedFeatures1857000000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add track_serial and track_batch to products
        try {
            const hasTrackSerial = await queryRunner.hasColumn('products', 'track_serial');
            if (!hasTrackSerial) {
                await queryRunner.query(`ALTER TABLE "products" ADD COLUMN "track_serial" BOOLEAN NOT NULL DEFAULT FALSE`);
            }
            const hasTrackBatch = await queryRunner.hasColumn('products', 'track_batch');
            if (!hasTrackBatch) {
                await queryRunner.query(`ALTER TABLE "products" ADD COLUMN "track_batch" BOOLEAN NOT NULL DEFAULT FALSE`);
            }
        } catch (e) {
            console.warn('Could not alter products table:', e.message);
        }

        // Serial numbers table
        try {
            const hasTable = await queryRunner.hasTable('inventory_serial_numbers');
            if (!hasTable) {
                await queryRunner.query(`
                    CREATE TABLE "inventory_serial_numbers" (
                        "id" UUID NOT NULL DEFAULT gen_random_uuid(),
                        "organization_id" UUID NOT NULL,
                        "product_id" UUID NOT NULL,
                        "warehouse_id" UUID,
                        "serial_number" VARCHAR(100) NOT NULL,
                        "status" VARCHAR(20) NOT NULL DEFAULT 'available',
                        "stock_movement_in_id" UUID,
                        "stock_movement_out_id" UUID,
                        "warranty_expiry" DATE,
                        "notes" TEXT,
                        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                        CONSTRAINT "PK_inventory_serial_numbers" PRIMARY KEY ("id")
                    )
                `);
                await queryRunner.query(`CREATE INDEX "IDX_serial_org_product" ON "inventory_serial_numbers" ("organization_id", "product_id")`);
                await queryRunner.query(`CREATE UNIQUE INDEX "IDX_serial_unique" ON "inventory_serial_numbers" ("organization_id", "product_id", "serial_number")`);
            }
        } catch (e) {
            console.warn('Could not create inventory_serial_numbers table:', e.message);
        }

        // Batch lots table
        try {
            const hasTable = await queryRunner.hasTable('inventory_batch_lots');
            if (!hasTable) {
                await queryRunner.query(`
                    CREATE TABLE "inventory_batch_lots" (
                        "id" UUID NOT NULL DEFAULT gen_random_uuid(),
                        "organization_id" UUID NOT NULL,
                        "product_id" UUID NOT NULL,
                        "warehouse_id" UUID,
                        "batch_number" VARCHAR(100) NOT NULL,
                        "lot_number" VARCHAR(100),
                        "manufacturer" VARCHAR(100),
                        "manufacture_date" DATE,
                        "expiry_date" DATE,
                        "initial_quantity" DECIMAL(10,2) NOT NULL DEFAULT 0,
                        "remaining_quantity" DECIMAL(10,2) NOT NULL DEFAULT 0,
                        "cost_price" DECIMAL(10,2),
                        "status" VARCHAR(20) NOT NULL DEFAULT 'active',
                        "notes" TEXT,
                        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                        CONSTRAINT "PK_inventory_batch_lots" PRIMARY KEY ("id")
                    )
                `);
                await queryRunner.query(`CREATE INDEX "IDX_batch_org_product" ON "inventory_batch_lots" ("organization_id", "product_id")`);
            }
        } catch (e) {
            console.warn('Could not create inventory_batch_lots table:', e.message);
        }

        // Purchase requisitions
        try {
            const hasTable = await queryRunner.hasTable('purchase_requisitions');
            if (!hasTable) {
                await queryRunner.query(`
                    CREATE TABLE "purchase_requisitions" (
                        "id" UUID NOT NULL DEFAULT gen_random_uuid(),
                        "organization_id" UUID NOT NULL,
                        "pr_number" VARCHAR(50) NOT NULL,
                        "title" VARCHAR(255),
                        "reason" TEXT,
                        "required_by_date" DATE,
                        "status" VARCHAR(20) NOT NULL DEFAULT 'draft',
                        "requested_by" UUID NOT NULL,
                        "approved_by" UUID,
                        "approved_at" TIMESTAMP,
                        "rejection_reason" TEXT,
                        "converted_to_po_id" UUID,
                        "total_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
                        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                        CONSTRAINT "PK_purchase_requisitions" PRIMARY KEY ("id")
                    )
                `);
                await queryRunner.query(`CREATE INDEX "IDX_pr_org" ON "purchase_requisitions" ("organization_id")`);
            }
        } catch (e) {
            console.warn('Could not create purchase_requisitions table:', e.message);
        }

        // Purchase requisition items
        try {
            const hasTable = await queryRunner.hasTable('purchase_requisition_items');
            if (!hasTable) {
                await queryRunner.query(`
                    CREATE TABLE "purchase_requisition_items" (
                        "id" UUID NOT NULL DEFAULT gen_random_uuid(),
                        "requisition_id" UUID NOT NULL,
                        "product_id" UUID NOT NULL,
                        "product_name" VARCHAR(255),
                        "quantity" DECIMAL(10,2) NOT NULL,
                        "unit" VARCHAR(50),
                        "estimated_unit_price" DECIMAL(10,2) NOT NULL DEFAULT 0,
                        "estimated_total" DECIMAL(12,2) NOT NULL DEFAULT 0,
                        "notes" TEXT,
                        CONSTRAINT "PK_purchase_requisition_items" PRIMARY KEY ("id"),
                        CONSTRAINT "FK_pr_items_requisition" FOREIGN KEY ("requisition_id") REFERENCES "purchase_requisitions"("id") ON DELETE CASCADE
                    )
                `);
            }
        } catch (e) {
            console.warn('Could not create purchase_requisition_items table:', e.message);
        }

        // Goods receipt notes
        try {
            const hasTable = await queryRunner.hasTable('goods_receipt_notes');
            if (!hasTable) {
                await queryRunner.query(`
                    CREATE TABLE "goods_receipt_notes" (
                        "id" UUID NOT NULL DEFAULT gen_random_uuid(),
                        "organization_id" UUID NOT NULL,
                        "grn_number" VARCHAR(50) NOT NULL,
                        "purchase_order_id" UUID NOT NULL,
                        "warehouse_id" UUID,
                        "status" VARCHAR(30) NOT NULL DEFAULT 'draft',
                        "matching_status" VARCHAR(20) NOT NULL DEFAULT 'pending',
                        "received_by" UUID NOT NULL,
                        "received_date" DATE,
                        "notes" TEXT,
                        "rejection_reason" TEXT,
                        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                        CONSTRAINT "PK_goods_receipt_notes" PRIMARY KEY ("id")
                    )
                `);
                await queryRunner.query(`CREATE INDEX "IDX_grn_org" ON "goods_receipt_notes" ("organization_id")`);
                await queryRunner.query(`CREATE INDEX "IDX_grn_po" ON "goods_receipt_notes" ("purchase_order_id")`);
            }
        } catch (e) {
            console.warn('Could not create goods_receipt_notes table:', e.message);
        }

        // GRN items
        try {
            const hasTable = await queryRunner.hasTable('grn_items');
            if (!hasTable) {
                await queryRunner.query(`
                    CREATE TABLE "grn_items" (
                        "id" UUID NOT NULL DEFAULT gen_random_uuid(),
                        "grn_id" UUID NOT NULL,
                        "product_id" UUID NOT NULL,
                        "product_name" VARCHAR(255),
                        "ordered_quantity" DECIMAL(10,2) NOT NULL,
                        "received_quantity" DECIMAL(10,2) NOT NULL DEFAULT 0,
                        "rejected_quantity" DECIMAL(10,2) NOT NULL DEFAULT 0,
                        "unit_price" DECIMAL(10,2),
                        "notes" TEXT,
                        CONSTRAINT "PK_grn_items" PRIMARY KEY ("id"),
                        CONSTRAINT "FK_grn_items_grn" FOREIGN KEY ("grn_id") REFERENCES "goods_receipt_notes"("id") ON DELETE CASCADE
                    )
                `);
            }
        } catch (e) {
            console.warn('Could not create grn_items table:', e.message);
        }

        // Backorders
        try {
            const hasTable = await queryRunner.hasTable('inventory_backorders');
            if (!hasTable) {
                await queryRunner.query(`
                    CREATE TABLE "inventory_backorders" (
                        "id" UUID NOT NULL DEFAULT gen_random_uuid(),
                        "organization_id" UUID NOT NULL,
                        "backorder_number" VARCHAR(50) NOT NULL,
                        "sales_order_id" UUID NOT NULL,
                        "product_id" UUID NOT NULL,
                        "product_name" VARCHAR(255),
                        "original_quantity" DECIMAL(10,2) NOT NULL,
                        "backordered_quantity" DECIMAL(10,2) NOT NULL,
                        "fulfilled_quantity" DECIMAL(10,2) NOT NULL DEFAULT 0,
                        "status" VARCHAR(30) NOT NULL DEFAULT 'open',
                        "expected_fulfillment_date" DATE,
                        "notes" TEXT,
                        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                        CONSTRAINT "PK_inventory_backorders" PRIMARY KEY ("id")
                    )
                `);
                await queryRunner.query(`CREATE INDEX "IDX_backorder_org" ON "inventory_backorders" ("organization_id")`);
            }
        } catch (e) {
            console.warn('Could not create inventory_backorders table:', e.message);
        }

        // Commission rules
        try {
            const hasTable = await queryRunner.hasTable('commission_rules');
            if (!hasTable) {
                await queryRunner.query(`
                    CREATE TABLE "commission_rules" (
                        "id" UUID NOT NULL DEFAULT gen_random_uuid(),
                        "organization_id" UUID NOT NULL,
                        "name" VARCHAR(255) NOT NULL,
                        "commission_type" VARCHAR(20) NOT NULL DEFAULT 'percentage',
                        "rate" DECIMAL(10,4) NOT NULL,
                        "applies_to" VARCHAR(30) NOT NULL DEFAULT 'all_products',
                        "category" VARCHAR(100),
                        "product_id" UUID,
                        "min_sale_amount" DECIMAL(12,2),
                        "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
                        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                        CONSTRAINT "PK_commission_rules" PRIMARY KEY ("id")
                    )
                `);
            }
        } catch (e) {
            console.warn('Could not create commission_rules table:', e.message);
        }

        // Commission records
        try {
            const hasTable = await queryRunner.hasTable('commission_records');
            if (!hasTable) {
                await queryRunner.query(`
                    CREATE TABLE "commission_records" (
                        "id" UUID NOT NULL DEFAULT gen_random_uuid(),
                        "organization_id" UUID NOT NULL,
                        "rule_id" UUID NOT NULL,
                        "sales_order_id" UUID NOT NULL,
                        "sales_person" VARCHAR(100),
                        "sale_amount" DECIMAL(12,2) NOT NULL,
                        "commission_rate" DECIMAL(10,4) NOT NULL,
                        "commission_amount" DECIMAL(12,2) NOT NULL,
                        "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
                        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                        CONSTRAINT "PK_commission_records" PRIMARY KEY ("id")
                    )
                `);
                await queryRunner.query(`CREATE INDEX "IDX_commission_records_org" ON "commission_records" ("organization_id")`);
            }
        } catch (e) {
            console.warn('Could not create commission_records table:', e.message);
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop in reverse order
        for (const table of [
            'commission_records', 'commission_rules', 'inventory_backorders',
            'grn_items', 'goods_receipt_notes',
            'purchase_requisition_items', 'purchase_requisitions',
            'inventory_batch_lots', 'inventory_serial_numbers'
        ]) {
            try {
                await queryRunner.query(`DROP TABLE IF EXISTS "${table}"`);
            } catch (e) {
                console.warn(`Could not drop ${table}:`, e.message);
            }
        }
        try {
            await queryRunner.query(`ALTER TABLE "products" DROP COLUMN IF EXISTS "track_serial"`);
            await queryRunner.query(`ALTER TABLE "products" DROP COLUMN IF EXISTS "track_batch"`);
        } catch (e) {
            console.warn('Could not drop columns from products:', e.message);
        }
    }
}
