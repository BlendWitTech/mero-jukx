import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdatePurchaseInvoices1841000000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add items column
        await queryRunner.query(`ALTER TABLE "purchase_invoices" ADD COLUMN IF NOT EXISTS "items" jsonb`);

        // Add defaults and make non-nullable (if needed) for subtotal, vat_amount, total_amount
        await queryRunner.query(`ALTER TABLE "purchase_invoices" ALTER COLUMN "subtotal" SET DEFAULT 0`);
        await queryRunner.query(`ALTER TABLE "purchase_invoices" ALTER COLUMN "vat_amount" SET DEFAULT 0`);
        await queryRunner.query(`ALTER TABLE "purchase_invoices" ALTER COLUMN "total_amount" SET DEFAULT 0`);

        // Update existing nulls to 0 just in case
        await queryRunner.query(`UPDATE "purchase_invoices" SET "subtotal" = 0 WHERE "subtotal" IS NULL`);
        await queryRunner.query(`UPDATE "purchase_invoices" SET "vat_amount" = 0 WHERE "vat_amount" IS NULL`);
        await queryRunner.query(`UPDATE "purchase_invoices" SET "total_amount" = 0 WHERE "total_amount" IS NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "purchase_invoices" DROP COLUMN "items"`);
        await queryRunner.query(`ALTER TABLE "purchase_invoices" ALTER COLUMN "subtotal" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "purchase_invoices" ALTER COLUMN "vat_amount" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "purchase_invoices" ALTER COLUMN "total_amount" DROP DEFAULT`);
    }
}
