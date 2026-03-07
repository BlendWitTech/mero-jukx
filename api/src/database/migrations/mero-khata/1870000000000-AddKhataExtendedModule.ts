import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddKhataExtendedModule1870000000000 implements MigrationInterface {
    name = 'AddKhataExtendedModule1870000000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // khata_entry_type enum
        const hasEntryEnum = await queryRunner.query(
            `SELECT 1 FROM pg_type WHERE typname = 'khata_entry_type_enum'`
        );
        if (!hasEntryEnum.length) {
            await queryRunner.query(`CREATE TYPE "khata_entry_type_enum" AS ENUM ('INCOME', 'EXPENSE')`);
        }

        // khata_categories
        if (!(await queryRunner.hasTable('khata_categories'))) {
            await queryRunner.query(`
                CREATE TABLE "khata_categories" (
                    "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                    "organization_id" uuid NOT NULL,
                    "name" varchar(100) NOT NULL,
                    "type" "khata_entry_type_enum" NOT NULL,
                    "color" varchar(50),
                    "icon" varchar(50),
                    "is_default" boolean NOT NULL DEFAULT false,
                    "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                    CONSTRAINT "PK_khata_categories" PRIMARY KEY ("id")
                )
            `);
        }

        // khata_entries
        if (!(await queryRunner.hasTable('khata_entries'))) {
            await queryRunner.query(`
                CREATE TABLE "khata_entries" (
                    "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                    "organization_id" uuid NOT NULL,
                    "category_id" uuid,
                    "type" "khata_entry_type_enum" NOT NULL,
                    "amount" decimal(12,2) NOT NULL,
                    "payment_method" varchar(30),
                    "date" date NOT NULL,
                    "notes" text,
                    "reference" varchar(100),
                    "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                    CONSTRAINT "PK_khata_entries" PRIMARY KEY ("id")
                )
            `);
        }

        // khata_invoice_status enum
        const hasInvEnum = await queryRunner.query(
            `SELECT 1 FROM pg_type WHERE typname = 'khata_invoice_status_enum'`
        );
        if (!hasInvEnum.length) {
            await queryRunner.query(`CREATE TYPE "khata_invoice_status_enum" AS ENUM ('DRAFT', 'SENT', 'PAID', 'OVERDUE')`);
        }

        // khata_invoices
        if (!(await queryRunner.hasTable('khata_invoices'))) {
            await queryRunner.query(`
                CREATE TABLE "khata_invoices" (
                    "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                    "organization_id" uuid NOT NULL,
                    "invoice_number" varchar(50) NOT NULL,
                    "customer_name" varchar(200) NOT NULL,
                    "customer_phone" varchar(20),
                    "customer_address" text,
                    "items" jsonb NOT NULL DEFAULT '[]',
                    "subtotal" decimal(12,2) NOT NULL DEFAULT 0,
                    "vat_rate" decimal(5,2) NOT NULL DEFAULT 13,
                    "vat_amount" decimal(12,2) NOT NULL DEFAULT 0,
                    "total" decimal(12,2) NOT NULL DEFAULT 0,
                    "status" "khata_invoice_status_enum" NOT NULL DEFAULT 'DRAFT',
                    "due_date" date,
                    "notes" text,
                    "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                    "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                    CONSTRAINT "PK_khata_invoices" PRIMARY KEY ("id")
                )
            `);
        }

        // khata_bill_status enum
        const hasBillEnum = await queryRunner.query(
            `SELECT 1 FROM pg_type WHERE typname = 'khata_bill_status_enum'`
        );
        if (!hasBillEnum.length) {
            await queryRunner.query(`CREATE TYPE "khata_bill_status_enum" AS ENUM ('PENDING', 'PAID', 'OVERDUE')`);
        }

        // khata_bills
        if (!(await queryRunner.hasTable('khata_bills'))) {
            await queryRunner.query(`
                CREATE TABLE "khata_bills" (
                    "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                    "organization_id" uuid NOT NULL,
                    "bill_number" varchar(50) NOT NULL,
                    "supplier_name" varchar(200) NOT NULL,
                    "supplier_phone" varchar(20),
                    "items" jsonb NOT NULL DEFAULT '[]',
                    "subtotal" decimal(12,2) NOT NULL DEFAULT 0,
                    "vat_amount" decimal(12,2) NOT NULL DEFAULT 0,
                    "total" decimal(12,2) NOT NULL DEFAULT 0,
                    "status" "khata_bill_status_enum" NOT NULL DEFAULT 'PENDING',
                    "due_date" date,
                    "notes" text,
                    "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                    "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                    CONSTRAINT "PK_khata_bills" PRIMARY KEY ("id")
                )
            `);
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE IF EXISTS "khata_bills" CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS "khata_invoices" CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS "khata_entries" CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS "khata_categories" CASCADE`);
        await queryRunner.query(`DROP TYPE IF EXISTS "khata_bill_status_enum"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "khata_invoice_status_enum"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "khata_entry_type_enum"`);
    }
}
