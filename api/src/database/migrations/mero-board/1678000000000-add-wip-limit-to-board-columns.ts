import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWipLimitToBoardColumns1678000000000 implements MigrationInterface {
  name = 'AddWipLimitToBoardColumns1678000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const exists = await queryRunner.hasTable('board_columns');
    if (!exists) {
      console.log('Skipping wip_limit: board_columns table does not exist yet');
      return;
    }
    await queryRunner.query(
      `ALTER TABLE "board_columns" ADD COLUMN IF NOT EXISTS "wip_limit" integer NULL`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "board_columns" DROP COLUMN IF EXISTS "wip_limit"`
    );
  }
}
