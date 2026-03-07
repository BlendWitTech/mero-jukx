import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Organization, OrganizationType } from '../../database/entities/organizations.entity';

@Injectable()
export class HierarchicalIsolationService {
    private readonly logger = new Logger(HierarchicalIsolationService.name);

    constructor(
        @InjectRepository(Organization)
        private organizationRepository: Repository<Organization>,
    ) { }

    /**
     * Returns a list of all organization IDs that the given organization should have access to.
     * If it's a MAIN organization, returns its own ID plus all child branch IDs.
     * If it's a BRANCH organization, returns only its own ID.
     */
    async getAccessibleOrganizationIds(organizationId: string): Promise<string[]> {
        const org = await this.organizationRepository.findOne({
            where: { id: organizationId },
            relations: ['branches'],
        });

        if (!org) {
            return [organizationId];
        }

        if (org.org_type === OrganizationType.MAIN) {
            const branchIds = org.branches?.map(b => b.id) || [];
            return [organizationId, ...branchIds];
        }

        return [organizationId];
    }

    /**
     * Checks if a target organization is a child of the parent organization.
     */
    async isChildOf(childOrgId: string, parentOrgId: string): Promise<boolean> {
        const child = await this.organizationRepository.findOne({
            where: { id: childOrgId },
        });

        return child?.parent_id === parentOrgId;
    }
}
