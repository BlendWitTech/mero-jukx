import { MigrationInterface, QueryRunner } from "typeorm";

export class AddInventoryWarehousesAndStock1798000000000 implements MigrationInterface {
    name = 'AddInventoryWarehousesAndStock1798000000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create Warehouse table
        await queryRunner.query(`CREATE TABLE IF NOT EXISTS "warehouses" (
            "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
            "organization_id" uuid NOT NULL,
            "name" character varying NOT NULL,
            "location" character varying,
            "contact_number" character varying,
            "type" character varying NOT NULL DEFAULT 'main',
            "is_active" boolean NOT NULL DEFAULT true,
            "created_at" TIMESTAMP NOT NULL DEFAULT now(),
            "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
            CONSTRAINT "PK_warehouses_id" PRIMARY KEY ("id")
        )`);

        // Create Stock table
        await queryRunner.query(`CREATE TABLE IF NOT EXISTS "stocks" (
            "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
            "product_id" uuid NOT NULL,
            "warehouse_id" uuid NOT NULL,
            "quantity" integer NOT NULL DEFAULT 0,
            "created_at" TIMESTAMP NOT NULL DEFAULT now(),
            "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
            CONSTRAINT "PK_stocks_id" PRIMARY KEY ("id")
        )`);

        // Add FKs safely
        // FK_warehouses_organization
        await queryRunner.query(`
            DO $$
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_warehouses_organization') THEN
                    ALTER TABLE "warehouses" ADD CONSTRAINT "FK_warehouses_organization" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
                END IF;
            END $$;
        `);

        // FK_stocks_product
        await queryRunner.query(`
            DO $$
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_stocks_product') THEN
                    ALTER TABLE "stocks" ADD CONSTRAINT "FK_stocks_product" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
                END IF;
            END $$;
        `);

        // FK_stocks_warehouse
        await queryRunner.query(`
            DO $$
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_stocks_warehouse') THEN
                    ALTER TABLE "stocks" ADD CONSTRAINT "FK_stocks_warehouse" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
                END IF;
            END $$;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "stocks" DROP CONSTRAINT "FK_stocks_warehouse"`);
        await queryRunner.query(`ALTER TABLE "stocks" DROP CONSTRAINT "FK_stocks_product"`);
        await queryRunner.query(`ALTER TABLE "warehouses" DROP CONSTRAINT "FK_warehouses_organization"`);
        await queryRunner.query(`DROP TABLE "stocks"`);
        await queryRunner.query(`DROP TABLE "warehouses"`);
    }
}
