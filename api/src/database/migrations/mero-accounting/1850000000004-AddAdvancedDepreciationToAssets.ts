import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAdvancedDepreciationToAssets1850000000004 implements MigrationInterface {
    name = 'AddAdvancedDepreciationToAssets1850000000004';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Enums
        await queryRunner.query(`ALTER TYPE "public"."fixed_assets_depreciation_method_enum" ADD VALUE 'UNIT_OF_PRODUCTION'`);
        // await queryRunner.query(`CREATE TYPE "public"."fixed_assets_depreciation_block_enum" AS ENUM('A', 'B', 'C', 'D', 'E')`);

        // Columns for FixedAsset
        // await queryRunner.query(`ALTER TABLE "fixed_assets" ADD "depreciation_block" "public"."fixed_assets_depreciation_block_enum"`);
        await queryRunner.query(`ALTER TABLE "fixed_assets" ADD "total_units_production" numeric(15,2)`);
        await queryRunner.query(`ALTER TABLE "fixed_assets" ADD "units_produced_to_date" numeric(15,2) NOT NULL DEFAULT '0'`);

        // Columns for DepreciationLog
        await queryRunner.query(`ALTER TABLE "depreciation_logs" ADD "units_produced_this_period" numeric(15,2)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop columns from DepreciationLog
        await queryRunner.query(`ALTER TABLE "depreciation_logs" DROP COLUMN "units_produced_this_period"`);

        // Drop columns from FixedAsset
        await queryRunner.query(`ALTER TABLE "fixed_assets" DROP COLUMN "units_produced_to_date"`);
        await queryRunner.query(`ALTER TABLE "fixed_assets" DROP COLUMN "total_units_production"`);
        await queryRunner.query(`ALTER TABLE "fixed_assets" DROP COLUMN "depreciation_block"`);

        // Drop Enum (Note: Postgres doesn't easily allow dropping values from ENUMs, so we leave it or replace the type)
        await queryRunner.query(`DROP TYPE "public"."fixed_assets_depreciation_block_enum"`);
    }
}
