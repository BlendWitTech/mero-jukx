import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ExciseDutyRate, ExciseDutyStatus } from '@src/database/entities/excise_duty_rates.entity';

export interface CreateExciseDutyDto {
    category: string;
    description?: string;
    rate: number;
    effective_date?: string;
    status?: ExciseDutyStatus;
}

@Injectable()
export class ExciseDutyService {
    private readonly defaultRates = [
        { category: 'Spirits & Liquor', description: 'Alcoholic beverages above 30% ABV', rate: 40 },
        { category: 'Beer & Wine', description: 'Beer, wine, and low-alcohol beverages', rate: 25 },
        { category: 'Tobacco Products', description: 'Cigarettes, bidi, chewing tobacco', rate: 100 },
        { category: 'Petroleum Products', description: 'Petrol, diesel, LPG', rate: 10 },
    ];

    constructor(
        @InjectRepository(ExciseDutyRate)
        private readonly repo: Repository<ExciseDutyRate>,
    ) {}

    async findAll(organizationId: string): Promise<ExciseDutyRate[]> {
        const existing = await this.repo.find({
            where: { organization_id: organizationId },
            order: { category: 'ASC' },
        });

        // Seed defaults on first access if none exist
        if (existing.length === 0) {
            const defaults = this.defaultRates.map(r =>
                this.repo.create({
                    organization_id: organizationId,
                    category: r.category,
                    description: r.description,
                    rate: r.rate,
                    status: ExciseDutyStatus.ACTIVE,
                })
            );
            return this.repo.save(defaults);
        }

        return existing;
    }

    async create(organizationId: string, dto: CreateExciseDutyDto): Promise<ExciseDutyRate> {
        const rate = this.repo.create({
            organization_id: organizationId,
            category: dto.category,
            description: dto.description,
            rate: dto.rate,
            effective_date: dto.effective_date ? new Date(dto.effective_date) : undefined,
            status: dto.status ?? ExciseDutyStatus.ACTIVE,
        });
        return this.repo.save(rate);
    }

    async update(id: string, organizationId: string, dto: Partial<CreateExciseDutyDto>): Promise<ExciseDutyRate> {
        const rate = await this.repo.findOne({ where: { id, organization_id: organizationId } });
        if (!rate) throw new NotFoundException('Excise duty rate not found');
        Object.assign(rate, dto);
        return this.repo.save(rate);
    }

    async remove(id: string, organizationId: string): Promise<{ deleted: boolean }> {
        const rate = await this.repo.findOne({ where: { id, organization_id: organizationId } });
        if (!rate) throw new NotFoundException('Excise duty rate not found');
        await this.repo.remove(rate);
        return { deleted: true };
    }
}
