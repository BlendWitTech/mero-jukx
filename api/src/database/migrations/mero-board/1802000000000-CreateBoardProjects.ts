import { MigrationInterface, QueryRunner, Table, TableForeignKey } from "typeorm";

export class CreateBoardProjects1802000000000 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.createTable(new Table({
            name: "board_projects",
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
                    name: "status",
                    type: "varchar",
                    default: "'ACTIVE'",
                },
                {
                    name: "organization_id",
                    type: "uuid",
                },
                {
                    name: "workspace_id",
                    type: "uuid",
                },
                {
                    name: "created_by_id",
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

        const table = await queryRunner.getTable("board_projects");
        if (table) {
            if (!table.foreignKeys.find(fk => fk.columnNames.includes("organization_id"))) {
                await queryRunner.createForeignKey("board_projects", new TableForeignKey({
                    columnNames: ["organization_id"],
                    referencedColumnNames: ["id"],
                    referencedTableName: "organizations",
                    onDelete: "CASCADE",
                }));
            }

            if (!table.foreignKeys.find(fk => fk.columnNames.includes("workspace_id"))) {
                await queryRunner.createForeignKey("board_projects", new TableForeignKey({
                    columnNames: ["workspace_id"],
                    referencedColumnNames: ["id"],
                    referencedTableName: "board_workspaces",
                    onDelete: "CASCADE",
                }));
            }

            if (!table.foreignKeys.find(fk => fk.columnNames.includes("created_by_id"))) {
                await queryRunner.createForeignKey("board_projects", new TableForeignKey({
                    columnNames: ["created_by_id"],
                    referencedColumnNames: ["id"],
                    referencedTableName: "users",
                    onDelete: "CASCADE",
                }));
            }
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable("board_projects", true);
    }
}
