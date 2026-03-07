import { Controller, Post, Get, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { StockService } from '../services/stock.service';
import { CreateStockTransferDto } from '../dto/stock-transfer.dto';
import { JwtAuthGuard } from '../../../../../src/auth/guards/jwt-auth.guard';
import { AppAccessGuard } from '../../../../../src/common/guards/app-access.guard';
import { PermissionsGuard } from '../../../../../src/common/guards/permissions.guard';
import { Permissions } from '../../../../../src/common/decorators/permissions.decorator';
import { AppSlug } from '../../../../../src/common/decorators/app-slug.decorator';

@Controller('inventory/stock')
@UseGuards(JwtAuthGuard, AppAccessGuard, PermissionsGuard)
@AppSlug('mero-inventory')
export class StockController {
    constructor(private readonly stockService: StockService) { }

    @Post('transfer')
    @Permissions('inventory.stock.edit')
    transfer(@Body() dto: CreateStockTransferDto, @Request() req) {
        return this.stockService.transferStock(
            dto.productId,
            dto.fromWarehouseId,
            dto.toWarehouseId,
            dto.quantity,
            dto.notes,
            req.user.id,
            req.user.organizationId
        );
    }

    @Get('valuation/:productId')
    @Permissions('inventory.stock.view')
    async getValuation(
        @Param('productId') productId: string,
        @Query('method') method: 'FIFO' | 'LIFO',
        @Request() req
    ) {
        const value = await this.stockService.calculateValuation(
            productId,
            req.user.organizationId,
            method || 'FIFO'
        );
        return { productId, method: method || 'FIFO', value };
    }
}
