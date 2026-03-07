import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddProjectTemplateIdToWorkspaceTemplateProjects1793000000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.addColumn(
            'mero_board_workspace_template_projects',
            new TableColumn({
                name: 'project_template_id',
                type: 'uuid',
                isNullable: true,
            }),
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropColumn('mero_board_workspace_template_projects', 'project_template_id');
    }
}
