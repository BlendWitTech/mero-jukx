import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddMultiBranchAndRegionalSettings1810000000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add columns to packages table
        const packagesTable = await queryRunner.getTable('packages');
        if (packagesTable && !packagesTable.findColumnByName('base_branch_limit')) {
            await queryRunner.addColumn(
                'packages',
                new TableColumn({
                    name: 'base_branch_limit',
                    type: 'int',
                    default: 1,
                }),
            );
        }

        // Add columns to organizations table
        const orgsTable = await queryRunner.getTable('organizations');
        if (orgsTable) {
            const columnsToAdd = [];
            if (!orgsTable.findColumnByName('branch_limit')) {
                columnsToAdd.push(new TableColumn({
                    name: 'branch_limit',
                    type: 'int',
                    default: 1,
                }));
            }
            if (!orgsTable.findColumnByName('timezone')) {
                columnsToAdd.push(new TableColumn({
                    name: 'timezone',
                    type: 'varchar',
                    length: '100',
                    isNullable: true,
                }));
            }
            if (!orgsTable.findColumnByName('language')) {
                columnsToAdd.push(new TableColumn({
                    name: 'language',
                    type: 'varchar',
                    length: '10',
                    default: "'en'",
                }));
            }
            if (!orgsTable.findColumnByName('date_format')) {
                columnsToAdd.push(new TableColumn({
                    name: 'date_format',
                    type: 'varchar',
                    length: '20',
                    default: "'YYYY-MM-DD'",
                }));
            }
            if (!orgsTable.findColumnByName('time_format')) {
                columnsToAdd.push(new TableColumn({
                    name: 'time_format',
                    type: 'varchar',
                    length: '10',
                    default: "'HH:mm'",
                }));
            }

            if (columnsToAdd.length > 0) {
                await queryRunner.addColumns('organizations', columnsToAdd);
            }
        }

        // Update existing packages with their branch limits
        // Free: 1, Basic: 5, Platinum: 10, Diamond: 15
        await queryRunner.query("UPDATE packages SET base_branch_limit = 1 WHERE slug = 'freemium'");
        await queryRunner.query("UPDATE packages SET base_branch_limit = 5 WHERE slug = 'basic'");
        await queryRunner.query("UPDATE packages SET base_branch_limit = 10 WHERE slug = 'platinum'");
        await queryRunner.query("UPDATE packages SET base_branch_limit = 15 WHERE slug = 'diamond'");

        // Sync branch_limit in organizations based on their package
        await queryRunner.query(`
      UPDATE organizations 
      SET branch_limit = p.base_branch_limit 
      FROM packages p 
      WHERE organizations.package_id = p.id
    `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        const orgsTable = await queryRunner.getTable('organizations');
        if (orgsTable) {
            if (orgsTable.findColumnByName('time_format')) await queryRunner.dropColumn('organizations', 'time_format');
            if (orgsTable.findColumnByName('date_format')) await queryRunner.dropColumn('organizations', 'date_format');
            if (orgsTable.findColumnByName('language')) await queryRunner.dropColumn('organizations', 'language');
            if (orgsTable.findColumnByName('timezone')) await queryRunner.dropColumn('organizations', 'timezone');
            if (orgsTable.findColumnByName('branch_limit')) await queryRunner.dropColumn('organizations', 'branch_limit');
        }

        const packagesTable = await queryRunner.getTable('packages');
        if (packagesTable && packagesTable.findColumnByName('base_branch_limit')) {
            await queryRunner.dropColumn('packages', 'base_branch_limit');
        }
    }
}
