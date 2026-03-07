import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class AddCrmClientFields1799000000000 implements MigrationInterface {
    name = 'AddCrmClientFields1799000000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.addColumns('crm_clients', [
            new TableColumn({
                name: 'company',
                type: 'varchar',
                isNullable: true,
            }),
            new TableColumn({
                name: 'city',
                type: 'varchar',
                isNullable: true,
            }),
            new TableColumn({
                name: 'state',
                type: 'varchar',
                isNullable: true,
            }),
            new TableColumn({
                name: 'zip_code',
                type: 'varchar',
                isNullable: true,
            }),
            new TableColumn({
                name: 'notes',
                type: 'text',
                isNullable: true,
            }),
        ]);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropColumn('crm_clients', 'notes');
        await queryRunner.dropColumn('crm_clients', 'zip_code');
        await queryRunner.dropColumn('crm_clients', 'state');
        await queryRunner.dropColumn('crm_clients', 'city');
        await queryRunner.dropColumn('crm_clients', 'company');
    }
}
