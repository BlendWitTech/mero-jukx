import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HrDocument } from '../../../../../src/database/entities';

@Injectable()
export class DocumentsService {
    constructor(
        @InjectRepository(HrDocument)
        private readonly documentsRepository: Repository<HrDocument>,
    ) { }

    async create(organizationId: string, data: any): Promise<HrDocument> {
        const document = this.documentsRepository.create({
            ...data,
            organizationId,
        } as Partial<HrDocument>);
        return await this.documentsRepository.save(document);
    }

    async findAll(organizationId: string, employeeId?: string): Promise<HrDocument[]> {
        const where: any = { organizationId };
        if (employeeId) {
            where.employeeId = employeeId;
        }
        return await this.documentsRepository.find({
            where,
            relations: ['employee'],
        } as any);
    }

    async findOne(organizationId: string, id: string): Promise<HrDocument> {
        const document = await this.documentsRepository.findOne({
            where: { id, organizationId } as any,
            relations: ['employee'],
        });
        if (!document) {
            throw new NotFoundException(`Document with ID ${id} not found`);
        }
        return document;
    }

    async remove(organizationId: string, id: string): Promise<void> {
        const document = await this.findOne(organizationId, id);
        await this.documentsRepository.remove(document);
    }
}
