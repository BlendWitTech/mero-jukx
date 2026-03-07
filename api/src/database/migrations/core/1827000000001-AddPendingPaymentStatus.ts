import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPendingPaymentStatus1827000000001 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Check if the enum value already exists to avoid errors on retry
        const checkValue = await queryRunner.query(`
      SELECT 1 FROM pg_enum 
      WHERE enumlabel = 'pending_payment' 
      AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'organization_apps_status_enum')
    `);

        if (checkValue.length === 0) {
            await queryRunner.query(
                `ALTER TYPE "organization_apps_status_enum" ADD VALUE 'pending_payment'`,
            );
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // PostgreSQL does not support removing values from an enum type easily.
        // Usually, this involves creating a new type, moving data, and dropping the old one.
        // Since this is a new feature, we'll keep the value in the enum if reverted,
        // as it won't be used by the application code anyway.
        console.warn('PostgreSQL does not support removing values from enums. the "pending_payment" value will remain in the type.');
    }
}
