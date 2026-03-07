import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/services/api';
import { useTheme } from '@/contexts/ThemeContext';
import { Plus, Search, Filter, Edit2, Trash2, BookOpen, Layers, Shield, AlertTriangle, Eye, X, TrendingUp, TrendingDown, ArrowUpDown } from 'lucide-react';
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

interface Account {
    id: string;
    code: string;
    name: string;
    accountType: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
    balance: number;
    description?: string;
    isSystem?: boolean;
}

interface LedgerRow {
    id: string;
    entryDate: string;
    entryNumber: string;
    narration: string;
    description: string;
    referenceType: string;
    debit: number;
    credit: number;
    runningBalance: number;
}

interface LedgerData {
    account: { id: string; code: string; name: string; accountType: string; };
    rows: LedgerRow[];
    totalDebit: number;
    totalCredit: number;
    closingBalance: number;
}

const ACCOUNT_TYPES = ['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'] as const;

const emptyForm = {
    code: '',
    name: '',
    accountType: 'EXPENSE' as Account['accountType'],
    category: 'Operating Expense',
    description: ''
};

export default function AccountsPage() {
    const { theme } = useTheme();
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState<string>('ALL');

    // Add / Edit modal
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingAccount, setEditingAccount] = useState<Account | null>(null);
    const [formData, setFormData] = useState(emptyForm);

    // Delete confirm modal
    const [deleteTarget, setDeleteTarget] = useState<Account | null>(null);

    // General Ledger drawer
    const [ledgerAccount, setLedgerAccount] = useState<Account | null>(null);

    const { data: accounts, isLoading } = useQuery<Account[]>({
        queryKey: ['accounting-accounts'],
        queryFn: async () => {
            const response = await api.get('/accounting/accounts');
            return response.data;
        }
    });

    const { data: ledgerData, isLoading: isLedgerLoading } = useQuery<LedgerData>({
        queryKey: ['account-ledger', ledgerAccount?.id],
        queryFn: async () => {
            const response = await api.get(`/accounting/accounts/${ledgerAccount!.id}/ledger`);
            return response.data;
        },
        enabled: !!ledgerAccount,
    });

    const openAdd = () => {
        setEditingAccount(null);
        setFormData(emptyForm);
        setIsFormOpen(true);
    };

    const openEdit = (account: Account) => {
        setEditingAccount(account);
        setFormData({
            code: account.code,
            name: account.name,
            accountType: account.accountType,
            category: '',
            description: account.description || ''
        });
        setIsFormOpen(true);
    };

    const closeForm = () => {
        setIsFormOpen(false);
        setEditingAccount(null);
        setFormData(emptyForm);
    };

    const createAccount = useMutation({
        mutationFn: async (data: typeof formData) => { await api.post('/accounting/accounts', data); },
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['accounting-accounts'] }); closeForm(); toast.success('Account created successfully'); },
        onError: (error: any) => { toast.error(error.response?.data?.message || 'Failed to create account'); }
    });

    const updateAccount = useMutation({
        mutationFn: async (data: typeof formData) => { await api.put(`/accounting/accounts/${editingAccount!.id}`, data); },
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['accounting-accounts'] }); closeForm(); toast.success('Account updated successfully'); },
        onError: (error: any) => { toast.error(error.response?.data?.message || 'Failed to update account'); }
    });

    const deleteAccount = useMutation({
        mutationFn: async (id: string) => { await api.delete(`/accounting/accounts/${id}`); },
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['accounting-accounts'] }); setDeleteTarget(null); toast.success('Account deleted successfully'); },
        onError: (error: any) => { toast.error(error.response?.data?.message || 'Failed to delete account'); }
    });

    const handleSubmit = () => {
        if (editingAccount) updateAccount.mutate(formData);
        else createAccount.mutate(formData);
    };

    const filteredAccounts = accounts?.filter(acc => {
        const matchesSearch = acc.name.toLowerCase().includes(searchTerm.toLowerCase()) || acc.code.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesFilter = filterType === 'ALL' || acc.accountType === filterType;
        return matchesSearch && matchesFilter;
    });

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'ASSET': return 'bg-blue-600 dark:bg-blue-700 text-white shadow-sm shadow-blue-500/30';
            case 'LIABILITY': return 'bg-amber-500 dark:bg-amber-600 text-white shadow-sm shadow-amber-500/30';
            case 'EQUITY': return 'bg-purple-600 dark:bg-purple-700 text-white shadow-sm shadow-purple-500/30';
            case 'REVENUE': return 'bg-emerald-500 dark:bg-emerald-600 text-white shadow-sm shadow-emerald-500/30';
            case 'EXPENSE': return 'bg-rose-500 dark:bg-rose-600 text-white shadow-sm shadow-rose-500/30';
            default: return 'bg-slate-600 dark:bg-slate-700 text-white shadow-sm shadow-slate-500/30';
        }
    };

    const isPending = createAccount.isPending || updateAccount.isPending;

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
                        <BookOpen className="h-8 w-8" style={{ color: theme.colors.primary }} />
                    </div>
                    <div>
                        <h1 className="text-4xl font-extrabold tracking-tight" style={{ color: theme.colors.text }}>
                            Chart of Accounts
                        </h1>
                        <p className="opacity-70" style={{ color: theme.colors.textSecondary }}>
                            Manage your organization's financial structure
                        </p>
                    </div>
                </div>
                <Button onClick={openAdd} variant="primary" className="shadow-lg shadow-primary/20 scale-105 active:scale-95 transition-transform px-6 h-12 rounded-xl">
                    <Plus className="h-5 w-5 mr-2" />New Account
                </Button>
            </div>

            <Card className="p-5 border-none shadow-sm backdrop-blur-sm" style={{ backgroundColor: `${theme.colors.surface}90`, borderRadius: '16px' }}>
                <div className="flex flex-col md:flex-row items-center gap-4">
                    <div className="flex-2 w-full relative group">
                        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 transition-colors group-focus-within:text-primary" style={{ color: theme.colors.textSecondary }} />
                        <Input type="text" placeholder="Search by name or code..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-12 h-12 bg-transparent border-none focus:ring-2 focus:ring-primary/20 text-lg transition-all" style={{ borderRadius: '12px' }} />
                    </div>
                    <div className="flex items-center gap-4 flex-1">
                        <div className="relative flex-1 group">
                            <Filter className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 transition-colors group-focus-within:text-primary" style={{ color: theme.colors.textSecondary }} />
                            <select className="w-full pl-12 pr-4 h-12 rounded-xl bg-slate-100 dark:bg-slate-900 border-none focus:ring-2 focus:ring-primary/20 text-sm font-bold text-slate-700 dark:text-slate-300 transition-all cursor-pointer appearance-none" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
                                <option value="ALL">All Account Types</option>
                                <option value="ASSET">Assets</option>
                                <option value="LIABILITY">Liabilities</option>
                                <option value="EQUITY">Equity</option>
                                <option value="REVENUE">Revenue</option>
                                <option value="EXPENSE">Expenses</option>
                            </select>
                        </div>
                    </div>
                </div>
            </Card>

            <Card className="overflow-hidden border-none shadow-sm" style={{ backgroundColor: theme.colors.surface, borderRadius: '16px' }}>
                <Table>
                    <TableHeader>
                        <TableRow style={{ borderBottom: `1px solid ${theme.colors.border}` }}>
                            <TableHead className="px-6 py-4 text-xs font-extrabold text-slate-400 uppercase tracking-wider">Code</TableHead>
                            <TableHead className="px-6 py-4 text-xs font-extrabold text-slate-400 uppercase tracking-wider">Account Name</TableHead>
                            <TableHead className="px-6 py-4 text-xs font-extrabold text-slate-400 uppercase tracking-wider">Type</TableHead>
                            <TableHead className="px-6 py-4 text-xs font-extrabold text-slate-400 uppercase tracking-wider text-right">Balance</TableHead>
                            <TableHead className="px-6 py-4 text-xs font-extrabold text-slate-400 uppercase tracking-wider text-center">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredAccounts?.map((account) => (
                            <TableRow key={account.id} className="hover-theme transition-colors group" style={{ borderBottom: `1px solid ${theme.colors.border}` }}>
                                <TableCell className="px-6 py-4 whitespace-nowrap">
                                    <span className="text-xs font-extrabold px-3 py-1 rounded bg-slate-100 dark:bg-slate-900 text-slate-500 uppercase tracking-widest border border-slate-200 dark:border-slate-800">
                                        {account.code}
                                    </span>
                                </TableCell>
                                <TableCell className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-slate-100 dark:bg-slate-900">
                                            {account.isSystem ? <Shield className="h-4 w-4 text-primary/50" /> : <Layers className="h-4 w-4 text-slate-400" />}
                                        </div>
                                        <div>
                                            <div className="font-extrabold text-slate-900 dark:text-white group-hover:text-primary transition-colors">{account.name}</div>
                                            {account.description && <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest opacity-70">{account.description}</div>}
                                            {account.isSystem && <div className="text-[10px] text-primary/60 font-bold uppercase tracking-widest">System Account</div>}
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell className="px-6 py-4 whitespace-nowrap">
                                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${getTypeColor(account.accountType)}`}>
                                        {account.accountType}
                                    </span>
                                </TableCell>
                                <TableCell className={`px-6 py-4 whitespace-nowrap text-right font-extrabold ${account.balance < 0 ? 'text-red-500' : 'text-slate-900 dark:text-white'}`}>
                                    {formatNPR(account.balance)}
                                </TableCell>
                                <TableCell className="px-6 py-4 whitespace-nowrap text-center">
                                    <div className="flex justify-center gap-2">
                                        {/* General Ledger view */}
                                        <button
                                            onClick={() => setLedgerAccount(account)}
                                            title="View General Ledger"
                                            className="p-2 rounded-xl hover-theme-strong text-slate-500 hover:text-indigo-500 transition-colors"
                                        >
                                            <Eye size={16} />
                                        </button>
                                        <button
                                            onClick={() => openEdit(account)}
                                            disabled={account.isSystem}
                                            title={account.isSystem ? 'System accounts cannot be edited' : 'Edit account'}
                                            className="p-2 rounded-xl hover-theme-strong text-slate-500 hover:text-primary transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                        <button
                                            onClick={() => setDeleteTarget(account)}
                                            disabled={account.isSystem}
                                            title={account.isSystem ? 'System accounts cannot be deleted' : 'Delete account'}
                                            className="p-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 text-red-400 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
                {filteredAccounts?.length === 0 && (
                    <div className="p-12 text-center text-slate-400">
                        <div className="w-16 h-16 bg-slate-100 dark:bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-4"><BookOpen size={24} /></div>
                        <p className="font-extrabold">No accounts found</p>
                        <p className="text-sm">Create your first account to build your financial structure.</p>
                    </div>
                )}
            </Card>

            {/* ───────────────── General Ledger Drawer ───────────────── */}
            {ledgerAccount && (
                <div className="fixed inset-0 z-50 flex">
                    <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={() => setLedgerAccount(null)} />
                    <div className="w-full max-w-3xl bg-white dark:bg-slate-900 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-300">
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200 dark:border-slate-700" style={{ backgroundColor: `${theme.colors.primary}08` }}>
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-xl" style={{ backgroundColor: `${theme.colors.primary}20` }}>
                                    <BookOpen className="h-5 w-5" style={{ color: theme.colors.primary }} />
                                </div>
                                <div>
                                    <h2 className="font-extrabold text-lg text-slate-900 dark:text-white">General Ledger</h2>
                                    <p className="text-xs text-slate-500 font-bold">
                                        <span className="font-extrabold text-slate-700 dark:text-slate-300">{ledgerAccount.code} – {ledgerAccount.name}</span>
                                        <span className={`ml-2 px-2 py-0.5 rounded-lg text-[10px] font-extrabold uppercase ${getTypeColor(ledgerAccount.accountType)}`}>{ledgerAccount.accountType}</span>
                                    </p>
                                </div>
                            </div>
                            <button onClick={() => setLedgerAccount(null)} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Summary Cards */}
                        {!isLedgerLoading && ledgerData && (
                            <div className="grid grid-cols-3 gap-4 px-6 py-4 border-b border-slate-100 dark:border-slate-800">
                                <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-xl">
                                    <div className="flex items-center gap-2 mb-1">
                                        <TrendingUp size={14} className="text-green-600 dark:text-green-400" />
                                        <span className="text-[10px] font-extrabold text-green-600 dark:text-green-400 uppercase tracking-widest">Total Debit</span>
                                    </div>
                                    <p className="text-lg font-extrabold text-green-700 dark:text-green-300">{formatNPR(ledgerData.totalDebit)}</p>
                                </div>
                                <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-xl">
                                    <div className="flex items-center gap-2 mb-1">
                                        <TrendingDown size={14} className="text-red-500 dark:text-red-400" />
                                        <span className="text-[10px] font-extrabold text-red-500 dark:text-red-400 uppercase tracking-widest">Total Credit</span>
                                    </div>
                                    <p className="text-lg font-extrabold text-red-600 dark:text-red-300">{formatNPR(ledgerData.totalCredit)}</p>
                                </div>
                                <div className="p-3 rounded-xl" style={{ backgroundColor: `${theme.colors.primary}12` }}>
                                    <div className="flex items-center gap-2 mb-1">
                                        <ArrowUpDown size={14} style={{ color: theme.colors.primary }} />
                                        <span className="text-[10px] font-extrabold uppercase tracking-widest" style={{ color: theme.colors.primary }}>Closing Balance</span>
                                    </div>
                                    <p className="text-lg font-extrabold" style={{ color: theme.colors.primary }}>{formatNPR(Math.abs(ledgerData.closingBalance))} {ledgerData.closingBalance >= 0 ? 'Dr' : 'Cr'}</p>
                                </div>
                            </div>
                        )}

                        {/* Ledger Table */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar">
                            {isLedgerLoading ? (
                                <div className="p-8 space-y-3 animate-pulse">
                                    {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-12 bg-slate-100 dark:bg-slate-800 rounded-xl" />)}
                                </div>
                            ) : !ledgerData || ledgerData.rows.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                                    <BookOpen size={40} className="mb-3 opacity-30" />
                                    <p className="font-extrabold">No transactions yet</p>
                                    <p className="text-sm mt-1">Post invoices or journal entries to see ledger activity.</p>
                                </div>
                            ) : (
                                <table className="w-full text-sm">
                                    <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800/80 backdrop-blur-sm z-10">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Date</th>
                                            <th className="px-4 py-3 text-left text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Entry #</th>
                                            <th className="px-4 py-3 text-left text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Description</th>
                                            <th className="px-4 py-3 text-right text-[10px] font-extrabold text-green-500 uppercase tracking-wider">DR</th>
                                            <th className="px-4 py-3 text-right text-[10px] font-extrabold text-red-500 uppercase tracking-wider">CR</th>
                                            <th className="px-4 py-3 text-right text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Balance</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {ledgerData.rows.map((row, idx) => (
                                            <tr key={row.id} className={`border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${idx % 2 === 0 ? '' : 'bg-slate-50/50 dark:bg-slate-800/20'}`}>
                                                <td className="px-4 py-3 whitespace-nowrap text-xs font-bold text-slate-500">
                                                    {new Date(row.entryDate).toLocaleDateString('en-NP', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    <span className="text-xs font-extrabold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400">{row.entryNumber}</span>
                                                </td>
                                                <td className="px-4 py-3 text-xs text-slate-700 dark:text-slate-300 max-w-[200px]">
                                                    <div className="font-bold truncate">{row.description || row.narration}</div>
                                                    {row.referenceType && <div className="text-[10px] text-slate-400 uppercase tracking-widest">{row.referenceType}</div>}
                                                </td>
                                                <td className="px-4 py-3 text-right whitespace-nowrap text-xs font-extrabold text-green-600 dark:text-green-400">
                                                    {row.debit > 0 ? formatNPR(row.debit) : <span className="text-slate-300 dark:text-slate-700">—</span>}
                                                </td>
                                                <td className="px-4 py-3 text-right whitespace-nowrap text-xs font-extrabold text-red-500 dark:text-red-400">
                                                    {row.credit > 0 ? formatNPR(row.credit) : <span className="text-slate-300 dark:text-slate-700">—</span>}
                                                </td>
                                                <td className="px-4 py-3 text-right whitespace-nowrap">
                                                    <span className={`text-xs font-extrabold ${row.runningBalance >= 0 ? 'text-slate-900 dark:text-white' : 'text-red-500'}`}>
                                                        {formatNPR(Math.abs(row.runningBalance))}
                                                        <span className="text-[10px] ml-1 font-bold opacity-60">{row.runningBalance >= 0 ? 'Dr' : 'Cr'}</span>
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    {/* Footer totals */}
                                    <tfoot className="sticky bottom-0 bg-white dark:bg-slate-900 border-t-2 border-slate-200 dark:border-slate-700">
                                        <tr>
                                            <td colSpan={3} className="px-4 py-3 text-xs font-extrabold text-slate-500 uppercase tracking-wider">Totals</td>
                                            <td className="px-4 py-3 text-right text-sm font-extrabold text-green-600 dark:text-green-400">{formatNPR(ledgerData.totalDebit)}</td>
                                            <td className="px-4 py-3 text-right text-sm font-extrabold text-red-500 dark:text-red-400">{formatNPR(ledgerData.totalCredit)}</td>
                                            <td className="px-4 py-3 text-right">
                                                <span className={`text-sm font-extrabold ${ledgerData.closingBalance >= 0 ? 'text-slate-900 dark:text-white' : 'text-red-500'}`}>
                                                    {formatNPR(Math.abs(ledgerData.closingBalance))}
                                                    <span className="text-[10px] ml-1 font-bold opacity-60">{ledgerData.closingBalance >= 0 ? 'Dr' : 'Cr'}</span>
                                                </span>
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Add / Edit Account Modal */}
            <Modal isOpen={isFormOpen} onClose={closeForm} title={editingAccount ? 'Edit Account' : 'Add New Account'} size="md" theme={{ colors: theme.colors }}
                footer={
                    <div className="flex gap-3 w-full">
                        <Button onClick={closeForm} variant="ghost" className="flex-1 px-6 py-3 rounded-xl bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold border border-slate-200 dark:border-slate-700 hover-theme-strong">Cancel</Button>
                        <Button onClick={handleSubmit} disabled={isPending || !formData.code || !formData.name} variant="primary" className="flex-1 px-6 py-3 rounded-xl font-bold shadow-lg shadow-primary/20 scale-105 active:scale-95 transition-transform" isLoading={isPending}>
                            {isPending ? (editingAccount ? 'Saving...' : 'Creating...') : (editingAccount ? 'Save Changes' : 'Create Account')}
                        </Button>
                    </div>
                }
            >
                <div className="p-1 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Account Code</label>
                            <Input type="text" className="h-12 bg-slate-100 dark:bg-slate-900 border-none font-bold" placeholder="e.g. 5120" value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Type</label>
                            <select className="w-full px-4 py-3 h-12 rounded-xl bg-slate-100 dark:bg-slate-900 border-none focus:ring-2 focus:ring-primary/20 text-slate-700 dark:text-slate-300 font-bold cursor-pointer" value={formData.accountType} onChange={(e) => setFormData({ ...formData, accountType: e.target.value as Account['accountType'] })}>
                                {ACCOUNT_TYPES.map(t => <option key={t} value={t}>{t.charAt(0) + t.slice(1).toLowerCase()}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Account Name</label>
                        <Input type="text" className="h-12 bg-slate-100 dark:bg-slate-900 border-none font-bold" placeholder="e.g. Office Rent" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Category <span className="text-slate-300 normal-case">(optional)</span></label>
                        <Input type="text" className="h-12 bg-slate-100 dark:bg-slate-900 border-none font-bold" placeholder="e.g. Current Asset" value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Description <span className="text-slate-300 normal-case">(optional)</span></label>
                        <textarea className="w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-900 border-none focus:ring-2 focus:ring-primary/20 text-slate-900 dark:text-white font-bold resize-none" rows={3} placeholder="Optional description..." value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })}></textarea>
                    </div>
                </div>
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Account" size="sm" theme={{ colors: theme.colors }}
                footer={
                    <div className="flex gap-3 w-full">
                        <Button onClick={() => setDeleteTarget(null)} variant="ghost" className="flex-1 px-6 py-3 rounded-xl bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold border border-slate-200 dark:border-slate-700">Cancel</Button>
                        <Button onClick={() => deleteAccount.mutate(deleteTarget!.id)} disabled={deleteAccount.isPending} variant="ghost" className="flex-1 px-6 py-3 rounded-xl font-bold bg-red-500 hover:bg-red-600 text-white scale-105 active:scale-95 transition-transform" isLoading={deleteAccount.isPending}>
                            {deleteAccount.isPending ? 'Deleting...' : 'Yes, Delete'}
                        </Button>
                    </div>
                }
            >
                <div className="p-2 space-y-4">
                    <div className="flex items-start gap-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-100 dark:border-red-800/50">
                        <AlertTriangle size={20} className="shrink-0 text-red-500 mt-0.5" />
                        <div>
                            <p className="font-bold text-slate-900 dark:text-white text-sm">This action cannot be undone.</p>
                            <p className="text-xs text-slate-500 mt-1">
                                The account <span className="font-extrabold text-slate-700 dark:text-slate-300">{deleteTarget?.code} – {deleteTarget?.name}</span> will be permanently removed. Accounts with a non-zero balance or sub-accounts cannot be deleted.
                            </p>
                        </div>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
