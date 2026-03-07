import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCrmDealLinkToTasks1852000000000 implements MigrationInterface {
    name = 'AddCrmDealLinkToTasks1852000000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        const tableExists = await queryRunner.hasTable('tasks');
        if (!tableExists) return;

        const colExists = await queryRunner.hasColumn('tasks', 'crm_deal_id');
        if (!colExists) {
            await queryRunner.query(`
                ALTER TABLE "tasks"
                ADD COLUMN "crm_deal_id" uuid
            `);
            await queryRunner.query(`
                CREATE INDEX IF NOT EXISTS "IDX_tasks_crm_deal_id"
                ON "tasks" ("crm_deal_id")
                WHERE "crm_deal_id" IS NOT NULL
            `);
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_tasks_crm_deal_id"`);
        const colExists = await queryRunner.hasColumn('tasks', 'crm_deal_id');
        if (colExists) {
            await queryRunner.query(`ALTER TABLE "tasks" DROP COLUMN "crm_deal_id"`);
        }
    }
}
