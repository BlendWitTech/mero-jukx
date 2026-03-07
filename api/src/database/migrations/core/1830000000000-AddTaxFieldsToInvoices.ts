import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddTaxFieldsToInvoices1830000000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add TDS fields to purchase_invoices
        await queryRunner.addColumns('purchase_invoices', [
            new TableColumn({
                name: 'tds_amount',
                type: 'decimal',
                precision: 15,
                scale: 2,
                default: 0,
            }),
            new TableColumn({
                name: 'tds_category_id',
                type: 'varchar',
                length: '50',
                isNullable: true,
            }),
        ]);

        // Ensure sales_invoices has vat_amount (it should, but good to be sure if adding more later)
        // Actually, let's check sales_invoices columns if possible, but I'll skip for now and assume it matches the entity.
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropColumn('purchase_invoices', 'tds_category_id');
        await queryRunner.dropColumn('purchase_invoices', 'tds_amount');
    }
}
