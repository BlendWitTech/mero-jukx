import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HrExitRecord } from '../../../../../src/database/entities/hr_exit_records.entity';

@Injectable()
export class ExitService {
    constructor(
        @InjectRepository(HrExitRecord)
        private readonly exitRepo: Repository<HrExitRecord>,
    ) { }

    async getAll(organizationId: string, status?: string): Promise<HrExitRecord[]> {
        const where: any = { organizationId };
        if (status) where.status = status;
        return this.exitRepo.find({
            where,
            relations: ['employee'],
            order: { createdAt: 'DESC' },
        });
    }

    async getOne(organizationId: string, id: string): Promise<HrExitRecord> {
        const record = await this.exitRepo.findOne({
            where: { id, organizationId },
            relations: ['employee'],
        });
        if (!record) throw new NotFoundException('Exit record not found');
        return record;
    }

    async create(organizationId: string, data: Partial<HrExitRecord>): Promise<HrExitRecord> {
        const record = this.exitRepo.create({ ...data, organizationId, status: 'INITIATED' });
        return this.exitRepo.save(record);
    }

    async update(organizationId: string, id: string, data: Partial<HrExitRecord>): Promise<HrExitRecord> {
        const record = await this.getOne(organizationId, id);
        Object.assign(record, data);
        return this.exitRepo.save(record);
    }

    async delete(organizationId: string, id: string): Promise<void> {
        const record = await this.getOne(organizationId, id);
        await this.exitRepo.remove(record);
    }
}
