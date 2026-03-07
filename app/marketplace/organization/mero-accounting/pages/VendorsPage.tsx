import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/services/api';
import { useTheme } from '@/contexts/ThemeContext';
import { Plus, Search, Filter, Phone, Mail, MapPin, Building2, User, ShieldCheck, FileText, BarChart2, X, CheckCircle2, Pencil, Trash2, AlertCircle } from 'lucide-react';
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

interface Vendor {
    id: string;
    name: string;
    panNumber?: string;
    email?: string;
    phone: string;
    address?: string;
    currentBalance: number;
}

export default function VendorsPage() {
    const { theme } = useTheme();
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState('');
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        panNumber: '',
        email: '',
        phone: '',
        address: ''
    });
    const [statementVendorId, setStatementVendorId] = useState<string | null>(null);
    const [isEditPaymentModalOpen, setIsEditPaymentModalOpen] = useState(false);
    const [editingPayment, setEditingPayment] = useState<{ id: string; amount: number; narration?: string } | null>(null);

    const { data: vendors, isLoading } = useQuery<Vendor[]>({
        queryKey: ['accounting-vendors'],
        queryFn: async () => {
            const response = await api.get('/accounting/vendors');
            return response.data;
        }
    });

    const { data: vendorStatement, isLoading: isStatementLoading } = useQuery<any>({
        queryKey: ['vendor-statement', statementVendorId],
        queryFn: async () => {
            const response = await api.get(`/accounting/purchase-invoices/vendor/${statementVendorId}/statement`);
            return response.data;
        },
        enabled: !!statementVendorId
    });

    const createVendor = useMutation({
        mutationFn: async (vendorData: typeof formData) => {
            const response = await api.post('/accounting/vendors', vendorData);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['accounting-vendors'] });
            setIsAddDialogOpen(false);
            setFormData({ name: '', panNumber: '', email: '', phone: '', address: '' });
            toast.success('Vendor added successfully');
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Failed to add vendor');
        }
    });

    const deletePayment = useMutation({
        mutationFn: async (paymentId: string) => {
            await api.delete(`/accounting/purchase-invoices/payments/${paymentId}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['accounting-vendors'] });
            queryClient.invalidateQueries({ queryKey: ['vendor-statement'] });
            toast.success('Payment record removed');
        },
        onError: (error: any) => { toast.error(error.response?.data?.message || 'Failed to delete payment'); }
    });

    const postPayment = useMutation({
        mutationFn: async (paymentId: string) => {
            await api.post(`/accounting/purchase-invoices/payments/${paymentId}/post`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['accounting-vendors'] });
            queryClient.invalidateQueries({ queryKey: ['vendor-statement'] });
            toast.success('Payment posted to ledger');
        },
        onError: (error: any) => { toast.error(error.response?.data?.message || 'Failed to post payment'); }
    });

    const unpostPayment = useMutation({
        mutationFn: async (paymentId: string) => {
            await api.post(`/accounting/purchase-invoices/payments/${paymentId}/unpost`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['accounting-vendors'] });
            queryClient.invalidateQueries({ queryKey: ['vendor-statement'] });
            toast.success('Payment unposted to draft');
        },
        onError: (error: any) => { toast.error(error.response?.data?.message || 'Failed to unpost payment'); }
    });

    const updatePayment = useMutation({
        mutationFn: async (data: { id: string; amount: number; narration?: string }) => {
            await api.put(`/accounting/purchase-invoices/payments/${data.id}`, { amount: data.amount, narration: data.narration });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['accounting-vendors'] });
            queryClient.invalidateQueries({ queryKey: ['vendor-statement'] });
            toast.success('Payment updated');
            setIsEditPaymentModalOpen(false);
        },
        onError: (error: any) => { toast.error(error.response?.data?.message || 'Failed to update payment'); }
    });

    const filteredVendors = vendors?.filter(v =>
        v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.phone.includes(searchTerm) ||
        v.panNumber?.includes(searchTerm)
    );

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

    if (isLoading) {
        return <div className="p-8 animate-pulse space-y-4">
            <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-1/4"></div>
            <div className="h-64 bg-slate-100 dark:bg-slate-800 rounded-2xl"></div>
        </div>;
    }

    return (
        <div className="p-8 max-w-[1600px] mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="p-3 rounded-2xl" style={{ backgroundColor: `${theme.colors.primary}15` }}>
                        <Building2 className="h-8 w-8" style={{ color: theme.colors.primary }} />
                    </div>
                    <div>
                        <h1 className="text-4xl font-extrabold tracking-tight" style={{ color: theme.colors.text }}>
                            Vendors
                        </h1>
                        <p className="opacity-70" style={{ color: theme.colors.textSecondary }}>
                            Manage your suppliers and service providers
                        </p>
                    </div>
                </div>
                <Button
                    onClick={() => setIsAddDialogOpen(true)}
                    variant="primary"
                    className="shadow-lg shadow-primary/20 scale-105 active:scale-95 transition-transform px-6 h-12 rounded-xl"
                >
                    <Plus className="h-5 w-5 mr-2" />
                    Add Vendor
                </Button>
            </div>

            <Card className="p-5 border-none shadow-sm backdrop-blur-sm" style={{ backgroundColor: `${theme.colors.surface}90`, borderRadius: '16px' }}>
                <div className="flex flex-col md:flex-row items-center gap-4">
                    <div className="flex-1 w-full relative group">
                        <Search
                            className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 transition-colors group-focus-within:text-primary"
                            style={{ color: theme.colors.textSecondary }}
                        />
                        <Input
                            type="text"
                            placeholder="Search by name, phone or PAN..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-12 h-12 bg-transparent border-none focus:ring-2 focus:ring-primary/20 text-lg transition-all"
                            style={{ borderRadius: '12px' }}
                        />
                    </div>
                    <Button
                        variant="ghost"
                        className="h-12 px-6 rounded-xl bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-200"
                    >
                        <Filter className="h-5 w-5 mr-2" />
                        Filter
                    </Button>
                </div>
            </Card>

            <Card className="overflow-hidden border-none shadow-sm" style={{ backgroundColor: theme.colors.surface, borderRadius: '16px' }}>
                <Table>
                    <TableHeader>
                        <TableRow style={{ borderBottom: `1px solid ${theme.colors.border}` }}>
                            <TableHead className="px-6 py-4 text-xs font-extrabold text-slate-400 uppercase tracking-wider">Vendor Name</TableHead>
                            <TableHead className="px-6 py-4 text-xs font-extrabold text-slate-400 uppercase tracking-wider">Contact Info</TableHead>
                            <TableHead className="px-6 py-4 text-xs font-extrabold text-slate-400 uppercase tracking-wider">PAN</TableHead>
                            <TableHead className="px-6 py-4 text-xs font-extrabold text-slate-400 uppercase tracking-wider text-right">Balance</TableHead>
                            <TableHead className="px-6 py-4 text-xs font-extrabold text-slate-400 uppercase tracking-wider text-center">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredVendors?.map((vendor) => (
                            <TableRow key={vendor.id} className="hover-theme transition-colors group" style={{ borderBottom: `1px solid ${theme.colors.border}` }}>
                                <TableCell className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center" style={{ backgroundColor: `${theme.colors.primary}15` }}>
                                            <Building2 className="h-5 w-5" style={{ color: theme.colors.primary }} />
                                        </div>
                                        <div>
                                            <div className="font-extrabold text-slate-900 dark:text-white capitalize">{vendor.name}</div>
                                            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{vendor.id.split('-')[0]}</div>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell className="px-6 py-4 whitespace-nowrap">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 font-bold">
                                            <Phone size={14} className="opacity-50" />
                                            {vendor.phone}
                                        </div>
                                        {vendor.email && (
                                            <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
                                                <Mail size={14} className="opacity-50" />
                                                {vendor.email}
                                            </div>
                                        )}
                                    </div>
                                </TableCell>
                                <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 font-extrabold">
                                    {vendor.panNumber || '-'}
                                </TableCell>
                                <TableCell className="px-6 py-4 whitespace-nowrap text-right">
                                    <span className={`text-lg font-extrabold ${vendor.currentBalance > 0 ? 'text-red-500' : 'text-slate-900 dark:text-white'}`}>
                                        {formatNPR(vendor.currentBalance)}
                                    </span>
                                </TableCell>
                                <TableCell className="px-6 py-4 whitespace-nowrap text-center">
                                    <Button onClick={() => setStatementVendorId(vendor.id)} variant="ghost" size="sm" className="hover-theme-strong">
                                        <FileText className="h-4 w-4 mr-2" />
                                        Payables
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
                {filteredVendors?.length === 0 && (
                    <div className="p-12 text-center text-slate-400">
                        <div className="w-16 h-16 bg-slate-100 dark:bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Building2 size={24} />
                        </div>
                        <p className="font-extrabold">No vendors found</p>
                        <p className="text-sm">Add your first supplier to start tracking purchases.</p>
                    </div>
                )}
            </Card>

            {/* Add Vendor Modal */}
            <Modal
                isOpen={isAddDialogOpen}
                onClose={() => setIsAddDialogOpen(false)}
                title="Add New Vendor"
                size="md"
                theme={{ colors: theme.colors }}
                footer={
                    <div className="flex gap-3 w-full">
                        <Button
                            onClick={() => setIsAddDialogOpen(false)}
                            variant="ghost"
                            className="flex-1 px-6 py-3 rounded-xl bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold border border-slate-200 dark:border-slate-700 hover-theme-strong"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={() => createVendor.mutate(formData)}
                            disabled={createVendor.isPending || !formData.name || !formData.phone}
                            variant="primary"
                            className="flex-1 px-6 py-3 rounded-xl font-bold shadow-lg shadow-primary/20 scale-105 active:scale-95 transition-transform"
                            isLoading={createVendor.isPending}
                        >
                            {createVendor.isPending ? 'Adding...' : 'Add Vendor'}
                        </Button>
                    </div>
                }
            >
                <div className="p-1 space-y-4 max-h-[85vh] overflow-y-auto custom-scrollbar pr-2">
                    <div className="space-y-1">
                        <label className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Vendor Name</label>
                        <Input
                            type="text"
                            className="h-12 bg-slate-100 dark:bg-slate-900 border-none font-bold"
                            placeholder="e.g. Reliable Hardware"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Phone Number</label>
                            <Input
                                type="text"
                                className="h-12 bg-slate-100 dark:bg-slate-900 border-none font-bold"
                                placeholder="98XXXXXXXX"
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">PAN Number</label>
                            <Input
                                type="text"
                                className="h-12 bg-slate-100 dark:bg-slate-900 border-none font-bold"
                                placeholder="Optional..."
                                value={formData.panNumber}
                                onChange={(e) => setFormData({ ...formData, panNumber: e.target.value })}
                            />
                        </div>
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Email Address</label>
                        <Input
                            type="email"
                            className="h-12 bg-slate-100 dark:bg-slate-900 border-none font-bold"
                            placeholder="vendor@example.com"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Address</label>
                        <textarea
                            className="w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-900 border-none focus:ring-2 focus:ring-primary/20 text-slate-900 dark:text-white font-bold resize-none"
                            rows={3}
                            placeholder="Full address..."
                            value={formData.address}
                            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        ></textarea>
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
                                <div className="animate-spin w-8 h-8 border-4 rounded-full" style={{ borderColor: `${theme.colors.primary} transparent transparent transparent` }}></div>
                            </div>
                        ) : vendorStatement ? (
                            <>
                                <div className="grid grid-cols-3 gap-4 px-6 py-4 border-b border-slate-200 dark:border-slate-700">
                                    {[
                                        { label: 'Total Billed', value: vendorStatement.totalBilled, color: 'text-slate-900 dark:text-white' },
                                        { label: 'Total Paid', value: vendorStatement.totalPaid, color: 'text-green-600 dark:text-green-400' },
                                        { label: 'Outstanding', value: vendorStatement.totalDue, color: vendorStatement.totalDue > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400' },
                                    ].map(({ label, value, color }) => (
                                        <div key={label} className="text-center p-3 rounded-xl bg-slate-50 dark:bg-slate-800">
                                            <p className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-1">{label}</p>
                                            <p className={`text-xl font-extrabold ${color}`}>{formatNPR(value)}</p>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex-1 overflow-y-auto">
                                    <table className="w-full text-sm">
                                        <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                                            <tr>
                                                {['Bill #', 'Date', 'Due Date', 'Total', 'Paid', 'Balance', 'Status'].map(h => (
                                                    <th key={h} className="px-4 py-3 text-left text-xs font-extrabold text-slate-400 uppercase tracking-wider">{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                            {vendorStatement.rows.map((row: any) => (
                                                <tr key={row.id} className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${row.isOverdue && row.balanceDue > 0 ? 'bg-red-50/30 dark:bg-red-900/10' : ''}`}>
                                                    <td className="px-4 py-3 font-bold" style={{ color: theme.colors.primary }}>{row.invoiceNumber}</td>
                                                    <td className="px-4 py-3 text-slate-500">{new Date(row.invoiceDate).toLocaleDateString()}</td>
                                                    <td className="px-4 py-3 text-slate-500">
                                                        <span className={row.isOverdue && row.balanceDue > 0 ? 'text-red-500 font-bold' : ''}>{new Date(row.dueDate).toLocaleDateString()}</span>
                                                    </td>
                                                    <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">{formatNPR(row.totalAmount)}</td>
                                                    <td className="px-4 py-3 font-bold text-green-600 dark:text-green-400">
                                                        <div className="space-y-1">
                                                            {row.paidAmount > 0 ? formatNPR(row.paidAmount) : '—'}
                                                            {(row as any).payments?.map((p: any) => (
                                                                <div key={p.id} className={`flex items-center justify-between gap-2 px-2 py-1 rounded-lg group/payment ${p.status === 'POSTED' ? 'bg-green-50/50 dark:bg-green-900/10' : 'bg-slate-100 dark:bg-slate-800'}`}>
                                                                    <div className="flex flex-col">
                                                                        <span className={`text-[10px] font-extrabold whitespace-nowrap ${p.status === 'POSTED' ? 'text-green-700 dark:text-green-500' : 'text-slate-500'}`}>{formatNPR(p.amount)}</span>
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
                                                        <span className={row.balanceDue > 0 ? (row.isOverdue ? 'text-red-600 dark:text-red-400' : 'text-slate-600 dark:text-slate-400') : 'text-green-600 dark:text-green-400'}>
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
                                            <p className="font-bold">No bills found for this vendor</p>
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

