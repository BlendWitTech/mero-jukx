import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { PurchaseRequisition, PurchaseRequisitionItem, PRStatus } from '../entities/purchase-requisition.entity';
import { PurchaseOrder, PurchaseOrderStatus } from '../entities/purchase-order.entity';
import { PurchaseOrderItem } from '../entities/purchase-order-item.entity';

@Injectable()
export class PurchaseRequisitionsService {
    constructor(
        @InjectRepository(PurchaseRequisition)
        private prRepo: Repository<PurchaseRequisition>,
        @InjectRepository(PurchaseRequisitionItem)
        private prItemRepo: Repository<PurchaseRequisitionItem>,
        @InjectRepository(PurchaseOrder)
        private poRepo: Repository<PurchaseOrder>,
        @InjectRepository(PurchaseOrderItem)
        private poItemRepo: Repository<PurchaseOrderItem>,
        private dataSource: DataSource,
    ) {}

    private async generatePRNumber(organizationId: string): Promise<string> {
        const count = await this.prRepo.count({ where: { organization_id: organizationId } });
        return `PR-${String(count + 1).padStart(5, '0')}`;
    }

    async create(organizationId: string, userId: string, data: {
        title?: string;
        reason?: string;
        required_by_date?: string;
        items: Array<{
            product_id: string;
            product_name?: string;
            quantity: number;
            unit?: string;
            estimated_unit_price?: number;
            notes?: string;
        }>;
    }): Promise<PurchaseRequisition> {
        const pr_number = await this.generatePRNumber(organizationId);
        const items = (data.items || []).map(item => ({
            ...item,
            estimated_unit_price: item.estimated_unit_price || 0,
            estimated_total: (item.quantity || 0) * (item.estimated_unit_price || 0),
        }));
        const total_amount = items.reduce((s, i) => s + i.estimated_total, 0);

        const pr = this.prRepo.create({
            organization_id: organizationId,
            pr_number,
            title: data.title,
            reason: data.reason,
            required_by_date: data.required_by_date,
            requested_by: userId,
            total_amount,
            items: items as any,
        });
        return this.prRepo.save(pr);
    }

    async findAll(organizationId: string): Promise<PurchaseRequisition[]> {
        return this.prRepo.find({
            where: { organization_id: organizationId },
            relations: ['items'],
            order: { created_at: 'DESC' },
        });
    }

    async findOne(organizationId: string, id: string): Promise<PurchaseRequisition> {
        const pr = await this.prRepo.findOne({
            where: { id, organization_id: organizationId },
            relations: ['items'],
        });
        if (!pr) throw new NotFoundException('Purchase Requisition not found');
        return pr;
    }

    async submit(organizationId: string, id: string): Promise<PurchaseRequisition> {
        const pr = await this.findOne(organizationId, id);
        if (pr.status !== PRStatus.DRAFT) throw new BadRequestException('Only draft PRs can be submitted');
        pr.status = PRStatus.PENDING;
        return this.prRepo.save(pr);
    }

    async approve(organizationId: string, id: string, userId: string): Promise<PurchaseRequisition> {
        const pr = await this.findOne(organizationId, id);
        if (pr.status !== PRStatus.PENDING) throw new BadRequestException('Only pending PRs can be approved');
        pr.status = PRStatus.APPROVED;
        pr.approved_by = userId;
        pr.approved_at = new Date();
        return this.prRepo.save(pr);
    }

    async reject(organizationId: string, id: string, userId: string, rejection_reason: string): Promise<PurchaseRequisition> {
        const pr = await this.findOne(organizationId, id);
        if (pr.status !== PRStatus.PENDING) throw new BadRequestException('Only pending PRs can be rejected');
        pr.status = PRStatus.REJECTED;
        pr.approved_by = userId;
        pr.rejection_reason = rejection_reason;
        return this.prRepo.save(pr);
    }

    async convertToPO(organizationId: string, id: string, supplierId: string): Promise<PurchaseOrder> {
        const pr = await this.findOne(organizationId, id);
        if (pr.status !== PRStatus.APPROVED) throw new BadRequestException('Only approved PRs can be converted to PO');

        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();
        try {
            const poCount = await this.poRepo.count({ where: { organizationId: organizationId } });
            const number = `PO-${String(poCount + 1).padStart(5, '0')}`;

            const items = pr.items.map(item => ({
                productId: item.product_id,
                quantity: item.quantity,
                unitPrice: item.estimated_unit_price,
                total: item.estimated_total,
            }));

            const po = this.poRepo.create({
                organizationId,
                supplierId,
                number,
                status: PurchaseOrderStatus.DRAFT,
                totalAmount: pr.total_amount,
                notes: `Created from PR ${pr.pr_number}`,
                items: items as any,
            });
            const savedPo = await queryRunner.manager.save(po);

            pr.status = PRStatus.CONVERTED;
            pr.converted_to_po_id = savedPo.id;
            await queryRunner.manager.save(pr);

            await queryRunner.commitTransaction();
            return savedPo;
        } catch (err) {
            await queryRunner.rollbackTransaction();
            throw err;
        } finally {
            await queryRunner.release();
        }
    }

    async remove(organizationId: string, id: string): Promise<void> {
        const pr = await this.findOne(organizationId, id);
        if (pr.status !== PRStatus.DRAFT && pr.status !== PRStatus.REJECTED) {
            throw new BadRequestException('Only draft or rejected PRs can be deleted');
        }
        await this.prRepo.remove(pr);
    }
}
