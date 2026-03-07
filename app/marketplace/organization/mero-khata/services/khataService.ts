import api from '@/services/api';

export interface KhataCategory {
    id: string;
    name: string;
    type: 'INCOME' | 'EXPENSE';
    color?: string;
    icon?: string;
    isDefault: boolean;
    createdAt: string;
}

export interface KhataEntry {
    id: string;
    organizationId: string;
    categoryId?: string;
    category?: KhataCategory;
    type: 'INCOME' | 'EXPENSE';
    amount: number;
    paymentMethod?: string;
    date: string;
    notes?: string;
    reference?: string;
    createdAt: string;
}

export interface KhataEntrySummary {
    totalIncome: number;
    totalExpense: number;
    netProfit: number;
    entryCount: number;
}

export interface InvoiceItem {
    description: string;
    quantity: number;
    rate: number;
    amount: number;
}

export interface KhataInvoice {
    id: string;
    invoiceNumber: string;
    customerName: string;
    customerPhone?: string;
    customerAddress?: string;
    items: InvoiceItem[];
    subtotal: number;
    vatRate: number;
    vatAmount: number;
    total: number;
    status: 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE';
    dueDate?: string;
    notes?: string;
    createdAt: string;
    updatedAt: string;
}

export interface KhataBill {
    id: string;
    billNumber: string;
    supplierName: string;
    supplierPhone?: string;
    items: InvoiceItem[];
    subtotal: number;
    vatAmount: number;
    total: number;
    status: 'PENDING' | 'PAID' | 'OVERDUE';
    dueDate?: string;
    notes?: string;
    createdAt: string;
    updatedAt: string;
}

// ─── Categories ───────────────────────────────────────────────────────────────

export const getCategories = async (type?: 'INCOME' | 'EXPENSE'): Promise<KhataCategory[]> => {
    const params = type ? `?type=${type}` : '';
    const res = await api.get(`/khata/categories${params}`);
    return res.data;
};

export const createCategory = async (data: Partial<KhataCategory>): Promise<KhataCategory> => {
    const res = await api.post('/khata/categories', data);
    return res.data;
};

export const deleteCategory = async (id: string): Promise<void> => {
    await api.delete(`/khata/categories/${id}`);
};

export const seedDefaultCategories = async (): Promise<void> => {
    await api.post('/khata/categories/seed-defaults');
};

// ─── Entries ──────────────────────────────────────────────────────────────────

export const getEntries = async (type?: string, startDate?: string, endDate?: string): Promise<KhataEntry[]> => {
    const params = new URLSearchParams();
    if (type) params.append('type', type);
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    const query = params.toString() ? `?${params.toString()}` : '';
    const res = await api.get(`/khata/entries${query}`);
    return res.data;
};

export const getEntrySummary = async (startDate?: string, endDate?: string): Promise<KhataEntrySummary> => {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    const query = params.toString() ? `?${params.toString()}` : '';
    const res = await api.get(`/khata/entries/summary${query}`);
    return res.data;
};

export const createEntry = async (data: Partial<KhataEntry>): Promise<KhataEntry> => {
    const res = await api.post('/khata/entries', data);
    return res.data;
};

export const updateEntry = async (id: string, data: Partial<KhataEntry>): Promise<KhataEntry> => {
    const res = await api.patch(`/khata/entries/${id}`, data);
    return res.data;
};

export const deleteEntry = async (id: string): Promise<void> => {
    await api.delete(`/khata/entries/${id}`);
};

// ─── Invoices ─────────────────────────────────────────────────────────────────

export const getInvoices = async (status?: string): Promise<KhataInvoice[]> => {
    const query = status ? `?status=${status}` : '';
    const res = await api.get(`/khata/invoices${query}`);
    return res.data;
};

export const getInvoice = async (id: string): Promise<KhataInvoice> => {
    const res = await api.get(`/khata/invoices/${id}`);
    return res.data;
};

export const createInvoice = async (data: Partial<KhataInvoice>): Promise<KhataInvoice> => {
    const res = await api.post('/khata/invoices', data);
    return res.data;
};

export const updateInvoice = async (id: string, data: Partial<KhataInvoice>): Promise<KhataInvoice> => {
    const res = await api.patch(`/khata/invoices/${id}`, data);
    return res.data;
};

export const deleteInvoice = async (id: string): Promise<void> => {
    await api.delete(`/khata/invoices/${id}`);
};

// ─── Bills ────────────────────────────────────────────────────────────────────

export const getBills = async (status?: string): Promise<KhataBill[]> => {
    const query = status ? `?status=${status}` : '';
    const res = await api.get(`/khata/bills${query}`);
    return res.data;
};

export const createBill = async (data: Partial<KhataBill>): Promise<KhataBill> => {
    const res = await api.post('/khata/bills', data);
    return res.data;
};

export const updateBill = async (id: string, data: Partial<KhataBill>): Promise<KhataBill> => {
    const res = await api.patch(`/khata/bills/${id}`, data);
    return res.data;
};

export const deleteBill = async (id: string): Promise<void> => {
    await api.delete(`/khata/bills/${id}`);
};

// ─── Reports ──────────────────────────────────────────────────────────────────

export const getVatSummary = async (startDate?: string, endDate?: string): Promise<any> => {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    const query = params.toString() ? `?${params.toString()}` : '';
    const res = await api.get(`/khata/reports/vat${query}`);
    return res.data;
};

export const getPnlReport = async (startDate: string, endDate: string): Promise<any> => {
    const res = await api.get(`/khata/reports/pnl?startDate=${startDate}&endDate=${endDate}`);
    return res.data;
};
