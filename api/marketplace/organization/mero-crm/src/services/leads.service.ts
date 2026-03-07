import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, In, DataSource } from 'typeorm';
import { CrmLead } from '@src/database/entities/crm_leads.entity';
import { CrmClient } from '@src/database/entities/crm_clients.entity';
import { CrmContact } from '@src/database/entities/crm_contacts.entity';
import { OrganizationMember } from '@src/database/entities/organization_members.entity';
import { CrmActivity } from '@src/database/entities/crm_activities.entity';
import { CreateLeadDto, UpdateLeadDto } from '../dto/leads.dto';

@Injectable()
export class LeadsService {
    constructor(
        @InjectRepository(CrmLead)
        private leadsRepository: Repository<CrmLead>,
        @InjectRepository(CrmClient)
        private clientsRepository: Repository<CrmClient>,
        @InjectRepository(CrmContact)
        private contactsRepository: Repository<CrmContact>,
        @InjectRepository(OrganizationMember)
        private membersRepository: Repository<OrganizationMember>,
        @InjectRepository(CrmActivity)
        private activitiesRepository: Repository<CrmActivity>,
        private dataSource: DataSource,
    ) { }

    async create(createLeadDto: CreateLeadDto, organizationId: string): Promise<CrmLead> {
        let lead = this.leadsRepository.create({
            ...createLeadDto,
            organizationId,
            assignedToId: createLeadDto.assigned_to,
        });

        if (!lead.assignedToId) {
            // First try territory rules, then fall back to round-robin
            const territoryAssignee = await this.assignByTerritory(lead, organizationId);
            lead.assignedToId = territoryAssignee || await this.assignRoundRobin(organizationId);
        }

        lead.score = this.calculateInitialScore(lead);
        const savedLead = await this.leadsRepository.save(lead);

        if (savedLead.assignedToId) {
            const dueDate = new Date();
            dueDate.setDate(dueDate.getDate() + 3);

            const followUpActivity = this.activitiesRepository.create({
                organizationId,
                subject: 'Initial Lead Follow-up',
                description: `Follow up with new lead: ${savedLead.first_name} ${savedLead.last_name || ''}`,
                type: 'TASK',
                due_date: dueDate,
                assignedToId: savedLead.assignedToId,
                leadId: savedLead.id,
            });
            await this.activitiesRepository.save(followUpActivity);
        }

        return savedLead;
    }

    private async assignByTerritory(lead: CrmLead, organizationId: string): Promise<string | null> {
        // Simple territory logic based on country/city in custom fields or address
        // For now, a mock implementation that can be expanded with real rules
        if (lead.country === 'Nepal' || lead.city === 'Kathmandu') {
            // Find a specific user or group for this territory
            // This could be fetched from CrmSettings
            return null; // Fallback to Round-robin if no specific rule matched
        }
        return null;
    }

    async findAll(organizationId: string): Promise<CrmLead[]> {
        return this.leadsRepository.find({
            where: { organizationId },
            relations: ['assignedTo'],
            order: { createdAt: 'DESC' },
        });
    }

    async findOne(id: string, organizationId: string): Promise<CrmLead> {
        const lead = await this.leadsRepository.findOne({
            where: { id, organizationId },
            relations: ['assignedTo'],
        });

        if (!lead) {
            throw new NotFoundException(`Lead with ID ${id} not found`);
        }

        return lead;
    }

    async update(id: string, updateLeadDto: UpdateLeadDto, organizationId: string): Promise<CrmLead> {
        const lead = await this.findOne(id, organizationId);

        if (updateLeadDto.assigned_to) {
            lead.assignedToId = updateLeadDto.assigned_to;
        }

        Object.assign(lead, {
            ...updateLeadDto,
            assignedToId: updateLeadDto.assigned_to !== undefined ? updateLeadDto.assigned_to : lead.assignedToId
        });

        // Recalculate score on update if relevant fields change
        lead.score = this.calculateInitialScore(lead);

        return this.leadsRepository.save(lead);
    }

    async convert(id: string, organizationId: string): Promise<CrmClient> {
        const lead = await this.findOne(id, organizationId);

        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            // 1. Create Client
            const client = this.clientsRepository.create({
                name: lead.company || `${lead.first_name} ${lead.last_name}`,
                company: lead.company,
                email: lead.email,
                phone: lead.phone,
                organizationId,
                category: 'CUSTOMER',
                assignedToId: lead.assignedToId,
            });
            const savedClient = await queryRunner.manager.save(client);

            // 2. Create Contact
            const contact = this.contactsRepository.create({
                first_name: lead.first_name,
                last_name: lead.last_name,
                email: lead.email,
                phone: lead.phone,
                job_title: lead.job_title,
                clientId: savedClient.id,
                organizationId,
                is_primary: true,
            });
            await queryRunner.manager.save(contact);

            // 3. Update Lead Status
            lead.status = 'WON';
            await queryRunner.manager.save(lead);

            await queryRunner.commitTransaction();
            return savedClient;
        } catch (err) {
            await queryRunner.rollbackTransaction();
            throw err;
        } finally {
            await queryRunner.release();
        }
    }

    private calculateInitialScore(lead: CrmLead): number {
        let score = 0;
        if (lead.email) score += 10;
        if (lead.phone) score += 10;
        if (lead.company) score += 10;
        if (lead.estimated_value && Number(lead.estimated_value) > 1000) score += 20;
        if (lead.source) score += 5;
        return score;
    }

    private async assignRoundRobin(organizationId: string): Promise<string | null> {
        const members = await this.membersRepository.find({
            where: { organization_id: organizationId },
            order: { user_id: 'ASC' }
        });

        if (members.length === 0) return null;

        const lastLead = await this.leadsRepository.findOne({
            where: { organizationId },
            order: { createdAt: 'DESC' },
            select: ['assignedToId']
        });

        if (!lastLead || !lastLead.assignedToId) return members[0].user_id;

        const lastAssigneeIndex = members.findIndex(m => m.user_id === lastLead.assignedToId);
        const nextIndex = (lastAssigneeIndex + 1) % members.length;
        return members[nextIndex].user_id;
    }

    async getForecast(organizationId: string): Promise<any> {
        const leads = await this.leadsRepository.find({
            where: {
                organizationId,
                status: Not(In(['WON', 'LOST', 'CONVERTED']))
            },
        });

        const probabilityMap: Record<string, number> = {
            'NEW': 0.1,
            'CONTACTED': 0.2,
            'QUALIFIED': 0.4,
            'PROPOSAL': 0.6,
            'NEGOTIATION': 0.8,
        };

        return leads.reduce((acc, lead) => {
            const prob = probabilityMap[lead.status] || 0.05; // Fallback
            const val = Number(lead.estimated_value) || 0;
            const weightedValue = val * prob;

            acc.totalWeightedValue += weightedValue;
            acc.totalRawValue += val;

            if (!acc.byStatus[lead.status]) {
                acc.byStatus[lead.status] = { raw: 0, weighted: 0, count: 0 };
            }

            acc.byStatus[lead.status].raw += val;
            acc.byStatus[lead.status].weighted += weightedValue;
            acc.byStatus[lead.status].count += 1;

            return acc;
        }, {
            totalWeightedValue: 0,
            totalRawValue: 0,
            byStatus: {} as Record<string, { raw: number, weighted: number, count: number }>
        });
    }

    async bulkCreate(leadsData: CreateLeadDto[], organizationId: string): Promise<CrmLead[]> {
        const leads = await Promise.all(leadsData.map(async (dto) => {
            const lead = this.leadsRepository.create({
                ...dto,
                organizationId,
                assignedToId: dto.assigned_to,
            });

            if (!lead.assignedToId) {
                const territoryAssignee = await this.assignByTerritory(lead, organizationId);
                lead.assignedToId = territoryAssignee || await this.assignRoundRobin(organizationId);
            }

            lead.score = this.calculateInitialScore(lead);
            return lead;
        }));

        return this.leadsRepository.save(leads);
    }

    async remove(id: string, organizationId: string): Promise<void> {
        const result = await this.leadsRepository.delete({ id, organizationId });
        if (result.affected === 0) {
            throw new NotFoundException(`Lead with ID ${id} not found`);
        }
    }
}
