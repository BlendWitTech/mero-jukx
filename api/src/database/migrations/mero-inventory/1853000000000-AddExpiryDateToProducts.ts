import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddExpiryDateToProducts1853000000000 implements MigrationInterface {
    name = 'AddExpiryDateToProducts1853000000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        const hasTable = await queryRunner.hasTable('inventory_products');
        if (!hasTable) return;

        const hasExpiry = await queryRunner.hasColumn('inventory_products', 'expiry_date');
        if (!hasExpiry) {
            await queryRunner.query(`
                ALTER TABLE "inventory_products"
                ADD COLUMN "expiry_date" date NULL
            `);
        }

        const hasAlertDays = await queryRunner.hasColumn('inventory_products', 'expiry_alert_days');
        if (!hasAlertDays) {
            await queryRunner.query(`
                ALTER TABLE "inventory_products"
                ADD COLUMN "expiry_alert_days" integer NOT NULL DEFAULT 30
            `);
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        const hasTable = await queryRunner.hasTable('inventory_products');
        if (!hasTable) return;

        const hasExpiry = await queryRunner.hasColumn('inventory_products', 'expiry_date');
        if (hasExpiry) {
            await queryRunner.query(`ALTER TABLE "inventory_products" DROP COLUMN "expiry_date"`);
        }

        const hasAlertDays = await queryRunner.hasColumn('inventory_products', 'expiry_alert_days');
        if (hasAlertDays) {
            await queryRunner.query(`ALTER TABLE "inventory_products" DROP COLUMN "expiry_alert_days"`);
        }
    }
}
