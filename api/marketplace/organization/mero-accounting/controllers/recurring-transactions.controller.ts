import {
    Controller,
    Get,
    Post,
    Body,
    Param,
    Delete,
    Patch,
    UseGuards
} from '@nestjs/common';
import { RecurringTransactionsService } from '../services/recurring-transactions.service';
import { JwtAuthGuard } from '@auth/guards/jwt-auth.guard';
import { AppAccessGuard } from '@common/guards/app-access.guard';
import { AppSlug } from '@common/decorators/app-slug.decorator';
import { CurrentOrganization } from '@common/decorators/current-organization.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { RecurringTransaction, RecurringTransactionStatus } from '@src/database/entities/recurring_transactions.entity';

@Controller('accounting/recurring-transactions')
@UseGuards(JwtAuthGuard, AppAccessGuard)
@AppSlug('mero-accounting')
export class RecurringTransactionsController {
    constructor(private readonly recurringTransactionsService: RecurringTransactionsService) { }

    @Post()
    create(
        @CurrentOrganization() organization: any,
        @CurrentUser() user: any,
        @Body() data: Partial<RecurringTransaction>,
    ) {
        return this.recurringTransactionsService.create(organization.id, user.userId, data);
    }

    @Get()
    findAll(@CurrentOrganization() organization: any) {
        return this.recurringTransactionsService.findAll(organization.id);
    }

    @Get(':id')
    findOne(
        @Param('id') id: string,
        @CurrentOrganization() organization: any,
    ) {
        return this.recurringTransactionsService.findOne(id, organization.id);
    }

    @Patch(':id')
    update(
        @Param('id') id: string,
        @CurrentOrganization() organization: any,
        @CurrentUser() user: any,
        @Body() data: Partial<RecurringTransaction>,
    ) {
        return this.recurringTransactionsService.update(id, organization.id, user.userId, data);
    }

    @Delete(':id')
    remove(
        @Param('id') id: string,
        @CurrentOrganization() organization: any,
        @CurrentUser() user: any,
    ) {
        return this.recurringTransactionsService.delete(id, organization.id, user.userId);
    }

    @Post(':id/pause')
    pause(
        @Param('id') id: string,
        @CurrentOrganization() organization: any,
        @CurrentUser() user: any,
    ) {
        return this.recurringTransactionsService.updateStatus(id, organization.id, user.userId, RecurringTransactionStatus.PAUSED);
    }

    @Post(':id/resume')
    resume(
        @Param('id') id: string,
        @CurrentOrganization() organization: any,
        @CurrentUser() user: any,
    ) {
        return this.recurringTransactionsService.updateStatus(id, organization.id, user.userId, RecurringTransactionStatus.ACTIVE);
    }
}
