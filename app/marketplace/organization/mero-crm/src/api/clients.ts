import apiClient from '@frontend/services/api';

export interface ClientContact {
    id?: string;
    first_name: string;
    last_name?: string;
    email?: string;
    phone?: string;
    job_title?: string;
    is_primary?: boolean;
    clientId?: string;
}

export interface Client {
    id: string;
    name: string;
    email: string;
    phone?: string;
    company?: string;
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    zipCode?: string;
    notes?: string;
    leadId?: string;
    assignedToId?: string;
    category?: 'LEAD' | 'CUSTOMER' | 'VENDOR' | 'PARTNER';
    tags?: string[];
    custom_fields?: Record<string, any>;
    contacts?: ClientContact[];
    organizationId: string;
    createdById: string;
    createdAt: string;
    updatedAt: string;
    removed: boolean;
    assignedTo?: {
        id: string;
        email: string;
        firstName: string;
        lastName: string;
    };
    createdBy?: {
        id: string;
        email: string;
        firstName: string;
        lastName: string;
    };
}

export interface CreateClientDto {
    name: string;
    email: string;
    phone?: string;
    company?: string;
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    zipCode?: string;
    notes?: string;
    assignedToId?: string;
    category?: 'LEAD' | 'CUSTOMER' | 'VENDOR' | 'PARTNER';
    tags?: string[];
    customFields?: Record<string, any>;
    contacts?: ClientContact[];
}

export interface UpdateClientDto extends Partial<CreateClientDto> { }

export interface ClientsResponse {
    data: Client[];
    total: number;
    page: number;
    limit: number;
}

export const clientsApi = {
    getClients: async (page = 1, limit = 10, search?: string): Promise<ClientsResponse> => {
        const params = new URLSearchParams({
            page: page.toString(),
            limit: limit.toString(),
        });
        if (search) {
            params.append('search', search);
        }
        const response = await apiClient.get(`/crm/clients?${params.toString()}`);
        return response.data;
    },

    getClient: async (id: string): Promise<Client> => {
        const response = await apiClient.get(`/crm/clients/${id}`);
        return response.data;
    },

    createClient: async (data: CreateClientDto): Promise<Client> => {
        const response = await apiClient.post('/crm/clients', data);
        return response.data;
    },

    bulkCreateClient: async (data: CreateClientDto[]): Promise<Client[]> => {
        const response = await apiClient.post('/crm/clients/bulk', data);
        return response.data;
    },

    updateClient: async (id: string, data: UpdateClientDto): Promise<Client> => {
        const response = await apiClient.patch(`/crm/clients/${id}`, data);
        return response.data;
    },

    deleteClient: async (id: string): Promise<void> => {
        await apiClient.delete(`/crm/clients/${id}`);
    },

    restoreClient: async (id: string): Promise<Client> => {
        const response = await apiClient.post(`/crm/clients/${id}/restore`);
        return response.data;
    },
};
