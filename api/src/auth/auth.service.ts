import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import * as speakeasy from 'speakeasy';
import { User, UserStatus } from '../database/entities/users.entity';
import { Organization, OrganizationStatus, OrganizationType } from '../database/entities/organizations.entity';
import {
  OrganizationMember,
  OrganizationMemberStatus,
} from '../database/entities/organization_members.entity';
import { Role } from '../database/entities/roles.entity';
import { Package } from '../database/entities/packages.entity';
import {
  EmailVerification,
  EmailVerificationType,
} from '../database/entities/email_verifications.entity';
import { Session } from '../database/entities/sessions.entity';
import { EmailService } from '../common/services/email.service';
import { RedisService } from '../common/services/redis.service';
import { SparrowSmsService } from '../communication/sparrow-sms.service';
import { RegisterOrganizationDto } from './dto/register-organization.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyMfaLoginDto } from './dto/verify-mfa-login.dto';
import { LoginWithMfaDto } from './dto/login-with-mfa.dto';
import { JwtPayload } from './strategies/jwt.strategy';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Organization)
    private organizationRepository: Repository<Organization>,
    @InjectRepository(OrganizationMember)
    private memberRepository: Repository<OrganizationMember>,
    @InjectRepository(Role)
    private roleRepository: Repository<Role>,
    @InjectRepository(Package)
    private packageRepository: Repository<Package>,
    @InjectRepository(EmailVerification)
    private emailVerificationRepository: Repository<EmailVerification>,
    @InjectRepository(Session)
    private sessionRepository: Repository<Session>,
    private jwtService: JwtService,
    private configService: ConfigService,
    private emailService: EmailService,
    private redisService: RedisService,
    private dataSource: DataSource,
    private sparrowSmsService: SparrowSmsService,
  ) { }

  async validateUser(email: string, password: string): Promise<User | null> {
    const normalizedEmail = email.toLowerCase().trim();
    const user = await this.userRepository.findOne({
      where: { email: normalizedEmail, status: UserStatus.ACTIVE },
    });

    if (!user || !user.password_hash) {
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return null;
    }

    return user;
  }

  /**
   * Lightweight password check used for app re-auth flows.
   */
  async verifyPassword(email: string, password: string): Promise<boolean> {
    try {
      const user = await this.userRepository.findOne({
        where: { email, status: UserStatus.ACTIVE },
      });

      if (!user || !user.password_hash) {
        return false;
      }

      return await bcrypt.compare(password, user.password_hash);
    } catch (error) {
      console.error('Password verification error:', error);
      return false;
    }
  }

  async registerOrganization(
    dto: RegisterOrganizationDto,
    origin?: string,
  ): Promise<{ message: string; organization_id?: string; user_id?: string }> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Check if organization name already exists
      const existingOrgByName = await this.organizationRepository.findOne({
        where: { name: dto.name },
      });

      if (existingOrgByName) {
        throw new ConflictException('Organization name already exists');
      }

      // IMPORTANT EMAIL VALIDATION RULES:
      // 1. Organization email must be unique across ALL organizations
      // 2. An owner email CAN equal the organization email (for the same organization)
      // 3. BUT if an email is already used as an organization email for one organization,
      //    it CANNOT be used as an organization email for another organization
      //    (even if the owner's email matches)
      // Example: Owner1 (abcd@gmail.com) can create Org1 with email abcd@gmail.com ✅
      //          But Owner2 (abcd@gmail.com) CANNOT create Org2 with email abcd@gmail.com ❌
      //          (because abcd@gmail.com is already Org1's email)

      // Check if organization email already exists (must be unique across all organizations)
      const orgEmail = dto.email.toLowerCase().trim();
      const existingOrgByEmail = await this.organizationRepository.findOne({
        where: { email: orgEmail },
      });

      if (existingOrgByEmail) {
        throw new ConflictException(
          'This email address is already used as an organization email for another organization. ' +
          'Organization emails must be unique across all organizations. ' +
          'Even if this email matches your owner email, you must use a different email address for this organization.',
        );
      }

      // Get default package (Freemium) if not specified
      const packageId = dto.package_id || 1;
      const pkg = await this.packageRepository.findOne({
        where: { id: packageId },
      });

      if (!pkg) {
        throw new NotFoundException('Package not found');
      }

      // Generate organization slug
      const slug = this.generateSlug(dto.name);

      // Check if slug already exists
      const existingSlug = await this.organizationRepository.findOne({
        where: { slug },
      });

      if (existingSlug) {
        throw new ConflictException('Organization name is already taken');
      }

      // Handle organization owner (new or existing user)
      let ownerUser: User;

      const ownerEmail = dto.owner_email.toLowerCase().trim();
      if (dto.is_existing_user) {
        // Existing user - must be logged in (handled by controller/auth guard)
        ownerUser = await this.userRepository.findOne({
          where: { email: ownerEmail, status: UserStatus.ACTIVE },
        });

        if (!ownerUser) {
          throw new NotFoundException('User not found');
        }

        // IMPORTANT: Check if this owner already has an organization with the same email as organization email
        // Rule: An owner email can be used as organization email for ONLY ONE organization
        // Even if the owner email matches the organization email, if they already have another org with that email, it's not allowed
        const ownerOrganizations = await this.memberRepository.find({
          where: {
            user_id: ownerUser.id,
            status: OrganizationMemberStatus.ACTIVE,
          },
          relations: ['organization'],
        });

        // Check if owner already has an organization where the organization email equals the owner email
        const hasOrgWithOwnerEmail = ownerOrganizations.some(
          (membership) => membership.organization.email === ownerEmail,
        );

        // If the new organization email equals owner email AND owner already has an org with that email, reject
        if (orgEmail === ownerEmail && hasOrgWithOwnerEmail) {
          throw new ConflictException(
            `You already have an organization with email "${ownerEmail}". ` +
            `An email address can only be used as an organization email for one organization. ` +
            `Please use a different email address for this organization.`,
          );
        }

        // Send verification email to existing user if not verified
        if (!ownerUser.email_verified) {
          const verificationToken = crypto.randomBytes(32).toString('hex');
          const emailVerification = this.emailVerificationRepository.create({
            user_id: ownerUser.id,
            email: ownerUser.email,
            token: verificationToken,
            type: EmailVerificationType.REGISTRATION,
            expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
          });

          await queryRunner.manager.save(emailVerification);

          const appUrl = origin || this.configService.get<string>('FRONTEND_URL', 'http://localhost:3001');
          const verificationUrl = `${appUrl}/verify-email?token=${verificationToken}`;
          try {
            await this.emailService.sendEmail(
              ownerUser.email,
              'Verify Your Email Address',
              `
                <h2>Welcome to ${dto.name}!</h2>
                <p>Please verify your email address by clicking the link below:</p>
                <p><a href="${verificationUrl}">Verify Email</a></p>
                <p>This link will expire in 24 hours.</p>
              `,
            );
          } catch (emailError) {
            // Log email error but don't fail registration
            console.error('[AuthService] Failed to send verification email:', emailError);
            console.warn('[AuthService] Organization registration will continue despite email error');
          }
        }
      } else {
        // New user - check if email already exists
        const existingUser = await this.userRepository.findOne({
          where: { email: ownerEmail },
        });

        if (existingUser) {
          throw new ConflictException('User with this email already exists');
        }

        // Validate required fields for new user
        if (!dto.owner_password || !dto.owner_first_name || !dto.owner_last_name) {
          throw new BadRequestException(
            'Password, first name, and last name are required for new users',
          );
        }

        // Create new user
        const passwordHash = await bcrypt.hash(dto.owner_password, 10);
        ownerUser = this.userRepository.create({
          email: ownerEmail,
          password_hash: passwordHash,
          first_name: dto.owner_first_name,
          last_name: dto.owner_last_name,
          phone: dto.owner_phone || null,
          email_verified: false,
          status: UserStatus.ACTIVE,
        });

        await queryRunner.manager.save(ownerUser);

        // Generate email verification token
        const verificationToken = crypto.randomBytes(32).toString('hex');
        const emailVerification = this.emailVerificationRepository.create({
          user_id: ownerUser.id,
          email: ownerUser.email,
          token: verificationToken,
          type: EmailVerificationType.REGISTRATION,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        });

        await queryRunner.manager.save(emailVerification);

        // Send verification email (non-fatal if email not configured)
        const appUrl = origin || this.configService.get<string>('FRONTEND_URL', 'http://localhost:3001');
        const verificationUrl = `${appUrl}/verify-email?token=${verificationToken}`;
        try {
          await this.emailService.sendEmail(
            ownerUser.email,
            'Verify Your Email Address',
            `
              <h2>Welcome to ${dto.name}!</h2>
              <p>Please verify your email address by clicking the link below:</p>
              <p><a href="${verificationUrl}">Verify Email</a></p>
              <p>This link will expire in 24 hours.</p>
            `,
          );
        } catch (emailError) {
          console.error('[AuthService] Failed to send verification email:', emailError);
          console.warn('[AuthService] Organization registration will continue despite email error');
        }
      }

      // Create organization (email_verified defaults to false)
      const organization = this.organizationRepository.create({
        name: dto.name,
        slug,
        email: orgEmail,
        phone: dto.phone || null,
        address: dto.address || null,
        city: dto.city || null,
        state: dto.state || null,
        country: dto.country || null,
        postal_code: dto.postal_code || null,
        website: dto.website || null,
        description: dto.description || null,
        package_id: packageId,
        status: OrganizationStatus.ACTIVE,
        mfa_enabled: false,
        email_verified: false, // Organization email must be verified
        timezone: dto.timezone,
        currency: dto.currency,
        language: dto.language,
        branch_limit: pkg.base_branch_limit,
      });

      const savedOrganization = await queryRunner.manager.save(organization);

      // Get Organization Owner role
      const ownerRole = await this.roleRepository.findOne({
        where: { slug: 'organization-owner', is_system_role: true },
      });

      if (!ownerRole) {
        throw new NotFoundException('Organization Owner role not found');
      }

      // Create organization membership for owner in the MAIN organization
      const mainMembership = this.memberRepository.create({
        user_id: ownerUser.id,
        organization_id: savedOrganization.id,
        role_id: ownerRole.id,
        status: OrganizationMemberStatus.ACTIVE,
        joined_at: new Date(),
      });

      await queryRunner.manager.save(mainMembership);

      // Generate organization email verification token
      const orgVerificationToken = crypto.randomBytes(32).toString('hex');
      const orgEmailVerification = this.emailVerificationRepository.create({
        user_id: ownerUser.id, // Link to owner for now, but mark as organization email
        email: savedOrganization.email,
        token: orgVerificationToken,
        type: EmailVerificationType.ORGANIZATION_EMAIL,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      });

      await queryRunner.manager.save(orgEmailVerification);

      // Prepare organization details for email
      const organizationDetails = {
        phone: savedOrganization.phone,
        address: savedOrganization.address,
        city: savedOrganization.city,
        state: savedOrganization.state,
        country: savedOrganization.country,
        postal_code: savedOrganization.postal_code,
        website: savedOrganization.website,
        description: savedOrganization.description,
      };

      // Get owner's full name
      const ownerFullName =
        `${ownerUser.first_name} ${ownerUser.last_name}`.trim() || ownerUser.email;

      // Send organization creation notification email to organization email
      const appUrl = origin || this.configService.get<string>('FRONTEND_URL', 'http://localhost:3001');
      const orgVerificationUrl = `${appUrl}/verify-email?token=${orgVerificationToken}`;
      try {
        await this.emailService.sendOrganizationCreatedEmail(
          savedOrganization.email,
          savedOrganization.name,
          ownerFullName,
          ownerUser.email,
          organizationDetails,
          orgVerificationUrl,
          {
            name: pkg.name,
            description: pkg.description,
            base_user_limit: pkg.base_user_limit,
            base_role_limit: pkg.base_role_limit,
            // Convert price from decimal (string) to number if it exists
            price: pkg.price !== null && pkg.price !== undefined ? Number(pkg.price) : null,
          },
          origin,
        );
      } catch (emailError) {
        // Log email error but don't fail registration
        console.error('[AuthService] Failed to send organization creation email:', emailError);
        console.warn('[AuthService] Organization registration will continue despite email error');
      }

      await queryRunner.commitTransaction();

      return {
        message:
          'Organization registered successfully. Please check your email to verify both your personal and organization email addresses.',
        organization_id: savedOrganization.id,
        user_id: ownerUser.id,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      console.error('[AuthService] Organization registration error:', error);
      if (error instanceof Error) {
        console.error('[AuthService] Error message:', error.message);
        console.error('[AuthService] Error stack:', error.stack);
      }
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async loginWithoutOrganization(loginDto: LoginDto): Promise<any> {
    const user = await this.validateUser(loginDto.email, loginDto.password);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Email verification check - MANDATORY (no development bypass)
    if (!user.email_verified) {
      throw new UnauthorizedException(
        'Please verify your email address before logging in. Check your inbox for the verification email.',
      );
    }

    // Get user's organizations
    const memberships = await this.memberRepository.find({
      where: {
        user_id: user.id,
        status: OrganizationMemberStatus.ACTIVE,
      },
      relations: ['organization', 'role'],
    });

    if (memberships.length === 0) {
      throw new UnauthorizedException('You are not a member of any organization');
    }

    // Filter out MAIN accounts if user has a membership in a BRANCH of that MAIN account
    // This reduces confusion during initial registration/login
    const parentIdsWithBranches = memberships
      .filter((m) => m.organization.org_type === (OrganizationType.BRANCH as any) && m.organization.parent_id)
      .map((m) => m.organization.parent_id);

    const filteredMemberships = memberships.filter((m) => {
      // If it's a MAIN account and there is at least one branch for it in the user's memberships, hide the MAIN account
      if (
        m.organization.org_type === (OrganizationType.MAIN as any) &&
        parentIdsWithBranches.includes(m.organization.id)
      ) {
        return false;
      }
      return true;
    });

    // If user has only one organization (after filtering), automatically use it
    if (filteredMemberships.length === 1) {
      return this.login(loginDto, filteredMemberships[0].organization_id);
    }

    // Return organizations for user to select
    return {
      requires_organization_selection: true,
      organizations: filteredMemberships.map((m) => ({
        id: m.organization_id,
        name: m.organization.org_type === (OrganizationType.MAIN as any) ? 'Main Branch' : m.organization.name,
        slug: m.organization.slug,
        org_type: m.organization.org_type,
        role: m.role?.name || 'Member',
      })),
      message: 'Please select an organization to continue',
    };
  }

  /**
   * System admin login - bypasses organization requirements
   */
  async systemAdminLogin(loginDto: LoginDto): Promise<any> {
    const user = await this.validateUser(loginDto.email, loginDto.password);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if user is system admin
    if (!user.is_system_admin) {
      throw new UnauthorizedException('System administrator access required');
    }

    // Email verification check - MANDATORY
    if (!user.email_verified) {
      throw new UnauthorizedException(
        'Please verify your email address before logging in. Check your inbox for the verification email.',
      );
    }

    // Update last login
    user.last_login_at = new Date();
    await this.userRepository.save(user);

    // Generate tokens for system admin (no organization context)
    const payload = {
      sub: user.id,
      email: user.email,
      is_system_admin: true,
      system_admin_role: user.system_admin_role,
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

    // Create session (no organization_id for system admin)
    const sessionId = crypto.randomUUID();
    const session = this.sessionRepository.create({
      id: sessionId,
      user_id: user.id,
      organization_id: null, // System admin has no organization
      refresh_token: await bcrypt.hash(refreshToken, 10),
      expires_at: new Date(
        Date.now() +
        parseInt(
          this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '7d').replace('d', ''),
        ) *
        24 *
        60 *
        60 *
        1000,
      ),
    });

    await this.sessionRepository.save(session);

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        avatar_url: user.avatar_url,
        is_system_admin: true,
        system_admin_role: user.system_admin_role,
      },
      organization: null, // System admin has no organization
    };
  }

  async login(loginDto: LoginDto, organizationId: string): Promise<any> {
    const user = await this.validateUser(loginDto.email, loginDto.password);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Email verification check - MANDATORY (no development bypass)
    if (!user.email_verified) {
      throw new UnauthorizedException(
        'Please verify your email address before logging in. Check your inbox for the verification email.',
      );
    }

    // Get user's membership in the organization
    const membership = await this.memberRepository.findOne({
      where: {
        user_id: user.id,
        organization_id: organizationId,
        status: OrganizationMemberStatus.ACTIVE,
      },
      relations: ['role', 'organization'],
    });

    if (!membership) {
      throw new UnauthorizedException('You are not a member of this organization');
    }

    // Ensure organization relation is loaded
    if (!membership.organization) {
      throw new UnauthorizedException('Organization not found');
    }

    // Organization email verification check - MANDATORY
    if (!membership.organization.email_verified) {
      throw new UnauthorizedException(
        'Organization email address must be verified before you can access this organization. Please check the organization email inbox for the verification email.',
      );
    }

    // Check if organization has MFA enabled

    if (membership.organization.mfa_enabled) {
      // Refresh user from database to ensure we have the latest MFA status
      // This is important after MFA setup completes
      const freshUser = await this.userRepository.findOne({
        where: { id: user.id, status: UserStatus.ACTIVE },
      });

      if (!freshUser) {
        throw new UnauthorizedException('User not found');
      }

      if (!freshUser.mfa_enabled || !freshUser.mfa_setup_completed_at) {
        // Generate temporary token for MFA setup (similar to MFA verification)
        const tempSetupToken = crypto.randomUUID();
        const expiresAt = Date.now() + 30 * 60 * 1000; // 30 minutes for setup (increased from 15)
        const tempSetupTokenData = {
          user_id: freshUser.id,
          organization_id: organizationId,
          email: freshUser.email.toLowerCase(), // Store in lowercase for consistent comparison
          user_email: freshUser.email.toLowerCase(), // Also store as user_email for consistency
          role_id: membership.role_id,
          expires_at: expiresAt,
        };

        // Store in Redis for 30 minutes (increased from 15)
        await this.redisService.set(
          `mfa:setup:temp:${tempSetupToken}`,
          JSON.stringify(tempSetupTokenData),
          1800, // 30 minutes
        );

        // Return flag that MFA setup is required with temporary token
        return {
          requires_mfa_setup: true,
          temp_setup_token: tempSetupToken,
          message: 'MFA is required. Please set up 2FA first.',
        };
      }

      // MFA is enabled and set up - require verification
      // Generate temporary token for MFA verification
      const tempToken = crypto.randomUUID();
      const tempTokenData = {
        user_id: freshUser.id,
        organization_id: organizationId,
        email: freshUser.email,
        expires_at: Date.now() + 5 * 60 * 1000, // 5 minutes
      };

      // Store in Redis for 5 minutes
      await this.redisService.set(
        `mfa:temp:${tempToken}`,
        JSON.stringify(tempTokenData),
        300, // 5 minutes
      );

      return {
        requires_mfa_verification: true,
        temp_token: tempToken,
        message: 'Please verify your 2FA code',
      };
    }

    // Update last login
    user.last_login_at = new Date();
    await this.userRepository.save(user);

    // Generate tokens
    const payload: JwtPayload = {
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

    // Create session
    const sessionId = crypto.randomUUID();
    const session = this.sessionRepository.create({
      id: sessionId,
      user_id: user.id,
      organization_id: organizationId,
      refresh_token: await bcrypt.hash(refreshToken, 10),
      expires_at: new Date(
        Date.now() +
        parseInt(
          this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '7d').replace('d', ''),
        ) *
        24 *
        60 *
        60 *
        1000,
      ),
    });

    await this.sessionRepository.save(session);

    return {
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
        id: membership.organization_id,
        name: membership.organization.name,
        slug: membership.organization.slug,
      },
    };
  }

  async verifyMfaAndLogin(dto: VerifyMfaLoginDto): Promise<any> {
    // Get temporary token data from Redis
    const tempTokenDataStr = await this.redisService.get(`mfa:temp:${dto.temp_token}`);

    if (!tempTokenDataStr) {
      throw new UnauthorizedException('Invalid or expired temporary token');
    }

    const tempTokenData = JSON.parse(tempTokenDataStr);

    // Check if token expired
    if (Date.now() > tempTokenData.expires_at) {
      await this.redisService.del(`mfa:temp:${dto.temp_token}`);
      throw new UnauthorizedException('Temporary token expired');
    }

    // Get user
    const user = await this.userRepository.findOne({
      where: { id: tempTokenData.user_id },
    });

    if (!user || !user.mfa_enabled || !user.mfa_secret) {
      throw new BadRequestException('2FA is not enabled for this user');
    }

    // Verify code
    let verified = false;

    // Check if code is a backup code
    if (user.mfa_backup_codes && user.mfa_backup_codes.includes(dto.code)) {
      verified = true;
      // Remove used backup code
      user.mfa_backup_codes = user.mfa_backup_codes.filter((c) => c !== dto.code);
      await this.userRepository.save(user);
    } else {
      // Verify TOTP code
      verified = speakeasy.totp.verify({
        secret: user.mfa_secret,
        encoding: 'base32',
        token: dto.code,
        window: 2,
      });
    }

    if (!verified) {
      throw new UnauthorizedException('Invalid 2FA code');
    }

    // Delete temporary token
    await this.redisService.del(`mfa:temp:${dto.temp_token}`);

    // Get membership
    const membership = await this.memberRepository.findOne({
      where: {
        user_id: user.id,
        organization_id: tempTokenData.organization_id,
        status: OrganizationMemberStatus.ACTIVE,
      },
      relations: ['role'],
    });

    if (!membership) {
      throw new UnauthorizedException('You are not a member of this organization');
    }

    // Update last login
    user.last_login_at = new Date();
    await this.userRepository.save(user);

    // Generate tokens
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      organization_id: tempTokenData.organization_id,
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

    // Create session
    const sessionId = crypto.randomUUID();
    const session = this.sessionRepository.create({
      id: sessionId,
      user_id: user.id,
      organization_id: tempTokenData.organization_id,
      refresh_token: await bcrypt.hash(refreshToken, 10),
      expires_at: new Date(
        Date.now() +
        parseInt(
          this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '7d').replace('d', ''),
        ) *
        24 *
        60 *
        60 *
        1000,
      ),
    });

    await this.sessionRepository.save(session);

    return {
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
        id: membership.organization_id,
        name: membership.organization.name,
        slug: membership.organization.slug,
      },
    };
  }

  async loginWithMfa(dto: LoginWithMfaDto): Promise<any> {
    // Find user by email
    const user = await this.userRepository.findOne({
      where: { email: dto.email, status: UserStatus.ACTIVE },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Email verification check - MANDATORY
    if (!user.email_verified) {
      throw new UnauthorizedException(
        'Please verify your email address before logging in. Check your inbox for the verification email.',
      );
    }

    // Check if user has MFA enabled and set up
    if (!user.mfa_enabled || !user.mfa_secret || !user.mfa_setup_completed_at) {
      throw new BadRequestException(
        '2FA is not set up for this account. Please use the regular login method with password.',
      );
    }

    // Verify MFA code
    let verified = false;

    // Check if code is a backup code
    if (user.mfa_backup_codes && user.mfa_backup_codes.includes(dto.code)) {
      verified = true;
      // Remove used backup code
      user.mfa_backup_codes = user.mfa_backup_codes.filter((c) => c !== dto.code);
      await this.userRepository.save(user);
    } else {
      // Verify TOTP code
      verified = speakeasy.totp.verify({
        secret: user.mfa_secret,
        encoding: 'base32',
        token: dto.code,
        window: 2,
      });
    }

    if (!verified) {
      throw new UnauthorizedException('Invalid 2FA code');
    }

    // Get user's organizations with MFA enabled
    const memberships = await this.memberRepository.find({
      where: {
        user_id: user.id,
        status: OrganizationMemberStatus.ACTIVE,
      },
      relations: ['organization', 'role'],
    });

    // Filter to only organizations with MFA enabled and email verified
    const mfaOrganizations = memberships.filter(
      (m) => m.organization.mfa_enabled && m.organization.email_verified,
    );

    if (mfaOrganizations.length === 0) {
      throw new UnauthorizedException(
        'You are not a member of any organization with MFA enabled. Please use the regular login method.',
      );
    }

    // If organization_id is provided, use it
    if (dto.organization_id) {
      const membership = mfaOrganizations.find(
        (m) => m.organization_id === dto.organization_id,
      );

      if (!membership) {
        throw new UnauthorizedException(
          'You are not a member of this organization or it does not have MFA enabled',
        );
      }

      return this.completeLogin(user, membership);
    }

    // If user has only one MFA organization, automatically use it
    if (mfaOrganizations.length === 1) {
      return this.completeLogin(user, mfaOrganizations[0]);
    }

    // Return organizations for user to select
    return {
      requires_organization_selection: true,
      organizations: mfaOrganizations.map((m) => ({
        id: m.organization_id,
        name: m.organization.org_type === (OrganizationType.MAIN as any) ? 'Main Branch' : m.organization.name,
        slug: m.organization.slug,
        role: m.role?.name || 'Member',
      })),
      message: 'Please select an organization to continue',
    };
  }

  private async completeLogin(user: User, membership: OrganizationMember): Promise<any> {
    // Ensure organization relation is loaded
    if (!membership.organization) {
      throw new UnauthorizedException('Organization not found');
    }

    // Organization email verification check - MANDATORY
    if (!membership.organization.email_verified) {
      throw new UnauthorizedException(
        'Organization email address must be verified before you can access this organization. Please check the organization email inbox for the verification email.',
      );
    }

    // Update last login
    user.last_login_at = new Date();
    await this.userRepository.save(user);

    // Generate tokens
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      organization_id: membership.organization_id,
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

    // Create session
    const sessionId = crypto.randomUUID();
    const session = this.sessionRepository.create({
      id: sessionId,
      user_id: user.id,
      organization_id: membership.organization_id,
      refresh_token: await bcrypt.hash(refreshToken, 10),
      expires_at: new Date(
        Date.now() +
        parseInt(
          this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '7d').replace('d', ''),
        ) *
        24 *
        60 *
        60 *
        1000,
      ),
    });

    await this.sessionRepository.save(session);

    return {
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
        id: membership.organization_id,
        name: membership.organization.name,
        slug: membership.organization.slug,
      },
    };
  }

  async verifyEmail(token: string): Promise<{ message: string }> {
    console.log(`[AuthService] verifyEmail called, token prefix: ${token?.substring(0, 8)}...`);

    // Use raw query first to bypass any TypeORM enum hydration issues
    const rawRows = await this.dataSource.query(
      `SELECT id, user_id, email, token, type, expires_at, verified_at FROM email_verifications WHERE token = $1 LIMIT 1`,
      [token],
    );

    if (!rawRows || rawRows.length === 0) {
      console.warn(`[AuthService] Token not found in DB: ${token?.substring(0, 8)}...`);
      throw new BadRequestException('Invalid verification token');
    }

    const raw = rawRows[0];
    console.log(`[AuthService] Token found — type: ${raw.type}, verified_at: ${raw.verified_at}`);

    // Re-fetch via ORM so we get a proper entity for saving
    const verification = await this.emailVerificationRepository.findOne({
      where: { token },
    });

    if (!verification) {
      // Fallback: build a minimal object from raw data to still serve the request
      console.warn(`[AuthService] TypeORM findOne returned null despite raw row existing — using raw data`);
      const expiresAt = new Date(raw.expires_at);
      if (expiresAt < new Date()) {
        throw new BadRequestException('Verification token has expired');
      }
      if (raw.verified_at) {
        if (raw.type === EmailVerificationType.ORGANIZATION_EMAIL) {
          return { message: 'Organization email is already verified' };
        }
        return { message: 'Email is already verified' };
      }
      // Mark verified via raw query
      await this.dataSource.query(
        `UPDATE email_verifications SET verified_at = NOW() WHERE token = $1`,
        [token],
      );
      if (raw.type === EmailVerificationType.ORGANIZATION_EMAIL) {
        await this.dataSource.query(
          `UPDATE organizations SET email_verified = true WHERE email = $1`,
          [raw.email],
        );
        return { message: 'Organization email verified successfully' };
      } else {
        await this.dataSource.query(
          `UPDATE users SET email_verified = true, email_verified_at = NOW() WHERE id = $1`,
          [raw.user_id],
        );
        return { message: 'Email verified successfully' };
      }
    }

    if (verification.expires_at < new Date()) {
      throw new BadRequestException('Verification token has expired');
    }

    // If token was already used, check if email is already verified and return success
    if (verification.verified_at) {
      // Check if email is already verified
      if (verification.type === EmailVerificationType.ORGANIZATION_EMAIL) {
        const organization = await this.organizationRepository.findOne({
          where: { email: verification.email },
        });
        if (organization && organization.email_verified) {
          return { message: 'Organization email is already verified' };
        }
      } else {
        const user = await this.userRepository.findOne({
          where: { id: verification.user_id },
        });
        if (user && user.email_verified) {
          return { message: 'Email is already verified' };
        }
      }
      // If verified_at exists but email is not verified, something went wrong
      throw new BadRequestException(
        'Verification token has already been used, but email verification status is inconsistent. Please contact support.',
      );
    }

    // Mark as verified
    verification.verified_at = new Date();
    await this.emailVerificationRepository.save(verification);

    // Handle different verification types
    if (verification.type === EmailVerificationType.ORGANIZATION_EMAIL) {
      // Find organization by email and verify it
      const organization = await this.organizationRepository.findOne({
        where: { email: verification.email },
      });

      if (organization) {
        organization.email_verified = true;
        await this.organizationRepository.save(organization);
        return { message: 'Organization email verified successfully' };
      } else {
        throw new BadRequestException('Organization not found for this email');
      }
    } else {
      // Update user email verification
      const user = await this.userRepository.findOne({ where: { id: verification.user_id } });
      if (!user) {
        throw new BadRequestException('User associated with this verification token not found');
      }
      user.email_verified = true;
      user.email_verified_at = new Date();
      await this.userRepository.save(user);
      return { message: 'Email verified successfully' };
    }
  }

  async resendVerificationEmail(email: string, origin?: string): Promise<{ message: string }> {
    const normalizedEmail = email.toLowerCase().trim();
    const user = await this.userRepository.findOne({
      where: { email: normalizedEmail, status: UserStatus.ACTIVE },
    });

    if (!user) {
      // Don't reveal if user exists
      return { message: 'If an unverified account exists with this email, a new verification link has been sent' };
    }

    if (user.email_verified) {
      return { message: 'Your email is already verified. You can login now.' };
    }

    // Delete old unverified tokens for this user/email to avoid unique conflicts
    await this.dataSource.query(
      `DELETE FROM email_verifications WHERE user_id = $1 AND verified_at IS NULL AND type = $2`,
      [user.id, EmailVerificationType.REGISTRATION],
    );

    const verificationToken = crypto.randomBytes(32).toString('hex');
    const emailVerification = this.emailVerificationRepository.create({
      user_id: user.id,
      email: normalizedEmail,
      token: verificationToken,
      type: EmailVerificationType.REGISTRATION,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    });
    await this.emailVerificationRepository.save(emailVerification);

    const appUrl = origin || this.configService.get<string>('FRONTEND_URL', 'http://localhost:3001');
    const verificationUrl = `${appUrl}/verify-email?token=${verificationToken}`;

    try {
      await this.emailService.sendEmail(
        normalizedEmail,
        'Verify Your Email Address',
        `
          <h2>Email Verification</h2>
          <p>Click the link below to verify your email address:</p>
          <p><a href="${verificationUrl}">Verify Email</a></p>
          <p>This link will expire in 24 hours.</p>
          <p>If you did not create an account, please ignore this email.</p>
        `,
      );
    } catch (emailError) {
      console.error('[AuthService] Failed to send resend verification email:', emailError);
    }

    return { message: 'If an unverified account exists with this email, a new verification link has been sent' };
  }

  async forgotPassword(email: string, origin?: string): Promise<{ message: string }> {
    const user = await this.userRepository.findOne({
      where: { email, status: UserStatus.ACTIVE },
    });

    if (!user) {
      // Don't reveal if user exists
      return { message: 'If the email exists, a password reset link has been sent' };
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    console.log(`[Forgot Password] Generated token for ${user.email}: ${resetToken.substring(0, 10)}... (length: ${resetToken.length})`);

    // Try to use PASSWORD_RESET type, but fallback to REGISTRATION if save fails
    let emailVerification = this.emailVerificationRepository.create({
      user_id: user.id,
      email: user.email,
      token: resetToken,
      type: EmailVerificationType.PASSWORD_RESET,
      expires_at: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
    });

    try {
      await this.emailVerificationRepository.save(emailVerification);
      console.log(`[Forgot Password] Token saved with PASSWORD_RESET type`);
    } catch (error: any) {
      // If PASSWORD_RESET type doesn't exist in DB (migration not run), use REGISTRATION type
      if (error?.message?.includes('password_reset') || error?.code === '23502') {
        console.warn(`[Forgot Password] PASSWORD_RESET type not available, using REGISTRATION type`);
        emailVerification = this.emailVerificationRepository.create({
          user_id: user.id,
          email: user.email,
          token: resetToken,
          type: EmailVerificationType.REGISTRATION,
          expires_at: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
        });
        await this.emailVerificationRepository.save(emailVerification);
        console.log(`[Forgot Password] Token saved with REGISTRATION type`);
      } else {
        console.error(`[Forgot Password] Error saving token:`, error);
        throw error; // Re-throw if it's a different error
      }
    }

    // Send reset email - URL encode the token to handle any special characters
    const encodedToken = encodeURIComponent(resetToken);
    const appUrl = origin || this.configService.get<string>('FRONTEND_URL', 'http://localhost:3001');
    const resetUrl = `${appUrl}/reset-password?token=${encodedToken}`;
    console.log(`[Forgot Password] Reset URL created: ${resetUrl.substring(0, 80)}...`);
    await this.emailService.sendEmail(
      user.email,
      'Reset Your Password',
      `
        <h2>Password Reset Request</h2>
        <p>You requested to reset your password. Click the link below to reset it:</p>
        <p><a href="${resetUrl}">Reset Password</a></p>
        <p>This link will expire in 1 hour.</p>
        <p>If you did not request this, please ignore this email.</p>
      `,
    );

    // Send supplemental SMS notification via Sparrow SMS if user has a phone number
    if (user.phone) {
      try {
        await this.sparrowSmsService.sendSms(
          user.phone,
          `Mero Jugx: A password reset link has been sent to your email ${user.email}. If you did not request this, please ignore.`,
        );
      } catch (_err) {
        // SMS failure must never block the password reset flow
      }
    }

    return { message: 'If the email exists, a password reset link has been sent' };
  }

  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    if (!token || token.trim() === '') {
      throw new BadRequestException('Reset token is required');
    }

    // Normalize token - trim whitespace and handle potential double-encoding
    let normalizedToken = token.trim();
    // Try to decode in case it was double-encoded
    try {
      const decoded = decodeURIComponent(normalizedToken);
      if (decoded !== normalizedToken) {
        normalizedToken = decoded;
      }
    } catch (e) {
      // Not URL encoded, use as-is
    }

    // Log token details for debugging
    console.log(`[Password Reset] Original token: ${token.substring(0, 10)}... (length: ${token.length})`);
    console.log(`[Password Reset] Normalized token: ${normalizedToken.substring(0, 10)}... (length: ${normalizedToken.length})`);

    // Use normalized token for lookup
    token = normalizedToken;

    // Try to find the token, first with PASSWORD_RESET type, then fallback to REGISTRATION for backward compatibility
    // Also try without type filter in case the enum migration hasn't been run yet
    let verification = null;

    try {
      verification = await this.emailVerificationRepository.findOne({
        where: { token, type: EmailVerificationType.PASSWORD_RESET },
        relations: ['user'],
      });
    } catch (error) {
      // If PASSWORD_RESET type doesn't exist in DB yet (migration not run), continue to fallback
      console.warn('[Password Reset] PASSWORD_RESET type not available, using fallback');
    }

    // Fallback to REGISTRATION type for tokens created before the PASSWORD_RESET type was added
    if (!verification) {
      verification = await this.emailVerificationRepository.findOne({
        where: { token, type: EmailVerificationType.REGISTRATION },
        relations: ['user'],
      });
    }

    // Last resort: try to find by token only (in case type filtering fails)
    // This handles cases where the enum migration hasn't been run yet
    if (!verification) {
      const allVerifications = await this.emailVerificationRepository.find({
        where: { token },
        relations: ['user'],
      });

      // Find the most recent one that's not EMAIL_CHANGE, INVITATION, or ORGANIZATION_EMAIL
      verification = allVerifications.find(v =>
        v.type !== EmailVerificationType.EMAIL_CHANGE &&
        v.type !== EmailVerificationType.INVITATION &&
        v.type !== EmailVerificationType.ORGANIZATION_EMAIL
      ) || null;
    }

    if (!verification) {
      // Log for debugging - check if token exists at all
      const anyToken = await this.emailVerificationRepository.findOne({
        where: { token },
        relations: ['user'],
      });

      if (anyToken) {
        console.error(`[Password Reset] Token found but with wrong type: ${anyToken.type}, expected: PASSWORD_RESET or REGISTRATION`);
        console.error(`[Password Reset] Token email: ${anyToken.email}, expires_at: ${anyToken.expires_at}, verified_at: ${anyToken.verified_at}`);
      } else {
        console.error(`[Password Reset] Token not found. Token length: ${token.length}, First 10 chars: ${token.substring(0, 10)}`);
        // Try to find similar tokens (in case of encoding issues)
        const allRecentTokens = await this.emailVerificationRepository.find({
          take: 10,
          order: { created_at: 'DESC' },
        });
        if (allRecentTokens.length > 0) {
          console.error(`[Password Reset] Recent tokens (first 10 chars): ${allRecentTokens.slice(0, 5).map(t => t.token.substring(0, 10)).join(', ')}`);
        }
      }

      throw new BadRequestException('Invalid or expired reset token. Please request a new password reset link.');
    }

    if (verification.expires_at < new Date()) {
      throw new BadRequestException('Reset token has expired. Please request a new password reset link.');
    }

    if (verification.verified_at) {
      throw new BadRequestException('Reset token has already been used. Please request a new password reset link.');
    }

    // Mark as used
    verification.verified_at = new Date();
    await this.emailVerificationRepository.save(verification);

    // Update password
    const user = verification.user;

    // Prevent reusing the same password
    console.log(`[Password Reset Debug] User ID: ${user.id}`);
    console.log(`[Password Reset Debug] Has password hash: ${!!user.password_hash}`);
    const isSamePassword = await bcrypt.compare(newPassword, user.password_hash);
    console.log(`[Password Reset Debug] isSamePassword: ${isSamePassword}`);

    if (isSamePassword) {
      console.log(`[Password Reset Debug] Blocking reset due to same password`);
      throw new BadRequestException('New password cannot be the same as your current password');
    }

    user.password_hash = await bcrypt.hash(newPassword, 10);

    // Also mark user as verified since they've successfully accessed their email
    user.email_verified = true;
    user.email_verified_at = new Date();

    await this.userRepository.save(user);

    return { message: 'Password reset successfully' };
  }

  async refreshToken(refreshToken: string): Promise<{ access_token: string }> {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });

      const user = await this.userRepository.findOne({
        where: { id: payload.sub, status: UserStatus.ACTIVE },
      });

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      // Verify session exists
      const sessions = await this.sessionRepository.find({
        where: { user_id: user.id },
      });

      let validSession = false;
      for (const session of sessions) {
        if (await bcrypt.compare(refreshToken, session.refresh_token)) {
          if (session.expires_at > new Date()) {
            validSession = true;
            break;
          }
        }
      }

      if (!validSession) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Get user's active organization membership (simplified - in production, you'd handle multiple orgs)
      const membership = await this.memberRepository.findOne({
        where: {
          user_id: user.id,
          status: OrganizationMemberStatus.ACTIVE,
        },
        relations: ['role'],
      });

      if (!membership) {
        throw new UnauthorizedException('No active organization membership found');
      }

      // Generate new access token
      const newPayload: JwtPayload = {
        sub: user.id,
        email: user.email,
        organization_id: membership.organization_id,
        role_id: membership.role_id,
      };

      const accessToken = this.jwtService.sign(newPayload, {
        expiresIn: this.configService.get<string>('JWT_EXPIRES_IN', '15m'),
      });

      return { access_token: accessToken };
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(userId: string, token: string): Promise<{ message: string }> {
    // In a real implementation, you might want to blacklist the token
    // For now, we'll just return success
    // You could also delete the session if needed
    return { message: 'Logged out successfully' };
  }

  async checkMfaRequiredForEmail(email: string): Promise<{ mfa_available: boolean; message?: string }> {
    const user = await this.userRepository.findOne({
      where: { email, status: UserStatus.ACTIVE },
    });

    if (!user) {
      // Don't reveal if user exists for security
      return { mfa_available: false };
    }

    // Check if user has MFA enabled and set up
    if (!user.mfa_enabled || !user.mfa_secret || !user.mfa_setup_completed_at) {
      return { mfa_available: false };
    }

    // Get user's organizations with MFA enabled
    const memberships = await this.memberRepository.find({
      where: {
        user_id: user.id,
        status: OrganizationMemberStatus.ACTIVE,
      },
      relations: ['organization'],
    });

    // Filter to only organizations with MFA enabled and email verified
    const mfaOrganizations = memberships.filter(
      (m) => m.organization.mfa_enabled && m.organization.email_verified,
    );

    return {
      mfa_available: mfaOrganizations.length > 0,
      message: mfaOrganizations.length > 0
        ? 'You can log in with email and MFA code'
        : 'MFA login is not available',
    };
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
}
