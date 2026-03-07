import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableColumn } from 'typeorm';

export class EnhanceHrModule1840000000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // 1. HR Departments Table
        await queryRunner.createTable(
            new Table({
                name: 'hr_departments',
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
                    },
                    {
                        name: 'name',
                        type: 'varchar',
                        length: '255',
                    },
                    {
                        name: 'code',
                        type: 'varchar',
                        length: '50',
                        isNullable: true,
                    },
                    {
                        name: 'parent_id',
                        type: 'uuid',
                        isNullable: true,
                    },
                    {
                        name: 'manager_id',
                        type: 'uuid',
                        isNullable: true,
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

        await queryRunner.createForeignKey(
            'hr_departments',
            new TableForeignKey({
                columnNames: ['organization_id'],
                referencedTableName: 'organizations',
                referencedColumnNames: ['id'],
                onDelete: 'CASCADE',
            }),
        );

        await queryRunner.createForeignKey(
            'hr_departments',
            new TableForeignKey({
                columnNames: ['parent_id'],
                referencedTableName: 'hr_departments',
                referencedColumnNames: ['id'],
                onDelete: 'SET NULL',
            }),
        );

        // 2. HR Designations Table
        await queryRunner.createTable(
            new Table({
                name: 'hr_designations',
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
                    },
                    {
                        name: 'name',
                        type: 'varchar',
                        length: '255',
                    },
                    {
                        name: 'grade',
                        type: 'varchar',
                        length: '50',
                        isNullable: true,
                    },
                    {
                        name: 'description',
                        type: 'text',
                        isNullable: true,
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

        await queryRunner.createForeignKey(
            'hr_designations',
            new TableForeignKey({
                columnNames: ['organization_id'],
                referencedTableName: 'organizations',
                referencedColumnNames: ['id'],
                onDelete: 'CASCADE',
            }),
        );

        // 3. HR Documents Table
        await queryRunner.createTable(
            new Table({
                name: 'hr_documents',
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
                    },
                    {
                        name: 'employee_id',
                        type: 'uuid',
                    },
                    {
                        name: 'type',
                        type: 'enum',
                        enum: ['CITIZENSHIP', 'PASSPORT', 'CONTRACT', 'CERTIFICATE', 'TRAINING', 'OTHER'],
                        default: "'OTHER'",
                    },
                    {
                        name: 'name',
                        type: 'varchar',
                        length: '255',
                    },
                    {
                        name: 'file_url',
                        type: 'text',
                    },
                    {
                        name: 'expiry_date',
                        type: 'date',
                        isNullable: true,
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

        await queryRunner.createForeignKey(
            'hr_documents',
            new TableForeignKey({
                columnNames: ['organization_id'],
                referencedTableName: 'organizations',
                referencedColumnNames: ['id'],
                onDelete: 'CASCADE',
            }),
        );

        await queryRunner.createForeignKey(
            'hr_documents',
            new TableForeignKey({
                columnNames: ['employee_id'],
                referencedTableName: 'hr_employees',
                referencedColumnNames: ['id'],
                onDelete: 'CASCADE',
            }),
        );

        // 4. Enhance HR Employees
        await queryRunner.addColumns('hr_employees', [
            new TableColumn({
                name: 'photo_url',
                type: 'text',
                isNullable: true,
            }),
            new TableColumn({
                name: 'department_id',
                type: 'uuid',
                isNullable: true,
            }),
            new TableColumn({
                name: 'designation_id',
                type: 'uuid',
                isNullable: true,
            }),
            new TableColumn({
                name: 'supervisor_id',
                type: 'uuid',
                isNullable: true,
            }),
            new TableColumn({
                name: 'probation_end_date',
                type: 'date',
                isNullable: true,
            }),
            new TableColumn({
                name: 'contract_end_date',
                type: 'date',
                isNullable: true,
            }),
            new TableColumn({
                name: 'emergency_contact',
                type: 'jsonb',
                isNullable: true,
            }),
        ]);

        await queryRunner.createForeignKey(
            'hr_employees',
            new TableForeignKey({
                columnNames: ['department_id'],
                referencedTableName: 'hr_departments',
                referencedColumnNames: ['id'],
                onDelete: 'SET NULL',
            }),
        );

        await queryRunner.createForeignKey(
            'hr_employees',
            new TableForeignKey({
                columnNames: ['designation_id'],
                referencedTableName: 'hr_designations',
                referencedColumnNames: ['id'],
                onDelete: 'SET NULL',
            }),
        );

        await queryRunner.createForeignKey(
            'hr_employees',
            new TableForeignKey({
                columnNames: ['supervisor_id'],
                referencedTableName: 'hr_employees',
                referencedColumnNames: ['id'],
                onDelete: 'SET NULL',
            }),
        );

        // Also link department manager
        await queryRunner.createForeignKey(
            'hr_departments',
            new TableForeignKey({
                columnNames: ['manager_id'],
                referencedTableName: 'hr_employees',
                referencedColumnNames: ['id'],
                onDelete: 'SET NULL',
            }),
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop foreign keys first to avoid issues
        const table = await queryRunner.getTable('hr_employees');
        if (table) {
            const fks = table.foreignKeys.filter(fk =>
                ['department_id', 'designation_id', 'supervisor_id'].includes(fk.columnNames[0])
            );
            for (const fk of fks) {
                await queryRunner.dropForeignKey('hr_employees', fk);
            }
        }

        await queryRunner.dropColumns('hr_employees', [
            'photo_url',
            'department_id',
            'designation_id',
            'supervisor_id',
            'probation_end_date',
            'contract_end_date',
            'emergency_contact',
        ]);

        await queryRunner.dropTable('hr_documents');
        await queryRunner.dropTable('hr_designations');
        await queryRunner.dropTable('hr_departments');
    }
}
