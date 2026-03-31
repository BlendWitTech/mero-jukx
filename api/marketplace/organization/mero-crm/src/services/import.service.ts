import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CrmLead } from '@src/database/entities/crm_leads.entity';
import { CrmClient } from '@src/database/entities/crm_clients.entity';
import csv from 'csv-parser';
import { Readable } from 'stream';

@Injectable()
export class ImportService {
    constructor(
        @InjectRepository(CrmLead)
        private leadRepository: Repository<CrmLead>,
        @InjectRepository(CrmClient)
        private clientRepository: Repository<CrmClient>,
    ) { }

    async importLeadsFromCsv(organizationId: string, userId: string, fileBuffer: Buffer): Promise<{ count: number }> {
        const results: any[] = [];
        const stream = Readable.from(fileBuffer);

        return new Promise((resolve, reject) => {
            stream
                .pipe(csv())
                .on('data', (data) => results.push(data))
                .on('end', async () => {
                    let count = 0;
                    for (const row of results) {
                        try {
                            const lead = this.leadRepository.create({
                                ...row,
                                organizationId,
                                createdById: userId,
                            });
                            await this.leadRepository.save(lead);
                            count++;
                        } catch (err) {
                            console.error('Failed to import lead row:', row, err);
                        }
                    }
                    resolve({ count });
                })
                .on('error', (err) => reject(new BadRequestException('Failed to parse CSV: ' + err.message)));
        });
    }

    async importClientsFromCsv(organizationId: string, userId: string, fileBuffer: Buffer): Promise<{ count: number }> {
        const results: any[] = [];
        const stream = Readable.from(fileBuffer);

        return new Promise((resolve, reject) => {
            stream
                .pipe(csv())
                .on('data', (data) => results.push(data))
                .on('end', async () => {
                    let count = 0;
                    for (const row of results) {
                        try {
                            const client = this.clientRepository.create({
                                ...row,
                                organizationId,
                                createdById: userId,
                            });
                            await this.clientRepository.save(client);
                            count++;
                        } catch (err) {
                            console.error('Failed to import client row:', row, err);
                        }
                    }
                    resolve({ count });
                })
                .on('error', (err) => reject(new BadRequestException('Failed to parse CSV: ' + err.message)));
        });
    }
}
