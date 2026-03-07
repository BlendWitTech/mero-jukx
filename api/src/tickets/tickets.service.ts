import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Ticket, TicketPriority, TicketSource, TicketStatus } from '../database/entities/tickets.entity';
import { TicketComment } from '../database/entities/ticket_comments.entity';
import { TicketActivity, TicketActivityType } from '../database/entities/ticket_activities.entity';
import { OrganizationMember, OrganizationMemberStatus } from '../database/entities/organization_members.entity';
import { Chat } from '../database/entities/chats.entity';
import { Message } from '../database/entities/messages.entity';
import { User } from '../database/entities/users.entity';
import { App } from '../database/entities/apps.entity';
import { OrganizationApp, OrganizationAppStatus } from '../database/entities/organization_apps.entity';
import { UserAppAccess } from '../database/entities/user_app_access.entity';
import { Organization } from '../database/entities/organizations.entity';
import { PackageFeature } from '../database/entities/package_features.entity';
import { OrganizationPackageFeature, OrganizationPackageFeatureStatus } from '../database/entities/organization_package_features.entity';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { CreateTicketFromChatDto } from './dto/create-ticket-from-chat.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { TicketQueryDto } from './dto/ticket-query.dto';
import { AddCommentDto } from './dto/add-comment.dto';
import { TransferTicketToBoardDto } from './dto/transfer-ticket-to-board.dto';

@Injectable()
export class TicketsService {
  private readonly logger = new Logger(TicketsService.name);

  constructor(
    @InjectRepository(Ticket)
    private ticketRepository: Repository<Ticket>,
    @InjectRepository(TicketComment)
    private commentRepository: Repository<TicketComment>,
    @InjectRepository(TicketActivity)
    private activityRepository: Repository<TicketActivity>,
    @InjectRepository(OrganizationMember)
    private memberRepository: Repository<OrganizationMember>,
    @InjectRepository(Chat)
    private chatRepository: Repository<Chat>,
    @InjectRepository(Message)
    private messageRepository: Repository<Message>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(App)
    private appRepository: Repository<App>,
    @InjectRepository(OrganizationApp)
    private orgAppRepository: Repository<OrganizationApp>,
    @InjectRepository(UserAppAccess)
    private appAccessRepository: Repository<UserAppAccess>,
    @InjectRepository(Organization)
    private organizationRepository: Repository<Organization>,
    @InjectRepository(PackageFeature)
    private featureRepository: Repository<PackageFeature>,
    @InjectRepository(OrganizationPackageFeature)
    private orgFeatureRepository: Repository<OrganizationPackageFeature>,
  ) { }

  async hasTicketAccess(organizationId: string): Promise<boolean> {
    try {
      const organization = await this.organizationRepository.findOne({
        where: { id: organizationId },
        relations: ['package'],
      });

      if (!organization) {
        return false;
      }

      // Check if package exists and is Platinum or Diamond (includes ticket system)
      if (organization.package?.slug === 'platinum' || organization.package?.slug === 'diamond') {
        return true;
      }

      // Check if they have purchased the ticket system feature separately
      const ticketFeature = await this.featureRepository.findOne({
        where: { slug: 'ticket-system' },
      });

      if (!ticketFeature) {
        return false;
      }

      const orgFeature = await this.orgFeatureRepository.findOne({
        where: {
          organization_id: organizationId,
          feature_id: ticketFeature.id,
          status: OrganizationPackageFeatureStatus.ACTIVE,
        },
      });

      return !!orgFeature;
    } catch (error) {
      this.logger.error(`Error checking ticket access for organization ${organizationId}: ${error.message}`, error.stack);
      return false;
    }
  }

  private async ensureMembership(userId: string, organizationId: string) {
    const member = await this.memberRepository.findOne({
      where: {
        user_id: userId,
        organization_id: organizationId,
        status: OrganizationMemberStatus.ACTIVE,
      },
      relations: ['role'],
    });

    if (!member) {
      throw new ForbiddenException('You are not a member of this organization');
    }

    return member;
  }

  private ensureUpdatePermission(ticket: Ticket, member: OrganizationMember) {
    const isOwner = member.role?.is_organization_owner;
    const isAssignee = ticket.assignee_id && ticket.assignee_id === member.user_id;
    const isCreator = ticket.created_by === member.user_id;

    if (!isOwner && !isAssignee && !isCreator) {
      throw new ForbiddenException('You do not have permission to modify this ticket');
    }
  }

  private async validateAssignee(assigneeId: string | undefined, organizationId: string) {
    if (!assigneeId) return null;

    const assignee = await this.memberRepository.findOne({
      where: {
        user_id: assigneeId,
        organization_id: organizationId,
        status: OrganizationMemberStatus.ACTIVE,
      },
    });

    if (!assignee) {
      throw new BadRequestException('Assignee must be an active member of this organization');
    }

    return assignee.user_id;
  }

  async createTicket(userId: string, organizationId: string, dto: CreateTicketDto) {
    // Check ticket system access
    const hasAccess = await this.hasTicketAccess(organizationId);
    if (!hasAccess) {
      throw new ForbiddenException(
        'Ticket system is not available. Please upgrade to Platinum or Diamond package, or purchase the Ticket System feature separately.',
      );
    }

    await this.ensureMembership(userId, organizationId);

    const assigneeId = await this.validateAssignee(dto.assignee_id, organizationId);
    await this.validateChatLinks(dto.chat_id, dto.message_id, organizationId);

    const ticket = this.ticketRepository.create({
      organization_id: organizationId,
      created_by: userId,
      assignee_id: assigneeId,
      title: dto.title,
      description: dto.description ?? null,
      priority: dto.priority ?? TicketPriority.MEDIUM,
      status: TicketStatus.OPEN,
      source: dto.source ?? TicketSource.REGULAR,
      chat_id: dto.chat_id ?? null,
      message_id: dto.message_id ?? null,
      tags: dto.tags ?? [],
      attachment_urls: dto.attachment_urls ?? null,
      estimated_time_minutes: dto.estimated_time_minutes ?? null,
      due_date: dto.due_date ? new Date(dto.due_date) : null,
      project_id: dto.projectId ?? null,
    });

    const savedTicket = await this.ticketRepository.save(ticket);

    // Create activity record for ticket creation
    await this.createActivity(savedTicket.id, userId, TicketActivityType.CREATED, {
      title: savedTicket.title,
      priority: savedTicket.priority,
      assignee_id: savedTicket.assignee_id,
    });

    return savedTicket;
  }

  async createFromChat(userId: string, organizationId: string, dto: CreateTicketFromChatDto) {
    // Check ticket system access
    const hasAccess = await this.hasTicketAccess(organizationId);
    if (!hasAccess) {
      throw new ForbiddenException(
        'Ticket system is not available. Please upgrade to Platinum or Diamond package, or purchase the Ticket System feature separately.',
      );
    }

    await this.ensureMembership(userId, organizationId);
    const assigneeId = await this.validateAssignee(dto.assignee_id, organizationId);

    // Validate chat + message belong to org
    await this.validateChatLinks(dto.chat_id, dto.message_id, organizationId, true);

    const ticket = this.ticketRepository.create({
      organization_id: organizationId,
      created_by: userId,
      assignee_id: assigneeId,
      title: dto.title,
      description: dto.description ?? dto.message_excerpt ?? null,
      priority: dto.priority ?? TicketPriority.MEDIUM,
      status: TicketStatus.OPEN,
      source: TicketSource.CHAT_FLAG,
      chat_id: dto.chat_id,
      message_id: dto.message_id,
      tags: dto.tags ?? [],
      attachment_urls: dto.attachment_urls ?? null,
    });

    return this.ticketRepository.save(ticket);
  }

  async findAll(userId: string, organizationId: string, query: TicketQueryDto, accessibleOrganizationIds?: string[]) {
    try {
      // Check ticket system access
      const hasAccess = await this.hasTicketAccess(organizationId);
      if (!hasAccess) {
        throw new ForbiddenException(
          'Ticket system is not available. Please upgrade to Platinum or Diamond package, or purchase the Ticket System feature separately.',
        );
      }

      await this.ensureMembership(userId, organizationId);

      // Validate organizationId is a valid UUID
      if (!organizationId || typeof organizationId !== 'string') {
        throw new BadRequestException('Invalid organization ID');
      }

      const orgIds = accessibleOrganizationIds && accessibleOrganizationIds.length > 0
        ? accessibleOrganizationIds
        : [organizationId];

      const qb = this.ticketRepository
        .createQueryBuilder('ticket')
        .where('ticket.organization_id IN (:...orgIds)', { orgIds });

      if (query.status) {
        qb.andWhere('ticket.status = :status', { status: query.status });
      }

      if (query.priority) {
        qb.andWhere('ticket.priority = :priority', { priority: query.priority });
      }

      if (query.assignee_id) {
        qb.andWhere('ticket.assignee_id = :assigneeId', { assigneeId: query.assignee_id });
      }

      if (query.projectId) {
        qb.andWhere('ticket.project_id = :projectId', { projectId: query.projectId });
      }

      if (query.search) {
        qb.andWhere('(ticket.title ILIKE :search OR ticket.description ILIKE :search)', {
          search: `%${query.search}%`,
        });
      }

      // Ensure page and limit are valid numbers
      // Handle both number and string inputs (query params come as strings)
      const pageNum = typeof query.page === 'string' ? parseInt(query.page, 10) : query.page;
      const limitNum = typeof query.limit === 'string' ? parseInt(query.limit, 10) : query.limit;

      const page = pageNum && !isNaN(pageNum) && pageNum > 0 ? pageNum : 1;
      const limit = limitNum && !isNaN(limitNum) && limitNum > 0 ? (limitNum > 100 ? 100 : limitNum) : 20;

      // Validate pagination values
      if (page < 1) {
        throw new BadRequestException('Page must be greater than 0');
      }
      if (limit < 1 || limit > 100) {
        throw new BadRequestException('Limit must be between 1 and 100');
      }

      this.logger.debug(`Fetching tickets for organization ${organizationId}, page ${page}, limit ${limit}`);

      const [tickets, total] = await qb
        .orderBy('ticket.created_at', 'DESC')
        .skip((page - 1) * limit)
        .take(limit)
        .getManyAndCount();

      this.logger.debug(`Found ${tickets.length} tickets (total: ${total}) for organization ${organizationId}`);

      return { tickets, total, page, limit };
    } catch (error) {
      // Re-throw known exceptions
      if (error instanceof ForbiddenException || error instanceof BadRequestException) {
        throw error;
      }
      // Log unexpected errors with full details
      this.logger.error(
        `Error in findAll tickets for organization ${organizationId}: ${error.message}`,
        error.stack,
      );
      this.logger.error('Query parameters:', { userId, organizationId, query });

      // Include the actual error message in the response for debugging
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new BadRequestException(`Failed to retrieve tickets: ${errorMessage}`);
    }
  }

  async findOne(userId: string, organizationId: string, ticketId: string, accessibleOrganizationIds?: string[]) {
    // Check ticket system access
    const hasAccess = await this.hasTicketAccess(organizationId);
    if (!hasAccess) {
      throw new ForbiddenException(
        'Ticket system is not available. Please upgrade to Platinum or Diamond package, or purchase the Ticket System feature separately.',
      );
    }

    await this.ensureMembership(userId, organizationId);

    const orgIds = accessibleOrganizationIds && accessibleOrganizationIds.length > 0
      ? accessibleOrganizationIds
      : [organizationId];

    const ticket = await this.ticketRepository.findOne({
      where: { id: ticketId, organization_id: In(orgIds) },
      relations: ['comments'],
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    return ticket;
  }

  async updateTicket(userId: string, organizationId: string, ticketId: string, dto: UpdateTicketDto, accessibleOrganizationIds?: string[]) {
    // Check ticket system access
    const hasAccess = await this.hasTicketAccess(organizationId);
    if (!hasAccess) {
      throw new ForbiddenException(
        'Ticket system is not available. Please upgrade to Platinum or Diamond package, or purchase the Ticket System feature separately.',
      );
    }

    const member = await this.ensureMembership(userId, organizationId);
    const orgIds = accessibleOrganizationIds && accessibleOrganizationIds.length > 0
      ? accessibleOrganizationIds
      : [organizationId];

    const ticket = await this.ticketRepository.findOne({ where: { id: ticketId, organization_id: In(orgIds) } });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    this.ensureUpdatePermission(ticket, member);

    const oldStatus = ticket.status;
    const oldPriority = ticket.priority;
    const oldAssigneeId = ticket.assignee_id;

    if (dto.assignee_id !== undefined) {
      const newAssigneeId = await this.validateAssignee(dto.assignee_id, organizationId);
      if (newAssigneeId !== oldAssigneeId) {
        ticket.assignee_id = newAssigneeId;
        // Create activity for assignment
        await this.createActivity(ticket.id, userId, TicketActivityType.ASSIGNED, {
          old_assignee_id: oldAssigneeId,
          new_assignee_id: newAssigneeId,
        });
      }
    }

    if (dto.title !== undefined) ticket.title = dto.title;
    if (dto.description !== undefined) ticket.description = dto.description;

    if (dto.status !== undefined && dto.status !== oldStatus) {
      ticket.status = dto.status;
      // Create activity for status change
      await this.createActivity(ticket.id, userId, TicketActivityType.STATUS_CHANGED, {
        old_status: oldStatus,
        new_status: dto.status,
      });

      // If status changed to resolved/closed, set completed_at and check if on time
      if ((dto.status === TicketStatus.RESOLVED || dto.status === TicketStatus.CLOSED) && !ticket.completed_at) {
        ticket.completed_at = new Date();

        // Check if completed on time
        if (ticket.due_date) {
          const isOnTime = new Date(ticket.completed_at) <= new Date(ticket.due_date);
          await this.createActivity(
            ticket.id,
            userId,
            isOnTime ? TicketActivityType.COMPLETED_ON_TIME : TicketActivityType.COMPLETED_OUT_OF_TIME,
            {
              due_date: ticket.due_date,
              completed_at: ticket.completed_at,
              is_on_time: isOnTime,
            },
          );
        } else {
          await this.createActivity(ticket.id, userId, TicketActivityType.COMPLETED_ON_TIME, {
            completed_at: ticket.completed_at,
          });
        }
      }
    }

    if (dto.priority !== undefined && dto.priority !== oldPriority) {
      ticket.priority = dto.priority;
      // Create activity for priority change
      await this.createActivity(ticket.id, userId, TicketActivityType.PRIORITY_CHANGED, {
        old_priority: oldPriority,
        new_priority: dto.priority,
      });
    }

    if (dto.tags !== undefined) ticket.tags = dto.tags;
    if (dto.attachment_urls !== undefined) ticket.attachment_urls = dto.attachment_urls;

    // Handle time tracking fields
    if (dto.estimated_time_minutes !== undefined) {
      ticket.estimated_time_minutes = dto.estimated_time_minutes;
    }
    if (dto.actual_time_minutes !== undefined) {
      ticket.actual_time_minutes = dto.actual_time_minutes;
    }
    if (dto.due_date !== undefined) {
      ticket.due_date = dto.due_date ? new Date(dto.due_date) : null;
    }
    if (dto.completed_at !== undefined) {
      ticket.completed_at = dto.completed_at ? new Date(dto.completed_at) : null;
    }
    if (dto.additional_time_requested_minutes !== undefined) {
      ticket.additional_time_requested_minutes = dto.additional_time_requested_minutes;
      // Create activity for additional time request
      await this.createActivity(ticket.id, userId, TicketActivityType.ADDITIONAL_TIME_REQUESTED, {
        additional_time_minutes: dto.additional_time_requested_minutes,
      });
    }

    // Handle ticket transfer
    if (dto.transferred_to_user_id) {
      const newAssigneeId = await this.validateAssignee(dto.transferred_to_user_id, organizationId);
      ticket.transferred_from_user_id = oldAssigneeId || userId;
      ticket.transferred_to_user_id = newAssigneeId;
      ticket.transferred_at = new Date();
      ticket.assignee_id = newAssigneeId;

      // Create activity for transfer
      await this.createActivity(ticket.id, userId, TicketActivityType.TRANSFERRED, {
        from_user_id: ticket.transferred_from_user_id,
        to_user_id: newAssigneeId,
      });
    }

    await this.ticketRepository.save(ticket);
    return ticket;
  }

  async addComment(userId: string, organizationId: string, ticketId: string, dto: AddCommentDto, accessibleOrganizationIds?: string[]) {
    // Check ticket system access
    const hasAccess = await this.hasTicketAccess(organizationId);
    if (!hasAccess) {
      throw new ForbiddenException(
        'Ticket system is not available. Please upgrade to Platinum or Diamond package, or purchase the Ticket System feature separately.',
      );
    }

    await this.ensureMembership(userId, organizationId);

    const orgIds = accessibleOrganizationIds && accessibleOrganizationIds.length > 0
      ? accessibleOrganizationIds
      : [organizationId];

    const ticket = await this.ticketRepository.findOne({ where: { id: ticketId, organization_id: In(orgIds) } });
    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    const comment = this.commentRepository.create({
      ticket_id: ticketId,
      author_id: userId,
      body: dto.body,
      attachment_urls: dto.attachment_urls ?? null,
    });

    await this.commentRepository.save(comment);

    // Create activity record for comment
    await this.createActivity(ticketId, userId, TicketActivityType.COMMENT_ADDED, {
      comment_id: comment.id,
    });

    return comment;
  }

  private async createActivity(
    ticketId: string,
    userId: string,
    activityType: TicketActivityType,
    metadata?: Record<string, any>,
  ) {
    const activity = this.activityRepository.create({
      ticket_id: ticketId,
      user_id: userId,
      activity_type: activityType,
      metadata: metadata || null,
    });
    return this.activityRepository.save(activity);
  }

  private async validateChatLinks(
    chatId: string | undefined,
    messageId: string | undefined,
    organizationId: string,
    requireBoth = false,
  ) {
    if (!chatId && !messageId) {
      return;
    }

    if (requireBoth && (!chatId || !messageId)) {
      throw new BadRequestException('Chat and message are required for chat-linked tickets');
    }

    if (chatId) {
      const chat = await this.chatRepository.findOne({ where: { id: chatId } });
      if (!chat || chat.organization_id !== organizationId) {
        throw new BadRequestException('Chat not found in this organization');
      }
    }

    if (messageId) {
      const message = await this.messageRepository.findOne({
        where: { id: messageId },
        relations: ['chat'],
      });

      if (!message || message.chat.organization_id !== organizationId) {
        throw new BadRequestException('Message not found in this organization');
      }

      if (chatId && message.chat_id !== chatId) {
        throw new BadRequestException('Message does not belong to provided chat');
      }
    }
  }

  /**
   * Transfer ticket to an app
   */
  async transferToBoard(
    userId: string,
    organizationId: string,
    ticketId: string,
    dto: TransferTicketToBoardDto,
    accessibleOrganizationIds?: string[],
  ) {
    const member = await this.ensureMembership(userId, organizationId);

    const orgIds = accessibleOrganizationIds && accessibleOrganizationIds.length > 0
      ? accessibleOrganizationIds
      : [organizationId];

    const ticket = await this.ticketRepository.findOne({
      where: { id: ticketId, organization_id: In(orgIds) },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    // Verify app exists and is subscribed
    const app = await this.appRepository.findOne({ where: { id: dto.app_id } });
    if (!app) {
      throw new NotFoundException('App not found');
    }

    const subscription = await this.orgAppRepository.findOne({
      where: {
        organization_id: organizationId,
        app_id: dto.app_id,
        status: OrganizationAppStatus.ACTIVE,
      },
    });

    if (!subscription) {
      throw new BadRequestException('App is not subscribed by this organization');
    }

    // Verify user has access to the app (if assignee is specified)
    if (dto.assignee_id) {
      const hasAccess = await this.appAccessRepository.findOne({
        where: {
          user_id: dto.assignee_id,
          organization_id: organizationId,
          app_id: dto.app_id,
          is_active: true,
        },
      });

      if (!hasAccess) {
        throw new ForbiddenException('Assignee does not have access to this app');
      }

      // Validate assignee is in organization
      await this.validateAssignee(dto.assignee_id, organizationId);
    }

    // Update ticket with board information
    ticket.board_app_id = dto.app_id;
    ticket.board_id = dto.board_id || null;

    if (dto.assignee_id) {
      ticket.assignee_id = dto.assignee_id;
    }

    return this.ticketRepository.save(ticket);
  }
  async moveTicket(
    userId: string,
    organizationId: string,
    ticketId: string,
    targetBoardId: string,
    targetColumnId: string,
    newPosition: number,
  ) {
    const member = await this.ensureMembership(userId, organizationId);
    const ticket = await this.findOne(userId, organizationId, ticketId); // Ensuring access & existence

    this.ensureUpdatePermission(ticket, member);

    // Validate target board and column exist in org
    // Note: You might want to inject BoardsService or BoardColumnsService here, 
    // or just assume for now and let FK constraints handle it, but better to validate if possible.
    // For now, we trust the input or simple update.

    ticket.board_id = targetBoardId;
    ticket.column_id = targetColumnId;
    ticket.position = newPosition;

    // Logic to shift other tickets' positions in the target column would go here
    // For MVP, we just set the position. 
    // detailed reordering logic is usually handled by frontend sending updated positions for affected items 
    // or backend bulk update.

    return this.ticketRepository.save(ticket);
  }

  // ... existing methods ...
}

