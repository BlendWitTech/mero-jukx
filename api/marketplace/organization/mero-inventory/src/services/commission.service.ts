import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CommissionRule, CommissionRecord, CommissionType, CommissionAppliesTo } from '../entities/commission-rule.entity';
import { SalesOrder } from '../entities/sales-order.entity';

@Injectable()
export class CommissionService {
    constructor(
        @InjectRepository(CommissionRule)
        private ruleRepo: Repository<CommissionRule>,
        @InjectRepository(CommissionRecord)
        private recordRepo: Repository<CommissionRecord>,
        @InjectRepository(SalesOrder)
        private salesOrderRepo: Repository<SalesOrder>,
    ) {}

    async getRules(organizationId: string): Promise<CommissionRule[]> {
        return this.ruleRepo.find({ where: { organization_id: organizationId }, order: { created_at: 'DESC' } });
    }

    async createRule(organizationId: string, data: {
        name: string;
        commission_type: CommissionType;
        rate: number;
        applies_to: CommissionAppliesTo;
        category?: string;
        product_id?: string;
        min_sale_amount?: number;
    }): Promise<CommissionRule> {
        const rule = this.ruleRepo.create({ ...data, organization_id: organizationId });
        return this.ruleRepo.save(rule);
    }

    async updateRule(organizationId: string, id: string, data: Partial<{
        name: string;
        rate: number;
        is_active: boolean;
        min_sale_amount: number;
    }>): Promise<CommissionRule> {
        const rule = await this.ruleRepo.findOne({ where: { id, organization_id: organizationId } });
        if (!rule) throw new NotFoundException('Commission rule not found');
        Object.assign(rule, data);
        return this.ruleRepo.save(rule);
    }

    async removeRule(organizationId: string, id: string): Promise<void> {
        const rule = await this.ruleRepo.findOne({ where: { id, organization_id: organizationId } });
        if (!rule) throw new NotFoundException('Commission rule not found');
        await this.ruleRepo.remove(rule);
    }

    async calculateForOrder(organizationId: string, salesOrderId: string, salesPerson?: string): Promise<CommissionRecord[]> {
        const order = await this.salesOrderRepo.findOne({
            where: { id: salesOrderId },
            relations: ['items', 'items.product'],
        });
        if (!order) throw new NotFoundException('Sales order not found');

        const rules = await this.ruleRepo.find({
            where: { organization_id: organizationId, is_active: true },
        });

        const records: CommissionRecord[] = [];
        for (const rule of rules) {
            const saleAmount = Number(order.total_amount);
            if (rule.min_sale_amount && saleAmount < Number(rule.min_sale_amount)) continue;

            let applicable = false;
            if (rule.applies_to === CommissionAppliesTo.ALL_PRODUCTS) {
                applicable = true;
            } else if (rule.applies_to === CommissionAppliesTo.CATEGORY) {
                applicable = (order.items as any[]).some(i => i.product?.category === rule.category);
            } else if (rule.applies_to === CommissionAppliesTo.SPECIFIC_PRODUCT) {
                applicable = (order.items as any[]).some(i => i.product?.id === rule.product_id);
            }

            if (!applicable) continue;

            const commission_amount = rule.commission_type === CommissionType.PERCENTAGE
                ? (saleAmount * Number(rule.rate)) / 100
                : Number(rule.rate);

            const existing = await this.recordRepo.findOne({
                where: { organization_id: organizationId, rule_id: rule.id, sales_order_id: salesOrderId },
            });
            if (existing) continue;

            const record = this.recordRepo.create({
                organization_id: organizationId,
                rule_id: rule.id,
                sales_order_id: salesOrderId,
                sales_person: salesPerson,
                sale_amount: saleAmount,
                commission_rate: rule.rate,
                commission_amount,
            });
            records.push(await this.recordRepo.save(record));
        }

        return records;
    }

    async getRecords(organizationId: string): Promise<CommissionRecord[]> {
        return this.recordRepo.find({
            where: { organization_id: organizationId },
            order: { created_at: 'DESC' },
        });
    }

    async markPaid(organizationId: string, id: string): Promise<CommissionRecord> {
        const record = await this.recordRepo.findOne({ where: { id, organization_id: organizationId } });
        if (!record) throw new NotFoundException('Commission record not found');
        record.status = 'paid';
        return this.recordRepo.save(record);
    }

    async getSummary(organizationId: string): Promise<{
        totalPending: number;
        totalPaid: number;
        countPending: number;
        countPaid: number;
    }> {
        const records = await this.recordRepo.find({ where: { organization_id: organizationId } });
        return {
            totalPending: records.filter(r => r.status === 'pending').reduce((s, r) => s + Number(r.commission_amount), 0),
            totalPaid: records.filter(r => r.status === 'paid').reduce((s, r) => s + Number(r.commission_amount), 0),
            countPending: records.filter(r => r.status === 'pending').length,
            countPaid: records.filter(r => r.status === 'paid').length,
        };
    }
}
