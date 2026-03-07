import {
    Controller,
    Get,
    Post,
    Delete,
    Param,
    Body,
    UseGuards,
    Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '@auth/guards/jwt-auth.guard';
import { AppAccessGuard } from '@common/guards/app-access.guard';
import { AppSlug } from '@common/decorators/app-slug.decorator';
import { CurrentOrganization } from '@common/decorators/current-organization.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { JournalEntriesService } from '../services/journal-entries.service';

@Controller('accounting/journal-entries')
@UseGuards(JwtAuthGuard, AppAccessGuard)
@AppSlug('mero-accounting')
export class JournalEntriesController {
    constructor(private readonly journalEntriesService: JournalEntriesService) { }

    @Get()
    findAll(@CurrentOrganization() organization: any) {
        return this.journalEntriesService.findAll(organization.id);
    }

    @Get(':id')
    findOne(@Param('id') id: string, @CurrentOrganization() organization: any) {
        return this.journalEntriesService.findById(id, organization.id);
    }

    @Post()
    create(
        @CurrentOrganization() organization: any,
        @CurrentUser() user: any,
        @Body() data: any,
    ) {
        return this.journalEntriesService.create(organization.id, user.userId, data);
    }

    @Post(':id/review')
    review(
        @Param('id') id: string,
        @CurrentOrganization() organization: any,
        @CurrentUser() user: any,
    ) {
        return this.journalEntriesService.markAsReviewed(id, organization.id, user.userId);
    }

    @Post(':id/approve')
    approve(
        @Param('id') id: string,
        @CurrentOrganization() organization: any,
        @CurrentUser() user: any,
    ) {
        return this.journalEntriesService.approveEntry(id, organization.id, user.userId);
    }

    @Post(':id/post')
    post(
        @Param('id') id: string,
        @CurrentOrganization() organization: any,
        @CurrentUser() user: any,
    ) {
        return this.journalEntriesService.postEntry(id, organization.id, user.userId);
    }

    @Delete(':id')
    remove(@Param('id') id: string, @CurrentOrganization() organization: any) {
        return this.journalEntriesService.delete(id, organization.id);
    }
}
