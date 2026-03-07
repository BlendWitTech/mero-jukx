import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPaymentTracking1845000000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add paid_amount to purchase_invoices
        await queryRunner.query(`ALTER TABLE "purchase_invoices" ADD COLUMN IF NOT EXISTS "paid_amount" decimal(15,2) NOT NULL DEFAULT 0`);

        // Add PARTIALLY_PAID to purchase_invoice status enum
        await queryRunner.query(`ALTER TYPE "public"."purchase_invoices_status_enum" ADD VALUE IF NOT EXISTS 'PARTIALLY_PAID'`);

        // Add paid_amount to sales_invoices
        await queryRunner.query(`ALTER TABLE "sales_invoices" ADD COLUMN IF NOT EXISTS "paid_amount" decimal(15,2) NOT NULL DEFAULT 0`);

        // Add PARTIALLY_PAID to sales_invoice status enum
        await queryRunner.query(`ALTER TYPE "public"."sales_invoices_status_enum" ADD VALUE IF NOT EXISTS 'PARTIALLY_PAID'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "purchase_invoices" DROP COLUMN IF EXISTS "paid_amount"`);
        await queryRunner.query(`ALTER TABLE "sales_invoices" DROP COLUMN IF EXISTS "paid_amount"`);
        // Note: PostgreSQL does not support removing enum values
    }
}
