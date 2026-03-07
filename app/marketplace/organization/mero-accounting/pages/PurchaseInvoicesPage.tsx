import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/services/api';
import { useTheme } from '@/contexts/ThemeContext';
import { Plus, Search, FileText, Calendar as CalendarIcon, CheckCircle2, AlertCircle, Trash2, ShoppingBag, DollarSign, BarChart2, X, Pencil, Receipt } from 'lucide-react';
import { formatNPR } from '@/utils/nepaliDateUtils';
import toast from '@shared/hooks/useToast';
import {
    Card,
    Button,
    Input,
    Table,
    TableHeader,
    TableBody,
    TableRow,
    TableHead,
    TableCell,
    Modal
} from '@shared';

interface PurchaseInvoice {
    id: string;
    invoiceNumber: string;
    invoiceDate: string;
    dueDate: string;
    subtotal: number;
    vatAmount: number;
    tdsAmount: number;
    discountAmount: number;
    totalAmount: number;
    paidAmount: number;
    status: 'DRAFT' | 'POSTED' | 'PARTIALLY_PAID' | 'PAID' | 'CANCELLED';
    vendor: { id: string; name: string; };
    vendorId: string;
    items: { description: string; quantity: number; rate: number }[];
}

interface Vendor { id: string; name: string; }
interface Account { id: string; code: string; name: string; }

interface VendorStatement {
    vendor: { id: string; name: string; phone: string; email: string; };
    rows: {
        id: string; invoiceNumber: string; invoiceDate: string; dueDate: string;
        totalAmount: number; paidAmount: number; balanceDue: number;
        status: string; isOverdue: boolean;
    }[];
    totalBilled: number;
    totalPaid: number;
    totalDue: number;
}

export default function PurchaseInvoicesPage() {
    const { theme } = useTheme();
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState('');
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [editingInvoice, setEditingInvoice] = useState<PurchaseInvoice | null>(null);
    const [formStep, setFormStep] = useState(1);
    const [isPostDialogOpen, setIsPostDialogOpen] = useState(false);
    const [postingInvoice, setPostingInvoice] = useState<PurchaseInvoice | null>(null);

    const [isEditPaymentModalOpen, setIsEditPaymentModalOpen] = useState(false);
    const [editingPayment, setEditingPayment] = useState<{ id: string; amount: number; narration?: string } | null>(null);

    // Payment Modal State
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
    const [paymentBankAccountId, setPaymentBankAccountId] = useState('');
    const [paymentApAccountId, setPaymentApAccountId] = useState('');
    const [paymentNarration, setPaymentNarration] = useState('');

    // Statement Drawer State
    const [statementVendorId, setStatementVendorId] = useState<string | null>(null);

    // Form State
    const [vendorId, setVendorId] = useState('');
    const [invoiceNumber, setInvoiceNumber] = useState('');
    const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
    const [dueDate, setDueDate] = useState(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
    const [isVatEnabled, setIsVatEnabled] = useState(true);
    const [isTdsEnabled, setIsTdsEnabled] = useState(false);
    const [tdsPercentage, setTdsPercentage] = useState(0);
    const [tdsAmount, setTdsAmount] = useState(0);
    const [discountAmount, setDiscountAmount] = useState(0);
    const [items, setItems] = useState<{ description: string, quantity: number, rate: number }[]>([
        { description: '', quantity: 1, rate: 0 }
    ]);

    // Posting State
    const [apAccountId, setApAccountId] = useState('');
    const [expenseAccountId, setExpenseAccountId] = useState('');
    const [vatAccountId, setVatAccountId] = useState('');
    const [tdsAccountId, setTdsAccountId] = useState('');

    const { data: invoices, isLoading } = useQuery<PurchaseInvoice[]>({
        queryKey: ['accounting-purchase-invoices'],
        queryFn: async () => {
            const response = await api.get('/accounting/purchase-invoices');
            return response.data;
        }
    });

    const { data: accounts } = useQuery<Account[]>({
        queryKey: ['accounting-accounts'],
        queryFn: async () => {
            const response = await api.get('/accounting/accounts');
            return response.data;
        },
        enabled: isPostDialogOpen || isPaymentModalOpen
    });

    const { data: vendors } = useQuery<Vendor[]>({
        queryKey: ['accounting-vendors'],
        queryFn: async () => {
            const response = await api.get('/accounting/vendors');
            return response.data;
        },
        enabled: isAddDialogOpen
    });

    const { data: vendorStatement, isLoading: isStatementLoading } = useQuery<VendorStatement>({
        queryKey: ['vendor-statement', statementVendorId],
        queryFn: async () => {
            const response = await api.get(`/accounting/purchase-invoices/vendor/${statementVendorId}/statement`);
            return response.data;
        },
        enabled: !!statementVendorId
    });

    const { data: invoicePayments, refetch: refetchPayments } = useQuery<any[]>({
        queryKey: ['invoice-payments', editingInvoice?.id],
        queryFn: async () => {
            const response = await api.get(`/accounting/purchase-invoices/${editingInvoice?.id}/payments`);
            return response.data;
        },
        enabled: !!editingInvoice?.id && isAddDialogOpen && isEditMode
    });

    const resetForm = () => {
        setVendorId('');
        setInvoiceNumber('');
        setInvoiceDate(new Date().toISOString().split('T')[0]);
        setDueDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
        setIsTdsEnabled(false);
        setTdsPercentage(0);
        setTdsAmount(0);
        setDiscountAmount(0);
        setItems([{ description: '', quantity: 1, rate: 0 }]);
    };

    const openEditModal = (invoice: PurchaseInvoice) => {
        setIsEditMode(true);
        setEditingInvoice(invoice);
        setVendorId(invoice.vendorId);
        setInvoiceNumber(invoice.invoiceNumber);
        setInvoiceDate(invoice.invoiceDate?.split('T')[0] ?? invoice.invoiceDate);
        setDueDate(invoice.dueDate?.split('T')[0] ?? invoice.dueDate);
        const hasVat = Number(invoice.vatAmount || 0) > 0;
        const hasTds = Number(invoice.tdsAmount || 0) > 0;
        setIsVatEnabled(hasVat);
        setIsTdsEnabled(hasTds);
        setDiscountAmount(Number(invoice.discountAmount || 0));
        if (hasTds && Number(invoice.subtotal) > 0) {
            setTdsPercentage(Math.round((Number(invoice.tdsAmount) / Number(invoice.subtotal)) * 100));
        }
        setItems(
            Array.isArray(invoice.items) && invoice.items.length > 0
                ? invoice.items
                : [{ description: '', quantity: 1, rate: 0 }]
        );
        setFormStep(1);
        setIsAddDialogOpen(true);
    };

    const createInvoice = useMutation({
        mutationFn: async (data: any) => { await api.post('/accounting/purchase-invoices', data); },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['accounting-purchase-invoices'] });
            setIsAddDialogOpen(false);
            resetForm();
            toast.success('Purchase bill recorded successfully');
        },
        onError: (error: any) => { toast.error(error.response?.data?.message || 'Failed to record bill'); }
    });

    const updateInvoice = useMutation({
        mutationFn: async (data: any) => {
            await api.patch(`/accounting/purchase-invoices/${editingInvoice?.id}`, data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['accounting-purchase-invoices'] });
            setIsAddDialogOpen(false);
            setIsEditMode(false);
            setEditingInvoice(null);
            resetForm();
            toast.success('Purchase bill updated successfully');
        },
        onError: (error: any) => { toast.error(error.response?.data?.message || 'Failed to update bill'); }
    });

    const postBill = useMutation({
        mutationFn: async (data: { id: string, apAccountId: string, expenseAccountId: string, vatAccountId?: string, tdsAccountId?: string }) => {
            await api.post(`/accounting/purchase-invoices/${data.id}/post`, {
                apAccountId: data.apAccountId, expenseAccountId: data.expenseAccountId,
                vatAccountId: data.vatAccountId, tdsAccountId: data.tdsAccountId
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['accounting-purchase-invoices'] });
            setIsPostDialogOpen(false); setPostingInvoice(null);
            setApAccountId(''); setExpenseAccountId(''); setVatAccountId(''); setTdsAccountId('');
            toast.success('Bill posted and journal entries created');
        },
        onError: (error: any) => { toast.error(error.response?.data?.message || 'Failed to post bill'); }
    });

    const unpostBill = useMutation({
        mutationFn: async (id: string) => {
            await api.post(`/accounting/purchase-invoices/${id}/unpost`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['accounting-purchase-invoices'] });
            toast.success('Bill reverted to DRAFT status');
        },
        onError: (error: any) => { toast.error(error.response?.data?.message || 'Failed to unpost bill'); }
    });

    const deletePayment = useMutation({
        mutationFn: async (paymentId: string) => {
            await api.delete(`/accounting/purchase-invoices/payments/${paymentId}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['accounting-purchase-invoices'] });
            queryClient.invalidateQueries({ queryKey: ['vendor-statement'] });
            queryClient.invalidateQueries({ queryKey: ['invoice-payments'] });
            toast.success('Payment record removed');
        },
        onError: (error: any) => { toast.error(error.response?.data?.message || 'Failed to delete payment'); }
    });

    const postPayment = useMutation({
        mutationFn: async (paymentId: string) => {
            await api.post(`/accounting/purchase-invoices/payments/${paymentId}/post`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['accounting-purchase-invoices'] });
            queryClient.invalidateQueries({ queryKey: ['vendor-statement'] });
            toast.success('Payment posted successfully');
        },
        onError: (error: any) => { toast.error(error.response?.data?.message || 'Failed to post payment'); }
    });

    const unpostPayment = useMutation({
        mutationFn: async (paymentId: string) => {
            await api.post(`/accounting/purchase-invoices/payments/${paymentId}/unpost`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['accounting-purchase-invoices'] });
            queryClient.invalidateQueries({ queryKey: ['vendor-statement'] });
            toast.success('Payment reverted to draft');
        },
        onError: (error: any) => { toast.error(error.response?.data?.message || 'Failed to unpost payment'); }
    });

    const updatePayment = useMutation({
        mutationFn: async (data: { id: string; amount: number; narration?: string }) => {
            await api.put(`/accounting/purchase-invoices/payments/${data.id}`, { amount: data.amount, narration: data.narration });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['accounting-purchase-invoices'] });
            queryClient.invalidateQueries({ queryKey: ['vendor-statement'] });
            queryClient.invalidateQueries({ queryKey: ['invoice-payments'] });
            toast.success('Payment updated');
            setIsEditPaymentModalOpen(false);
        },
        onError: (error: any) => { toast.error(error.response?.data?.message || 'Failed to update payment'); }
    });

    const recordPayment = useMutation({
        mutationFn: async (data: { id: string; amount: number; paymentDate: string; bankAccountId: string; apAccountId: string; narration?: string }) => {
            await api.post(`/accounting/purchase-invoices/${data.id}/pay`, {
                amount: data.amount, paymentDate: data.paymentDate,
                bankAccountId: data.bankAccountId, apAccountId: data.apAccountId,
                narration: data.narration
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['accounting-purchase-invoices'] });
            queryClient.invalidateQueries({ queryKey: ['vendor-statement', postingInvoice?.vendorId] });
            setIsPaymentModalOpen(false); setPostingInvoice(null);
            setPaymentAmount(''); setPaymentDate(new Date().toISOString().split('T')[0]);
            setPaymentBankAccountId(''); setPaymentApAccountId(''); setPaymentNarration('');
            toast.success('Payment recorded successfully');
        },
        onError: (error: any) => { toast.error(error.response?.data?.message || 'Failed to record payment'); }
    });

    const subtotal = items.reduce((sum, item) => sum + (Number(item.quantity || 0) * Number(item.rate || 0)), 0);
    const vatAmount = isVatEnabled ? subtotal * 0.13 : 0;
    React.useEffect(() => {
        if (isTdsEnabled) setTdsAmount(Math.round(subtotal * (Number(tdsPercentage || 0) / 100)));
        else setTdsAmount(0);
    }, [isTdsEnabled, tdsPercentage, subtotal]);
    const totalAmount = subtotal + vatAmount - tdsAmount - discountAmount;

    const addItem = () => setItems([...items, { description: '', quantity: 1, rate: 0 }]);
    const removeItem = (index: number) => setItems(items.filter((_, i) => i !== index));
    const updateItem = (index: number, field: string, value: any) => {
        const newItems = [...items];
        newItems[index] = { ...newItems[index], [field]: value };
        setItems(newItems);
    };

    const handleModalClose = () => {
        setIsAddDialogOpen(false);
        setIsEditMode(false);
        setEditingInvoice(null);
        setFormStep(1);
        resetForm();
    };

    const handleSubmit = () => {
        const payload = { vendorId, invoiceNumber, invoiceDate, dueDate, items, subtotal, vatAmount, tdsAmount, discountAmount, totalAmount };
        if (isEditMode) {
            updateInvoice.mutate(payload);
        } else {
            createInvoice.mutate(payload);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'POSTED': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
            case 'PARTIALLY_PAID': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
            case 'PAID': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
            case 'DRAFT': return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400';
            case 'CANCELLED': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
            default: return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400';
        }
    };

    const getBalanceDueBadge = (invoice: PurchaseInvoice) => {
        const balanceDue = Number(invoice.totalAmount) - Number(invoice.paidAmount || 0);
        if (invoice.status === 'PAID' || balanceDue <= 0) {
            return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-extrabold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"><CheckCircle2 size={11} /> Paid</span>;
        }
        if (invoice.status === 'PARTIALLY_PAID') {
            return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">{formatNPR(balanceDue)} due</span>;
        }
        const isOverdue = new Date(invoice.dueDate) < new Date();
        if (invoice.status === 'POSTED') {
            return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold ${isOverdue ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'}`}>
                {isOverdue && <AlertCircle size={11} />}{formatNPR(Math.max(0, balanceDue))} due
            </span>;
        }
        return null;
    };

    const filteredInvoices = invoices?.filter(inv =>
        inv.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inv.vendor?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleEditClick = (invoice: PurchaseInvoice) => {
        if (invoice.status !== 'DRAFT') {
            const hasPayments = Number(invoice.paidAmount || 0) > 0;
            const message = hasPayments
                ? `This bill has payments. Editing it will revert the bill to Draft and temporarily "Draft" all associated payments (preserving their details but removing their financial impact). You can re-post the payments after editing the bill. Do you want to continue?`
                : `This bill is ${invoice.status}. Editing it will revert it to Draft and remove associated journal entries. Do you want to continue?`;

            if (window.confirm(message)) {
                unpostBill.mutate(invoice.id, {
                    onSuccess: () => {
                        openEditModal(invoice);
                    }
                });
            }
        } else {
            openEditModal(invoice);
        }
    };

    const handleQuickPayment = () => {
        setIsPaymentModalOpen(true);
        setPaymentAmount('');
    };

    if (isLoading) return (
        <div className="p-8 animate-pulse space-y-4">
            <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-1/4"></div>
            <div className="h-64 bg-slate-100 dark:bg-slate-800 rounded-2xl"></div>
        </div>
    );

    const isMutating = createInvoice.isPending || updateInvoice.isPending;

    return (
        <div className="p-8 max-w-[1600px] mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">Purchase Bills</h1>
                    <p className="text-slate-500 mt-1">Manage your payables and record vendor payments.</p>
                </div>
                <div className="flex items-center gap-3">
                    <Button onClick={handleQuickPayment} variant="ghost" className="px-6 py-3 rounded-2xl bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold shadow-sm border border-slate-200 dark:border-slate-700 hover-surface transition-all flex items-center gap-2">
                        <DollarSign size={18} /> Quick Payment
                    </Button>
                    <Button onClick={() => { setIsEditMode(false); resetForm(); setIsAddDialogOpen(true); }} variant="primary" className="px-6 py-6 rounded-2xl font-bold shadow-xl shadow-primary/20 flex items-center gap-2 group">
                        <Plus className="group-hover:rotate-90 transition-transform duration-300" /> Record Bill
                    </Button>
                </div>
            </div>

            <Card className="p-5 border-none shadow-sm backdrop-blur-sm" style={{ backgroundColor: `${theme.colors.surface}90`, borderRadius: '16px' }}>
                <div className="flex flex-col md:flex-row items-center gap-4">
                    <div className="flex-1 w-full relative group">
                        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 transition-colors group-focus-within:text-primary" style={{ color: theme.colors.textSecondary }} />
                        <Input type="text" placeholder="Search by invoice number or vendor..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-12 h-12 bg-transparent border-none focus:ring-2 focus:ring-primary/20 text-lg transition-all" style={{ borderRadius: '12px' }} />
                    </div>
                    <Button variant="ghost" className="h-12 px-6 rounded-xl bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-bold hover-surface">
                        <CalendarIcon className="h-5 w-5 mr-2" /> Date Filter
                    </Button>
                </div>
            </Card>

            <Card className="overflow-hidden border-none shadow-sm" style={{ backgroundColor: theme.colors.surface, borderRadius: '16px' }}>
                <Table>
                    <TableHeader>
                        <TableRow style={{ borderBottom: `1px solid ${theme.colors.border}` }}>
                            <TableHead className="px-6 py-4 text-xs font-extrabold text-slate-400 uppercase tracking-wider">Invoice No.</TableHead>
                            <TableHead className="px-6 py-4 text-xs font-extrabold text-slate-400 uppercase tracking-wider">Date</TableHead>
                            <TableHead className="px-6 py-4 text-xs font-extrabold text-slate-400 uppercase tracking-wider">Vendor</TableHead>
                            <TableHead className="px-6 py-4 text-xs font-extrabold text-slate-400 uppercase tracking-wider text-right">VAT</TableHead>
                            <TableHead className="px-6 py-4 text-xs font-extrabold text-slate-400 uppercase tracking-wider text-right">TDS</TableHead>
                            <TableHead className="px-6 py-4 text-xs font-extrabold text-slate-400 uppercase tracking-wider text-right">Discount</TableHead>
                            <TableHead className="px-6 py-4 text-xs font-extrabold text-slate-400 uppercase tracking-wider text-right">Total</TableHead>
                            <TableHead className="px-6 py-4 text-xs font-extrabold text-slate-400 uppercase tracking-wider text-right">Paid</TableHead>
                            <TableHead className="px-6 py-4 text-xs font-extrabold text-slate-400 uppercase tracking-wider">Balance Due</TableHead>
                            <TableHead className="px-6 py-4 text-xs font-extrabold text-slate-400 uppercase tracking-wider">Status</TableHead>
                            <TableHead className="px-6 py-4 text-xs font-extrabold text-slate-400 uppercase tracking-wider text-center">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredInvoices?.map((invoice) => (
                            <TableRow key={invoice.id} className="hover-surface transition-colors group" style={{ borderBottom: `1px solid ${theme.colors.border}` }}>
                                <TableCell className="px-6 py-4 whitespace-nowrap font-bold" style={{ color: theme.colors.primary }}>
                                    {invoice.invoiceNumber}
                                </TableCell>
                                <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 font-bold">
                                    {new Date(invoice.invoiceDate).toLocaleDateString()}
                                </TableCell>
                                <TableCell className="px-6 py-4 whitespace-nowrap">
                                    <button
                                        className="font-extrabold text-slate-900 dark:text-white hover:underline hover:text-primary transition-colors"
                                        onClick={() => setStatementVendorId(invoice.vendorId)}
                                        title="View Vendor Statement"
                                    >
                                        {invoice.vendor?.name}
                                    </button>
                                </TableCell>
                                <TableCell className="px-6 py-4 whitespace-nowrap text-right font-bold text-blue-500">
                                    {Number(invoice.vatAmount) > 0 ? formatNPR(invoice.vatAmount) : '—'}
                                </TableCell>
                                <TableCell className="px-6 py-4 whitespace-nowrap text-right font-bold text-orange-500">
                                    {Number(invoice.tdsAmount) > 0 ? formatNPR(invoice.tdsAmount) : '—'}
                                </TableCell>
                                <TableCell className="px-6 py-4 whitespace-nowrap text-right font-bold text-red-400">
                                    {Number(invoice.discountAmount) > 0 ? formatNPR(invoice.discountAmount) : '—'}
                                </TableCell>
                                <TableCell className="px-6 py-4 whitespace-nowrap text-right font-extrabold text-slate-900 dark:text-white">
                                    {formatNPR(invoice.totalAmount)}
                                </TableCell>
                                <TableCell className="px-6 py-4 whitespace-nowrap text-right font-bold text-green-600 dark:text-green-400">
                                    {Number(invoice.paidAmount) > 0 ? formatNPR(invoice.paidAmount) : '—'}
                                </TableCell>
                                <TableCell className="px-6 py-4 whitespace-nowrap">
                                    {getBalanceDueBadge(invoice)}
                                </TableCell>
                                <TableCell className="px-6 py-4 whitespace-nowrap">
                                    <span className={`inline-flex items-center justify-center gap-1.5 px-3 py-1 rounded-lg text-xs font-extrabold leading-none ${getStatusColor(invoice.status)}`}>
                                        {invoice.status === 'PAID' && <CheckCircle2 size={11} />}
                                        {invoice.status}
                                    </span>
                                </TableCell>
                                <TableCell className="px-6 py-4 whitespace-nowrap text-center">
                                    <div className="flex items-center justify-center gap-1.5">
                                        <button className="p-2 rounded-xl hover-surface text-slate-500 transition-colors" title="View Vendor Statement" onClick={() => setStatementVendorId(invoice.vendorId)}>
                                            <BarChart2 size={16} />
                                        </button>
                                        <button
                                            className="p-2 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-500 dark:text-blue-400 transition-colors"
                                            title="Edit Bill"
                                            onClick={() => handleEditClick(invoice)}
                                        >
                                            <Pencil size={15} />
                                        </button>
                                        {invoice.status === 'DRAFT' && (
                                            <Button onClick={() => { setPostingInvoice(invoice); setIsPostDialogOpen(true); }} variant="ghost" size="sm" className="px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 text-xs font-extrabold hover:bg-amber-100 dark:hover:bg-amber-900/40">
                                                Post
                                            </Button>
                                        )}
                                        {(invoice.status === 'POSTED' || invoice.status === 'PARTIALLY_PAID') && (
                                            <Button onClick={() => {
                                                setPostingInvoice(invoice);
                                                setPaymentAmount(String(Number(invoice.totalAmount) - Number(invoice.paidAmount || 0)));
                                                setIsPaymentModalOpen(true);
                                            }} variant="ghost" size="sm" className="px-3 py-1.5 rounded-xl bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-xs font-extrabold hover:bg-green-100 dark:hover:bg-green-900/40">
                                                <DollarSign size={12} className="mr-1" />Pay
                                            </Button>
                                        )}
                                        {invoice.status !== 'DRAFT' && Number(invoice.paidAmount || 0) === 0 && (
                                            <Button onClick={() => { if (window.confirm('Are you sure you want to unpost this bill and return it to Draft?')) unpostBill.mutate(invoice.id); }} disabled={unpostBill.isPending} variant="ghost" size="sm" className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-extrabold hover:bg-slate-200 dark:hover:bg-slate-700">
                                                Unpost
                                            </Button>
                                        )}
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
                {(filteredInvoices?.length ?? 0) > 0 && (
                    <div className="px-6 py-4 border-t-2 flex items-center justify-end gap-8" style={{ borderColor: theme.colors.border, backgroundColor: `${theme.colors.surface}` }}>
                        <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">{filteredInvoices?.length} bill{filteredInvoices?.length !== 1 ? 's' : ''}</span>
                        <div className="flex items-center gap-6">
                            <div className="text-right">
                                <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Total Billed</p>
                                <p className="text-lg font-extrabold" style={{ color: theme.colors.text }}>{formatNPR(filteredInvoices?.reduce((s, inv) => s + Number(inv.totalAmount), 0) ?? 0)}</p>
                            </div>
                            <div className="w-px h-8 bg-slate-200 dark:bg-slate-700" />
                            <div className="text-right">
                                <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">VAT</p>
                                <p className="text-lg font-extrabold text-blue-500">{formatNPR(filteredInvoices?.reduce((s, inv) => s + Number(inv.vatAmount || 0), 0) ?? 0)}</p>
                            </div>
                            <div className="w-px h-8 bg-slate-200 dark:bg-slate-700" />
                            <div className="text-right">
                                <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">TDS</p>
                                <p className="text-lg font-extrabold text-orange-500">{formatNPR(filteredInvoices?.reduce((s, inv) => s + Number(inv.tdsAmount || 0), 0) ?? 0)}</p>
                            </div>
                            <div className="w-px h-8 bg-slate-200 dark:bg-slate-700" />
                            <div className="text-right">
                                <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Discount</p>
                                <p className="text-lg font-extrabold text-red-400">{formatNPR(filteredInvoices?.reduce((s, inv) => s + Number(inv.discountAmount || 0), 0) ?? 0)}</p>
                            </div>
                            <div className="w-px h-8 bg-slate-200 dark:bg-slate-700" />
                            <div className="text-right">
                                <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Total Paid</p>
                                <p className="text-lg font-extrabold text-green-600 dark:text-green-400">{formatNPR(filteredInvoices?.reduce((s, inv) => s + Number(inv.paidAmount || 0), 0) ?? 0)}</p>
                            </div>
                            <div className="w-px h-8 bg-slate-200 dark:bg-slate-700" />
                            <div className="text-right">
                                <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Balance Due</p>
                                <p className="text-lg font-extrabold text-red-600 dark:text-red-400">{formatNPR(filteredInvoices?.reduce((s, inv) => s + Math.max(0, Number(inv.totalAmount) - Number(inv.paidAmount || 0)), 0) ?? 0)}</p>
                            </div>
                        </div>
                    </div>
                )}
                {filteredInvoices?.length === 0 && (
                    <div className="p-12 text-center text-slate-400">
                        <div className="w-16 h-16 bg-slate-100 dark:bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-4"><FileText size={24} /></div>
                        <p className="font-extrabold">No purchase invoices found</p>
                        <p className="text-sm">Record your first bill from a vendor to start tracking payables.</p>
                    </div>
                )}
            </Card>

            {/* Record / Edit Bill Modal */}
            <Modal isOpen={isAddDialogOpen} onClose={handleModalClose} title={isEditMode ? `Edit Bill — ${editingInvoice?.invoiceNumber}` : 'Record Purchase Bill'} size="4xl" theme={{ colors: theme.colors }}
                footer={
                    <div className="flex items-center justify-between w-full">
                        <Button onClick={() => formStep === 1 ? handleModalClose() : setFormStep(formStep - 1)} variant="ghost" className="px-6 py-3 rounded-xl bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold border border-slate-200 dark:border-slate-700">
                            {formStep === 1 ? 'Cancel' : 'Back'}
                        </Button>
                        <div className="flex items-center gap-8">
                            {formStep === 2 && (
                                <div className="flex gap-8 items-center">
                                    <div className="space-y-1 text-right">
                                        <div className="flex gap-4 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest justify-end">
                                            <span>Subtotal: {formatNPR(subtotal)}</span>
                                            {isVatEnabled && <span>VAT (13%): {formatNPR(vatAmount)}</span>}
                                            {isTdsEnabled && <span>TDS ({tdsPercentage}%): {formatNPR(tdsAmount)}</span>}
                                            {discountAmount > 0 && <span>Discount: {formatNPR(discountAmount)}</span>}
                                        </div>
                                        <div className="text-2xl font-extrabold text-slate-900 dark:text-white">Net: {formatNPR(totalAmount)}</div>
                                    </div>
                                    <div className="h-10 w-px bg-slate-200 dark:bg-slate-700"></div>
                                    <div className="flex items-center gap-6">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">Discount</label>
                                            <Input type="number" className="w-24 h-10 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-right text-sm font-bold text-red-500" value={discountAmount || ''} onChange={(e) => setDiscountAmount(Number(e.target.value))} />
                                        </div>
                                        <div className="h-10 w-px bg-slate-200 dark:bg-slate-700"></div>
                                        <div className="flex items-center gap-2">
                                            <input type="checkbox" id="enableVat" checked={isVatEnabled} onChange={(e) => setIsVatEnabled(e.target.checked)} className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary" />
                                            <label htmlFor="enableVat" className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest cursor-pointer">Include VAT</label>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <input type="checkbox" id="enableTds" checked={isTdsEnabled} onChange={(e) => setIsTdsEnabled(e.target.checked)} className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary" />
                                            <label htmlFor="enableTds" className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest cursor-pointer">Include TDS</label>
                                        </div>
                                    </div>
                                    {isTdsEnabled && (
                                        <>
                                            <div className="h-10 w-px bg-slate-200 dark:bg-slate-700"></div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">TDS %</label>
                                                <div className="relative">
                                                    <Input type="number" className="w-20 h-10 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-right text-sm font-bold text-orange-600 pr-6" value={tdsPercentage || ''} onChange={(e) => setTdsPercentage(Number(e.target.value))} />
                                                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">%</span>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                        <div className="flex gap-3">
                            {formStep === 1 ? (
                                <Button onClick={() => setFormStep(2)} disabled={!vendorId || !invoiceDate} variant="primary" className="px-8 py-3 rounded-xl font-bold shadow-lg shadow-primary/20">Next: Add Items</Button>
                            ) : formStep === 2 && isEditMode && invoicePayments && invoicePayments.length > 0 ? (
                                <Button onClick={() => setFormStep(3)} variant="primary" className="px-8 py-3 rounded-xl font-bold shadow-lg shadow-primary/20">Next: Adjust Payments</Button>
                            ) : (
                                <Button
                                    onClick={handleSubmit}
                                    disabled={isMutating || !vendorId || !invoiceNumber || items.some(i => !i.description || i.rate <= 0)}
                                    variant="primary" className="px-8 py-3 rounded-xl font-bold shadow-lg shadow-primary/20" isLoading={isMutating}
                                >
                                    {isMutating ? (isEditMode ? 'Saving...' : 'Recording...') : (isEditMode ? 'Save Changes' : 'Record Bill')}
                                </Button>
                            )}
                        </div>
                    </div>
                }
            >
                <div className="max-h-[80vh] overflow-y-auto custom-scrollbar pr-2">
                    <div className="flex items-center justify-center gap-4 mb-8">
                        {(isEditMode && invoicePayments && invoicePayments.length > 0 ? [1, 2, 3] : [1, 2]).map((s) => (
                            <div key={s} className="flex items-center">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-extrabold transition-all duration-300 border-2 ${formStep >= s ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20' : 'bg-white dark:bg-slate-800 text-slate-300 border-slate-200 dark:border-slate-700'}`} style={formStep >= s ? { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary } : {}}>{s}</div>
                                {s < (isEditMode && invoicePayments && invoicePayments.length > 0 ? 3 : 2) && <div className={`w-12 h-0.5 mx-2 transition-colors duration-300 ${formStep > s ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-700'}`} style={formStep > s ? { backgroundColor: theme.colors.primary } : {}} />}
                            </div>
                        ))}
                    </div>
                    {formStep === 1 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Bill Date</label>
                                    <Input type="date" className="h-12 bg-slate-50 dark:bg-slate-900 border-none font-bold" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Due Date</label>
                                    <Input type="date" className="h-12 bg-slate-50 dark:bg-slate-900 border-none font-bold" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-1">
                                    <label className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Select Vendor</label>
                                    <select className="w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-900 border-none focus:ring-2 focus:ring-primary/20 text-slate-700 dark:text-slate-300 font-bold" value={vendorId} onChange={(e) => setVendorId(e.target.value)}>
                                        <option value="">Select a vendor...</option>
                                        {vendors?.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Vendor Bill Number</label>
                                    <Input type="text" className="h-12 bg-slate-100 dark:bg-slate-900 border-none font-bold" placeholder="Enter vendor's bill number" value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} />
                                </div>
                            </div>
                        </div>
                    )}
                    {formStep === 2 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="space-y-4">
                                <div className="grid grid-cols-12 gap-4 px-4 text-xs font-extrabold text-slate-400 uppercase tracking-wider">
                                    <div className="col-span-6">Description</div>
                                    <div className="col-span-2 text-right">Quantity</div>
                                    <div className="col-span-3 text-right">Rate</div>
                                    <div className="col-span-1"></div>
                                </div>
                                {items.map((item, index) => (
                                    <div key={index} className="grid grid-cols-12 gap-4 items-center">
                                        <div className="col-span-6"><Input type="text" className="h-12 bg-slate-100 dark:bg-slate-900 border-none font-bold" placeholder="Description..." value={item.description} onChange={(e) => updateItem(index, 'description', e.target.value)} /></div>
                                        <div className="col-span-2"><Input type="number" className="h-12 bg-slate-100 dark:bg-slate-900 border-none font-bold text-right" placeholder="0" value={item.quantity} onChange={(e) => updateItem(index, 'quantity', Number(e.target.value))} /></div>
                                        <div className="col-span-3"><Input type="number" className="h-12 bg-slate-100 dark:bg-slate-900 border-none font-bold text-right" placeholder="0.00" value={item.rate || ''} onChange={(e) => updateItem(index, 'rate', Number(e.target.value))} /></div>
                                        <div className="col-span-1 text-center">
                                            <button onClick={() => removeItem(index)} className="p-3 text-red-400 hover:text-red-500 transition-colors disabled:opacity-30" disabled={items.length <= 1}><Trash2 size={18} /></button>
                                        </div>
                                    </div>
                                ))}
                                <Button onClick={addItem} variant="ghost" className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-slate-500 hover:text-primary transition-colors hover:bg-slate-50 dark:hover:bg-slate-900/50 rounded-xl">
                                    <Plus size={16} /> Add Line Item
                                </Button>
                            </div>
                        </div>
                    )}
                    {formStep === 3 && isEditMode && invoicePayments && invoicePayments.length > 0 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="p-6 bg-amber-50/50 dark:bg-amber-900/10 rounded-2xl border border-amber-100 dark:border-amber-800/30">
                                <div className="flex items-center justify-between mb-6">
                                    <div>
                                        <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">Associated Drafted Payments</h3>
                                        <p className="text-sm text-slate-500">Adjust these payments to match your new bill total.</p>
                                    </div>
                                    <span className="px-3 py-1.5 rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 text-xs font-extrabold uppercase tracking-widest border border-amber-200 dark:border-amber-700/50 flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                                        Draft Status
                                    </span>
                                </div>

                                {invoicePayments.reduce((s, p) => s + Number(p.amount || 0), 0) > totalAmount && (
                                    <div className="flex items-start gap-4 p-5 bg-red-50 dark:bg-red-900/20 rounded-2xl border border-red-100 dark:border-red-800/50 mb-6 drop-shadow-sm">
                                        <div className="p-2 bg-red-100 dark:bg-red-800/30 rounded-lg">
                                            <AlertCircle size={20} className="text-red-500" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-extrabold text-red-600 dark:text-red-400 uppercase tracking-wider mb-1">Total Payments Exceed Bill Total</p>
                                            <p className="text-xs text-red-500/80 font-bold leading-relaxed">Your scheduled payments total {formatNPR(invoicePayments.reduce((s, p) => s + Number(p.amount || 0), 0))}, which is more than the revised bill total of {formatNPR(totalAmount)}. Please adjust before posting.</p>
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-3">
                                    {invoicePayments.map((p) => (
                                        <div key={p.id} className="group/payment flex items-center justify-between p-5 bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200/60 dark:border-slate-700/50 hover:border-primary/40 hover:shadow-md transition-all duration-300">
                                            <div className="flex items-center gap-5">
                                                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 group-hover/payment:scale-110 transition-transform">
                                                    <Receipt size={20} className="text-slate-400 group-hover/payment:text-primary transition-colors" />
                                                </div>
                                                <div>
                                                    <p className="font-extrabold text-slate-900 dark:text-white text-base">{formatNPR(p.amount || 0)}</p>
                                                    <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-0.5">{p.narration || 'No narration'}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <button
                                                    onClick={() => { setEditingPayment({ id: p.id, amount: p.amount, narration: p.narration }); setIsEditPaymentModalOpen(true); }}
                                                    className="px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 hover:bg-primary hover:text-white border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 transition-all font-extrabold text-xs flex items-center gap-2 shadow-sm"
                                                >
                                                    <Pencil size={14} /> Edit
                                                </button>
                                                <button
                                                    onClick={() => { if (window.confirm('Delete this drafted payment?')) deletePayment.mutate(p.id, { onSuccess: () => refetchPayments() }); }}
                                                    className="p-2.5 rounded-xl bg-red-50/30 dark:bg-red-900/10 hover:bg-red-500 hover:text-white text-red-400 transition-all group/del"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </Modal>

            {/* Post Bill Modal */}
            <Modal isOpen={isPostDialogOpen} onClose={() => setIsPostDialogOpen(false)} title="Post Bill to Ledger" size="md" theme={{ colors: theme.colors }}
                footer={
                    <div className="flex gap-4 w-full">
                        <Button onClick={() => setIsPostDialogOpen(false)} variant="ghost" className="flex-1 px-6 py-3 rounded-xl bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold border border-slate-200 dark:border-slate-700">Cancel</Button>
                        <Button onClick={() => postBill.mutate({ id: postingInvoice?.id!, apAccountId, expenseAccountId, vatAccountId: Number(postingInvoice?.vatAmount || 0) > 0 ? vatAccountId : undefined, tdsAccountId: Number(postingInvoice?.tdsAmount || 0) > 0 ? tdsAccountId : undefined })}
                            disabled={postBill.isPending || !apAccountId || !expenseAccountId || (Number(postingInvoice?.vatAmount || 0) > 0 && !vatAccountId) || (Number(postingInvoice?.tdsAmount || 0) > 0 && !tdsAccountId)}
                            variant="primary" className="flex-1 px-6 py-3 rounded-xl font-bold shadow-lg shadow-primary/20" isLoading={postBill.isPending}>
                            {postBill.isPending ? 'Posting...' : 'Confirm Post'}
                        </Button>
                    </div>
                }
            >
                <div className="space-y-4">
                    <p className="text-sm text-slate-500 mt-1">Map the purchase bill components to your chart of accounts.</p>
                    {[{ label: 'Accounts Payable Account', value: apAccountId, setter: setApAccountId }, { label: 'Expense / Asset Account', value: expenseAccountId, setter: setExpenseAccountId }].map(({ label, value, setter }) => (
                        <div key={label} className="space-y-1">
                            <label className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">{label}</label>
                            <select className="w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-900 border-none focus:ring-2 focus:ring-primary/20 text-slate-700 dark:text-slate-300 font-bold" value={value} onChange={(e) => setter(e.target.value)}>
                                <option value="">Select account...</option>
                                {accounts?.map(acc => <option key={acc.id} value={acc.id}>{acc.code} - {acc.name}</option>)}
                            </select>
                        </div>
                    ))}
                    {Number(postingInvoice?.vatAmount || 0) > 0 && (
                        <div className="space-y-1 animate-in fade-in slide-in-from-top-2 duration-300">
                            <label className="text-xs font-extrabold text-blue-400 uppercase tracking-wider">Input VAT Account (13%)</label>
                            <select className="w-full px-4 py-3 rounded-xl bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100/50 dark:border-blue-800/20 text-slate-700 dark:text-slate-300 font-bold" value={vatAccountId} onChange={(e) => setVatAccountId(e.target.value)}>
                                <option value="">Select VAT Account</option>
                                {accounts?.map(acc => <option key={acc.id} value={acc.id}>{acc.code} - {acc.name}</option>)}
                            </select>
                        </div>
                    )}
                    {Number(postingInvoice?.tdsAmount || 0) > 0 && (
                        <div className="space-y-1 animate-in fade-in slide-in-from-top-2 duration-300">
                            <label className="text-xs font-extrabold text-orange-400 uppercase tracking-wider">TDS Payable Account</label>
                            <select className="w-full px-4 py-3 rounded-xl bg-orange-50/50 dark:bg-orange-900/10 border border-orange-100/50 dark:border-orange-800/20 text-slate-700 dark:text-slate-300 font-bold" value={tdsAccountId} onChange={(e) => setTdsAccountId(e.target.value)}>
                                <option value="">Select TDS Account</option>
                                {accounts?.map(acc => <option key={acc.id} value={acc.id}>{acc.code} - {acc.name}</option>)}
                            </select>
                        </div>
                    )}
                    <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-xl border border-orange-100 dark:border-orange-800/50">
                        <div className="flex gap-3 text-orange-700 dark:text-orange-400">
                            <AlertCircle size={20} className="shrink-0" />
                            <div>
                                <p className="text-sm font-bold">Tax &amp; TDS Handling</p>
                                <p className="text-xs opacity-80">VAT (13%) and TDS (if any) will be automatically posted to their respective contra-accounts.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </Modal>

            {/* Record Payment Modal */}
            <Modal isOpen={isPaymentModalOpen} onClose={() => { setIsPaymentModalOpen(false); setPostingInvoice(null); }} title="Record Payment" size="md" theme={{ colors: theme.colors }}
                footer={
                    <div className="flex gap-4 w-full">
                        <Button onClick={() => { setIsPaymentModalOpen(false); setPostingInvoice(null); }} variant="ghost" className="flex-1 px-6 py-3 rounded-xl bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold border border-slate-200 dark:border-slate-700">Cancel</Button>
                        <Button
                            onClick={() => recordPayment.mutate({ id: postingInvoice?.id!, amount: Number(paymentAmount), paymentDate, bankAccountId: paymentBankAccountId, apAccountId: paymentApAccountId, narration: paymentNarration })}
                            disabled={recordPayment.isPending || !paymentAmount || Number(paymentAmount) <= 0 || !paymentBankAccountId || !paymentApAccountId}
                            variant="primary" className="flex-1 px-6 py-3 rounded-xl font-bold shadow-lg shadow-primary/20" isLoading={recordPayment.isPending}
                        >
                            {recordPayment.isPending ? 'Processing...' : 'Record Payment'}
                        </Button>
                    </div>
                }
            >
                <div className="space-y-4">
                    {postingInvoice && (
                        <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                            <div className="flex justify-between items-center">
                                <div>
                                    <p className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Invoice</p>
                                    <p className="font-extrabold text-slate-900 dark:text-white">{postingInvoice.invoiceNumber}</p>
                                    <p className="text-sm text-slate-500">{postingInvoice.vendor?.name}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Balance Due</p>
                                    <p className="text-2xl font-extrabold text-red-600 dark:text-red-400">{formatNPR(Number(postingInvoice.totalAmount || 0) - Number(postingInvoice.paidAmount || 0))}</p>
                                </div>
                            </div>
                        </div>
                    )}
                    <div className="space-y-1">
                        <label className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Bill to Pay (Optional for Quick Payment)</label>
                        <select className="w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-900 border-none focus:ring-2 focus:ring-primary/20 text-slate-700 dark:text-slate-300 font-bold" value={postingInvoice?.id || ''} onChange={(e) => {
                            const inv = invoices?.find(i => i.id === e.target.value);
                            setPostingInvoice(inv || null);
                            if (inv) setPaymentAmount(String(Number(inv.totalAmount || 0) - Number(inv.paidAmount || 0)));
                        }}>
                            <option value="">General Payment / Multiple Bills...</option>
                            {invoices?.filter(i => i.status === 'POSTED' || i.status === 'PARTIALLY_PAID').map(inv => (
                                <option key={inv.id} value={inv.id}>{inv.invoiceNumber} — {inv.vendor?.name} ({formatNPR(Number(inv.totalAmount || 0) - Number(inv.paidAmount || 0))} due)</option>
                            ))}
                        </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Amount Paid</label>
                            <Input type="number" className="h-12 bg-slate-100 dark:bg-slate-900 border-none font-extrabold text-right text-lg" placeholder="0.00" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Payment Date</label>
                            <Input type="date" className="h-12 bg-slate-100 dark:bg-slate-900 border-none font-bold" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
                        </div>
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Accounts Payable (DR)</label>
                        <select className="w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-900 border-none focus:ring-2 focus:ring-primary/20 text-slate-700 dark:text-slate-300 font-bold" value={paymentApAccountId} onChange={(e) => setPaymentApAccountId(e.target.value)}>
                            <option value="">Select AP Account...</option>
                            {accounts?.map(acc => <option key={acc.id} value={acc.id}>{acc.code} - {acc.name}</option>)}
                        </select>
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Bank / Cash Account (CR)</label>
                        <select className="w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-900 border-none focus:ring-2 focus:ring-primary/20 text-slate-700 dark:text-slate-300 font-bold" value={paymentBankAccountId} onChange={(e) => setPaymentBankAccountId(e.target.value)}>
                            <option value="">Select Bank/Cash Account...</option>
                            {accounts?.map(acc => <option key={acc.id} value={acc.id}>{acc.code} - {acc.name}</option>)}
                        </select>
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Narration (Optional)</label>
                        <Input type="text" className="h-12 bg-slate-100 dark:bg-slate-900 border-none font-bold" placeholder="Payment note..." value={paymentNarration} onChange={(e) => setPaymentNarration(e.target.value)} />
                    </div>
                </div>
            </Modal>

            {/* Vendor Statement Drawer */}
            {statementVendorId && (
                <div className="fixed inset-0 z-50 flex">
                    <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={() => setStatementVendorId(null)} />
                    <div className="w-full max-w-2xl bg-white dark:bg-slate-900 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-300">
                        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200 dark:border-slate-700" style={{ backgroundColor: `${theme.colors.primary}08` }}>
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-xl" style={{ backgroundColor: `${theme.colors.primary}20` }}>
                                    <BarChart2 className="h-5 w-5" style={{ color: theme.colors.primary }} />
                                </div>
                                <div>
                                    <h2 className="font-extrabold text-lg text-slate-900 dark:text-white">Vendor Statement</h2>
                                    {vendorStatement && <p className="text-sm text-slate-500">{vendorStatement.vendor.name}</p>}
                                </div>
                            </div>
                            <button onClick={() => setStatementVendorId(null)} className="p-2 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 transition-colors"><X size={20} /></button>
                        </div>

                        {isStatementLoading ? (
                            <div className="flex-1 flex items-center justify-center">
                                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" style={{ borderColor: `${theme.colors.primary} transparent transparent transparent` }}></div>
                            </div>
                        ) : vendorStatement ? (
                            <>
                                {/* Summary Cards */}
                                <div className="grid grid-cols-3 gap-4 px-6 py-4 border-b border-slate-200 dark:border-slate-700">
                                    {[
                                        { label: 'Total Billed', value: vendorStatement.totalBilled, color: 'text-slate-900 dark:text-white' },
                                        { label: 'Total Paid', value: vendorStatement.totalPaid, color: 'text-green-600 dark:text-green-400' },
                                        { label: 'Total Due', value: vendorStatement.totalDue, color: vendorStatement.totalDue > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400' },
                                    ].map(({ label, value, color }) => (
                                        <div key={label} className="text-center p-3 rounded-xl bg-slate-50 dark:bg-slate-800">
                                            <p className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-1">{label}</p>
                                            <p className={`text-xl font-extrabold ${color}`}>{formatNPR(value)}</p>
                                        </div>
                                    ))}
                                </div>

                                {/* Statement Table */}
                                <div className="flex-1 overflow-y-auto">
                                    <table className="w-full text-sm">
                                        <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                                            <tr>
                                                {['Invoice', 'Date', 'Due Date', 'Total', 'Paid', 'Balance', 'Status'].map(h => (
                                                    <th key={h} className="px-4 py-3 text-left text-xs font-extrabold text-slate-400 uppercase tracking-wider">{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                            {vendorStatement.rows.map((row) => (
                                                <tr key={row.id} className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${row.isOverdue && row.balanceDue > 0 ? 'bg-red-50/30 dark:bg-red-900/10' : ''}`}>
                                                    <td className="px-4 py-3 font-bold" style={{ color: theme.colors.primary }}>{row.invoiceNumber}</td>
                                                    <td className="px-4 py-3 text-slate-500">{new Date(row.invoiceDate).toLocaleDateString()}</td>
                                                    <td className="px-4 py-3 text-slate-500">
                                                        <span className={row.isOverdue && row.balanceDue > 0 ? 'text-red-500 font-bold' : ''}>{new Date(row.dueDate).toLocaleDateString()}</span>
                                                    </td>
                                                    <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">{formatNPR(row.totalAmount)}</td>
                                                    <td className="px-4 py-3 font-bold text-red-600 dark:text-red-400">
                                                        <div className="space-y-1">
                                                            {row.paidAmount > 0 ? formatNPR(row.paidAmount) : '—'}
                                                            {(row as any).payments?.map((p: any) => (
                                                                <div key={p.id} className={`flex items-center justify-between gap-2 px-2 py-1 rounded-lg group/payment ${p.status === 'POSTED' ? 'bg-red-50/50 dark:bg-red-900/10' : 'bg-slate-100 dark:bg-slate-800'}`}>
                                                                    <div className="flex flex-col">
                                                                        <span className={`text-[10px] font-extrabold whitespace-nowrap ${p.status === 'POSTED' ? 'text-red-700 dark:text-red-500' : 'text-slate-500'}`}>{formatNPR(p.amount)}</span>
                                                                        {p.status === 'DRAFT' && <span className="text-[8px] font-bold text-amber-600 uppercase">Draft</span>}
                                                                    </div>
                                                                    <div className="flex items-center gap-1 opacity-0 group-hover/payment:opacity-100 transition-opacity">
                                                                        {p.status === 'DRAFT' ? (
                                                                            <>
                                                                                <button onClick={() => postPayment.mutate(p.id)} className="p-1 text-green-500 hover:text-green-600" title="Post Payment">
                                                                                    <CheckCircle2 size={10} />
                                                                                </button>
                                                                                <button onClick={() => { setEditingPayment({ id: p.id, amount: p.amount, narration: p.narration }); setIsEditPaymentModalOpen(true); }} className="p-1 text-slate-400 hover:text-slate-600" title="Edit Payment">
                                                                                    <Pencil size={10} />
                                                                                </button>
                                                                            </>
                                                                        ) : (
                                                                            <button onClick={() => unpostPayment.mutate(p.id)} className="p-1 text-amber-500 hover:text-amber-600" title="Draft Payment">
                                                                                <X size={10} />
                                                                            </button>
                                                                        )}
                                                                        <button onClick={() => { if (window.confirm('Delete this payment recorded?')) deletePayment.mutate(p.id); }} className="p-1 text-red-300 hover:text-red-500">
                                                                            <Trash2 size={10} />
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 font-extrabold">
                                                        <span className={row.balanceDue > 0 ? (row.isOverdue ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400') : 'text-green-600 dark:text-green-400'}>
                                                            {row.balanceDue > 0 ? formatNPR(row.balanceDue) : '✓'}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span className={`inline-flex px-2 py-0.5 rounded-lg text-xs font-extrabold ${getStatusColor(row.status)}`}>{row.status}</span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    {vendorStatement.rows.length === 0 && (
                                        <div className="p-12 text-center text-slate-400">
                                            <FileText className="mx-auto mb-3 opacity-40" size={32} />
                                            <p className="font-bold">No invoices found for this vendor</p>
                                        </div>
                                    )}
                                </div>
                            </>
                        ) : null}
                    </div>
                </div>
            )}

            {/* Edit Payment Modal */}
            <Modal isOpen={isEditPaymentModalOpen} onClose={() => setIsEditPaymentModalOpen(false)} title="Edit Draft Payment">
                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-bold mb-1">Amount</label>
                        <Input type="number" value={editingPayment?.amount || ''} onChange={(e) => setEditingPayment(curr => curr ? { ...curr, amount: Number(e.target.value) } : null)} />
                    </div>
                    <div>
                        <label className="block text-sm font-bold mb-1">Narration</label>
                        <Input value={editingPayment?.narration || ''} onChange={(e) => setEditingPayment(curr => curr ? { ...curr, narration: e.target.value } : null)} />
                    </div>
                    <div className="flex justify-end gap-2 pt-4">
                        <Button variant="outline" onClick={() => setIsEditPaymentModalOpen(false)}>Cancel</Button>
                        <Button onClick={() => editingPayment && updatePayment.mutate(editingPayment)}>Save Changes</Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
