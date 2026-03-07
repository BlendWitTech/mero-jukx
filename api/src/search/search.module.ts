import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';
import { User } from '../database/entities/users.entity';
import { Organization } from '../database/entities/organizations.entity';
import { OrganizationMember } from '../database/entities/organization_members.entity';
import { Role } from '../database/entities/roles.entity';
import { Chat } from '../database/entities/chats.entity';
import { Message } from '../database/entities/messages.entity';
import { CrmLead } from '../database/entities/crm_leads.entity';
import { CrmClient } from '../database/entities/crm_clients.entity';
import { CrmInvoice } from '../database/entities/crm_invoices.entity';
import { Task } from '../database/entities/tasks.entity';
import { CommonModule } from '../common/common.module';
import { CacheService } from '../common/services/cache.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Organization,
      OrganizationMember,
      Role,
      Chat,
      Message,
      CrmLead,
      CrmClient,
      CrmInvoice,
      Task,
    ]),
    CommonModule,
  ],
  controllers: [SearchController],
  providers: [SearchService],
  exports: [SearchService],
})
export class SearchModule {}

