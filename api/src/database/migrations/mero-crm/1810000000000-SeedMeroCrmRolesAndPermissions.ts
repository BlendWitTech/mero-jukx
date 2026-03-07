import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedMeroCrmRolesAndPermissions1810000000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // 1. Define CRM Permissions
        const crmPermissions = [
            'crm.leads.view',
            'crm.leads.create',
            'crm.leads.update',
            'crm.leads.delete',
            'crm.deals.view',
            'crm.deals.create',
            'crm.deals.update',
            'crm.deals.delete',
            'crm.clients.view',
            'crm.clients.create',
            'crm.clients.update',
            'crm.clients.delete',
            'crm.activities.view',
            'crm.activities.create',
            'crm.activities.update',
            'crm.activities.delete',
            'crm.quotes.view',
            'crm.quotes.create',
            'crm.quotes.update',
            'crm.quotes.delete',
            'crm.invoices.view',
            'crm.invoices.create',
            'crm.invoices.update',
            'crm.invoices.delete',
            'crm.payments.view',
            'crm.payments.create',
            'crm.payments.update',
            'crm.payments.delete',
            'crm.settings.view',
            'crm.settings.manage',
            'crm.members.invite'
        ];

        // 2. Update Mero CRM App Permissions
        await queryRunner.query(`
            UPDATE "apps"
            SET "permissions" = $1
            WHERE "slug" = 'mero-crm'
        `, [JSON.stringify(crmPermissions)]);

        // 3. Get Mero CRM App ID
        const crmApp = await queryRunner.query(`SELECT id FROM "apps" WHERE "slug" = 'mero-crm' LIMIT 1`);
        if (crmApp.length === 0) return;
        const appId = crmApp[0].id;

        // 4. Seed Mero CRM Specific Roles
        const roles = [
            {
                name: 'CRM Admin',
                slug: 'crm-admin',
                description: 'Full access to all CRM features including leads, deals, clients, and settings',
                app_id: appId,
                permissions: crmPermissions
            },
            {
                name: 'CRM Sales Rep',
                slug: 'crm-sales-rep',
                description: 'Can manage leads, deals, clients, and activities but cannot modify settings',
                app_id: appId,
                permissions: [
                    'crm.leads.view',
                    'crm.leads.create',
                    'crm.leads.update',
                    'crm.leads.delete',
                    'crm.deals.view',
                    'crm.deals.create',
                    'crm.deals.update',
                    'crm.deals.delete',
                    'crm.clients.view',
                    'crm.clients.create',
                    'crm.clients.update',
                    'crm.activities.view',
                    'crm.activities.create',
                    'crm.activities.update',
                    'crm.quotes.view',
                    'crm.quotes.create',
                    'crm.quotes.update',
                    'crm.invoices.view',
                    'crm.invoices.create',
                    'crm.payments.view',
                    'crm.payments.create',
                    'crm.settings.view'
                ]
            },
            {
                name: 'CRM Viewer',
                slug: 'crm-viewer',
                description: 'Read-only access to all CRM data',
                app_id: appId,
                permissions: [
                    'crm.leads.view',
                    'crm.deals.view',
                    'crm.clients.view',
                    'crm.activities.view',
                    'crm.quotes.view',
                    'crm.invoices.view',
                    'crm.payments.view',
                    'crm.settings.view'
                ]
            }
        ];

        // 5. Insert roles and permissions
        for (const roleData of roles) {
            // Check if role exists
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

            // Assign permissions to role
            for (const permSlug of roleData.permissions) {
                const existingPerm = await queryRunner.query(`SELECT id FROM "permissions" WHERE "slug" = $1`, [permSlug]);
                let permId;
                if (existingPerm.length === 0) {
                    const insertedPerm = await queryRunner.query(`
                        INSERT INTO "permissions" ("name", "slug", "category", "description")
                        VALUES ($1, $1, 'crm', $2)
                        RETURNING id
                    `, [permSlug, `CRM permission: ${permSlug}`]);
                    permId = insertedPerm[0].id;
                } else {
                    permId = existingPerm[0].id;
                }

                // Link role and permission
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
        const crmApp = await queryRunner.query(`SELECT id FROM "apps" WHERE "slug" = 'mero-crm' LIMIT 1`);
        if (crmApp.length === 0) return;
        const appId = crmApp[0].id;

        // Delete roles and their permissions
        await queryRunner.query(`DELETE FROM "roles" WHERE "app_id" = $1`, [appId]);
    }
}
