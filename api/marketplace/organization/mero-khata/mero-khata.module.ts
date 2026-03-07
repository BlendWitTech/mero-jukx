import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KhataCustomer, KhataTransaction, KhataBankEntry, KhataCategory, KhataEntry, KhataInvoice, KhataBill } from '@src/database/entities/khata.entity';
import { KhataService } from './services/khata.service';
import { KhataController } from './controllers/khata.controller';
import { CommonModule } from '@src/common/common.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            KhataCustomer,
            KhataTransaction,
            KhataBankEntry,
            KhataCategory,
            KhataEntry,
            KhataInvoice,
            KhataBill,
        ]),
        CommonModule,
    ],
    controllers: [KhataController],
    providers: [KhataService],
    exports: [KhataService],
})
export class MeroKhataModule { }
