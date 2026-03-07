import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixCrmTables1791000000000 implements MigrationInterface {
    name = 'FixCrmTables1791000000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Drop existing tables if they exist (clean up from previous failed attempt)
        await queryRunner.query(`DROP TABLE IF EXISTS "crm_payments" CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS "crm_invoice_items" CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS "crm_invoices" CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS "crm_clients" CASCADE`);

        // Drop existing types if they exist
        await queryRunner.query(`DROP TYPE IF EXISTS "crm_invoices_status_enum" CASCADE`);
        await queryRunner.query(`DROP TYPE IF EXISTS "crm_invoices_paymentstatus_enum" CASCADE`);
        await queryRunner.query(`DROP TYPE IF EXISTS "crm_invoices_recurring_enum" CASCADE`);

        // Recreate crm_clients table
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
        "created_by_id" uuid,
        "assigned_to_id" uuid,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_crm_clients" PRIMARY KEY ("id"),
        CONSTRAINT "FK_crm_clients_organization" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
        CONSTRAINT "FK_crm_clients_created_by" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
        CONSTRAINT "FK_crm_clients_assigned_to" FOREIGN KEY ("assigned_to_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
      )
    `);

        // Recreate crm_invoices table with fixed column names
        await queryRunner.query(`
      CREATE TYPE "crm_invoices_recurring_enum" AS ENUM('daily', 'weekly', 'monthly', 'annually', 'quarter')
    `);

        await queryRunner.query(`
      CREATE TYPE "crm_invoices_paymentstatus_enum" AS ENUM('unpaid', 'paid', 'partially')
    `);

        await queryRunner.query(`
      CREATE TYPE "crm_invoices_status_enum" AS ENUM('draft', 'pending', 'sent', 'refunded', 'cancelled', 'on hold')
    `);

        await queryRunner.query(`
      CREATE TABLE "crm_invoices" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "removed" boolean NOT NULL DEFAULT false,
        "number" integer NOT NULL,
        "year" integer NOT NULL,
        "content" text,
        "recurring" "crm_invoices_recurring_enum",
        "date" date NOT NULL,
        "expired_date" date NOT NULL,
        "client_id" uuid NOT NULL,
        "organization_id" uuid NOT NULL,
        "created_by_id" uuid NOT NULL,
        "taxRate" numeric(12,2) NOT NULL DEFAULT 0,
        "subTotal" numeric(12,2) NOT NULL DEFAULT 0,
        "taxTotal" numeric(12,2) NOT NULL DEFAULT 0,
        "total" numeric(12,2) NOT NULL DEFAULT 0,
        "discount" numeric(12,2) NOT NULL DEFAULT 0,
        "credit" numeric(12,2) NOT NULL DEFAULT 0,
        "currency" character varying(255) NOT NULL DEFAULT 'USD',
        "paymentStatus" "crm_invoices_paymentstatus_enum" NOT NULL DEFAULT 'unpaid',
        "status" "crm_invoices_status_enum" NOT NULL DEFAULT 'draft',
        "isOverdue" boolean NOT NULL DEFAULT false,
        "approved" boolean NOT NULL DEFAULT false,
        "notes" text,
        "pdf" character varying(255),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_crm_invoices" PRIMARY KEY ("id"),
        CONSTRAINT "FK_crm_invoices_client" FOREIGN KEY ("client_id") REFERENCES "crm_clients"("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
        CONSTRAINT "FK_crm_invoices_organization" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
        CONSTRAINT "FK_crm_invoices_created_by" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
      )
    `);

        // Recreate crm_invoice_items table with fixed column names
        await queryRunner.query(`
      CREATE TABLE "crm_invoice_items" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "invoice_id" uuid NOT NULL,
        "itemName" character varying(255) NOT NULL,
        "description" text,
        "quantity" numeric(12,2) NOT NULL DEFAULT 1,
        "price" numeric(12,2) NOT NULL,
        "total" numeric(12,2) NOT NULL,
        CONSTRAINT "PK_crm_invoice_items" PRIMARY KEY ("id"),
        CONSTRAINT "FK_crm_invoice_items_invoice" FOREIGN KEY ("invoice_id") REFERENCES "crm_invoices"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
      )
    `);

        // Recreate crm_payments table with fixed column names
        await queryRunner.query(`
      CREATE TABLE "crm_payments" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "removed" boolean NOT NULL DEFAULT false,
        "invoice_id" uuid NOT NULL,
        "organization_id" uuid NOT NULL,
        "created_by_id" uuid NOT NULL,
        "date" date NOT NULL,
        "amount" numeric(12,2) NOT NULL,
        "paymentMode" character varying(255),
        "notes" text,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_crm_payments" PRIMARY KEY ("id"),
        CONSTRAINT "FK_crm_payments_invoice" FOREIGN KEY ("invoice_id") REFERENCES "crm_invoices"("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
        CONSTRAINT "FK_crm_payments_organization" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
        CONSTRAINT "FK_crm_payments_created_by" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
      )
    `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "crm_payments"`);
        await queryRunner.query(`DROP TABLE "crm_invoice_items"`);
        await queryRunner.query(`DROP TABLE "crm_invoices"`);
        await queryRunner.query(`DROP TABLE "crm_clients"`);
        await queryRunner.query(`DROP TYPE "crm_invoices_status_enum"`);
        await queryRunner.query(`DROP TYPE "crm_invoices_paymentstatus_enum"`);
        await queryRunner.query(`DROP TYPE "crm_invoices_recurring_enum"`);
    }
}
