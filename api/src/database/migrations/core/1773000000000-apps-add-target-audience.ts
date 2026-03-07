import { MigrationInterface, QueryRunner, TableIndex } from 'typeorm';

export class AddTargetAudienceToApps1773000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create enum type for target_audience
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."apps_target_audience_enum" AS ENUM('organization', 'creator', 'both');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Add target_audience column to apps table
    await queryRunner.query(`
      ALTER TABLE "apps" 
      ADD COLUMN "target_audience" "public"."apps_target_audience_enum" NOT NULL DEFAULT 'organization'
    `);

    // Create index on target_audience for better query performance
    await queryRunner.createIndex(
      'apps',
      new TableIndex({
        name: 'IDX_APPS_TARGET_AUDIENCE',
        columnNames: ['target_audience'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop index
    await queryRunner.dropIndex('apps', 'IDX_APPS_TARGET_AUDIENCE');

    // Drop column
    await queryRunner.query(`ALTER TABLE "apps" DROP COLUMN "target_audience"`);

    // Drop enum type
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."apps_target_audience_enum"`);
  }
}

