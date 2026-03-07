import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike, Or, DataSource } from 'typeorm';
import { User } from '../database/entities/users.entity';
import { Organization } from '../database/entities/organizations.entity';
import { Role } from '../database/entities/roles.entity';
import { Chat } from '../database/entities/chats.entity';
import { Message } from '../database/entities/messages.entity';
import { CrmLead } from '../database/entities/crm_leads.entity';
import { CrmClient } from '../database/entities/crm_clients.entity';
import { CrmInvoice } from '../database/entities/crm_invoices.entity';
import { Task } from '../database/entities/tasks.entity';
import { CacheService } from '../common/services/cache.service';

export interface SearchResult {
  users: Array<{
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    avatar_url: string | null;
  }>;
  roles: Array<{
    id: number;
    name: string;
    description: string | null;
  }>;
  chats: Array<{
    id: string;
    name: string | null;
    type: string;
  }>;
  messages: Array<{
    id: string;
    content: string;
    chat_id: string;
    chat_name: string | null;
    created_at: Date;
    sender_name: string;
  }>;
  leads: Array<{
    id: string;
    first_name: string;
    last_name: string | null;
    email: string | null;
    company: string | null;
    status: string;
  }>;
  clients: Array<{
    id: string;
    name: string;
    email: string | null;
    company: string | null;
  }>;
  invoices: Array<{
    id: string;
    number: number;
    total: number;
    status: string;
    client_id: string;
  }>;
  tasks: Array<{
    id: string;
    title: string;
    status: string;
    priority: string;
  }>;
  products: Array<{
    id: string;
    name: string;
    sku: string | null;
  }>;
}

@Injectable()
export class SearchService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Role)
    private roleRepository: Repository<Role>,
    @InjectRepository(Chat)
    private chatRepository: Repository<Chat>,
    @InjectRepository(Message)
    private messageRepository: Repository<Message>,
    @InjectRepository(CrmLead)
    private leadRepository: Repository<CrmLead>,
    @InjectRepository(CrmClient)
    private clientRepository: Repository<CrmClient>,
    @InjectRepository(CrmInvoice)
    private crmInvoiceRepository: Repository<CrmInvoice>,
    @InjectRepository(Task)
    private taskRepository: Repository<Task>,
    private dataSource: DataSource,
    private cacheService: CacheService,
  ) {}

  /**
   * Global search across all entities in an organization
   */
  async globalSearch(
    organizationId: string,
    query: string,
    limit: number = 20,
  ): Promise<SearchResult> {
    const cacheKey = `search:org:${organizationId}:${query}:${limit}`;

    return this.cacheService.getOrSet(cacheKey, async () => {
      const searchTerm = `%${query}%`;
      const itemLimit = Math.min(limit, 5);

      const [users, roles, chats, messages, leads, clients, invoices, tasks, products] = await Promise.all([
        this.searchUsers(organizationId, searchTerm, itemLimit),
        this.searchRoles(organizationId, searchTerm, itemLimit),
        this.searchChats(organizationId, searchTerm, itemLimit),
        this.searchMessages(organizationId, searchTerm, itemLimit),
        this.searchLeads(organizationId, searchTerm, itemLimit),
        this.searchClients(organizationId, searchTerm, itemLimit),
        this.searchInvoices(organizationId, searchTerm, itemLimit),
        this.searchTasks(organizationId, searchTerm, itemLimit),
        this.searchProducts(organizationId, searchTerm, itemLimit),
      ]);

      return {
        users,
        roles,
        chats,
        messages,
        leads,
        clients,
        invoices,
        tasks,
        products,
      };
    }, 60); // Cache for 1 minute
  }

  /**
   * Search users in organization
   */
  private async searchUsers(
    organizationId: string,
    searchTerm: string,
    limit: number,
  ) {
    const results = await this.userRepository
      .createQueryBuilder('user')
      .innerJoin('user.organization_memberships', 'member')
      .where('member.organization_id = :orgId', { orgId: organizationId })
      .andWhere('member.status = :status', { status: 'active' })
      .andWhere(
        '(user.email ILIKE :term OR user.first_name ILIKE :term OR user.last_name ILIKE :term)',
        { term: searchTerm },
      )
      .select([
        'user.id',
        'user.email',
        'user.first_name',
        'user.last_name',
        'user.avatar_url',
      ])
      .limit(limit)
      .getMany();

    return results.map(user => ({
      id: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      avatar_url: user.avatar_url,
    }));
  }

  /**
   * Search roles in organization
   */
  private async searchRoles(
    organizationId: string,
    searchTerm: string,
    limit: number,
  ) {
    const results = await this.roleRepository
      .createQueryBuilder('role')
      .where('role.organization_id = :orgId', { orgId: organizationId })
      .andWhere('role.is_active = :isActive', { isActive: true })
      .andWhere('(role.name ILIKE :term OR role.description ILIKE :term)', {
        term: searchTerm,
      })
      .select(['role.id', 'role.name', 'role.description'])
      .limit(limit)
      .getMany();

    return results.map(role => ({
      id: role.id,
      name: role.name,
      description: role.description,
    }));
  }

  /**
   * Search chats in organization
   */
  private async searchChats(
    organizationId: string,
    searchTerm: string,
    limit: number,
  ) {
    const results = await this.chatRepository
      .createQueryBuilder('chat')
      .where('chat.organization_id = :orgId', { orgId: organizationId })
      .andWhere('chat.status = :status', { status: 'active' })
      .andWhere('(chat.name ILIKE :term)', { term: searchTerm })
      .select(['chat.id', 'chat.name', 'chat.type'])
      .limit(limit)
      .getMany();

    return results.map(chat => ({
      id: chat.id,
      name: chat.name,
      type: chat.type,
    }));
  }

  /**
   * Search messages in organization chats
   */
  private async searchMessages(
    organizationId: string,
    searchTerm: string,
    limit: number,
  ) {
    const results = await this.messageRepository
      .createQueryBuilder('message')
      .innerJoin('message.chat', 'chat')
      .leftJoin('message.sender', 'sender')
      .leftJoin('chat.members', 'member')
      .where('chat.organization_id = :orgId', { orgId: organizationId })
      .andWhere('chat.status = :status', { status: 'active' })
      .andWhere('message.content ILIKE :term', { term: searchTerm })
      .andWhere('message.status != :deleted', { deleted: 'deleted' })
      .select([
        'message.id',
        'message.content',
        'message.created_at',
        'chat.id',
        'chat.name',
        'sender.first_name',
        'sender.last_name',
      ])
      .orderBy('message.created_at', 'DESC')
      .limit(limit)
      .getMany();

    return results.map(message => ({
      id: message.id,
      content: message.content,
      chat_id: (message.chat as any).id,
      chat_name: (message.chat as any).name,
      created_at: message.created_at,
      sender_name: `${(message as any).sender?.first_name || ''} ${(message as any).sender?.last_name || ''}`.trim(),
    }));
  }

  /**
   * Search CRM leads in organization
   */
  private async searchLeads(
    organizationId: string,
    searchTerm: string,
    limit: number,
  ) {
    const results = await this.leadRepository
      .createQueryBuilder('lead')
      .where('lead.organizationId = :orgId', { orgId: organizationId })
      .andWhere(
        '(lead.first_name ILIKE :term OR lead.last_name ILIKE :term OR lead.email ILIKE :term OR lead.company ILIKE :term)',
        { term: searchTerm },
      )
      .select(['lead.id', 'lead.first_name', 'lead.last_name', 'lead.email', 'lead.company', 'lead.status'])
      .limit(limit)
      .getMany();

    return results.map(lead => ({
      id: lead.id,
      first_name: lead.first_name,
      last_name: lead.last_name,
      email: lead.email,
      company: lead.company,
      status: lead.status,
    }));
  }

  /**
   * Search CRM clients in organization
   */
  private async searchClients(
    organizationId: string,
    searchTerm: string,
    limit: number,
  ) {
    const results = await this.clientRepository
      .createQueryBuilder('client')
      .where('client.organizationId = :orgId', { orgId: organizationId })
      .andWhere('client.removed = false')
      .andWhere(
        '(client.name ILIKE :term OR client.email ILIKE :term OR client.company ILIKE :term)',
        { term: searchTerm },
      )
      .select(['client.id', 'client.name', 'client.email', 'client.company'])
      .limit(limit)
      .getMany();

    return results.map(client => ({
      id: client.id,
      name: client.name,
      email: client.email,
      company: client.company,
    }));
  }

  /**
   * Search CRM invoices in organization
   */
  private async searchInvoices(
    organizationId: string,
    searchTerm: string,
    limit: number,
  ) {
    const results = await this.crmInvoiceRepository
      .createQueryBuilder('invoice')
      .where('invoice.organizationId = :orgId', { orgId: organizationId })
      .andWhere('invoice.removed = false')
      .andWhere(
        '(CAST(invoice.number AS TEXT) ILIKE :term OR invoice.notes ILIKE :term)',
        { term: searchTerm },
      )
      .select(['invoice.id', 'invoice.number', 'invoice.total', 'invoice.status', 'invoice.clientId'])
      .limit(limit)
      .getMany();

    return results.map(invoice => ({
      id: invoice.id,
      number: invoice.number,
      total: Number(invoice.total),
      status: invoice.status,
      client_id: invoice.clientId,
    }));
  }

  /**
   * Search tasks in organization
   */
  private async searchTasks(
    organizationId: string,
    searchTerm: string,
    limit: number,
  ) {
    const results = await this.taskRepository
      .createQueryBuilder('task')
      .where('task.organization_id = :orgId', { orgId: organizationId })
      .andWhere(
        '(task.title ILIKE :term OR task.description ILIKE :term)',
        { term: searchTerm },
      )
      .select(['task.id', 'task.title', 'task.status', 'task.priority'])
      .limit(limit)
      .getMany();

    return results.map(task => ({
      id: task.id,
      title: task.title,
      status: task.status,
      priority: task.priority,
    }));
  }

  /**
   * Search inventory products using raw SQL (entity lives outside api/src/)
   */
  private async searchProducts(
    organizationId: string,
    searchTerm: string,
    limit: number,
  ): Promise<Array<{ id: string; name: string; sku: string | null }>> {
    try {
      const results = await this.dataSource.query(
        `SELECT id, name, sku FROM inventory_products
         WHERE organization_id = $1
           AND (name ILIKE $2 OR sku ILIKE $2)
         LIMIT $3`,
        [organizationId, searchTerm, limit],
      );
      return results.map((r: any) => ({ id: r.id, name: r.name, sku: r.sku }));
    } catch {
      return [];
    }
  }

  /**
   * Search messages within a specific chat
   */
  async searchChatMessages(
    chatId: string,
    query: string,
    limit: number = 50,
  ) {
    const searchTerm = `%${query}%`;

    const results = await this.messageRepository
      .createQueryBuilder('message')
      .leftJoin('message.sender', 'sender')
      .where('message.chat_id = :chatId', { chatId })
      .andWhere('message.content ILIKE :term', { term: searchTerm })
      .andWhere('message.status != :deleted', { deleted: 'deleted' })
      .select([
        'message.id',
        'message.content',
        'message.created_at',
        'message.type',
        'sender.id',
        'sender.first_name',
        'sender.last_name',
        'sender.avatar_url',
      ])
      .orderBy('message.created_at', 'DESC')
      .limit(limit)
      .getMany();

    return results.map(message => ({
      id: message.id,
      content: message.content,
      created_at: message.created_at,
      type: message.type,
      sender: {
        id: (message as any).sender?.id,
        name: `${(message as any).sender?.first_name || ''} ${(message as any).sender?.last_name || ''}`.trim(),
        avatar_url: (message as any).sender?.avatar_url,
      },
    }));
  }
}
