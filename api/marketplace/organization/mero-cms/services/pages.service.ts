import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CmsPage, CmsPageStatus } from '../entities/cms-page.entity';
import { CreatePageDto, UpdatePageDto } from '../dto/page.dto';

@Injectable()
export class PagesService {
    constructor(
        @InjectRepository(CmsPage)
        private pagesRepository: Repository<CmsPage>,
    ) {}

    async findAll(organizationId: string): Promise<CmsPage[]> {
        return this.pagesRepository.find({
            where: { organization_id: organizationId },
            order: { created_at: 'DESC' },
        });
    }

    async findOne(id: string, organizationId: string): Promise<CmsPage> {
        const page = await this.pagesRepository.findOne({
            where: { id, organization_id: organizationId },
        });
        if (!page) throw new NotFoundException(`Page ${id} not found`);
        return page;
    }

    async create(dto: CreatePageDto, organizationId: string, userId: string): Promise<CmsPage> {
        const slug = dto.slug || this.generateSlug(dto.title);
        const page = this.pagesRepository.create({
            ...dto,
            slug,
            organization_id: organizationId,
            created_by: userId,
        });
        return this.pagesRepository.save(page);
    }

    async update(id: string, dto: UpdatePageDto, organizationId: string): Promise<CmsPage> {
        const page = await this.findOne(id, organizationId);
        if (dto.slug === undefined && dto.title && dto.title !== page.title) {
            dto.slug = this.generateSlug(dto.title);
        }
        Object.assign(page, dto);
        return this.pagesRepository.save(page);
    }

    async publish(id: string, organizationId: string): Promise<CmsPage> {
        const page = await this.findOne(id, organizationId);
        page.status = CmsPageStatus.PUBLISHED;
        page.published_at = new Date();
        return this.pagesRepository.save(page);
    }

    async unpublish(id: string, organizationId: string): Promise<CmsPage> {
        const page = await this.findOne(id, organizationId);
        page.status = CmsPageStatus.DRAFT;
        return this.pagesRepository.save(page);
    }

    async remove(id: string, organizationId: string): Promise<void> {
        const page = await this.findOne(id, organizationId);
        await this.pagesRepository.softDelete(page.id);
    }

    async getStats(organizationId: string) {
        const total = await this.pagesRepository.count({ where: { organization_id: organizationId } });
        const published = await this.pagesRepository.count({ where: { organization_id: organizationId, status: CmsPageStatus.PUBLISHED } });
        const drafts = await this.pagesRepository.count({ where: { organization_id: organizationId, status: CmsPageStatus.DRAFT } });
        return { total, published, drafts };
    }

    private generateSlug(title: string): string {
        return title
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .trim();
    }
}
