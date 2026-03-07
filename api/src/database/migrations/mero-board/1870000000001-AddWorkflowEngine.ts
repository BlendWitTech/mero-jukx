import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWorkflowEngine1870000000001 implements MigrationInterface {
    name = 'AddWorkflowEngine1870000000001';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // workflow_templates table
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "workflow_templates" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "organization_id" uuid,
                "name" varchar(255) NOT NULL,
                "description" text,
                "nodes" jsonb NOT NULL DEFAULT '[]',
                "edges" jsonb NOT NULL DEFAULT '[]',
                "is_active" boolean NOT NULL DEFAULT true,
                "is_system_template" boolean NOT NULL DEFAULT false,
                "created_by" uuid,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_workflow_templates" PRIMARY KEY ("id")
            )
        `);

        // Index for fast org queries
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_workflow_templates_org"
            ON "workflow_templates" ("organization_id")
        `);

        // workflow_executions table
        await queryRunner.query(`
            DO $$ BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'workflow_execution_status_enum') THEN
                    CREATE TYPE "workflow_execution_status_enum"
                    AS ENUM ('RUNNING', 'COMPLETED', 'FAILED');
                END IF;
            END $$;
        `);

        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "workflow_executions" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "workflow_id" uuid NOT NULL,
                "organization_id" uuid NOT NULL,
                "trigger_data" jsonb,
                "status" "workflow_execution_status_enum" NOT NULL DEFAULT 'RUNNING',
                "steps_log" jsonb NOT NULL DEFAULT '[]',
                "started_at" TIMESTAMP NOT NULL DEFAULT now(),
                "completed_at" TIMESTAMP,
                CONSTRAINT "PK_workflow_executions" PRIMARY KEY ("id"),
                CONSTRAINT "FK_workflow_executions_template"
                    FOREIGN KEY ("workflow_id")
                    REFERENCES "workflow_templates" ("id")
                    ON DELETE CASCADE
            )
        `);

        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_workflow_executions_org"
            ON "workflow_executions" ("organization_id")
        `);

        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_workflow_executions_workflow"
            ON "workflow_executions" ("workflow_id")
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE IF EXISTS "workflow_executions"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "workflow_execution_status_enum"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "workflow_templates"`);
    }
}
