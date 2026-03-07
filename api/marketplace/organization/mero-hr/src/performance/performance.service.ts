import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HrPerformanceGoal } from '../../../../../src/database/entities/hr_performance_goals.entity';
import { HrPerformanceReview } from '../../../../../src/database/entities/hr_performance_reviews.entity';

@Injectable()
export class PerformanceService {
    constructor(
        @InjectRepository(HrPerformanceGoal)
        private readonly goalRepo: Repository<HrPerformanceGoal>,
        @InjectRepository(HrPerformanceReview)
        private readonly reviewRepo: Repository<HrPerformanceReview>,
    ) { }

    private currentFiscalYear(): string {
        const now = new Date();
        const month = now.getMonth() + 1;
        const year = now.getFullYear();
        return month >= 8 ? `${year}/${(year + 1).toString().slice(-2)}` : `${year - 1}/${year.toString().slice(-2)}`;
    }

    // ─── Goals ────────────────────────────────────────────────────────────────

    async getGoals(organizationId: string, employeeId?: string, fiscalYear?: string): Promise<HrPerformanceGoal[]> {
        const where: any = { organizationId };
        if (employeeId) where.employeeId = employeeId;
        if (fiscalYear) where.fiscal_year = fiscalYear;
        return this.goalRepo.find({
            where,
            relations: ['employee'],
            order: { createdAt: 'DESC' },
        });
    }

    async createGoal(organizationId: string, data: Partial<HrPerformanceGoal>): Promise<HrPerformanceGoal> {
        const goal = this.goalRepo.create({
            ...data,
            organizationId,
            fiscal_year: data.fiscal_year || this.currentFiscalYear(),
        });
        return this.goalRepo.save(goal);
    }

    async updateGoal(organizationId: string, id: string, data: Partial<HrPerformanceGoal>): Promise<HrPerformanceGoal> {
        const goal = await this.goalRepo.findOne({ where: { id, organizationId } });
        if (!goal) throw new NotFoundException('Goal not found');
        Object.assign(goal, data);
        return this.goalRepo.save(goal);
    }

    async deleteGoal(organizationId: string, id: string): Promise<void> {
        const goal = await this.goalRepo.findOne({ where: { id, organizationId } });
        if (!goal) throw new NotFoundException('Goal not found');
        await this.goalRepo.remove(goal);
    }

    // ─── Reviews ──────────────────────────────────────────────────────────────

    async getReviews(organizationId: string, employeeId?: string, fiscalYear?: string): Promise<HrPerformanceReview[]> {
        const where: any = { organizationId };
        if (employeeId) where.employeeId = employeeId;
        if (fiscalYear) where.fiscal_year = fiscalYear;
        return this.reviewRepo.find({
            where,
            relations: ['employee', 'reviewer'],
            order: { review_date: 'DESC' },
        });
    }

    async createReview(organizationId: string, data: Partial<HrPerformanceReview>): Promise<HrPerformanceReview> {
        const review = this.reviewRepo.create({
            ...data,
            organizationId,
            fiscal_year: data.fiscal_year || this.currentFiscalYear(),
        });
        return this.reviewRepo.save(review);
    }

    async updateReview(organizationId: string, id: string, data: Partial<HrPerformanceReview>): Promise<HrPerformanceReview> {
        const review = await this.reviewRepo.findOne({ where: { id, organizationId } });
        if (!review) throw new NotFoundException('Review not found');
        Object.assign(review, data);
        return this.reviewRepo.save(review);
    }

    async deleteReview(organizationId: string, id: string): Promise<void> {
        const review = await this.reviewRepo.findOne({ where: { id, organizationId } });
        if (!review) throw new NotFoundException('Review not found');
        await this.reviewRepo.remove(review);
    }
}
