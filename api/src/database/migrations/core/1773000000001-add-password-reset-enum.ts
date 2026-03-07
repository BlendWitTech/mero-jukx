import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPasswordResetEnum1773000000001 implements MigrationInterface {
  name = 'AddPasswordResetEnum1773000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add the new enum value to email_verifications_type_enum
    try {
      await queryRunner.query(
        `ALTER TYPE "public"."email_verifications_type_enum" ADD VALUE IF NOT EXISTS 'password_reset'`,
      );
    } catch (e) {
      console.warn('[Migration] Could not add password_reset to email enum (may not exist yet):', (e as any)?.message);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Note: PostgreSQL doesn't support removing enum values directly
    // This would require recreating the enum type, which is complex
    // For now, we'll leave it as a no-op
    // In production, you'd need to:
    // 1. Create a new enum without 'password_reset'
    // 2. Update all rows to use a different type
    // 3. Drop the old enum and rename the new one
    console.warn('Removing enum values is not supported. Manual intervention required.');
  }
}

