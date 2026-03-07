import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HrPayroll, HrEmployee } from '../../../../../src/database/entities';
import { PayrollService } from './payroll.service';
import { PayrollController } from './payroll.controller';
import { PayrollCalculationEngine } from './payroll-calculation.engine';
import { HrAccountingService } from './hr-accounting.service';
import { MeroAccountingModule } from '../../../mero-accounting/mero-accounting.module';
import { CommonModule } from '../../../../../src/common/common.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([HrPayroll, HrEmployee]),
        CommonModule,
        MeroAccountingModule,
    ],
    controllers: [PayrollController],
    providers: [PayrollService, PayrollCalculationEngine, HrAccountingService],
    exports: [PayrollService],
})
export class PayrollModule { }
