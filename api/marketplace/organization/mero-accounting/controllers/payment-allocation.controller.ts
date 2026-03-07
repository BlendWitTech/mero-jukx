import { Controller, Post, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@auth/guards/jwt-auth.guard';
import { AppAccessGuard } from '@common/guards/app-access.guard';
import { AppSlug } from '@common/decorators/app-slug.decorator';
import { CurrentOrganization } from '@common/decorators/current-organization.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { PaymentAllocationService } from '../services/payment-allocation.service';

@Controller('accounting/payment-allocations')
@UseGuards(JwtAuthGuard, AppAccessGuard)
@AppSlug('mero-accounting')
export class PaymentAllocationController {
    constructor(private readonly allocationService: PaymentAllocationService) { }

    @Post('customer')
    allocateCustomerPayment(
        @CurrentOrganization() organization: any,
        @CurrentUser() user: any,
        @Body() body: {
            customerId: string;
            amount: number;
            bankAccountId: string;
            arAccountId: string;
            paymentDate: string;
            narration?: string;
            allocationMethod: 'FIFO' | 'MANUAL';
            manualAllocations?: { invoiceId: string; amount: number }[];
        },
    ) {
        return this.allocationService.allocateCustomerPayment(organization.id, user.userId, body);
    }

    @Post('vendor')
    allocateVendorPayment(
        @CurrentOrganization() organization: any,
        @CurrentUser() user: any,
        @Body() body: {
            vendorId: string;
            amount: number;
            bankAccountId: string;
            apAccountId: string;
            paymentDate: string;
            narration?: string;
            allocationMethod: 'FIFO' | 'MANUAL';
            manualAllocations?: { invoiceId: string; amount: number }[];
        },
    ) {
        return this.allocationService.allocateVendorPayment(organization.id, user.userId, body);
    }

    @Post(':journalEntryId/unpost')
    unpostAllocationGroup(
        @CurrentOrganization() organization: any,
        @CurrentUser() user: any,
        @Param('journalEntryId') journalEntryId: string,
    ) {
        return this.allocationService.unpostAllocationGroup(journalEntryId, organization.id, user.userId);
    }
}
