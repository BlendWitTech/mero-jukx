import { MigrationInterface, QueryRunner, TableColumn, TableForeignKey } from 'typeorm';

export class AppSpecificRoles1807000000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add app_id to roles table
        const rolesTable = await queryRunner.getTable('roles');
        if (rolesTable) {
            if (!rolesTable.findColumnByName('app_id')) {
                await queryRunner.addColumn('roles', new TableColumn({
                    name: 'app_id',
                    type: 'int',
                    isNullable: true,
                }));
            }

            if (!rolesTable.foreignKeys.find(fk => fk.columnNames.includes('app_id'))) {
                await queryRunner.createForeignKey('roles', new TableForeignKey({
                    columnNames: ['app_id'],
                    referencedColumnNames: ['id'],
                    referencedTableName: 'apps',
                    onDelete: 'CASCADE',
                }));
            }
        }

        // Add role_id to user_app_access table
        const accessTable = await queryRunner.getTable('user_app_access');
        if (accessTable) {
            if (!accessTable.findColumnByName('role_id')) {
                await queryRunner.addColumn('user_app_access', new TableColumn({
                    name: 'role_id',
                    type: 'int',
                    isNullable: true,
                }));
            }

            if (!accessTable.foreignKeys.find(fk => fk.columnNames.includes('role_id'))) {
                await queryRunner.createForeignKey('user_app_access', new TableForeignKey({
                    columnNames: ['role_id'],
                    referencedColumnNames: ['id'],
                    referencedTableName: 'roles',
                    onDelete: 'SET NULL',
                }));
            }
        }

        // Add role_id to app_invitations table
        const invitationsTable = await queryRunner.getTable('app_invitations');
        if (invitationsTable) {
            if (!invitationsTable.findColumnByName('role_id')) {
                await queryRunner.addColumn('app_invitations', new TableColumn({
                    name: 'role_id',
                    type: 'int',
                    isNullable: true,
                }));
            }

            if (!invitationsTable.foreignKeys.find(fk => fk.columnNames.includes('role_id'))) {
                await queryRunner.createForeignKey('app_invitations', new TableForeignKey({
                    columnNames: ['role_id'],
                    referencedColumnNames: ['id'],
                    referencedTableName: 'roles',
                    onDelete: 'SET NULL',
                }));
            }
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Remove role_id from app_invitations
        const invitationsTable = await queryRunner.getTable('app_invitations');
        if (invitationsTable) {
            const invRoleForeignKey = invitationsTable.foreignKeys.find(fk => fk.columnNames.indexOf('role_id') !== -1);
            if (invRoleForeignKey) {
                await queryRunner.dropForeignKey('app_invitations', invRoleForeignKey);
            }
            if (invitationsTable.findColumnByName('role_id')) {
                await queryRunner.dropColumn('app_invitations', 'role_id');
            }
        }

        // Remove role_id from user_app_access
        const accessTable = await queryRunner.getTable('user_app_access');
        if (accessTable) {
            const roleForeignKey = accessTable.foreignKeys.find(fk => fk.columnNames.indexOf('role_id') !== -1);
            if (roleForeignKey) {
                await queryRunner.dropForeignKey('user_app_access', roleForeignKey);
            }
            if (accessTable.findColumnByName('role_id')) {
                await queryRunner.dropColumn('user_app_access', 'role_id');
            }
        }

        // Remove app_id from roles
        const rolesTable = await queryRunner.getTable('roles');
        if (rolesTable) {
            const appForeignKey = rolesTable.foreignKeys.find(fk => fk.columnNames.indexOf('app_id') !== -1);
            if (appForeignKey) {
                await queryRunner.dropForeignKey('roles', appForeignKey);
            }
            if (rolesTable.findColumnByName('app_id')) {
                await queryRunner.dropColumn('roles', 'app_id');
            }
        }
    }
}
