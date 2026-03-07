import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class CreateBoardsTables1772000000000 implements MigrationInterface {
  name = 'CreateBoardsTables1772000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create boards table
    await queryRunner.createTable(
      new Table({
        name: 'boards',
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
            name: 'project_id',
            type: 'uuid',
            isNullable: true,
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
            name: 'status',
            type: 'varchar',
            length: '50',
            default: "'active'",
          },
          {
            name: 'created_by',
            type: 'uuid',
            isNullable: false,
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
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Create projects table
    await queryRunner.createTable(
      new Table({
        name: 'projects',
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
            name: 'board_id',
            type: 'uuid',
            isNullable: true,
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
            name: 'status',
            type: 'varchar',
            length: '50',
            default: "'planning'",
          },
          {
            name: 'created_by',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'owner_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'start_date',
            type: 'date',
            isNullable: true,
          },
          {
            name: 'end_date',
            type: 'date',
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
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Create epics table
    await queryRunner.createTable(
      new Table({
        name: 'epics',
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
            name: 'project_id',
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
            name: 'status',
            type: 'varchar',
            length: '50',
            default: "'planning'",
          },
          {
            name: 'created_by',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'assignee_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'start_date',
            type: 'date',
            isNullable: true,
          },
          {
            name: 'end_date',
            type: 'date',
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
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Create tasks table
    await queryRunner.createTable(
      new Table({
        name: 'tasks',
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
            name: 'project_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'epic_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'ticket_id',
            type: 'uuid',
            isNullable: true,
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
            type: 'varchar',
            length: '50',
            default: "'todo'",
          },
          {
            name: 'priority',
            type: 'varchar',
            length: '50',
            default: "'medium'",
          },
          {
            name: 'created_by',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'assignee_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'due_date',
            type: 'date',
            isNullable: true,
          },
          {
            name: 'estimated_hours',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'actual_hours',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'tags',
            type: 'text',
            isArray: true,
            default: "'{}'",
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
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Create task_assignees junction table
    await queryRunner.createTable(
      new Table({
        name: 'task_assignees',
        columns: [
          {
            name: 'task_id',
            type: 'uuid',
            isPrimary: true,
          },
          {
            name: 'user_id',
            type: 'uuid',
            isPrimary: true,
          },
        ],
      }),
      true,
    );

    // Add foreign keys for boards
    const boardsTable = await queryRunner.getTable('boards');
    if (boardsTable) {
      if (!boardsTable.foreignKeys.find(fk => fk.columnNames.indexOf('organization_id') !== -1)) {
        await queryRunner.createForeignKey(
          'boards',
          new TableForeignKey({
            columnNames: ['organization_id'],
            referencedColumnNames: ['id'],
            referencedTableName: 'organizations',
            onDelete: 'CASCADE',
          }),
        );
      }
      if (!boardsTable.foreignKeys.find(fk => fk.columnNames.indexOf('created_by') !== -1)) {
        await queryRunner.createForeignKey(
          'boards',
          new TableForeignKey({
            columnNames: ['created_by'],
            referencedColumnNames: ['id'],
            referencedTableName: 'users',
            onDelete: 'CASCADE',
          }),
        );
      }
    }

    // Add foreign keys for projects
    const projectsTable = await queryRunner.getTable('projects');
    if (projectsTable) {
      if (!projectsTable.foreignKeys.find(fk => fk.columnNames.indexOf('organization_id') !== -1)) {
        await queryRunner.createForeignKey(
          'projects',
          new TableForeignKey({
            columnNames: ['organization_id'],
            referencedColumnNames: ['id'],
            referencedTableName: 'organizations',
            onDelete: 'CASCADE',
          }),
        );
      }
      if (!projectsTable.foreignKeys.find(fk => fk.columnNames.indexOf('board_id') !== -1)) {
        await queryRunner.createForeignKey(
          'projects',
          new TableForeignKey({
            columnNames: ['board_id'],
            referencedColumnNames: ['id'],
            referencedTableName: 'boards',
            onDelete: 'SET NULL',
          }),
        );
      }
      if (!projectsTable.foreignKeys.find(fk => fk.columnNames.indexOf('created_by') !== -1)) {
        await queryRunner.createForeignKey(
          'projects',
          new TableForeignKey({
            columnNames: ['created_by'],
            referencedColumnNames: ['id'],
            referencedTableName: 'users',
            onDelete: 'CASCADE',
          }),
        );
      }
      if (!projectsTable.foreignKeys.find(fk => fk.columnNames.indexOf('owner_id') !== -1)) {
        await queryRunner.createForeignKey(
          'projects',
          new TableForeignKey({
            columnNames: ['owner_id'],
            referencedColumnNames: ['id'],
            referencedTableName: 'users',
            onDelete: 'SET NULL',
          }),
        );
      }
    }

    // Add foreign keys for epics
    const epicsTable = await queryRunner.getTable('epics');
    if (epicsTable) {
      if (!epicsTable.foreignKeys.find(fk => fk.columnNames.indexOf('organization_id') !== -1)) {
        await queryRunner.createForeignKey(
          'epics',
          new TableForeignKey({
            columnNames: ['organization_id'],
            referencedColumnNames: ['id'],
            referencedTableName: 'organizations',
            onDelete: 'CASCADE',
          }),
        );
      }
      if (!epicsTable.foreignKeys.find(fk => fk.columnNames.indexOf('project_id') !== -1)) {
        await queryRunner.createForeignKey(
          'epics',
          new TableForeignKey({
            columnNames: ['project_id'],
            referencedColumnNames: ['id'],
            referencedTableName: 'projects',
            onDelete: 'CASCADE',
          }),
        );
      }
      if (!epicsTable.foreignKeys.find(fk => fk.columnNames.indexOf('created_by') !== -1)) {
        await queryRunner.createForeignKey(
          'epics',
          new TableForeignKey({
            columnNames: ['created_by'],
            referencedColumnNames: ['id'],
            referencedTableName: 'users',
            onDelete: 'CASCADE',
          }),
        );
      }
      if (!epicsTable.foreignKeys.find(fk => fk.columnNames.indexOf('assignee_id') !== -1)) {
        await queryRunner.createForeignKey(
          'epics',
          new TableForeignKey({
            columnNames: ['assignee_id'],
            referencedColumnNames: ['id'],
            referencedTableName: 'users',
            onDelete: 'SET NULL',
          }),
        );
      }
    }

    // Add foreign keys for tasks
    const tasksTable = await queryRunner.getTable('tasks');
    if (tasksTable) {
      if (!tasksTable.foreignKeys.find(fk => fk.columnNames.indexOf('organization_id') !== -1)) {
        await queryRunner.createForeignKey(
          'tasks',
          new TableForeignKey({
            columnNames: ['organization_id'],
            referencedColumnNames: ['id'],
            referencedTableName: 'organizations',
            onDelete: 'CASCADE',
          }),
        );
      }
      if (!tasksTable.foreignKeys.find(fk => fk.columnNames.indexOf('project_id') !== -1)) {
        await queryRunner.createForeignKey(
          'tasks',
          new TableForeignKey({
            columnNames: ['project_id'],
            referencedColumnNames: ['id'],
            referencedTableName: 'projects',
            onDelete: 'CASCADE',
          }),
        );
      }
      if (!tasksTable.foreignKeys.find(fk => fk.columnNames.indexOf('epic_id') !== -1)) {
        await queryRunner.createForeignKey(
          'tasks',
          new TableForeignKey({
            columnNames: ['epic_id'],
            referencedColumnNames: ['id'],
            referencedTableName: 'epics',
            onDelete: 'SET NULL',
          }),
        );
      }
      if (!tasksTable.foreignKeys.find(fk => fk.columnNames.indexOf('ticket_id') !== -1)) {
        await queryRunner.createForeignKey(
          'tasks',
          new TableForeignKey({
            columnNames: ['ticket_id'],
            referencedColumnNames: ['id'],
            referencedTableName: 'tickets',
            onDelete: 'SET NULL',
          }),
        );
      }
      if (!tasksTable.foreignKeys.find(fk => fk.columnNames.indexOf('created_by') !== -1)) {
        await queryRunner.createForeignKey(
          'tasks',
          new TableForeignKey({
            columnNames: ['created_by'],
            referencedColumnNames: ['id'],
            referencedTableName: 'users',
            onDelete: 'CASCADE',
          }),
        );
      }
      if (!tasksTable.foreignKeys.find(fk => fk.columnNames.indexOf('assignee_id') !== -1)) {
        await queryRunner.createForeignKey(
          'tasks',
          new TableForeignKey({
            columnNames: ['assignee_id'],
            referencedColumnNames: ['id'],
            referencedTableName: 'users',
            onDelete: 'SET NULL',
          }),
        );
      }
    }

    // Add foreign keys for task_assignees
    const taskAssigneesTable = await queryRunner.getTable('task_assignees');
    if (taskAssigneesTable) {
      if (!taskAssigneesTable.foreignKeys.find(fk => fk.columnNames.indexOf('task_id') !== -1)) {
        await queryRunner.createForeignKey(
          'task_assignees',
          new TableForeignKey({
            columnNames: ['task_id'],
            referencedColumnNames: ['id'],
            referencedTableName: 'tasks',
            onDelete: 'CASCADE',
          }),
        );
      }
      if (!taskAssigneesTable.foreignKeys.find(fk => fk.columnNames.indexOf('user_id') !== -1)) {
        await queryRunner.createForeignKey(
          'task_assignees',
          new TableForeignKey({
            columnNames: ['user_id'],
            referencedColumnNames: ['id'],
            referencedTableName: 'users',
            onDelete: 'CASCADE',
          }),
        );
      }
    }

    // Add indexes
    if (boardsTable && !boardsTable.indices.find(idx => idx.columnNames.includes('organization_id'))) {
      await queryRunner.createIndex('boards', new TableIndex({ columnNames: ['organization_id'] }));
    }
    if (boardsTable && !boardsTable.indices.find(idx => idx.columnNames.includes('project_id'))) {
      await queryRunner.createIndex('boards', new TableIndex({ columnNames: ['project_id'] }));
    }
    if (boardsTable && !boardsTable.indices.find(idx => idx.columnNames.includes('created_by'))) {
      await queryRunner.createIndex('boards', new TableIndex({ columnNames: ['created_by'] }));
    }

    if (projectsTable && !projectsTable.indices.find(idx => idx.columnNames.includes('organization_id'))) {
      await queryRunner.createIndex('projects', new TableIndex({ columnNames: ['organization_id'] }));
    }
    if (projectsTable && !projectsTable.indices.find(idx => idx.columnNames.includes('board_id'))) {
      await queryRunner.createIndex('projects', new TableIndex({ columnNames: ['board_id'] }));
    }
    if (projectsTable && !projectsTable.indices.find(idx => idx.columnNames.includes('created_by'))) {
      await queryRunner.createIndex('projects', new TableIndex({ columnNames: ['created_by'] }));
    }

    if (epicsTable && !epicsTable.indices.find(idx => idx.columnNames.includes('organization_id'))) {
      await queryRunner.createIndex('epics', new TableIndex({ columnNames: ['organization_id'] }));
    }
    if (epicsTable && !epicsTable.indices.find(idx => idx.columnNames.includes('project_id'))) {
      await queryRunner.createIndex('epics', new TableIndex({ columnNames: ['project_id'] }));
    }
    if (epicsTable && !epicsTable.indices.find(idx => idx.columnNames.includes('created_by'))) {
      await queryRunner.createIndex('epics', new TableIndex({ columnNames: ['created_by'] }));
    }

    if (tasksTable) {
      if (!tasksTable.indices.find(idx => idx.columnNames.includes('organization_id'))) {
        await queryRunner.createIndex('tasks', new TableIndex({ columnNames: ['organization_id'] }));
      }
      if (!tasksTable.indices.find(idx => idx.columnNames.includes('project_id'))) {
        await queryRunner.createIndex('tasks', new TableIndex({ columnNames: ['project_id'] }));
      }
      if (!tasksTable.indices.find(idx => idx.columnNames.includes('epic_id'))) {
        await queryRunner.createIndex('tasks', new TableIndex({ columnNames: ['epic_id'] }));
      }
      if (!tasksTable.indices.find(idx => idx.columnNames.includes('assignee_id'))) {
        await queryRunner.createIndex('tasks', new TableIndex({ columnNames: ['assignee_id'] }));
      }
      if (!tasksTable.indices.find(idx => idx.columnNames.includes('created_by'))) {
        await queryRunner.createIndex('tasks', new TableIndex({ columnNames: ['created_by'] }));
      }
      if (!tasksTable.indices.find(idx => idx.columnNames.includes('status'))) {
        await queryRunner.createIndex('tasks', new TableIndex({ columnNames: ['status'] }));
      }
    }

    // Create task_watchers (early migration 1660000000000 may have skipped this)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "task_watchers" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "task_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_task_watcher_task_user" UNIQUE ("task_id", "user_id"),
        CONSTRAINT "PK_task_watcher_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_task_watcher_task" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_task_watcher_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS "IDX_task_watcher_task_id" ON "task_watchers" ("task_id");
      CREATE INDEX IF NOT EXISTS "IDX_task_watcher_user_id" ON "task_watchers" ("user_id");
    `);

    // Create saved_filters (early migration 1660000000001 may have skipped this)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "saved_filters" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "board_id" uuid NOT NULL,
        "name" varchar(100) NOT NULL,
        "filters" jsonb NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_saved_filter_user_board_name" UNIQUE ("user_id", "board_id", "name"),
        CONSTRAINT "PK_saved_filter_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_saved_filter_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_saved_filter_board" FOREIGN KEY ("board_id") REFERENCES "boards"("id") ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS "IDX_saved_filter_user_id" ON "saved_filters" ("user_id");
      CREATE INDEX IF NOT EXISTS "IDX_saved_filter_board_id" ON "saved_filters" ("board_id");
    `);

    // Create board_favorites (early migration 1680000000000 may have skipped this)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "board_favorites" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "board_id" uuid NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE DEFAULT now(),
        CONSTRAINT "UQ_user_board" UNIQUE ("user_id", "board_id"),
        CONSTRAINT "FK_bf_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_bf_board" FOREIGN KEY ("board_id") REFERENCES "boards"("id") ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS "IDX_board_favorites_user_id" ON "board_favorites" ("user_id");
      CREATE INDEX IF NOT EXISTS "IDX_board_favorites_board_id" ON "board_favorites" ("board_id");
    `);

    // Add board privacy column (early migration 1681000000000 may have skipped this)
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
    // Drop indexes
    await queryRunner.dropIndex('tasks', 'IDX_tasks_status');
    await queryRunner.dropIndex('tasks', 'IDX_tasks_created_by');
    await queryRunner.dropIndex('tasks', 'IDX_tasks_assignee_id');
    await queryRunner.dropIndex('tasks', 'IDX_tasks_epic_id');
    await queryRunner.dropIndex('tasks', 'IDX_tasks_project_id');
    await queryRunner.dropIndex('tasks', 'IDX_tasks_organization_id');

    await queryRunner.dropIndex('epics', 'IDX_epics_created_by');
    await queryRunner.dropIndex('epics', 'IDX_epics_project_id');
    await queryRunner.dropIndex('epics', 'IDX_epics_organization_id');

    await queryRunner.dropIndex('projects', 'IDX_projects_created_by');
    await queryRunner.dropIndex('projects', 'IDX_projects_board_id');
    await queryRunner.dropIndex('projects', 'IDX_projects_organization_id');

    await queryRunner.dropIndex('boards', 'IDX_boards_created_by');
    await queryRunner.dropIndex('boards', 'IDX_boards_project_id');
    await queryRunner.dropIndex('boards', 'IDX_boards_organization_id');

    // Drop foreign keys
    const taskAssigneesTable = await queryRunner.getTable('task_assignees');
    if (taskAssigneesTable) {
      const foreignKeys = taskAssigneesTable.foreignKeys;
      for (const fk of foreignKeys) {
        await queryRunner.dropForeignKey('task_assignees', fk);
      }
    }

    const tasksTable = await queryRunner.getTable('tasks');
    if (tasksTable) {
      const foreignKeys = tasksTable.foreignKeys;
      for (const fk of foreignKeys) {
        await queryRunner.dropForeignKey('tasks', fk);
      }
    }

    const epicsTable = await queryRunner.getTable('epics');
    if (epicsTable) {
      const foreignKeys = epicsTable.foreignKeys;
      for (const fk of foreignKeys) {
        await queryRunner.dropForeignKey('epics', fk);
      }
    }

    const projectsTable = await queryRunner.getTable('projects');
    if (projectsTable) {
      const foreignKeys = projectsTable.foreignKeys;
      for (const fk of foreignKeys) {
        await queryRunner.dropForeignKey('projects', fk);
      }
    }

    const boardsTable = await queryRunner.getTable('boards');
    if (boardsTable) {
      const foreignKeys = boardsTable.foreignKeys;
      for (const fk of foreignKeys) {
        await queryRunner.dropForeignKey('boards', fk);
      }
    }

    // Drop tables
    await queryRunner.dropTable('task_assignees', true);
    await queryRunner.dropTable('tasks', true);
    await queryRunner.dropTable('epics', true);
    await queryRunner.dropTable('projects', true);
    await queryRunner.dropTable('boards', true);
  }
}
