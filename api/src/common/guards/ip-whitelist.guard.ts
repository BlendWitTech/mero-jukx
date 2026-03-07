import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Organization } from '../../database/entities/organizations.entity';

@Injectable()
export class IpWhitelistGuard implements CanActivate {
  constructor(
    @InjectRepository(Organization)
    private organizationRepository: Repository<Organization>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    // Get client IP, respecting proxies
    const ip =
      (request.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      request.ip ||
      request.connection?.remoteAddress ||
      '';

    // Get organization from request (set by CurrentOrganization decorator / JWT strategy)
    const orgId: string | undefined =
      request.organization?.id || request.user?.organization_id;

    if (!orgId) {
      return true; // No org context — let other guards handle auth
    }

    const org = await this.organizationRepository.findOne({
      where: { id: orgId },
      select: ['id', 'ip_whitelist'],
    });

    if (!org) {
      return true;
    }

    // Whitelist disabled (empty or null) — allow all
    if (!org.ip_whitelist || org.ip_whitelist.length === 0) {
      return true;
    }

    if (!org.ip_whitelist.includes(ip)) {
      throw new ForbiddenException(
        `Access denied: IP address ${ip} is not whitelisted for this organization`,
      );
    }

    return true;
  }
}
