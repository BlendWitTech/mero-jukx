import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { AuditLog } from '@src/database/entities/audit_logs.entity';

@Injectable()
export class AuditService {
    constructor(
        @InjectRepository(AuditLog)
        private readonly auditLogRepository: Repository<AuditLog>,
    ) { }

    async log(
        organizationId: string,
        userId: string,
        action: string,
        entityType: string,
        entityId: string,
        oldValues: any,
        newValues: any,
        severity: 'critical' | 'warning' | 'info' = 'info',
        metadata: any = {}
    ) {
        const auditLog = this.auditLogRepository.create({
            organization_id: organizationId,
            user_id: userId,
            action,
            entity_type: entityType,
            entity_id: entityId,
            old_values: oldValues,
            new_values: newValues,
            severity,
            metadata
        });

        return this.auditLogRepository.save(auditLog);
    }

    async findAll(organizationId: string) {
        return this.auditLogRepository.find({
            where: {
                organization_id: organizationId,
                entity_type: In([
                    'Account',
                    'JournalEntry',
                    'Vendor',
                    'PurchaseInvoice',
                    'Customer',
                    'SalesInvoice',
                    'FixedAsset',
                    'DepreciationLog',
                    'BankAccount',
                    'FiscalYear'
                ])
            },
            order: { created_at: 'DESC' },
            relations: ['user'],
            take: 100
        });
    }
}
