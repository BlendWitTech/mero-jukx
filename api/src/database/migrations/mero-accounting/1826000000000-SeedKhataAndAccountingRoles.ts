import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedKhataAndAccountingRoles1826000000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // --- 1. Mero Khata Roles & Permissions ---
        const khataPermissions = [
            'khata.view',
            'khata.manage',
            'khata.reports',
            'khata.settings',
            'khata.customers.manage',
            'khata.transactions.manage'
        ];

        const khataApp = await queryRunner.query(`SELECT id FROM "apps" WHERE "slug" = 'mero-khata' LIMIT 1`);
        if (khataApp.length > 0) {
            const appId = khataApp[0].id;

            // Update app permissions JSON
            await queryRunner.query(`UPDATE "apps" SET "permissions" = $1 WHERE id = $2`, [JSON.stringify(khataPermissions), appId]);

            const roles = [
                {
                    name: 'Khata Admin',
                    slug: 'khata-admin',
                    description: 'Full access to digital ledger, customer management, and reports',
                    permissions: khataPermissions
                },
                {
                    name: 'Khata User',
                    slug: 'khata-user',
                    description: 'Can manage customers and transactions but cannot change app settings',
                    permissions: ['khata.view', 'khata.manage', 'khata.customers.manage', 'khata.transactions.manage']
                }
            ];

            await this.seedRoles(queryRunner, appId, roles, 'khata');
        }

        // --- 2. Mero Accounting Roles & Permissions ---
        const accountingPermissions = [
            'accounting.view',
            'accounting.manage',
            'accounting.reports',
            'accounting.journals',
            'accounting.banking',
            'accounting.sales',
            'accounting.purchases',
            'accounting.settings'
        ];

        const accountingApp = await queryRunner.query(`SELECT id FROM "apps" WHERE "slug" = 'mero-accounting' LIMIT 1`);
        if (accountingApp.length > 0) {
            const appId = accountingApp[0].id;

            // Update app permissions JSON
            await queryRunner.query(`UPDATE "apps" SET "permissions" = $1 WHERE id = $2`, [JSON.stringify(accountingPermissions), appId]);

            const roles = [
                {
                    name: 'Accounting Admin',
                    slug: 'accounting-admin',
                    description: 'Full administrative access to financial systems, settings, and reports',
                    permissions: accountingPermissions
                },
                {
                    name: 'Accountant',
                    slug: 'accountant',
                    description: 'Can manage daily transactions, journals, and banking',
                    permissions: [
                        'accounting.view',
                        'accounting.manage',
                        'accounting.journals',
                        'accounting.banking',
                        'accounting.sales',
                        'accounting.purchases'
                    ]
                }
            ];

            await this.seedRoles(queryRunner, appId, roles, 'accounting');
        }
    }

    private async seedRoles(queryRunner: QueryRunner, appId: any, roles: any[], category: string) {
        for (const roleData of roles) {
            const existingRole = await queryRunner.query(`
                SELECT id FROM "roles" 
                WHERE "slug" = $1 AND "app_id" = $2
            `, [roleData.slug, appId]);

            let roleId;
            if (existingRole.length === 0) {
                const insertedRole = await queryRunner.query(`
                    INSERT INTO "roles" (
                        "name", "slug", "description", "app_id", 
                        "is_system_role", "is_organization_owner", "is_default", "is_active", "hierarchy_level"
                    ) VALUES ($1, $2, $3, $4, true, false, false, true, 100)
                    RETURNING id
                `, [roleData.name, roleData.slug, roleData.description, appId]);
                roleId = insertedRole[0].id;
            } else {
                roleId = existingRole[0].id;
            }

            for (const permSlug of roleData.permissions) {
                const existingPerm = await queryRunner.query(`SELECT id FROM "permissions" WHERE "slug" = $1`, [permSlug]);
                let permId;
                if (existingPerm.length === 0) {
                    const insertedPerm = await queryRunner.query(`
                        INSERT INTO "permissions" ("name", "slug", "category", "description")
                        VALUES ($1, $1, $2, $3)
                        RETURNING id
                    `, [permSlug, category, `${category.toUpperCase()} permission: ${permSlug}`]);
                    permId = insertedPerm[0].id;
                } else {
                    permId = existingPerm[0].id;
                }

                await queryRunner.query(`
                    INSERT INTO "role_permissions" ("role_id", "permission_id")
                    SELECT $1, $2
                    WHERE NOT EXISTS (
                        SELECT 1 FROM "role_permissions" 
                        WHERE "role_id" = $1 AND "permission_id" = $2
                    )
                `, [roleId, permId]);
            }
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Roles will be deleted if app is deleted via cascade or manual cleanup
    }
}
