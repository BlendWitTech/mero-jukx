import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CrmDeal } from '@src/database/entities/crm_deals.entity';
import { CrmPipeline } from '@src/database/entities/crm_pipelines.entity';
import { CrmStage } from '@src/database/entities/crm_stages.entity';
import { CreateDealDto, UpdateDealDto } from '../dto/deals.dto';
import { CreatePipelineDto, UpdatePipelineDto } from '../dto/pipeline.dto';
import { CreateStageDto, UpdateStageDto } from '../dto/stage.dto';
import { User } from '@src/database/entities/users.entity';

@Injectable()
export class DealsService {
    constructor(
        @InjectRepository(CrmDeal)
        private dealsRepository: Repository<CrmDeal>,
        @InjectRepository(CrmPipeline)
        private pipelineRepository: Repository<CrmPipeline>,
        @InjectRepository(CrmStage)
        private stageRepository: Repository<CrmStage>,
    ) { }

    async create(createDealDto: CreateDealDto, organizationId: string): Promise<CrmDeal> {
        const deal = this.dealsRepository.create({
            ...createDealDto,
            organizationId,
            assignedToId: createDealDto.assigned_to,
            leadId: createDealDto.lead_id,
            pipelineId: createDealDto.pipeline_id,
            stageId: createDealDto.stage_id,
        });

        if (!deal.pipelineId) {
            const defaultPipeline = await this.pipelineRepository.findOne({
                where: { organizationId, is_default: true }
            });
            if (defaultPipeline) deal.pipelineId = defaultPipeline.id;
        }

        return this.dealsRepository.save(deal);
    }

    async findAll(organizationId: string): Promise<CrmDeal[]> {
        return this.dealsRepository.find({
            where: { organizationId },
            relations: ['assignedTo', 'lead'],
            order: { createdAt: 'DESC' },
        });
    }

    async findOne(id: string, organizationId: string): Promise<CrmDeal> {
        const deal = await this.dealsRepository.findOne({
            where: { id, organizationId },
            relations: ['assignedTo', 'lead'],
        });

        if (!deal) {
            throw new NotFoundException(`Deal with ID ${id} not found`);
        }

        return deal;
    }

    async update(id: string, updateDealDto: UpdateDealDto, organizationId: string): Promise<CrmDeal> {
        const deal = await this.findOne(id, organizationId);

        if (updateDealDto.assigned_to !== undefined) deal.assignedToId = updateDealDto.assigned_to;
        if (updateDealDto.lead_id !== undefined) deal.leadId = updateDealDto.lead_id;
        if (updateDealDto.pipeline_id !== undefined) deal.pipelineId = updateDealDto.pipeline_id;
        if (updateDealDto.stage_id !== undefined) deal.stageId = updateDealDto.stage_id;

        Object.assign(deal, updateDealDto);

        return this.dealsRepository.save(deal);
    }

    async findByLead(leadId: string, organizationId: string): Promise<CrmDeal[]> {
        return this.dealsRepository.find({
            where: { leadId, organizationId },
            relations: ['stage', 'pipeline']
        });
    }

    async remove(id: string, organizationId: string): Promise<void> {
        const result = await this.dealsRepository.delete({ id, organizationId });
        if (result.affected === 0) {
            throw new NotFoundException(`Deal with ID ${id} not found`);
        }
    }

    // Pipeline Management
    async createPipeline(organizationId: string, dto: CreatePipelineDto): Promise<CrmPipeline> {
        if (dto.is_default) {
            await this.pipelineRepository.update({ organizationId, is_default: true }, { is_default: false });
        }
        const pipeline = this.pipelineRepository.create({ ...dto, organizationId });
        return this.pipelineRepository.save(pipeline);
    }

    async findAllPipelines(organizationId: string): Promise<CrmPipeline[]> {
        return this.pipelineRepository.find({
            where: { organizationId },
            relations: ['stages'],
            order: { name: 'ASC' }
        });
    }

    async updatePipeline(id: string, organizationId: string, dto: UpdatePipelineDto): Promise<CrmPipeline> {
        const pipeline = await this.pipelineRepository.findOne({ where: { id, organizationId } });
        if (!pipeline) throw new NotFoundException('Pipeline not found');

        if (dto.is_default && !pipeline.is_default) {
            await this.pipelineRepository.update({ organizationId, is_default: true }, { is_default: false });
        }
        Object.assign(pipeline, dto);
        return this.pipelineRepository.save(pipeline);
    }

    async removePipeline(id: string, organizationId: string): Promise<void> {
        const result = await this.pipelineRepository.delete({ id, organizationId });
        if (result.affected === 0) throw new NotFoundException('Pipeline not found');
    }

    // Stage Management
    async createStage(organizationId: string, dto: CreateStageDto): Promise<CrmStage> {
        const stage = this.stageRepository.create({ ...dto, organizationId });
        return this.stageRepository.save(stage);
    }

    async updateStage(id: string, organizationId: string, dto: UpdateStageDto): Promise<CrmStage> {
        const stage = await this.stageRepository.findOne({ where: { id, organizationId } });
        if (!stage) throw new NotFoundException('Stage not found');
        Object.assign(stage, dto);
        return this.stageRepository.save(stage);
    }

    async removeStage(id: string, organizationId: string): Promise<void> {
        const result = await this.stageRepository.delete({ id, organizationId });
        if (result.affected === 0) throw new NotFoundException('Stage not found');
    }

    // Team Collaboration
    async addTeamMember(dealId: string, userId: string, organizationId: string): Promise<CrmDeal> {
        const deal = await this.dealsRepository.findOne({
            where: { id: dealId, organizationId },
            relations: ['teamMembers']
        });
        if (!deal) throw new NotFoundException('Deal not found');

        if (!deal.teamMembers) deal.teamMembers = [];
        if (!deal.teamMembers.find(m => m.id === userId)) {
            const user = new User();
            user.id = userId;
            deal.teamMembers.push(user);
        }

        return this.dealsRepository.save(deal);
    }

    async removeTeamMember(dealId: string, userId: string, organizationId: string): Promise<CrmDeal> {
        const deal = await this.dealsRepository.findOne({
            where: { id: dealId, organizationId },
            relations: ['teamMembers']
        });
        if (!deal) throw new NotFoundException('Deal not found');

        deal.teamMembers = deal.teamMembers?.filter(m => m.id !== userId) || [];
        return this.dealsRepository.save(deal);
    }
}
