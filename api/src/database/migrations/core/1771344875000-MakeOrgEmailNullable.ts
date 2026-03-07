import { MigrationInterface, QueryRunner } from 'typeorm';

export class MakeOrgEmailNullable1771344875000 implements MigrationInterface {
    name = 'MakeOrgEmailNullable1771344875000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // 1. Drop existing unique index/constraint to avoid conflicts if we need to change it
        // Note: In TypeORM, uniqueness is often both a constraint and an index.
        // We'll use DROP NOT NULL first.
        await queryRunner.query(
            `ALTER TABLE "organizations" ALTER COLUMN "email" DROP NOT NULL`,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Revert to NOT NULL
        await queryRunner.query(
            `ALTER TABLE "organizations" ALTER COLUMN "email" SET NOT NULL`,
        );
    }
}
