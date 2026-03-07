import { MigrationInterface, QueryRunner } from 'typeorm';

export class MakeSessionsOrganizationIdNullable1790000000000 implements MigrationInterface {
  name = 'MakeSessionsOrganizationIdNullable1790000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Make organization_id nullable in sessions table to support system admin sessions
    await queryRunner.query(`
      ALTER TABLE "sessions" 
      ALTER COLUMN "organization_id" DROP NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert: make organization_id NOT NULL again
    // Note: This will fail if there are any NULL values in the column
    await queryRunner.query(`
      ALTER TABLE "sessions" 
      ALTER COLUMN "organization_id" SET NOT NULL
    `);
  }
}

