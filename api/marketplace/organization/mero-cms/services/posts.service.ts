import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CmsPost, CmsPostStatus } from '../entities/cms-post.entity';
import { CreatePostDto, UpdatePostDto } from '../dto/post.dto';

@Injectable()
export class PostsService {
    constructor(
        @InjectRepository(CmsPost)
        private postsRepository: Repository<CmsPost>,
    ) {}

    async findAll(organizationId: string, category?: string): Promise<CmsPost[]> {
        const where: any = { organization_id: organizationId };
        if (category) where.category = category;
        return this.postsRepository.find({
            where,
            order: { created_at: 'DESC' },
        });
    }

    async findOne(id: string, organizationId: string): Promise<CmsPost> {
        const post = await this.postsRepository.findOne({
            where: { id, organization_id: organizationId },
        });
        if (!post) throw new NotFoundException(`Post ${id} not found`);
        return post;
    }

    async create(dto: CreatePostDto, organizationId: string, userId: string): Promise<CmsPost> {
        const slug = dto.slug || this.generateSlug(dto.title);
        const post = this.postsRepository.create({
            ...dto,
            slug,
            organization_id: organizationId,
            author_id: userId,
        });
        return this.postsRepository.save(post);
    }

    async update(id: string, dto: UpdatePostDto, organizationId: string): Promise<CmsPost> {
        const post = await this.findOne(id, organizationId);
        Object.assign(post, dto);
        return this.postsRepository.save(post);
    }

    async publish(id: string, organizationId: string): Promise<CmsPost> {
        const post = await this.findOne(id, organizationId);
        post.status = CmsPostStatus.PUBLISHED;
        post.published_at = new Date();
        return this.postsRepository.save(post);
    }

    async unpublish(id: string, organizationId: string): Promise<CmsPost> {
        const post = await this.findOne(id, organizationId);
        post.status = CmsPostStatus.DRAFT;
        return this.postsRepository.save(post);
    }

    async remove(id: string, organizationId: string): Promise<void> {
        const post = await this.findOne(id, organizationId);
        await this.postsRepository.softDelete(post.id);
    }

    async getStats(organizationId: string) {
        const total = await this.postsRepository.count({ where: { organization_id: organizationId } });
        const published = await this.postsRepository.count({ where: { organization_id: organizationId, status: CmsPostStatus.PUBLISHED } });
        const drafts = await this.postsRepository.count({ where: { organization_id: organizationId, status: CmsPostStatus.DRAFT } });
        return { total, published, drafts };
    }

    async getCategories(organizationId: string): Promise<string[]> {
        const posts = await this.postsRepository
            .createQueryBuilder('post')
            .select('DISTINCT post.category', 'category')
            .where('post.organization_id = :organizationId', { organizationId })
            .andWhere('post.category IS NOT NULL')
            .getRawMany();
        return posts.map((p) => p.category).filter(Boolean);
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
