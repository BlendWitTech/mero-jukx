import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class MeroBoardTemplates1779100000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create project_templates table
    await queryRunner.createTable(
      new Table({
        name: 'mero_board_project_templates',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'organization_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'name',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'category',
            type: 'varchar',
            length: '50',
            default: "'custom'",
          },
          {
            name: 'is_public',
            type: 'boolean',
            default: false,
          },
          {
            name: 'created_by',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'usage_count',
            type: 'int',
            default: 0,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    const projectTemplatesTable = await queryRunner.getTable('mero_board_project_templates');
    if (projectTemplatesTable) {
      // Create indexes for project_templates
      if (!projectTemplatesTable.indices.find(idx => idx.name === 'IDX_project_templates_organization_id' || idx.columnNames.includes('organization_id'))) {
        await queryRunner.createIndex(
          'mero_board_project_templates',
          new TableIndex({
            name: 'IDX_project_templates_organization_id',
            columnNames: ['organization_id'],
          }),
        );
      }
      if (!projectTemplatesTable.indices.find(idx => idx.name === 'IDX_project_templates_created_by' || idx.columnNames.includes('created_by'))) {
        await queryRunner.createIndex(
          'mero_board_project_templates',
          new TableIndex({
            name: 'IDX_project_templates_created_by',
            columnNames: ['created_by'],
          }),
        );
      }

      // Create foreign keys for project_templates
      if (!projectTemplatesTable.foreignKeys.find(fk => fk.columnNames.includes('organization_id'))) {
        await queryRunner.createForeignKey(
          'mero_board_project_templates',
          new TableForeignKey({
            columnNames: ['organization_id'],
            referencedColumnNames: ['id'],
            referencedTableName: 'organizations',
            onDelete: 'CASCADE',
          }),
        );
      }
      if (!projectTemplatesTable.foreignKeys.find(fk => fk.columnNames.includes('created_by'))) {
        await queryRunner.createForeignKey(
          'mero_board_project_templates',
          new TableForeignKey({
            columnNames: ['created_by'],
            referencedColumnNames: ['id'],
            referencedTableName: 'users',
            onDelete: 'CASCADE',
          }),
        );
      }
    }

    // Create project_template_tasks table
    await queryRunner.createTable(
      new Table({
        name: 'mero_board_project_template_tasks',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'template_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'title',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['todo', 'in_progress', 'in_review', 'done'],
            default: "'todo'",
          },
          {
            name: 'priority',
            type: 'enum',
            enum: ['low', 'medium', 'high', 'urgent'],
            default: "'medium'",
          },
          {
            name: 'sort_order',
            type: 'int',
            default: 0,
          },
          {
            name: 'tags',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    const templateTasksTable = await queryRunner.getTable('mero_board_project_template_tasks');
    if (templateTasksTable) {
      // Create indexes for project_template_tasks
      if (!templateTasksTable.indices.find(idx => idx.name === 'IDX_project_template_tasks_template_id' || idx.columnNames.includes('template_id'))) {
        await queryRunner.createIndex(
          'mero_board_project_template_tasks',
          new TableIndex({
            name: 'IDX_project_template_tasks_template_id',
            columnNames: ['template_id'],
          }),
        );
      }

      // Create foreign keys for project_template_tasks
      if (!templateTasksTable.foreignKeys.find(fk => fk.columnNames.includes('template_id'))) {
        await queryRunner.createForeignKey(
          'mero_board_project_template_tasks',
          new TableForeignKey({
            columnNames: ['template_id'],
            referencedColumnNames: ['id'],
            referencedTableName: 'mero_board_project_templates',
            onDelete: 'CASCADE',
          }),
        );
      }
    }

    // Create workspace_templates table
    await queryRunner.createTable(
      new Table({
        name: 'mero_board_workspace_templates',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'organization_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'name',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'category',
            type: 'varchar',
            length: '50',
            default: "'custom'",
          },
          {
            name: 'is_public',
            type: 'boolean',
            default: false,
          },
          {
            name: 'created_by',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'usage_count',
            type: 'int',
            default: 0,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    const workspaceTemplatesTable = await queryRunner.getTable('mero_board_workspace_templates');
    if (workspaceTemplatesTable) {
      // Create indexes for workspace_templates
      if (!workspaceTemplatesTable.indices.find(idx => idx.name === 'IDX_workspace_templates_organization_id' || idx.columnNames.includes('organization_id'))) {
        await queryRunner.createIndex(
          'mero_board_workspace_templates',
          new TableIndex({
            name: 'IDX_workspace_templates_organization_id',
            columnNames: ['organization_id'],
          }),
        );
      }
      if (!workspaceTemplatesTable.indices.find(idx => idx.name === 'IDX_workspace_templates_created_by' || idx.columnNames.includes('created_by'))) {
        await queryRunner.createIndex(
          'mero_board_workspace_templates',
          new TableIndex({
            name: 'IDX_workspace_templates_created_by',
            columnNames: ['created_by'],
          }),
        );
      }

      // Create foreign keys for workspace_templates
      if (!workspaceTemplatesTable.foreignKeys.find(fk => fk.columnNames.includes('organization_id'))) {
        await queryRunner.createForeignKey(
          'mero_board_workspace_templates',
          new TableForeignKey({
            columnNames: ['organization_id'],
            referencedColumnNames: ['id'],
            referencedTableName: 'organizations',
            onDelete: 'CASCADE',
          }),
        );
      }
      if (!workspaceTemplatesTable.foreignKeys.find(fk => fk.columnNames.includes('created_by'))) {
        await queryRunner.createForeignKey(
          'mero_board_workspace_templates',
          new TableForeignKey({
            columnNames: ['created_by'],
            referencedColumnNames: ['id'],
            referencedTableName: 'users',
            onDelete: 'CASCADE',
          }),
        );
      }
    }

    // Create workspace_template_projects table
    await queryRunner.createTable(
      new Table({
        name: 'mero_board_workspace_template_projects',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'template_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'name',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'sort_order',
            type: 'int',
            default: 0,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    const templateProjectsTable = await queryRunner.getTable('mero_board_workspace_template_projects');
    if (templateProjectsTable) {
      // Create indexes for workspace_template_projects
      if (!templateProjectsTable.indices.find(idx => idx.name === 'IDX_workspace_template_projects_template_id' || idx.columnNames.includes('template_id'))) {
        await queryRunner.createIndex(
          'mero_board_workspace_template_projects',
          new TableIndex({
            name: 'IDX_workspace_template_projects_template_id',
            columnNames: ['template_id'],
          }),
        );
      }

      // Create foreign keys for workspace_template_projects
      if (!templateProjectsTable.foreignKeys.find(fk => fk.columnNames.includes('template_id'))) {
        await queryRunner.createForeignKey(
          'mero_board_workspace_template_projects',
          new TableForeignKey({
            columnNames: ['template_id'],
            referencedColumnNames: ['id'],
            referencedTableName: 'mero_board_workspace_templates',
            onDelete: 'CASCADE',
          }),
        );
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('mero_board_workspace_template_projects', true);
    await queryRunner.dropTable('mero_board_workspace_templates', true);
    await queryRunner.dropTable('mero_board_project_template_tasks', true);
    await queryRunner.dropTable('mero_board_project_templates', true);
  }
}
