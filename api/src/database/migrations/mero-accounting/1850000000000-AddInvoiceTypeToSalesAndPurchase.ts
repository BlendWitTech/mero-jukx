import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddInvoiceTypeToSalesAndPurchase1850000000000 implements MigrationInterface {
    name = 'AddInvoiceTypeToSalesAndPurchase1850000000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create Enum types
        await queryRunner.query(`CREATE TYPE "public"."sales_invoices_type_enum" AS ENUM('INVOICE', 'CREDIT_NOTE')`);
        await queryRunner.query(`CREATE TYPE "public"."purchase_invoices_type_enum" AS ENUM('INVOICE', 'DEBIT_NOTE')`);

        // Add columns
        await queryRunner.query(`ALTER TABLE "sales_invoices" ADD "type" "public"."sales_invoices_type_enum" NOT NULL DEFAULT 'INVOICE'`);
        await queryRunner.query(`ALTER TABLE "purchase_invoices" ADD "type" "public"."purchase_invoices_type_enum" NOT NULL DEFAULT 'INVOICE'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "purchase_invoices" DROP COLUMN "type"`);
        await queryRunner.query(`ALTER TABLE "sales_invoices" DROP COLUMN "type"`);

        await queryRunner.query(`DROP TYPE "public"."purchase_invoices_type_enum"`);
        await queryRunner.query(`DROP TYPE "public"."sales_invoices_type_enum"`);
    }
}
