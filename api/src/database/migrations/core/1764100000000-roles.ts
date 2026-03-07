import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddHierarchyLevelToRoles1764100000000 implements MigrationInterface {
  name = 'AddHierarchyLevelToRoles1764100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "roles" ADD COLUMN "hierarchy_level" integer`,
    );
    
    // Add comment explaining the field
    await queryRunner.query(
      `COMMENT ON COLUMN "roles"."hierarchy_level" IS 'Hierarchy level for custom roles. Lower number = higher authority. Owner=1 and Admin=2 are fixed. Custom roles must be >= 3.'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "roles" DROP COLUMN "hierarchy_level"`,
    );
  }
}

