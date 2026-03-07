import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class CreateAppInvitations1770500000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create enum type if it doesn't exist
        await queryRunner.query(
            `DO $$ BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_invitations_status_enum') THEN
                    CREATE TYPE "public"."app_invitations_status_enum" AS ENUM('pending', 'accepted', 'declined', 'cancelled', 'expired');
                END IF;
            END $$;`,
        );

        // Create app_invitations table
        await queryRunner.createTable(
            new Table({
                name: 'app_invitations',
                columns: [
                    {
                        name: 'id',
                        type: 'uuid',
                        isPrimary: true,
                        isGenerated: true,
                        generationStrategy: 'uuid',
                        default: 'uuid_generate_v4()',
                    },
                    {
                        name: 'organization_id',
                        type: 'uuid',
                        isNullable: false,
                    },
                    {
                        name: 'app_id',
                        type: 'int',
                        isNullable: false,
                    },
                    {
                        name: 'user_id',
                        type: 'uuid',
                        isNullable: false,
                    },
                    {
                        name: 'member_id',
                        type: 'uuid',
                        isNullable: false,
                    },
                    {
                        name: 'invited_by',
                        type: 'uuid',
                        isNullable: false,
                    },
                    {
                        name: 'token',
                        type: 'varchar',
                        length: '255',
                        isUnique: true,
                        isNullable: false,
                    },
                    {
                        name: 'status',
                        type: 'enum',
                        enum: ['pending', 'accepted', 'declined', 'cancelled', 'expired'],
                        default: "'pending'",
                    },
                    {
                        name: 'expires_at',
                        type: 'timestamp',
                        isNullable: false,
                    },
                    {
                        name: 'accepted_at',
                        type: 'timestamp',
                        isNullable: true,
                    },
                    {
                        name: 'declined_at',
                        type: 'timestamp',
                        isNullable: true,
                    },
                    {
                        name: 'cancelled_by',
                        type: 'uuid',
                        isNullable: true,
                    },
                    {
                        name: 'message',
                        type: 'text',
                        isNullable: true,
                    },
                    {
                        name: 'created_at',
                        type: 'timestamp',
                        default: 'now()',
                    },
                    {
                        name: 'updated_at',
                        type: 'timestamp',
                        default: 'now()',
                    },
                ],
            }),
            true,
        );

        const table = await queryRunner.getTable('app_invitations');
        if (table) {
            // Create indexes
            if (!table.indices.find(idx => idx.name === 'IDX_app_invitations_token' || idx.columnNames.includes('token'))) {
                await queryRunner.createIndex(
                    'app_invitations',
                    new TableIndex({
                        name: 'IDX_app_invitations_token',
                        columnNames: ['token'],
                        isUnique: true,
                    }),
                );
            }

            if (!table.indices.find(idx => idx.name === 'IDX_app_invitations_org_app_user' || (idx.columnNames.includes('organization_id') && idx.columnNames.includes('app_id') && idx.columnNames.includes('user_id')))) {
                await queryRunner.createIndex(
                    'app_invitations',
                    new TableIndex({
                        name: 'IDX_app_invitations_org_app_user',
                        columnNames: ['organization_id', 'app_id', 'user_id'],
                    }),
                );
            }

            // Add foreign keys
            if (!table.foreignKeys.find(fk => fk.columnNames.includes('organization_id'))) {
                await queryRunner.createForeignKey(
                    'app_invitations',
                    new TableForeignKey({
                        columnNames: ['organization_id'],
                        referencedColumnNames: ['id'],
                        referencedTableName: 'organizations',
                        onDelete: 'CASCADE',
                    }),
                );
            }

            if (!table.foreignKeys.find(fk => fk.columnNames.includes('app_id'))) {
                await queryRunner.createForeignKey(
                    'app_invitations',
                    new TableForeignKey({
                        columnNames: ['app_id'],
                        referencedColumnNames: ['id'],
                        referencedTableName: 'apps',
                        onDelete: 'CASCADE',
                    }),
                );
            }

            if (!table.foreignKeys.find(fk => fk.columnNames.includes('user_id'))) {
                await queryRunner.createForeignKey(
                    'app_invitations',
                    new TableForeignKey({
                        columnNames: ['user_id'],
                        referencedColumnNames: ['id'],
                        referencedTableName: 'users',
                        onDelete: 'CASCADE',
                    }),
                );
            }

            if (!table.foreignKeys.find(fk => fk.columnNames.includes('member_id'))) {
                await queryRunner.createForeignKey(
                    'app_invitations',
                    new TableForeignKey({
                        columnNames: ['member_id'],
                        referencedColumnNames: ['id'],
                        referencedTableName: 'organization_members',
                        onDelete: 'CASCADE',
                    }),
                );
            }

            if (!table.foreignKeys.find(fk => fk.columnNames.includes('invited_by'))) {
                await queryRunner.createForeignKey(
                    'app_invitations',
                    new TableForeignKey({
                        columnNames: ['invited_by'],
                        referencedColumnNames: ['id'],
                        referencedTableName: 'users',
                        onDelete: 'CASCADE',
                    }),
                );
            }
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable('app_invitations', true);
        await queryRunner.query(`DROP TYPE IF EXISTS "public"."app_invitations_status_enum"`);
    }
}
