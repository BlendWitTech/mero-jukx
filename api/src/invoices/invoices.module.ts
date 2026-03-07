import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';
import { Invoice } from '../database/entities/invoices.entity';
import { Organization } from '../database/entities/organizations.entity';
import { OrganizationMember } from '../database/entities/organization_members.entity';
import { OrganizationApp } from '../database/entities/organization_apps.entity';
import { Payment } from '../database/entities/payments.entity';
import { App } from '../database/entities/apps.entity';
import { PaymentsModule } from '../payments/payments.module';
import { CommonModule } from '../common/common.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Invoice,
      Organization,
      OrganizationMember,
      OrganizationApp,
      Payment,
      App,
    ]),
    forwardRef(() => PaymentsModule),
    CommonModule,
    AuditLogsModule,
  ],
  controllers: [InvoicesController],
  providers: [InvoicesService],
  exports: [InvoicesService],
})
export class InvoicesModule { }

