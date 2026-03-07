import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HrJobOpening } from '../../../../../src/database/entities/hr_job_openings.entity';
import { HrCandidate } from '../../../../../src/database/entities/hr_candidates.entity';

@Injectable()
export class RecruitmentService {
    constructor(
        @InjectRepository(HrJobOpening)
        private readonly jobRepo: Repository<HrJobOpening>,
        @InjectRepository(HrCandidate)
        private readonly candidateRepo: Repository<HrCandidate>,
    ) { }

    // ─── Jobs ──────────────────────────────────────────────────────────────────

    async getJobs(organizationId: string): Promise<HrJobOpening[]> {
        return this.jobRepo.find({
            where: { organizationId },
            order: { createdAt: 'DESC' },
        });
    }

    async getJob(organizationId: string, id: string): Promise<HrJobOpening> {
        const job = await this.jobRepo.findOne({ where: { id, organizationId } });
        if (!job) throw new NotFoundException('Job opening not found');
        return job;
    }

    async createJob(organizationId: string, data: Partial<HrJobOpening>): Promise<HrJobOpening> {
        const job = this.jobRepo.create({ ...data, organizationId });
        return this.jobRepo.save(job);
    }

    async updateJob(organizationId: string, id: string, data: Partial<HrJobOpening>): Promise<HrJobOpening> {
        const job = await this.getJob(organizationId, id);
        Object.assign(job, data);
        return this.jobRepo.save(job);
    }

    async deleteJob(organizationId: string, id: string): Promise<void> {
        const job = await this.getJob(organizationId, id);
        await this.jobRepo.remove(job);
    }

    // ─── Candidates ─────────────────────────────────────────────────────────────

    async getCandidates(organizationId: string, jobId?: string): Promise<HrCandidate[]> {
        const where: any = { organizationId };
        if (jobId) where.jobId = jobId;
        return this.candidateRepo.find({
            where,
            relations: ['job'],
            order: { createdAt: 'DESC' },
        });
    }

    async getCandidate(organizationId: string, id: string): Promise<HrCandidate> {
        const candidate = await this.candidateRepo.findOne({
            where: { id, organizationId },
            relations: ['job'],
        });
        if (!candidate) throw new NotFoundException('Candidate not found');
        return candidate;
    }

    async createCandidate(organizationId: string, data: Partial<HrCandidate>): Promise<HrCandidate> {
        const candidate = this.candidateRepo.create({ ...data, organizationId });
        return this.candidateRepo.save(candidate);
    }

    async updateCandidate(organizationId: string, id: string, data: Partial<HrCandidate>): Promise<HrCandidate> {
        const candidate = await this.getCandidate(organizationId, id);
        if (data.stage === 'HIRED' && !candidate.hired_at) data.hired_at = new Date() as any;
        if (data.stage === 'REJECTED' && !candidate.rejected_at) data.rejected_at = new Date() as any;
        Object.assign(candidate, data);
        return this.candidateRepo.save(candidate);
    }

    async deleteCandidate(organizationId: string, id: string): Promise<void> {
        const candidate = await this.getCandidate(organizationId, id);
        await this.candidateRepo.remove(candidate);
    }
}
