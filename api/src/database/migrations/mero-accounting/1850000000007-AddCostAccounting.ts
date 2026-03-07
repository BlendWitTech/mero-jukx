import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCostAccounting1850000000007 implements MigrationInterface {
    name = 'AddCostAccounting1850000000007';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // CostCenterType Enum
        await queryRunner.query(`CREATE TYPE "public"."cost_centers_type_enum" AS ENUM('COST_CENTER', 'PROFIT_CENTER')`);

        // CostCenters Table
        await queryRunner.query(`
            CREATE TABLE "cost_centers" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "organization_id" uuid NOT NULL,
                "name" character varying(255) NOT NULL,
                "code" character varying(50),
                "type" "public"."cost_centers_type_enum" NOT NULL DEFAULT 'COST_CENTER',
                "manager_id" uuid,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_cost_centers" PRIMARY KEY ("id")
            )
        `);

        // FKs for CostCenters
        await queryRunner.query(`ALTER TABLE "cost_centers" ADD CONSTRAINT "FK_cc_org" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "cost_centers" ADD CONSTRAINT "FK_cc_mgr" FOREIGN KEY ("manager_id") REFERENCES "hr_employees"("id") ON DELETE SET NULL ON UPDATE CASCADE`);

        // Dimensions on JournalEntryLine
        await queryRunner.query(`ALTER TABLE "journal_entry_lines" ADD "cost_center_id" uuid`);
        await queryRunner.query(`ALTER TABLE "journal_entry_lines" ADD CONSTRAINT "FK_jel_cc" FOREIGN KEY ("cost_center_id") REFERENCES "cost_centers"("id") ON DELETE SET NULL ON UPDATE CASCADE`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop FKs from JournalEntryLine
        await queryRunner.query(`ALTER TABLE "journal_entry_lines" DROP CONSTRAINT "FK_jel_cc"`);

        // Drop column from JournalEntryLine
        await queryRunner.query(`ALTER TABLE "journal_entry_lines" DROP COLUMN "cost_center_id"`);

        // Drop FKs from CostCenters
        await queryRunner.query(`ALTER TABLE "cost_centers" DROP CONSTRAINT "FK_cc_mgr"`);
        await queryRunner.query(`ALTER TABLE "cost_centers" DROP CONSTRAINT "FK_cc_org"`);

        // Drop CostCenters Table
        await queryRunner.query(`DROP TABLE "cost_centers"`);
        await queryRunner.query(`DROP TYPE "public"."cost_centers_type_enum"`);
    }
}
