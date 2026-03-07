import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStripeToPaymentGatewayEnum1763741928427 implements MigrationInterface {
  name = 'AddStripeToPaymentGatewayEnum1763741928427';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "public"."payments_gateway_enum" RENAME TO "payments_gateway_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."payments_gateway_enum" AS ENUM('esewa', 'stripe')`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" ALTER COLUMN "gateway" TYPE "public"."payments_gateway_enum" USING "gateway"::"text"::"public"."payments_gateway_enum"`,
    );
    await queryRunner.query(`DROP TYPE "public"."payments_gateway_enum_old"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE "public"."payments_gateway_enum_old" AS ENUM('esewa')`);
    await queryRunner.query(
      `ALTER TABLE "payments" ALTER COLUMN "gateway" TYPE "public"."payments_gateway_enum_old" USING "gateway"::"text"::"public"."payments_gateway_enum_old"`,
    );
    await queryRunner.query(`DROP TYPE "public"."payments_gateway_enum"`);
    await queryRunner.query(
      `ALTER TYPE "public"."payments_gateway_enum_old" RENAME TO "payments_gateway_enum"`,
    );
  }
}
