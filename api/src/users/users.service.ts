import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { User, UserStatus } from '../database/entities/users.entity';
import { Organization } from '../database/entities/organizations.entity';
import {
  OrganizationMember,
  OrganizationMemberStatus,
} from '../database/entities/organization_members.entity';
import { Role } from '../database/entities/roles.entity';
import { Permission } from '../database/entities/permissions.entity';
import { Session } from '../database/entities/sessions.entity';
import { AuditLog } from '../database/entities/audit_logs.entity';
import { Notification } from '../database/entities/notifications.entity';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateUserAdminDto } from './dto/update-user-admin.dto';
import { UserQueryDto } from './dto/user-query.dto';
import { RevokeAccessDto } from './dto/revoke-access.dto';
import { EmailService } from '../common/services/email.service';
import {
  NotificationHelperService,
  NotificationType,
} from '../notifications/notification-helper.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationPreferenceScope } from '../database/entities/notification_preferences.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(OrganizationMember)
    private memberRepository: Repository<OrganizationMember>,
    @InjectRepository(Organization)
    private organizationRepository: Repository<Organization>,
    @InjectRepository(Role)
    private roleRepository: Repository<Role>,
    @InjectRepository(Permission)
    private permissionRepository: Repository<Permission>,
    @InjectRepository(Session)
    private sessionRepository: Repository<Session>,
    @InjectRepository(AuditLog)
    private auditLogRepository: Repository<AuditLog>,
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
    private emailService: EmailService,
    private notificationHelper: NotificationHelperService,
    private notificationsService: NotificationsService,
    private dataSource: DataSource,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) { }

  async getCurrentUser(
    userId: string,
    organizationId: string | null,
  ): Promise<User & { role?: any; permissions?: string[] }> {
    // Get the user
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // If organizationId is null (system admin), return user without organization context
    if (!organizationId) {
      if (!user.is_system_admin) {
        throw new ForbiddenException('Organization context required');
      }

      // For system admin, return user with all permissions (they have system admin permissions)
      const allPermissions = await this.permissionRepository.find({
        select: ['slug'],
      });
      const permissions = allPermissions.map((p) => p.slug);

      return {
        ...user,
        fullName: `${user.first_name} ${user.last_name}`,
        role: null, // System admins don't have organization roles
        permissions,
      };
    }

    // Verify user is member of organization
    const membership = await this.memberRepository.findOne({
      where: {
        user_id: userId,
        organization_id: organizationId,
        status: OrganizationMemberStatus.ACTIVE,
      },
      relations: ['user', 'role', 'role.role_permissions', 'role.role_permissions.permission'],
    });

    if (!membership) {
      throw new ForbiddenException('You are not a member of this organization');
    }

    // Get permissions for the user's role
    let permissions: string[] = [];
    if (membership.role) {
      if (membership.role.is_organization_owner) {
        // Organization owners have all permissions
        const allPermissions = await this.permissionRepository.find({
          select: ['slug'],
        });
        permissions = allPermissions.map((p) => p.slug);
      } else {
        // Get permissions from role
        const roleWithPermissions = await this.roleRepository.findOne({
          where: { id: membership.role_id },
          relations: ['role_permissions', 'role_permissions.permission'],
        });

        if (roleWithPermissions?.role_permissions) {
          permissions = roleWithPermissions.role_permissions
            .map((rp) => rp.permission.slug)
            .filter(Boolean);
        }
      }
    }

    return {
      ...membership.user,
      fullName: `${membership.user.first_name} ${membership.user.last_name}`,
      role: membership.role,
      permissions,
    };
  }

  async updateCurrentUser(
    userId: string,
    organizationId: string | null,
    dto: UpdateUserDto,
  ): Promise<User> {
    // If organizationId is null (system admin), update user directly without organization membership check
    if (!organizationId) {
      const user = await this.userRepository.findOne({
        where: { id: userId },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      if (!user.is_system_admin) {
        throw new ForbiddenException('Organization context required');
      }

      // Update user fields
      if (dto.first_name !== undefined) user.first_name = dto.first_name;
      if (dto.last_name !== undefined) user.last_name = dto.last_name;
      if (dto.phone !== undefined) user.phone = dto.phone;
      if (dto.avatar_url !== undefined) user.avatar_url = dto.avatar_url;

      return await this.userRepository.save(user);
    }
    // Verify user is member of organization
    const membership = await this.memberRepository.findOne({
      where: {
        user_id: userId,
        organization_id: organizationId,
        status: OrganizationMemberStatus.ACTIVE,
      },
    });

    if (!membership) {
      throw new ForbiddenException('You are not a member of this organization');
    }

    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Update user
    Object.assign(user, dto);
    await this.userRepository.save(user);

    return user;
  }

  async changePassword(
    userId: string,
    organizationId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<User> {
    // Verify user is member of organization
    const membership = await this.memberRepository.findOne({
      where: {
        user_id: userId,
        organization_id: organizationId,
        status: OrganizationMemberStatus.ACTIVE,
      },
    });

    if (!membership) {
      throw new ForbiddenException('You are not a member of this organization');
    }

    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Verify current password
    if (!user.password_hash || !(await bcrypt.compare(currentPassword, user.password_hash))) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password_hash = hashedPassword;

    await this.userRepository.save(user);

    return user;
  }

  async getOrganizationUsers(
    userId: string,
    organizationId: string,
    query: UserQueryDto,
    accessibleOrganizationIds?: string[],
  ): Promise<{
    users: User[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    // Verify user is member of organization
    const membership = await this.memberRepository.findOne({
      where: {
        user_id: userId,
        organization_id: organizationId,
        status: OrganizationMemberStatus.ACTIVE,
      },
      relations: ['role'],
    });

    if (!membership) {
      throw new ForbiddenException('You are not a member of this organization');
    }

    // Check permission (users.view)
    if (membership.role.is_organization_owner) {
      // Organization owner has all permissions
    } else {
      // Load role with permissions
      const roleWithPermissions = await this.roleRepository.findOne({
        where: { id: membership.role_id },
        relations: ['role_permissions', 'role_permissions.permission'],
      });

      const hasPermission = roleWithPermissions?.role_permissions?.some(
        (rp) => rp.permission.slug === 'users.view',
      );

      if (!hasPermission) {
        throw new ForbiddenException('You do not have permission to view users');
      }
    }

    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    let orgIds = accessibleOrganizationIds && accessibleOrganizationIds.length > 0
      ? accessibleOrganizationIds
      : [organizationId];

    // Filter by scope if requested
    if (query.scope === 'master') {
      orgIds = [organizationId];
    }

    // Build query
    const queryBuilder = this.memberRepository
      .createQueryBuilder('member')
      .leftJoinAndSelect('member.user', 'user')
      .leftJoinAndSelect('member.role', 'role')
      .leftJoinAndSelect('member.organization', 'organization')
      .where('member.organization_id IN (:...orgIds)', { orgIds })
      .andWhere('member.status = :status', {
        status: OrganizationMemberStatus.ACTIVE,
      });

    // Apply filters
    if (query.search) {
      queryBuilder.andWhere(
        '(user.first_name ILIKE :search OR user.last_name ILIKE :search OR user.email ILIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    if (query.role_id) {
      queryBuilder.andWhere('member.role_id = :roleId', { roleId: query.role_id });
    }

    if (query.status) {
      queryBuilder.andWhere('user.status = :userStatus', {
        userStatus: query.status,
      });
    }

    // Get all members - no role hierarchy filtering for visibility
    // Role hierarchy only affects modification permissions, not visibility
    // All users with 'users.view' permission can see all users in the organization
    const allMembers = await queryBuilder
      .orderBy('user.created_at', 'DESC')
      .getMany();

    // Group memberships by user ID to collect all branches for each user
    const userMembershipsMap = new Map<string, any[]>();
    allMembers.forEach((member) => {
      const userId = member.user_id;
      if (!userMembershipsMap.has(userId)) {
        userMembershipsMap.set(userId, []);
      }
      userMembershipsMap.get(userId).push(member);
    });

    const uniqueUserIds = Array.from(userMembershipsMap.keys());
    const total = uniqueUserIds.length;

    // Apply pagination to unique users
    const paginatedUserIds = uniqueUserIds.slice(skip, skip + limit);

    // Map to final response format
    const users = paginatedUserIds.map((userId) => {
      const memberships = userMembershipsMap.get(userId);
      const primaryMember = memberships[0];

      return {
        ...primaryMember.user,
        fullName: `${primaryMember.user.first_name} ${primaryMember.user.last_name}`,
        role: primaryMember.role
          ? {
            id: primaryMember.role.id,
            name: primaryMember.role.name,
            slug: primaryMember.role.slug,
            is_organization_owner: primaryMember.role.is_organization_owner,
          }
          : null,
        membership_status: primaryMember.status,
        joined_at: primaryMember.joined_at,
        branches: memberships.map((m) => ({
          id: m.organization_id,
          name: m.organization?.name || 'Unknown',
          slug: m.organization?.slug || '',
        })),
      };
    });

    // Total is already calculated from filtered members
    const filteredTotal = total;

    return {
      users,
      total: filteredTotal,
      page,
      limit,
      totalPages: Math.ceil(filteredTotal / limit),
    };
  }

  async getUserById(userId: string, organizationId: string, targetUserId: string): Promise<User> {
    // Verify requesting user is member of organization
    const membership = await this.memberRepository.findOne({
      where: {
        user_id: userId,
        organization_id: organizationId,
        status: OrganizationMemberStatus.ACTIVE,
      },
      relations: ['role'],
    });

    if (!membership) {
      throw new ForbiddenException('You are not a member of this organization');
    }

    // Check permission (users.view)
    if (membership.role.is_organization_owner) {
      // Organization owner has all permissions
    } else {
      // Load role with permissions
      const roleWithPermissions = await this.roleRepository.findOne({
        where: { id: membership.role_id },
        relations: ['role_permissions', 'role_permissions.permission'],
      });

      const hasPermission = roleWithPermissions?.role_permissions?.some(
        (rp) => rp.permission.slug === 'users.view',
      );

      if (!hasPermission) {
        throw new ForbiddenException('You do not have permission to view users');
      }
    }

    // Verify target user is member of organization
    const targetMembership = await this.memberRepository.findOne({
      where: {
        user_id: targetUserId,
        organization_id: organizationId,
        status: OrganizationMemberStatus.ACTIVE,
      },
      relations: ['user', 'role'],
    });

    if (!targetMembership) {
      throw new NotFoundException('User not found in this organization');
    }

    // Role hierarchy only affects modification permissions, not visibility
    // All users with 'users.view' permission can view all users in the organization

    return targetMembership.user;
  }

  async updateUser(
    userId: string,
    organizationId: string,
    targetUserId: string,
    dto: UpdateUserAdminDto,
  ): Promise<User> {
    // Verify requesting user is member of organization
    const membership = await this.memberRepository.findOne({
      where: {
        user_id: userId,
        organization_id: organizationId,
        status: OrganizationMemberStatus.ACTIVE,
      },
      relations: ['role'],
    });

    if (!membership) {
      throw new ForbiddenException('You are not a member of this organization');
    }

    // Check permission (users.edit)
    if (membership.role.is_organization_owner) {
      // Organization owner has all permissions
    } else {
      // Load role with permissions
      const roleWithPermissions = await this.roleRepository.findOne({
        where: { id: membership.role_id },
        relations: ['role_permissions', 'role_permissions.permission'],
      });

      const hasPermission = roleWithPermissions?.role_permissions?.some(
        (rp) => rp.permission.slug === 'users.edit',
      );

      if (!hasPermission) {
        throw new ForbiddenException('You do not have permission to edit users');
      }
    }

    // Verify target user is member of organization
    const targetMembership = await this.memberRepository.findOne({
      where: {
        user_id: targetUserId,
        organization_id: organizationId,
        status: OrganizationMemberStatus.ACTIVE,
      },
      relations: ['user', 'role'],
    });

    if (!targetMembership) {
      throw new NotFoundException('User not found in this organization');
    }

    if (!targetMembership.role) {
      throw new NotFoundException('Target user role information is missing');
    }

    // Organization Owner cannot be edited by anyone except themselves
    if (targetMembership.role.is_organization_owner && targetUserId !== userId) {
      throw new BadRequestException(
        'Organization Owner cannot be edited by any other user. Only the Organization Owner can edit their own profile.',
      );
    }

    // Check role hierarchy - requesting user must have a higher role (lower level number) to edit
    if (!membership.role.is_organization_owner) {
      const requestingRoleLevel = this.getRoleHierarchyLevel(membership.role);
      const targetRoleLevel = this.getRoleHierarchyLevel(targetMembership.role);

      // Cannot edit users with same or higher role level
      if (targetRoleLevel <= requestingRoleLevel) {
        if (targetRoleLevel === requestingRoleLevel) {
          throw new BadRequestException(
            `You cannot edit users with the same role level (${targetMembership.role.name}). You can only edit users with lower role levels.`,
          );
        } else {
          throw new BadRequestException(
            `You cannot edit users with a higher role level (${targetMembership.role.name}). You can only edit users with lower role levels.`,
          );
        }
      }
    }

    const user = targetMembership.user;

    // Check if email is being changed and if it's unique
    if (dto.email && dto.email !== user.email) {
      const existing = await this.userRepository.findOne({
        where: { email: dto.email },
      });
      if (existing) {
        throw new ConflictException('Email already exists');
      }
    }

    // Track what changed for notification
    const changes: string[] = [];
    if (dto.first_name && dto.first_name !== user.first_name) changes.push('first name');
    if (dto.last_name && dto.last_name !== user.last_name) changes.push('last name');
    if (dto.email && dto.email !== user.email) changes.push('email');
    if (dto.phone && dto.phone !== user.phone) changes.push('phone');

    // Update user
    Object.assign(user, dto);
    await this.userRepository.save(user);

    // Notify user if their profile was updated by admin
    if (changes.length > 0 && userId !== targetUserId) {
      const notification = this.notificationRepository.create({
        user_id: targetUserId,
        organization_id: organizationId,
        type: 'profile_updated',
        title: 'Profile Updated',
        message: `Your profile has been updated: ${changes.join(', ')}`,
        data: {
          updated_by: userId,
          changes,
        },
      });
      await this.notificationRepository.save(notification);
    }

    // Notify organization owners about user updates
    if (changes.length > 0) {
      const organization = await this.dataSource
        .getRepository(Organization)
        .findOne({ where: { id: organizationId } });

      if (organization) {
        // Get organization owners
        const owners = await this.memberRepository.find({
          where: {
            organization_id: organizationId,
            status: OrganizationMemberStatus.ACTIVE,
          },
          relations: ['role', 'user'],
        });

        const seniorMembers = owners.filter(
          (m) => m.role.is_organization_owner || userId !== m.user_id,
        );

        const notifications = seniorMembers.map((member) =>
          this.notificationRepository.create({
            user_id: member.user_id,
            organization_id: organizationId,
            type: 'user_updated',
            title: 'User Profile Updated',
            message: `User ${user.first_name} ${user.last_name}'s profile has been updated: ${changes.join(', ')}`,
            data: {
              target_user_id: targetUserId,
              updated_by: userId,
              changes,
            },
          }),
        );

        if (notifications.length > 0) {
          await this.notificationRepository.save(notifications);
        }
      }
    }

    return user;
  }

  /**
   * Get role hierarchy level
   * Organization Owner = 1 (highest, fixed, cannot be changed)
   * Admin = 2 (fixed, cannot be changed)
   * Custom roles = 3+ (settable by organization owner/admin via hierarchy_level field)
   */
  private getRoleHierarchyLevel(role: Role): number {
    // Organization Owner is always level 1 (fixed)
    if (role.is_organization_owner) {
      return 1;
    }
    // Admin role is always level 2 (fixed)
    if (
      role.slug === 'admin' ||
      (role.is_default && role.slug === 'admin') ||
      (role.is_system_role && role.slug === 'admin')
    ) {
      return 2;
    }
    // For custom/organization-specific roles, use hierarchy_level if set, otherwise default to 3
    // hierarchy_level must be >= 3 (cannot override Owner=1 or Admin=2)
    if (role.hierarchy_level !== null && role.hierarchy_level !== undefined && role.hierarchy_level >= 3) {
      return role.hierarchy_level;
    }
    // Default to 3 if not set
    return 3;
  }

  async revokeAccess(
    userId: string,
    organizationId: string,
    targetUserId: string,
    dto: RevokeAccessDto,
  ): Promise<{ message: string; revoked_user: User }> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Verify requesting user is member of organization
      const requestingMembership = await this.memberRepository.findOne({
        where: {
          user_id: userId,
          organization_id: organizationId,
          status: OrganizationMemberStatus.ACTIVE,
        },
        relations: ['role'],
      });

      if (!requestingMembership) {
        throw new ForbiddenException('You are not a member of this organization');
      }

      if (!requestingMembership.role) {
        throw new ForbiddenException('Your role information is missing. Please contact support.');
      }

      // Check permission (users.revoke)
      if (!requestingMembership.role.is_organization_owner) {
        const roleWithPermissions = await this.roleRepository.findOne({
          where: { id: requestingMembership.role_id },
          relations: ['role_permissions', 'role_permissions.permission'],
        });

        const hasPermission = roleWithPermissions?.role_permissions?.some(
          (rp) => rp.permission.slug === 'users.revoke',
        );

        if (!hasPermission) {
          throw new ForbiddenException('You do not have permission to revoke user access');
        }
      }

      // Verify target user is member of organization
      const targetMembership = await this.memberRepository.findOne({
        where: {
          user_id: targetUserId,
          organization_id: organizationId,
          status: OrganizationMemberStatus.ACTIVE,
        },
        relations: ['user', 'role'],
      });

      if (!targetMembership) {
        throw new NotFoundException('User not found in this organization');
      }

      if (!targetMembership.role) {
        throw new NotFoundException('Target user role information is missing');
      }

      // Cannot revoke own access
      if (targetUserId === userId) {
        throw new BadRequestException('You cannot revoke your own access');
      }

      // Organization Owner can only revoke themselves (which is blocked above)
      // No one else can revoke Organization Owner
      if (targetMembership.role.is_organization_owner) {
        throw new BadRequestException(
          'Organization Owner access cannot be revoked by any other user. Only the Organization Owner can manage their own access.',
        );
      }

      // Check role hierarchy - requesting user must have a higher role (lower level number)
      const requestingRoleLevel = this.getRoleHierarchyLevel(requestingMembership.role);
      const targetRoleLevel = this.getRoleHierarchyLevel(targetMembership.role);

      // Cannot revoke users with same or higher role level
      if (targetRoleLevel <= requestingRoleLevel) {
        if (targetRoleLevel === requestingRoleLevel) {
          throw new BadRequestException(
            `You cannot revoke access for users with the same role level (${targetMembership.role.name}). You can only revoke access for users with lower role levels.`,
          );
        } else {
          throw new BadRequestException(
            `You cannot revoke access for users with a higher role level (${targetMembership.role.name}). You can only revoke access for users with lower role levels.`,
          );
        }
      }

      // Handle data transfer if requested
      let transferToUserId: string | null = null;

      if (dto.transfer_data && dto.transfer_to_user_id) {
        // Verify transfer recipient is member of organization
        const transferToMembership = await this.memberRepository.findOne({
          where: {
            user_id: dto.transfer_to_user_id,
            organization_id: organizationId,
            status: OrganizationMemberStatus.ACTIVE,
          },
          relations: ['role'],
        });

        if (!transferToMembership) {
          throw new NotFoundException('Transfer recipient not found in this organization');
        }

        // Verify same role (transfer recipient must have same role as revoked user)
        if (transferToMembership.role_id !== targetMembership.role_id) {
          throw new BadRequestException(
            'Transfer recipient must have the same role as the revoked user',
          );
        }

        transferToUserId = dto.transfer_to_user_id;

        // Transfer data ownership
        // Note: In a real application, you would transfer ownership of:
        // - Created records/entities
        // - Assigned tasks/projects
        // - Any other user-created data
        // For now, we'll just mark the transfer in the membership record
      }

      // Revoke all active sessions for this user in this organization
      await this.sessionRepository.update(
        {
          user_id: targetUserId,
          organization_id: organizationId,
          revoked_at: null, // Only revoke non-revoked sessions
        },
        {
          revoked_at: new Date(),
        },
      );

      // Update membership status
      targetMembership.status = OrganizationMemberStatus.REVOKED;
      targetMembership.revoked_at = new Date();
      targetMembership.revoked_by = userId;
      targetMembership.data_transferred_to = transferToUserId;

      await this.memberRepository.save(targetMembership);

      // Create audit log
      const auditLog = this.auditLogRepository.create({
        organization_id: organizationId,
        user_id: userId,
        action: 'user.revoke',
        entity_type: 'user',
        entity_id: targetUserId,
        old_values: {
          status: OrganizationMemberStatus.ACTIVE,
          role_id: targetMembership.role_id,
        },
        new_values: {
          status: OrganizationMemberStatus.REVOKED,
          revoked_at: targetMembership.revoked_at,
          revoked_by: userId,
          data_transferred_to: transferToUserId,
          reason: dto.reason,
        },
        metadata: {
          reason: dto.reason,
          transfer_data: dto.transfer_data || false,
        },
      });

      await this.auditLogRepository.save(auditLog);

      // Get requesting user details for notification
      const requestingUser = await this.userRepository.findOne({
        where: { id: userId },
      });
      const requestingUserName = requestingUser
        ? `${requestingUser.first_name} ${requestingUser.last_name}`
        : 'Administrator';

      // Get organization details
      const organization = await this.dataSource
        .getRepository(Organization)
        .findOne({ where: { id: organizationId } });

      // Create notification for revoked user
      await this.notificationHelper.createNotification(
        targetUserId,
        organizationId,
        NotificationType.USER_REMOVED,
        'Access Revoked',
        `${requestingUserName} has revoked your access to ${organization?.name || 'this organization'}${dto.reason ? `: ${dto.reason}` : '.'}`,
        {
          route: '/organizations',
        },
        {
          organization_id: organizationId,
          organization_name: organization?.name,
          revoked_by: userId,
          revoked_by_name: requestingUserName,
          reason: dto.reason,
        },
      );

      // Check user's notification preferences before sending email
      let shouldSendEmail = true;
      try {
        // Get personal preferences (not organization-level)
        const userPreferences = await this.notificationsService.getNotificationPreferences(
          targetUserId,
          organizationId,
          NotificationPreferenceScope.PERSONAL,
        );
        // Check if user has email notifications enabled for access revoked events
        const accessRevokedPref = userPreferences.preferences?.access_revoked;
        if (
          accessRevokedPref !== undefined &&
          typeof accessRevokedPref === 'object' &&
          'email' in accessRevokedPref
        ) {
          shouldSendEmail = accessRevokedPref.email !== false;
        } else {
          // Default to email_enabled setting
          shouldSendEmail = userPreferences.email_enabled !== false;
        }
      } catch (error) {
        // If preferences can't be fetched, default to sending email
        console.warn('Could not fetch notification preferences, defaulting to send email:', error);
      }

      // Send email notification if enabled
      if (shouldSendEmail && organization) {
        try {
          await this.emailService.sendAccessRevokedEmail(
            targetMembership.user.email,
            targetMembership.user.first_name,
            organization.name,
            dto.reason,
          );
        } catch (error) {
          console.error('Failed to send access revoked email:', error);
          // Don't fail the revocation if email fails
        }
      }

      // If data was transferred, notify the recipient
      if (transferToUserId) {
        const transferToUser = await this.userRepository.findOne({
          where: { id: transferToUserId },
        });

        if (transferToUser) {
          const transferNotification = this.notificationRepository.create({
            user_id: transferToUserId,
            organization_id: organizationId,
            type: 'data_transferred',
            title: 'Data Ownership Transferred',
            message: `You have been assigned data ownership from ${targetMembership.user.first_name} ${targetMembership.user.last_name} (${targetMembership.user.email}).`,
            data: {
              organization_id: organizationId,
              transferred_from_user_id: targetUserId,
              transferred_from_user_name: `${targetMembership.user.first_name} ${targetMembership.user.last_name}`,
            },
          });

          await this.notificationRepository.save(transferNotification);

          await this.emailService.sendDataTransferredEmail(
            transferToUser.email,
            transferToUser.first_name,
            `${targetMembership.user.first_name} ${targetMembership.user.last_name}`,
            targetMembership.user.email,
          );
        }
      }

      await queryRunner.commitTransaction();

      return {
        message: 'User access revoked successfully',
        revoked_user: targetMembership.user,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async downloadAccountData(
    userId: string,
    organizationId: string,
  ): Promise<any> {
    // Verify user is organization owner
    const membership = await this.memberRepository.findOne({
      where: {
        user_id: userId,
        organization_id: organizationId,
        status: OrganizationMemberStatus.ACTIVE,
      },
      relations: ['role', 'organization', 'user'],
    });

    if (!membership) {
      throw new ForbiddenException('You are not a member of this organization');
    }

    if (!membership.role?.is_organization_owner) {
      throw new ForbiddenException('Only organization owners can download account data');
    }

    // Get all organization data
    const organization = await this.organizationRepository.findOne({
      where: { id: organizationId },
      relations: ['package', 'members', 'members.user', 'members.role'],
    });

    // Get all audit logs for the organization
    const auditLogs = await this.auditLogRepository.find({
      where: { organization_id: organizationId },
      relations: ['user'],
      order: { created_at: 'DESC' },
    });

    // Get all users in the organization
    const members = await this.memberRepository.find({
      where: { organization_id: organizationId },
      relations: ['user', 'role'],
    });

    // Get all payments
    const payments = await this.dataSource.query(
      `SELECT * FROM payments WHERE organization_id = $1 ORDER BY created_at DESC`,
      [organizationId],
    );

    return {
      exported_at: new Date().toISOString(),
      organization: {
        id: organization?.id,
        name: organization?.name,
        email: organization?.email,
        package: organization?.package,
        created_at: organization?.created_at,
        updated_at: organization?.updated_at,
      },
      members: members.map((m) => ({
        user: {
          id: m.user.id,
          email: m.user.email,
          first_name: m.user.first_name,
          last_name: m.user.last_name,
          phone: m.user.phone,
          created_at: m.user.created_at,
        },
        role: m.role,
        joined_at: m.joined_at,
        status: m.status,
      })),
      audit_logs: auditLogs.map((log) => ({
        id: log.id,
        action: log.action,
        entity_type: log.entity_type,
        entity_id: log.entity_id,
        user: log.user ? {
          id: log.user.id,
          email: log.user.email,
          first_name: log.user.first_name,
          last_name: log.user.last_name,
        } : null,
        old_values: log.old_values,
        new_values: log.new_values,
        created_at: log.created_at,
      })),
      payments: payments,
    };
  }

  async impersonateUser(
    impersonatorUserId: string,
    organizationId: string,
    targetUserId: string,
  ): Promise<{ access_token: string; refresh_token: string; impersonated_user: any }> {
    // Get impersonator's membership and role
    const impersonatorMembership = await this.memberRepository.findOne({
      where: {
        user_id: impersonatorUserId,
        organization_id: organizationId,
        status: OrganizationMemberStatus.ACTIVE,
      },
      relations: ['role'],
    });

    if (!impersonatorMembership) {
      throw new ForbiddenException('You are not a member of this organization');
    }

    // Check permission: Organization owner or admin can always impersonate
    // Other roles need 'users.impersonate' permission
    let canImpersonate = false;
    if (impersonatorMembership.role.is_organization_owner) {
      canImpersonate = true;
    } else {
      // Check if role is admin (slug === 'admin' or is_system_role with admin-like permissions)
      const isAdmin = impersonatorMembership.role.slug === 'admin' ||
        (impersonatorMembership.role.is_system_role && impersonatorMembership.role.slug === 'admin');

      if (isAdmin) {
        canImpersonate = true;
      } else {
        // Check for impersonate permission
        const roleWithPermissions = await this.roleRepository.findOne({
          where: { id: impersonatorMembership.role_id },
          relations: ['role_permissions', 'role_permissions.permission'],
        });

        const hasPermission = roleWithPermissions?.role_permissions?.some(
          (rp) => rp.permission.slug === 'users.impersonate',
        );

        if (!hasPermission) {
          throw new ForbiddenException('You do not have permission to impersonate users');
        }
        canImpersonate = true;
      }
    }

    // Get target user's membership
    const targetMembership = await this.memberRepository.findOne({
      where: {
        user_id: targetUserId,
        organization_id: organizationId,
        status: OrganizationMemberStatus.ACTIVE,
      },
      relations: ['user', 'role'],
    });

    if (!targetMembership) {
      throw new NotFoundException('Target user not found or not a member of this organization');
    }

    // Cannot impersonate yourself
    if (targetUserId === impersonatorUserId) {
      throw new BadRequestException('You cannot impersonate yourself');
    }

    // Check role hierarchy - can only impersonate users with lower roles
    const impersonatorRoleLevel = this.getRoleHierarchyLevel(impersonatorMembership.role);
    const targetRoleLevel = this.getRoleHierarchyLevel(targetMembership.role);

    if (targetRoleLevel <= impersonatorRoleLevel) {
      throw new ForbiddenException(
        'You can only impersonate users with roles below your own. You cannot impersonate users with the same or higher role.',
      );
    }

    // Generate impersonation tokens
    const payload: JwtPayload = {
      sub: targetUserId, // Impersonated user's ID
      email: targetMembership.user.email,
      organization_id: organizationId,
      role_id: targetMembership.role_id,
      impersonated_by: impersonatorUserId, // Original user's ID
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get<string>('JWT_EXPIRES_IN', '15m'),
    });

    const refreshToken = this.jwtService.sign(
      { sub: targetUserId, impersonated_by: impersonatorUserId },
      {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '7d'),
      },
    );

    // Create audit log
    await this.auditLogRepository.save(
      this.auditLogRepository.create({
        organization_id: organizationId,
        user_id: impersonatorUserId,
        action: 'user.impersonate.start',
        entity_type: 'user',
        entity_id: targetUserId,
        new_values: {
          impersonated_user_id: targetUserId,
          impersonated_user_email: targetMembership.user.email,
          impersonated_user_role: targetMembership.role.name,
        },
      }),
    );

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      impersonated_user: {
        id: targetMembership.user.id,
        email: targetMembership.user.email,
        first_name: targetMembership.user.first_name,
        last_name: targetMembership.user.last_name,
        role: targetMembership.role,
      },
    };
  }

  async stopImpersonation(
    impersonatedUserId: string,
    organizationId: string,
    originalUserId: string | undefined,
  ): Promise<{ access_token: string; refresh_token: string; user: any }> {
    if (!originalUserId) {
      throw new BadRequestException('Not currently impersonating any user');
    }

    // Get original user's membership
    const originalMembership = await this.memberRepository.findOne({
      where: {
        user_id: originalUserId,
        organization_id: organizationId,
        status: OrganizationMemberStatus.ACTIVE,
      },
      relations: ['user', 'role'],
    });

    if (!originalMembership) {
      throw new NotFoundException('Original user not found or not a member of this organization');
    }

    // Generate tokens for original user (without impersonation)
    const payload: JwtPayload = {
      sub: originalUserId,
      email: originalMembership.user.email,
      organization_id: organizationId,
      role_id: originalMembership.role_id,
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get<string>('JWT_EXPIRES_IN', '15m'),
    });

    const refreshToken = this.jwtService.sign(
      { sub: originalUserId },
      {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '7d'),
      },
    );

    // Create audit log
    await this.auditLogRepository.save(
      this.auditLogRepository.create({
        organization_id: organizationId,
        user_id: originalUserId,
        action: 'user.impersonate.stop',
        entity_type: 'user',
        entity_id: impersonatedUserId,
        old_values: {
          impersonated_user_id: impersonatedUserId,
        },
      }),
    );

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      user: {
        id: originalMembership.user.id,
        email: originalMembership.user.email,
        first_name: originalMembership.user.first_name,
        last_name: originalMembership.user.last_name,
        role: originalMembership.role,
      },
    };
  }

}
