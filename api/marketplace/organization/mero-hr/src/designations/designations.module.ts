import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HrDesignation } from '../../../../../src/database/entities';
import { DesignationsService } from './designations.service';
import { DesignationsController } from './designations.controller';
import { CommonModule } from '../../../../../src/common/common.module';

@Module({
    imports: [TypeOrmModule.forFeature([HrDesignation]), CommonModule],
    controllers: [DesignationsController],
    providers: [DesignationsService],
    exports: [DesignationsService],
})
export class DesignationsModule { }
