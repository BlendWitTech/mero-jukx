import apiClient from '@frontend/services/api';
import { Lead } from './leads';

export interface Deal {
    id: string;
    organizationId: string;
    title: string;
    value: number;
    currency: string;
    pipelineId?: string;
    stageId?: string;
    stage: string;
    expected_close_date?: string;
    leadId?: string;
    lead?: Lead;
    assignedToId?: string;
    assignedTo?: {
        id: string;
        email: string;
        firstName: string;
        lastName: string;
    };
    probability: number;
    status: 'OPEN' | 'WON' | 'LOST';
    competitors?: string[];
    win_loss_reason?: string;
    teamMembers?: {
        id: string;
        email: string;
        first_name: string;
        last_name: string;
        firstName?: string;
        lastName?: string;
    }[];
    createdAt: string;
    updatedAt: string;
}

export interface Pipeline {
    id: string;
    organizationId: string;
    name: string;
    description?: string;
    isDefault: boolean;
    stages?: Stage[];
}

export interface Stage {
    id: string;
    pipelineId: string;
    name: string;
    color: string;
    position: number;
    probability: number;
}

export interface CreateDealDto {
    title: string;
    value: number;
    currency?: string;
    stage?: string;
    expected_close_date?: string;
    lead_id?: string;
    assigned_to?: string;
    probability?: number;
    status?: string;
    win_loss_reason?: string;
    competitors?: string[];
}

export interface UpdateDealDto extends Partial<CreateDealDto> { }

export const dealsApi = {
    getDeals: async (): Promise<Deal[]> => {
        const response = await apiClient.get('/crm/deals');
        return response.data;
    },

    getDeal: async (id: string): Promise<Deal> => {
        const response = await apiClient.get(`/crm/deals/${id}`);
        return response.data;
    },

    createDeal: async (data: CreateDealDto): Promise<Deal> => {
        const response = await apiClient.post('/crm/deals', data);
        return response.data;
    },

    updateDeal: async (id: string, data: UpdateDealDto): Promise<Deal> => {
        const response = await apiClient.patch(`/crm/deals/${id}`, data);
        return response.data;
    },

    deleteDeal: async (id: string): Promise<void> => {
        await apiClient.delete(`/crm/deals/${id}`);
    },

    addTeamMember: async (dealId: string, userId: string): Promise<Deal> => {
        const response = await apiClient.post(`/crm/deals/${dealId}/team-members`, { userId });
        return response.data;
    },

    removeTeamMember: async (dealId: string, userId: string): Promise<Deal> => {
        const response = await apiClient.delete(`/crm/deals/${dealId}/team-members/${userId}`);
        return response.data;
    },

    // Pipelines
    getPipelines: async (): Promise<Pipeline[]> => {
        const response = await apiClient.get('/crm/deals/pipelines');
        return response.data;
    },

    createPipeline: async (data: any): Promise<Pipeline> => {
        const response = await apiClient.post('/crm/deals/pipelines', data);
        return response.data;
    },

    // Stages
    createStage: async (data: any): Promise<Stage> => {
        const response = await apiClient.post('/crm/deals/stages', data);
        return response.data;
    },

    updateStage: async (id: string, data: any): Promise<Stage> => {
        const response = await apiClient.put(`/crm/deals/stages/${id}`, data);
        return response.data;
    },

    deleteStage: async (id: string): Promise<void> => {
        await apiClient.delete(`/crm/deals/stages/${id}`);
    },
};
