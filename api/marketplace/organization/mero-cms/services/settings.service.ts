import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CmsSettings } from '../entities/cms-settings.entity';
import { UpdateSettingsDto } from '../dto/settings.dto';

@Injectable()
export class SettingsService {
    constructor(
        @InjectRepository(CmsSettings)
        private settingsRepository: Repository<CmsSettings>,
    ) {}

    async findByOrg(organizationId: string): Promise<CmsSettings> {
        let settings = await this.settingsRepository.findOne({
            where: { organization_id: organizationId },
        });
        if (!settings) {
            settings = this.settingsRepository.create({ organization_id: organizationId });
            settings = await this.settingsRepository.save(settings);
        }
        return settings;
    }

    async update(organizationId: string, dto: UpdateSettingsDto): Promise<CmsSettings> {
        let settings = await this.settingsRepository.findOne({
            where: { organization_id: organizationId },
        });
        if (!settings) {
            settings = this.settingsRepository.create({ organization_id: organizationId, ...dto });
        } else {
            Object.assign(settings, dto);
        }
        return this.settingsRepository.save(settings);
    }
}
