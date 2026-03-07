import { MigrationInterface, QueryRunner } from 'typeorm';

export class MakeTemplateOrgAndCreatorNullable1794000000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Make organization_id and created_by nullable in mero_board_workspace_templates
        await queryRunner.query(`ALTER TABLE "mero_board_workspace_templates" ALTER COLUMN "organization_id" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "mero_board_workspace_templates" ALTER COLUMN "created_by" DROP NOT NULL`);

        // Make organization_id and created_by nullable in mero_board_project_templates
        await queryRunner.query(`ALTER TABLE "mero_board_project_templates" ALTER COLUMN "organization_id" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "mero_board_project_templates" ALTER COLUMN "created_by" DROP NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Revert nullable changes for mero_board_workspace_templates
        // Note: Reverting may fail if there are null values currently in the columns
        await queryRunner.query(`ALTER TABLE "mero_board_workspace_templates" ALTER COLUMN "organization_id" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "mero_board_workspace_templates" ALTER COLUMN "created_by" SET NOT NULL`);

        // Revert nullable changes for mero_board_project_templates
        await queryRunner.query(`ALTER TABLE "mero_board_project_templates" ALTER COLUMN "organization_id" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "mero_board_project_templates" ALTER COLUMN "created_by" SET NOT NULL`);
    }
}
