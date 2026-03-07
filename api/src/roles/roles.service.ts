import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Role } from '../database/entities/roles.entity';
import { Permission } from '../database/entities/permissions.entity';
import { RolePermission } from '../database/entities/role_permissions.entity';
import { Organization, OrganizationType } from '../database/entities/organizations.entity';
import {
  OrganizationMember,
  OrganizationMemberStatus,
} from '../database/entities/organization_members.entity';
import { Notification } from '../database/entities/notifications.entity';
import { Package } from '../database/entities/packages.entity';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { AssignRoleDto } from './dto/assign-role.dto';

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Role)
    private roleRepository: Repository<Role>,
    @InjectRepository(Permission)
    private permissionRepository: Repository<Permission>,
    @InjectRepository(RolePermission)
    private rolePermissionRepository: Repository<RolePermission>,
    @InjectRepository(Organization)
    private organizationRepository: Repository<Organization>,
    @InjectRepository(OrganizationMember)
    private memberRepository: Repository<OrganizationMember>,
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
    @InjectRepository(Package)
    private packageRepository: Repository<Package>,
    private dataSource: DataSource,
  ) { }

  async getRoleUsageCounts(
    userId: string,
    organizationId: string,
  ): Promise<Record<number, number>> {
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

    // Get all active members with their roles
    // Use query builder to ensure we get all members including those with default roles
    const members = await this.memberRepository
      .createQueryBuilder('member')
      .leftJoinAndSelect('member.role', 'role')
      .where('member.organization_id = :organizationId', { organizationId })
      .andWhere('member.status = :status', { status: OrganizationMemberStatus.ACTIVE })
      .getMany();

    // Count users per role
    const roleCounts: Record<number, number> = {};

    members.forEach((member) => {
      if (member.role_id) {
        const roleId = member.role_id;
        roleCounts[roleId] = (roleCounts[roleId] || 0) + 1;
      }
    });

    // Debug logging (remove in production)
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Role Usage Counts] Organization ${organizationId}:`, {
        totalMembers: members.length,
        roleCounts,
        members: members.map((m) => ({ userId: m.user_id, roleId: m.role_id, status: m.status })),
      });
    }

    return roleCounts;
  }

  async getRoles(userId: string, organizationId: string): Promise<Role[]> {
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

    // Check permission (roles.view)
    if (membership.role.is_organization_owner) {
      // Organization owner has all permissions
    } else {
      const roleWithPermissions = await this.roleRepository.findOne({
        where: { id: membership.role_id },
        relations: ['role_permissions', 'role_permissions.permission'],
      });

      const hasPermission = roleWithPermissions?.role_permissions?.some(
        (rp) => rp.permission.slug === 'roles.view',
      );

      if (!hasPermission) {
        throw new ForbiddenException('You do not have permission to view roles');
      }
    }

    // Get organization with package
    const organization = await this.organizationRepository.findOne({
      where: { id: organizationId },
      relations: ['package'],
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    // Get default/system roles (available to all organizations)
    const defaultRoles = await this.roleRepository.find({
      where: {
        organization_id: null,
        is_default: true,
        is_active: true,
      },
      relations: ['role_permissions', 'role_permissions.permission'],
      order: {
        created_at: 'ASC',
      },
    });

    // For freemium package, only return default roles (organization-owner, admin)
    if (organization.package.slug === 'freemium') {
      return defaultRoles.filter(role => role.slug !== 'branch-super-admin');
    }

    // Filter out branch-specific roles for MAIN organizations
    const filteredDefaultRoles = organization.org_type === OrganizationType.MAIN
      ? defaultRoles.filter(role => role.slug !== 'branch-super-admin')
      : defaultRoles;

    // For other packages, return default roles + organization-specific roles
    const orgRoles = await this.roleRepository.find({
      where: {
        organization_id: organizationId,
        is_active: true,
      },
      relations: ['role_permissions', 'role_permissions.permission'],
      order: {
        created_at: 'ASC',
      },
    });

    // Combine and return both organization roles and default roles
    return [...filteredDefaultRoles, ...orgRoles];
  }

  async getRolesByApp(userId: string, organizationId: string, appId: number): Promise<Role[]> {
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

    // Get app-specific roles for this organization
    const roles = await this.roleRepository.find({
      where: {
        organization_id: organizationId,
        app_id: appId,
        is_active: true,
      },
      relations: ['role_permissions', 'role_permissions.permission'],
      order: {
        created_at: 'ASC',
      },
    });

    return roles;
  }

  async getRoleById(userId: string, organizationId: string, roleId: number): Promise<Role> {
    // Verify user is member and has permission
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

    // Check permission (roles.view)
    if (membership.role.is_organization_owner) {
      // Organization owner has all permissions
    } else {
      const roleWithPermissions = await this.roleRepository.findOne({
        where: { id: membership.role_id },
        relations: ['role_permissions', 'role_permissions.permission'],
      });

      const hasPermission = roleWithPermissions?.role_permissions?.some(
        (rp) => rp.permission.slug === 'roles.view',
      );

      if (!hasPermission) {
        throw new ForbiddenException('You do not have permission to view roles');
      }
    }

    // Get role
    const role = await this.roleRepository.findOne({
      where: {
        id: roleId,
        organization_id: organizationId,
      },
      relations: ['role_permissions', 'role_permissions.permission'],
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    return role;
  }

  async createRole(userId: string, organizationId: string, dto: CreateRoleDto): Promise<Role> {
    // Organizations can no longer create custom roles directly
    // They must use role templates based on their package
    throw new BadRequestException(
      'Custom role creation is not allowed. Please use role templates from your package. Use POST /role-templates/create-role instead.',
    );
  }

  async updateRole(
    userId: string,
    organizationId: string,
    roleId: number,
    dto: UpdateRoleDto,
  ): Promise<Role> {
    // Verify user is member and has permission
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

    // Check permission (roles.edit)
    if (membership.role.is_organization_owner) {
      // Organization owner has all permissions
    } else {
      const roleWithPermissions = await this.roleRepository.findOne({
        where: { id: membership.role_id },
        relations: ['role_permissions', 'role_permissions.permission'],
      });

      const hasPermission = roleWithPermissions?.role_permissions?.some(
        (rp) => rp.permission.slug === 'roles.edit',
      );

      if (!hasPermission) {
        throw new ForbiddenException('You do not have permission to edit roles');
      }
    }

    // Get role (check both organization-specific and default roles)
    const role = await this.roleRepository.findOne({
      where: [
        {
          id: roleId,
          organization_id: organizationId,
        },
        {
          id: roleId,
          organization_id: null,
          is_default: true,
        },
      ],
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    // Cannot edit system roles or default roles
    if (role.is_system_role || role.is_default || role.organization_id === null) {
      throw new BadRequestException('System roles and default roles cannot be modified');
    }

    // Cannot edit organization owner or admin roles (hierarchy is fixed)
    if (role.is_organization_owner || role.slug === 'admin') {
      throw new BadRequestException('Organization Owner and Admin roles cannot be modified. Their hierarchy is fixed.');
    }

    // Check if slug is being changed and if it's unique
    if (dto.slug && dto.slug !== role.slug) {
      const existing = await this.roleRepository.findOne({
        where: {
          organization_id: organizationId,
          slug: dto.slug,
        },
      });
      if (existing) {
        throw new ConflictException('Role slug already exists');
      }
    }

    // Validate hierarchy_level if provided
    // Only organization owners and admins can set hierarchy levels
    if (dto.hierarchy_level !== undefined) {
      if (!membership.role.is_organization_owner && membership.role.slug !== 'admin') {
        throw new ForbiddenException('Only organization owners and admins can set role hierarchy levels');
      }

      // Hierarchy level must be >= 3 (Owner=1 and Admin=2 are fixed)
      if (dto.hierarchy_level < 3) {
        throw new BadRequestException('Hierarchy level must be 3 or higher. Organization Owner (1) and Admin (2) are fixed and cannot be changed.');
      }
    }

    // Update role
    if (dto.hierarchy_level !== undefined) {
      role.hierarchy_level = dto.hierarchy_level;
    }
    if (dto.name !== undefined) role.name = dto.name;
    if (dto.slug !== undefined) role.slug = dto.slug;
    if (dto.description !== undefined) role.description = dto.description;
    if (dto.is_active !== undefined) role.is_active = dto.is_active;

    await this.roleRepository.save(role);

    // Update permissions if provided
    if (dto.permission_ids !== undefined) {
      // Remove existing permissions
      await this.rolePermissionRepository.delete({ role_id: roleId });
      // Assign new permissions
      if (dto.permission_ids.length > 0) {
        await this.assignPermissionsToRole(roleId, dto.permission_ids);
      }
    }

    // Notify organization owners and admins about role update
    await this.notifySeniorRoles(
      organizationId,
      'role_updated',
      'Role Updated',
      `Role "${role.name}" has been updated`,
      {
        role_id: role.id,
        role_name: role.name,
        updated_by: userId,
      },
    );

    // Return updated role with permissions
    return this.getRoleById(userId, organizationId, roleId);
  }

  async deleteRole(
    userId: string,
    organizationId: string,
    roleId: number,
  ): Promise<{ message: string }> {
    // Verify user is member and has permission
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

    // Check permission (roles.delete)
    if (membership.role.is_organization_owner) {
      // Organization owner has all permissions
    } else {
      const roleWithPermissions = await this.roleRepository.findOne({
        where: { id: membership.role_id },
        relations: ['role_permissions', 'role_permissions.permission'],
      });

      const hasPermission = roleWithPermissions?.role_permissions?.some(
        (rp) => rp.permission.slug === 'roles.delete',
      );

      if (!hasPermission) {
        throw new ForbiddenException('You do not have permission to delete roles');
      }
    }

    // Get role (check both organization-specific and default roles)
    const role = await this.roleRepository.findOne({
      where: [
        {
          id: roleId,
          organization_id: organizationId,
        },
        {
          id: roleId,
          organization_id: null,
          is_default: true,
        },
      ],
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    // Cannot delete system roles or default roles
    if (role.is_system_role || role.is_default || role.organization_id === null) {
      throw new BadRequestException('System roles and default roles cannot be deleted');
    }

    // Check if role is assigned to any users
    const usersWithRole = await this.memberRepository.count({
      where: {
        organization_id: organizationId,
        role_id: roleId,
        status: OrganizationMemberStatus.ACTIVE,
      },
    });

    if (usersWithRole > 0) {
      throw new BadRequestException(
        'Cannot delete role that is assigned to users. Please reassign users first.',
      );
    }

    // Soft delete role
    await this.roleRepository.softDelete(roleId);

    // Notify organization owners and admins about role deletion
    await this.notifySeniorRoles(
      organizationId,
      'role_deleted',
      'Role Deleted',
      `Role "${role.name}" has been deleted`,
      {
        role_id: role.id,
        role_name: role.name,
        deleted_by: userId,
      },
    );

    return { message: 'Role deleted successfully' };
  }

  async getPermissions(): Promise<Permission[]> {
    // Get all permissions (not organization-specific)
    const permissions = await this.permissionRepository.find({
      order: {
        category: 'ASC',
        name: 'ASC',
      },
    });

    return permissions;
  }

  async assignRoleToUser(
    userId: string,
    organizationId: string,
    targetUserId: string,
    dto: AssignRoleDto,
  ): Promise<{ message: string }> {
    // Verify requesting user is member and has permission
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

    // Check permission (roles.assign)
    if (membership.role.is_organization_owner) {
      // Organization owner has all permissions
    } else {
      const roleWithPermissions = await this.roleRepository.findOne({
        where: { id: membership.role_id },
        relations: ['role_permissions', 'role_permissions.permission'],
      });

      const hasPermission = roleWithPermissions?.role_permissions?.some(
        (rp) => rp.permission.slug === 'roles.assign',
      );

      if (!hasPermission) {
        throw new ForbiddenException('You do not have permission to assign roles');
      }
    }

    // Verify target user is member of organization
    const targetMembership = await this.memberRepository.findOne({
      where: {
        user_id: targetUserId,
        organization_id: organizationId,
        status: OrganizationMemberStatus.ACTIVE,
      },
    });

    if (!targetMembership) {
      throw new NotFoundException('User not found in this organization');
    }

    // Get current role of target user
    const currentRole = await this.roleRepository.findOne({
      where: { id: targetMembership.role_id },
    });

    if (!currentRole) {
      throw new NotFoundException('Current role of target user not found');
    }

    // Cannot change organization owner role
    if (currentRole.is_organization_owner) {
      throw new BadRequestException('Cannot change organization owner role');
    }

    // Verify new role exists and is available for this organization
    // System/default roles (is_system_role = true or is_default = true) don't have organization_id
    // Custom roles must belong to this organization
    const newRole = await this.roleRepository
      .createQueryBuilder('role')
      .where('role.id = :roleId', { roleId: dto.role_id })
      .andWhere('role.is_active = :isActive', { isActive: true })
      .andWhere(
        '(role.is_system_role = true OR role.is_default = true OR role.organization_id = :organizationId)',
        { organizationId },
      )
      .getOne();

    if (!newRole) {
      throw new NotFoundException('Role not found or not available for this organization');
    }

    // ROLE HIERARCHY CHECKS - Critical security validation
    // Get role hierarchy levels
    const requestingRoleLevel = this.getRoleHierarchyLevel(membership.role);
    const targetCurrentRoleLevel = this.getRoleHierarchyLevel(currentRole);
    const newRoleLevel = this.getRoleHierarchyLevel(newRole);

    // Organization owners can do anything (except change other owners)
    if (!membership.role.is_organization_owner) {
      // 1. Check if requesting user can modify target user (must have higher role)
      if (requestingRoleLevel >= targetCurrentRoleLevel) {
        throw new ForbiddenException(
          'You cannot modify users with the same or higher role level. You can only modify users with lower roles.',
        );
      }

      // 2. Check if requesting user can assign the new role (must be able to assign roles at that level)
      // Requesting user can only assign roles that are lower than or equal to their own level
      // But they can only assign to users who have lower roles than them
      if (newRoleLevel <= requestingRoleLevel) {
        throw new ForbiddenException(
          'You cannot assign roles that are equal to or higher than your own role level.',
        );
      }

      // 3. Additional check: Cannot assign a role that's higher than target's current role
      // (unless you're owner, but we already checked that)
      if (newRoleLevel < targetCurrentRoleLevel) {
        throw new ForbiddenException(
          'You cannot assign a role that is higher than the user\'s current role level.',
        );
      }
    }

    // Update user's role
    targetMembership.role_id = dto.role_id;
    await this.memberRepository.save(targetMembership);

    // Notify the user whose role was changed
    const userNotification = this.notificationRepository.create({
      user_id: targetUserId,
      organization_id: organizationId,
      type: 'role_changed',
      title: 'Role Changed',
      message: `Your role has been changed to "${newRole.name}"`,
      data: {
        role_id: dto.role_id,
        role_name: newRole.name,
        changed_by: userId,
      },
    });
    await this.notificationRepository.save(userNotification);

    // Notify organization owners and admins
    await this.notifySeniorRoles(
      organizationId,
      'role_assigned',
      'Role Assigned',
      `User role has been changed to "${newRole.name}"`,
      {
        target_user_id: targetUserId,
        role_id: dto.role_id,
        role_name: newRole.name,
        assigned_by: userId,
      },
    );

    return { message: 'Role assigned successfully' };
  }

  /**
   * Notify senior roles (organization owners and admins) about important operations
   */
  private async notifySeniorRoles(
    organizationId: string,
    type: string,
    title: string,
    message: string,
    data: any,
  ): Promise<void> {
    // Get all organization owners and members with admin roles
    const seniorMembers = await this.memberRepository.find({
      where: {
        organization_id: organizationId,
        status: OrganizationMemberStatus.ACTIVE,
      },
      relations: ['role', 'user'],
    });

    // Filter to only organization owners and roles with admin permissions
    const seniorRoles = seniorMembers.filter((member) => {
      if (member.role.is_organization_owner) {
        return true;
      }
      // Notify all active members for important role operations
      return true;
    });

    // Create notifications for senior roles
    const notifications = seniorRoles.map((member) =>
      this.notificationRepository.create({
        user_id: member.user_id,
        organization_id: organizationId,
        type,
        title,
        message,
        data,
      }),
    );

    if (notifications.length > 0) {
      await this.notificationRepository.save(notifications);
    }
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

  async getAssignableRoles(userId: string, organizationId: string): Promise<Role[]> {
    // Verify user is member and has permission
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

    // Check permission (roles.assign)
    if (membership.role.is_organization_owner) {
      // Organization owner has all permissions
    } else {
      const roleWithPermissions = await this.roleRepository.findOne({
        where: { id: membership.role_id },
        relations: ['role_permissions', 'role_permissions.permission'],
      });

      const hasPermission = roleWithPermissions?.role_permissions?.some(
        (rp) => rp.permission.slug === 'roles.assign',
      );

      if (!hasPermission) {
        throw new ForbiddenException('You do not have permission to assign roles');
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

    // Get all available roles for the organization
    const defaultRoles = await this.roleRepository.find({
      where: {
        organization_id: null,
        is_default: true,
        is_active: true,
      },
    });

    const orgRoles = organization.package.slug !== 'freemium'
      ? await this.roleRepository.find({
        where: {
          organization_id: organizationId,
          is_active: true,
        },
      })
      : [];

    const allRoles = [...defaultRoles, ...orgRoles];

    // Filter out branch-specific roles for MAIN organizations
    const filteredRoles = organization.org_type === OrganizationType.MAIN
      ? allRoles.filter(role => role.slug !== 'branch-super-admin')
      : allRoles;

    // Get requesting user's hierarchy level
    const requestingRoleLevel = this.getRoleHierarchyLevel(membership.role);

    // Filter roles based on hierarchy:
    // - Organization owners can assign any role (except other owners)
    // - Other users can only assign roles with hierarchy level > their own
    const assignableRoles = filteredRoles.filter((role) => {
      // Cannot assign organization owner role
      if (role.is_organization_owner) {
        return false;
      }

      // Organization owners can assign any role except owner
      if (membership.role.is_organization_owner) {
        return true;
      }

      // Get role hierarchy level
      const roleLevel = this.getRoleHierarchyLevel(role);

      // Can only assign roles with higher hierarchy level (lower number = higher authority)
      // So we can only assign roles where level > requesting user's level
      // This means: roleLevel < requestingRoleLevel is NOT allowed
      // We need: roleLevel >= requestingRoleLevel (but roleLevel cannot equal requestingRoleLevel)
      // Actually, we want: roleLevel > requestingRoleLevel (role has lower authority)
      return roleLevel > requestingRoleLevel;
    });

    return assignableRoles;
  }

  private async assignPermissionsToRole(roleId: number, permissionIds: number[]): Promise<void> {
    // Verify all permissions exist
    const permissions = await this.permissionRepository.find({
      where: permissionIds.map((id) => ({ id })),
    });

    if (permissions.length !== permissionIds.length) {
      throw new NotFoundException('One or more permissions not found');
    }

    // Create role-permission mappings
    const rolePermissions = permissionIds.map((permissionId) =>
      this.rolePermissionRepository.create({
        role_id: roleId,
        permission_id: permissionId,
      }),
    );

    await this.rolePermissionRepository.save(rolePermissions);
  }
}
