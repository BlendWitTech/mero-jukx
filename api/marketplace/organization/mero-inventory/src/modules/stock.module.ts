import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Stock } from '../entities/stock.entity';
import { StockMovement } from '../entities/stock-movement.entity';
import { StockService } from '../services/stock.service';
import { StockController } from '../controllers/stock.controller';
import { UserAppAccess, App } from '@src/database/entities';
import { OrganizationMember } from '../../../../../src/database/entities/organization_members.entity';
import { Role } from '../../../../../src/database/entities/roles.entity';
import { AuditLogsModule } from '../../../../../src/audit-logs/audit-logs.module';
import { CommonModule } from '../../../../../src/common/common.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            Stock,
            StockMovement,
            UserAppAccess,
            App,
            OrganizationMember,
            Role,
        ]),
        AuditLogsModule,
        CommonModule,
    ],
    controllers: [StockController],
    providers: [StockService],
    exports: [StockService],
})
export class StockModule { }
