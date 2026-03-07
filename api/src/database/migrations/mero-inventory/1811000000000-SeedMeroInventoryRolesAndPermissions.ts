import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedMeroInventoryRolesAndPermissions1811000000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // 1. Define Inventory Permissions
        const inventoryPermissions = [
            'inventory.products.view',
            'inventory.products.create',
            'inventory.products.edit',
            'inventory.products.delete',
            'inventory.warehouses.view',
            'inventory.warehouses.create',
            'inventory.warehouses.edit',
            'inventory.warehouses.delete',
            'inventory.stock.view',
            'inventory.stock.adjust',
            'inventory.orders.view',
            'inventory.orders.create',
            'inventory.orders.edit',
            'inventory.orders.delete',
            'inventory.suppliers.view',
            'inventory.suppliers.create',
            'inventory.suppliers.edit',
            'inventory.suppliers.delete',
            'inventory.reports.view',
            'inventory.settings.view',
            'inventory.settings.manage',
            'inventory.members.invite'
        ];

        // 2. Update Mero Inventory App Permissions
        await queryRunner.query(`
            UPDATE "apps"
            SET "permissions" = $1
            WHERE "slug" = 'mero-inventory'
        `, [JSON.stringify(inventoryPermissions)]);

        // 3. Get Mero Inventory App ID
        const inventoryApp = await queryRunner.query(`SELECT id FROM "apps" WHERE "slug" = 'mero-inventory' LIMIT 1`);
        if (inventoryApp.length === 0) return;
        const appId = inventoryApp[0].id;

        // 4. Seed Mero Inventory Specific Roles
        const roles = [
            {
                name: 'Inventory Admin',
                slug: 'inventory-admin',
                description: 'Full access to all inventory features including products, warehouses, stock, and settings',
                app_id: appId,
                permissions: inventoryPermissions
            },
            {
                name: 'Inventory Manager',
                slug: 'inventory-manager',
                description: 'Can manage products, stock, orders, and suppliers but cannot delete warehouses or modify settings',
                app_id: appId,
                permissions: [
                    'inventory.products.view',
                    'inventory.products.create',
                    'inventory.products.edit',
                    'inventory.products.delete',
                    'inventory.warehouses.view',
                    'inventory.warehouses.edit',
                    'inventory.stock.view',
                    'inventory.stock.adjust',
                    'inventory.orders.view',
                    'inventory.orders.create',
                    'inventory.orders.edit',
                    'inventory.orders.delete',
                    'inventory.suppliers.view',
                    'inventory.suppliers.create',
                    'inventory.suppliers.edit',
                    'inventory.suppliers.delete',
                    'inventory.reports.view',
                    'inventory.settings.view'
                ]
            },
            {
                name: 'Inventory Viewer',
                slug: 'inventory-viewer',
                description: 'Read-only access to all inventory data',
                app_id: appId,
                permissions: [
                    'inventory.products.view',
                    'inventory.warehouses.view',
                    'inventory.stock.view',
                    'inventory.orders.view',
                    'inventory.suppliers.view',
                    'inventory.reports.view',
                    'inventory.settings.view'
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
                        VALUES ($1, $1, 'inventory', $2)
                        RETURNING id
                    `, [permSlug, `Inventory permission: ${permSlug}`]);
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
        const inventoryApp = await queryRunner.query(`SELECT id FROM "apps" WHERE "slug" = 'mero-inventory' LIMIT 1`);
        if (inventoryApp.length === 0) return;
        const appId = inventoryApp[0].id;

        // Delete roles and their permissions
        await queryRunner.query(`DELETE FROM "roles" WHERE "app_id" = $1`, [appId]);
    }
}
