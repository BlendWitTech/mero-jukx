import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HrDepartment } from '../../../../../src/database/entities';

@Injectable()
export class DepartmentsService {
    constructor(
        @InjectRepository(HrDepartment)
        private readonly departmentsRepository: Repository<HrDepartment>,
    ) { }

    async create(organizationId: string, data: any): Promise<HrDepartment> {
        return await this.departmentsRepository.save({
            ...data,
            organizationId,
        } as any);
    }

    async findAll(organizationId: string): Promise<HrDepartment[]> {
        return await this.departmentsRepository.find({
            where: { organizationId } as any,
            relations: ['parent', 'manager'],
        });
    }

    async findOne(organizationId: string, id: string): Promise<HrDepartment> {
        const department = await this.departmentsRepository.findOne({
            where: { id, organizationId } as any,
            relations: ['parent', 'manager', 'children'],
        });
        if (!department) {
            throw new NotFoundException(`Department with ID ${id} not found`);
        }
        return department;
    }

    async update(organizationId: string, id: string, data: any): Promise<HrDepartment> {
        const department = await this.findOne(organizationId, id);
        Object.assign(department, data);
        return await this.departmentsRepository.save(department);
    }

    async remove(organizationId: string, id: string): Promise<void> {
        const department = await this.findOne(organizationId, id);
        await this.departmentsRepository.remove(department);
    }
}
