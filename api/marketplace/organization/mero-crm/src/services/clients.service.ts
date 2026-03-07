import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { CrmClient } from '@src/database/entities/crm_clients.entity';
import { CrmContact } from '@src/database/entities/crm_contacts.entity';
import { CreateClientDto, UpdateClientDto } from '../dto/client.dto';
import { CreateContactDto, UpdateContactDto } from '../dto/contact.dto';

@Injectable()
export class ClientsService {
    constructor(
        @InjectRepository(CrmClient)
        private clientsRepository: Repository<CrmClient>,
        @InjectRepository(CrmContact)
        private contactsRepository: Repository<CrmContact>,
    ) { }

    async create(
        userId: string,
        organizationId: string,
        createClientDto: CreateClientDto,
    ): Promise<CrmClient> {
        const { contacts, ...clientData } = createClientDto;

        const client = this.clientsRepository.create({
            ...clientData,
            organizationId,
            createdById: userId,
        });

        const savedClient = await this.clientsRepository.save(client);

        if (contacts && contacts.length > 0) {
            const contactEntities = contacts.map(contact =>
                this.contactsRepository.create({
                    ...contact,
                    clientId: savedClient.id,
                    organizationId
                })
            );
            await this.contactsRepository.save(contactEntities);
        }

        return this.findOne(savedClient.id, organizationId);
    }

    async bulkCreate(
        userId: string,
        organizationId: string,
        createClientDtos: CreateClientDto[],
    ): Promise<CrmClient[]> {
        const createdClients = [];
        for (const dto of createClientDtos) {
            createdClients.push(await this.create(userId, organizationId, dto));
        }
        return createdClients;
    }

    async findAll(
        organizationId: string,
        page: number = 1,
        limit: number = 10,
        search?: string,
    ): Promise<{ data: CrmClient[]; total: number; page: number; limit: number }> {
        const skip = (page - 1) * limit;

        const queryBuilder = this.clientsRepository
            .createQueryBuilder('client')
            .where('client.organizationId = :organizationId', { organizationId })
            .andWhere('client.removed = :removed', { removed: false })
            .leftJoinAndSelect('client.createdBy', 'createdBy')
            .leftJoinAndSelect('client.assignedTo', 'assignedTo')
            .leftJoinAndSelect('client.contacts', 'contacts');

        if (search) {
            queryBuilder.andWhere(
                '(client.name ILIKE :search OR client.email ILIKE :search OR client.phone ILIKE :search)',
                { search: `%${search}%` },
            );
        }

        const [data, total] = await queryBuilder
            .orderBy('client.createdAt', 'DESC')
            .skip(skip)
            .take(limit)
            .getManyAndCount();

        return { data, total, page, limit };
    }

    async findOne(id: string, organizationId: string): Promise<CrmClient> {
        const client = await this.clientsRepository.findOne({
            where: { id, organizationId, removed: false },
            relations: ['createdBy', 'assignedTo', 'invoices', 'contacts'],
        });

        if (!client) {
            throw new NotFoundException(`Client with ID ${id} not found`);
        }

        return client;
    }

    async update(
        id: string,
        organizationId: string,
        updateClientDto: UpdateClientDto,
    ): Promise<CrmClient> {
        const client = await this.findOne(id, organizationId);

        const { contacts, ...clientData } = updateClientDto;

        Object.assign(client, clientData);
        await this.clientsRepository.save(client);

        // Replace contacts if provided
        if (contacts) {
            // Remove old contacts
            await this.contactsRepository.delete({ clientId: id });

            // Add new contacts
            if (contacts.length > 0) {
                const contactEntities = contacts.map(c =>
                    this.contactsRepository.create({
                        ...c,
                        clientId: id,
                        organizationId
                    })
                );
                await this.contactsRepository.save(contactEntities);
            }
        }

        return this.findOne(id, organizationId);
    }

    async remove(id: string, organizationId: string): Promise<void> {
        const client = await this.findOne(id, organizationId);
        client.removed = true;
        await this.clientsRepository.save(client);
    }

    async restore(id: string, organizationId: string): Promise<CrmClient> {
        const client = await this.clientsRepository.findOne({
            where: { id, organizationId },
        });

        if (!client) {
            throw new NotFoundException(`Client with ID ${id} not found`);
        }

        client.removed = false;
        return this.clientsRepository.save(client);
    }

    // Contact Management
    async addContact(organizationId: string, dto: CreateContactDto): Promise<CrmContact> {
        const client = await this.findOne(dto.clientId, organizationId);

        if (dto.is_primary) {
            await this.contactsRepository.update(
                { clientId: client.id, organizationId, is_primary: true },
                { is_primary: false }
            );
        }

        const contact = this.contactsRepository.create({
            ...dto,
            organizationId,
        });

        return this.contactsRepository.save(contact);
    }

    async updateContact(id: string, organizationId: string, dto: UpdateContactDto): Promise<CrmContact> {
        const contact = await this.contactsRepository.findOne({
            where: { id, organizationId }
        });

        if (!contact) throw new NotFoundException('Contact not found');

        if (dto.is_primary) {
            await this.contactsRepository.update(
                { clientId: contact.clientId, organizationId, is_primary: true },
                { is_primary: false }
            );
        }

        Object.assign(contact, dto);
        return this.contactsRepository.save(contact);
    }

    async getContacts(clientId: string, organizationId: string): Promise<CrmContact[]> {
        return this.contactsRepository.find({
            where: { clientId, organizationId },
            order: { is_primary: 'DESC', first_name: 'ASC' }
        });
    }

    async removeContact(id: string, organizationId: string): Promise<void> {
        const result = await this.contactsRepository.delete({ id, organizationId });
        if (result.affected === 0) throw new NotFoundException('Contact not found');
    }
}
