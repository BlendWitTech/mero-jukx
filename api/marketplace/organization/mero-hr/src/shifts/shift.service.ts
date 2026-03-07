import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HrShift } from '../../../../../src/database/entities';

@Injectable()
export class ShiftService {
    constructor(
        @InjectRepository(HrShift)
        private readonly shiftRepository: Repository<HrShift>,
    ) { }

    async create(organizationId: string, dto: Partial<HrShift>): Promise<HrShift> {
        const shift = this.shiftRepository.create({ ...dto, organizationId });
        return await this.shiftRepository.save(shift);
    }

    async findAll(organizationId: string): Promise<HrShift[]> {
        return await this.shiftRepository.find({
            where: { organizationId },
            order: { name: 'ASC' },
        });
    }

    async findOne(organizationId: string, id: string): Promise<HrShift> {
        const shift = await this.shiftRepository.findOne({ where: { id, organizationId } });
        if (!shift) throw new NotFoundException('Shift not found');
        return shift;
    }

    async update(organizationId: string, id: string, dto: Partial<HrShift>): Promise<HrShift> {
        const shift = await this.findOne(organizationId, id);
        Object.assign(shift, dto);
        return await this.shiftRepository.save(shift);
    }

    async remove(organizationId: string, id: string): Promise<void> {
        const shift = await this.findOne(organizationId, id);
        await this.shiftRepository.remove(shift);
    }
}
