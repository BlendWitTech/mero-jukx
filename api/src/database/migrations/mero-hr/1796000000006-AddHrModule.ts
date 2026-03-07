import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

export class AddHrModule1796000000006 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // HR Employees Table
        await queryRunner.createTable(
            new Table({
                name: 'hr_employees',
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
                        name: 'user_id',
                        type: 'uuid',
                        isNullable: true,
                    },
                    {
                        name: 'employee_id',
                        type: 'varchar',
                        length: '50',
                        isUnique: true,
                        isNullable: true,
                    },
                    {
                        name: 'first_name',
                        type: 'varchar',
                        length: '255',
                    },
                    {
                        name: 'last_name',
                        type: 'varchar',
                        length: '255',
                        isNullable: true,
                    },
                    {
                        name: 'email',
                        type: 'varchar',
                        length: '255',
                        isNullable: true,
                    },
                    {
                        name: 'phone',
                        type: 'varchar',
                        length: '50',
                        isNullable: true,
                    },
                    {
                        name: 'date_of_birth',
                        type: 'date',
                        isNullable: true,
                    },
                    {
                        name: 'gender',
                        type: 'varchar',
                        length: '20',
                        isNullable: true,
                    },
                    {
                        name: 'address',
                        type: 'text',
                        isNullable: true,
                    },
                    {
                        name: 'designation',
                        type: 'varchar',
                        length: '100',
                        isNullable: true,
                    },
                    {
                        name: 'department',
                        type: 'varchar',
                        length: '100',
                        isNullable: true,
                    },
                    {
                        name: 'joining_date',
                        type: 'date',
                        isNullable: true,
                    },
                    {
                        name: 'status',
                        type: 'enum',
                        enum: ['ACTIVE', 'ON_LEAVE', 'TERMINATED', 'RESIGNED'],
                        default: "'ACTIVE'",
                    },
                    {
                        name: 'pan_number',
                        type: 'varchar',
                        length: '50',
                        isNullable: true,
                    },
                    {
                        name: 'citizenship_number',
                        type: 'varchar',
                        length: '50',
                        isNullable: true,
                    },
                    {
                        name: 'base_salary',
                        type: 'decimal',
                        precision: 15,
                        scale: 2,
                        default: 0,
                    },
                    {
                        name: 'bank_details',
                        type: 'jsonb',
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
            'hr_employees',
            new TableForeignKey({
                columnNames: ['organization_id'],
                referencedTableName: 'organizations',
                referencedColumnNames: ['id'],
                onDelete: 'CASCADE',
            }),
        );

        await queryRunner.createForeignKey(
            'hr_employees',
            new TableForeignKey({
                columnNames: ['user_id'],
                referencedTableName: 'users',
                referencedColumnNames: ['id'],
                onDelete: 'SET NULL',
            }),
        );

        // HR Attendance Table
        await queryRunner.createTable(
            new Table({
                name: 'hr_attendance',
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
                        name: 'date',
                        type: 'date',
                    },
                    {
                        name: 'check_in',
                        type: 'timestamp',
                        isNullable: true,
                    },
                    {
                        name: 'check_out',
                        type: 'timestamp',
                        isNullable: true,
                    },
                    {
                        name: 'status',
                        type: 'enum',
                        enum: ['PRESENT', 'ABSENT', 'LATE', 'ON_LEAVE', 'HOLIDAY'],
                        default: "'PRESENT'",
                    },
                    {
                        name: 'location',
                        type: 'point',
                        isNullable: true,
                    },
                    {
                        name: 'remarks',
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
            'hr_attendance',
            new TableForeignKey({
                columnNames: ['organization_id'],
                referencedTableName: 'organizations',
                referencedColumnNames: ['id'],
                onDelete: 'CASCADE',
            }),
        );

        await queryRunner.createForeignKey(
            'hr_attendance',
            new TableForeignKey({
                columnNames: ['employee_id'],
                referencedTableName: 'hr_employees',
                referencedColumnNames: ['id'],
                onDelete: 'CASCADE',
            }),
        );

        // HR Leave Requests Table
        await queryRunner.createTable(
            new Table({
                name: 'hr_leave_requests',
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
                        name: 'leave_type',
                        type: 'enum',
                        enum: ['SICK', 'CASUAL', 'ANNUAL', 'MATERNITY', 'PATERNITY', 'UNPAID', 'OTHER'],
                        default: "'CASUAL'",
                    },
                    {
                        name: 'start_date',
                        type: 'date',
                    },
                    {
                        name: 'end_date',
                        type: 'date',
                    },
                    {
                        name: 'total_days',
                        type: 'decimal',
                        precision: 4,
                        scale: 1,
                    },
                    {
                        name: 'reason',
                        type: 'text',
                    },
                    {
                        name: 'status',
                        type: 'enum',
                        enum: ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'],
                        default: "'PENDING'",
                    },
                    {
                        name: 'approved_by',
                        type: 'uuid',
                        isNullable: true,
                    },
                    {
                        name: 'admin_remarks',
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
            'hr_leave_requests',
            new TableForeignKey({
                columnNames: ['organization_id'],
                referencedTableName: 'organizations',
                referencedColumnNames: ['id'],
                onDelete: 'CASCADE',
            }),
        );

        await queryRunner.createForeignKey(
            'hr_leave_requests',
            new TableForeignKey({
                columnNames: ['employee_id'],
                referencedTableName: 'hr_employees',
                referencedColumnNames: ['id'],
                onDelete: 'CASCADE',
            }),
        );

        await queryRunner.createForeignKey(
            'hr_leave_requests',
            new TableForeignKey({
                columnNames: ['approved_by'],
                referencedTableName: 'users',
                referencedColumnNames: ['id'],
                onDelete: 'SET NULL',
            }),
        );

        // HR Payroll Table
        await queryRunner.createTable(
            new Table({
                name: 'hr_payroll',
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
                        name: 'month',
                        type: 'varchar',
                        length: '20',
                    },
                    {
                        name: 'period_start',
                        type: 'date',
                    },
                    {
                        name: 'period_end',
                        type: 'date',
                    },
                    {
                        name: 'basic_salary',
                        type: 'decimal',
                        precision: 15,
                        scale: 2,
                    },
                    {
                        name: 'allowances',
                        type: 'decimal',
                        precision: 15,
                        scale: 2,
                        default: 0,
                    },
                    {
                        name: 'overtime',
                        type: 'decimal',
                        precision: 15,
                        scale: 2,
                        default: 0,
                    },
                    {
                        name: 'bonus',
                        type: 'decimal',
                        precision: 15,
                        scale: 2,
                        default: 0,
                    },
                    {
                        name: 'ssf_contribution_employee',
                        type: 'decimal',
                        precision: 15,
                        scale: 2,
                        default: 0,
                    },
                    {
                        name: 'ssf_contribution_employer',
                        type: 'decimal',
                        precision: 15,
                        scale: 2,
                        default: 0,
                    },
                    {
                        name: 'cit_contribution',
                        type: 'decimal',
                        precision: 15,
                        scale: 2,
                        default: 0,
                    },
                    {
                        name: 'income_tax',
                        type: 'decimal',
                        precision: 15,
                        scale: 2,
                        default: 0,
                    },
                    {
                        name: 'other_deductions',
                        type: 'decimal',
                        precision: 15,
                        scale: 2,
                        default: 0,
                    },
                    {
                        name: 'net_salary',
                        type: 'decimal',
                        precision: 15,
                        scale: 2,
                    },
                    {
                        name: 'status',
                        type: 'enum',
                        enum: ['DRAFT', 'PROCESSED', 'PAID'],
                        default: "'DRAFT'",
                    },
                    {
                        name: 'payment_date',
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
            'hr_payroll',
            new TableForeignKey({
                columnNames: ['organization_id'],
                referencedTableName: 'organizations',
                referencedColumnNames: ['id'],
                onDelete: 'CASCADE',
            }),
        );

        await queryRunner.createForeignKey(
            'hr_payroll',
            new TableForeignKey({
                columnNames: ['employee_id'],
                referencedTableName: 'hr_employees',
                referencedColumnNames: ['id'],
                onDelete: 'CASCADE',
            }),
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable('hr_payroll');
        await queryRunner.dropTable('hr_leave_requests');
        await queryRunner.dropTable('hr_attendance');
        await queryRunner.dropTable('hr_employees');
    }
}
