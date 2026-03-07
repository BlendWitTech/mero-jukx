import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HrPublicHoliday } from '../../../../../src/database/entities';

@Injectable()
export class PublicHolidayService {
    constructor(
        @InjectRepository(HrPublicHoliday)
        private readonly holidayRepository: Repository<HrPublicHoliday>,
    ) { }

    async create(organizationId: string, dto: Partial<HrPublicHoliday>): Promise<HrPublicHoliday> {
        const holiday = this.holidayRepository.create({ ...dto, organizationId });
        return await this.holidayRepository.save(holiday);
    }

    async findAll(organizationId: string, year?: number): Promise<HrPublicHoliday[]> {
        const where: any = { organizationId };
        if (year) where.year = year;
        return await this.holidayRepository.find({
            where,
            order: { date: 'ASC' },
        });
    }

    async findOne(organizationId: string, id: string): Promise<HrPublicHoliday> {
        const holiday = await this.holidayRepository.findOne({ where: { id, organizationId } });
        if (!holiday) throw new NotFoundException('Holiday not found');
        return holiday;
    }

    async update(organizationId: string, id: string, dto: Partial<HrPublicHoliday>): Promise<HrPublicHoliday> {
        const holiday = await this.findOne(organizationId, id);
        Object.assign(holiday, dto);
        return await this.holidayRepository.save(holiday);
    }

    async remove(organizationId: string, id: string): Promise<void> {
        const holiday = await this.findOne(organizationId, id);
        await this.holidayRepository.remove(holiday);
    }

    /** Seed Nepal standard FY 2080/81 holidays for an org */
    async seedNepalHolidays2081(organizationId: string): Promise<HrPublicHoliday[]> {
        const holidays = [
            { name: 'New Year (Nawa Barsha)', date: '2024-04-14', nepali_year: '2081', description: 'Nepali New Year 2081' },
            { name: 'Buddha Jayanti', date: '2024-05-23', nepali_year: '2081', description: 'Birth of Buddha' },
            { name: 'Republic Day', date: '2024-05-29', nepali_year: '2081', description: 'National Holiday' },
            { name: 'Constitution Day', date: '2024-09-19', nepali_year: '2081', description: 'Constitution of Nepal' },
            { name: 'Dashain (Ghatasthapana)', date: '2024-10-03', nepali_year: '2081', description: 'Start of Dashain' },
            { name: 'Dashain (Vijaya Dashami)', date: '2024-10-12', nepali_year: '2081', description: 'Dashain Main Day' },
            { name: 'Tihar (Laxmi Puja)', date: '2024-11-01', nepali_year: '2081', description: 'Tihar Festival' },
            { name: 'Tihar (Bhai Tika)', date: '2024-11-03', nepali_year: '2081', description: 'Bhai Tika' },
            { name: 'Christmas', date: '2024-12-25', nepali_year: '2081', description: 'Christmas Day' },
            { name: 'Maghe Sankranti', date: '2025-01-14', nepali_year: '2081', description: 'Makar Sankranti' },
            { name: 'Shivaratri', date: '2025-02-26', nepali_year: '2081', description: 'Maha Shivaratri' },
            { name: 'Fagu Purnima / Holi', date: '2025-03-14', nepali_year: '2081', description: 'Holi Festival' },
        ];

        const saved: HrPublicHoliday[] = [];
        for (const h of holidays) {
            const exists = await this.holidayRepository.findOne({
                where: { organizationId, name: h.name, nepali_year: h.nepali_year },
            });
            if (!exists) {
                const entity = this.holidayRepository.create({
                    organizationId,
                    name: h.name,
                    date: new Date(h.date) as any,
                    year: new Date(h.date).getFullYear(),
                    nepali_year: h.nepali_year,
                    is_paid: true,
                    description: h.description,
                });
                saved.push(await this.holidayRepository.save(entity));
            }
        }
        return saved;
    }
}
