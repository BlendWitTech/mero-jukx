import { MigrationInterface, QueryRunner, TableColumn, TableForeignKey, TableIndex } from 'typeorm';

export class AddOrganizationIdToCommunication1820000000000 implements MigrationInterface {
    name = 'AddOrganizationIdToCommunication1820000000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        const tables = [
            { name: 'messages', parent: 'chats', joinField: 'chat_id' },
            { name: 'message_attachments', parent: 'messages', joinField: 'message_id' },
            { name: 'message_reactions', parent: 'messages', joinField: 'message_id' },
            { name: 'message_read_status', parent: 'messages', joinField: 'message_id' },
            { name: 'chat_members', parent: 'chats', joinField: 'chat_id' },
            { name: 'call_sessions', parent: 'chats', joinField: 'chat_id' },
            { name: 'call_participants', parent: 'call_sessions', joinField: 'call_session_id' },
        ];

        for (const config of tables) {
            const table = await queryRunner.getTable(config.name);
            if (table) {
                // Add organization_id column
                if (!table.findColumnByName('organization_id')) {
                    await queryRunner.addColumn(config.name, new TableColumn({
                        name: 'organization_id',
                        type: 'uuid',
                        isNullable: true,
                    }));

                    // Update values
                    await queryRunner.query(`
                        UPDATE "${config.name}" t
                        SET organization_id = p.organization_id
                        FROM "${config.parent}" p
                        WHERE t."${config.joinField}" = p.id
                    `);

                    // Set NOT NULL
                    await queryRunner.query(`ALTER TABLE "${config.name}" ALTER COLUMN "organization_id" SET NOT NULL`);
                }

                // Add Foreign Key
                if (!table.foreignKeys.find(fk => fk.columnNames.includes('organization_id'))) {
                    await queryRunner.createForeignKey(config.name, new TableForeignKey({
                        name: `FK_${config.name}_organization`,
                        columnNames: ['organization_id'],
                        referencedColumnNames: ['id'],
                        referencedTableName: 'organizations',
                        onDelete: 'CASCADE',
                    }));
                }

                // Add Index
                if (!table.indices.find(idx => idx.name === `IDX_${config.name}_organization_id` || idx.columnNames.includes('organization_id'))) {
                    await queryRunner.createIndex(config.name, new TableIndex({
                        name: `IDX_${config.name}_organization_id`,
                        columnNames: ['organization_id'],
                    }));
                }
            }
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        const tables = [
            'call_participants',
            'call_sessions',
            'chat_members',
            'message_read_status',
            'message_reactions',
            'message_attachments',
            'messages',
        ];

        for (const tableName of tables) {
            const table = await queryRunner.getTable(tableName);
            if (table) {
                const index = table.indices.find(idx => idx.name === `IDX_${tableName}_organization_id`);
                if (index) await queryRunner.dropIndex(tableName, index);

                const fk = table.foreignKeys.find(fk => fk.name === `FK_${tableName}_organization` || fk.columnNames.includes('organization_id'));
                if (fk) await queryRunner.dropForeignKey(tableName, fk);

                if (table.findColumnByName('organization_id')) {
                    await queryRunner.dropColumn(tableName, 'organization_id');
                }
            }
        }
    }
}
