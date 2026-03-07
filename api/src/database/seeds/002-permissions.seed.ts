import { DataSource } from 'typeorm';
import { Permission } from '../entities/permissions.entity';

export async function seedPermissions(dataSource: DataSource): Promise<void> {
  const permissionRepository = dataSource.getRepository(Permission);

  const permissions = [
    // User permissions
    {
      name: 'View Users',
      slug: 'users.view',
      category: 'users',
      description: 'View organization users',
    },
    {
      name: 'Edit Users',
      slug: 'users.edit',
      category: 'users',
      description: 'Edit user information',
    },
    {
      name: 'Delete Users',
      slug: 'users.delete',
      category: 'users',
      description: 'Delete users from organization',
    },
    {
      name: 'Revoke User Access',
      slug: 'users.revoke',
      category: 'users',
      description: 'Revoke user access and transfer data',
    },
    {
      name: 'Impersonate Users',
      slug: 'users.impersonate',
      category: 'users',
      description: 'Impersonate users with lower roles for support purposes',
    },

    // Role permissions
    {
      name: 'View Roles',
      slug: 'roles.view',
      category: 'roles',
      description: 'View organization roles',
    },
    {
      name: 'Create Roles',
      slug: 'roles.create',
      category: 'roles',
      description: 'Create custom roles',
    },
    { name: 'Edit Roles', slug: 'roles.edit', category: 'roles', description: 'Edit roles' },
    { name: 'Delete Roles', slug: 'roles.delete', category: 'roles', description: 'Delete roles' },
    {
      name: 'Assign Roles',
      slug: 'roles.assign',
      category: 'roles',
      description: 'Assign roles to users',
    },

    // Organization permissions
    {
      name: 'View Organization',
      slug: 'organizations.view',
      category: 'organizations',
      description: 'View organization details and statistics',
    },
    {
      name: 'Edit Organization',
      slug: 'organizations.edit',
      category: 'organizations',
      description: 'Edit organization information',
    },
    {
      name: 'Manage Organization Settings',
      slug: 'organizations.settings',
      category: 'organizations',
      description: 'Manage organization settings including MFA',
    },
    {
      name: 'Create Branches',
      slug: 'organizations.create_branch',
      category: 'organizations',
      description: 'Create child branches for the organization',
    },

    // Package permissions
    {
      name: 'View Packages',
      slug: 'packages.view',
      category: 'packages',
      description: 'View available packages and features',
    },
    {
      name: 'Upgrade Package',
      slug: 'packages.upgrade',
      category: 'packages',
      description: 'Upgrade or downgrade organization package',
    },
    {
      name: 'Purchase Package Features',
      slug: 'packages.features.purchase',
      category: 'packages',
      description: 'Purchase additional package features',
    },
    {
      name: 'Cancel Package Features',
      slug: 'packages.features.cancel',
      category: 'packages',
      description: 'Cancel purchased package features',
    },

    // App permissions
    {
      name: 'View Apps',
      slug: 'apps.view',
      category: 'apps',
      description: 'View available apps in marketplace',
    },
    {
      name: 'Create Apps',
      slug: 'apps.create',
      category: 'apps',
      description: 'Create new apps (Admin only)',
    },
    {
      name: 'Edit Apps',
      slug: 'apps.edit',
      category: 'apps',
      description: 'Edit apps (Admin only)',
    },
    {
      name: 'Delete Apps',
      slug: 'apps.delete',
      category: 'apps',
      description: 'Delete apps (Admin only)',
    },
    {
      name: 'Subscribe to Apps',
      slug: 'apps.subscribe',
      category: 'apps',
      description: 'Purchase and subscribe to apps',
    },
    {
      name: 'Manage App Subscriptions',
      slug: 'apps.manage',
      category: 'apps',
      description: 'Manage organization app subscriptions (renew, cancel)',
    },

    // Invitation permissions
    {
      name: 'View Invitations',
      slug: 'invitations.view',
      category: 'invitations',
      description: 'View organization invitations',
    },
    {
      name: 'Create Invitations',
      slug: 'invitations.create',
      category: 'invitations',
      description: 'Create user invitations',
    },
    {
      name: 'Cancel Invitations',
      slug: 'invitations.cancel',
      category: 'invitations',
      description: 'Cancel pending invitations',
    },

    // MFA/2FA permissions
    {
      name: 'Setup 2FA',
      slug: 'mfa.setup',
      category: 'mfa',
      description: 'Setup two-factor authentication',
    },
    {
      name: 'Disable 2FA',
      slug: 'mfa.disable',
      category: 'mfa',
      description: 'Disable two-factor authentication',
    },
    {
      name: 'View Backup Codes',
      slug: 'mfa.backup-codes',
      category: 'mfa',
      description: 'View 2FA backup codes',
    },

    // Audit permissions
    {
      name: 'View Audit Logs',
      slug: 'audit.view',
      category: 'audit',
      description: 'View organization audit logs',
    },

    // Chat permissions
    {
      name: 'View Chats',
      slug: 'chat.view',
      category: 'chat',
      description: 'View and access chats',
    },
    {
      name: 'Create Group Chats',
      slug: 'chat.create_group',
      category: 'chat',
      description: 'Create new group chats',
    },
    {
      name: 'Manage Group Chats',
      slug: 'chat.manage_group',
      category: 'chat',
      description: 'Manage group chat settings, add/remove members',
    },
    {
      name: 'Delete Chats',
      slug: 'chat.delete',
      category: 'chat',
      description: 'Delete chats and messages',
    },
    {
      name: 'Initiate Calls',
      slug: 'chat.initiate_call',
      category: 'chat',
      description: 'Start audio and video calls',
    },

    // Admin Chat permissions
    {
      name: 'Access Admin Chat',
      slug: 'admin_chat.access',
      category: 'admin_chat',
      description: 'Chat with system administrators',
    },

    // Ticket permissions
    {
      name: 'View Tickets',
      slug: 'tickets.view',
      category: 'tickets',
      description: 'View support tickets',
    },
    {
      name: 'Create Tickets',
      slug: 'tickets.create',
      category: 'tickets',
      description: 'Create new support tickets',
    },
    {
      name: 'Edit Tickets',
      slug: 'tickets.edit',
      category: 'tickets',
      description: 'Edit ticket information',
    },
    {
      name: 'Delete Tickets',
      slug: 'tickets.delete',
      category: 'tickets',
      description: 'Delete tickets',
    },
    {
      name: 'Assign Tickets',
      slug: 'tickets.assign',
      category: 'tickets',
      description: 'Assign tickets to team members',
    },
    {
      name: 'Resolve Tickets',
      slug: 'tickets.resolve',
      category: 'tickets',
      description: 'Resolve and close tickets',
    },
    {
      name: 'Manage Ticket Comments',
      slug: 'tickets.comments',
      category: 'tickets',
      description: 'Add and manage ticket comments',
    },

    // Analytics permissions
    {
      name: 'View Organization Analytics',
      slug: 'analytics.view',
      category: 'analytics',
      description: 'View organization analytics and reports',
    },
    {
      name: 'Export Analytics',
      slug: 'analytics.export',
      category: 'analytics',
      description: 'Export analytics data',
    },

    // Billing permissions
    {
      name: 'View Billing',
      slug: 'billing.view',
      category: 'billing',
      description: 'View billing information and invoices',
    },
    {
      name: 'Manage Billing',
      slug: 'billing.manage',
      category: 'billing',
      description: 'Manage billing settings and payment methods',
    },
    {
      name: 'View Invoices',
      slug: 'invoices.view',
      category: 'billing',
      description: 'View and download invoices',
    },

    // Payment permissions
    {
      name: 'Process Payments',
      slug: 'payments.process',
      category: 'payments',
      description: 'Process payments and transactions',
    },
    {
      name: 'View Payment History',
      slug: 'payments.view',
      category: 'payments',
      description: 'View payment history',
    },
    {
      name: 'Refund Payments',
      slug: 'payments.refund',
      category: 'payments',
      description: 'Process payment refunds',
    },

    // Notification permissions
    {
      name: 'View Notifications',
      slug: 'notifications.view',
      category: 'notifications',
      description: 'View notifications',
    },
    {
      name: 'Manage Notification Preferences',
      slug: 'notifications.manage',
      category: 'notifications',
      description: 'Manage notification preferences',
    },
    {
      name: 'Send Notifications',
      slug: 'notifications.send',
      category: 'notifications',
      description: 'Send notifications to users',
    },

    // Integration permissions
    {
      name: 'View Integrations',
      slug: 'integrations.view',
      category: 'integrations',
      description: 'View organization integrations',
    },
    {
      name: 'Create Integrations',
      slug: 'integrations.create',
      category: 'integrations',
      description: 'Create new integrations',
    },
    {
      name: 'Edit Integrations',
      slug: 'integrations.edit',
      category: 'integrations',
      description: 'Edit integration settings',
    },
    {
      name: 'Delete Integrations',
      slug: 'integrations.delete',
      category: 'integrations',
      description: 'Delete integrations',
    },
    {
      name: 'Manage API Keys',
      slug: 'integrations.api_keys',
      category: 'integrations',
      description: 'Create and manage API keys',
    },
    {
      name: 'Manage Webhooks',
      slug: 'integrations.webhooks',
      category: 'integrations',
      description: 'Create and manage webhooks',
    },

    // Data Management permissions
    {
      name: 'Export Data',
      slug: 'data.export',
      category: 'data',
      description: 'Export organization data',
    },
    {
      name: 'Import Data',
      slug: 'data.import',
      category: 'data',
      description: 'Import data into organization',
    },
    {
      name: 'Delete Data',
      slug: 'data.delete',
      category: 'data',
      description: 'Delete organization data',
    },

    // Search permissions
    {
      name: 'Use Search',
      slug: 'search.use',
      category: 'search',
      description: 'Use organization search functionality',
    },

    // Communication permissions
    {
      name: 'Send Emails',
      slug: 'communication.email',
      category: 'communication',
      description: 'Send emails through the system',
    },
    {
      name: 'Send SMS',
      slug: 'communication.sms',
      category: 'communication',
      description: 'Send SMS messages',
    },
    {
      name: 'Send Push Notifications',
      slug: 'communication.push',
      category: 'communication',
      description: 'Send push notifications',
    },
    {
      name: 'Manage Email Templates',
      slug: 'communication.templates',
      category: 'communication',
      description: 'Manage email templates',
    },

    // Monitoring permissions
    {
      name: 'View Monitoring',
      slug: 'monitoring.view',
      category: 'monitoring',
      description: 'View system monitoring and metrics',
    },

    // Organization Documents permissions
    {
      name: 'View Documents',
      slug: 'documents.view',
      category: 'documents',
      description: 'View organization documents',
    },
    {
      name: 'Upload Documents',
      slug: 'documents.upload',
      category: 'documents',
      description: 'Upload organization documents',
    },
    {
      name: 'Delete Documents',
      slug: 'documents.delete',
      category: 'documents',
      description: 'Delete organization documents',
    },
    {
      name: 'Scan Documents',
      slug: 'documents.scan',
      category: 'documents',
      description: 'Scan documents using OCR (Non-freemium only)',
    },
    {
      name: 'Manage Document Designs',
      slug: 'documents.designs',
      category: 'documents',
      description: 'Manage letterhead and invoice designs (Non-freemium only)',
    },
    {
      name: 'Add Signatures to Documents',
      slug: 'documents.signatures',
      category: 'documents',
      description: 'Add signatures to documents (Non-freemium only)',
    },
    {
      name: 'Add Logos to Documents',
      slug: 'documents.logos',
      category: 'documents',
      description: 'Add logos to documents (Non-freemium only)',
    },
    {
      name: 'Create Document Templates',
      slug: 'documents.templates',
      category: 'documents',
      description: 'Create document templates (Non-freemium only)',
    },
  ];

  for (const permission of permissions) {
    // Check by slug first
    const existingBySlug = await permissionRepository.findOne({
      where: { slug: permission.slug },
    });

    // Also check by name to avoid unique constraint violations
    const existingByName = await permissionRepository.findOne({
      where: { name: permission.name },
    });

    if (!existingBySlug && !existingByName) {
      await permissionRepository.save(permissionRepository.create(permission));
      console.log(`✓ Seeded permission: ${permission.slug}`);
    } else {
      if (existingBySlug) {
        console.log(`- Permission already exists (by slug): ${permission.slug}`);
      }
      if (existingByName) {
        console.log(`- Permission already exists (by name): ${permission.name}`);
      }
    }
  }
}
