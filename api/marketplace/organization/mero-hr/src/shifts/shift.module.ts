import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HrShift } from '../../../../../src/database/entities';
import { ShiftService } from './shift.service';
import { ShiftController } from './shift.controller';
import { CommonModule } from '../../../../../src/common/common.module';

@Module({
    imports: [TypeOrmModule.forFeature([HrShift]), CommonModule],
    controllers: [ShiftController],
    providers: [ShiftService],
    exports: [ShiftService],
})
export class ShiftModule { }
