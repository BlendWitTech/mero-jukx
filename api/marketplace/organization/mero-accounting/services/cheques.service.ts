import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Cheque, ChequeStatus, ChequeType } from '@src/database/entities/cheques.entity';
import { JournalEntry } from '@src/database/entities/journal_entries.entity';
import { AuditService } from './audit.service';
import { BsDateService } from './bs-date.service';

@Injectable()
export class ChequesService {
    constructor(
        @InjectRepository(Cheque)
        private readonly chequeRepo: Repository<Cheque>,
        private readonly auditService: AuditService,
        private readonly dataSource: DataSource,
        private readonly bsDateService: BsDateService,
    ) { }

    async registerCheque(organizationId: string, userId: string, data: {
        bankAccountId?: string;
        chequeNumber: string;
        payeeName: string;
        amount: number;
        chequeDate: string;
        issueDate: string;
        type: ChequeType;
        journalEntryId?: string;
        remarks?: string;
    }) {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            if (data.journalEntryId) {
                const je = await queryRunner.manager.findOne(JournalEntry, {
                    where: { id: data.journalEntryId, organizationId }
                });
                if (!je) throw new NotFoundException('Journal entry not found');
            }

            const cheque = queryRunner.manager.create(Cheque, {
                organizationId,
                bankAccountId: data.bankAccountId || null,
                chequeNumber: data.chequeNumber,
                payeeName: data.payeeName,
                amount: data.amount,
                chequeDate: new Date(data.chequeDate),
                issueDate: new Date(data.issueDate),
                type: data.type,
                status: ChequeStatus.DRAFT,
                journalEntryId: data.journalEntryId || null,
                remarks: data.remarks || '',
            });

            const savedCheque = await queryRunner.manager.save(Cheque, cheque);

            await this.auditService.log(
                organizationId,
                userId,
                'REGISTER_CHEQUE',
                'Cheque',
                savedCheque.id,
                null,
                { message: `Registered new ${data.type} cheque ${data.chequeNumber} for ${data.payeeName}` }
            );

            await queryRunner.commitTransaction();
            return savedCheque;
        } catch (err) {
            await queryRunner.rollbackTransaction();
            throw err;
        } finally {
            await queryRunner.release();
        }
    }

    async getCheques(organizationId: string, filter?: { type?: ChequeType, status?: ChequeStatus }) {
        const query = this.chequeRepo.createQueryBuilder('c')
            .leftJoinAndSelect('c.bankAccount', 'bankAccount')
            .where('c.organization_id = :orgId', { orgId: organizationId });

        if (filter?.type) {
            query.andWhere('c.type = :type', { type: filter.type });
        }
        if (filter?.status) {
            query.andWhere('c.status = :status', { status: filter.status });
        }

        return query.orderBy('c.createdAt', 'DESC').getMany();
    }

    async updateStatus(organizationId: string, userId: string, id: string, newStatus: ChequeStatus) {
        const cheque = await this.chequeRepo.findOne({
            where: { id, organizationId }
        });
        if (!cheque) throw new NotFoundException('Cheque not found');

        const oldStatus = cheque.status;
        cheque.status = newStatus;
        const savedCheque = await this.chequeRepo.save(cheque);

        await this.auditService.log(
            organizationId,
            userId,
            'UPDATE_CHEQUE_STATUS',
            'Cheque',
            cheque.id,
            null,
            { message: `Updated cheque ${cheque.chequeNumber} status from ${oldStatus} to ${newStatus}` }
        );

        return savedCheque;
    }

    // Advanced: Number to words converter for Nepali/English cheque printing
    private numberToWords(num: number): string {
        const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
        const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

        if ((num = num.toString() as any).length > 9) return 'overflow';
        let n = ('000000000' + num).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
        if (!n) return '';
        let str = '';
        str += (Number(n[1]) != 0) ? (a[Number(n[1])] || b[n[1][0]] + ' ' + a[n[1][1]]) + 'Crore ' : '';
        str += (Number(n[2]) != 0) ? (a[Number(n[2])] || b[n[2][0]] + ' ' + a[n[2][1]]) + 'Lakh ' : '';
        str += (Number(n[3]) != 0) ? (a[Number(n[3])] || b[n[3][0]] + ' ' + a[n[3][1]]) + 'Thousand ' : '';
        str += (Number(n[4]) != 0) ? (a[Number(n[4])] || b[n[4][0]] + ' ' + a[n[4][1]]) + 'Hundred ' : '';
        str += (Number(n[5]) != 0) ? ((str != '') ? 'and ' : '') + (a[Number(n[5])] || b[n[5][0]] + ' ' + a[n[5][1]]) + 'Only ' : '';
        return str.trim() ? str.trim() + ' Only' : 'Zero';
    }

    async getPrintTemplateData(organizationId: string, userId: string, id: string) {
        const cheque = await this.chequeRepo.findOne({
            where: { id, organizationId }
        });
        if (!cheque) throw new NotFoundException('Cheque not found');

        const amountInWords = this.numberToWords(Math.floor(cheque.amount));

        // Mark as printed if draft
        if (cheque.status === ChequeStatus.DRAFT) {
            cheque.status = ChequeStatus.PRINTED;
            await this.chequeRepo.save(cheque);
        }

        // Return precisely formatted string data suitable for absolute CSS positioning on a printable HTML overlay
        return {
            dateStr: new Date(cheque.chequeDate).toISOString().split('T')[0].split('-').reverse().join('-'), // DD-MM-YYYY
            bsDateStr: this.bsDateService.adToBs(cheque.chequeDate).split('-').reverse().join('-'), // DD-MM-YYYY
            payeeName: cheque.payeeName,
            amountNumber: Number(cheque.amount).toFixed(2),
            amountWords: amountInWords,
        };
    }
}
