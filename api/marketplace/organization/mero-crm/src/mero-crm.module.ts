import { Module } from '@nestjs/common';
import { ClientsModule } from './modules/clients.module';
import { InvoicesModule } from './modules/invoices.module';
import { PaymentsModule } from './modules/payments.module';
import { TaxesModule } from './modules/taxes.module';
import { PaymentModesModule } from './modules/payment-modes.module';
import { QuotesModule } from './modules/quotes.module';
import { CrmSettingsModule } from './modules/settings.module';
import { LeadsModule } from './modules/leads.module';
import { DealsModule } from './modules/deals.module';
import { ActivitiesModule } from './modules/activities.module';
import { AnalyticsModule } from './modules/analytics.module';
import { CrmAutomationModule } from './modules/automation.module';
import { CrmUtilityModule } from './modules/utility.module';

@Module({
    imports: [
        ClientsModule,
        InvoicesModule,
        PaymentsModule,
        TaxesModule,
        PaymentModesModule,
        QuotesModule,
        CrmSettingsModule,
        LeadsModule,
        DealsModule,
        ActivitiesModule,
        AnalyticsModule,
        CrmAutomationModule,
        CrmUtilityModule,
    ],
    exports: [
        ClientsModule,
        InvoicesModule,
        PaymentsModule,
        TaxesModule,
        PaymentModesModule,
        QuotesModule,
        CrmSettingsModule,
        LeadsModule,
        DealsModule,
        ActivitiesModule,
        AnalyticsModule,
        CrmAutomationModule,
        CrmUtilityModule,
    ],
})
export class MeroCrmModule { }
