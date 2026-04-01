import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMissingWarehouseColumns2000000000008 implements MigrationInterface {
  name = 'AddMissingWarehouseColumns2000000000008';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const add = async (col: string, def: string) => {
      const has = await queryRunner.hasColumn('warehouses', col);
      if (!has) await queryRunner.query(`ALTER TABLE "warehouses" ADD COLUMN ${def}`);
    };

    await add('contact_number', `"contact_number" varchar NULL`);
    await add('location', `"location" varchar NULL`);
    await add('address', `"address" text NULL`);
    await add('city', `"city" varchar(100) NULL`);
    await add('country', `"country" varchar(100) NULL`);
    await add('updated_at', `"updated_at" TIMESTAMP NOT NULL DEFAULT now()`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "warehouses" DROP COLUMN IF EXISTS "contact_number"`);
    await queryRunner.query(`ALTER TABLE "warehouses" DROP COLUMN IF EXISTS "location"`);
    await queryRunner.query(`ALTER TABLE "warehouses" DROP COLUMN IF EXISTS "address"`);
    await queryRunner.query(`ALTER TABLE "warehouses" DROP COLUMN IF EXISTS "city"`);
    await queryRunner.query(`ALTER TABLE "warehouses" DROP COLUMN IF EXISTS "country"`);
  }
}
