import { MigrationInterface, QueryRunner } from 'typeorm';

export class ExpandOrganizationFeatures1792000000000 implements MigrationInterface {
    name = 'ExpandOrganizationFeatures1792000000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add currency column
        await queryRunner.query(
            `ALTER TABLE "organizations" ADD COLUMN "currency" varchar(10) DEFAULT 'USD'`,
        );

        // Add org_type column
        await queryRunner.query(
            `CREATE TYPE "organizations_org_type_enum" AS ENUM('MAIN', 'BRANCH')`,
        );
        await queryRunner.query(
            `ALTER TABLE "organizations" ADD COLUMN "org_type" "organizations_org_type_enum" DEFAULT 'MAIN'`,
        );

        // Add parent_id column for hierarchy
        await queryRunner.query(
            `ALTER TABLE "organizations" ADD COLUMN "parent_id" uuid`,
        );

        // Add foreign key constraint
        await queryRunner.query(
            `ALTER TABLE "organizations" ADD CONSTRAINT "FK_organizations_parent_id" FOREIGN KEY ("parent_id") REFERENCES "organizations"("id") ON DELETE SET NULL`,
        );

        // Add index for parent_id
        await queryRunner.query(
            `CREATE INDEX "IDX_organizations_parent_id" ON "organizations"("parent_id")`,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "organizations" DROP CONSTRAINT "FK_organizations_parent_id"`);
        await queryRunner.query(`DROP INDEX "IDX_organizations_parent_id"`);
        await queryRunner.query(`ALTER TABLE "organizations" DROP COLUMN "parent_id"`);
        await queryRunner.query(`ALTER TABLE "organizations" DROP COLUMN "org_type"`);
        await queryRunner.query(`DROP TYPE "organizations_org_type_enum"`);
        await queryRunner.query(`ALTER TABLE "organizations" DROP COLUMN "currency"`);
    }
}
