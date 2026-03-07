import {
    Controller,
    Get,
    UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '@auth/guards/jwt-auth.guard';
import { AppAccessGuard } from '@common/guards/app-access.guard';
import { AppSlug } from '@common/decorators/app-slug.decorator';
import { CurrentOrganization } from '@common/decorators/current-organization.decorator';
import { AuditService } from '../services/audit.service';

@Controller('accounting/audit')
@UseGuards(JwtAuthGuard, AppAccessGuard)
@AppSlug('mero-accounting')
export class AuditController {
    constructor(private readonly auditService: AuditService) { }

    @Get('logs')
    getLogs(@CurrentOrganization() organization: any) {
        return this.auditService.findAll(organization.id);
    }
}
