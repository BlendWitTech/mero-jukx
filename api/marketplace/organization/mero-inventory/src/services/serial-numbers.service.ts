import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SerialNumber, SerialNumberStatus } from '../entities/serial-number.entity';

@Injectable()
export class SerialNumbersService {
    constructor(
        @InjectRepository(SerialNumber)
        private serialRepo: Repository<SerialNumber>,
    ) {}

    async findAll(organizationId: string, productId?: string): Promise<SerialNumber[]> {
        const where: any = { organization_id: organizationId };
        if (productId) where.product_id = productId;
        return this.serialRepo.find({ where, order: { created_at: 'DESC' } });
    }

    async findOne(organizationId: string, id: string): Promise<SerialNumber> {
        const sn = await this.serialRepo.findOne({ where: { id, organization_id: organizationId } });
        if (!sn) throw new NotFoundException('Serial number not found');
        return sn;
    }

    async create(organizationId: string, data: {
        product_id: string;
        warehouse_id?: string;
        serial_number: string;
        warranty_expiry?: string;
        notes?: string;
    }): Promise<SerialNumber> {
        const existing = await this.serialRepo.findOne({
            where: { organization_id: organizationId, product_id: data.product_id, serial_number: data.serial_number }
        });
        if (existing) throw new BadRequestException(`Serial number ${data.serial_number} already exists for this product`);

        const sn = this.serialRepo.create({ ...data, organization_id: organizationId });
        return this.serialRepo.save(sn);
    }

    async bulkCreate(organizationId: string, productId: string, warehouseId: string, serials: string[]): Promise<{ created: number; skipped: number }> {
        let created = 0;
        let skipped = 0;
        for (const serial of serials) {
            const existing = await this.serialRepo.findOne({
                where: { organization_id: organizationId, product_id: productId, serial_number: serial }
            });
            if (existing) { skipped++; continue; }
            await this.serialRepo.save(this.serialRepo.create({
                organization_id: organizationId,
                product_id: productId,
                warehouse_id: warehouseId,
                serial_number: serial,
            }));
            created++;
        }
        return { created, skipped };
    }

    async updateStatus(organizationId: string, id: string, status: SerialNumberStatus): Promise<SerialNumber> {
        const sn = await this.findOne(organizationId, id);
        sn.status = status;
        return this.serialRepo.save(sn);
    }

    async remove(organizationId: string, id: string): Promise<void> {
        const sn = await this.findOne(organizationId, id);
        if (sn.status === SerialNumberStatus.SOLD || sn.status === SerialNumberStatus.IN_USE) {
            throw new BadRequestException('Cannot delete a serial number that is sold or in use');
        }
        await this.serialRepo.remove(sn);
    }
}
