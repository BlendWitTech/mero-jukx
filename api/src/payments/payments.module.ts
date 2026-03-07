import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { EsewaService } from './esewa.service';
import { StripeService } from './stripe.service';
import { KhaltiService } from './khalti.service';
import { ConnectIpsService } from './connect-ips.service';
import { PaypalService } from './paypal.service';
import { ImePayService } from './ime-pay.service';
import { Payment } from '../database/entities/payments.entity';
import { Organization } from '../database/entities/organizations.entity';
import { User } from '../database/entities/users.entity';
import { OrganizationMember } from '../database/entities/organization_members.entity';
import { OrganizationPackageFeature } from '../database/entities/organization_package_features.entity';
import { OrganizationApp } from '../database/entities/organization_apps.entity';
import { Invoice } from '../database/entities/invoices.entity';
import { Role } from '../database/entities/roles.entity';
import { PackagesModule } from '../packages/packages.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { CommonModule } from '../common/common.module';
import { AppsModule } from '../apps/apps.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Payment,
      Organization,
      User,
      OrganizationMember,
      OrganizationPackageFeature,
      OrganizationApp,
      Invoice,
      Role,
    ]),
    forwardRef(() => PackagesModule),
    forwardRef(() => AppsModule),
    NotificationsModule,
    CommonModule,
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService, EsewaService, StripeService, KhaltiService, ConnectIpsService, PaypalService, ImePayService],
  exports: [PaymentsService, EsewaService, StripeService, KhaltiService, ConnectIpsService, PaypalService, ImePayService],
})
export class PaymentsModule { }
