import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HrPublicHoliday } from '../../../../../src/database/entities';
import { PublicHolidayService } from './public-holiday.service';
import { PublicHolidayController } from './public-holiday.controller';
import { CommonModule } from '../../../../../src/common/common.module';

@Module({
    imports: [TypeOrmModule.forFeature([HrPublicHoliday]), CommonModule],
    controllers: [PublicHolidayController],
    providers: [PublicHolidayService],
    exports: [PublicHolidayService],
})
export class PublicHolidayModule { }
