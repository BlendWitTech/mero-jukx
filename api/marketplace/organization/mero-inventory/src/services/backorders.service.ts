import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Backorder, BackorderStatus } from '../entities/backorder.entity';
import { Stock } from '../entities/stock.entity';

@Injectable()
export class BackordersService {
    constructor(
        @InjectRepository(Backorder)
        private backorderRepo: Repository<Backorder>,
        @InjectRepository(Stock)
        private stockRepo: Repository<Stock>,
    ) {}

    private async generateNumber(organizationId: string): Promise<string> {
        const count = await this.backorderRepo.count({ where: { organization_id: organizationId } });
        return `BO-${String(count + 1).padStart(5, '0')}`;
    }

    async create(organizationId: string, data: {
        sales_order_id: string;
        product_id: string;
        product_name?: string;
        original_quantity: number;
        backordered_quantity: number;
        expected_fulfillment_date?: string;
        notes?: string;
    }): Promise<Backorder> {
        const backorder_number = await this.generateNumber(organizationId);
        const bo = this.backorderRepo.create({ ...data, organization_id: organizationId, backorder_number });
        return this.backorderRepo.save(bo);
    }

    async findAll(organizationId: string, status?: BackorderStatus): Promise<Backorder[]> {
        const where: any = { organization_id: organizationId };
        if (status) where.status = status;
        return this.backorderRepo.find({ where, order: { created_at: 'DESC' } });
    }

    async findOne(organizationId: string, id: string): Promise<Backorder> {
        const bo = await this.backorderRepo.findOne({ where: { id, organization_id: organizationId } });
        if (!bo) throw new NotFoundException('Backorder not found');
        return bo;
    }

    async fulfill(organizationId: string, id: string, fulfillQuantity: number): Promise<Backorder> {
        const bo = await this.findOne(organizationId, id);
        if (bo.status === BackorderStatus.FULFILLED || bo.status === BackorderStatus.CANCELLED) {
            throw new BadRequestException('Backorder is already fulfilled or cancelled');
        }
        const remaining = Number(bo.backordered_quantity) - Number(bo.fulfilled_quantity);
        if (fulfillQuantity > remaining) throw new BadRequestException(`Cannot fulfill more than remaining qty: ${remaining}`);

        bo.fulfilled_quantity = Number(bo.fulfilled_quantity) + fulfillQuantity;
        if (Number(bo.fulfilled_quantity) >= Number(bo.backordered_quantity)) {
            bo.status = BackorderStatus.FULFILLED;
        } else {
            bo.status = BackorderStatus.PARTIALLY_FULFILLED;
        }
        return this.backorderRepo.save(bo);
    }

    async cancel(organizationId: string, id: string): Promise<Backorder> {
        const bo = await this.findOne(organizationId, id);
        if (bo.status === BackorderStatus.FULFILLED) throw new BadRequestException('Cannot cancel a fulfilled backorder');
        bo.status = BackorderStatus.CANCELLED;
        return this.backorderRepo.save(bo);
    }

    async update(organizationId: string, id: string, data: Partial<{
        expected_fulfillment_date: string;
        notes: string;
    }>): Promise<Backorder> {
        const bo = await this.findOne(organizationId, id);
        Object.assign(bo, data);
        return this.backorderRepo.save(bo);
    }
}
