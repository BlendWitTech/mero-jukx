import { MigrationInterface, QueryRunner, Table, TableForeignKey } from "typeorm";

export class CreateRecurringTransactions1849000000000 implements MigrationInterface {
    name = 'CreateRecurringTransactions1849000000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."recurring_transaction_type_enum" AS ENUM('JOURNAL_ENTRY', 'PURCHASE_INVOICE', 'SALES_INVOICE')`);
        await queryRunner.query(`CREATE TYPE "public"."recurring_transaction_frequency_enum" AS ENUM('DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY')`);
        await queryRunner.query(`CREATE TYPE "public"."recurring_transaction_status_enum" AS ENUM('ACTIVE', 'PAUSED', 'COMPLETED')`);

        await queryRunner.createTable(new Table({
            name: "recurring_transactions",
            columns: [
                {
                    name: "id",
                    type: "uuid",
                    isPrimary: true,
                    generationStrategy: "uuid",
                    default: "uuid_generate_v4()",
                },
                {
                    name: "organization_id",
                    type: "uuid",
                },
                {
                    name: "type",
                    type: "enum",
                    enumName: "recurring_transaction_type_enum",
                },
                {
                    name: "frequency",
                    type: "enum",
                    enumName: "recurring_transaction_frequency_enum",
                },
                {
                    name: "status",
                    type: "enum",
                    enumName: "recurring_transaction_status_enum",
                    default: "'ACTIVE'",
                },
                {
                    name: "start_date",
                    type: "date",
                },
                {
                    name: "end_date",
                    type: "date",
                    isNullable: true,
                },
                {
                    name: "next_run_date",
                    type: "date",
                },
                {
                    name: "last_run_date",
                    type: "date",
                    isNullable: true,
                },
                {
                    name: "template_payload",
                    type: "jsonb",
                },
                {
                    name: "created_by",
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
                }
            ]
        }), true);

        await queryRunner.createForeignKey("recurring_transactions", new TableForeignKey({
            columnNames: ["organization_id"],
            referencedColumnNames: ["id"],
            referencedTableName: "organizations",
            onDelete: "CASCADE"
        }));

        await queryRunner.createForeignKey("recurring_transactions", new TableForeignKey({
            columnNames: ["created_by"],
            referencedColumnNames: ["id"],
            referencedTableName: "users",
            onDelete: "CASCADE"
        }));
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        const table = await queryRunner.getTable("recurring_transactions");
        if (table) {
            const foreignKeys = table.foreignKeys;
            await queryRunner.dropForeignKeys("recurring_transactions", foreignKeys);
            await queryRunner.dropTable("recurring_transactions");
        }
        await queryRunner.query(`DROP TYPE "public"."recurring_transaction_type_enum"`);
        await queryRunner.query(`DROP TYPE "public"."recurring_transaction_frequency_enum"`);
        await queryRunner.query(`DROP TYPE "public"."recurring_transaction_status_enum"`);
    }
}
