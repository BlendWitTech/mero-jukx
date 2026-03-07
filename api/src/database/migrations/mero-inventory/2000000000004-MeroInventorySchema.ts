import { MigrationInterface, QueryRunner } from 'typeorm';

export class MeroInventorySchema2000000000004 implements MigrationInterface {
  name = 'MeroInventorySchema2000000000004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Enum types
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'purchase_orders_status_enum') THEN
          CREATE TYPE "public"."purchase_orders_status_enum" AS ENUM('draft', 'ordered', 'received', 'cancelled');
        END IF;
      END $$
    `);

    // ─── WAREHOUSES ───────────────────────────────────────────────────────────
    if (!(await queryRunner.hasTable('warehouses'))) {
      await queryRunner.query(`
        CREATE TABLE "warehouses" (
          "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
          "organization_id" uuid NOT NULL,
          "name" character varying(255) NOT NULL,
          "type" character varying(50) NOT NULL DEFAULT 'main',
          "address" text,
          "city" character varying(100),
          "country" character varying(100),
          "is_active" boolean NOT NULL DEFAULT true,
          "created_at" TIMESTAMP NOT NULL DEFAULT now(),
          "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
          CONSTRAINT "PK_warehouses" PRIMARY KEY ("id")
        )
      `);
      await queryRunner.query(`CREATE INDEX "IDX_warehouses_org" ON "warehouses" ("organization_id")`);
      await queryRunner.query(`ALTER TABLE "warehouses" ADD CONSTRAINT "FK_warehouses_org" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE`);
    }

    // ─── PRODUCTS ─────────────────────────────────────────────────────────────
    if (!(await queryRunner.hasTable('products'))) {
      await queryRunner.query(`
        CREATE TABLE "products" (
          "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
          "organization_id" uuid NOT NULL,
          "name" character varying(255) NOT NULL,
          "description" text,
          "sku" character varying(100),
          "barcode" character varying(100),
          "category" character varying(100),
          "brand" character varying(100),
          "unit" character varying(50),
          "cost_price" numeric(10,2) NOT NULL DEFAULT 0,
          "selling_price" numeric(10,2) NOT NULL DEFAULT 0,
          "reorder_level" numeric(10,2) NOT NULL DEFAULT 0,
          "tax_rate" numeric(5,2) NOT NULL DEFAULT 0,
          "image_url" character varying(500),
          "is_active" boolean NOT NULL DEFAULT true,
          "track_serial" boolean NOT NULL DEFAULT false,
          "track_batch" boolean NOT NULL DEFAULT false,
          "expiry_date" date,
          "expiry_alert_days" integer NOT NULL DEFAULT 30,
          "created_at" TIMESTAMP NOT NULL DEFAULT now(),
          "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
          CONSTRAINT "PK_products" PRIMARY KEY ("id")
        )
      `);
      await queryRunner.query(`CREATE INDEX "IDX_products_org" ON "products" ("organization_id")`);
      await queryRunner.query(`CREATE INDEX "IDX_products_sku" ON "products" ("organization_id", "sku") WHERE "sku" IS NOT NULL`);
      await queryRunner.query(`ALTER TABLE "products" ADD CONSTRAINT "FK_products_org" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE`);
    }

    // ─── INVENTORY STOCK ──────────────────────────────────────────────────────
    if (!(await queryRunner.hasTable('inventory_stock'))) {
      await queryRunner.query(`
        CREATE TABLE "inventory_stock" (
          "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
          "organization_id" uuid NOT NULL,
          "product_id" uuid NOT NULL,
          "warehouse_id" uuid NOT NULL,
          "quantity" numeric(10,2) NOT NULL DEFAULT 0,
          "reserved_quantity" numeric(10,2) NOT NULL DEFAULT 0,
          "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
          CONSTRAINT "UQ_inventory_stock_prod_wh" UNIQUE ("product_id", "warehouse_id"),
          CONSTRAINT "PK_inventory_stock" PRIMARY KEY ("id")
        )
      `);
      await queryRunner.query(`CREATE INDEX "IDX_stock_org_product" ON "inventory_stock" ("organization_id", "product_id")`);
      await queryRunner.query(`ALTER TABLE "inventory_stock" ADD CONSTRAINT "FK_stock_org" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE`);
      await queryRunner.query(`ALTER TABLE "inventory_stock" ADD CONSTRAINT "FK_stock_product" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE`);
      await queryRunner.query(`ALTER TABLE "inventory_stock" ADD CONSTRAINT "FK_stock_warehouse" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE CASCADE`);
    }

    if (!(await queryRunner.hasTable('inventory_stock_movements'))) {
      await queryRunner.query(`
        CREATE TABLE "inventory_stock_movements" (
          "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
          "organization_id" uuid NOT NULL,
          "product_id" uuid NOT NULL,
          "warehouse_id" uuid NOT NULL,
          "type" character varying(30) NOT NULL,
          "quantity" numeric(10,2) NOT NULL,
          "reference_type" character varying(50),
          "reference_id" uuid,
          "notes" text,
          "created_by" uuid,
          "created_at" TIMESTAMP NOT NULL DEFAULT now(),
          CONSTRAINT "PK_inventory_stock_movements" PRIMARY KEY ("id")
        )
      `);
      await queryRunner.query(`CREATE INDEX "IDX_ism_org_product" ON "inventory_stock_movements" ("organization_id", "product_id")`);
      await queryRunner.query(`ALTER TABLE "inventory_stock_movements" ADD CONSTRAINT "FK_ism_org" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE`);
      await queryRunner.query(`ALTER TABLE "inventory_stock_movements" ADD CONSTRAINT "FK_ism_product" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE`);
      await queryRunner.query(`ALTER TABLE "inventory_stock_movements" ADD CONSTRAINT "FK_ism_warehouse" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE CASCADE`);
    }

    // ─── SUPPLIERS ────────────────────────────────────────────────────────────
    if (!(await queryRunner.hasTable('suppliers'))) {
      await queryRunner.query(`
        CREATE TABLE "suppliers" (
          "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
          "organization_id" uuid NOT NULL,
          "name" character varying(255) NOT NULL,
          "email" character varying(255),
          "phone" character varying(50),
          "address" text,
          "city" character varying(100),
          "country" character varying(100),
          "tax_id" character varying(100),
          "pan_number" character varying(50),
          "contact_person" character varying(255),
          "payment_terms" integer NOT NULL DEFAULT 30,
          "is_active" boolean NOT NULL DEFAULT true,
          "created_at" TIMESTAMP NOT NULL DEFAULT now(),
          "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
          CONSTRAINT "PK_suppliers" PRIMARY KEY ("id")
        )
      `);
      await queryRunner.query(`CREATE INDEX "IDX_suppliers_org" ON "suppliers" ("organization_id")`);
      await queryRunner.query(`ALTER TABLE "suppliers" ADD CONSTRAINT "FK_suppliers_org" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE`);
    }

    // ─── PURCHASE ORDERS ──────────────────────────────────────────────────────
    if (!(await queryRunner.hasTable('purchase_orders'))) {
      await queryRunner.query(`
        CREATE TABLE "purchase_orders" (
          "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
          "organization_id" uuid NOT NULL,
          "po_number" character varying(100) NOT NULL,
          "supplier_id" uuid NOT NULL,
          "warehouse_id" uuid,
          "status" "public"."purchase_orders_status_enum" NOT NULL DEFAULT 'draft',
          "order_date" date NOT NULL,
          "expected_delivery_date" date,
          "subtotal" numeric(12,2) NOT NULL DEFAULT 0,
          "tax_amount" numeric(12,2) NOT NULL DEFAULT 0,
          "total_amount" numeric(12,2) NOT NULL DEFAULT 0,
          "notes" text,
          "created_by" uuid,
          "created_at" TIMESTAMP NOT NULL DEFAULT now(),
          "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
          CONSTRAINT "PK_purchase_orders" PRIMARY KEY ("id")
        )
      `);
      await queryRunner.query(`CREATE INDEX "IDX_po_org" ON "purchase_orders" ("organization_id")`);
      await queryRunner.query(`ALTER TABLE "purchase_orders" ADD CONSTRAINT "FK_po_org" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE`);
      await queryRunner.query(`ALTER TABLE "purchase_orders" ADD CONSTRAINT "FK_po_supplier" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE NO ACTION`);
      await queryRunner.query(`ALTER TABLE "purchase_orders" ADD CONSTRAINT "FK_po_warehouse" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE SET NULL`);
    }

    if (!(await queryRunner.hasTable('purchase_order_items'))) {
      await queryRunner.query(`
        CREATE TABLE "purchase_order_items" (
          "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
          "purchase_order_id" uuid NOT NULL,
          "product_id" uuid NOT NULL,
          "quantity" numeric(10,2) NOT NULL,
          "received_quantity" numeric(10,2) NOT NULL DEFAULT 0,
          "unit_price" numeric(10,2) NOT NULL,
          "tax_rate" numeric(5,2) NOT NULL DEFAULT 0,
          "total_price" numeric(12,2) NOT NULL,
          "notes" text,
          CONSTRAINT "PK_purchase_order_items" PRIMARY KEY ("id")
        )
      `);
      await queryRunner.query(`ALTER TABLE "purchase_order_items" ADD CONSTRAINT "FK_poi_po" FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_orders"("id") ON DELETE CASCADE`);
      await queryRunner.query(`ALTER TABLE "purchase_order_items" ADD CONSTRAINT "FK_poi_product" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE NO ACTION`);
    }

    // ─── SALES ORDERS ─────────────────────────────────────────────────────────
    if (!(await queryRunner.hasTable('sales_orders'))) {
      await queryRunner.query(`
        CREATE TABLE "sales_orders" (
          "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
          "organization_id" uuid NOT NULL,
          "so_number" character varying(100) NOT NULL,
          "customer_name" character varying(255),
          "customer_email" character varying(255),
          "customer_phone" character varying(50),
          "crm_client_id" uuid,
          "warehouse_id" uuid,
          "status" character varying(30) NOT NULL DEFAULT 'draft',
          "order_date" date NOT NULL,
          "delivery_date" date,
          "subtotal" numeric(12,2) NOT NULL DEFAULT 0,
          "tax_amount" numeric(12,2) NOT NULL DEFAULT 0,
          "total_amount" numeric(12,2) NOT NULL DEFAULT 0,
          "notes" text,
          "created_by" uuid,
          "created_at" TIMESTAMP NOT NULL DEFAULT now(),
          "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
          CONSTRAINT "PK_sales_orders" PRIMARY KEY ("id")
        )
      `);
      await queryRunner.query(`CREATE INDEX "IDX_so_org" ON "sales_orders" ("organization_id")`);
      await queryRunner.query(`ALTER TABLE "sales_orders" ADD CONSTRAINT "FK_so_org" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE`);
      await queryRunner.query(`ALTER TABLE "sales_orders" ADD CONSTRAINT "FK_so_warehouse" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE SET NULL`);
    }

    if (!(await queryRunner.hasTable('sales_order_items'))) {
      await queryRunner.query(`
        CREATE TABLE "sales_order_items" (
          "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
          "sales_order_id" uuid NOT NULL,
          "product_id" uuid NOT NULL,
          "quantity" numeric(10,2) NOT NULL,
          "unit_price" numeric(10,2) NOT NULL,
          "tax_rate" numeric(5,2) NOT NULL DEFAULT 0,
          "total_price" numeric(12,2) NOT NULL,
          "notes" text,
          CONSTRAINT "PK_sales_order_items" PRIMARY KEY ("id")
        )
      `);
      await queryRunner.query(`ALTER TABLE "sales_order_items" ADD CONSTRAINT "FK_soi_so" FOREIGN KEY ("sales_order_id") REFERENCES "sales_orders"("id") ON DELETE CASCADE`);
      await queryRunner.query(`ALTER TABLE "sales_order_items" ADD CONSTRAINT "FK_soi_product" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE NO ACTION`);
    }

    // ─── SHIPMENTS ────────────────────────────────────────────────────────────
    if (!(await queryRunner.hasTable('shipments'))) {
      await queryRunner.query(`
        CREATE TABLE "shipments" (
          "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
          "organization_id" uuid NOT NULL,
          "shipment_number" character varying(100) NOT NULL,
          "sales_order_id" uuid NOT NULL,
          "warehouse_id" uuid,
          "status" character varying(30) NOT NULL DEFAULT 'pending',
          "shipped_date" date,
          "delivered_date" date,
          "carrier" character varying(100),
          "tracking_number" character varying(100),
          "shipping_address" text,
          "notes" text,
          "created_by" uuid,
          "created_at" TIMESTAMP NOT NULL DEFAULT now(),
          "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
          CONSTRAINT "PK_shipments" PRIMARY KEY ("id")
        )
      `);
      await queryRunner.query(`CREATE INDEX "IDX_shipments_org" ON "shipments" ("organization_id")`);
      await queryRunner.query(`ALTER TABLE "shipments" ADD CONSTRAINT "FK_shipments_org" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE`);
      await queryRunner.query(`ALTER TABLE "shipments" ADD CONSTRAINT "FK_shipments_so" FOREIGN KEY ("sales_order_id") REFERENCES "sales_orders"("id") ON DELETE CASCADE`);
      await queryRunner.query(`ALTER TABLE "shipments" ADD CONSTRAINT "FK_shipments_warehouse" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE SET NULL`);
    }

    // ─── SERIAL NUMBERS ───────────────────────────────────────────────────────
    if (!(await queryRunner.hasTable('inventory_serial_numbers'))) {
      await queryRunner.query(`
        CREATE TABLE "inventory_serial_numbers" (
          "id" uuid NOT NULL DEFAULT gen_random_uuid(),
          "organization_id" uuid NOT NULL,
          "product_id" uuid NOT NULL,
          "warehouse_id" uuid,
          "serial_number" character varying(100) NOT NULL,
          "status" character varying(20) NOT NULL DEFAULT 'available',
          "warranty_expiry" date,
          "notes" text,
          "created_at" TIMESTAMP NOT NULL DEFAULT now(),
          "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
          CONSTRAINT "UQ_serial_org_product_serial" UNIQUE ("organization_id", "product_id", "serial_number"),
          CONSTRAINT "PK_inventory_serial_numbers" PRIMARY KEY ("id")
        )
      `);
      await queryRunner.query(`CREATE INDEX "IDX_serial_org_product" ON "inventory_serial_numbers" ("organization_id", "product_id")`);
      await queryRunner.query(`ALTER TABLE "inventory_serial_numbers" ADD CONSTRAINT "FK_serial_org" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE`);
      await queryRunner.query(`ALTER TABLE "inventory_serial_numbers" ADD CONSTRAINT "FK_serial_product" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE`);
    }

    // ─── BATCH LOTS ───────────────────────────────────────────────────────────
    if (!(await queryRunner.hasTable('inventory_batch_lots'))) {
      await queryRunner.query(`
        CREATE TABLE "inventory_batch_lots" (
          "id" uuid NOT NULL DEFAULT gen_random_uuid(),
          "organization_id" uuid NOT NULL,
          "product_id" uuid NOT NULL,
          "warehouse_id" uuid,
          "batch_number" character varying(100) NOT NULL,
          "lot_number" character varying(100),
          "manufacturer" character varying(100),
          "manufacture_date" date,
          "expiry_date" date,
          "initial_quantity" numeric(10,2) NOT NULL DEFAULT 0,
          "remaining_quantity" numeric(10,2) NOT NULL DEFAULT 0,
          "cost_price" numeric(10,2),
          "status" character varying(20) NOT NULL DEFAULT 'active',
          "notes" text,
          "created_at" TIMESTAMP NOT NULL DEFAULT now(),
          "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
          CONSTRAINT "PK_inventory_batch_lots" PRIMARY KEY ("id")
        )
      `);
      await queryRunner.query(`CREATE INDEX "IDX_batch_org_product" ON "inventory_batch_lots" ("organization_id", "product_id")`);
      await queryRunner.query(`ALTER TABLE "inventory_batch_lots" ADD CONSTRAINT "FK_batch_org" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE`);
      await queryRunner.query(`ALTER TABLE "inventory_batch_lots" ADD CONSTRAINT "FK_batch_product" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE`);
    }

    // ─── PURCHASE REQUISITIONS ────────────────────────────────────────────────
    if (!(await queryRunner.hasTable('purchase_requisitions'))) {
      await queryRunner.query(`
        CREATE TABLE "purchase_requisitions" (
          "id" uuid NOT NULL DEFAULT gen_random_uuid(),
          "organization_id" uuid NOT NULL,
          "pr_number" character varying(50) NOT NULL,
          "title" character varying(255),
          "reason" text,
          "required_by_date" date,
          "status" character varying(20) NOT NULL DEFAULT 'draft',
          "requested_by" uuid NOT NULL,
          "approved_by" uuid,
          "approved_at" TIMESTAMP,
          "rejection_reason" text,
          "converted_to_po_id" uuid,
          "total_amount" numeric(12,2) NOT NULL DEFAULT 0,
          "created_at" TIMESTAMP NOT NULL DEFAULT now(),
          "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
          CONSTRAINT "PK_purchase_requisitions" PRIMARY KEY ("id")
        )
      `);
      await queryRunner.query(`CREATE INDEX "IDX_pr_org" ON "purchase_requisitions" ("organization_id")`);
      await queryRunner.query(`ALTER TABLE "purchase_requisitions" ADD CONSTRAINT "FK_pr_org" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE`);
    }

    if (!(await queryRunner.hasTable('purchase_requisition_items'))) {
      await queryRunner.query(`
        CREATE TABLE "purchase_requisition_items" (
          "id" uuid NOT NULL DEFAULT gen_random_uuid(),
          "requisition_id" uuid NOT NULL,
          "product_id" uuid NOT NULL,
          "product_name" character varying(255),
          "quantity" numeric(10,2) NOT NULL,
          "unit" character varying(50),
          "estimated_unit_price" numeric(10,2) NOT NULL DEFAULT 0,
          "estimated_total" numeric(12,2) NOT NULL DEFAULT 0,
          "notes" text,
          CONSTRAINT "PK_purchase_requisition_items" PRIMARY KEY ("id")
        )
      `);
      await queryRunner.query(`ALTER TABLE "purchase_requisition_items" ADD CONSTRAINT "FK_pri_requisition" FOREIGN KEY ("requisition_id") REFERENCES "purchase_requisitions"("id") ON DELETE CASCADE`);
    }

    // ─── GOODS RECEIPT NOTES ──────────────────────────────────────────────────
    if (!(await queryRunner.hasTable('goods_receipt_notes'))) {
      await queryRunner.query(`
        CREATE TABLE "goods_receipt_notes" (
          "id" uuid NOT NULL DEFAULT gen_random_uuid(),
          "organization_id" uuid NOT NULL,
          "grn_number" character varying(50) NOT NULL,
          "purchase_order_id" uuid NOT NULL,
          "warehouse_id" uuid,
          "status" character varying(30) NOT NULL DEFAULT 'draft',
          "matching_status" character varying(20) NOT NULL DEFAULT 'pending',
          "received_by" uuid NOT NULL,
          "received_date" date,
          "notes" text,
          "rejection_reason" text,
          "created_at" TIMESTAMP NOT NULL DEFAULT now(),
          "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
          CONSTRAINT "PK_goods_receipt_notes" PRIMARY KEY ("id")
        )
      `);
      await queryRunner.query(`CREATE INDEX "IDX_grn_org" ON "goods_receipt_notes" ("organization_id")`);
      await queryRunner.query(`ALTER TABLE "goods_receipt_notes" ADD CONSTRAINT "FK_grn_org" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE`);
      await queryRunner.query(`ALTER TABLE "goods_receipt_notes" ADD CONSTRAINT "FK_grn_po" FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_orders"("id") ON DELETE CASCADE`);
    }

    if (!(await queryRunner.hasTable('grn_items'))) {
      await queryRunner.query(`
        CREATE TABLE "grn_items" (
          "id" uuid NOT NULL DEFAULT gen_random_uuid(),
          "grn_id" uuid NOT NULL,
          "product_id" uuid NOT NULL,
          "product_name" character varying(255),
          "ordered_quantity" numeric(10,2) NOT NULL,
          "received_quantity" numeric(10,2) NOT NULL DEFAULT 0,
          "rejected_quantity" numeric(10,2) NOT NULL DEFAULT 0,
          "unit_price" numeric(10,2),
          "notes" text,
          CONSTRAINT "PK_grn_items" PRIMARY KEY ("id")
        )
      `);
      await queryRunner.query(`ALTER TABLE "grn_items" ADD CONSTRAINT "FK_grni_grn" FOREIGN KEY ("grn_id") REFERENCES "goods_receipt_notes"("id") ON DELETE CASCADE`);
    }

    // ─── BACKORDERS ───────────────────────────────────────────────────────────
    if (!(await queryRunner.hasTable('inventory_backorders'))) {
      await queryRunner.query(`
        CREATE TABLE "inventory_backorders" (
          "id" uuid NOT NULL DEFAULT gen_random_uuid(),
          "organization_id" uuid NOT NULL,
          "backorder_number" character varying(50) NOT NULL,
          "sales_order_id" uuid NOT NULL,
          "product_id" uuid NOT NULL,
          "product_name" character varying(255),
          "original_quantity" numeric(10,2) NOT NULL,
          "backordered_quantity" numeric(10,2) NOT NULL,
          "fulfilled_quantity" numeric(10,2) NOT NULL DEFAULT 0,
          "status" character varying(30) NOT NULL DEFAULT 'open',
          "expected_fulfillment_date" date,
          "notes" text,
          "created_at" TIMESTAMP NOT NULL DEFAULT now(),
          "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
          CONSTRAINT "PK_inventory_backorders" PRIMARY KEY ("id")
        )
      `);
      await queryRunner.query(`CREATE INDEX "IDX_backorder_org" ON "inventory_backorders" ("organization_id")`);
      await queryRunner.query(`ALTER TABLE "inventory_backorders" ADD CONSTRAINT "FK_bo_org" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE`);
      await queryRunner.query(`ALTER TABLE "inventory_backorders" ADD CONSTRAINT "FK_bo_so" FOREIGN KEY ("sales_order_id") REFERENCES "sales_orders"("id") ON DELETE CASCADE`);
    }

    // ─── COMMISSION RULES ─────────────────────────────────────────────────────
    if (!(await queryRunner.hasTable('commission_rules'))) {
      await queryRunner.query(`
        CREATE TABLE "commission_rules" (
          "id" uuid NOT NULL DEFAULT gen_random_uuid(),
          "organization_id" uuid NOT NULL,
          "name" character varying(255) NOT NULL,
          "commission_type" character varying(20) NOT NULL DEFAULT 'percentage',
          "rate" numeric(10,4) NOT NULL,
          "applies_to" character varying(30) NOT NULL DEFAULT 'all_products',
          "category" character varying(100),
          "product_id" uuid,
          "min_sale_amount" numeric(12,2),
          "is_active" boolean NOT NULL DEFAULT true,
          "created_at" TIMESTAMP NOT NULL DEFAULT now(),
          "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
          CONSTRAINT "PK_commission_rules" PRIMARY KEY ("id")
        )
      `);
      await queryRunner.query(`ALTER TABLE "commission_rules" ADD CONSTRAINT "FK_cr_org" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE`);
    }

    if (!(await queryRunner.hasTable('commission_records'))) {
      await queryRunner.query(`
        CREATE TABLE "commission_records" (
          "id" uuid NOT NULL DEFAULT gen_random_uuid(),
          "organization_id" uuid NOT NULL,
          "rule_id" uuid NOT NULL,
          "sales_order_id" uuid NOT NULL,
          "sales_person" character varying(100),
          "sale_amount" numeric(12,2) NOT NULL,
          "commission_rate" numeric(10,4) NOT NULL,
          "commission_amount" numeric(12,2) NOT NULL,
          "status" character varying(20) NOT NULL DEFAULT 'pending',
          "created_at" TIMESTAMP NOT NULL DEFAULT now(),
          CONSTRAINT "PK_commission_records" PRIMARY KEY ("id")
        )
      `);
      await queryRunner.query(`CREATE INDEX "IDX_commission_records_org" ON "commission_records" ("organization_id")`);
      await queryRunner.query(`ALTER TABLE "commission_records" ADD CONSTRAINT "FK_crec_org" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE`);
      await queryRunner.query(`ALTER TABLE "commission_records" ADD CONSTRAINT "FK_crec_rule" FOREIGN KEY ("rule_id") REFERENCES "commission_rules"("id") ON DELETE CASCADE`);
      await queryRunner.query(`ALTER TABLE "commission_records" ADD CONSTRAINT "FK_crec_so" FOREIGN KEY ("sales_order_id") REFERENCES "sales_orders"("id") ON DELETE CASCADE`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "commission_records" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "commission_rules" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "inventory_backorders" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "grn_items" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "goods_receipt_notes" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "purchase_requisition_items" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "purchase_requisitions" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "inventory_batch_lots" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "inventory_serial_numbers" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "shipments" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "sales_order_items" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "sales_orders" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "purchase_order_items" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "purchase_orders" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "suppliers" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "inventory_stock_movements" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "inventory_stock" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "products" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "warehouses" CASCADE`);
  }
}
