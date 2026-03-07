import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateTaskWatchersEntity1660000000000 implements MigrationInterface {
    name = 'CreateTaskWatchersEntity1660000000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        const tasksExists = await queryRunner.hasTable('tasks');
        if (!tasksExists) {
            console.log('Skipping task_watchers creation: tasks table does not exist yet');
            return;
        }
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "task_watchers" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "task_id" uuid NOT NULL,
                "user_id" uuid NOT NULL,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_task_watcher_task_user" UNIQUE ("task_id", "user_id"),
                CONSTRAINT "PK_task_watcher_id" PRIMARY KEY ("id"),
                CONSTRAINT "FK_task_watcher_task" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE,
                CONSTRAINT "FK_task_watcher_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
            );
            CREATE INDEX IF NOT EXISTS "IDX_task_watcher_task_id" ON "task_watchers" ("task_id");
            CREATE INDEX IF NOT EXISTS "IDX_task_watcher_user_id" ON "task_watchers" ("user_id");
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            DROP INDEX IF EXISTS "IDX_task_watcher_task_id";
            DROP INDEX IF EXISTS "IDX_task_watcher_user_id";
            DROP TABLE IF EXISTS "task_watchers";
        `);
    }
}
