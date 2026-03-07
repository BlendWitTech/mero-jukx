import apiClient from '@frontend/services/api';

export interface InvoiceItem {
    id?: string;
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
}

export interface Invoice {
    id: string;
    invoiceNumber: string;
    clientId: string;
    items: InvoiceItem[];
    subtotal: number;
    taxRate: number;
    taxAmount: number;
    discount: number;
    total: number;
    status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
    issueDate: string;
    dueDate: string;
    notes?: string;
    organizationId: string;
    createdById: string;
    createdAt: string;
    updatedAt: string;
    removed: boolean;
    client?: {
        id: string;
        name: string;
        email: string;
        company?: string;
    };
    createdBy?: {
        id: string;
        email: string;
        firstName: string;
        lastName: string;
    };
}

export interface CreateInvoiceDto {
    clientId: string;
    items: Omit<InvoiceItem, 'id'>[];
    taxRate: number;
    discount: number;
    issueDate: string;
    dueDate: string;
    notes?: string;
    status?: 'draft' | 'sent';
}

export interface UpdateInvoiceDto extends Partial<Omit<CreateInvoiceDto, 'status'>> {
    status?: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
}

export interface InvoicesResponse {
    data: Invoice[];
    total: number;
    page: number;
    limit: number;
}

export const invoicesApi = {
    getInvoices: async (page = 1, limit = 10, search?: string, status?: string): Promise<InvoicesResponse> => {
        const params = new URLSearchParams({
            page: page.toString(),
            limit: limit.toString(),
        });
        if (search) {
            params.append('search', search);
        }
        if (status) {
            params.append('status', status);
        }
        const response = await apiClient.get(`/crm/invoices?${params.toString()}`);
        return response.data;
    },

    getInvoice: async (id: string): Promise<Invoice> => {
        const response = await apiClient.get(`/crm/invoices/${id}`);
        return response.data;
    },

    createInvoice: async (data: CreateInvoiceDto): Promise<Invoice> => {
        const response = await apiClient.post('/crm/invoices', data);
        return response.data;
    },

    updateInvoice: async (id: string, data: UpdateInvoiceDto): Promise<Invoice> => {
        const response = await apiClient.patch(`/crm/invoices/${id}`, data);
        return response.data;
    },

    deleteInvoice: async (id: string): Promise<void> => {
        await apiClient.delete(`/crm/invoices/${id}`);
    },

    restoreInvoice: async (id: string): Promise<Invoice> => {
        const response = await apiClient.post(`/crm/invoices/${id}/restore`);
        return response.data;
    },

    sendEmail: async (id: string, data: { to?: string; subject?: string; message?: string }): Promise<void> => {
        await apiClient.post(`/crm/invoices/${id}/send-email`, data);
    },

    sendWhatsApp: async (id: string): Promise<{ success: boolean; error?: string }> => {
        const response = await apiClient.post(`/crm/invoices/${id}/send-whatsapp`);
        return response.data;
    },
};
