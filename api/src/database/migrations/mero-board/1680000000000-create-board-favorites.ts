import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateBoardFavorites1680000000000 implements MigrationInterface {
  name = 'CreateBoardFavorites1680000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const boardsExists = await queryRunner.hasTable('boards');
    if (!boardsExists) {
      console.log('Skipping board_favorites creation: boards table does not exist yet');
      return;
    }
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "board_favorites" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "board_id" uuid NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE DEFAULT now(),
        CONSTRAINT "UQ_user_board" UNIQUE ("user_id", "board_id"),
        CONSTRAINT "FK_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_board" FOREIGN KEY ("board_id") REFERENCES "boards"("id") ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS "IDX_board_favorites_user_id" ON "board_favorites" ("user_id");
      CREATE INDEX IF NOT EXISTS "IDX_board_favorites_board_id" ON "board_favorites" ("board_id");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS "board_favorites"');
  }
}
