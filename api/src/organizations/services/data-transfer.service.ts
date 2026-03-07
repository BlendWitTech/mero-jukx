import { Injectable, Logger, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { Organization, OrganizationType } from '../../database/entities/organizations.entity';
import { OrganizationMember, OrganizationMemberStatus } from '../../database/entities/organization_members.entity';
import { Ticket } from '../../database/entities/tickets.entity';
import { Role } from '../../database/entities/roles.entity';
import { Task } from '../../database/entities/tasks.entity';

@Injectable()
export class DataTransferService {
    private readonly logger = new Logger(DataTransferService.name);

    constructor(
        private dataSource: DataSource,
        @InjectRepository(Organization)
        private organizationRepository: Repository<Organization>,
        @InjectRepository(OrganizationMember)
        private memberRepository: Repository<OrganizationMember>,
        @InjectRepository(Ticket)
        private ticketRepository: Repository<Ticket>,
        @InjectRepository(Role)
        private roleRepository: Repository<Role>,
        @InjectRepository(Task)
        private taskRepository: Repository<Task>,
    ) { }

    /**
     * Transfers a user membership from one branch to another.
     * Both branches must belong to the same MAIN organization.
     */
    async transferUser(
        adminUserId: string,
        targetUserId: string,
        fromOrgId: string,
        toOrgId: string,
    ) {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            // 1. Validate both organizations belong to the same MAIN hierarchy
            const [fromOrg, toOrg] = await Promise.all([
                this.organizationRepository.findOne({ where: { id: fromOrgId } }),
                this.organizationRepository.findOne({ where: { id: toOrgId } }),
            ]);

            if (!fromOrg || !toOrg) {
                throw new NotFoundException('One or both organizations not found');
            }

            const parentId = fromOrg.org_type === OrganizationType.MAIN ? fromOrg.id : fromOrg.parent_id;
            const targetParentId = toOrg.org_type === OrganizationType.MAIN ? toOrg.id : toOrg.parent_id;

            if (parentId !== targetParentId || !parentId) {
                throw new ForbiddenException('Cannot transfer users between different hierarchies');
            }

            // 2. Find the membership in the source organization
            const membership = await this.memberRepository.findOne({
                where: { user_id: targetUserId, organization_id: fromOrgId, status: OrganizationMemberStatus.ACTIVE },
                relations: ['role'],
            });

            if (!membership) {
                throw new NotFoundException('User membership not found in source organization');
            }

            // 3. Find a suitable role in the target organization
            // We try to find a role with the same slug, otherwise we use the default role
            let targetRole = await this.roleRepository.findOne({
                where: { organization_id: toOrgId, slug: membership.role.slug },
            });

            if (!targetRole) {
                targetRole = await this.roleRepository.findOne({
                    where: { organization_id: toOrgId, is_default: true },
                });
            }

            if (!targetRole) {
                throw new BadRequestException('No suitable role found in target organization');
            }

            // 4. Update the membership
            membership.organization_id = toOrgId;
            membership.role_id = targetRole.id;
            await queryRunner.manager.save(membership);

            // 5. Transfer user's data (Tickets, Tasks) if they were the owner/creator
            // This is a minimal implementation, usually you'd want to be more specific
            await queryRunner.manager.update(Ticket,
                { organization_id: fromOrgId, created_by: targetUserId },
                { organization_id: toOrgId }
            );

            await queryRunner.manager.update(Task,
                { organization_id: fromOrgId, created_by: targetUserId },
                { organization_id: toOrgId }
            );

            await queryRunner.commitTransaction();
            this.logger.log(`Transferred user ${targetUserId} from ${fromOrgId} to ${toOrgId}`);

            return { message: 'User transferred successfully', target_role: targetRole.name };
        } catch (err) {
            await queryRunner.rollbackTransaction();
            this.logger.error(`Failed to transfer user: ${err.message}`);
            throw err;
        } finally {
            await queryRunner.release();
        }
    }

    /**
     * Transfers a specific ticket to another branch.
     */
    async transferTicket(
        adminUserId: string,
        ticketId: string,
        toOrgId: string,
    ) {
        const ticket = await this.ticketRepository.findOne({ where: { id: ticketId } });
        if (!ticket) throw new NotFoundException('Ticket not found');

        const fromOrgId = ticket.organization_id;
        if (fromOrgId === toOrgId) return ticket;

        // Verify hierarchy (same parent)
        const [fromOrg, toOrg] = await Promise.all([
            this.organizationRepository.findOne({ where: { id: fromOrgId } }),
            this.organizationRepository.findOne({ where: { id: toOrgId } }),
        ]);

        const parentId = fromOrg.org_type === OrganizationType.MAIN ? fromOrg.id : fromOrg.parent_id;
        const targetParentId = toOrg.org_type === OrganizationType.MAIN ? toOrg.id : toOrg.parent_id;

        if (parentId !== targetParentId || !parentId) {
            throw new ForbiddenException('Cannot transfer data between different hierarchies');
        }

        ticket.organization_id = toOrgId;
        // Note: association with chat/messages might stay or break depending on requirements.
        // Usually, we'd null them if they don't exist in the new org.

        return this.ticketRepository.save(ticket);
    }
}
