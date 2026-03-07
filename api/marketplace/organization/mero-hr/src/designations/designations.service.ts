import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HrDesignation } from '../../../../../src/database/entities';

@Injectable()
export class DesignationsService {
    constructor(
        @InjectRepository(HrDesignation)
        private readonly designationsRepository: Repository<HrDesignation>,
    ) { }

    async create(organizationId: string, data: any): Promise<HrDesignation> {
        return await this.designationsRepository.save({
            ...data,
            organizationId,
        } as any);
    }

    async findAll(organizationId: string): Promise<HrDesignation[]> {
        return await this.designationsRepository.find({
            where: { organizationId } as any,
        });
    }

    async findOne(organizationId: string, id: string): Promise<HrDesignation> {
        const designation = await this.designationsRepository.findOne({
            where: { id, organizationId } as any,
        });
        if (!designation) {
            throw new NotFoundException(`Designation with ID ${id} not found`);
        }
        return designation;
    }

    async update(organizationId: string, id: string, data: any): Promise<HrDesignation> {
        const designation = await this.findOne(organizationId, id);
        Object.assign(designation, data);
        return await this.designationsRepository.save(designation);
    }

    async remove(organizationId: string, id: string): Promise<void> {
        const designation = await this.findOne(organizationId, id);
        await this.designationsRepository.remove(designation);
    }
}
