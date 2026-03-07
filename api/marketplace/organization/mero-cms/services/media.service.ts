import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CmsMedia } from '../entities/cms-media.entity';
import { UpdateMediaDto } from '../dto/media.dto';

@Injectable()
export class MediaService {
    constructor(
        @InjectRepository(CmsMedia)
        private mediaRepository: Repository<CmsMedia>,
    ) {}

    async findAll(organizationId: string, folder?: string): Promise<CmsMedia[]> {
        const where: any = { organization_id: organizationId };
        if (folder) where.folder = folder;
        return this.mediaRepository.find({
            where,
            order: { created_at: 'DESC' },
        });
    }

    async findOne(id: string, organizationId: string): Promise<CmsMedia> {
        const media = await this.mediaRepository.findOne({
            where: { id, organization_id: organizationId },
        });
        if (!media) throw new NotFoundException(`Media ${id} not found`);
        return media;
    }

    async create(
        file: { filename: string; originalname: string; mimetype: string; size: number; path: string },
        organizationId: string,
        userId: string,
        folder?: string,
    ): Promise<CmsMedia> {
        const media = this.mediaRepository.create({
            organization_id: organizationId,
            filename: file.filename,
            original_name: file.originalname,
            mime_type: file.mimetype,
            size: file.size,
            url: file.path,
            folder: folder || 'general',
            uploaded_by: userId,
        });
        return this.mediaRepository.save(media);
    }

    async update(id: string, dto: UpdateMediaDto, organizationId: string): Promise<CmsMedia> {
        const media = await this.findOne(id, organizationId);
        Object.assign(media, dto);
        return this.mediaRepository.save(media);
    }

    async remove(id: string, organizationId: string): Promise<void> {
        const media = await this.findOne(id, organizationId);
        await this.mediaRepository.delete(media.id);
    }

    async getFolders(organizationId: string): Promise<string[]> {
        const items = await this.mediaRepository
            .createQueryBuilder('media')
            .select('DISTINCT media.folder', 'folder')
            .where('media.organization_id = :organizationId', { organizationId })
            .getRawMany();
        return items.map((i) => i.folder).filter(Boolean);
    }

    async getStats(organizationId: string) {
        const total = await this.mediaRepository.count({ where: { organization_id: organizationId } });
        const sizeResult = await this.mediaRepository
            .createQueryBuilder('media')
            .select('SUM(media.size)', 'totalSize')
            .where('media.organization_id = :organizationId', { organizationId })
            .getRawOne();
        return { total, totalSize: Number(sizeResult?.totalSize || 0) };
    }
}
