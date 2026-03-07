import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CrmLead } from '@src/database/entities/crm_leads.entity';
import { CrmDeal } from '@src/database/entities/crm_deals.entity';
import { CrmActivity } from '@src/database/entities/crm_activities.entity';

@Injectable()
export class AnalyticsService {
    constructor(
        @InjectRepository(CrmLead)
        private leadRepository: Repository<CrmLead>,
        @InjectRepository(CrmDeal)
        private dealRepository: Repository<CrmDeal>,
        @InjectRepository(CrmActivity)
        private activityRepository: Repository<CrmActivity>,
    ) { }

    async getFunnelData(organizationId: string) {
        // Simple counts for now to build the foundation
        const leadsCount = await this.leadRepository.count({ where: { organizationId } });
        const convertedLeads = await this.leadRepository.count({
            where: { organizationId, status: 'CONVERTED' }
        });

        const deals = await this.dealRepository.createQueryBuilder('deal')
            .select('stage.name', 'stageName')
            .addSelect('COUNT(deal.id)', 'count')
            .leftJoin('deal.stage', 'stage')
            .where('deal.organizationId = :organizationId', { organizationId })
            .groupBy('stage.id')
            .addGroupBy('stage.name')
            .getRawMany();

        return {
            leads: {
                total: leadsCount,
                converted: convertedLeads,
                conversionRate: leadsCount > 0 ? (convertedLeads / leadsCount) * 100 : 0
            },
            dealsByStage: deals
        };
    }

    async getSalesPerformance(organizationId: string) {
        const performance = await this.dealRepository.createQueryBuilder('deal')
            .select("SUM(CAST(deal.amount AS DECIMAL))", "totalRevenue")
            .addSelect("COUNT(deal.id)", "dealCount")
            .addSelect("user.name", "userName")
            .leftJoin("deal.assignedTo", "user")
            .where("deal.organizationId = :organizationId", { organizationId })
            .andWhere("deal.status = :status", { status: 'WON' })
            .groupBy("user.id")
            .addGroupBy("user.name")
            .getRawMany();

        return performance;
    }

    async getWinLossAnalytics(organizationId: string) {
        const wonLeads = await this.leadRepository.find({ where: { organizationId, status: 'WON' } });
        const lostLeads = await this.leadRepository.find({ where: { organizationId, status: 'LOST' } });

        const wonDeals = await this.dealRepository.find({ where: { organizationId, status: 'WON' } });
        const lostDeals = await this.dealRepository.find({ where: { organizationId, status: 'LOST' } });

        // Aggregate reasons
        const reasonCounts: Record<string, { won: number; lost: number }> = {};
        for (const lead of wonLeads) {
            const reason = (lead as any).win_loss_reason || 'No reason given';
            if (!reasonCounts[reason]) reasonCounts[reason] = { won: 0, lost: 0 };
            reasonCounts[reason].won++;
        }
        for (const lead of lostLeads) {
            const reason = (lead as any).win_loss_reason || 'No reason given';
            if (!reasonCounts[reason]) reasonCounts[reason] = { won: 0, lost: 0 };
            reasonCounts[reason].lost++;
        }
        for (const deal of wonDeals) {
            const reason = (deal as any).win_loss_reason || 'No reason given';
            if (!reasonCounts[reason]) reasonCounts[reason] = { won: 0, lost: 0 };
            reasonCounts[reason].won++;
        }
        for (const deal of lostDeals) {
            const reason = (deal as any).win_loss_reason || 'No reason given';
            if (!reasonCounts[reason]) reasonCounts[reason] = { won: 0, lost: 0 };
            reasonCounts[reason].lost++;
        }

        return {
            leads: {
                won: wonLeads.length,
                lost: lostLeads.length,
                winRate: wonLeads.length + lostLeads.length > 0
                    ? Math.round((wonLeads.length / (wonLeads.length + lostLeads.length)) * 100)
                    : 0,
            },
            deals: {
                won: wonDeals.length,
                lost: lostDeals.length,
                wonRevenue: wonDeals.reduce((sum, d) => sum + (Number((d as any).amount) || 0), 0),
                lostRevenue: lostDeals.reduce((sum, d) => sum + (Number((d as any).amount) || 0), 0),
                winRate: wonDeals.length + lostDeals.length > 0
                    ? Math.round((wonDeals.length / (wonDeals.length + lostDeals.length)) * 100)
                    : 0,
            },
            reasons: Object.entries(reasonCounts).map(([reason, counts]) => ({ reason, ...counts })),
        };
    }

    async getLeadScoreDistribution(organizationId: string) {
        const leads = await this.leadRepository.find({ where: { organizationId } });
        const distribution = { hot: 0, warm: 0, cold: 0, total: leads.length };
        for (const lead of leads) {
            const score = (lead as any).score || 0;
            if (score >= 61) distribution.hot++;
            else if (score >= 31) distribution.warm++;
            else distribution.cold++;
        }
        return distribution;
    }

    async getDashboardStats(organizationId: string) {
        const totalLeads = await this.leadRepository.count({ where: { organizationId } });
        const openDeals = await this.dealRepository.count({ where: { organizationId, status: 'OPEN' } });
        const completedActivities = await this.activityRepository.count({
            where: { organizationId, status: 'COMPLETED' }
        });

        const totalRevenue = await this.dealRepository.createQueryBuilder('deal')
            .select("SUM(CAST(deal.amount AS DECIMAL))", "total")
            .where("deal.organizationId = :organizationId", { organizationId })
            .andWhere("deal.status = :status", { status: 'WON' })
            .getRawOne();

        return {
            totalLeads,
            openDeals,
            completedActivities,
            totalRevenue: totalRevenue?.total || 0
        };
    }
}
