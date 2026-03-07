import { MigrationInterface, QueryRunner, Table, TableForeignKey } from "typeorm";

export class CreateBoardWorkspaces1801000000000 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.createTable(new Table({
            name: "board_workspaces",
            columns: [
                {
                    name: "id",
                    type: "uuid",
                    isPrimary: true,
                    generationStrategy: "uuid",
                    default: "uuid_generate_v4()",
                },
                {
                    name: "name",
                    type: "varchar",
                },
                {
                    name: "description",
                    type: "text",
                    isNullable: true,
                },
                {
                    name: "color",
                    type: "varchar",
                    isNullable: true,
                },
                {
                    name: "organization_id",
                    type: "uuid",
                },
                {
                    name: "owner_id",
                    type: "uuid",
                },
                {
                    name: "created_at",
                    type: "timestamp",
                    default: "now()",
                },
                {
                    name: "updated_at",
                    type: "timestamp",
                    default: "now()",
                },
            ],
        }), true);

        const table = await queryRunner.getTable("board_workspaces");
        if (table) {
            if (!table.foreignKeys.find(fk => fk.columnNames.includes("organization_id"))) {
                await queryRunner.createForeignKey("board_workspaces", new TableForeignKey({
                    columnNames: ["organization_id"],
                    referencedColumnNames: ["id"],
                    referencedTableName: "organizations",
                    onDelete: "CASCADE",
                }));
            }

            if (!table.foreignKeys.find(fk => fk.columnNames.includes("owner_id"))) {
                await queryRunner.createForeignKey("board_workspaces", new TableForeignKey({
                    columnNames: ["owner_id"],
                    referencedColumnNames: ["id"],
                    referencedTableName: "users",
                    onDelete: "CASCADE",
                }));
            }
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable("board_workspaces", true);
    }
}
