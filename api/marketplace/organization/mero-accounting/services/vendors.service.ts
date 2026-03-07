import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Vendor } from '@src/database/entities/vendors_purchase_invoices.entity';

@Injectable()
export class VendorsService {
    constructor(
        @InjectRepository(Vendor)
        private readonly vendorRepository: Repository<Vendor>,
    ) { }

    async findAll(organizationId: string) {
        return this.vendorRepository.find({
            where: { organizationId },
            order: { name: 'ASC' }
        });
    }

    async findById(id: string, organizationId: string) {
        const vendor = await this.vendorRepository.findOne({
            where: { id, organizationId },
        });
        if (!vendor) throw new NotFoundException('Vendor not found');
        return vendor;
    }

    async create(organizationId: string, data: any) {
        const vendor = this.vendorRepository.create({
            ...data,
            organizationId,
        });
        return this.vendorRepository.save(vendor);
    }

    async update(id: string, organizationId: string, data: any) {
        const vendor = await this.findById(id, organizationId);
        Object.assign(vendor, data);
        return this.vendorRepository.save(vendor);
    }

    async delete(id: string, organizationId: string) {
        const vendor = await this.findById(id, organizationId);
        // Check if vendor has purchase invoices before deleting
        // For now, let's just delete
        return this.vendorRepository.remove(vendor);
    }
}
