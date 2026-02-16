import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { OrganizationsController } from './organizations.controller';
import { DocumentsController } from './documents.controller';
import { OrganizationsService } from './organizations.service';
import { DocumentsService } from './documents.service';
import { OrganizationBrandingService } from './organization-branding.service';
import { Organization } from '../database/entities/organizations.entity';
import { OrganizationMember } from '../database/entities/organization_members.entity';
import { OrganizationDocument } from '../database/entities/organization_documents.entity';
import { OrganizationApp } from '../database/entities/organization_apps.entity';
import { User } from '../database/entities/users.entity';
import { Package } from '../database/entities/packages.entity';
import { Role } from '../database/entities/roles.entity';
import { Invitation } from '../database/entities/invitations.entity';
import { Notification } from '../database/entities/notifications.entity';
import { CommonModule } from '../common/common.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Organization,
      OrganizationMember,
      OrganizationDocument,
      OrganizationApp,
      User,
      Package,
      Role,
      Invitation,
      Notification,
    ]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRES_IN', '15m'),
        },
      }),
      inject: [ConfigService],
    }),
    CommonModule,
    AuditLogsModule,
  ],
  controllers: [OrganizationsController, DocumentsController],
  providers: [OrganizationsService, DocumentsService, OrganizationBrandingService],
  exports: [OrganizationsService, DocumentsService, OrganizationBrandingService],
})
export class OrganizationsModule { }
