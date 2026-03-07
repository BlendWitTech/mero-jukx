import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HrEmployee } from '../../../../../src/database/entities';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';

@Injectable()
export class EmployeesService {
    constructor(
        @InjectRepository(HrEmployee)
        private readonly employeesRepository: Repository<HrEmployee>,
    ) { }

    async create(organizationId: string, createEmployeeDto: CreateEmployeeDto): Promise<HrEmployee> {
        const employee = this.employeesRepository.create({
            ...createEmployeeDto,
            organizationId,
        });
        return await this.employeesRepository.save(employee);
    }

    async findAll(organizationId: string): Promise<HrEmployee[]> {
        return await this.employeesRepository.find({
            where: { organizationId },
            relations: ['user', 'departmentRel', 'designationRel', 'supervisor'],
        });
    }

    async findByUserId(organizationId: string, userId: string): Promise<HrEmployee> {
        const employee = await this.employeesRepository.findOne({
            where: { organizationId, userId },
            relations: ['user', 'departmentRel', 'designationRel', 'supervisor', 'documents'],
        });
        if (!employee) {
            throw new NotFoundException('Employee linked to current user not found');
        }
        return employee;
    }

    async findOne(organizationId: string, id: string): Promise<HrEmployee> {
        const employee = await this.employeesRepository.findOne({
            where: { id, organizationId },
            relations: ['user', 'departmentRel', 'designationRel', 'supervisor', 'documents'],
        });
        if (!employee) {
            throw new NotFoundException(`Employee with ID ${id} not found`);
        }
        return employee;
    }

    async update(organizationId: string, id: string, updateEmployeeDto: UpdateEmployeeDto): Promise<HrEmployee> {
        const employee = await this.findOne(organizationId, id);
        Object.assign(employee, updateEmployeeDto);
        return await this.employeesRepository.save(employee);
    }

    async remove(organizationId: string, id: string): Promise<void> {
        const employee = await this.findOne(organizationId, id);
        await this.employeesRepository.remove(employee);
    }
}
