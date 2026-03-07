import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBoardPrivacy1681000000000 implements MigrationInterface {
  name = 'AddBoardPrivacy1681000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const boardsExists = await queryRunner.hasTable('boards');
    if (!boardsExists) {
      console.log('Skipping board privacy: boards table does not exist yet');
      return;
    }
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'boardprivacy') THEN
          CREATE TYPE "boardprivacy" AS ENUM ('private', 'team', 'org');
        END IF;
      END$$;
      ALTER TABLE "boards" ADD COLUMN IF NOT EXISTS "privacy" "boardprivacy" DEFAULT 'team';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "boards" DROP COLUMN IF EXISTS "privacy";');
    await queryRunner.query('DROP TYPE IF EXISTS "boardprivacy";');
  }
}
