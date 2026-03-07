import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In, Between } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { Organization, OrganizationType, OrganizationStatus } from '../database/entities/organizations.entity';
import {
  OrganizationMember,
  OrganizationMemberStatus,
} from '../database/entities/organization_members.entity';
import { User } from '../database/entities/users.entity';
import { Package } from '../database/entities/packages.entity';
import { Role } from '../database/entities/roles.entity';
import { Invitation } from '../database/entities/invitations.entity';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';
import { UpdateOrganizationSettingsDto } from './dto/update-organization-settings.dto';
import { EmailService } from '../common/services/email.service';
import { RedisService } from '../common/services/redis.service';
import { Notification } from '../database/entities/notifications.entity';
import { OrganizationApp, OrganizationAppStatus, OrganizationAppBillingPeriod } from '../database/entities/organization_apps.entity';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { Ticket, TicketStatus } from '../database/entities/tickets.entity';
import { Payment, PaymentStatus } from '../database/entities/payments.entity';
import { AuditLog } from '../database/entities/audit_logs.entity';

@Injectable()
export class OrganizationsService {
  private readonly logger = new Logger(OrganizationsService.name);

  constructor(
    @InjectRepository(Organization)
    private organizationRepository: Repository<Organization>,
    @InjectRepository(OrganizationMember)
    private memberRepository: Repository<OrganizationMember>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Package)
    private packageRepository: Repository<Package>,
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
    @InjectRepository(Role)
    private roleRepository: Repository<Role>,
    @InjectRepository(Invitation)
    private invitationRepository: Repository<Invitation>,
    @InjectRepository(OrganizationApp)
    private organizationAppRepository: Repository<OrganizationApp>,
    @InjectRepository(Ticket)
    private ticketRepository: Repository<Ticket>,
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
    @InjectRepository(AuditLog)
    private auditLogRepository: Repository<AuditLog>,
    private emailService: EmailService,
    private redisService: RedisService,
    private auditLogsService: AuditLogsService,
    private dataSource: DataSource,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) { }

  private async getActiveMembership(
    userId: string,
    organizationId: string,
    relations: string[] = [],
  ): Promise<OrganizationMember> {
    const membership = await this.memberRepository.findOne({
      where: {
        user_id: userId,
        organization_id: organizationId,
        status: OrganizationMemberStatus.ACTIVE,
      },
      relations,
    });

    if (!membership) {
      throw new ForbiddenException('You are not an active member of this organization');
    }

    return membership;
  }

  async getCurrentOrganization(
    userId: string,
    organizationId: string,
  ): Promise<Organization & { current_user_role?: any }> {
    const membership = await this.getActiveMembership(userId, organizationId, [
      'organization',
      'organization.package',
      'organization.parent',
      'organization.parent.package',
      'role',
      'role.role_permissions',
      'role.role_permissions.permission',
    ]);

    const organization = membership.organization as any;
    organization.branch_limit = organization.branch_limit || organization.package?.base_branch_limit || 1;
    organization.current_user_role = {
      role_id: membership.role_id,
      role_name: membership.role.name,
      is_organization_owner: membership.role.is_organization_owner,
      permissions: membership.role.role_permissions?.map(rp => rp.permission.slug) || [],
    };

    return organization;
  }

  async getUserOrganizations(userId: string): Promise<Organization[]> {
    const memberships = await this.memberRepository.find({
      where: {
        user_id: userId,
        status: OrganizationMemberStatus.ACTIVE,
      },
      relations: ['organization', 'organization.package', 'role'],
      order: {
        joined_at: 'DESC',
      },
    });

    return memberships.map((membership) => membership.organization);
  }

  async updateOrganization(
    userId: string,
    organizationId: string,
    dto: UpdateOrganizationDto,
  ): Promise<Organization> {
    // 1. Verify user is organization owner or has edit permissions
    const membership = await this.getActiveMembership(userId, organizationId, [
      'role',
      'role.role_permissions',
      'role.role_permissions.permission',
      'organization',
      'organization.package'
    ]);

    const permissions = membership.role.role_permissions?.map(rp => rp.permission.slug) || [];

    if (!membership.role.is_organization_owner && !permissions.includes('organizations.edit')) {
      throw new ForbiddenException('Insufficient permissions to update organization');
    }

    const organization = membership.organization;

    // Check if name or email is being changed and if it's unique
    if (dto.name && dto.name !== organization.name) {
      const existing = await this.organizationRepository.findOne({
        where: { name: dto.name },
      });
      if (existing) {
        throw new ConflictException('Organization name already exists');
      }
      // Update slug when name changes (only for non-Freemium packages)
      const packageSlug = organization.package?.slug;
      if (packageSlug && packageSlug !== 'freemium') {
        organization.slug = this.generateSlug(dto.name);
      }
    }

    if (dto.email && dto.email !== organization.email) {
      const existing = await this.organizationRepository.findOne({
        where: { email: dto.email },
      });
      if (existing) {
        throw new ConflictException('Organization email already exists');
      }
    }

    // Store old values for audit log
    const oldValues = {
      name: organization.name,
      email: organization.email,
      description: organization.description,
      phone: organization.phone,
      address: organization.address,
    };

    // Update organization
    Object.assign(organization, dto);
    await this.organizationRepository.save(organization);

    // Create audit log
    await this.auditLogsService.createAuditLog(
      organizationId,
      userId,
      'organization.update',
      'organization',
      organizationId,
      oldValues,
      {
        name: organization.name,
        email: organization.email,
        description: organization.description,
        phone: organization.phone,
        address: organization.address,
      },
    );

    return organization;
  }

  async updateOrganizationSettings(
    userId: string,
    organizationId: string,
    dto: UpdateOrganizationSettingsDto,
  ): Promise<Organization & { requires_mfa_setup?: boolean; temp_setup_token?: string }> {
    // 1. Verify user is organization owner
    const membership = await this.getActiveMembership(userId, organizationId, ['role', 'organization']);

    if (!membership.role.is_organization_owner) {
      throw new ForbiddenException('Only organization owner can update organization settings');
    }

    const organization = membership.organization;

    // Get current user
    const currentUser = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!currentUser) {
      throw new NotFoundException('User not found');
    }

    // Get all active members for notifications
    const activeMembers = await this.memberRepository.find({
      where: {
        organization_id: organizationId,
        status: OrganizationMemberStatus.ACTIVE,
      },
      relations: ['user'],
    });

    let tempSetupToken: string | undefined;
    let requiresMfaSetup = false;

    // If enabling MFA, notify all users and check if current user needs setup
    if (dto.mfa_enabled !== undefined && dto.mfa_enabled !== organization.mfa_enabled) {
      organization.mfa_enabled = dto.mfa_enabled;

      if (dto.mfa_enabled) {
        // Check if current user needs MFA setup
        if (!currentUser.mfa_enabled || !currentUser.mfa_setup_completed_at) {
          // Generate temporary token for MFA setup
          tempSetupToken = crypto.randomUUID();
          const expiresAt = Date.now() + 30 * 60 * 1000;
          const tempSetupTokenData = {
            user_id: currentUser.id,
            organization_id: organizationId,
            email: currentUser.email,
            role_id: membership.role_id,
            expires_at: expiresAt,
          };

          // Store in Redis for 30 minutes
          await this.redisService.set(
            `mfa:setup:temp:${tempSetupToken}`,
            JSON.stringify(tempSetupTokenData),
            1800,
          );

          requiresMfaSetup = true;
        }

        // Notify all organization members
        for (const member of activeMembers) {
          const notification = this.notificationRepository.create({
            user_id: member.user_id,
            organization_id: organizationId,
            type: 'mfa_enabled',
            title: '2FA/MFA Enabled',
            message: `2FA/MFA has been enabled for ${organization.name}. You will need to set up 2FA on your next login.`,
            data: {
              organization_id: organizationId,
              organization_name: organization.name,
            },
          });

          await this.notificationRepository.save(notification);

          if (member.user && member.user.email) {
            await this.emailService.sendMfaEnabledEmail(
              member.user.email,
              member.user.first_name,
              organization.name,
            );
          }
        }
      }
    }

    // Store old MFA status for audit log
    const oldMfaEnabled = organization.mfa_enabled;

    await this.organizationRepository.save(organization);

    // Create audit log for MFA status change
    if (dto.mfa_enabled !== undefined && dto.mfa_enabled !== oldMfaEnabled) {
      await this.auditLogsService.createAuditLog(
        organizationId,
        userId,
        dto.mfa_enabled ? 'mfa.enable' : 'mfa.disable',
        'organization',
        organizationId,
        { mfa_enabled: oldMfaEnabled },
        { mfa_enabled: dto.mfa_enabled },
      );
    }

    // Create audit log for other settings updates
    if (Object.keys(dto).some((key) => key !== 'mfa_enabled')) {
      await this.auditLogsService.createAuditLog(
        organizationId,
        userId,
        'organization.settings.update',
        'organization',
        organizationId,
        null,
        dto,
      );
    }

    const result: Organization & { requires_mfa_setup?: boolean; temp_setup_token?: string } = organization;
    if (requiresMfaSetup && tempSetupToken) {
      result.requires_mfa_setup = true;
      result.temp_setup_token = tempSetupToken;
    }

    return result;
  }

  async getOrganizationStatistics(
    userId: string,
    organizationId: string,
    accessibleOrganizationIds?: string[],
  ): Promise<any> {
    await this.getActiveMembership(userId, organizationId);

    const organization = await this.organizationRepository.findOne({
      where: { id: organizationId },
      relations: ['package'],
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    // Get active user count
    const activeUsersCount = await this.memberRepository.count({
      where: {
        organization_id: organizationId,
        status: OrganizationMemberStatus.ACTIVE,
      },
    });

    // Get pending invitations count
    const pendingInvitationsCount = await this.invitationRepository
      .createQueryBuilder('invitation')
      .where('invitation.organization_id = :orgId', { orgId: organizationId })
      .andWhere('invitation.status = :status', { status: 'pending' })
      .andWhere('invitation.expires_at > :now', { now: new Date() })
      .getCount();

    // For freemium package, only count default roles (excluding branch-super-admin)
    if (organization.package.slug === 'freemium') {
      const count = await this.roleRepository
        .createQueryBuilder('role')
        .where('role.organization_id IS NULL')
        .andWhere('role.is_default = :isDefault', { isDefault: true })
        .andWhere('role.is_active = :isActive', { isActive: true })
        .andWhere('role.deleted_at IS NULL')
        .andWhere('role.slug != :branchRole', { branchRole: 'branch-super-admin' })
        .getCount();

      // Get additional metrics for freemium
      const openTicketsCount = await this.ticketRepository.count({
        where: {
          organization_id: organizationId,
          status: In([TicketStatus.OPEN, TicketStatus.IN_PROGRESS]),
        },
      });

      const payments = await this.paymentRepository.find({
        where: {
          organization_id: organizationId,
          status: PaymentStatus.COMPLETED,
        },
        select: ['amount'],
      });
      const totalSpend = payments.reduce((sum, p) => sum + Number(p.amount), 0);

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);

      const actionsTodayCount = await this.auditLogRepository.count({
        where: {
          organization_id: organizationId,
          created_at: Between(todayStart, todayEnd),
        },
      });

      return {
        total_users: activeUsersCount,
        user_limit: organization.package.base_user_limit,
        user_usage_percentage: Math.round((activeUsersCount / organization.package.base_user_limit) * 100),
        total_roles: count,
        role_limit: organization.package.base_role_limit,
        role_usage_percentage: Math.round((count / organization.package.base_role_limit) * 100),
        open_tickets: openTicketsCount,
        total_spend: totalSpend,
        actions_today: actionsTodayCount,
      };
    }

    // Get organization-specific roles count
    const orgRolesCount = await this.roleRepository
      .createQueryBuilder('role')
      .where('role.organization_id = :orgId', { orgId: organizationId })
      .andWhere('role.is_active = :isActive', { isActive: true })
      .andWhere('role.deleted_at IS NULL')
      .getCount();

    // Get default/system roles count (always available to all organizations)
    let defaultRolesQuery = this.roleRepository
      .createQueryBuilder('role')
      .where('role.organization_id IS NULL')
      .andWhere('role.is_default = :isDefault', { isDefault: true })
      .andWhere('role.is_active = :isActive', { isActive: true })
      .andWhere('role.deleted_at IS NULL');

    // Filter out branch-specific roles for MAIN organizations
    if (organization.org_type === OrganizationType.MAIN) {
      defaultRolesQuery = defaultRolesQuery.andWhere('role.slug != :branchRole', { branchRole: 'branch-super-admin' });
    }

    const defaultRolesCount = await defaultRolesQuery.getCount();

    const totalRolesCount = orgRolesCount + defaultRolesCount;

    const totalRoleLimit = organization.package.base_role_limit + (organization.package.additional_role_limit || 0);

    // Get additional metrics
    const orgIds = accessibleOrganizationIds && accessibleOrganizationIds.length > 0
      ? accessibleOrganizationIds
      : [organizationId];

    // Total distinct active users across all accessible organizations (Main + Branches)
    const totalUsersResult = await this.memberRepository
      .createQueryBuilder('member')
      .select('COUNT(DISTINCT member.user_id)', 'count')
      .where('member.organization_id IN (:...orgIds)', { orgIds })
      .andWhere('member.status = :status', { status: OrganizationMemberStatus.ACTIVE })
      .getRawOne();

    const totalUsersCount = parseInt(totalUsersResult?.count || '0', 10);

    const openTicketsCount = await this.ticketRepository.count({
      where: {
        organization_id: organizationId,
        status: In([TicketStatus.OPEN, TicketStatus.IN_PROGRESS]),
      },
    });

    const payments = await this.paymentRepository.find({
      where: {
        organization_id: organizationId,
        status: PaymentStatus.COMPLETED,
      },
      select: ['amount'],
    });
    const totalSpend = payments.reduce((sum, p) => sum + Number(p.amount), 0);

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const actionsTodayCount = await this.auditLogRepository.count({
      where: {
        organization_id: organizationId,
        created_at: Between(todayStart, todayEnd),
      },
    });

    const isBranch = organization.org_type === OrganizationType.BRANCH;

    return {
      total_users: totalUsersCount,
      branch_users: activeUsersCount, // Users in current organization
      user_limit: organization.user_limit || organization.package.base_user_limit,
      user_usage_percentage: Math.round((totalUsersCount / (organization.user_limit || organization.package.base_user_limit)) * 100),
      total_roles: isBranch ? 0 : totalRolesCount,
      role_limit: isBranch ? 0 : totalRoleLimit,
      role_usage_percentage: isBranch ? 0 : Math.round((totalRolesCount / totalRoleLimit) * 100),
      open_tickets: openTicketsCount,
      total_spend: isBranch ? 0 : totalSpend,
      actions_today: actionsTodayCount,
    };
  }

  async switchOrganization(
    userId: string,
    organizationId: string,
  ): Promise<{
    message: string;
    access_token: string;
    refresh_token: string;
    user: {
      id: string;
      email: string;
      first_name: string;
      last_name: string;
      avatar_url: string | null;
    };
    organization: {
      id: string;
      name: string;
      slug: string;
    };
  }> {
    const membership = await this.getActiveMembership(userId, organizationId, [
      'organization',
      'organization.package',
      'role',
      'user',
    ]);

    const user = membership.user;
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const payload = {
      sub: user.id,
      email: user.email,
      organization_id: organizationId,
      role_id: membership.role_id,
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get<string>('JWT_EXPIRES_IN', '15m'),
    });

    const refreshToken = this.jwtService.sign(
      { sub: user.id },
      {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '7d'),
      },
    );

    return {
      message: 'Organization switched successfully',
      access_token: accessToken,
      refresh_token: refreshToken,
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        avatar_url: user.avatar_url,
      },
      organization: {
        id: membership.organization.id,
        name: membership.organization.name,
        slug: membership.organization.slug,
      },
    };
  }

  async updateOrganizationSlug(
    userId: string,
    organizationId: string,
    slug: string,
  ): Promise<Organization> {
    const membership = await this.getActiveMembership(userId, organizationId, [
      'role',
      'organization',
      'organization.package',
    ]);

    if (!membership.role.is_organization_owner) {
      throw new ForbiddenException('Only organization owner can update organization slug');
    }

    const organization = membership.organization;

    const packageSlug = organization.package?.slug;
    if (packageSlug === 'freemium') {
      throw new ForbiddenException(
        'Slug cannot be changed for Freemium package. Please upgrade to Basic, Platinum, or Diamond package to change your organization slug.',
      );
    }

    if (!['basic', 'platinum', 'diamond'].includes(packageSlug || '')) {
      throw new ForbiddenException(
        'Slug can only be changed for Basic, Platinum, or Diamond packages.',
      );
    }

    const normalizedSlug = slug.toLowerCase().trim().replace(/[^a-z0-9-]+/g, '-').replace(/(^-|-$)/g, '');

    if (normalizedSlug.length < 3 || normalizedSlug.length > 50) {
      throw new ConflictException('Slug must be between 3 and 50 characters');
    }

    if (normalizedSlug !== organization.slug) {
      const existing = await this.organizationRepository.findOne({
        where: { slug: normalizedSlug },
      });
      if (existing) {
        throw new ConflictException('This slug is already taken. Please choose a different one.');
      }
    }

    const oldSlug = organization.slug;
    organization.slug = normalizedSlug;
    await this.organizationRepository.save(organization);

    await this.auditLogsService.createAuditLog(
      organizationId,
      userId,
      'organization.slug_updated',
      'organization',
      organizationId,
      { slug: oldSlug },
      { slug: normalizedSlug },
    );

    return organization;
  }

  async createBranch(
    userId: string,
    parentId: string,
    dto: CreateBranchDto,
  ): Promise<Organization> {
    try {
      this.logger.debug(`Creating branch for parent ${parentId} by user ${userId} with name ${dto.name}`);

      if (dto.name.toLowerCase() === 'main branch') {
        throw new BadRequestException('The name "Main Branch" is reserved for the primary organization account.');
      }

      const parentOrg = await this.organizationRepository.findOne({
        where: { id: parentId },
        relations: ['package'],
      });

      if (!parentOrg) {
        throw new NotFoundException('Parent organization not found');
      }

      // 1. Check Branch Limit
      const currentBranchCount = await this.organizationRepository.count({
        where: { parent_id: parentId, status: OrganizationStatus.ACTIVE },
      });
      const branchLimit = parentOrg.package?.base_branch_limit || 1;

      if (currentBranchCount >= branchLimit) {
        throw new BadRequestException(
          `Branch limit reached (${branchLimit}). Please upgrade your package to create more branches.`,
        );
      }

      // 2. Check User Limit (Distinct across group)
      const rootOrgId = parentOrg.org_type === OrganizationType.MAIN ? parentOrg.id : parentOrg.parent_id;
      const orgGroup = await this.organizationRepository.find({
        where: [{ id: rootOrgId }, { parent_id: rootOrgId }],
        select: ['id'],
      });
      const groupIds = orgGroup.map(o => o.id);

      const distinctUsersResult = await this.memberRepository
        .createQueryBuilder('member')
        .select('COUNT(DISTINCT member.user_id)', 'count')
        .where('member.organization_id IN (:...groupIds)', { groupIds })
        .andWhere('member.status = :status', { status: OrganizationMemberStatus.ACTIVE })
        .getRawOne();

      const currentDistinctCount = parseInt(distinctUsersResult?.count || '0', 10);
      const userLimit = parentOrg.user_limit || parentOrg.package?.base_user_limit || 0;

      if (currentDistinctCount >= userLimit) {
        // Technically creating a branch with the current user doesn't add a NEW user,
        // but the user's request suggests blocking "creation as organization" if quota is hit.
        throw new BadRequestException(
          `Organization user quota reached (${userLimit}). Please upgrade your package before expanding your organization structure.`,
        );
      }

      if (parentOrg.org_type !== OrganizationType.MAIN) {
        throw new ForbiddenException('Only a Main Organization can have branches');
      }

      const membership = await this.getActiveMembership(userId, parentId, [
        'role',
        'role.role_permissions',
        'role.role_permissions.permission',
      ]);

      const permissions = membership.role.role_permissions?.map((rp) => rp.permission.slug) || [];
      if (!membership.role.is_organization_owner && !permissions.includes('organizations.create_branch')) {
        throw new ForbiddenException('You do not have permission to create branches');
      }

      // Enforce branch limit (MAIN org counts as 1)
      const currentBranches = await this.organizationRepository.count({
        where: { parent_id: parentId, org_type: OrganizationType.BRANCH },
      });

      const totalBranches = currentBranches + 1; // +1 for the MAIN organization

      // Safety fallback: If current branch_limit is 1 but package allows more, use package limit
      let effectiveLimit = parentOrg.branch_limit;
      if (effectiveLimit === 1 && parentOrg.package && parentOrg.package.base_branch_limit > 1) {
        effectiveLimit = parentOrg.package.base_branch_limit;
      }

      if (totalBranches >= effectiveLimit) {
        throw new ForbiddenException(
          `Branch limit reached for your package (${effectiveLimit}). ` +
          `Your package (${parentOrg.package?.name || 'Current'}) allows up to ${effectiveLimit} total organization${effectiveLimit > 1 ? 's' : ''} (including main branch). ` +
          `Please upgrade your package to create more branches.`
        );
      }

      const branchSlug = this.generateSlug(`${parentOrg.name}-${dto.name}`);

      const existing = await this.organizationRepository.findOne({ where: { slug: branchSlug } });
      if (existing) {
        throw new ConflictException('A branch or organization with this name already exists');
      }

      const branch = this.organizationRepository.create({
        ...dto,
        slug: branchSlug,
        email: dto.email || parentOrg.email,
        parent_id: parentId,
        org_type: OrganizationType.BRANCH,
        status: OrganizationStatus.ACTIVE,
        package_id: parentOrg.package_id,
        package_expires_at: parentOrg.package_expires_at,
        email_verified: true,
        user_limit: parentOrg.user_limit,
        role_limit: parentOrg.role_limit,
        timezone: dto.timezone || parentOrg.timezone,
        currency: dto.currency || parentOrg.currency,
        language: dto.language || parentOrg.language,
      });

      const savedBranch = await this.organizationRepository.save(branch);

      // If app_ids were provided, grant access to those apps for this branch
      if (dto.app_ids && dto.app_ids.length > 0) {
        for (const appId of dto.app_ids) {
          // Check if parent has access to this app
          const parentApp = await this.organizationAppRepository.findOne({
            where: { organization_id: parentId, app_id: appId, status: OrganizationAppStatus.ACTIVE },
          });

          if (parentApp) {
            const branchApp = this.organizationAppRepository.create({
              organization_id: savedBranch.id,
              app_id: appId,
              status: OrganizationAppStatus.ACTIVE,
              subscription_start: new Date(),
              subscription_end: parentApp.subscription_end,
              subscription_price: 0, // Branch apps are covered by parent
              billing_period: parentApp.billing_period,
              auto_renew: false,
            });
            await this.organizationAppRepository.save(branchApp);
          }
        }
      }

      const branchMembership = this.memberRepository.create({
        user_id: userId,
        organization_id: savedBranch.id,
        role_id: membership.role_id,
        status: OrganizationMemberStatus.ACTIVE,
        joined_at: new Date(),
      });

      await this.memberRepository.save(branchMembership);

      await this.auditLogsService.createAuditLog(
        parentId,
        userId,
        'branch.create',
        'organization',
        savedBranch.id,
        null,
        { name: savedBranch.name, slug: savedBranch.slug },
      );

      return savedBranch;
    } catch (error: any) {
      this.logger.error(`Error creating branch: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getBranches(userId: string, targetId: string): Promise<Organization[]> {
    try {
      // Get the current organization to check if it's a branch
      const currentOrg = await this.organizationRepository.findOne({
        where: { id: targetId, status: OrganizationStatus.ACTIVE },
        relations: ['parent'],
      });

      if (!currentOrg) {
        throw new NotFoundException('Organization not found');
      }

      // If it's a branch, we want to fetch branches for its parent
      const parentRepoId = currentOrg.org_type === OrganizationType.BRANCH && currentOrg.parent_id
        ? currentOrg.parent_id
        : targetId;

      // Verify membership in the root organization (parent or current)
      await this.getActiveMembership(userId, parentRepoId);

      const branches = await this.organizationRepository.find({
        where: {
          parent_id: parentRepoId,
          status: OrganizationStatus.ACTIVE,
        },
        order: { created_at: 'DESC' },
      });

      // Fetch the parent organization to include it as the "Main Branch"
      const rootOrg = await this.organizationRepository.findOne({
        where: { id: parentRepoId, status: OrganizationStatus.ACTIVE },
      });

      if (rootOrg && rootOrg.org_type === OrganizationType.MAIN) {
        // Return a copy with Name set to "Main Branch" for display
        const mainBranch = { ...rootOrg, name: 'Main Branch' } as Organization;
        return [mainBranch, ...branches];
      }

      return branches;
    } catch (error: any) {
      this.logger.error(`Error in getBranches: ${error.message}`, error.stack);
      throw error;
    }
  }

  async deleteBranch(userId: string, parentId: string, branchId: string): Promise<void> {
    try {
      const membership = await this.getActiveMembership(userId, parentId, [
        'role',
        'role.role_permissions',
        'role.role_permissions.permission',
      ]);

      const permissions = membership.role.role_permissions?.map((rp) => rp.permission.slug) || [];

      if (!membership.role.is_organization_owner && !permissions.includes('organizations.delete_branch')) {
        throw new ForbiddenException('You do not have permission to delete branches');
      }

      const branch = await this.organizationRepository.findOne({
        where: { id: branchId, parent_id: parentId, org_type: OrganizationType.BRANCH },
      });

      if (!branch) {
        throw new NotFoundException('Branch not found or belongs to another organization');
      }

      await this.organizationRepository.remove(branch);

      await this.auditLogsService.createAuditLog(
        parentId,
        userId,
        'branch.delete',
        'organization',
        branchId,
        { name: branch.name, slug: branch.slug },
        null,
      );
    } catch (error: any) {
      this.logger.error(`Error in deleteBranch: ${error.message}`, error.stack);
      throw error;
    }
  }

  async updateBranch(
    userId: string,
    parentId: string,
    branchId: string,
    dto: UpdateBranchDto,
  ): Promise<Organization> {
    try {
      this.logger.debug(`Updating branch ${branchId} for parent ${parentId} by user ${userId}`);

      const membership = await this.getActiveMembership(userId, parentId, [
        'role',
        'role.role_permissions',
        'role.role_permissions.permission',
      ]);

      const permissions = membership.role.role_permissions?.map((rp) => rp.permission.slug) || [];
      if (!membership.role.is_organization_owner && !permissions.includes('organizations.edit')) {
        throw new ForbiddenException('You do not have permission to update branches');
      }

      const branch = await this.organizationRepository.findOne({
        where: { id: branchId, parent_id: parentId, org_type: OrganizationType.BRANCH },
      });

      if (!branch) {
        throw new NotFoundException('Branch not found or belongs to another organization');
      }

      const { app_ids, ...updateData } = dto;

      // Update basic details
      Object.assign(branch, updateData);

      // If name changed, update slug
      if (updateData.name && updateData.name !== branch.name) {
        branch.slug = this.generateSlug(`${branch.name}-${updateData.name}`);
      }

      const savedBranch = await this.organizationRepository.save(branch);

      // Update app access if provided
      if (app_ids) {
        // Remove existing branch apps
        await this.organizationAppRepository.delete({ organization_id: branchId });

        // Add new app access
        for (const appId of app_ids) {
          const parentApp = await this.organizationAppRepository.findOne({
            where: { organization_id: parentId, app_id: appId, status: OrganizationAppStatus.ACTIVE },
          });

          if (parentApp) {
            const branchApp = this.organizationAppRepository.create({
              organization_id: savedBranch.id,
              app_id: appId,
              status: OrganizationAppStatus.ACTIVE,
              subscription_start: new Date(),
              subscription_end: parentApp.subscription_end,
              subscription_price: 0,
              billing_period: parentApp.billing_period,
              auto_renew: false,
            });
            await this.organizationAppRepository.save(branchApp);
          }
        }
      }

      await this.auditLogsService.createAuditLog(
        parentId,
        userId,
        'branch.update',
        'organization',
        branchId,
        null,
        dto,
      );

      return savedBranch;
    } catch (error: any) {
      this.logger.error(`Error updating branch: ${error.message}`, error.stack);
      throw error;
    }
  }

  async updateIpWhitelist(orgId: string, userId: string, ips: string[]): Promise<Organization> {
    await this.getActiveMembership(userId, orgId, ['role']);

    // Validate IPv4/IPv6 format
    const ipv4 = /^(\d{1,3}\.){3}\d{1,3}$/;
    const ipv6 = /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/;
    for (const ip of ips) {
      if (!ipv4.test(ip) && !ipv6.test(ip)) {
        throw new BadRequestException(`Invalid IP address format: ${ip}`);
      }
    }

    await this.organizationRepository.update({ id: orgId }, { ip_whitelist: ips.length > 0 ? ips : null });
    const updated = await this.organizationRepository.findOne({ where: { id: orgId } });
    if (!updated) throw new NotFoundException('Organization not found');
    return updated;
  }

  async updateTaxInfo(orgId: string, userId: string, dto: { pan_number?: string; vat_number?: string }): Promise<Organization> {
    await this.getActiveMembership(userId, orgId, ['role']);

    if (dto.pan_number !== undefined && dto.pan_number !== null && dto.pan_number !== '') {
      if (!/^\d{9}$/.test(dto.pan_number)) {
        throw new BadRequestException('PAN number must be exactly 9 digits');
      }
    }
    if (dto.vat_number !== undefined && dto.vat_number !== null && dto.vat_number !== '') {
      if (!/^\d{9}$/.test(dto.vat_number)) {
        throw new BadRequestException('VAT number must be exactly 9 digits');
      }
    }

    const updateData: any = {};
    if (dto.pan_number !== undefined) updateData.pan_number = dto.pan_number || null;
    if (dto.vat_number !== undefined) updateData.vat_number = dto.vat_number || null;

    await this.organizationRepository.update({ id: orgId }, updateData);
    const updated = await this.organizationRepository.findOne({ where: { id: orgId } });
    if (!updated) throw new NotFoundException('Organization not found');
    return updated;
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
}
