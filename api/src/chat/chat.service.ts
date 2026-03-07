import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { Chat, ChatType, ChatStatus } from '../database/entities/chats.entity';
import { ChatMember, ChatMemberRole, ChatMemberStatus } from '../database/entities/chat_members.entity';
import { Message, MessageType, MessageStatus } from '../database/entities/messages.entity';
import { MessageAttachment } from '../database/entities/message_attachments.entity';
import { MessageReadStatus } from '../database/entities/message_read_status.entity';
import { Organization } from '../database/entities/organizations.entity';
import { OrganizationMember, OrganizationMemberStatus } from '../database/entities/organization_members.entity';
import { User } from '../database/entities/users.entity';
import { Package } from '../database/entities/packages.entity';
import { OrganizationPackageFeature, OrganizationPackageFeatureStatus } from '../database/entities/organization_package_features.entity';
import { PackageFeature } from '../database/entities/package_features.entity';
import { CreateChatDto } from './dto/create-chat.dto';
import { UpdateChatDto } from './dto/update-chat.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { ChatQueryDto } from './dto/chat-query.dto';
import { MessageQueryDto } from './dto/message-query.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { NotificationHelperService, NotificationType } from '../notifications/notification-helper.service';
import { Ticket, TicketPriority, TicketSource, TicketStatus } from '../database/entities/tickets.entity';

@Injectable()
export class ChatService {
  private chatGateway: any; // Will be set via setGateway method

  constructor(
    @InjectRepository(Chat)
    private chatRepository: Repository<Chat>,
    @InjectRepository(ChatMember)
    private chatMemberRepository: Repository<ChatMember>,
    @InjectRepository(Message)
    private messageRepository: Repository<Message>,
    @InjectRepository(MessageAttachment)
    private attachmentRepository: Repository<MessageAttachment>,
    @InjectRepository(MessageReadStatus)
    private messageReadStatusRepository: Repository<MessageReadStatus>,
    @InjectRepository(Organization)
    private organizationRepository: Repository<Organization>,
    @InjectRepository(OrganizationMember)
    private memberRepository: Repository<OrganizationMember>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Package)
    private packageRepository: Repository<Package>,
    @InjectRepository(OrganizationPackageFeature)
    private orgFeatureRepository: Repository<OrganizationPackageFeature>,
    @InjectRepository(PackageFeature)
    private featureRepository: Repository<PackageFeature>,
    @InjectRepository(Ticket)
    private ticketRepository: Repository<Ticket>,
    private dataSource: DataSource,
    private auditLogsService: AuditLogsService,
    private notificationHelper: NotificationHelperService,
  ) { }

  // Set gateway reference (called from module to avoid circular dependency)
  setGateway(gateway: any) {
    this.chatGateway = gateway;
  }

  /**
   * Check if organization has access to chat feature
   */
  async hasChatAccess(organizationId: string): Promise<boolean> {
    const organization = await this.organizationRepository.findOne({
      where: { id: organizationId },
      relations: ['package'],
    });

    if (!organization) {
      return false;
    }

    // Check if package is Platinum or Diamond (includes chat)
    if (organization.package.slug === 'platinum' || organization.package.slug === 'diamond' || process.env.NODE_ENV === 'development') {
      return true;
    }

    // Check if they have purchased the chat feature separately
    const chatFeature = await this.featureRepository.findOne({
      where: { slug: 'chat-system' },
    });

    if (!chatFeature) {
      return false;
    }

    const orgFeature = await this.orgFeatureRepository.findOne({
      where: {
        organization_id: organizationId,
        feature_id: chatFeature.id,
        status: OrganizationPackageFeatureStatus.ACTIVE,
      },
    });

    return !!orgFeature;
  }

  /**
   * Verify user is member of organization
   */
  async verifyMembership(userId: string, organizationId: string): Promise<OrganizationMember> {
    const membership = await this.memberRepository.findOne({
      where: {
        user_id: userId,
        organization_id: organizationId,
        status: OrganizationMemberStatus.ACTIVE,
      },
    });

    if (!membership) {
      throw new ForbiddenException('You are not a member of this organization');
    }

    return membership;
  }

  /**
   * Create a new chat (direct or group)
   */
  async createChat(userId: string, organizationId: string, dto: CreateChatDto): Promise<Chat> {
    // Check chat access
    const hasAccess = await this.hasChatAccess(organizationId);
    if (!hasAccess) {
      throw new ForbiddenException(
        'Chat feature is not available. Please upgrade to Platinum or Diamond package, or purchase the Chat System feature.',
      );
    }

    // Verify membership
    await this.verifyMembership(userId, organizationId);

    // Normalize member_ids to array
    const memberIds = dto.member_ids || [];

    // For direct chats, ensure exactly 2 members
    if (dto.type === ChatType.DIRECT) {
      if (memberIds.length !== 1) {
        throw new BadRequestException('Direct chat must have exactly one other member');
      }

      // Check if direct chat already exists
      const existingDirectChat = await this.findDirectChat(organizationId, userId, memberIds[0]);
      if (existingDirectChat) {
        return existingDirectChat;
      }
    } else {
      // For group chats, check permission
      if (!dto.name) {
        throw new BadRequestException('Group chat must have a name');
      }

      // Check if user has 'chat.create_group' permission
      // Organization Owner and Admin should always have access
      const member = await this.memberRepository.findOne({
        where: {
          user_id: userId,
          organization_id: organizationId,
          status: OrganizationMemberStatus.ACTIVE,
        },
        relations: ['role', 'role.role_permissions', 'role.role_permissions.permission'],
      });

      if (!member) {
        throw new ForbiddenException('You are not a member of this organization');
      }

      // Organization Owner and Admin (slug: 'admin') can always create group chats
      const isOwner = member.role?.is_organization_owner;
      const isAdmin = member.role?.slug === 'admin' && member.role?.is_system_role;
      const hasPermission =
        isOwner ||
        isAdmin ||
        member.role?.role_permissions?.some(
          (rp) => rp.permission?.slug === 'chat.create_group',
        ) ||
        false;

      if (!hasPermission) {
        throw new ForbiddenException('You do not have permission to create group chats');
      }
    }

    // Verify all members exist and are in the organization (only if members are provided)
    if (memberIds.length > 0) {
      const members = await this.memberRepository.find({
        where: {
          user_id: In([userId, ...memberIds]),
          organization_id: organizationId,
          status: OrganizationMemberStatus.ACTIVE,
        },
      });

      if (members.length !== memberIds.length + 1) {
        throw new BadRequestException('Some members are not part of this organization');
      }
    }

    // Create chat
    const chat = this.chatRepository.create({
      organization_id: organizationId,
      type: dto.type,
      name: dto.type === ChatType.GROUP ? dto.name : null,
      description: dto.description || null,
      created_by: userId,
      status: ChatStatus.ACTIVE,
    });

    const savedChat = await this.chatRepository.save(chat);

    // Add members
    const chatMembers: ChatMember[] = [
      // Creator is owner for groups, member for direct
      this.chatMemberRepository.create({
        chat_id: savedChat.id,
        organizationId: organizationId,
        user_id: userId,
        role: dto.type === ChatType.GROUP ? ChatMemberRole.OWNER : ChatMemberRole.MEMBER,
        status: ChatMemberStatus.ACTIVE,
      }),
      // Other members
      ...memberIds.map((memberId) =>
        this.chatMemberRepository.create({
          chat_id: savedChat.id,
          organizationId: organizationId,
          user_id: memberId,
          role: ChatMemberRole.MEMBER,
          status: ChatMemberStatus.ACTIVE,
        }),
      ),
    ];

    await this.chatMemberRepository.save(chatMembers);

    // Get creator info
    const creator = await this.userRepository.findOne({ where: { id: userId } });
    const creatorName = creator ? `${creator.first_name} ${creator.last_name}`.trim() : 'Someone';

    // Create notifications for other members (chat initiated)
    // For direct chats, notify the other person
    // For group chats, notify all members except creator
    const otherMembers = memberIds;
    for (const memberId of otherMembers) {
      await this.notificationHelper.createNotification(
        memberId,
        organizationId,
        NotificationType.CHAT_INITIATED,
        dto.type === ChatType.GROUP
          ? `Added to ${dto.name || 'group'}`
          : `${creatorName} started a conversation`,
        dto.type === ChatType.GROUP
          ? `${creatorName} added you to the group "${dto.name || 'group'}"`
          : `${creatorName} started a conversation with you`,
        {
          route: '/chat',
          params: { chatId: savedChat.id },
        },
        {
          chat_id: savedChat.id,
          chat_name: dto.name,
          chat_type: dto.type,
          created_by_id: userId,
          created_by_name: creatorName,
        },
      );
    }

    // Audit log
    await this.auditLogsService.createAuditLog(
      organizationId,
      userId,
      'chat.created',
      'chat',
      savedChat.id,
      null,
      {
        chat_type: dto.type,
        chat_name: dto.name,
      },
    );

    return this.findOne(userId, organizationId, savedChat.id);
  }

  /**
   * Find existing direct chat between two users
   */
  async findDirectChat(organizationId: string, userId1: string, userId2: string): Promise<Chat | null> {
    const chats = await this.chatRepository
      .createQueryBuilder('chat')
      .innerJoin('chat.members', 'member1', 'member1.user_id = :userId1', { userId1 })
      .innerJoin('chat.members', 'member2', 'member2.user_id = :userId2', { userId2 })
      .where('chat.organization_id = :organizationId', { organizationId })
      .andWhere('chat.type = :type', { type: ChatType.DIRECT })
      .andWhere('chat.status = :status', { status: ChatStatus.ACTIVE })
      .andWhere('member1.status = :memberStatus', { memberStatus: ChatMemberStatus.ACTIVE })
      .andWhere('member2.status = :memberStatus', { memberStatus: ChatMemberStatus.ACTIVE })
      .getOne();

    return chats;
  }

  /**
   * Get all chats for a user
   */
  async findAll(userId: string, organizationId: string, query: ChatQueryDto): Promise<{
    chats: Chat[];
    total: number;
    page: number;
    limit: number;
  }> {
    // Check chat access
    const hasAccess = await this.hasChatAccess(organizationId);
    if (!hasAccess) {
      throw new ForbiddenException(
        'Chat feature is not available. Please upgrade to Platinum or Diamond package, or purchase the Chat System feature.',
      );
    }

    await this.verifyMembership(userId, organizationId);

    // Ensure pagination defaults are applied
    const page = query.page || 1;
    const limit = query.limit || 20;

    // Use subquery to get chat IDs where user is a member
    const memberSubQuery = this.chatMemberRepository
      .createQueryBuilder('cm')
      .select('cm.chat_id')
      .where('cm.user_id = :userId', { userId })
      .andWhere('cm.status = :memberStatus', { memberStatus: ChatMemberStatus.ACTIVE });

    const queryBuilder = this.chatRepository
      .createQueryBuilder('chat')
      .where('chat.id IN (' + memberSubQuery.getQuery() + ')')
      .andWhere('chat.organization_id = :organizationId', { organizationId })
      .andWhere('chat.status = :chatStatus', { chatStatus: ChatStatus.ACTIVE })
      .setParameters(memberSubQuery.getParameters());

    if (query.type) {
      queryBuilder.andWhere('chat.type = :type', { type: query.type });
    }

    if (query.status) {
      queryBuilder.andWhere('chat.status = :status', { status: query.status });
    }

    if (query.search) {
      queryBuilder.andWhere('(chat.name ILIKE :search OR chat.description ILIKE :search)', {
        search: `%${query.search}%`,
      });
    }

    const total = await queryBuilder.getCount();

    // Load chats with relations
    const chats = await queryBuilder
      .leftJoinAndSelect('chat.members', 'members')
      .leftJoinAndSelect('members.user', 'memberUser')
      .leftJoinAndSelect('chat.creator', 'creator')
      .orderBy('chat.last_message_at', 'DESC')
      .addOrderBy('chat.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return {
      chats,
      total,
      page,
      limit,
    };
  }

  /**
   * Get a single chat with details
   */
  async findOne(userId: string, organizationId: string, chatId: string): Promise<Chat> {
    await this.verifyMembership(userId, organizationId);

    const chat = await this.chatRepository.findOne({
      where: { id: chatId, organization_id: organizationId },
      relations: ['members', 'members.user', 'creator'],
    });

    if (!chat) {
      throw new NotFoundException('Chat not found');
    }

    // Check if user is a member
    const isMember = chat.members.some(
      (member) => member.user_id === userId && member.status === ChatMemberStatus.ACTIVE,
    );

    if (!isMember) {
      throw new ForbiddenException('You are not a member of this chat');
    }

    return chat;
  }

  /**
   * Update chat details
   */
  async updateChat(
    userId: string,
    organizationId: string,
    chatId: string,
    dto: UpdateChatDto,
  ): Promise<Chat> {
    const chat = await this.findOne(userId, organizationId, chatId);

    // Only group chats can be updated
    if (chat.type !== ChatType.GROUP) {
      throw new BadRequestException('Only group chats can be updated');
    }

    // Check if user has permission (owner or admin)
    const member = chat.members.find((m) => m.user_id === userId && m.status === ChatMemberStatus.ACTIVE);
    if (!member || (member.role !== ChatMemberRole.OWNER && member.role !== ChatMemberRole.ADMIN)) {
      throw new ForbiddenException('You do not have permission to update this chat');
    }

    if (dto.name !== undefined) chat.name = dto.name;
    if (dto.description !== undefined) chat.description = dto.description;
    if (dto.avatar_url !== undefined) chat.avatar_url = dto.avatar_url;

    await this.chatRepository.save(chat);

    await this.auditLogsService.createAuditLog(
      organizationId,
      userId,
      'chat.updated',
      'chat',
      chatId,
      null,
      dto,
    );

    return this.findOne(userId, organizationId, chatId);
  }

  /**
   * Delete/Archive a chat
   */
  async deleteChat(userId: string, organizationId: string, chatId: string): Promise<void> {
    const chat = await this.findOne(userId, organizationId, chatId);

    // For group chats, check permission
    if (chat.type === ChatType.GROUP) {
      const member = chat.members.find((m) => m.user_id === userId && m.status === ChatMemberStatus.ACTIVE);
      if (!member || member.role !== ChatMemberRole.OWNER) {
        throw new ForbiddenException('Only the owner can delete group chats');
      }
    }

    chat.status = ChatStatus.DELETED;
    await this.chatRepository.save(chat);

    await this.auditLogsService.createAuditLog(
      organizationId,
      userId,
      'chat.deleted',
      'chat',
      chatId,
      null,
      null,
    );
  }

  /**
   * Add members to a group chat
   */
  async addMembers(
    userId: string,
    organizationId: string,
    chatId: string,
    dto: AddMemberDto,
  ): Promise<Chat> {
    const chat = await this.findOne(userId, organizationId, chatId);

    if (chat.type !== ChatType.GROUP) {
      throw new BadRequestException('Can only add members to group chats');
    }

    // Check permission
    const member = chat.members.find((m) => m.user_id === userId && m.status === ChatMemberStatus.ACTIVE);
    if (!member || (member.role !== ChatMemberRole.OWNER && member.role !== ChatMemberRole.ADMIN)) {
      throw new ForbiddenException('You do not have permission to add members');
    }

    // Verify all users are in the organization
    const orgMembers = await this.memberRepository.find({
      where: {
        user_id: In(dto.user_ids),
        organization_id: organizationId,
        status: OrganizationMemberStatus.ACTIVE,
      },
    });

    if (orgMembers.length !== dto.user_ids.length) {
      throw new BadRequestException('Some users are not part of this organization');
    }

    // Add members (skip if already members)
    const existingMemberIds = chat.members
      .filter((m) => m.status === ChatMemberStatus.ACTIVE)
      .map((m) => m.user_id);

    const newMemberIds = dto.user_ids.filter((id) => !existingMemberIds.includes(id));

    if (newMemberIds.length > 0) {
      const newMembers = newMemberIds.map((memberId) =>
        this.chatMemberRepository.create({
          chat_id: chatId,
          organizationId: organizationId,
          user_id: memberId,
          role: ChatMemberRole.MEMBER,
          status: ChatMemberStatus.ACTIVE,
        }),
      );

      await this.chatMemberRepository.save(newMembers);

      // Get adder info
      const adder = await this.userRepository.findOne({ where: { id: userId } });
      const adderName = adder ? `${adder.first_name} ${adder.last_name}`.trim() : 'Someone';

      // Create notifications for newly added members
      for (const memberId of newMemberIds) {
        await this.notificationHelper.createNotification(
          memberId,
          organizationId,
          NotificationType.CHAT_GROUP_ADDED,
          `Added to ${chat.name}`,
          `${adderName} added you to the group "${chat.name}"`,
          {
            route: '/chat',
            params: { chatId },
          },
          {
            chat_id: chatId,
            chat_name: chat.name,
            added_by_id: userId,
            added_by_name: adderName,
          },
        );
      }
    }

    await this.auditLogsService.createAuditLog(
      organizationId,
      userId,
      'chat.members.added',
      'chat',
      chatId,
      null,
      { user_ids: dto.user_ids },
    );

    return this.findOne(userId, organizationId, chatId);
  }

  /**
   * Remove a member from a group chat
   */
  async removeMember(
    userId: string,
    organizationId: string,
    chatId: string,
    memberId: string,
  ): Promise<void> {
    const chat = await this.findOne(userId, organizationId, chatId);

    if (chat.type !== ChatType.GROUP) {
      throw new BadRequestException('Can only remove members from group chats');
    }

    // Check permission
    const requesterMember = chat.members.find((m) => m.user_id === userId && m.status === ChatMemberStatus.ACTIVE);
    if (!requesterMember || (requesterMember.role !== ChatMemberRole.OWNER && requesterMember.role !== ChatMemberRole.ADMIN)) {
      throw new ForbiddenException('You do not have permission to remove members');
    }

    // Cannot remove owner
    const targetMember = chat.members.find((m) => m.user_id === memberId);
    if (targetMember?.role === ChatMemberRole.OWNER) {
      throw new BadRequestException('Cannot remove the chat owner');
    }

    if (targetMember) {
      targetMember.status = ChatMemberStatus.REMOVED;
      await this.chatMemberRepository.save(targetMember);
    }

    await this.auditLogsService.createAuditLog(
      organizationId,
      userId,
      'chat.member.removed',
      'chat',
      chatId,
      null,
      { removed_user_id: memberId },
    );
  }

  /**
   * Leave a chat
   */
  async leaveChat(userId: string, organizationId: string, chatId: string): Promise<void> {
    const chat = await this.findOne(userId, organizationId, chatId);

    if (chat.type === ChatType.GROUP) {
      const member = chat.members.find((m) => m.user_id === userId && m.status === ChatMemberStatus.ACTIVE);
      if (member?.role === ChatMemberRole.OWNER) {
        throw new BadRequestException('Owner cannot leave the chat. Transfer ownership or delete the chat instead.');
      }
    }

    const member = await this.chatMemberRepository.findOne({
      where: { chat_id: chatId, user_id: userId },
    });

    if (member) {
      member.status = ChatMemberStatus.LEFT;
      await this.chatMemberRepository.save(member);
    }

    await this.auditLogsService.createAuditLog(
      organizationId,
      userId,
      'chat.left',
      'chat',
      chatId,
      null,
      null,
    );
  }

  /**
   * Send a message
   */
  async sendMessage(
    userId: string,
    organizationId: string,
    chatId: string,
    dto: SendMessageDto,
  ): Promise<Message> {
    const chat = await this.findOne(userId, organizationId, chatId);

    // Create message
    const message = this.messageRepository.create({
      chat_id: chatId,
      organizationId: organizationId,
      sender_id: userId,
      type: dto.type,
      content: dto.content || null,
      reply_to_id: dto.reply_to_id || null,
      status: MessageStatus.SENT,
    });

    const savedMessage = await this.messageRepository.save(message);

    // Save attachments if any
    if (dto.attachments && dto.attachments.length > 0) {
      const attachments = dto.attachments.map((att) => {
        // Convert file_size string to number (TypeORM handles bigint as number)
        const fileSize = typeof att.file_size === 'string'
          ? parseInt(att.file_size, 10)
          : (typeof att.file_size === 'number' ? att.file_size : 0);

        return this.attachmentRepository.create({
          message_id: savedMessage.id,
          organizationId: organizationId,
          file_name: att.file_name,
          file_url: att.file_url,
          file_type: att.file_type,
          file_size: fileSize,
          thumbnail_url: att.thumbnail_url || null,
        });
      });

      await this.attachmentRepository.save(attachments);
    }

    // Update chat last message
    chat.last_message_at = new Date();
    chat.last_message_id = savedMessage.id;
    await this.chatRepository.save(chat);

    // Get sender info for notifications
    const sender = await this.userRepository.findOne({ where: { id: userId } });
    const senderName = sender ? `${sender.first_name} ${sender.last_name}`.trim() : 'Someone';

    // Get chat members (excluding sender)
    const chatMembers = chat.members.filter(
      (m) => m.user_id !== userId && m.status === ChatMemberStatus.ACTIVE,
    );

    // Check for mentions in message content
    // Support formats: @username, @firstname, @firstname.lastname, @email, @userId
    const mentionRegex = /@([\w.-]+@?[\w.-]*)/g;
    const mentionedStrings: string[] = [];
    const mentionedUserIds: string[] = [];

    if (dto.content) {
      const matches = dto.content.match(mentionRegex);
      if (matches) {
        mentionedStrings.push(...matches.map((m) => m.substring(1).trim()));
      }
    }

    // Get all chat members to match mentions
    const allChatMembers = await this.memberRepository.find({
      where: {
        user_id: In(chat.members.map(m => m.user_id)),
        organization_id: organizationId,
        status: OrganizationMemberStatus.ACTIVE,
      },
      relations: ['user'],
    });

    // Match mentions to actual users
    for (const mentionStr of mentionedStrings) {
      const lowerMention = mentionStr.toLowerCase();

      // Try to match by user ID (if mention is a UUID)
      if (lowerMention.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
        const matchedMember = allChatMembers.find(m => m.user_id.toLowerCase() === lowerMention);
        if (matchedMember && !mentionedUserIds.includes(matchedMember.user_id)) {
          mentionedUserIds.push(matchedMember.user_id);
        }
        continue;
      }

      // Try to match by email
      if (lowerMention.includes('@')) {
        const matchedMember = allChatMembers.find(m =>
          m.user?.email?.toLowerCase() === lowerMention
        );
        if (matchedMember && !mentionedUserIds.includes(matchedMember.user_id)) {
          mentionedUserIds.push(matchedMember.user_id);
        }
        continue;
      }

      // Try to match by first name, last name, or full name
      for (const member of allChatMembers) {
        if (!member.user) continue;

        const firstName = member.user.first_name?.toLowerCase() || '';
        const lastName = member.user.last_name?.toLowerCase() || '';
        const fullName = `${firstName} ${lastName}`.trim();
        const reverseFullName = `${lastName} ${firstName}`.trim();

        if (
          firstName === lowerMention ||
          lastName === lowerMention ||
          fullName === lowerMention ||
          reverseFullName === lowerMention ||
          fullName.includes(lowerMention) ||
          firstName.startsWith(lowerMention) ||
          lastName.startsWith(lowerMention)
        ) {
          if (!mentionedUserIds.includes(member.user_id)) {
            mentionedUserIds.push(member.user_id);
          }
          break;
        }
      }
    }

    // Increment unread count for all members except sender
    await this.chatMemberRepository
      .createQueryBuilder()
      .update(ChatMember)
      .set({ unread_count: () => 'unread_count + 1' })
      .where('chat_id = :chatId', { chatId })
      .andWhere('user_id != :userId', { userId })
      .andWhere('status = :status', { status: ChatMemberStatus.ACTIVE })
      .execute();

    // Store mentions for notification purposes (we'll track in notifications)

    // Create notifications for chat members
    for (const member of chatMembers) {
      // Check if user is mentioned
      const isMentioned = mentionedUserIds.includes(member.user_id);

      // Get member user details
      const memberUser = await this.userRepository.findOne({ where: { id: member.user_id } });
      if (!memberUser) continue;

      // Always create notifications - even if user is online
      // Online users might not have the chat open, so they need notifications
      // The unread count badge will update in real-time via WebSocket
      // Notifications ensure users see messages in the notification dropdown

      if (isMentioned) {
        // Create mention notification
        await this.notificationHelper.createNotification(
          member.user_id,
          organizationId,
          NotificationType.CHAT_MENTION,
          chat.type === ChatType.GROUP ? `${senderName} mentioned you in ${chat.name}` : `${senderName} mentioned you`,
          chat.type === ChatType.GROUP
            ? `${senderName} mentioned you in ${chat.name}: ${dto.content?.substring(0, 100)}`
            : `${senderName} mentioned you: ${dto.content?.substring(0, 100)}`,
          {
            route: '/chat',
            params: { chatId },
          },
          {
            chat_id: chatId,
            chat_name: chat.name,
            sender_id: userId,
            sender_name: senderName,
            message_id: savedMessage.id,
          },
        );
      } else {
        // Create or update grouped unread message notification
        // Groups messages by sender in the same chat (e.g., "Saugat sent 5 messages")
        try {
          const notification = await this.notificationHelper.createOrUpdateGroupedChatNotification(
            member.user_id,
            organizationId,
            NotificationType.CHAT_UNREAD,
            chatId,
            userId,
            senderName,
            chat.name,
            chat.type === ChatType.GROUP ? 'group' : 'direct',
            dto.content || null,
            savedMessage.id,
          );
          if (!notification) {
            console.log(`[ChatService] Notification not created for user ${member.user_id} - in-app notifications may be disabled`);
          } else {
            console.log(`[ChatService] Notification ${notification.id ? 'created/updated' : 'failed'} for user ${member.user_id}`);
          }
        } catch (error) {
          // Log error but don't fail the message send
          console.error('Error creating/updating grouped chat notification:', error);
        }
      }
    }

    const messageWithRelations = await this.messageRepository.findOne({
      where: { id: savedMessage.id },
      relations: ['sender', 'attachments', 'reply_to'],
    });

    // Broadcast message via WebSocket if gateway is available
    if (this.chatGateway && messageWithRelations) {
      try {
        this.chatGateway.broadcastMessage(chatId, messageWithRelations);
      } catch (error) {
        // Log error but don't fail the request
        console.error('Error broadcasting message via WebSocket:', error);
      }
    }

    return messageWithRelations;
  }

  /**
   * Get messages for a chat
   */
  async getMessages(
    userId: string,
    organizationId: string,
    chatId: string,
    query: MessageQueryDto,
  ): Promise<{
    messages: Message[];
    total: number;
    page: number;
    limit: number;
  }> {
    const chat = await this.findOne(userId, organizationId, chatId);

    // Ensure pagination defaults are applied
    const page = query.page || 1;
    const limit = query.limit || 50;

    const queryBuilder = this.messageRepository
      .createQueryBuilder('message')
      .where('message.chat_id = :chatId', { chatId })
      .andWhere('message.deleted_at IS NULL');

    if (query.before_message_id) {
      queryBuilder.andWhere('message.created_at < (SELECT created_at FROM messages WHERE id = :beforeId)', {
        beforeId: query.before_message_id,
      });
    }

    const total = await queryBuilder.getCount();

    const messages = await queryBuilder
      .orderBy('message.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .leftJoinAndSelect('message.sender', 'sender')
      .leftJoinAndSelect('message.attachments', 'attachments')
      .leftJoinAndSelect('message.reply_to', 'reply_to')
      .leftJoinAndSelect('reply_to.sender', 'reply_to_sender')
      .getMany();

    // Get read statuses for messages from the sender's perspective
    // For each message, get read status for the recipient(s)
    const messageIds = messages.map(m => m.id);

    // Get all read statuses for these messages
    const allReadStatuses = messageIds.length > 0
      ? await this.messageReadStatusRepository.find({
        where: {
          message_id: In(messageIds),
        },
      })
      : [];

    // For direct chats, get read status for the other person
    // For group chats, we could show read status for all recipients, but for now show for the first recipient
    const messagesWithReadStatus = messages.map(message => {
      // If this is the current user's message, get read status for the recipient(s)
      if (message.sender_id === userId) {
        // For direct chats, find the other member
        if (chat.type === ChatType.DIRECT) {
          const otherMember = chat.members.find(m => m.user_id !== userId);
          if (otherMember) {
            const readStatus = allReadStatuses.find(
              rs => rs.message_id === message.id && rs.user_id === otherMember.user_id
            );
            return {
              ...message,
              read_status: readStatus ? {
                delivered_at: readStatus.delivered_at?.toISOString() || null,
                read_at: readStatus.read_at?.toISOString() || null,
              } : null,
            };
          }
        } else {
          // For group chats, get read status for any recipient (we'll show if at least one person read it)
          const readStatus = allReadStatuses.find(rs => rs.message_id === message.id);
          return {
            ...message,
            read_status: readStatus ? {
              delivered_at: readStatus.delivered_at?.toISOString() || null,
              read_at: readStatus.read_at?.toISOString() || null,
            } : null,
          };
        }
      }

      // For messages from others, we don't show read status (they show it on their side)
      return {
        ...message,
        read_status: null,
      };
    });

    // Mark as read
    const member = await this.chatMemberRepository.findOne({
      where: { chat_id: chatId, user_id: userId },
    });

    if (member) {
      member.last_read_at = new Date();
      member.unread_count = 0;
      await this.chatMemberRepository.save(member);

      // Mark all messages in this chat as read for this user
      await this.markMessagesAsRead(userId, chatId, messages.map(m => m.id));
    }

    return {
      messages: messagesWithReadStatus.reverse(), // Return in chronological order
      total,
      page,
      limit,
    };
  }

  /**
   * Mark messages as delivered (when received via WebSocket)
   */
  async markMessagesAsDelivered(userId: string, messageIds: string[]): Promise<void> {
    if (!messageIds || messageIds.length === 0) return;

    // Get messages to find their senders
    const messages = await this.messageRepository.find({
      where: { id: In(messageIds) },
      relations: ['sender'],
    });

    for (const message of messages) {
      // Don't mark as delivered if user sent the message themselves
      if (message.sender_id === userId) continue;

      // Use upsert to avoid duplicate key constraint violations
      try {
        // Try to find existing status
        let status = await this.messageReadStatusRepository.findOne({
          where: { message_id: message.id, user_id: userId },
        });

        if (!status) {
          // Create new status
          status = this.messageReadStatusRepository.create({
            message_id: message.id,
            user_id: userId,
            delivered_at: new Date(),
          });
        } else if (!status.delivered_at) {
          // Update existing status
          status.delivered_at = new Date();
        } else {
          // Already delivered, skip
          continue;
        }

        await this.messageReadStatusRepository.save(status);
      } catch (error: any) {
        // Handle duplicate key constraint - try to update instead
        if (error?.code === '23505' || error?.message?.includes('unique constraint')) {
          const status = await this.messageReadStatusRepository.findOne({
            where: { message_id: message.id, user_id: userId },
          });
          if (status && !status.delivered_at) {
            status.delivered_at = new Date();
            await this.messageReadStatusRepository.save(status);
          }
        } else {
          throw error;
        }
      }
    }
  }

  /**
   * Mark messages as read
   */
  async markMessagesAsRead(userId: string, chatId: string, messageIds: string[]): Promise<void> {
    if (!messageIds || messageIds.length === 0) return;

    // Get messages to find their senders
    const messages = await this.messageRepository.find({
      where: { id: In(messageIds) },
      relations: ['sender'],
    });

    const readAt = new Date();

    for (const message of messages) {
      // Don't mark as read if user sent the message themselves
      if (message.sender_id === userId) continue;

      // Use upsert to avoid duplicate key constraint violations
      try {
        // Try to find existing status
        let status = await this.messageReadStatusRepository.findOne({
          where: { message_id: message.id, user_id: userId },
        });

        if (!status) {
          // Create new status
          status = this.messageReadStatusRepository.create({
            message_id: message.id,
            user_id: userId,
            delivered_at: readAt,
            read_at: readAt,
          });
        } else {
          // Update existing status
          if (!status.delivered_at) {
            status.delivered_at = readAt;
          }
          if (!status.read_at) {
            status.read_at = readAt;
          }
        }

        await this.messageReadStatusRepository.save(status);
      } catch (error: any) {
        // Handle duplicate key constraint - try to update instead
        if (error?.code === '23505' || error?.message?.includes('unique constraint')) {
          const status = await this.messageReadStatusRepository.findOne({
            where: { message_id: message.id, user_id: userId },
          });
          if (status) {
            if (!status.delivered_at) {
              status.delivered_at = readAt;
            }
            if (!status.read_at) {
              status.read_at = readAt;
            }
            await this.messageReadStatusRepository.save(status);
          }
        } else {
          throw error;
        }
      }
    }

    // Emit read status update to sender(s) via WebSocket
    if (this.chatGateway) {
      const uniqueSenders = [...new Set(messages.map(m => m.sender_id))];
      for (const senderId of uniqueSenders) {
        this.chatGateway.server.to(`user:${senderId}`).emit('message:read', {
          chat_id: chatId,
          message_ids: messageIds,
          read_by: userId,
          read_at: readAt,
        });
      }
    }
  }

  /**
   * Get message read status for a user
   */
  async getMessageReadStatus(messageId: string, userId: string): Promise<MessageReadStatus | null> {
    return await this.messageReadStatusRepository.findOne({
      where: { message_id: messageId, user_id: userId },
      relations: ['user'],
    });
  }

  /**
   * Get all read statuses for messages in a chat (for group chats)
   */
  async getChatMessageReadStatuses(chatId: string, messageIds: string[]): Promise<MessageReadStatus[]> {
    if (!messageIds || messageIds.length === 0) return [];

    return await this.messageReadStatusRepository.find({
      where: {
        message_id: In(messageIds),
      },
      relations: ['user'],
    });
  }

  /**
   * Delete a message
   */
  async deleteMessage(userId: string, organizationId: string, messageId: string): Promise<void> {
    const message = await this.messageRepository.findOne({
      where: { id: messageId },
      relations: ['chat'],
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    if (message.chat.organization_id !== organizationId) {
      throw new ForbiddenException('Message does not belong to this organization');
    }

    // Only sender or chat admin/owner can delete
    const chat = await this.findOne(userId, organizationId, message.chat_id);
    const member = chat.members.find((m) => m.user_id === userId && m.status === ChatMemberStatus.ACTIVE);

    if (message.sender_id !== userId && member?.role !== ChatMemberRole.OWNER && member?.role !== ChatMemberRole.ADMIN) {
      throw new ForbiddenException('You do not have permission to delete this message');
    }

    message.deleted_at = new Date();
    await this.messageRepository.save(message);

    await this.auditLogsService.createAuditLog(
      organizationId,
      userId,
      'message.deleted',
      'message',
      messageId,
      null,
      null,
    );
  }

  /**
   * Archive or unarchive a chat
   */
  async archiveChat(
    userId: string,
    organizationId: string,
    chatId: string,
    archive: boolean,
  ): Promise<Chat> {
    const chat = await this.findOne(userId, organizationId, chatId);

    chat.status = archive ? ChatStatus.ARCHIVED : ChatStatus.ACTIVE;
    await this.chatRepository.save(chat);

    await this.auditLogsService.createAuditLog(
      organizationId,
      userId,
      archive ? 'chat.archived' : 'chat.unarchived',
      'chat',
      chatId,
      null,
      null,
    );

    return this.findOne(userId, organizationId, chatId);
  }

  /**
   * Export chat history
   */
  async exportChat(
    userId: string,
    organizationId: string,
    chatId: string,
  ): Promise<string> {
    const chat = await this.findOne(userId, organizationId, chatId);

    // Get all messages
    const messages = await this.messageRepository.find({
      where: {
        chat_id: chatId,
      },
      relations: ['sender', 'attachments'],
      order: {
        created_at: 'ASC',
      },
    });

    // Create CSV content
    const headers = ['Date', 'Time', 'Sender', 'Message', 'Type', 'Attachments'];
    const rows = messages.map(message => {
      const date = new Date(message.created_at);
      const senderName = message.sender
        ? `${message.sender.first_name} ${message.sender.last_name}`.trim()
        : 'Unknown';
      const attachments = message.attachments
        ? message.attachments.map(a => a.file_name).join('; ')
        : '';

      return [
        date.toLocaleDateString(),
        date.toLocaleTimeString(),
        senderName,
        message.content || '',
        message.type,
        attachments,
      ];
    });

    const csvContent = [
      `Chat: ${chat.name || 'Direct Chat'}`,
      `Exported: ${new Date().toISOString()}`,
      '',
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    await this.auditLogsService.createAuditLog(
      organizationId,
      userId,
      'chat.exported',
      'chat',
      chatId,
      null,
      { message_count: messages.length },
    );

    return csvContent;
  }

  /**
   * Flag a chat thread to create a ticket
   */
  async flagThread(
    userId: string,
    organizationId: string,
    chatId: string,
    dto: any, // CreateTicketFromChatDto
  ) {
    const chat = await this.findOne(userId, organizationId, chatId);

    // Verify message exists and belongs to this chat
    const message = await this.messageRepository.findOne({
      where: { id: dto.message_id, chat_id: chatId },
      relations: ['sender'],
    });

    if (!message) {
      throw new NotFoundException('Message not found in this chat');
    }

    const priority = dto.priority
      ? (dto.priority as TicketPriority)
      : TicketPriority.MEDIUM;

    // Build description with additional context
    let description = dto.description || dto.message_excerpt || `Ticket created from chat message:\n\n${message.content || ''}`;

    // Add additional context based on chat type
    if (chat.type === ChatType.GROUP) {
      description += `\n\n--- Chat Details ---\n`;
      description += `Chat Type: Group Chat\n`;
      description += `Chat Name: ${chat.name || 'Unnamed Group'}\n`;
      if (dto.participant_ids && dto.participant_ids.length > 0) {
        description += `Participants: ${dto.participant_ids.length} member(s)\n`;
      }
    } else if (chat.type === ChatType.DIRECT) {
      description += `\n\n--- Chat Details ---\n`;
      description += `Chat Type: Direct Chat\n`;
    }

    if (dto.sender_name) {
      description += `Message Sender: ${dto.sender_name}\n`;
    }

    if (dto.related_issue) {
      description += `\n--- Related Issue ---\n${dto.related_issue}\n`;
    }

    if (dto.urgency_reason && priority === TicketPriority.HIGH) {
      description += `\n--- Urgency Reason ---\n${dto.urgency_reason}\n`;
    }

    const ticket = this.ticketRepository.create({
      organization_id: organizationId,
      created_by: userId,
      assignee_id: dto.assignee_id || null,
      title: dto.title || `Ticket from ${chat.type === ChatType.GROUP ? 'group chat' : 'chat'}: ${chat.name || 'Chat'}`,
      description,
      priority,
      status: TicketStatus.OPEN,
      source: TicketSource.CHAT_FLAG,
      chat_id: chatId,
      message_id: dto.message_id,
      tags: dto.tags || [],
      attachment_urls: dto.attachment_urls || null,
    });

    const savedTicket = await this.ticketRepository.save(ticket);

    // Audit log
    await this.auditLogsService.createAuditLog(
      organizationId,
      userId,
      'ticket.created_from_chat',
      'ticket',
      savedTicket.id,
      null,
      {
        chat_id: chatId,
        message_id: dto.message_id,
        source: TicketSource.CHAT_FLAG,
        chat_type: chat.type,
        chat_name: chat.name,
      },
    );

    return savedTicket;
  }
}

