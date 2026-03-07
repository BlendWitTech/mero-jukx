import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateMeroBoardPrice1783000000000 implements MigrationInterface {
  name = 'UpdateMeroBoardPrice1783000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Update mero-board app price to $25/month
    await queryRunner.query(`
      UPDATE "apps"
      SET "price" = 25.00
      WHERE "slug" = 'mero-board'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert mero-board app price back to $0
    await queryRunner.query(`
      UPDATE "apps"
      SET "price" = 0.00
      WHERE "slug" = 'mero-board'
    `);
  }
}

