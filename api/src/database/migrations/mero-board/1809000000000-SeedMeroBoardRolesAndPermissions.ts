import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedMeroBoardRolesAndPermissions1809000000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // 1. Update Mero Board App Permissions
        const boardPermissions = [
            'board.workspaces.view',
            'board.workspaces.manage',
            'board.projects.view',
            'board.projects.manage',
            'board.tasks.view',
            'board.tasks.manage',
            'board.members.invite'
        ];

        await queryRunner.query(`
            UPDATE "apps"
            SET "permissions" = $1
            WHERE "slug" = 'mero-board'
        `, [JSON.stringify(boardPermissions)]);

        // 2. Get Mero Board App ID
        const boardApp = await queryRunner.query(`SELECT id FROM "apps" WHERE "slug" = 'mero-board' LIMIT 1`);
        if (boardApp.length === 0) return;
        const appId = boardApp[0].id;

        // 3. Seed Mero Board Specific Roles
        const roles = [
            {
                name: 'Board Admin',
                slug: 'board-admin',
                description: 'Full access to all board workspaces, projects and tasks',
                app_id: appId,
                permissions: boardPermissions
            },
            {
                name: 'Board Member',
                slug: 'board-member',
                description: 'Can view and manage tasks/projects, view workspaces',
                app_id: appId,
                permissions: [
                    'board.workspaces.view',
                    'board.projects.view',
                    'board.projects.manage',
                    'board.tasks.view',
                    'board.tasks.manage'
                ]
            },
            {
                name: 'Board Viewer',
                slug: 'board-viewer',
                description: 'Read-only access to board workspaces, projects and tasks',
                app_id: appId,
                permissions: [
                    'board.workspaces.view',
                    'board.projects.view',
                    'board.tasks.view'
                ]
            }
        ];

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
                // Ensure permission exists in global permissions table first?
                // Actually, app permissions might be separate or shared. 
                // Let's check if we need to add them to 'permissions' table.

                const existingPerm = await queryRunner.query(`SELECT id FROM "permissions" WHERE "slug" = $1`, [permSlug]);
                let permId;
                if (existingPerm.length === 0) {
                    const insertedPerm = await queryRunner.query(`
                        INSERT INTO "permissions" ("name", "slug", "category", "description")
                        VALUES ($1, $1, 'board', $2)
                        RETURNING id
                    `, [permSlug, `Board permission: ${permSlug}`]);
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
        const boardApp = await queryRunner.query(`SELECT id FROM "apps" WHERE "slug" = 'mero-board' LIMIT 1`);
        if (boardApp.length === 0) return;
        const appId = boardApp[0].id;

        // Delete roles and their permissions
        await queryRunner.query(`DELETE FROM "roles" WHERE "app_id" = $1`, [appId]);
        // Note: we don't necessarily want to delete the permissions from the permissions table as they might be shared.
    }
}
