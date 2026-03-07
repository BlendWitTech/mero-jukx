import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAssetLifecycleTables1850000000005 implements MigrationInterface {
    name = 'AddAssetLifecycleTables1850000000005';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // FK Accounts in FixedAsset
        await queryRunner.query(`ALTER TABLE "fixed_assets" ADD "revaluation_reserve_account_id" uuid`);
        await queryRunner.query(`ALTER TABLE "fixed_assets" ADD "gain_loss_account_id" uuid`);

        await queryRunner.query(`ALTER TABLE "fixed_assets" ADD CONSTRAINT "FK_fa_reval_acc" FOREIGN KEY ("revaluation_reserve_account_id") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "fixed_assets" ADD CONSTRAINT "FK_fa_gain_loss_acc" FOREIGN KEY ("gain_loss_account_id") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE`);

        // AssetMaintenanceLog Table
        await queryRunner.query(`
            CREATE TABLE "asset_maintenance_logs" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "asset_id" uuid NOT NULL,
                "maintenance_date" date NOT NULL,
                "description" text NOT NULL,
                "cost" numeric(15,2) NOT NULL DEFAULT '0',
                "vendor_id" uuid,
                "journal_entry_id" uuid,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_asset_maint_logs" PRIMARY KEY ("id")
            )
        `);

        // FKs for AssetMaintenanceLog
        await queryRunner.query(`ALTER TABLE "asset_maintenance_logs" ADD CONSTRAINT "FK_aml_asset" FOREIGN KEY ("asset_id") REFERENCES "fixed_assets"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "asset_maintenance_logs" ADD CONSTRAINT "FK_aml_vendor" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE SET NULL ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "asset_maintenance_logs" ADD CONSTRAINT "FK_aml_je" FOREIGN KEY ("journal_entry_id") REFERENCES "journal_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop FKs from AssetMaintenanceLog
        await queryRunner.query(`ALTER TABLE "asset_maintenance_logs" DROP CONSTRAINT "FK_aml_je"`);
        await queryRunner.query(`ALTER TABLE "asset_maintenance_logs" DROP CONSTRAINT "FK_aml_vendor"`);
        await queryRunner.query(`ALTER TABLE "asset_maintenance_logs" DROP CONSTRAINT "FK_aml_asset"`);

        // Drop AssetMaintenanceLog Table
        await queryRunner.query(`DROP TABLE "asset_maintenance_logs"`);

        // Drop FKs from FixedAsset
        await queryRunner.query(`ALTER TABLE "fixed_assets" DROP CONSTRAINT "FK_fa_gain_loss_acc"`);
        await queryRunner.query(`ALTER TABLE "fixed_assets" DROP CONSTRAINT "FK_fa_reval_acc"`);

        // Drop columns from FixedAsset
        await queryRunner.query(`ALTER TABLE "fixed_assets" DROP COLUMN "gain_loss_account_id"`);
        await queryRunner.query(`ALTER TABLE "fixed_assets" DROP COLUMN "revaluation_reserve_account_id"`);
    }
}
