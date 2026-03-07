import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import * as crypto from 'crypto';
import { Package } from '../database/entities/packages.entity';
import { PackageFeature, PackageFeatureType } from '../database/entities/package_features.entity';
import {
  OrganizationPackageFeature,
  OrganizationPackageFeatureStatus,
} from '../database/entities/organization_package_features.entity';
import {
  Organization,
  OrganizationType,
} from '../database/entities/organizations.entity';
import {
  OrganizationMember,
  OrganizationMemberStatus,
} from '../database/entities/organization_members.entity';
import { Role } from '../database/entities/roles.entity';
import { Permission } from '../database/entities/permissions.entity';
import { RolePermission } from '../database/entities/role_permissions.entity';
import { UpgradePackageDto, SubscriptionPeriod } from './dto/upgrade-package.dto';
import { PurchaseFeatureDto } from './dto/purchase-feature.dto';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { calculateSubscription, calculateUpgradePrice } from './utils/subscription.utils';

@Injectable()
export class PackagesService {
  constructor(
    @InjectRepository(Package)
    private packageRepository: Repository<Package>,
    @InjectRepository(PackageFeature)
    private featureRepository: Repository<PackageFeature>,
    @InjectRepository(OrganizationPackageFeature)
    private orgFeatureRepository: Repository<OrganizationPackageFeature>,
    @InjectRepository(Organization)
    private organizationRepository: Repository<Organization>,
    @InjectRepository(OrganizationMember)
    private memberRepository: Repository<OrganizationMember>,
    @InjectRepository(Role)
    private roleRepository: Repository<Role>,
    @InjectRepository(Permission)
    private permissionRepository: Repository<Permission>,
    @InjectRepository(RolePermission)
    private rolePermissionRepository: Repository<RolePermission>,
    private dataSource: DataSource,
    private auditLogsService: AuditLogsService,
  ) { }

  async getPackages(organizationId?: string): Promise<Package[]> {
    const packages = await this.packageRepository.find({
      where: { is_active: true },
      order: { sort_order: 'ASC', created_at: 'ASC' },
    });

    // If organizationId is provided, filter out freemium if they've upgraded before
    if (organizationId) {
      const organization = await this.organizationRepository.findOne({
        where: { id: organizationId },
      });

      if (organization?.has_upgraded_from_freemium) {
        return packages.filter((pkg) => pkg.slug !== 'freemium');
      }
    }

    return packages;
  }

  async getPackageById(packageId: number): Promise<Package> {
    const pkg = await this.packageRepository.findOne({
      where: { id: packageId, is_active: true },
    });

    if (!pkg) {
      throw new NotFoundException('Package not found');
    }

    return pkg;
  }

  async getCurrentPackage(
    userId: string,
    organizationId: string,
  ): Promise<{
    package: Package;
    current_limits: { users: number; roles: number; branches: number };
    active_features: OrganizationPackageFeature[];
    package_expires_at: Date | null;
    package_auto_renew: boolean;
    branch_usage: number;
  }> {
    // Verify user is member
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

    // Get organization with package
    const organization = await this.organizationRepository.findOne({
      where: { id: organizationId },
      relations: ['package'],
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    // Get active features
    const activeFeatures = await this.orgFeatureRepository.find({
      where: {
        organization_id: organizationId,
        status: OrganizationPackageFeatureStatus.ACTIVE,
      },
      relations: ['feature'],
    });
    // Ensure package is loaded - if package_id exists but package is null, reload it
    let packageData = organization.package;
    if (organization.package_id && !packageData) {
      packageData = await this.packageRepository.findOne({
        where: { id: organization.package_id, is_active: true },
      });
    }

    // Count branches (including MAIN)
    let rootOrgId = organizationId;
    if (organization.org_type === OrganizationType.BRANCH && organization.parent_id) {
      rootOrgId = organization.parent_id;
    }

    const branchUsage = await this.organizationRepository.count({
      where: [
        { id: rootOrgId },
        { parent_id: rootOrgId, org_type: OrganizationType.BRANCH },
      ],
    });

    return {
      package: packageData,
      current_limits: {
        users: organization.user_limit,
        roles: organization.role_limit,
        branches: organization.branch_limit || packageData?.base_branch_limit || 1,
      },
      active_features: activeFeatures,
      package_expires_at: organization.package_expires_at,
      package_auto_renew: organization.package_auto_renew,
      branch_usage: branchUsage,
    };
  }

  async upgradePackage(
    userId: string,
    organizationId: string,
    dto: UpgradePackageDto,
  ): Promise<{
    message: string;
    package: Package;
    new_limits: { users: number; roles: number; branches: number };
    prorated_credit?: number;
    final_price?: number;
  }> {
    // Verify user is member and has permission (packages.upgrade)
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

    // Check permission (packages.upgrade)
    if (!membership.role.is_organization_owner) {
      const roleWithPermissions = await this.roleRepository.findOne({
        where: { id: membership.role_id },
        relations: ['role_permissions', 'role_permissions.permission'],
      });

      const hasPermission = roleWithPermissions?.role_permissions?.some(
        (rp) => rp.permission.slug === 'packages.upgrade',
      );

      if (!hasPermission) {
        throw new ForbiddenException('You do not have permission to upgrade packages');
      }
    }

    // Get new package
    const newPackage = await this.packageRepository.findOne({
      where: { id: dto.package_id, is_active: true },
    });

    if (!newPackage) {
      throw new NotFoundException('Package not found');
    }

    // Get organization
    const organization = await this.organizationRepository.findOne({
      where: { id: organizationId },
      relations: ['package'],
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    // Check if already on this package (handle both string and number types)
    const currentPackageId =
      typeof organization.package_id === 'string'
        ? parseInt(organization.package_id, 10)
        : organization.package_id;
    if (currentPackageId === dto.package_id) {
      throw new ConflictException('Organization is already on this package');
    }

    // Prevent purchasing freemium if they've upgraded before
    if (newPackage.slug === 'freemium' && organization.has_upgraded_from_freemium) {
      throw new BadRequestException(
        'Freemium package is not available for purchase. It will be automatically selected when your current package expires.',
      );
    }

    // Check if this is a downgrade (lower sort_order = lower tier)
    const isDowngrade = organization.package.sort_order > newPackage.sort_order;
    const isUpgrade = organization.package.sort_order < newPackage.sort_order;

    // Prevent downgrades if package hasn't expired
    if (
      isDowngrade &&
      organization.package_expires_at &&
      organization.package_expires_at > new Date()
    ) {
      throw new BadRequestException(
        'Cannot downgrade package until current subscription expires. You can only upgrade to a higher tier package.',
      );
    }

    // Calculate new limits
    const newLimits = await this.calculateLimits(organizationId, newPackage.id);

    // Validate downgrade (if applicable and expired)
    if (isDowngrade) {
      await this.validateDowngrade(organizationId, newLimits);
    }

    // Calculate expiration date and pricing based on subscription period
    let expirationDate: Date | null = null;
    let subscriptionCalc: ReturnType<typeof calculateSubscription> | null = null;
    let proratedCredit = 0;
    let upgradePriceCalc: ReturnType<typeof calculateUpgradePrice> | null = null;

    if (newPackage.slug !== 'freemium' && newPackage.price > 0) {
      const period = dto.period || SubscriptionPeriod.THREE_MONTHS;

      // If upgrading mid-subscription, calculate prorated credit
      if (
        isUpgrade &&
        organization.package_expires_at &&
        organization.package_expires_at > new Date()
      ) {
        // Get active features to include in prorated credit
        const activeFeatures = await this.orgFeatureRepository.find({
          where: {
            organization_id: organizationId,
            status: OrganizationPackageFeatureStatus.ACTIVE,
          },
          relations: ['feature'],
        });

        // Find chat and ticket features to check if they're already purchased
        const chatFeature = await this.featureRepository.findOne({
          where: { slug: 'chat-system', is_active: true },
        });

        const ticketFeature = await this.featureRepository.findOne({
          where: { slug: 'ticket-system', is_active: true },
        });

        // If upgrading to Platinum/Diamond and chat/ticket system is already purchased, exclude it from credit calculation
        // because we'll deduct its price from the new package price instead
        const isUpgradingToPlatinumOrDiamond = newPackage.slug === 'platinum' || newPackage.slug === 'diamond';
        const hasChatPurchased = chatFeature && activeFeatures.some(
          (f) => f.feature_id === chatFeature.id
        );
        const hasTicketPurchased = ticketFeature && activeFeatures.some(
          (f) => f.feature_id === ticketFeature.id
        );

        // Calculate total current monthly cost (package + features)
        // If upgrading to Platinum/Diamond and chat/ticket system is purchased, exclude from credit calculation
        const currentPackagePrice = organization.package.price || 0;
        const activeFeaturesPrice = activeFeatures.reduce((sum, orgFeature) => {
          // Exclude chat feature price if upgrading to Platinum/Diamond (we'll deduct it separately)
          if (isUpgradingToPlatinumOrDiamond && chatFeature && orgFeature.feature_id === chatFeature.id) {
            return sum; // Don't include chat in credit calculation
          }
          // Exclude ticket system feature price if upgrading to Platinum/Diamond (we'll deduct it separately)
          if (isUpgradingToPlatinumOrDiamond && ticketFeature && orgFeature.feature_id === ticketFeature.id) {
            return sum; // Don't include ticket system in credit calculation
          }
          return sum + (orgFeature.feature?.price || 0);
        }, 0);
        const totalCurrentMonthlyPrice = currentPackagePrice + activeFeaturesPrice;

        // If upgrading to Platinum/Diamond and chat is already purchased, deduct chat price from new package price
        let adjustedNewPackagePrice = newPackage.price;
        if (isUpgradingToPlatinumOrDiamond && hasChatPurchased && chatFeature) {
          // Deduct chat feature price from new package price (like we do for user upgrades)
          adjustedNewPackagePrice = Math.max(0, adjustedNewPackagePrice - (chatFeature.price || 0));
        }
        if (isUpgradingToPlatinumOrDiamond && hasTicketPurchased && ticketFeature) {
          // Deduct ticket system feature price from new package price (like we do for user upgrades)
          adjustedNewPackagePrice = Math.max(0, adjustedNewPackagePrice - (ticketFeature.price || 0));
        }

        upgradePriceCalc = calculateUpgradePrice(
          totalCurrentMonthlyPrice,
          adjustedNewPackagePrice,
          organization.package_expires_at,
          period,
          dto.custom_months,
        );
        proratedCredit = upgradePriceCalc.creditAmount;

        // Calculate new subscription period using adjusted price
        subscriptionCalc = calculateSubscription(adjustedNewPackagePrice, period, dto.custom_months);

        // Extend expiration from current expiration date (not from now)
        expirationDate = new Date(organization.package_expires_at);
        expirationDate.setMonth(expirationDate.getMonth() + subscriptionCalc.months);
      } else {
        // New subscription or downgrade after expiration
        subscriptionCalc = calculateSubscription(newPackage.price, period, dto.custom_months);
        expirationDate = subscriptionCalc.expirationDate;
      }
    }

    // Mark as upgraded from freemium if upgrading from freemium
    const hasUpgradedFromFreemium =
      organization.package.slug === 'freemium' || organization.has_upgraded_from_freemium;

    // Update organization package using a transaction to ensure atomicity
    const oldPackageId = organization.package_id;

    // Use update() method which directly updates the database, avoiding entity caching issues
    await this.organizationRepository.update(
      { id: organizationId },
      {
        package_id: dto.package_id,
        user_limit: newLimits.users,
        role_limit: newLimits.roles,
        branch_limit: newLimits.branches,
        package_expires_at: expirationDate,
        has_upgraded_from_freemium: hasUpgradedFromFreemium,
      },
    );

    // Log the upgrade for debugging
    console.log(
      `Package upgraded for organization ${organizationId}: ${oldPackageId} -> ${dto.package_id}`,
    );
    console.log(`New limits: ${newLimits.users} users, ${newLimits.roles} roles`);

    // Reload organization with package relation using query builder to bypass cache
    const updatedOrganization = await this.organizationRepository
      .createQueryBuilder('org')
      .leftJoinAndSelect('org.package', 'package')
      .where('org.id = :id', { id: organizationId })
      .getOne();

    if (!updatedOrganization) {
      throw new NotFoundException('Organization not found after upgrade');
    }

    // Verify the package was actually updated
    if (updatedOrganization.package_id !== dto.package_id) {
      console.error(
        `Package upgrade verification failed: Expected ${dto.package_id}, got ${updatedOrganization.package_id}`,
      );
      // Log the actual database state for debugging
      const rawCheck = await this.dataSource.query(
        'SELECT package_id, user_limit, role_limit FROM organizations WHERE id = $1',
        [organizationId],
      );
      console.error(`Raw database check:`, rawCheck);
      throw new BadRequestException(
        `Package upgrade failed - package ID mismatch. Expected ${dto.package_id}, got ${updatedOrganization.package_id}`,
      );
    }

    // Ensure package relation is loaded
    if (!updatedOrganization.package) {
      updatedOrganization.package = newPackage;
    }

    console.log(
      `Package upgrade verified successfully: ${updatedOrganization.package.name} (ID: ${updatedOrganization.package.id})`,
    );

    // Cancel redundant features if new package includes them
    // If new package has unlimited users (-1), cancel any user_upgrade features
    // If new package has unlimited roles (-1), cancel any role_upgrade features
    if (newLimits.users === -1 || newLimits.roles === -1) {
      const activeFeatures = await this.orgFeatureRepository.find({
        where: {
          organization_id: organizationId,
          status: OrganizationPackageFeatureStatus.ACTIVE,
        },
        relations: ['feature'],
      });

      for (const orgFeature of activeFeatures) {
        if (
          (newLimits.users === -1 && orgFeature.feature?.type === PackageFeatureType.USER_UPGRADE) ||
          (newLimits.roles === -1 && orgFeature.feature?.type === PackageFeatureType.ROLE_UPGRADE)
        ) {
          orgFeature.status = OrganizationPackageFeatureStatus.CANCELLED;
          orgFeature.cancelled_at = new Date();
          await this.orgFeatureRepository.save(orgFeature);

          // Create audit log for feature cancellation
          await this.auditLogsService.createAuditLog(
            organizationId,
            userId,
            'package.feature.cancel',
            'organization_package_feature',
            orgFeature.id.toString(),
            {
              feature_id: orgFeature.feature_id,
              feature_name: orgFeature.feature?.name,
              status: OrganizationPackageFeatureStatus.ACTIVE,
            },
            {
              feature_id: orgFeature.feature_id,
              feature_name: orgFeature.feature?.name,
              status: OrganizationPackageFeatureStatus.CANCELLED,
              reason: 'Cancelled due to package upgrade - feature included in new package',
            },
          );
        }
      }
    }

    // Handle chat feature based on upgrade scenario
    const chatFeature = await this.featureRepository.findOne({
      where: { slug: 'chat-system', is_active: true },
    });

    if (chatFeature) {
      const existingChatFeature = await this.orgFeatureRepository.findOne({
        where: {
          organization_id: organizationId,
          feature_id: chatFeature.id,
          status: OrganizationPackageFeatureStatus.ACTIVE,
        },
      });

      // If upgrading to Platinum or Diamond
      if (newPackage.slug === 'platinum' || newPackage.slug === 'diamond') {
        // Auto-purchase chat system if not already purchased (it's free with Platinum/Diamond)
        if (!existingChatFeature) {
          const orgChatFeature = this.orgFeatureRepository.create({
            organization_id: organizationId,
            feature_id: chatFeature.id,
            status: OrganizationPackageFeatureStatus.ACTIVE,
            purchased_at: new Date(),
          });

          await this.orgFeatureRepository.save(orgChatFeature);

          // Create audit log for auto-purchase
          await this.auditLogsService.createAuditLog(
            organizationId,
            userId,
            'package.feature.auto_purchase',
            'package_feature',
            orgChatFeature.id.toString(),
            null,
            {
              feature_id: chatFeature.id,
              feature_name: chatFeature.name,
              feature_type: chatFeature.type,
              reason: 'Auto-purchased with Platinum/Diamond package (free)',
            },
          );
        }
        // If chat was already purchased, keep it active (price was already deducted from upgrade price above)

        // Assign chat permissions to Admin and Organization Owner roles
        await this.assignChatPermissionsToAdminAndOwner(organizationId);
      } else if (organization.package.slug === 'freemium' && newPackage.slug === 'basic') {
        // When upgrading from freemium to basic:
        // - If chat was purchased, keep it active
        // - If chat was not purchased, don't give it (user needs to purchase separately)
        if (existingChatFeature) {
          // Chat was purchased, keep it active - no action needed
          // Assign chat permissions to Admin and Organization Owner roles
          await this.assignChatPermissionsToAdminAndOwner(organizationId);
        }
        // If chat was not purchased, do nothing - user can purchase it separately if they want
      }
      // For other upgrade scenarios, keep existing chat feature as-is
    }

    // Handle ticket system feature based on upgrade scenario
    const ticketFeature = await this.featureRepository.findOne({
      where: { slug: 'ticket-system', is_active: true },
    });

    if (ticketFeature) {
      const existingTicketFeature = await this.orgFeatureRepository.findOne({
        where: {
          organization_id: organizationId,
          feature_id: ticketFeature.id,
          status: OrganizationPackageFeatureStatus.ACTIVE,
        },
      });

      // If upgrading to Platinum or Diamond
      if (newPackage.slug === 'platinum' || newPackage.slug === 'diamond') {
        // Auto-purchase ticket system if not already purchased (it's free with Platinum/Diamond)
        if (!existingTicketFeature) {
          const orgTicketFeature = this.orgFeatureRepository.create({
            organization_id: organizationId,
            feature_id: ticketFeature.id,
            status: OrganizationPackageFeatureStatus.ACTIVE,
            purchased_at: new Date(),
          });

          await this.orgFeatureRepository.save(orgTicketFeature);

          // Create audit log for auto-purchase
          await this.auditLogsService.createAuditLog(
            organizationId,
            userId,
            'package.feature.auto_purchase',
            'package_feature',
            orgTicketFeature.id.toString(),
            null,
            {
              feature_id: ticketFeature.id,
              feature_name: ticketFeature.name,
              feature_type: ticketFeature.type,
              reason: 'Auto-purchased with Platinum/Diamond package (free)',
            },
          );
        }
        // If ticket system was already purchased, keep it active (price was already deducted from upgrade price above)
      } else if (organization.package.slug === 'freemium' && newPackage.slug === 'basic') {
        // When upgrading from freemium to basic:
        // - If ticket system was purchased, keep it active
        // - If ticket system was not purchased, don't give it (user needs to purchase separately)
        if (existingTicketFeature) {
          // Ticket system was purchased, keep it active - no action needed
        }
        // If ticket system was not purchased, do nothing - user can purchase it separately if they want
      }
      // For other upgrade scenarios, keep existing ticket system feature as-is
    }

    // Create audit log
    const period = dto.period || SubscriptionPeriod.THREE_MONTHS;

    await this.auditLogsService.createAuditLog(
      organizationId,
      userId,
      'package.upgrade',
      'package',
      dto.package_id.toString(),
      {
        package_id: oldPackageId,
        package_name: organization.package?.name || 'Unknown',
        user_limit: organization.user_limit,
        role_limit: organization.role_limit,
        package_expires_at: organization.package_expires_at,
      },
      {
        package_id: dto.package_id,
        package_name: updatedOrganization.package.name,
        user_limit: newLimits.users,
        role_limit: newLimits.roles,
        package_expires_at: expirationDate,
        has_upgraded_from_freemium: hasUpgradedFromFreemium,
        subscription_period: period,
        subscription_months: subscriptionCalc?.months,
        subscription_discount_percent: subscriptionCalc?.discountPercent,
        subscription_original_price: subscriptionCalc?.originalPrice,
        subscription_discounted_price: subscriptionCalc?.discountedPrice,
      },
    );

    return {
      message: 'Package upgraded successfully',
      package: updatedOrganization.package,
      new_limits: newLimits,
      prorated_credit: proratedCredit,
      final_price: upgradePriceCalc?.finalPrice || subscriptionCalc?.discountedPrice || 0,
    };
  }

  async getPackageFeatures(): Promise<PackageFeature[]> {
    const features = await this.featureRepository.find({
      where: { is_active: true },
      order: { created_at: 'ASC' },
    });

    return features;
  }

  async purchaseFeature(
    userId: string,
    organizationId: string,
    dto: PurchaseFeatureDto,
  ): Promise<{ message: string; feature: OrganizationPackageFeature }> {
    // Verify user is member and has permission (packages.features.purchase)
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

    // Check permission
    if (!membership.role.is_organization_owner) {
      const roleWithPermissions = await this.roleRepository.findOne({
        where: { id: membership.role_id },
        relations: ['role_permissions', 'role_permissions.permission'],
      });

      const hasPermission = roleWithPermissions?.role_permissions?.some(
        (rp) => rp.permission.slug === 'packages.features.purchase',
      );

      if (!hasPermission) {
        throw new ForbiddenException('You do not have permission to purchase features');
      }
    }

    // Get feature
    const feature = await this.featureRepository.findOne({
      where: { id: dto.package_feature_id, is_active: true },
    });

    if (!feature) {
      throw new NotFoundException('Feature not found');
    }

    // Check if already purchased
    const existing = await this.orgFeatureRepository.findOne({
      where: {
        organization_id: organizationId,
        feature_id: dto.package_feature_id,
        status: OrganizationPackageFeatureStatus.ACTIVE,
      },
    });

    if (existing) {
      throw new ConflictException('Feature is already active for this organization');
    }

    // Get organization
    const organization = await this.organizationRepository.findOne({
      where: { id: organizationId },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    // Create organization feature
    const orgFeature = this.orgFeatureRepository.create({
      organization_id: organizationId,
      feature_id: dto.package_feature_id,
      status: OrganizationPackageFeatureStatus.ACTIVE,
      purchased_at: new Date(),
    });

    const savedFeature = await this.orgFeatureRepository.save(orgFeature);

    // Update organization limits based on feature
    await this.updateOrganizationLimits(organizationId);

    // If chat feature is purchased, automatically assign chat permissions to Admin and Organization Owner roles
    if (feature.slug === 'chat-system' || (feature.type === PackageFeatureType.SUPPORT && feature.name?.toLowerCase().includes('chat'))) {
      await this.assignChatPermissionsToAdminAndOwner(organizationId);
    }

    // Create audit log
    await this.auditLogsService.createAuditLog(
      organizationId,
      userId,
      'package.feature.purchase',
      'package_feature',
      savedFeature.id.toString(),
      null,
      {
        feature_id: dto.package_feature_id,
        feature_name: feature.name,
        feature_type: feature.type,
        feature_value: feature.value,
        feature_price: feature.price,
      },
    );

    return {
      message: 'Feature purchased successfully',
      feature: savedFeature,
    };
  }

  async cancelFeature(
    userId: string,
    organizationId: string,
    featureId: number,
  ): Promise<{ message: string }> {
    // Verify user is member and has permission (packages.features.cancel)
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

    // Check permission
    if (!membership.role.is_organization_owner) {
      const roleWithPermissions = await this.roleRepository.findOne({
        where: { id: membership.role_id },
        relations: ['role_permissions', 'role_permissions.permission'],
      });

      const hasPermission = roleWithPermissions?.role_permissions?.some(
        (rp) => rp.permission.slug === 'packages.features.cancel',
      );

      if (!hasPermission) {
        throw new ForbiddenException('You do not have permission to cancel features');
      }
    }

    // Get organization feature
    const orgFeature = await this.orgFeatureRepository.findOne({
      where: {
        id: featureId,
        organization_id: organizationId,
        status: OrganizationPackageFeatureStatus.ACTIVE,
      },
      relations: ['feature'],
    });

    if (!orgFeature) {
      throw new NotFoundException('Feature not found or not active');
    }

    // Cancel feature
    orgFeature.status = OrganizationPackageFeatureStatus.CANCELLED;
    orgFeature.cancelled_at = new Date();
    await this.orgFeatureRepository.save(orgFeature);

    // Recalculate limits
    await this.updateOrganizationLimits(organizationId);

    // Validate that current usage doesn't exceed new limits
    const organization = await this.organizationRepository.findOne({
      where: { id: organizationId },
    });

    // Check user limit
    const activeUsers = await this.memberRepository.count({
      where: {
        organization_id: organizationId,
        status: OrganizationMemberStatus.ACTIVE,
      },
    });

    if (activeUsers > organization.user_limit) {
      throw new BadRequestException(
        `Cannot cancel feature: Current user count (${activeUsers}) exceeds new limit (${organization.user_limit}). Please remove users first.`,
      );
    }

    // Check role limit - only count custom roles (exclude default roles: owner and admin)
    // Default roles (is_default = true or organization_id = null) don't count against the limit
    const activeCustomRoles = await this.roleRepository.count({
      where: {
        organization_id: organizationId,
        is_active: true,
        is_default: false, // Exclude default roles
      },
    });

    if (organization.role_limit !== -1 && activeCustomRoles > organization.role_limit) {
      throw new BadRequestException(
        `Cannot cancel feature: Current custom role count (${activeCustomRoles}) exceeds new limit (${organization.role_limit}). Default roles (Organization Owner and Admin) are not counted. Please remove custom roles first.`,
      );
    }

    // Create audit log
    await this.auditLogsService.createAuditLog(
      organizationId,
      userId,
      'package.feature.cancel',
      'package_feature',
      orgFeature.id.toString(),
      {
        feature_id: orgFeature.feature_id,
        feature_name: orgFeature.feature?.name || 'Unknown',
        status: OrganizationPackageFeatureStatus.ACTIVE,
      },
      {
        feature_id: orgFeature.feature_id,
        feature_name: orgFeature.feature?.name || 'Unknown',
        status: OrganizationPackageFeatureStatus.CANCELLED,
        cancelled_at: orgFeature.cancelled_at,
      },
    );

    return { message: 'Feature cancelled successfully' };
  }

  async calculateUpgradePrice(
    userId: string,
    organizationId: string,
    dto: UpgradePackageDto,
  ): Promise<{
    new_package_price: number;
    prorated_credit: number;
    final_price: number;
    remaining_days: number | null;
    can_upgrade: boolean;
    reason?: string;
  }> {
    // Verify user is member
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

    // Get current organization
    const organization = await this.organizationRepository.findOne({
      where: { id: organizationId },
      relations: ['package'],
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    // Get new package
    const newPackage = await this.packageRepository.findOne({
      where: { id: dto.package_id, is_active: true },
    });

    if (!newPackage) {
      throw new NotFoundException('Package not found');
    }

    // Check if this is a downgrade
    const isDowngrade = organization.package.sort_order > newPackage.sort_order;

    // Prevent downgrades if package hasn't expired
    if (
      isDowngrade &&
      organization.package_expires_at &&
      organization.package_expires_at > new Date()
    ) {
      return {
        new_package_price: 0,
        prorated_credit: 0,
        final_price: 0,
        remaining_days: null,
        can_upgrade: false,
        reason:
          'Cannot downgrade package until current subscription expires. You can only upgrade to a higher tier package.',
      };
    }

    // Get active features to include in prorated credit calculation
    const activeFeatures = await this.orgFeatureRepository.find({
      where: {
        organization_id: organizationId,
        status: OrganizationPackageFeatureStatus.ACTIVE,
      },
      relations: ['feature'],
    });

    // Calculate total current monthly cost (package + features)
    const currentPackagePrice = organization.package.price || 0;
    const activeFeaturesPrice = activeFeatures.reduce((sum, orgFeature) => {
      return sum + (orgFeature.feature?.price || 0);
    }, 0);
    const totalCurrentMonthlyPrice = currentPackagePrice + activeFeaturesPrice;

    // Calculate upgrade price
    const period = dto.period || SubscriptionPeriod.THREE_MONTHS;

    // Calculate prorated credit from total current cost (package + features)
    const upgradePriceCalc = calculateUpgradePrice(
      totalCurrentMonthlyPrice,
      newPackage.price,
      organization.package_expires_at,
      period,
      dto.custom_months,
    );

    const remainingDays = upgradePriceCalc.proratedCredit
      ? upgradePriceCalc.proratedCredit.remainingDays
      : null;

    return {
      new_package_price: upgradePriceCalc.newPackagePrice,
      prorated_credit: upgradePriceCalc.creditAmount,
      final_price: upgradePriceCalc.finalPrice,
      remaining_days: remainingDays,
      can_upgrade: true,
    };
  }

  private encryptCredentials(credentials: any): string {
    // Use environment variable for encryption key, fallback to a default (not recommended for production)
    const encryptionKey = process.env.ENCRYPTION_KEY || 'default-encryption-key-change-in-production';
    const algorithm = 'aes-256-cbc';
    const key = crypto.scryptSync(encryptionKey, 'salt', 32);
    const iv = crypto.randomBytes(16);

    const cipher = crypto.createCipheriv(algorithm, key, iv);
    const credentialsJson = JSON.stringify(credentials);
    let encrypted = cipher.update(credentialsJson, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    // Return IV + encrypted data (IV is needed for decryption)
    return iv.toString('hex') + ':' + encrypted;
  }

  async toggleAutoRenew(
    userId: string,
    organizationId: string,
    enabled: boolean,
    credentials?: {
      payment_method: 'esewa' | 'stripe';
      esewa_username?: string;
      stripe_card_token?: string;
      card_last4?: string;
      card_brand?: string;
    },
  ): Promise<{ message: string; auto_renew: boolean }> {
    // Verify user is member and has permission (packages.upgrade)
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

    // Check permission (packages.upgrade)
    if (!membership.role.is_organization_owner) {
      const roleWithPermissions = await this.roleRepository.findOne({
        where: { id: membership.role_id },
        relations: ['role_permissions', 'role_permissions.permission'],
      });

      const hasPermission = roleWithPermissions?.role_permissions?.some(
        (rp) => rp.permission.slug === 'packages.upgrade',
      );

      if (!hasPermission) {
        throw new ForbiddenException('You do not have permission to manage package settings');
      }
    }

    // Get organization
    const organization = await this.organizationRepository.findOne({
      where: { id: organizationId },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    // If enabling auto-renewal, credentials are required
    if (enabled && !credentials) {
      throw new BadRequestException('Payment credentials are required to enable auto-renewal');
    }

    // Validate credentials based on payment method
    if (enabled && credentials) {
      if (credentials.payment_method === 'esewa' && !credentials.esewa_username?.trim()) {
        throw new BadRequestException('eSewa username is required');
      }
      if (credentials.payment_method === 'stripe' && !credentials.stripe_card_token) {
        throw new BadRequestException('Stripe card token is required');
      }
    }

    // Store old value for audit log
    const oldAutoRenew = organization.package_auto_renew;
    const oldHasCredentials = !!organization.package_auto_renew_credentials;

    // Update auto-renewal setting
    organization.package_auto_renew = enabled;

    // Encrypt and save credentials if provided
    if (enabled && credentials) {
      organization.package_auto_renew_credentials = this.encryptCredentials(credentials);
    } else if (!enabled) {
      // Clear credentials when disabling
      organization.package_auto_renew_credentials = null;
    }

    await this.organizationRepository.save(organization);

    // Create audit log
    await this.auditLogsService.createAuditLog(
      organizationId,
      userId,
      'package.auto_renew.toggle',
      'organization',
      organizationId,
      {
        package_auto_renew: oldAutoRenew,
        has_credentials: oldHasCredentials,
      },
      {
        package_auto_renew: enabled,
        has_credentials: enabled && !!credentials,
        payment_method: credentials?.payment_method,
      },
    );

    return {
      message: enabled ? 'Auto-renewal enabled' : 'Auto-renewal disabled',
      auto_renew: enabled,
    };
  }

  private async calculateLimits(
    organizationId: string,
    packageId: number,
  ): Promise<{ users: number; roles: number; branches: number }> {
    // Get package
    const pkg = await this.packageRepository.findOne({
      where: { id: packageId },
    });

    if (!pkg) {
      throw new NotFoundException('Package not found');
    }

    // Start with base limits
    let userLimit = pkg.base_user_limit;
    // Role limit = base roles + additional roles from package
    let roleLimit = pkg.base_role_limit + pkg.additional_role_limit;
    // Branch limit = base branches from package
    let branchLimit = pkg.base_branch_limit;

    // Get active features for organization
    const activeFeatures = await this.orgFeatureRepository.find({
      where: {
        organization_id: organizationId,
        status: OrganizationPackageFeatureStatus.ACTIVE,
      },
      relations: ['feature'],
    });

    // Apply feature upgrades
    for (const orgFeature of activeFeatures) {
      const feature = orgFeature.feature;
      if (feature.type === PackageFeatureType.USER_UPGRADE) {
        if (feature.value === null) {
          // Unlimited
          userLimit = -1; // -1 = unlimited
        } else if (userLimit !== -1) {
          // Only update if not already unlimited
          userLimit = Math.max(userLimit, feature.value);
        }
      } else if (feature.type === PackageFeatureType.ROLE_UPGRADE) {
        if (feature.value === null) {
          // Unlimited
          roleLimit = -1; // -1 = unlimited
        } else if (roleLimit !== -1) {
          // Only update if not already unlimited
          roleLimit = Math.max(roleLimit, feature.value);
        }
      }
    }

    return { users: userLimit, roles: roleLimit, branches: branchLimit };
  }

  private async updateOrganizationLimits(organizationId: string): Promise<void> {
    const organization = await this.organizationRepository.findOne({
      where: { id: organizationId },
      relations: ['package'],
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    const limits = await this.calculateLimits(organizationId, organization.package_id);
    organization.user_limit = limits.users;
    organization.role_limit = limits.roles;
    organization.branch_limit = limits.branches;

    await this.organizationRepository.save(organization);
  }

  private async validateDowngrade(
    organizationId: string,
    newLimits: { users: number; roles: number; branches: number },
  ): Promise<void> {
    // Check current user count
    const currentUsers = await this.memberRepository.count({
      where: {
        organization_id: organizationId,
        status: OrganizationMemberStatus.ACTIVE,
      },
    });

    if (newLimits.users !== -1 && currentUsers > newLimits.users) {
      throw new BadRequestException(
        `Cannot downgrade: Current user count (${currentUsers}) exceeds new limit (${newLimits.users}). Please remove users first.`,
      );
    }

    // Check current role count - only count custom roles (exclude default roles: owner and admin)
    // Default roles (is_default = true or organization_id = null) don't count against the limit
    const currentCustomRoles = await this.roleRepository.count({
      where: {
        organization_id: organizationId,
        is_active: true,
        is_default: false, // Exclude default roles
      },
    });

    if (newLimits.roles !== -1 && currentCustomRoles > newLimits.roles) {
      throw new BadRequestException(
        `Cannot downgrade: Current custom role count (${currentCustomRoles}) exceeds new limit (${newLimits.roles}). Default roles (Organization Owner and Admin) are not counted. Please remove custom roles first.`,
      );
    }

    // Check current branch count
    const currentBranches = await this.organizationRepository.count({
      where: {
        parent_id: organizationId,
        org_type: OrganizationType.BRANCH,
      },
    });

    if (newLimits.branches !== -1 && currentBranches > newLimits.branches) {
      throw new BadRequestException(
        `Cannot downgrade: Current branch count (${currentBranches}) exceeds new limit (${newLimits.branches}). Please remove branches first.`,
      );
    }
  }

  /**
   * Automatically assign chat permissions and users.view to Admin and Organization Owner roles
   * when chat feature is purchased
   */
  private async assignChatPermissionsToAdminAndOwner(organizationId: string): Promise<void> {
    // Get all chat permissions
    const chatPermissions = await this.permissionRepository.find({
      where: [
        { slug: 'chat.view' },
        { slug: 'chat.create_group' },
        { slug: 'chat.manage_group' },
        { slug: 'chat.delete' },
        { slug: 'chat.initiate_call' },
      ],
    });

    // Also get users.view permission (needed for Members and Online Now features)
    const usersViewPermission = await this.permissionRepository.findOne({
      where: { slug: 'users.view' },
    });

    const permissionsToAssign = [...chatPermissions];
    if (usersViewPermission) {
      permissionsToAssign.push(usersViewPermission);
    }

    if (permissionsToAssign.length === 0) {
      return; // Permissions not found, skip
    }

    // Get Admin and Organization Owner roles (system roles)
    const adminRole = await this.roleRepository.findOne({
      where: { slug: 'admin', is_system_role: true },
    });

    const ownerRole = await this.roleRepository.findOne({
      where: { slug: 'organization-owner', is_system_role: true },
    });

    // Assign permissions to Admin role
    if (adminRole) {
      for (const permission of permissionsToAssign) {
        // Check if permission already exists
        const existing = await this.rolePermissionRepository.findOne({
          where: {
            role_id: adminRole.id,
            permission_id: permission.id,
          },
        });

        if (!existing) {
          await this.rolePermissionRepository.save(
            this.rolePermissionRepository.create({
              role_id: adminRole.id,
              permission_id: permission.id,
            }),
          );
        }
      }
    }

    // Assign permissions to Organization Owner role
    if (ownerRole) {
      for (const permission of permissionsToAssign) {
        // Check if permission already exists
        const existing = await this.rolePermissionRepository.findOne({
          where: {
            role_id: ownerRole.id,
            permission_id: permission.id,
          },
        });

        if (!existing) {
          await this.rolePermissionRepository.save(
            this.rolePermissionRepository.create({
              role_id: ownerRole.id,
              permission_id: permission.id,
            }),
          );
        }
      }
    }
  }

  async repairBranchLimits(organizationId: string): Promise<{ message: string; results: any[] }> {
    // This is a repair tool to fix mismatched branch limits
    const organizations = await this.organizationRepository.find({
      where: { org_type: OrganizationType.MAIN },
      relations: ['package'],
    });

    const repaired = [];
    for (const org of organizations) {
      if (org.package && org.branch_limit !== org.package.base_branch_limit) {
        const oldLimit = org.branch_limit;
        org.branch_limit = org.package.base_branch_limit;
        await this.organizationRepository.save(org);
        repaired.push({
          name: org.name,
          old_limit: oldLimit,
          new_limit: org.branch_limit,
        });
      }
    }

    return {
      message: `Repaired branch limits for ${repaired.length} organizations`,
      results: repaired,
    };
  }
}
