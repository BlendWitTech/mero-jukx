import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class AddDiscountToInvoices1832000000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.addColumn(
            "sales_invoices",
            new TableColumn({
                name: "discount_amount",
                type: "decimal",
                precision: 15,
                scale: 2,
                default: 0,
            })
        );

        await queryRunner.addColumn(
            "purchase_invoices",
            new TableColumn({
                name: "discount_amount",
                type: "decimal",
                precision: 15,
                scale: 2,
                default: 0,
            })
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropColumn("sales_invoices", "discount_amount");
        await queryRunner.dropColumn("purchase_invoices", "discount_amount");
    }
}
