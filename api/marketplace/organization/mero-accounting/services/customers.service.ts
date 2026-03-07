import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Customer } from '@src/database/entities/customers_sales_invoices.entity';

@Injectable()
export class CustomersService {
    constructor(
        @InjectRepository(Customer)
        private readonly customerRepository: Repository<Customer>,
    ) { }

    async findAll(organizationId: string) {
        return this.customerRepository.find({
            where: { organizationId },
            order: { name: 'ASC' }
        });
    }

    async findById(id: string, organizationId: string) {
        const customer = await this.customerRepository.findOne({
            where: { id, organizationId },
        });
        if (!customer) throw new NotFoundException('Customer not found');
        return customer;
    }

    async create(organizationId: string, data: any) {
        const customer = this.customerRepository.create({
            ...data,
            organizationId,
        });
        return this.customerRepository.save(customer);
    }

    async update(id: string, organizationId: string, data: any) {
        const customer = await this.findById(id, organizationId);
        Object.assign(customer, data);
        return this.customerRepository.save(customer);
    }

    async delete(id: string, organizationId: string) {
        const customer = await this.findById(id, organizationId);
        return this.customerRepository.remove(customer);
    }
}
