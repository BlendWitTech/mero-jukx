import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';
import { ExchangeRate } from '@src/database/entities/exchange_rates.entity';

@Injectable()
export class ExchangeRatesService {
    constructor(
        @InjectRepository(ExchangeRate)
        private readonly exchangeRateRepository: Repository<ExchangeRate>,
    ) { }

    async getActiveRates(organizationId: string) {
        // Find the latest rate for each target currency
        const latestRatesQuery = this.exchangeRateRepository.createQueryBuilder('er')
            .where('er.organizationId = :organizationId OR er.organizationId IS NULL', { organizationId })
            .orderBy('er.effectiveDate', 'DESC')
            .addOrderBy('er.createdAt', 'DESC');

        const allRates = await latestRatesQuery.getMany();

        // Group by targetCurrency to keep only the newest per currency
        const activeRatesMap = new Map<string, ExchangeRate>();
        for (const rate of allRates) {
            if (!activeRatesMap.has(rate.targetCurrency)) {
                activeRatesMap.set(rate.targetCurrency, rate);
            }
        }

        return Array.from(activeRatesMap.values());
    }

    async getRate(organizationId: string, baseCurrency: string, targetCurrency: string, date: Date | string) {
        if (baseCurrency === targetCurrency) return 1.0;

        const effectiveDate = new Date(date);

        const rate = await this.exchangeRateRepository.findOne({
            where: [
                { organizationId, baseCurrency, targetCurrency, effectiveDate: LessThanOrEqual(effectiveDate) },
                { organizationId: null as any, baseCurrency, targetCurrency, effectiveDate: LessThanOrEqual(effectiveDate) }
            ],
            order: { effectiveDate: 'DESC', createdAt: 'DESC' }
        });

        if (!rate) {
            throw new NotFoundException(`No exchange rate found for ${baseCurrency} to ${targetCurrency} on or before ${effectiveDate.toLocaleDateString()}`);
        }

        return Number(rate.rate);
    }

    async createRate(organizationId: string, data: any) {
        const rate = this.exchangeRateRepository.create({
            organizationId,
            baseCurrency: data.baseCurrency || 'NPR',
            targetCurrency: data.targetCurrency,
            rate: data.rate,
            effectiveDate: data.effectiveDate || new Date()
        });

        return this.exchangeRateRepository.save(rate);
    }
}
