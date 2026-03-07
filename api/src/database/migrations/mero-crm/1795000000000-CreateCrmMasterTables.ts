import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateCrmMasterTables1795000000000 implements MigrationInterface {
    name = 'CreateCrmMasterTables1795000000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create crm_taxes table
        await queryRunner.query(`
            CREATE TABLE "crm_taxes" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "removed" boolean NOT NULL DEFAULT false,
                "enabled" boolean NOT NULL DEFAULT true,
                "tax_name" character varying(255) NOT NULL,
                "tax_value" numeric(12,2) NOT NULL,
                "is_default" boolean NOT NULL DEFAULT false,
                "organization_id" uuid NOT NULL,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_crm_taxes" PRIMARY KEY ("id"),
                CONSTRAINT "FK_crm_taxes_organization" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
            )
        `);
        await queryRunner.query(`CREATE INDEX "IDX_crm_taxes_organization" ON "crm_taxes" ("organization_id")`);

        // Create crm_settings table
        await queryRunner.query(`
            CREATE TABLE "crm_settings" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "setting_key" character varying(255) NOT NULL,
                "setting_value" text,
                "organization_id" uuid NOT NULL,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_crm_settings" PRIMARY KEY ("id"),
                CONSTRAINT "FK_crm_settings_organization" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
            )
        `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_crm_settings_org_key" ON "crm_settings" ("organization_id", "setting_key")`);
        await queryRunner.query(`CREATE INDEX "IDX_crm_settings_organization" ON "crm_settings" ("organization_id")`);

        // Create crm_payment_modes table
        await queryRunner.query(`
            CREATE TABLE "crm_payment_modes" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "removed" boolean NOT NULL DEFAULT false,
                "enabled" boolean NOT NULL DEFAULT true,
                "name" character varying(255) NOT NULL,
                "description" text,
                "is_default" boolean NOT NULL DEFAULT false,
                "organization_id" uuid NOT NULL,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_crm_payment_modes" PRIMARY KEY ("id"),
                CONSTRAINT "FK_crm_payment_modes_organization" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
            )
        `);
        await queryRunner.query(`CREATE INDEX "IDX_crm_payment_modes_organization" ON "crm_payment_modes" ("organization_id")`);

        // Create crm_quotes status enum
        await queryRunner.query(`
            CREATE TYPE "crm_quotes_status_enum" AS ENUM('draft', 'pending', 'sent', 'accepted', 'declined', 'cancelled', 'on hold')
        `);

        // Create crm_quotes table
        await queryRunner.query(`
            CREATE TABLE "crm_quotes" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "removed" boolean NOT NULL DEFAULT false,
                "converted" boolean NOT NULL DEFAULT false,
                "number" integer NOT NULL,
                "year" integer NOT NULL,
                "content" text,
                "date" date NOT NULL,
                "expired_date" date NOT NULL,
                "client_id" uuid NOT NULL,
                "organization_id" uuid NOT NULL,
                "created_by_id" uuid NOT NULL,
                "taxRate" numeric(12,2) NOT NULL DEFAULT '0',
                "subTotal" numeric(12,2) NOT NULL DEFAULT '0',
                "taxTotal" numeric(12,2) NOT NULL DEFAULT '0',
                "total" numeric(12,2) NOT NULL DEFAULT '0',
                "currency" character varying(255) NOT NULL DEFAULT 'USD',
                "discount" numeric(12,2) NOT NULL DEFAULT '0',
                "status" "crm_quotes_status_enum" NOT NULL DEFAULT 'draft',
                "approved" boolean NOT NULL DEFAULT false,
                "notes" text,
                "pdf" character varying(255),
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_crm_quotes" PRIMARY KEY ("id"),
                CONSTRAINT "FK_crm_quotes_client" FOREIGN KEY ("client_id") REFERENCES "crm_clients"("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
                CONSTRAINT "FK_crm_quotes_organization" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
                CONSTRAINT "FK_crm_quotes_created_by" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
            )
        `);
        await queryRunner.query(`CREATE INDEX "IDX_crm_quotes_client" ON "crm_quotes" ("client_id")`);
        await queryRunner.query(`CREATE INDEX "IDX_crm_quotes_organization" ON "crm_quotes" ("organization_id")`);

        // Create crm_quote_items table
        await queryRunner.query(`
            CREATE TABLE "crm_quote_items" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "quote_id" uuid NOT NULL,
                "itemName" character varying(255) NOT NULL,
                "description" text,
                "quantity" numeric(12,2) NOT NULL DEFAULT '1',
                "price" numeric(12,2) NOT NULL,
                "total" numeric(12,2) NOT NULL,
                CONSTRAINT "PK_crm_quote_items" PRIMARY KEY ("id"),
                CONSTRAINT "FK_crm_quote_items_quote" FOREIGN KEY ("quote_id") REFERENCES "crm_quotes"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
            )
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "crm_quote_items"`);
        await queryRunner.query(`DROP TABLE "crm_quotes"`);
        await queryRunner.query(`DROP TYPE "crm_quotes_status_enum"`);
        await queryRunner.query(`DROP TABLE "crm_payment_modes"`);
        await queryRunner.query(`DROP TABLE "crm_settings"`);
        await queryRunner.query(`DROP TABLE "crm_taxes"`);
    }
}
