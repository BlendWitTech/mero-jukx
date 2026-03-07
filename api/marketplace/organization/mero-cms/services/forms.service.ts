import { Injectable, NotFoundException, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CmsForm, CmsFormStatus } from '../entities/cms-form.entity';
import { CmsFormSubmission } from '../entities/cms-form-submission.entity';
import { CreateFormDto, UpdateFormDto, SubmitFormDto } from '../dto/form.dto';
import { LeadsService } from '../../mero-crm/src/services/leads.service';

@Injectable()
export class FormsService {
    constructor(
        @InjectRepository(CmsForm)
        private formsRepository: Repository<CmsForm>,
        @InjectRepository(CmsFormSubmission)
        private submissionsRepository: Repository<CmsFormSubmission>,
        @Optional() private readonly leadsService: LeadsService,
    ) {}

    async findAll(organizationId: string): Promise<CmsForm[]> {
        return this.formsRepository.find({
            where: { organization_id: organizationId },
            order: { created_at: 'DESC' },
        });
    }

    async findOne(id: string, organizationId: string): Promise<CmsForm> {
        const form = await this.formsRepository.findOne({
            where: { id, organization_id: organizationId },
        });
        if (!form) throw new NotFoundException(`Form ${id} not found`);
        return form;
    }

    async create(dto: CreateFormDto, organizationId: string): Promise<CmsForm> {
        const slug = dto.slug || this.generateSlug(dto.name);
        const form = this.formsRepository.create({
            ...dto,
            slug,
            organization_id: organizationId,
        });
        return this.formsRepository.save(form);
    }

    async update(id: string, dto: UpdateFormDto, organizationId: string): Promise<CmsForm> {
        const form = await this.findOne(id, organizationId);
        Object.assign(form, dto);
        return this.formsRepository.save(form);
    }

    async remove(id: string, organizationId: string): Promise<void> {
        const form = await this.findOne(id, organizationId);
        await this.formsRepository.delete(form.id);
    }

    async submit(formId: string, organizationId: string, dto: SubmitFormDto, ipAddress?: string): Promise<CmsFormSubmission> {
        const form = await this.findOne(formId, organizationId);

        const submission = this.submissionsRepository.create({
            form_id: formId,
            organization_id: organizationId,
            data: dto.data,
            ip_address: ipAddress,
        });

        const savedSubmission = await this.submissionsRepository.save(submission);

        // Sync to CRM as a new lead when crm_sync is enabled
        if (form.crm_sync && this.leadsService) {
            try {
                const lead = await this.syncToCrmLead(form, dto.data, organizationId);
                if (lead) {
                    savedSubmission.crm_lead_id = lead.id;
                    await this.submissionsRepository.save(savedSubmission);
                }
            } catch (_err) {
                // CRM sync failure must never fail the form submission
            }
        }

        return savedSubmission;
    }

    async getSubmissions(formId: string, organizationId: string): Promise<CmsFormSubmission[]> {
        await this.findOne(formId, organizationId);
        return this.submissionsRepository.find({
            where: { form_id: formId, organization_id: organizationId },
            order: { submitted_at: 'DESC' },
        });
    }

    async getStats(organizationId: string) {
        const totalForms = await this.formsRepository.count({ where: { organization_id: organizationId } });
        const activeForms = await this.formsRepository.count({ where: { organization_id: organizationId, status: CmsFormStatus.ACTIVE } });
        const totalSubmissions = await this.submissionsRepository.count({ where: { organization_id: organizationId } });
        return { totalForms, activeForms, totalSubmissions };
    }

    /**
     * Parses JSONB form submission data and creates a CRM Lead.
     * Handles common field name variations (name/full_name, phone/mobile, message/notes).
     */
    private async syncToCrmLead(form: CmsForm, data: Record<string, any>, organizationId: string) {
        const raw = data || {};

        // Resolve full name from various field name conventions
        const fullName: string =
            raw.name || raw.full_name || raw.fullName ||
            `${raw.first_name || raw.firstName || ''} ${raw.last_name || raw.lastName || ''}`.trim() ||
            'Unknown';

        const nameParts = fullName.split(' ');
        const firstName = nameParts[0] || 'Unknown';
        const lastName = nameParts.slice(1).join(' ') || undefined;

        const email: string | undefined = raw.email || raw.email_address || undefined;
        const phone: string | undefined = raw.phone || raw.mobile || raw.contact || undefined;
        const notes: string | undefined =
            raw.message || raw.notes || raw.description || raw.comment ||
            `Web form submission from "${form.name}"`;

        const leadDto: any = {
            first_name: firstName,
            last_name: lastName,
            email,
            phone,
            source: 'WEB_FORM',
            notes: notes || JSON.stringify(data),
        };

        return this.leadsService.create(leadDto, organizationId);
    }

    private generateSlug(name: string): string {
        return name
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .trim();
    }
}
