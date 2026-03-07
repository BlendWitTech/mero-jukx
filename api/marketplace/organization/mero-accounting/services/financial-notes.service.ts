import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinancialNote, FinancialNoteSection } from '@src/database/entities/financial_notes.entity';

export interface UpsertFinancialNoteDto {
    fiscal_year: string;
    section: FinancialNoteSection;
    note_number?: number;
    title: string;
    content?: string;
}

@Injectable()
export class FinancialNotesService {
    constructor(
        @InjectRepository(FinancialNote)
        private readonly repo: Repository<FinancialNote>,
    ) {}

    async findByFiscalYear(organizationId: string, fiscalYear: string): Promise<FinancialNote[]> {
        return this.repo.find({
            where: { organization_id: organizationId, fiscal_year: fiscalYear },
            order: { section: 'ASC', note_number: 'ASC' },
        });
    }

    async findAll(organizationId: string): Promise<FinancialNote[]> {
        return this.repo.find({
            where: { organization_id: organizationId },
            order: { fiscal_year: 'DESC', section: 'ASC', note_number: 'ASC' },
        });
    }

    async create(organizationId: string, dto: UpsertFinancialNoteDto): Promise<FinancialNote> {
        // Auto-assign note_number if not provided
        if (!dto.note_number) {
            const existing = await this.repo.find({
                where: { organization_id: organizationId, fiscal_year: dto.fiscal_year, section: dto.section },
            });
            dto.note_number = existing.length + 1;
        }

        const note = this.repo.create({
            organization_id: organizationId,
            fiscal_year: dto.fiscal_year,
            section: dto.section,
            note_number: dto.note_number,
            title: dto.title,
            content: dto.content ?? '',
        });
        return this.repo.save(note);
    }

    async update(id: string, organizationId: string, dto: Partial<UpsertFinancialNoteDto>): Promise<FinancialNote> {
        const note = await this.repo.findOne({ where: { id, organization_id: organizationId } });
        if (!note) throw new NotFoundException('Financial note not found');
        Object.assign(note, dto);
        return this.repo.save(note);
    }

    async remove(id: string, organizationId: string): Promise<{ deleted: boolean }> {
        const note = await this.repo.findOne({ where: { id, organization_id: organizationId } });
        if (!note) throw new NotFoundException('Financial note not found');
        await this.repo.remove(note);
        return { deleted: true };
    }
}
