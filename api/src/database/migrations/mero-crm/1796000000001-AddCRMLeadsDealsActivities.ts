import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

export class AddCRMLeadsDealsActivities1796000000001 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {

        // CRM Leads Table
        await queryRunner.createTable(
            new Table({
                name: 'crm_leads',
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
                        name: 'email',
                        type: 'varchar',
                        length: '255',
                        isNullable: true,
                    },
                    {
                        name: 'phone',
                        type: 'varchar',
                        length: '20',
                    },
                    {
                        name: 'company',
                        type: 'varchar',
                        length: '255',
                        isNullable: true,
                    },
                    {
                        name: 'position',
                        type: 'varchar',
                        length: '100',
                        isNullable: true,
                    },
                    {
                        name: 'source',
                        type: 'varchar',
                        length: '100',
                        isNullable: true,
                        comment: 'Website, Referral, Cold Call, Social Media, etc.',
                    },
                    {
                        name: 'status',
                        type: 'enum',
                        enum: ['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL_SENT', 'CONVERTED', 'LOST'],
                        default: "'NEW'",
                    },
                    {
                        name: 'rating',
                        type: 'enum',
                        enum: ['HOT', 'WARM', 'COLD'],
                        isNullable: true,
                    },
                    {
                        name: 'assigned_to',
                        type: 'uuid',
                        isNullable: true,
                    },
                    {
                        name: 'notes',
                        type: 'text',
                        isNullable: true,
                    },
                    {
                        name: 'converted_to_client_id',
                        type: 'uuid',
                        isNullable: true,
                    },
                    {
                        name: 'converted_at',
                        type: 'timestamp',
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
                    {
                        name: 'deleted_at',
                        type: 'timestamp',
                        isNullable: true,
                    },
                ],
            }),
            true,
        );

        const leadsTable = await queryRunner.getTable('crm_leads');
        if (leadsTable) {
            if (!leadsTable.foreignKeys.find(fk => fk.columnNames.indexOf('organization_id') !== -1)) {
                await queryRunner.createForeignKey(
                    'crm_leads',
                    new TableForeignKey({
                        columnNames: ['organization_id'],
                        referencedTableName: 'organizations',
                        referencedColumnNames: ['id'],
                        onDelete: 'CASCADE',
                    }),
                );
            }
            if (!leadsTable.foreignKeys.find(fk => fk.columnNames.indexOf('assigned_to') !== -1)) {
                await queryRunner.createForeignKey(
                    'crm_leads',
                    new TableForeignKey({
                        columnNames: ['assigned_to'],
                        referencedTableName: 'users',
                        referencedColumnNames: ['id'],
                        onDelete: 'SET NULL',
                    }),
                );
            }
            if (!leadsTable.foreignKeys.find(fk => fk.columnNames.indexOf('converted_to_client_id') !== -1)) {
                await queryRunner.createForeignKey(
                    'crm_leads',
                    new TableForeignKey({
                        columnNames: ['converted_to_client_id'],
                        referencedTableName: 'crm_clients',
                        referencedColumnNames: ['id'],
                        onDelete: 'SET NULL',
                    }),
                );
            }
        }

        // CRM Deals Table
        await queryRunner.createTable(
            new Table({
                name: 'crm_deals',
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
                        name: 'lead_id',
                        type: 'uuid',
                        isNullable: true,
                    },
                    {
                        name: 'client_id',
                        type: 'uuid',
                        isNullable: true,
                    },
                    {
                        name: 'title',
                        type: 'varchar',
                        length: '255',
                    },
                    {
                        name: 'description',
                        type: 'text',
                        isNullable: true,
                    },
                    {
                        name: 'value',
                        type: 'decimal',
                        precision: 15,
                        scale: 2,
                    },
                    {
                        name: 'stage',
                        type: 'enum',
                        enum: ['PROSPECTING', 'QUALIFICATION', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST'],
                        default: "'PROSPECTING'",
                    },
                    {
                        name: 'probability',
                        type: 'int',
                        default: 0,
                        comment: 'Percentage 0-100',
                    },
                    {
                        name: 'expected_close_date',
                        type: 'date',
                        isNullable: true,
                    },
                    {
                        name: 'actual_close_date',
                        type: 'date',
                        onUpdate: 'CURRENT_TIMESTAMP',
                        isNullable: true,
                    },
                    {
                        name: 'assigned_to',
                        type: 'uuid',
                        isNullable: true,
                    },
                    {
                        name: 'lost_reason',
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
                    {
                        name: 'deleted_at',
                        type: 'timestamp',
                        isNullable: true,
                    },
                ],
            }),
            true,
        );

        const dealsTable = await queryRunner.getTable('crm_deals');
        if (dealsTable) {
            if (!dealsTable.foreignKeys.find(fk => fk.columnNames.indexOf('organization_id') !== -1)) {
                await queryRunner.createForeignKey(
                    'crm_deals',
                    new TableForeignKey({
                        columnNames: ['organization_id'],
                        referencedTableName: 'organizations',
                        referencedColumnNames: ['id'],
                        onDelete: 'CASCADE',
                    }),
                );
            }
            if (!dealsTable.foreignKeys.find(fk => fk.columnNames.indexOf('lead_id') !== -1)) {
                await queryRunner.createForeignKey(
                    'crm_deals',
                    new TableForeignKey({
                        columnNames: ['lead_id'],
                        referencedTableName: 'crm_leads',
                        referencedColumnNames: ['id'],
                        onDelete: 'SET NULL',
                    }),
                );
            }
            if (!dealsTable.foreignKeys.find(fk => fk.columnNames.indexOf('client_id') !== -1)) {
                await queryRunner.createForeignKey(
                    'crm_deals',
                    new TableForeignKey({
                        columnNames: ['client_id'],
                        referencedTableName: 'crm_clients',
                        referencedColumnNames: ['id'],
                        onDelete: 'SET NULL',
                    }),
                );
            }
        }

        // CRM Activities Table
        await queryRunner.createTable(
            new Table({
                name: 'crm_activities',
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
                        name: 'entity_type',
                        type: 'enum',
                        enum: ['LEAD', 'DEAL', 'CLIENT'],
                    },
                    {
                        name: 'entity_id',
                        type: 'uuid',
                    },
                    {
                        name: 'type',
                        type: 'enum',
                        enum: ['CALL', 'EMAIL', 'MEETING', 'NOTE', 'TASK', 'WHATSAPP'],
                    },
                    {
                        name: 'subject',
                        type: 'varchar',
                        length: '255',
                    },
                    {
                        name: 'description',
                        type: 'text',
                        isNullable: true,
                    },
                    {
                        name: 'scheduled_at',
                        type: 'timestamp',
                        isNullable: true,
                    },
                    {
                        name: 'completed_at',
                        type: 'timestamp',
                        isNullable: true,
                    },
                    {
                        name: 'created_by',
                        type: 'uuid',
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

        const activitiesTable = await queryRunner.getTable('crm_activities');
        if (activitiesTable) {
            if (!activitiesTable.foreignKeys.find(fk => fk.columnNames.indexOf('organization_id') !== -1)) {
                await queryRunner.createForeignKey(
                    'crm_activities',
                    new TableForeignKey({
                        columnNames: ['organization_id'],
                        referencedTableName: 'organizations',
                        referencedColumnNames: ['id'],
                        onDelete: 'CASCADE',
                    }),
                );
            }
            if (!activitiesTable.foreignKeys.find(fk => fk.columnNames.indexOf('created_by') !== -1)) {
                await queryRunner.createForeignKey(
                    'crm_activities',
                    new TableForeignKey({
                        columnNames: ['created_by'],
                        referencedTableName: 'users',
                        referencedColumnNames: ['id'],
                        onDelete: 'CASCADE',
                    }),
                );
            }
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable('crm_activities');
        await queryRunner.dropTable('crm_deals');
        await queryRunner.dropTable('crm_leads');
    }
}
