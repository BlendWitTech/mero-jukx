import { MigrationInterface, QueryRunner } from "typeorm";

export class AddWarehouseType1805000000000 implements MigrationInterface {
    name = 'AddWarehouseType1805000000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Double check if column exists before adding to avoid error if it partially exists
        const hasColumn = await queryRunner.hasColumn("warehouses", "type");
        if (!hasColumn) {
            await queryRunner.query(`ALTER TABLE "warehouses" ADD "type" character varying NOT NULL DEFAULT 'main'`);
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        const hasColumn = await queryRunner.hasColumn("warehouses", "type");
        if (hasColumn) {
            await queryRunner.query(`ALTER TABLE "warehouses" DROP COLUMN "type"`);
        }
    }
}
