import { DataSource } from 'typeorm';
import { Role } from '../entities/roles.entity';
import { Permission } from '../entities/permissions.entity';
import { RolePermission } from '../entities/role_permissions.entity';

export async function seedRoles(dataSource: DataSource): Promise<void> {
  const roleRepository = dataSource.getRepository(Role);
  const permissionRepository = dataSource.getRepository(Permission);
  const rolePermissionRepository = dataSource.getRepository(RolePermission);

  // Helper function to assign permissions to a role
  const assignPermissions = async (
    roleId: number,
    permissionSlugs: string[],
    roleName: string,
  ): Promise<number> => {
    const permissions = await permissionRepository.find({
      where: permissionSlugs.map((slug) => ({ slug })),
    });

    let assignedCount = 0;
    for (const permission of permissions) {
      const existing = await rolePermissionRepository.findOne({
        where: {
          role_id: roleId,
          permission_id: permission.id,
        },
      });

      if (!existing) {
        await rolePermissionRepository.save(
          rolePermissionRepository.create({
            role_id: roleId,
            permission_id: permission.id,
          }),
        );
        assignedCount++;
      }
    }
    if (assignedCount > 0) {
      console.log(`  → Assigned ${assignedCount} permissions to ${roleName}`);
    }
    return assignedCount;
  };

  // Create Organization Owner role (system role)
  let ownerRole = await roleRepository.findOne({
    where: { slug: 'organization-owner', is_system_role: true },
  });

  if (!ownerRole) {
    ownerRole = roleRepository.create({
      name: 'Organization Owner',
      slug: 'organization-owner',
      description: 'Organization owner with all permissions',
      is_system_role: true,
      is_organization_owner: true,
      is_default: true,
      is_active: true,
      organization_id: null,
      hierarchy_level: 1,
    });
    ownerRole = await roleRepository.save(ownerRole);
    console.log('✓ Seeded role: Organization Owner');

    // Assign all permissions to Organization Owner
    const allPermissions = await permissionRepository.find();
    for (const permission of allPermissions) {
      await rolePermissionRepository.save(
        rolePermissionRepository.create({
          role_id: ownerRole.id,
          permission_id: permission.id,
        }),
      );
    }
    console.log(`✓ Assigned ${allPermissions.length} permissions to Organization Owner`);
  } else {
    console.log('- Organization Owner role already exists');
    // Ensure all permissions are assigned
    const allPermissions = await permissionRepository.find();
    const existingPermissions = await rolePermissionRepository.find({
      where: { role_id: ownerRole.id },
    });
    const existingPermissionIds = new Set(existingPermissions.map((ep) => ep.permission_id));
    let addedCount = 0;
    for (const permission of allPermissions) {
      if (!existingPermissionIds.has(permission.id)) {
        await rolePermissionRepository.save(
          rolePermissionRepository.create({
            role_id: ownerRole.id,
            permission_id: permission.id,
          }),
        );
        addedCount++;
      }
    }
    if (addedCount > 0) {
      console.log(`  → Added ${addedCount} missing permissions to Organization Owner`);
    }
  }

  // Create Admin role (system role)
  let adminRole = await roleRepository.findOne({
    where: { slug: 'admin', is_system_role: true },
  });

  if (!adminRole) {
    adminRole = roleRepository.create({
      name: 'Admin',
      slug: 'admin',
      description: 'Administrator with most permissions except package management',
      is_system_role: true,
      is_organization_owner: false,
      is_default: true,
      is_active: true,
      organization_id: null,
      hierarchy_level: 2,
    });
    adminRole = await roleRepository.save(adminRole);
    console.log('✓ Seeded role: Admin');
  } else {
    console.log('- Admin role already exists, ensuring permissions are assigned...');
  }

  // Create Branch Super Admin role (system role)
  let branchAdminRole = await roleRepository.findOne({
    where: { slug: 'branch-super-admin', is_system_role: true },
  });

  if (!branchAdminRole) {
    branchAdminRole = roleRepository.create({
      name: 'Branch Super Admin',
      slug: 'branch-super-admin',
      description: 'Full administrative access within a specific branch',
      is_system_role: true,
      is_organization_owner: false,
      is_default: true,
      is_active: true,
      organization_id: null,
      hierarchy_level: 2, // Same level as Admin, but intended for branches
    });
    branchAdminRole = await roleRepository.save(branchAdminRole);
    console.log('✓ Seeded role: Branch Super Admin');
  } else {
    console.log('- Branch Super Admin role already exists, ensuring permissions are assigned...');
  }

  // Assign comprehensive permissions to Admin
  const adminPermissions = [
    // User permissions
    'users.view',
    'users.edit',
    'users.delete',
    'users.revoke',
    'users.impersonate',
    // Role permissions
    'roles.view',
    'roles.create',
    'roles.edit',
    'roles.delete',
    'roles.assign',
    // Organization permissions
    'organizations.view',
    'organizations.edit',
    'organizations.settings',
    'organizations.create_branch',
    // Package permissions (view only, no upgrade/purchase)
    'packages.view',
    // Invitation permissions
    'invitations.view',
    'invitations.create',
    'invitations.cancel',
    // MFA permissions
    'mfa.setup',
    'mfa.disable',
    'mfa.backup-codes',
    // Audit permissions
    'audit.view',
    // Chat permissions
    'chat.view',
    'chat.create_group',
    'chat.manage_group',
    'chat.delete',
    'chat.initiate_call',
    // Admin chat permission
    'admin_chat.access',
    // App permissions
    // Note: Only Organization Owner and Admin can purchase/subscribe to apps by default
    // Other roles can be granted these permissions if needed via custom role configuration
    'apps.view',
    'apps.create',
    'apps.edit',
    'apps.delete',
    'apps.subscribe', // Purchase and subscribe to apps
    'apps.manage', // Manage app subscriptions (renew, cancel)
    // Ticket permissions
    'tickets.view',
    'tickets.create',
    'tickets.edit',
    'tickets.delete',
    'tickets.assign',
    'tickets.resolve',
    'tickets.comments',
    // Analytics permissions
    'analytics.view',
    'analytics.export',
    // Billing permissions (view only)
    'billing.view',
    'invoices.view',
    // Notification permissions
    'notifications.view',
    'notifications.manage',
    'notifications.send',
    // Integration permissions
    'integrations.view',
    'integrations.create',
    'integrations.edit',
    'integrations.delete',
    'integrations.api_keys',
    'integrations.webhooks',
    // Data management permissions
    'data.export',
    'data.import',
    'data.delete',
    // Search permissions
    'search.use',
    // Communication permissions
    'communication.email',
    'communication.sms',
    'communication.push',
    'communication.templates',
    // Monitoring permissions
    'monitoring.view',
    // Document permissions
    'documents.view',
    'documents.upload',
    'documents.delete',
    'documents.scan',
    'documents.designs',
    'documents.signatures',
    'documents.logos',
    'documents.templates',
  ];

  await assignPermissions(adminRole.id, adminPermissions, 'Admin');

  // Assign permissions to Branch Super Admin (all except branch creation)
  const branchAdminPermissions = adminPermissions.filter(p =>
    p !== 'organizations.create_branch' &&
    p !== 'packages.subscribe' && // Maybe? User didn't specify packages
    p !== 'billing.view' // Maybe?
  );

  await assignPermissions(branchAdminRole.id, branchAdminPermissions, 'Branch Super Admin');
  // NOTE: I'm currently giving it the same as Admin, I'll refine this if I split create_branch

  // Create Moderator role (system role)
  let moderatorRole = await roleRepository.findOne({
    where: { slug: 'moderator', is_system_role: true },
  });

  if (!moderatorRole) {
    moderatorRole = roleRepository.create({
      name: 'Moderator',
      slug: 'moderator',
      description: 'Moderator with permissions to manage content and users',
      is_system_role: true,
      is_organization_owner: false,
      is_default: false,
      is_active: true,
      organization_id: null,
      hierarchy_level: 3,
    });
    moderatorRole = await roleRepository.save(moderatorRole);
    console.log('✓ Seeded role: Moderator');
  } else {
    console.log('- Moderator role already exists, ensuring permissions are assigned...');
  }

  const moderatorPermissions = [
    'users.view',
    'users.edit',
    'roles.view',
    'roles.assign',
    'organizations.view',
    'packages.view',
    'invitations.view',
    'invitations.create',
    'chat.view',
    'chat.create_group',
    'chat.manage_group',
    'chat.delete',
    'tickets.view',
    'tickets.create',
    'tickets.edit',
    'tickets.assign',
    'tickets.resolve',
    'tickets.comments',
    'analytics.view',
    'notifications.view',
    'notifications.send',
    'search.use',
    'documents.view',
    'documents.upload',
  ];

  await assignPermissions(moderatorRole.id, moderatorPermissions, 'Moderator');

  // Create Support role (system role)
  let supportRole = await roleRepository.findOne({
    where: { slug: 'support', is_system_role: true },
  });

  if (!supportRole) {
    supportRole = roleRepository.create({
      name: 'Support',
      slug: 'support',
      description: 'Support staff with ticket and chat management permissions',
      is_system_role: true,
      is_organization_owner: false,
      is_default: false,
      is_active: true,
      organization_id: null,
      hierarchy_level: 4,
    });
    supportRole = await roleRepository.save(supportRole);
    console.log('✓ Seeded role: Support');
  } else {
    console.log('- Support role already exists, ensuring permissions are assigned...');
  }

  const supportPermissions = [
    'users.view',
    'organizations.view',
    'packages.view',
    'chat.view',
    'chat.create_group',
    'admin_chat.access',
    'tickets.view',
    'tickets.create',
    'tickets.edit',
    'tickets.assign',
    'tickets.resolve',
    'tickets.comments',
    'notifications.view',
    'notifications.send',
    'search.use',
    'documents.view',
  ];

  await assignPermissions(supportRole.id, supportPermissions, 'Support');

  // Create Manager role (system role)
  let managerRole = await roleRepository.findOne({
    where: { slug: 'manager', is_system_role: true },
  });

  if (!managerRole) {
    managerRole = roleRepository.create({
      name: 'Manager',
      slug: 'manager',
      description: 'Manager with team management permissions',
      is_system_role: true,
      is_organization_owner: false,
      is_default: false,
      is_active: true,
      organization_id: null,
      hierarchy_level: 5,
    });
    managerRole = await roleRepository.save(managerRole);
    console.log('✓ Seeded role: Manager');
  } else {
    console.log('- Manager role already exists, ensuring permissions are assigned...');
  }

  const managerPermissions = [
    'users.view',
    'users.edit',
    'roles.view',
    'roles.assign',
    'organizations.view',
    'packages.view',
    'invitations.view',
    'invitations.create',
    'chat.view',
    'chat.create_group',
    'tickets.view',
    'tickets.create',
    'tickets.comments',
    'analytics.view',
    'notifications.view',
    'search.use',
    'documents.view',
    'documents.upload',
  ];

  await assignPermissions(managerRole.id, managerPermissions, 'Manager');

  // Create Employee role (system role)
  let employeeRole = await roleRepository.findOne({
    where: { slug: 'employee', is_system_role: true },
  });

  if (!employeeRole) {
    employeeRole = roleRepository.create({
      name: 'Employee',
      slug: 'employee',
      description: 'Standard employee with basic access',
      is_system_role: true,
      is_organization_owner: false,
      is_default: false,
      is_active: true,
      organization_id: null,
      hierarchy_level: 6,
    });
    employeeRole = await roleRepository.save(employeeRole);
    console.log('✓ Seeded role: Employee');
  } else {
    console.log('- Employee role already exists, ensuring permissions are assigned...');
    // Update existing Employee role to be non-default if it was default
    if (employeeRole.is_default) {
      employeeRole.is_default = false;
      await roleRepository.save(employeeRole);
      console.log('  → Updated Employee role to be non-default (selective)');
    }
  }

  const employeePermissions = [
    'users.view',
    'organizations.view',
    'packages.view',
    'chat.view',
    'tickets.view',
    'tickets.create',
    'tickets.comments',
    'notifications.view',
    'search.use',
    'documents.view',
  ];

  await assignPermissions(employeeRole.id, employeePermissions, 'Employee');

  // Create Viewer role (system role)
  let viewerRole = await roleRepository.findOne({
    where: { slug: 'viewer', is_system_role: true },
  });

  if (!viewerRole) {
    viewerRole = roleRepository.create({
      name: 'Viewer',
      slug: 'viewer',
      description: 'Read-only access to organization information',
      is_system_role: true,
      is_organization_owner: false,
      is_default: false,
      is_active: true,
      organization_id: null,
      hierarchy_level: 7,
    });
    viewerRole = await roleRepository.save(viewerRole);
    console.log('✓ Seeded role: Viewer');
  } else {
    console.log('- Viewer role already exists, ensuring permissions are assigned...');
  }

  const viewerPermissions = [
    'users.view',
    'roles.view',
    'organizations.view',
    'packages.view',
    'chat.view',
    'tickets.view',
    'tickets.create', // Allow viewers to create tickets
    'tickets.comments', // Allow viewers to comment on tickets
    'analytics.view',
    'notifications.view',
    'search.use',
    'documents.view',
  ];

  await assignPermissions(viewerRole.id, viewerPermissions, 'Viewer');

  console.log('✓ All system roles seeded successfully');
}
