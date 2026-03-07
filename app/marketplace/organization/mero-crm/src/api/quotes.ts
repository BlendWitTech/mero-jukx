import apiClient from '@frontend/services/api';

export interface QuoteItem {
    id?: string;
    itemName: string;
    description?: string;
    quantity: number;
    price: number;
    total: number;
}

export interface Quote {
    id: string;
    number: number;
    year: number;
    content?: string;
    date: string;
    expiredDate: string;
    clientId: string;
    organizationId: string;
    createdById: string;
    subTotal: number;
    taxRate: number;
    taxTotal: number;
    total: number;
    currency: string;
    discount: number;
    status: 'draft' | 'pending' | 'sent' | 'accepted' | 'declined' | 'cancelled' | 'on hold';
    approved: boolean;
    notes?: string;
    pdf?: string;
    createdAt: string;
    updatedAt: string;
    removed: boolean;
    client?: {
        id: string;
        name: string;
        email: string;
    };
    createdBy?: {
        id: string;
        firstName: string;
        lastName: string;
    };
    items: QuoteItem[];
}

export interface CreateQuoteDto {
    date: string;
    expiredDate: string;
    clientId: string;
    items: Omit<QuoteItem, 'id' | 'total'>[];
    taxRate?: number;
    discount?: number;
    currency?: string;
    notes?: string;
}

export interface UpdateQuoteDto extends Partial<CreateQuoteDto> {
    status?: string;
}

export interface QuotesResponse {
    data: Quote[];
    total: number;
    page: number;
    limit: number;
}

export const quotesApi = {
    getQuotes: async (page = 1, limit = 10): Promise<QuotesResponse> => {
        const params = new URLSearchParams({
            page: page.toString(),
            limit: limit.toString(),
        });
        const response = await apiClient.get(`/crm/quotes?${params.toString()}`);
        return response.data;
    },

    getQuote: async (id: string): Promise<Quote> => {
        const response = await apiClient.get(`/crm/quotes/${id}`);
        return response.data;
    },

    createQuote: async (data: CreateQuoteDto): Promise<Quote> => {
        const response = await apiClient.post('/crm/quotes', data);
        return response.data;
    },

    updateQuote: async (id: string, data: UpdateQuoteDto): Promise<Quote> => {
        const response = await apiClient.put(`/crm/quotes/${id}`, data);
        return response.data;
    },

    deleteQuote: async (id: string): Promise<void> => {
        await apiClient.delete(`/crm/quotes/${id}`);
    },

    convertToInvoice: async (id: string): Promise<{ invoiceId: string }> => {
        const response = await apiClient.post(`/crm/quotes/${id}/convert-to-invoice`);
        return response.data;
    },

    sendEmail: async (id: string, data: { to?: string; subject?: string; message?: string }): Promise<void> => {
        await apiClient.post(`/crm/quotes/${id}/send-email`, data);
    },
};
