import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CrmActivity } from '@src/database/entities/crm_activities.entity';
import { CrmLead } from '@src/database/entities/crm_leads.entity';
import { CreateActivityDto, UpdateActivityDto } from '../dto/activities.dto';

@Injectable()
export class ActivitiesService {
    constructor(
        @InjectRepository(CrmActivity)
        private activitiesRepository: Repository<CrmActivity>,
        @InjectRepository(CrmLead)
        private leadsRepository: Repository<CrmLead>,
    ) { }

    async create(createActivityDto: CreateActivityDto, organizationId: string): Promise<CrmActivity> {
        const activity = this.activitiesRepository.create({
            ...createActivityDto,
            organizationId,
            assignedToId: createActivityDto.assigned_to,
            leadId: createActivityDto.lead_id,
            dealId: createActivityDto.deal_id,
        });
        const savedActivity = await this.activitiesRepository.save(activity);

        if (createActivityDto.lead_id) {
            const lead = await this.leadsRepository.findOne({
                where: { id: createActivityDto.lead_id, organizationId }
            });
            if (lead) {
                lead.score = (lead.score || 0) + 5;
                await this.leadsRepository.save(lead);
            }
        }

        return savedActivity;
    }

    async findAll(organizationId: string, leadId?: string, dealId?: string): Promise<CrmActivity[]> {
        const whereCondition: any = { organizationId };

        if (leadId) whereCondition.leadId = leadId;
        if (dealId) whereCondition.dealId = dealId;

        return this.activitiesRepository.find({
            where: whereCondition,
            relations: ['assignedTo', 'lead', 'deal'],
            order: { createdAt: 'DESC' },
        });
    }

    async findOne(id: string, organizationId: string): Promise<CrmActivity> {
        const activity = await this.activitiesRepository.findOne({
            where: { id, organizationId },
            relations: ['assignedTo', 'lead', 'deal'],
        });

        if (!activity) {
            throw new NotFoundException(`Activity with ID ${id} not found`);
        }

        return activity;
    }

    async update(id: string, updateActivityDto: UpdateActivityDto, organizationId: string): Promise<CrmActivity> {
        const activity = await this.findOne(id, organizationId);

        if (updateActivityDto.assigned_to !== undefined) activity.assignedToId = updateActivityDto.assigned_to;
        if (updateActivityDto.lead_id !== undefined) activity.leadId = updateActivityDto.lead_id;
        if (updateActivityDto.deal_id !== undefined) activity.dealId = updateActivityDto.deal_id;

        Object.assign(activity, updateActivityDto);

        return this.activitiesRepository.save(activity);
    }

    async remove(id: string, organizationId: string): Promise<void> {
        const result = await this.activitiesRepository.delete({ id, organizationId });
        if (result.affected === 0) {
            throw new NotFoundException(`Activity with ID ${id} not found`);
        }
    }
}
