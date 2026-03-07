import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';
import { CrmLead } from '@src/database/entities/crm_leads.entity';
import { CrmClient } from '@src/database/entities/crm_clients.entity';

@Injectable()
export class DuplicateDetectionService {
    constructor(
        @InjectRepository(CrmLead)
        private leadRepository: Repository<CrmLead>,
        @InjectRepository(CrmClient)
        private clientRepository: Repository<CrmClient>,
    ) { }

    async findLeadDuplicates(lead: Partial<CrmLead>, organizationId: string): Promise<CrmLead[]> {
        const query = this.leadRepository.createQueryBuilder('lead')
            .where('lead.organizationId = :organizationId', { organizationId });

        const conditions: string[] = [];
        if (lead.email) conditions.push('lead.email = :email');
        if (lead.phone) conditions.push('lead.phone = :phone');

        if (conditions.length === 0) return [];

        query.andWhere(`(${conditions.join(' OR ')})`, {
            email: lead.email,
            phone: lead.phone
        });

        if (lead.id) {
            query.andWhere('lead.id != :id', { id: lead.id });
        }

        return query.getMany();
    }

    async findClientDuplicates(client: Partial<CrmClient>, organizationId: string): Promise<CrmClient[]> {
        const query = this.clientRepository.createQueryBuilder('client')
            .where('client.organizationId = :organizationId', { organizationId });

        const conditions: string[] = [];
        if (client.email) conditions.push('client.email = :email');
        if (client.phone) conditions.push('client.phone = :phone');
        if (client.name) conditions.push('client.name = :name');

        if (conditions.length === 0) return [];

        query.andWhere(`(${conditions.join(' OR ')})`, {
            email: client.email,
            phone: client.phone,
            name: client.name
        });

        if (client.id) {
            query.andWhere('client.id != :id', { id: client.id });
        }

        return query.getMany();
    }

    async mergeLeads(primaryId: string, duplicateIds: string[], organizationId: string): Promise<CrmLead> {
        const primary = await this.leadRepository.findOne({ where: { id: primaryId, organizationId } });
        if (!primary) throw new Error('Primary lead not found');

        // Logic to merge fields, activities, etc. could be complex. 
        // For simplicity, we mark duplicates as CLOSED and link them or delete them.
        for (const id of duplicateIds) {
            await this.leadRepository.update({ id, organizationId }, { status: 'LOST', win_loss_reason: 'Merged with ' + primaryId });
        }

        return primary;
    }
}
