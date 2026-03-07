import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from '../entities/product.entity';
import { Stock } from '../entities/stock.entity';
import { CreateProductDto, UpdateProductDto } from '../dto/product.dto';

@Injectable()
export class ProductsService {
    constructor(
        @InjectRepository(Product)
        private productRepository: Repository<Product>,
        @InjectRepository(Stock)
        private stockRepository: Repository<Stock>,
    ) { }

    async create(createProductDto: CreateProductDto, organizationId: string): Promise<Product> {
        const product = this.productRepository.create({
            ...createProductDto,
            organization_id: organizationId,
        });
        return this.productRepository.save(product);
    }

    async findAll(organizationId: string): Promise<Product[]> {
        return this.productRepository.find({
            where: { organization_id: organizationId, parent_id: null }, // List only parent products by default
            order: { created_at: 'DESC' },
            relations: ['stocks', 'stocks.warehouse', 'variants'],
        });
    }

    async getVariants(parentId: string, organizationId: string): Promise<Product[]> {
        return this.productRepository.find({
            where: { parent_id: parentId, organization_id: organizationId },
            relations: ['stocks', 'stocks.warehouse'],
        });
    }

    async findOne(id: string, organizationId: string): Promise<Product> {
        const product = await this.productRepository.findOne({
            where: { id, organization_id: organizationId },
            relations: ['stocks', 'stocks.warehouse'],
        });

        if (!product) {
            throw new NotFoundException(`Product with ID ${id} not found`);
        }

        return product;
    }

    async update(id: string, updateProductDto: UpdateProductDto, organizationId: string): Promise<Product> {
        const product = await this.findOne(id, organizationId);

        // Handle partial update
        Object.assign(product, updateProductDto);
        return this.productRepository.save(product);
    }

    async remove(id: string, organizationId: string): Promise<void> {
        const product = await this.findOne(id, organizationId);
        await this.productRepository.softRemove(product);
    }

    async bulkCreateVariants(parentId: string, variants: CreateProductDto[], organizationId: string): Promise<Product[]> {
        const parent = await this.findOne(parentId, organizationId);

        const products = variants.map(v => this.productRepository.create({
            ...v,
            parent_id: parentId,
            organization_id: organizationId,
            category: parent.category, // Inherit category
            unit: parent.unit, // Inherit unit
        }));

        return this.productRepository.save(products);
    }

    async adjustStock(productId: string, data: any, organizationId: string): Promise<void> {
        const { warehouse_id, type, quantity, reason } = data;
        let stock = await this.stockRepository.findOne({
            where: { productId: productId, warehouseId: warehouse_id },
        });

        if (!stock) {
            stock = this.stockRepository.create({
                productId: productId,
                warehouseId: warehouse_id,
                quantity: 0,
            });
        }

        if (type === 'add') {
            stock.quantity += quantity;
        } else if (type === 'remove') {
            stock.quantity -= quantity;
        } else if (type === 'set') {
            stock.quantity = quantity;
        }

        await this.stockRepository.save(stock);
    }

    async bulkCreate(productsData: CreateProductDto[], organizationId: string): Promise<Product[]> {
        const products = productsData.map(dto => this.productRepository.create({
            ...dto,
            organization_id: organizationId,
        }));
        return this.productRepository.save(products);
    }
}
