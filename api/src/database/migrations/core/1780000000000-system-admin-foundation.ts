import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class SystemAdminFoundation1780000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add system_admin columns to users table
    await queryRunner.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS is_system_admin BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS system_admin_role VARCHAR(50) NULL
    `);

    // Add index for system admin queries
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_users_is_system_admin
      ON users(is_system_admin)
      WHERE is_system_admin = TRUE
    `);

    // Create system_settings table
    await queryRunner.createTable(
      new Table({
        name: 'system_settings',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'key',
            type: 'varchar',
            length: '255',
            isUnique: true,
            isNullable: false,
          },
          {
            name: 'value',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'category',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'is_public',
            type: 'boolean',
            default: false,
          },
          {
            name: 'updated_by',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Add indexes for system_settings
    await queryRunner.createIndex(
      'system_settings',
      new TableIndex({
        name: 'idx_system_settings_key',
        columnNames: ['key'],
        isUnique: true,
      }),
    );

    await queryRunner.createIndex(
      'system_settings',
      new TableIndex({
        name: 'idx_system_settings_category',
        columnNames: ['category'],
      }),
    );

    await queryRunner.createIndex(
      'system_settings',
      new TableIndex({
        name: 'idx_system_settings_is_public',
        columnNames: ['is_public'],
      }),
    );

    // Insert system admin permissions (only if they don't exist)
    const permissions = [
      ['system.organizations.view', 'View Organizations', 'View all organizations in the platform'],
      ['system.organizations.edit', 'Edit Organizations', 'Edit any organization in the platform'],
      ['system.organizations.suspend', 'Suspend Organizations', 'Suspend organizations in the platform'],
      ['system.organizations.delete', 'Delete Organizations', 'Delete organizations from the platform'],
      ['system.apps.view', 'View Apps (System)', 'View all apps in the marketplace'],
      ['system.apps.approve', 'Approve Apps', 'Approve apps for marketplace'],
      ['system.apps.reject', 'Reject Apps', 'Reject apps from marketplace'],
      ['system.apps.manage', 'Manage Apps (System)', 'Manage all apps in the marketplace'],
      ['system.users.view', 'View Users (System)', 'View all users across all organizations'],
      ['system.users.edit', 'Edit Users (System)', 'Edit any user in the platform'],
      ['system.users.suspend', 'Suspend Users', 'Suspend users in the platform'],
      ['system.users.delete', 'Delete Users (System)', 'Delete users from the platform'],
      ['system.analytics.view', 'View Analytics', 'View platform-wide analytics'],
      ['system.settings.view', 'View Settings', 'View system settings'],
      ['system.settings.edit', 'Edit Settings', 'Edit system settings'],
      ['system.reports.view', 'View Reports', 'View platform-wide reports'],
    ];

    for (const [slug, name, description] of permissions) {
      try {
        // Check if permission with this slug already exists
        const existing = await queryRunner.query(
          `SELECT id FROM permissions WHERE slug = $1`,
          [slug],
        );
        
        if (existing.length === 0) {
          // Check if permission with this name already exists
          const existingByName = await queryRunner.query(
            `SELECT id FROM permissions WHERE name = $1`,
            [name],
          );
          
          if (existingByName.length === 0) {
            await queryRunner.query(
              `
              INSERT INTO permissions (slug, name, description, category, created_at)
              VALUES ($1, $2, $3, 'system', NOW())
            `,
              [slug, name, description],
            );
          }
        }
      } catch (error) {
        // Ignore errors and continue
        console.warn(`Failed to insert permission ${slug}:`, error.message);
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove system admin permissions
    await queryRunner.query(`
      DELETE FROM permissions
      WHERE slug LIKE 'system.%'
    `);

    // Drop system_settings table
    await queryRunner.dropTable('system_settings', true);

    // Remove system_admin columns from users table
    await queryRunner.query(`
      ALTER TABLE users
      DROP COLUMN IF EXISTS is_system_admin,
      DROP COLUMN IF EXISTS system_admin_role
    `);
  }
}

