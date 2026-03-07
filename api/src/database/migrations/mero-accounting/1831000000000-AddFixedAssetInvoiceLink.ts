import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFixedAssetInvoiceLink1831000000000 implements MigrationInterface {
    name = 'AddFixedAssetInvoiceLink1831000000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add source_invoice_id to fixed_assets (links asset to the purchase invoice it was created from)
        const hasSourceInvoiceId = await queryRunner.query(`
            SELECT column_name FROM information_schema.columns 
            WHERE table_name = 'fixed_assets' AND column_name = 'source_invoice_id'
        `);
        if (hasSourceInvoiceId.length === 0) {
            await queryRunner.query(`
                ALTER TABLE fixed_assets ADD COLUMN source_invoice_id UUID NULL
            `);
        }

        // Add category to fixed_assets
        const hasCategory = await queryRunner.query(`
            SELECT column_name FROM information_schema.columns 
            WHERE table_name = 'fixed_assets' AND column_name = 'category'
        `);
        if (hasCategory.length === 0) {
            await queryRunner.query(`
                ALTER TABLE fixed_assets ADD COLUMN category VARCHAR(100) NULL
            `);
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE fixed_assets DROP COLUMN IF EXISTS source_invoice_id`);
        await queryRunner.query(`ALTER TABLE fixed_assets DROP COLUMN IF EXISTS category`);
    }
}
