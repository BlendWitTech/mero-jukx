import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HrTrainingProgram } from '../../../../../src/database/entities/hr_training_programs.entity';

@Injectable()
export class TrainingService {
    constructor(
        @InjectRepository(HrTrainingProgram)
        private readonly trainingRepo: Repository<HrTrainingProgram>,
    ) { }

    async getAll(organizationId: string, status?: string): Promise<HrTrainingProgram[]> {
        const where: any = { organizationId };
        if (status) where.status = status;
        return this.trainingRepo.find({ where, order: { start_date: 'ASC' } });
    }

    async getOne(organizationId: string, id: string): Promise<HrTrainingProgram> {
        const program = await this.trainingRepo.findOne({ where: { id, organizationId } });
        if (!program) throw new NotFoundException('Training program not found');
        return program;
    }

    async create(organizationId: string, data: Partial<HrTrainingProgram>): Promise<HrTrainingProgram> {
        const program = this.trainingRepo.create({ ...data, organizationId });
        return this.trainingRepo.save(program);
    }

    async update(organizationId: string, id: string, data: Partial<HrTrainingProgram>): Promise<HrTrainingProgram> {
        const program = await this.getOne(organizationId, id);
        Object.assign(program, data);
        return this.trainingRepo.save(program);
    }

    async enroll(organizationId: string, id: string): Promise<HrTrainingProgram> {
        const program = await this.getOne(organizationId, id);
        if (program.enrolled < program.capacity) {
            program.enrolled += 1;
        }
        return this.trainingRepo.save(program);
    }

    async delete(organizationId: string, id: string): Promise<void> {
        const program = await this.getOne(organizationId, id);
        await this.trainingRepo.remove(program);
    }
}
