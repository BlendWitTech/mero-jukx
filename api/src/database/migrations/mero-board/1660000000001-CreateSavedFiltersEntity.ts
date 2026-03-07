import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateSavedFiltersEntity1660000000001 implements MigrationInterface {
    name = 'CreateSavedFiltersEntity1660000000001'

    public async up(queryRunner: QueryRunner): Promise<void> {
        const boardsExists = await queryRunner.hasTable('boards');
        if (!boardsExists) {
            console.log('Skipping saved_filters creation: boards table does not exist yet');
            return;
        }
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "saved_filters" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "user_id" uuid NOT NULL,
                "board_id" uuid NOT NULL,
                "name" varchar(100) NOT NULL,
                "filters" jsonb NOT NULL,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_saved_filter_user_board_name" UNIQUE ("user_id", "board_id", "name"),
                CONSTRAINT "PK_saved_filter_id" PRIMARY KEY ("id"),
                CONSTRAINT "FK_saved_filter_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
                CONSTRAINT "FK_saved_filter_board" FOREIGN KEY ("board_id") REFERENCES "boards"("id") ON DELETE CASCADE
            );
            CREATE INDEX IF NOT EXISTS "IDX_saved_filter_user_id" ON "saved_filters" ("user_id");
            CREATE INDEX IF NOT EXISTS "IDX_saved_filter_board_id" ON "saved_filters" ("board_id");
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            DROP INDEX IF EXISTS "IDX_saved_filter_user_id";
            DROP INDEX IF EXISTS "IDX_saved_filter_board_id";
            DROP TABLE IF EXISTS "saved_filters";
        `);
    }
}
