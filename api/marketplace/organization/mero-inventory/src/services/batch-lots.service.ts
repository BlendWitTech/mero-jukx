import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BatchLot, BatchLotStatus } from '../entities/batch-lot.entity';

@Injectable()
export class BatchLotsService {
    constructor(
        @InjectRepository(BatchLot)
        private batchRepo: Repository<BatchLot>,
    ) {}

    async findAll(organizationId: string, productId?: string): Promise<BatchLot[]> {
        const where: any = { organization_id: organizationId };
        if (productId) where.product_id = productId;
        return this.batchRepo.find({ where, order: { created_at: 'DESC' } });
    }

    async findOne(organizationId: string, id: string): Promise<BatchLot> {
        const batch = await this.batchRepo.findOne({ where: { id, organization_id: organizationId } });
        if (!batch) throw new NotFoundException('Batch/Lot not found');
        return batch;
    }

    async create(organizationId: string, data: {
        product_id: string;
        warehouse_id?: string;
        batch_number: string;
        lot_number?: string;
        manufacturer?: string;
        manufacture_date?: string;
        expiry_date?: string;
        initial_quantity: number;
        cost_price?: number;
        notes?: string;
    }): Promise<BatchLot> {
        const batch = this.batchRepo.create({
            ...data,
            organization_id: organizationId,
            remaining_quantity: data.initial_quantity,
        });
        return this.batchRepo.save(batch);
    }

    async update(organizationId: string, id: string, data: Partial<{
        remaining_quantity: number;
        status: BatchLotStatus;
        notes: string;
        expiry_date: string;
    }>): Promise<BatchLot> {
        const batch = await this.findOne(organizationId, id);
        Object.assign(batch, data);
        return this.batchRepo.save(batch);
    }

    async consume(organizationId: string, id: string, quantity: number): Promise<BatchLot> {
        const batch = await this.findOne(organizationId, id);
        if (batch.remaining_quantity < quantity) {
            throw new BadRequestException(`Insufficient batch quantity. Available: ${batch.remaining_quantity}`);
        }
        batch.remaining_quantity = Number(batch.remaining_quantity) - quantity;
        if (batch.remaining_quantity <= 0) {
            batch.status = BatchLotStatus.CONSUMED;
        }
        return this.batchRepo.save(batch);
    }

    async remove(organizationId: string, id: string): Promise<void> {
        const batch = await this.findOne(organizationId, id);
        if (Number(batch.remaining_quantity) > 0) {
            throw new BadRequestException('Cannot delete a batch with remaining quantity');
        }
        await this.batchRepo.remove(batch);
    }

    async getExpiringBatches(organizationId: string, daysAhead = 30): Promise<BatchLot[]> {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() + daysAhead);
        return this.batchRepo.createQueryBuilder('batch')
            .where('batch.organization_id = :orgId', { orgId: organizationId })
            .andWhere('batch.status = :status', { status: BatchLotStatus.ACTIVE })
            .andWhere('batch.expiry_date IS NOT NULL')
            .andWhere('batch.expiry_date <= :cutoff', { cutoff: cutoff.toISOString().split('T')[0] })
            .orderBy('batch.expiry_date', 'ASC')
            .getMany();
    }
}
