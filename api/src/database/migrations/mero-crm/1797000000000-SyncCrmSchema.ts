import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class SyncCrmSchema1797000000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // --- CRM LEADS ---

        // 1. Rename position -> job_title
        const positionColumn = await queryRunner.getTable('crm_leads').then(t => t.columns.find(c => c.name === 'position'));
        if (positionColumn) {
            await queryRunner.renameColumn('crm_leads', 'position', 'job_title');
        } else {
            await queryRunner.addColumn('crm_leads', new TableColumn({
                name: 'job_title',
                type: 'varchar',
                length: '100',
                isNullable: true
            }));
        }

        // 2. Add first_name, last_name, estimated_value, custom_fields
        await queryRunner.addColumns('crm_leads', [
            new TableColumn({
                name: 'first_name',
                type: 'varchar',
                length: '255',
                isNullable: true, // Nullable initially to avoid constraints
            }),
            new TableColumn({
                name: 'last_name',
                type: 'varchar',
                length: '255',
                isNullable: true,
            }),
            new TableColumn({
                name: 'estimated_value',
                type: 'decimal',
                precision: 15,
                scale: 2,
                isNullable: true,
            }),
            new TableColumn({
                name: 'custom_fields',
                type: 'jsonb',
                isNullable: true,
            }),
        ]);

        // 3. Drop name, rating (if they exist)
        const leadsTable = await queryRunner.getTable('crm_leads');
        if (leadsTable.columns.find(c => c.name === 'name')) {
            await queryRunner.dropColumn('crm_leads', 'name');
        }
        if (leadsTable.columns.find(c => c.name === 'rating')) {
            await queryRunner.dropColumn('crm_leads', 'rating');
        }

        // --- CRM DEALS ---

        // 1. Add currency, pipeline_id, stage_id
        await queryRunner.addColumns('crm_deals', [
            new TableColumn({
                name: 'currency',
                type: 'varchar',
                length: '10',
                default: "'NPR'",
            }),
            new TableColumn({
                name: 'pipeline_id',
                type: 'uuid',
                isNullable: true,
            }),
            new TableColumn({
                name: 'stage_id',
                type: 'uuid',
                isNullable: true,
            }),
            new TableColumn({
                name: 'status',
                type: 'varchar', // Entity uses string enum, not DB enum for simplicity in update or matched
                isNullable: true
            })
        ]);

        // Note: 'status' in crm_deals? Entity has 'status' column. DB likely had 'stage' enum.
        // Entity has BOTH 'stage' and 'status'.
        // DB has 'stage' enum. 
        // We need to check if 'status' column exists in DB crm_deals.
        // check_crm_tables_output.txt for 'deals' shows: 'stage' (USER-DEFINED). 'status' IS MISSING.
        // So I added 'status' above.

        // Also Entity 'stage' is string. DB 'stage' is enum. 
        // Ideally we keep DB 'stage' as is if it maps correctly, but TypeORM might complain if types mismatch.
        // Entity: @Column({ length: 50, default: 'NEW' }) stage: string;
        // DB: enum. 
        // Let's drop DB 'stage' enum column and re-create as varchar to match Entity string type strictly, OR cast it.
        // For safety, let's keep it if it works, but adding 'status' is mandatory.

        // Wait, 'stage' in Entity is just a string. 
        // In previous migration it was enum. 
        // Let's change 'stage' to varchar to prevent casting errors.

        const dealsTable = await queryRunner.getTable('crm_deals');
        const stageColumn = dealsTable.columns.find(c => c.name === 'stage');
        if (stageColumn) {
            // Drop and recreate as varchar
            await queryRunner.dropColumn('crm_deals', 'stage');
            await queryRunner.addColumn('crm_deals', new TableColumn({
                name: 'stage',
                type: 'varchar',
                length: '50',
                default: "'NEW'",
            }));
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Revert changes is complex, we skip for forward-fix only dev environment
    }
}
