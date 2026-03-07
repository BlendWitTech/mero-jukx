import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { Invitation, InvitationStatus } from '../database/entities/invitations.entity';
import { Organization } from '../database/entities/organizations.entity';
import {
  OrganizationMember,
  OrganizationMemberStatus,
} from '../database/entities/organization_members.entity';
import { User, UserStatus } from '../database/entities/users.entity';
import { Role } from '../database/entities/roles.entity';
import {
  EmailVerification,
  EmailVerificationType,
} from '../database/entities/email_verifications.entity';
import { Notification } from '../database/entities/notifications.entity';
import { Session } from '../database/entities/sessions.entity';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { AcceptInvitationDto } from './dto/accept-invitation.dto';
import { InvitationQueryDto } from './dto/invitation-query.dto';
import { EmailService } from '../common/services/email.service';
import { EmailTemplatesService } from '../common/services/email-templates.service';
import {
  NotificationHelperService,
  NotificationType,
} from '../notifications/notification-helper.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

@Injectable()
export class InvitationsService {
  constructor(
    @InjectRepository(Invitation)
    private invitationRepository: Repository<Invitation>,
    @InjectRepository(Organization)
    private organizationRepository: Repository<Organization>,
    @InjectRepository(OrganizationMember)
    private memberRepository: Repository<OrganizationMember>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Role)
    private roleRepository: Repository<Role>,
    @InjectRepository(EmailVerification)
    private emailVerificationRepository: Repository<EmailVerification>,
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
    @InjectRepository(Session)
    private sessionRepository: Repository<Session>,
    private emailService: EmailService,
    private emailTemplatesService: EmailTemplatesService,
    private notificationHelper: NotificationHelperService,
    private notificationsService: NotificationsService,
    private auditLogsService: AuditLogsService,
    private dataSource: DataSource,
  ) { }

  async createInvitation(
    userId: string,
    organizationId: string,
    dto: CreateInvitationDto,
    origin?: string,
  ): Promise<Invitation> {
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

    // Check permission (invitations.create)
    if (membership.role.is_organization_owner) {
      // Organization owner has all permissions
    } else {
      const roleWithPermissions = await this.roleRepository.findOne({
        where: { id: membership.role_id },
        relations: ['role_permissions', 'role_permissions.permission'],
      });

      const hasPermission = roleWithPermissions?.role_permissions?.some(
        (rp) => rp.permission.slug === 'invitations.create',
      );

      if (!hasPermission) {
        throw new ForbiddenException('You do not have permission to create invitations');
      }
    }

    // Get organization
    const organization = await this.organizationRepository.findOne({
      where: { id: organizationId },
      relations: ['package'],
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    // Get organization group (Main + all Branches)
    const rootOrgId = organization.org_type === 'MAIN' ? organization.id : organization.parent_id;
    if (!rootOrgId) {
      throw new BadRequestException('Organization structure is invalid');
    }

    // Get all organization IDs in this group
    const orgGroup = await this.organizationRepository.find({
      where: [{ id: rootOrgId }, { parent_id: rootOrgId }],
      select: ['id'],
    });
    const groupIds = orgGroup.map(o => o.id);

    // Check if user exists
    let existingUser = await this.userRepository.findOne({
      where: { email: dto.email.toLowerCase().trim() },
    });

    // Check if user is already a member of ANY organization in the group
    let isAlreadyInGroup = false;
    if (existingUser) {
      const groupMembership = await this.memberRepository.findOne({
        where: {
          user_id: existingUser.id,
          organization_id: In(groupIds),
          status: OrganizationMemberStatus.ACTIVE,
        },
      });
      isAlreadyInGroup = !!groupMembership;
    }

    // Only check limit if user is NOT already in the group
    if (!isAlreadyInGroup) {
      const distinctUsersResult = await this.memberRepository
        .createQueryBuilder('member')
        .select('COUNT(DISTINCT member.user_id)', 'count')
        .where('member.organization_id IN (:...groupIds)', { groupIds })
        .andWhere('member.status = :status', { status: OrganizationMemberStatus.ACTIVE })
        .getRawOne();

      const currentDistinctCount = parseInt(distinctUsersResult?.count || '0', 10);
      const userLimit = organization.user_limit || organization.package?.base_user_limit || 0;

      if (currentDistinctCount >= userLimit) {
        throw new BadRequestException(
          `Organization user limit reached (${userLimit}). Please upgrade your package to add more distinct users.`,
        );
      }
    }

    // Check if user is already an active member (exclude revoked/left members - they can be re-invited)
    const existingActiveMember = await this.memberRepository.findOne({
      where: {
        organization_id: organizationId,
        user: { email: dto.email },
        status: OrganizationMemberStatus.ACTIVE,
      },
    });

    if (existingActiveMember) {
      throw new ConflictException('User is already an active member of this organization');
    }

    // Check if there's a pending invitation for this email
    const existingInvitation = await this.invitationRepository.findOne({
      where: {
        organization_id: organizationId,
        email: dto.email,
        status: InvitationStatus.PENDING,
      },
    });

    if (existingInvitation && existingInvitation.expires_at > new Date()) {
      throw new ConflictException('An active invitation already exists for this email');
    }

    // Verify role exists and is available for organization
    // Check both organization-specific roles and default roles
    const role = await this.roleRepository.findOne({
      where: [
        {
          id: dto.role_id,
          organization_id: organizationId,
          is_active: true,
        },
        {
          id: dto.role_id,
          organization_id: null,
          is_default: true,
          is_active: true,
        },
      ],
      relations: ['organization'],
    });

    if (!role) {
      throw new NotFoundException('Role not found or not available for this organization');
    }

    // Cannot assign organization owner role via invitation
    if (role.is_organization_owner) {
      throw new BadRequestException(
        'Organization Owner role cannot be assigned via invitations. This role is reserved for the organization creator.',
      );
    }

    // Check package restrictions
    // For freemium, only allow default roles
    if (organization.package.slug === 'freemium') {
      if (!role.is_default || role.organization_id !== null) {
        throw new BadRequestException(
          'Freemium accounts can only use default roles. Please upgrade your package to use custom roles.',
        );
      }
    }

    // Check if user can assign this role based on hierarchy level
    // Get requesting user's role hierarchy level
    const requestingRoleLevel = this.getRoleHierarchyLevel(membership.role);
    const targetRoleLevel = this.getRoleHierarchyLevel(role);

    // Organization owners can assign any role (except owner, already checked)
    if (!membership.role.is_organization_owner) {
      // Users can only assign roles with hierarchy level > their own
      // (roles with lower authority than themselves - higher number = lower authority)
      // Example: User with level 2 (Admin) can assign roles with level 3, 4, 5, etc.
      if (targetRoleLevel <= requestingRoleLevel) {
        throw new ForbiddenException(
          `You cannot assign roles that are equal to or higher than your own role level. Your role level is ${requestingRoleLevel}, and the selected role level is ${targetRoleLevel}. You can only assign roles with hierarchy level greater than ${requestingRoleLevel}.`,
        );
      }
    }

    // isReinvitation check continues below

    // If user exists, check if they have a revoked/left membership for this organization
    // This helps us determine if this is a re-invitation
    let isReinvitation = false;
    if (existingUser) {
      const revokedMembership = await this.memberRepository.findOne({
        where: {
          organization_id: organizationId,
          user_id: existingUser.id,
          status: In([OrganizationMemberStatus.REVOKED, OrganizationMemberStatus.LEFT]),
        },
      });
      isReinvitation = !!revokedMembership;
    }

    // Create invitation
    const token = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 3); // 3 days expiry

    const normalizedEmail = dto.email.toLowerCase().trim();
    const invitation = this.invitationRepository.create({
      organization_id: organizationId,
      email: normalizedEmail,
      role_id: dto.role_id,
      token,
      status: InvitationStatus.PENDING,
      expires_at: expiresAt,
      message: dto.message,
      invited_by: userId,
      user_id: existingUser?.id || null, // Set user_id if existing user (including revoked users)
    });

    const savedInvitation = await this.invitationRepository.save(invitation);

    // Create audit log (don't fail invitation if audit log fails)
    try {
      await this.auditLogsService.createAuditLog(
        organizationId,
        userId,
        'invitation.create',
        'invitation',
        savedInvitation.id,
        null,
        {
          email: dto.email,
          role_id: dto.role_id,
          expires_at: expiresAt,
          invited_by: userId,
        },
      );
    } catch (error) {
      // Log error but don't fail invitation creation
      console.error('Failed to create audit log for invitation:', error);
    }

    // Send invitation email
    const inviter = await this.userRepository.findOne({
      where: { id: userId },
    });

    const inviterName = inviter ? `${inviter.first_name} ${inviter.last_name}` : 'Administrator';

    await this.emailService.sendInvitationEmail(
      dto.email,
      inviterName,
      organization.name,
      token,
      !existingUser, // isNewUser - false if user exists (including revoked users)
      origin,
    );

    // Create in-app notification for existing users
    if (existingUser) {
      await this.notificationHelper.notifyUserInvited(
        existingUser.id,
        organizationId,
        dto.email,
        savedInvitation.id,
      );
    }

    // Send notifications to inviter and senior users (don't fail invitation if this fails)
    try {
      await this.sendInvitationNotifications(
        userId,
        organizationId,
        membership.role,
        dto.email,
        savedInvitation.id,
        inviterName,
        organization.name,
      );
    } catch (error) {
      console.error('Failed to send invitation notifications (non-blocking):', error);
      // Don't fail the invitation creation if notifications fail
    }

    return savedInvitation;
  }

  async getInvitations(
    userId: string,
    organizationId: string,
    query: InvitationQueryDto,
  ): Promise<{
    invitations: Invitation[];
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

    // Check permission (invitations.view)
    if (membership.role.is_organization_owner) {
      // Organization owner has all permissions
    } else {
      const roleWithPermissions = await this.roleRepository.findOne({
        where: { id: membership.role_id },
        relations: ['role_permissions', 'role_permissions.permission'],
      });

      const hasPermission = roleWithPermissions?.role_permissions?.some(
        (rp) => rp.permission.slug === 'invitations.view',
      );

      if (!hasPermission) {
        throw new ForbiddenException('You do not have permission to view invitations');
      }
    }

    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    // Build query
    const queryBuilder = this.invitationRepository
      .createQueryBuilder('invitation')
      .leftJoinAndSelect('invitation.role', 'role')
      .leftJoinAndSelect('invitation.inviter', 'inviter')
      .leftJoinAndSelect('invitation.canceller', 'canceller')
      .where('invitation.organization_id = :organizationId', { organizationId });

    // Apply filters
    if (query.status) {
      queryBuilder.andWhere('invitation.status = :status', { status: query.status });
    }

    if (query.email) {
      queryBuilder.andWhere('invitation.email ILIKE :email', {
        email: `%${query.email}%`,
      });
    }

    // Get total count
    const total = await queryBuilder.getCount();

    // Get paginated results
    const invitations = await queryBuilder
      .orderBy('invitation.created_at', 'DESC')
      .skip(skip)
      .take(limit)
      .getMany();

    return {
      invitations,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getInvitationByToken(token: string): Promise<Invitation> {
    const invitation = await this.invitationRepository.findOne({
      where: { token },
      relations: ['organization', 'organization.package', 'role', 'inviter', 'canceller'],
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    // Check if expired
    if (invitation.expires_at < new Date()) {
      invitation.status = InvitationStatus.EXPIRED;
      await this.invitationRepository.save(invitation);
      throw new BadRequestException('Invitation has expired');
    }

    // Check if already accepted or cancelled
    if (invitation.status !== InvitationStatus.PENDING) {
      throw new BadRequestException(`Invitation is ${invitation.status}`);
    }

    return invitation;
  }

  async acceptInvitation(
    token: string,
    dto: AcceptInvitationDto,
  ): Promise<{ message: string; user?: User }> {
    const invitation = await this.getInvitationByToken(token);

    // Check if user exists (by email, regardless of invitation.user_id)
    const normalizedEmail = invitation.email.toLowerCase().trim();
    let user = await this.userRepository.findOne({
      where: { email: normalizedEmail },
    });

    // Determine if new or existing user
    // If invitation.user_id is null, it's a new user invitation
    // If invitation.user_id exists but user doesn't exist, it's an error state
    // If user exists (regardless of invitation.user_id), treat as existing user
    const isNewUser = !user && !invitation.user_id;

    if (isNewUser) {
      // New user - validate required fields
      if (!dto.first_name || !dto.last_name || !dto.password) {
        throw new BadRequestException(
          'First name, last name, and password are required for new users',
        );
      }

      // Create new user
      const hashedPassword = await bcrypt.hash(dto.password, 10);

      user = this.userRepository.create({
        email: invitation.email,
        password_hash: hashedPassword,
        first_name: dto.first_name,
        last_name: dto.last_name,
        phone: dto.phone,
        email_verified: true, // Email verified via invitation
        status: UserStatus.ACTIVE,
      });

      user = await this.userRepository.save(user);

      // Create audit log for user creation (don't fail if audit log fails)
      try {
        await this.auditLogsService.createAuditLog(
          invitation.organization_id,
          user.id,
          'user.create',
          'user',
          user.id,
          null,
          {
            email: user.email,
            first_name: user.first_name,
            last_name: user.last_name,
            created_via: 'invitation',
          },
        );
      } catch (error) {
        console.error('Failed to create audit log for user creation:', error);
      }

      // Create email verification record (for audit)
      const emailVerification = this.emailVerificationRepository.create({
        user_id: user.id,
        email: user.email,
        token: crypto.randomUUID(),
        type: EmailVerificationType.INVITATION,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });

      await this.emailVerificationRepository.save(emailVerification);
    } else {
      // Existing user
      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Allow reactivating suspended users, but not deleted users
      if (user.status === UserStatus.DELETED) {
        throw new BadRequestException('User account has been deleted and cannot be reactivated');
      }

      // If user is suspended, reactivate them
      if (user.status === UserStatus.SUSPENDED) {
        user.status = UserStatus.ACTIVE;
      }

      // Ensure existing user is marked as verified when they accept an invitation
      if (!user.email_verified) {
        user.email_verified = true;
        user.email_verified_at = new Date();
      }

      await this.userRepository.save(user);
    }

    // Check if user is already an active member
    const existingActiveMember = await this.memberRepository.findOne({
      where: {
        organization_id: invitation.organization_id,
        user_id: user.id,
        status: OrganizationMemberStatus.ACTIVE,
      },
    });

    if (existingActiveMember) {
      throw new ConflictException('User is already an active member of this organization');
    }

    // Check if user has a revoked/left membership - if so, reactivate it instead of creating new
    const existingRevokedMember = await this.memberRepository.findOne({
      where: {
        organization_id: invitation.organization_id,
        user_id: user.id,
        status: In([OrganizationMemberStatus.REVOKED, OrganizationMemberStatus.LEFT]),
      },
    });

    if (existingRevokedMember) {
      // Reactivate the existing membership instead of creating a new one
      existingRevokedMember.status = OrganizationMemberStatus.ACTIVE;
      existingRevokedMember.role_id = invitation.role_id; // Update to the new role from invitation
      existingRevokedMember.joined_at = new Date(); // Update joined date
      existingRevokedMember.revoked_at = null;
      existingRevokedMember.revoked_by = null;
      existingRevokedMember.data_transferred_to = null;

      await this.memberRepository.save(existingRevokedMember);

      // Update invitation status
      invitation.status = InvitationStatus.ACCEPTED;
      invitation.accepted_at = new Date();
      invitation.user_id = user.id;
      await this.invitationRepository.save(invitation);

      // Create audit logs
      try {
        await this.auditLogsService.createAuditLog(
          invitation.organization_id,
          user.id,
          'invitation.accept',
          'invitation',
          invitation.id,
          {
            status: InvitationStatus.PENDING,
          },
          {
            status: InvitationStatus.ACCEPTED,
            accepted_at: new Date(),
            role_id: invitation.role_id,
            membership_reactivated: true,
          },
        );

        await this.auditLogsService.createAuditLog(
          invitation.organization_id,
          user.id,
          'user.reactivated',
          'user',
          user.id,
          {
            status: existingRevokedMember.status,
            role_id: existingRevokedMember.role_id,
          },
          {
            status: OrganizationMemberStatus.ACTIVE,
            role_id: invitation.role_id,
            reactivated_via: 'invitation',
          },
        );
      } catch (error) {
        console.error('Failed to create audit logs for invitation acceptance:', error);
      }

      // Send confirmation email
      await this.emailService.sendEmail(
        user.email,
        `Welcome back to ${invitation.organization.name}!`,
        `
          <h2>Welcome back!</h2>
          <p>Hello ${user.first_name},</p>
          <p>You have been re-invited and your access to <strong>${invitation.organization.name}</strong> has been reactivated.</p>
          <p>You can now access the organization dashboard again.</p>
        `,
      );

      return {
        message: 'Invitation accepted successfully. Your access has been reactivated.',
        user,
      };
    }

    // Create organization membership
    const membership = this.memberRepository.create({
      organization_id: invitation.organization_id,
      user_id: user.id,
      role_id: invitation.role_id,
      status: OrganizationMemberStatus.ACTIVE,
      joined_at: new Date(),
    });

    await this.memberRepository.save(membership);

    // Create audit logs (don't fail if audit log fails)
    try {
      await this.auditLogsService.createAuditLog(
        invitation.organization_id,
        user.id,
        'invitation.accept',
        'invitation',
        invitation.id,
        {
          status: InvitationStatus.PENDING,
        },
        {
          status: InvitationStatus.ACCEPTED,
          accepted_at: new Date(),
          role_id: invitation.role_id,
        },
      );

      await this.auditLogsService.createAuditLog(
        invitation.organization_id,
        user.id,
        'user.joined',
        'user',
        user.id,
        null,
        {
          organization_id: invitation.organization_id,
          role_id: invitation.role_id,
          joined_via: 'invitation',
        },
      );
    } catch (error) {
      console.error('Failed to create audit logs for invitation acceptance:', error);
    }

    // Update invitation status and link user_id
    invitation.status = InvitationStatus.ACCEPTED;
    invitation.accepted_at = new Date();
    invitation.user_id = user.id; // Ensure user_id is set
    await this.invitationRepository.save(invitation);

    // Update notification if exists (for existing users)
    if (invitation.user_id) {
      await this.notificationRepository.update(
        {
          user_id: user.id,
          organization_id: invitation.organization_id,
          type: 'invitation',
        },
        {
          read_at: new Date(),
        },
      );
    }

    // Send confirmation email
    await this.emailService.sendEmail(
      user.email,
      `Welcome to ${invitation.organization.name}!`,
      `
        <h2>Welcome!</h2>
        <p>Hello ${user.first_name},</p>
        <p>You have successfully joined <strong>${invitation.organization.name}</strong>.</p>
        <p>You can now access the organization dashboard.</p>
      `,
    );

    return {
      message: 'Invitation accepted successfully',
      user,
    };
  }

  async cancelInvitation(
    userId: string,
    organizationId: string,
    invitationId: string,
  ): Promise<{ message: string }> {
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

    // Check permission (invitations.cancel)
    if (membership.role.is_organization_owner) {
      // Organization owner has all permissions
    } else {
      const roleWithPermissions = await this.roleRepository.findOne({
        where: { id: membership.role_id },
        relations: ['role_permissions', 'role_permissions.permission'],
      });

      const hasPermission = roleWithPermissions?.role_permissions?.some(
        (rp) => rp.permission.slug === 'invitations.cancel',
      );

      if (!hasPermission) {
        throw new ForbiddenException('You do not have permission to cancel invitations');
      }
    }

    // Get invitation
    const invitation = await this.invitationRepository.findOne({
      where: {
        id: invitationId,
        organization_id: organizationId,
      },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    // Cannot cancel accepted invitations - must revoke access instead
    if (invitation.status === InvitationStatus.ACCEPTED) {
      throw new BadRequestException(
        "Cannot cancel an accepted invitation. Please revoke the user's access instead.",
      );
    }

    if (invitation.status !== InvitationStatus.PENDING) {
      throw new BadRequestException('Only pending invitations can be cancelled');
    }

    // Determine if this is a new user invitation (user doesn't exist yet)
    const isNewUserInvitation = !invitation.user_id;

    // Check if user exists (either from invitation.user_id or by email lookup)
    const invitedUser = invitation.user_id
      ? await this.userRepository.findOne({
        where: { id: invitation.user_id },
      })
      : await this.userRepository.findOne({
        where: { email: invitation.email },
      });

    if (invitedUser) {
      // Existing user - check if user is already a member of this organization
      const existingMember = await this.memberRepository.findOne({
        where: {
          user_id: invitedUser.id,
          organization_id: organizationId,
        },
      });

      // If user is a member, remove them completely (delete the membership record)
      if (existingMember) {
        // Create audit log before deletion
        try {
          await this.auditLogsService.createAuditLog(
            organizationId,
            userId,
            'invitation.cancel',
            'invitation',
            invitation.id,
            {
              status: InvitationStatus.PENDING,
              user_id: invitedUser.id,
              member_id: existingMember.id,
            },
            {
              status: InvitationStatus.CANCELLED,
              member_removed: true,
            },
          );

          await this.auditLogsService.createAuditLog(
            organizationId,
            userId,
            'user.removed',
            'user',
            invitedUser.id,
            {
              status: existingMember.status,
              role_id: existingMember.role_id,
            },
            null, // User removed, no new values
          );
        } catch (error) {
          console.error('Failed to create audit logs for invitation cancellation:', error);
        }

        // Revoke all active sessions for this user in this organization
        await this.sessionRepository.update(
          {
            user_id: invitedUser.id,
            organization_id: organizationId,
            revoked_at: null,
          },
          {
            revoked_at: new Date(),
          },
        );

        // Delete the membership record completely
        await this.memberRepository.remove(existingMember);
      }

      // Clean up notifications for existing users
      await this.notificationRepository.delete({
        user_id: invitedUser.id,
        organization_id: organizationId,
        type: 'invitation',
      });
    } else if (isNewUserInvitation) {
      // New user invitation (user doesn't exist yet) - clean up any related data
      // Delete any notifications that might have been created (shouldn't happen, but clean up anyway)
      // Note: We can't delete by user_id since user doesn't exist, but we can delete by email if needed
      // For now, just ensure the invitation is cancelled - no user data to clean up
    }

    // Update invitation status and track who cancelled it
    invitation.status = InvitationStatus.CANCELLED;
    invitation.cancelled_by = userId;
    await this.invitationRepository.save(invitation);

    // Create audit log for invitation cancellation
    try {
      await this.auditLogsService.createAuditLog(
        organizationId,
        userId,
        'invitation.cancel',
        'invitation',
        invitation.id,
        {
          status: InvitationStatus.PENDING,
          email: invitation.email,
        },
        {
          status: InvitationStatus.CANCELLED,
        },
      );
    } catch (error) {
      console.error('Failed to create audit log for invitation cancellation:', error);
    }

    return { message: 'Invitation cancelled successfully' };
  }

  /**
   * Get role hierarchy level
   * Organization Owner = 1 (highest)
   * Admin = 2
   * Other roles = 3+ (based on creation order or custom logic)
   */
  private getRoleHierarchyLevel(role: Role): number {
    if (role.is_organization_owner) {
      return 1; // Highest level
    }
    // Admin role can be identified by slug 'admin' or by being a default/system role with admin-like permissions
    if (
      role.slug === 'admin' ||
      (role.is_default && role.slug === 'admin') ||
      (role.is_system_role && role.slug === 'admin')
    ) {
      return 2; // Second level
    }
    // For custom/organization-specific roles, use hierarchy_level if set, otherwise default to 3
    // hierarchy_level must be >= 3 (cannot override Owner=1 or Admin=2)
    if (role.hierarchy_level !== null && role.hierarchy_level !== undefined && role.hierarchy_level >= 3) {
      return role.hierarchy_level;
    }
    // Default to 3 if not set
    return 3;
  }

  /**
   * Get senior users (users with roles higher in hierarchy than the inviter's role)
   */
  private async getSeniorUsers(
    organizationId: string,
    inviterRole: Role,
  ): Promise<OrganizationMember[]> {
    const inviterRoleLevel = this.getRoleHierarchyLevel(inviterRole);

    // Get all roles in the organization
    const allRoles = await this.roleRepository.find({
      where: [
        { organization_id: organizationId, is_active: true },
        { organization_id: null, is_default: true, is_active: true },
      ],
    });

    // Find roles that are senior (lower level number = higher in hierarchy)
    const seniorRoleIds: number[] = [];
    for (const role of allRoles) {
      const roleLevel = this.getRoleHierarchyLevel(role);
      // Senior roles have lower level numbers
      if (roleLevel < inviterRoleLevel) {
        seniorRoleIds.push(role.id);
      }
    }

    if (seniorRoleIds.length === 0) {
      return [];
    }

    // Get all members with senior roles
    const seniorMembers = await this.memberRepository.find({
      where: {
        organization_id: organizationId,
        status: OrganizationMemberStatus.ACTIVE,
        role_id: In(seniorRoleIds),
      },
      relations: ['user', 'role'],
    });

    return seniorMembers;
  }

  /**
   * Send notifications to inviter and senior users about invitation creation
   */
  private async sendInvitationNotifications(
    inviterUserId: string,
    organizationId: string,
    inviterRole: Role,
    invitedEmail: string,
    invitationId: string,
    inviterName: string,
    organizationName: string,
  ): Promise<void> {
    try {
      // Check if email notifications should be sent (using helper service)
      const emailNotificationsEnabled = await this.notificationHelper.shouldSendEmail(
        inviterUserId,
        organizationId,
        NotificationType.USER_INVITED,
      );

      // Get senior users
      const seniorMembers = await this.getSeniorUsers(organizationId, inviterRole);

      // Send notification to inviter
      await this.notificationHelper.createNotification(
        inviterUserId,
        organizationId,
        NotificationType.USER_INVITED,
        'Invitation Sent',
        `You have invited ${invitedEmail} to join ${organizationName}.`,
        {
          route: '/invitations',
          params: { invitationId },
        },
        {
          invitation_id: invitationId,
          invited_email: invitedEmail,
        },
      );

      // Send notifications to senior users
      for (const seniorMember of seniorMembers) {
        // Skip if it's the inviter themselves
        if (seniorMember.user_id === inviterUserId) {
          continue;
        }

        await this.notificationHelper.createNotification(
          seniorMember.user_id,
          organizationId,
          NotificationType.USER_INVITED,
          'New Invitation',
          `${inviterName} has invited ${invitedEmail} to join ${organizationName}.`,
          {
            route: '/invitations',
            params: { invitationId },
          },
          {
            invitation_id: invitationId,
            invited_email: invitedEmail,
            invited_by: inviterUserId,
            invited_by_name: inviterName,
          },
        );
      }

      // Send email to organization if email notifications are enabled
      if (emailNotificationsEnabled) {
        try {
          const organization = await this.organizationRepository.findOne({
            where: { id: organizationId },
          });

          if (organization && organization.email) {
            const emailHtml = this.emailTemplatesService.getOrganizationInvitationNotificationEmail(
              inviterName,
              invitedEmail,
              organizationName,
              organization.email,
              invitationId,
            );
            await this.emailService.sendEmail(
              organization.email,
              `New Invitation: ${invitedEmail} - ${organizationName}`,
              emailHtml,
            );
          }
        } catch (error) {
          console.error('Failed to send email notification to organization:', error);
          // Don't fail the invitation if email fails
        }
      }
    } catch (error) {
      console.error('Failed to send invitation notifications:', error);
      // Don't fail the invitation if notifications fail
    }
  }
}
