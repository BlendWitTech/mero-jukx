import { MigrationInterface, QueryRunner } from "typeorm";

export class AddDepreciationBlockToFixedAssets1858000000000 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."fixed_assets_depreciation_block_enum" AS ENUM('A', 'B', 'C', 'D', 'E')`);
        await queryRunner.query(`ALTER TABLE "fixed_assets" ADD "depreciation_block" "public"."fixed_assets_depreciation_block_enum"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "fixed_assets" DROP COLUMN "depreciation_block"`);
        await queryRunner.query(`DROP TYPE "public"."fixed_assets_depreciation_block_enum"`);
    }

}
