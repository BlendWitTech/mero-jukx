import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HrDocument } from '../../../../../src/database/entities';
import { DocumentsService } from './documents.service';
import { DocumentsController } from './documents.controller';
import { CommonModule } from '../../../../../src/common/common.module';

@Module({
    imports: [TypeOrmModule.forFeature([HrDocument]), CommonModule],
    controllers: [DocumentsController],
    providers: [DocumentsService],
    exports: [DocumentsService],
})
export class DocumentsModule { }
