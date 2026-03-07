import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCrmTables1785000000000 implements MigrationInterface {
    name = 'CreateCrmTables1785000000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create crm_clients table
        await queryRunner.query(`
      CREATE TABLE "crm_clients" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "removed" boolean NOT NULL DEFAULT false,
        "enabled" boolean NOT NULL DEFAULT true,
        "name" character varying(255) NOT NULL,
        "phone" character varying(50),
        "country" character varying(100),
        "address" text,
        "email" character varying(255),
        "organization_id" uuid NOT NULL,
        "created_by_id" uuid NOT NULL,
        "assigned_to_id" uuid,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_crm_clients" PRIMARY KEY ("id"),
        CONSTRAINT "FK_crm_clients_organization" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
        CONSTRAINT "FK_crm_clients_created_by" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
        CONSTRAINT "FK_crm_clients_assigned_to" FOREIGN KEY ("assigned_to_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
      )
    `);

        // Create crm_invoices table
        await queryRunner.query(`
      CREATE TYPE "crm_invoices_recurring_enum" AS ENUM('daily', 'weekly', 'monthly', 'yearly', 'never')
    `);

        await queryRunner.query(`
      CREATE TYPE "crm_invoices_paymentstatus_enum" AS ENUM('unpaid', 'paid', 'partially', 'overdue')
    `);

        await queryRunner.query(`
      CREATE TYPE "crm_invoices_status_enum" AS ENUM('draft', 'pending', 'sent', 'accepted', 'declined', 'cancelled', 'on_hold', 'refunded')
    `);

        await queryRunner.query(`
      CREATE TABLE "crm_invoices" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "removed" boolean NOT NULL DEFAULT false,
        "number" integer NOT NULL,
        "year" integer NOT NULL,
        "content" text,
        "recurring" "crm_invoices_recurring_enum" NOT NULL DEFAULT 'never',
        "date" TIMESTAMP NOT NULL,
        "expired_date" TIMESTAMP NOT NULL,
        "client_id" uuid NOT NULL,
        "organization_id" uuid NOT NULL,
        "created_by_id" uuid NOT NULL,
        "tax_rate" numeric(12,2) NOT NULL DEFAULT 0,
        "sub_total" numeric(12,2) NOT NULL DEFAULT 0,
        "tax_total" numeric(12,2) NOT NULL DEFAULT 0,
        "total" numeric(12,2) NOT NULL DEFAULT 0,
        "discount" numeric(12,2) NOT NULL DEFAULT 0,
        "credit" numeric(12,2) NOT NULL DEFAULT 0,
        "currency" character varying(10) NOT NULL DEFAULT 'USD',
        "payment_status" "crm_invoices_paymentstatus_enum" NOT NULL DEFAULT 'unpaid',
        "status" "crm_invoices_status_enum" NOT NULL DEFAULT 'draft',
        "is_overdue" boolean NOT NULL DEFAULT false,
        "approved" boolean NOT NULL DEFAULT false,
        "notes" text,
        "pdf" character varying(500),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_crm_invoices" PRIMARY KEY ("id"),
        CONSTRAINT "FK_crm_invoices_client" FOREIGN KEY ("client_id") REFERENCES "crm_clients"("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
        CONSTRAINT "FK_crm_invoices_organization" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
        CONSTRAINT "FK_crm_invoices_created_by" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
      )
    `);

        // Create crm_invoice_items table
        await queryRunner.query(`
      CREATE TABLE "crm_invoice_items" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "invoice_id" uuid NOT NULL,
        "item_name" character varying(255) NOT NULL,
        "description" text,
        "quantity" integer NOT NULL DEFAULT 1,
        "price" numeric(12,2) NOT NULL DEFAULT 0,
        "total" numeric(12,2) NOT NULL DEFAULT 0,
        CONSTRAINT "PK_crm_invoice_items" PRIMARY KEY ("id"),
        CONSTRAINT "FK_crm_invoice_items_invoice" FOREIGN KEY ("invoice_id") REFERENCES "crm_invoices"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
      )
    `);

        // Create crm_payments table
        await queryRunner.query(`
      CREATE TABLE "crm_payments" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "removed" boolean NOT NULL DEFAULT false,
        "invoice_id" uuid NOT NULL,
        "organization_id" uuid NOT NULL,
        "created_by_id" uuid NOT NULL,
        "date" TIMESTAMP NOT NULL,
        "amount" numeric(12,2) NOT NULL DEFAULT 0,
        "payment_mode" character varying(50) NOT NULL,
        "notes" text,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_crm_payments" PRIMARY KEY ("id"),
        CONSTRAINT "FK_crm_payments_invoice" FOREIGN KEY ("invoice_id") REFERENCES "crm_invoices"("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
        CONSTRAINT "FK_crm_payments_organization" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
        CONSTRAINT "FK_crm_payments_created_by" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
      )
    `);

        // Create indexes
        await queryRunner.query(`CREATE INDEX "IDX_crm_clients_organization" ON "crm_clients" ("organization_id")`);
        await queryRunner.query(`CREATE INDEX "IDX_crm_clients_created_by" ON "crm_clients" ("created_by_id")`);
        await queryRunner.query(`CREATE INDEX "IDX_crm_invoices_client" ON "crm_invoices" ("client_id")`);
        await queryRunner.query(`CREATE INDEX "IDX_crm_invoices_organization" ON "crm_invoices" ("organization_id")`);
        await queryRunner.query(`CREATE INDEX "IDX_crm_invoices_payment_status" ON "crm_invoices" ("payment_status")`);
        await queryRunner.query(`CREATE INDEX "IDX_crm_invoices_status" ON "crm_invoices" ("status")`);
        await queryRunner.query(`CREATE INDEX "IDX_crm_invoice_items_invoice" ON "crm_invoice_items" ("invoice_id")`);
        await queryRunner.query(`CREATE INDEX "IDX_crm_payments_invoice" ON "crm_payments" ("invoice_id")`);
        await queryRunner.query(`CREATE INDEX "IDX_crm_payments_organization" ON "crm_payments" ("organization_id")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop indexes
        await queryRunner.query(`DROP INDEX "IDX_crm_payments_organization"`);
        await queryRunner.query(`DROP INDEX "IDX_crm_payments_invoice"`);
        await queryRunner.query(`DROP INDEX "IDX_crm_invoice_items_invoice"`);
        await queryRunner.query(`DROP INDEX "IDX_crm_invoices_status"`);
        await queryRunner.query(`DROP INDEX "IDX_crm_invoices_payment_status"`);
        await queryRunner.query(`DROP INDEX "IDX_crm_invoices_organization"`);
        await queryRunner.query(`DROP INDEX "IDX_crm_invoices_client"`);
        await queryRunner.query(`DROP INDEX "IDX_crm_clients_created_by"`);
        await queryRunner.query(`DROP INDEX "IDX_crm_clients_organization"`);

        // Drop tables
        await queryRunner.query(`DROP TABLE "crm_payments"`);
        await queryRunner.query(`DROP TABLE "crm_invoice_items"`);
        await queryRunner.query(`DROP TABLE "crm_invoices"`);
        await queryRunner.query(`DROP TYPE "crm_invoices_status_enum"`);
        await queryRunner.query(`DROP TYPE "crm_invoices_paymentstatus_enum"`);
        await queryRunner.query(`DROP TYPE "crm_invoices_recurring_enum"`);
        await queryRunner.query(`DROP TABLE "crm_clients"`);
    }
}
