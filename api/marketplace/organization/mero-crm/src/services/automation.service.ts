import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CrmLead } from '@src/database/entities/crm_leads.entity';
import { CrmActivity } from '@src/database/entities/crm_activities.entity';

@Injectable()
export class CrmAutomationService {
    private readonly logger = new Logger(CrmAutomationService.name);

    constructor(
        @InjectRepository(CrmLead)
        private leadRepository: Repository<CrmLead>,
        @InjectRepository(CrmActivity)
        private activityRepository: Repository<CrmActivity>,
    ) { }

    @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
    async handleStaleLeads() {
        this.logger.log('Running stale leads check...');

        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        // Find leads that haven't been touched in 7 days and are not converted/closed
        const staleLeads = await this.leadRepository.find({
            where: {
                status: 'NEW', // Or other active statuses
                updatedAt: LessThan(sevenDaysAgo)
            }
        });

        for (const lead of staleLeads) {
            // Check if there's any pending activity
            const pendingActivity = await this.activityRepository.findOne({
                where: { leadId: lead.id, status: 'PENDING' }
            });

            if (!pendingActivity) {
                // Create a follow-up task
                const followUp = this.activityRepository.create({
                    organizationId: lead.organizationId,
                    type: 'TASK',
                    subject: 'Automated Follow-up: Stale Lead',
                    description: `This lead has had no activity for over 7 days. Please reach out.`,
                    leadId: lead.id,
                    assignedToId: lead.assignedToId,
                    due_date: new Date(),
                });
                await this.activityRepository.save(followUp);
                this.logger.log(`Created follow-up for lead ${lead.id}`);
            }
        }
    }
}
