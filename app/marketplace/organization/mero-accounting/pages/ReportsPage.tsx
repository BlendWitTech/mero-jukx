import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/services/api';
import { useTheme } from '@/contexts/ThemeContext';
import toast from '@shared/hooks/useToast';
import {
    Download,
    Printer,
    Calendar as CalendarIcon,
    FileText,
    TrendingUp,
    BarChart3,
    Scale,
    PieChart,
    Activity,
    LineChart,
    Target,
    BookMarked,
    Plus,
    Trash2,
} from 'lucide-react';
import { formatNPR } from '@/utils/nepaliDateUtils';
import {
    Card,
    Button,
    Table,
    TableHeader,
    TableBody,
    TableRow,
    TableHead,
    TableCell,
} from '@shared';

type ReportTab = 'PL' | 'TB' | 'BS' | 'S3' | 'CF' | 'CA' | 'RAT' | 'CON' | 'NOTES';
type NoteSection = 'ASSETS' | 'LIABILITIES' | 'EQUITY' | 'REVENUE' | 'EXPENSES' | 'OTHER';

function LoadingSkeleton() {
    return <div className="h-64 bg-slate-100 dark:bg-slate-800 rounded-2xl animate-pulse" />;
}

function SectionHeader({ icon, label, color }: { icon: React.ReactNode; label: string; color: string }) {
    return (
        <div className="flex items-center gap-3 border-b-2 border-slate-100 dark:border-slate-700 pb-3">
            <div className={`p-2 rounded-lg`} style={{ backgroundColor: color + '18' }}>
                <span style={{ color }}>{icon}</span>
            </div>
            <h3 className="text-lg font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">{label}</h3>
        </div>
    );
}

function AccountRow({ name, amount }: { name: string; amount: number }) {
    return (
        <div className="flex justify-between items-center px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-900/50 rounded-xl transition-colors group">
            <span className="font-bold text-slate-500 group-hover:text-slate-800 dark:group-hover:text-white transition-colors">{name}</span>
            <span className="font-extrabold text-slate-800 dark:text-white">{formatNPR(amount)}</span>
        </div>
    );
}

export default function ReportsPage() {
    const { theme } = useTheme();
    const [activeTab, setActiveTab] = useState<ReportTab>('PL');
    const [dateRange, setDateRange] = useState({
        startDate: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0]
    });

    const { data: plData, isLoading: isLoadingPL } = useQuery({
        queryKey: ['accounting-pl', dateRange],
        queryFn: async () => {
            const response = await api.get(`/accounting/reports/profit-and-loss?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`);
            return response.data;
        },
        enabled: activeTab === 'PL'
    });

    const { data: tbData, isLoading: isLoadingTB } = useQuery({
        queryKey: ['accounting-tb'],
        queryFn: async () => {
            const response = await api.get('/accounting/reports/trial-balance');
            return response.data;
        },
        enabled: activeTab === 'TB'
    });

    const { data: bsData, isLoading: isLoadingBS } = useQuery({
        queryKey: ['accounting-bs'],
        queryFn: async () => {
            const response = await api.get('/accounting/reports/balance-sheet');
            return response.data;
        },
        enabled: activeTab === 'BS'
    });

    const { data: s3Data, isLoading: isLoadingS3 } = useQuery({
        queryKey: ['accounting-s3'],
        queryFn: async () => {
            const response = await api.get('/accounting/reports/schedule-iii');
            return response.data;
        },
        enabled: activeTab === 'S3'
    });

    const [caPeriod, setCaPeriod] = useState<'MoM' | 'QoQ' | 'YoY'>('YoY');

    const { data: cfData, isLoading: isLoadingCF } = useQuery({
        queryKey: ['accounting-cf'],
        queryFn: async () => {
            const response = await api.get('/accounting/reports/cash-flow');
            return response.data;
        },
        enabled: activeTab === 'CF'
    });

    const { data: caData, isLoading: isLoadingCA } = useQuery({
        queryKey: ['accounting-ca', caPeriod],
        queryFn: async () => {
            const response = await api.get(`/accounting/reports/comparative-analysis?period=${caPeriod}`);
            return response.data;
        },
        enabled: activeTab === 'CA'
    });

    const { data: ratData, isLoading: isLoadingRAT } = useQuery({
        queryKey: ['accounting-rat'],
        queryFn: async () => {
            const response = await api.get('/accounting/reports/ratios');
            return response.data;
        },
        enabled: activeTab === 'RAT'
    });

    const [conDateRange, setConDateRange] = useState({
        startDate: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0]
    });

    const { data: conPlData, isLoading: isLoadingConPL } = useQuery({
        queryKey: ['accounting-con-pl', conDateRange],
        queryFn: async () => {
            const response = await api.get(`/accounting/reports/consolidated/profit-and-loss?startDate=${conDateRange.startDate}&endDate=${conDateRange.endDate}`);
            return response.data;
        },
        enabled: activeTab === 'CON'
    });

    const { data: conBsData, isLoading: isLoadingConBS } = useQuery({
        queryKey: ['accounting-con-bs'],
        queryFn: async () => {
            const response = await api.get('/accounting/reports/consolidated/balance-sheet');
            return response.data;
        },
        enabled: activeTab === 'CON'
    });

    // Notes state
    const queryClient = useQueryClient();
    const [notesFiscalYear, setNotesFiscalYear] = useState(() => {
        const now = new Date();
        const nepaliYear = now.getFullYear() - 56; // approximate AD to BS conversion
        return `${nepaliYear}-${String(nepaliYear + 1).slice(-2)}`;
    });
    const [notesSection, setNotesSection] = useState<NoteSection>('ASSETS');
    const [notesTitle, setNotesTitle] = useState('');
    const [notesContent, setNotesContent] = useState('');
    const [editingNoteId, setEditingNoteId] = useState<string | null>(null);

    const { data: notesData = [], isLoading: isLoadingNotes } = useQuery<any[]>({
        queryKey: ['accounting-notes', notesFiscalYear],
        queryFn: async () => {
            const res = await api.get(`/accounting/financial-notes?fiscalYear=${notesFiscalYear}`);
            return res.data;
        },
        enabled: activeTab === 'NOTES',
    });

    const createNoteMutation = useMutation({
        mutationFn: (data: any) => editingNoteId
            ? api.patch(`/accounting/financial-notes/${editingNoteId}`, data)
            : api.post('/accounting/financial-notes', data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['accounting-notes', notesFiscalYear] });
            setNotesTitle('');
            setNotesContent('');
            setEditingNoteId(null);
            toast.success(editingNoteId ? 'Note updated' : 'Note added');
        },
        onError: () => toast.error('Failed to save note'),
    });

    const deleteNoteMutation = useMutation({
        mutationFn: (id: string) => api.delete(`/accounting/financial-notes/${id}`),
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['accounting-notes', notesFiscalYear] }); toast.success('Note deleted'); },
        onError: () => toast.error('Failed to delete note'),
    });

    const tabs = [
        { id: 'PL', name: 'Profit & Loss', icon: TrendingUp },
        { id: 'TB', name: 'Trial Balance', icon: BarChart3 },
        { id: 'BS', name: 'Balance Sheet', icon: Scale },
        { id: 'S3', name: 'Schedule III', icon: FileText },
        { id: 'CF', name: 'Cash Flow', icon: Activity },
        { id: 'CA', name: 'Comparative', icon: LineChart },
        { id: 'RAT', name: 'Ratios', icon: Target },
        { id: 'CON', name: 'Consolidated', icon: BarChart3 },
        { id: 'NOTES', name: 'Notes', icon: BookMarked },
    ];

    const netProfit: number = plData?.netProfit ?? 0;
    const isProfit = netProfit >= 0;

    return (
        <div className="p-8 max-w-[1600px] mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="p-3 rounded-2xl" style={{ backgroundColor: `${theme.colors.primary}15` }}>
                        <PieChart className="h-8 w-8" style={{ color: theme.colors.primary }} />
                    </div>
                    <div>
                        <h1 className="text-4xl font-extrabold tracking-tight" style={{ color: theme.colors.text }}>
                            Financial Reports
                        </h1>
                        <p className="opacity-70" style={{ color: theme.colors.textSecondary }}>
                            Analyze your organization's financial health and performance
                        </p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <Button variant="ghost" className="h-12 w-12 p-0 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                        <Printer size={20} />
                    </Button>
                    <Button
                        variant="ghost"
                        className="px-6 h-12 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 font-bold hover-theme-strong transition-all active:scale-95 shadow-sm"
                    >
                        <Download className="h-5 w-5 mr-2" />
                        Export PDF
                    </Button>
                </div>
            </div>

            {/* Tab Bar */}
            <div className="flex gap-2 p-1.5 bg-slate-100/50 dark:bg-slate-900/50 rounded-2xl w-fit backdrop-blur-sm">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as ReportTab)}
                        className={`flex items-center gap-2 px-6 py-3 text-sm font-extrabold rounded-xl transition-all ${activeTab === tab.id
                            ? 'bg-white dark:bg-slate-800 shadow-sm'
                            : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                            }`}
                        style={activeTab === tab.id ? { color: theme.colors.primary } : {}}
                    >
                        <tab.icon size={18} />
                        {tab.name}
                    </button>
                ))}
            </div>

            {/* ───────────────── PROFIT & LOSS ───────────────── */}
            {activeTab === 'PL' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {/* Date Filter */}
                    <div className="flex items-center gap-4 bg-white dark:bg-slate-800 p-5 rounded-2xl border shadow-sm" style={{ borderColor: theme.colors.border }}>
                        <div className="flex flex-wrap items-center gap-4">
                            {[['startDate', 'From'], ['endDate', 'To']].map(([key, label]) => (
                                <React.Fragment key={key}>
                                    {label !== 'From' && <span className="text-[10px] text-slate-400 font-extrabold tracking-widest uppercase">To</span>}
                                    <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-900 rounded-xl px-4 py-2 border" style={{ borderColor: theme.colors.border }}>
                                        <CalendarIcon size={18} className="text-slate-400" />
                                        <input
                                            type="date"
                                            className="bg-transparent border-none p-0 text-sm font-bold focus:ring-0 cursor-pointer"
                                            style={{ color: theme.colors.text }}
                                            value={dateRange[key as keyof typeof dateRange]}
                                            onChange={(e) => setDateRange({ ...dateRange, [key]: e.target.value })}
                                        />
                                    </div>
                                </React.Fragment>
                            ))}
                        </div>
                    </div>

                    {isLoadingPL ? <LoadingSkeleton /> : (
                        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-8">
                            <h2 className="text-xl font-extrabold text-center mb-12 uppercase tracking-widest text-slate-400">
                                Statement of Profit &amp; Loss
                            </h2>
                            <div className="max-w-4xl mx-auto space-y-12">

                                {/* Revenue */}
                                <section className="space-y-4">
                                    <SectionHeader icon={<TrendingUp size={18} />} label="Revenue" color="#22c55e" />
                                    <div className="space-y-1">
                                        {plData?.revenue?.length === 0 && (
                                            <p className="text-sm text-slate-400 px-4 py-2">No revenue accounts with activity.</p>
                                        )}
                                        {plData?.revenue?.map((acc: any) => (
                                            <AccountRow key={acc.id} name={acc.name} amount={acc.displayBalance} />
                                        ))}
                                        <div className="flex justify-between items-center p-5 rounded-2xl border mt-4" style={{ backgroundColor: `${theme.colors.primary}05`, borderColor: `${theme.colors.primary}20` }}>
                                            <span className="font-extrabold uppercase tracking-widest text-xs" style={{ color: theme.colors.primary }}>Total Revenue</span>
                                            <span className="font-extrabold text-xl" style={{ color: theme.colors.primary }}>{formatNPR(plData?.totalRevenue || 0)}</span>
                                        </div>
                                    </div>
                                </section>

                                {/* Expenses */}
                                <section className="space-y-4">
                                    <SectionHeader icon={<TrendingUp size={18} className="rotate-180" />} label="Expenses" color="#ef4444" />
                                    <div className="space-y-1">
                                        {plData?.expense?.length === 0 && (
                                            <p className="text-sm text-slate-400 px-4 py-2">No expense accounts with activity.</p>
                                        )}
                                        {plData?.expense?.map((acc: any) => (
                                            <AccountRow key={acc.id} name={acc.name} amount={acc.displayBalance} />
                                        ))}
                                        <div className="flex justify-between items-center p-5 rounded-2xl border mt-4" style={{ backgroundColor: '#ef444408', borderColor: '#ef444420' }}>
                                            <span className="font-extrabold text-red-500 uppercase tracking-widest text-xs">Total Expenses</span>
                                            <span className="font-extrabold text-red-500 text-xl">{formatNPR(plData?.totalExpense || 0)}</span>
                                        </div>
                                    </div>
                                </section>

                                {/* Net Profit/Loss */}
                                <div className="pt-6 border-t-4 border-double border-slate-200 dark:border-slate-700">
                                    <div
                                        className={`flex justify-between items-center p-8 rounded-2xl shadow-xl transition-all`}
                                        style={isProfit
                                            ? { color: theme.colors.primary, backgroundColor: `${theme.colors.primary}15` }
                                            : { backgroundColor: '#ef4444', color: '#fff' }
                                        }
                                    >
                                        <span className="text-xl font-extrabold">{isProfit ? 'NET PROFIT' : 'NET LOSS'}</span>
                                        <span className="text-3xl font-extrabold">{formatNPR(Math.abs(netProfit))}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ───────────────── TRIAL BALANCE ───────────────── */}
            {activeTab === 'TB' && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {isLoadingTB ? <LoadingSkeleton /> : (() => {
                        const totalDebit = tbData?.reduce((s: number, a: any) => s + (a.debit || 0), 0) || 0;
                        const totalCredit = tbData?.reduce((s: number, a: any) => s + (a.credit || 0), 0) || 0;
                        const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;
                        return (
                            <div className="space-y-4">
                                <Card className="overflow-hidden border shadow-sm" style={{ backgroundColor: theme.colors.surface, borderRadius: '24px', borderColor: theme.colors.border }}>
                                    <Table>
                                        <TableHeader>
                                            <TableRow style={{ borderBottom: `1px solid ${theme.colors.border}`, backgroundColor: `${theme.colors.primary}05` }}>
                                                <TableHead className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest">Account</TableHead>
                                                <TableHead className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest">Type</TableHead>
                                                <TableHead className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest text-right">Debit (DR)</TableHead>
                                                <TableHead className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest text-right">Credit (CR)</TableHead>
                                                <TableHead className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest text-right">Net Balance</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {tbData?.length === 0 && (
                                                <TableRow>
                                                    <TableCell colSpan={5} className="px-6 py-12 text-center text-slate-400 font-bold">
                                                        No posted transactions found. Post journal entries to see the trial balance.
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                            {tbData?.map((acc: any) => {
                                                const net = acc.netBalance ?? (acc.debit - acc.credit);
                                                return (
                                                    <TableRow key={acc.code} className="hover-theme transition-colors" style={{ borderBottom: `1px solid ${theme.colors.border}` }}>
                                                        <TableCell className="px-6 py-4 font-bold" style={{ color: theme.colors.text }}>{acc.name}</TableCell>
                                                        <TableCell className="px-6 py-4 text-xs">
                                                            <span className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-900 text-slate-500 font-extrabold uppercase tracking-widest">{acc.accountType}</span>
                                                        </TableCell>
                                                        <TableCell className="px-6 py-4 text-right font-extrabold text-slate-700 dark:text-slate-300">
                                                            {acc.debit > 0 ? formatNPR(acc.debit) : '—'}
                                                        </TableCell>
                                                        <TableCell className="px-6 py-4 text-right font-extrabold text-slate-700 dark:text-slate-300">
                                                            {acc.credit > 0 ? formatNPR(acc.credit) : '—'}
                                                        </TableCell>
                                                        <TableCell className="px-6 py-4 text-right font-extrabold">
                                                            <span className={net >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-orange-600 dark:text-orange-400'}>
                                                                {net >= 0 ? `Dr ${formatNPR(net)}` : `Cr ${formatNPR(Math.abs(net))}`}
                                                            </span>
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                        <tfoot>
                                            <TableRow className="bg-slate-50/50 dark:bg-slate-900/40" style={{ borderTop: `2px solid ${theme.colors.border}` }}>
                                                <TableCell className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest" colSpan={2}>Totals</TableCell>
                                                <TableCell className="px-6 py-4 text-right font-extrabold" style={{ color: theme.colors.primary }}>
                                                    {formatNPR(totalDebit)}
                                                </TableCell>
                                                <TableCell className="px-6 py-4 text-right font-extrabold" style={{ color: theme.colors.primary }}>
                                                    {formatNPR(totalCredit)}
                                                </TableCell>
                                                <TableCell className="px-6 py-4 text-right text-xs font-extrabold">
                                                    {isBalanced
                                                        ? <span className="text-green-600 dark:text-green-400">✓ Balanced</span>
                                                        : <span className="text-red-500">⚠ Off by {formatNPR(Math.abs(totalDebit - totalCredit))}</span>
                                                    }
                                                </TableCell>
                                            </TableRow>
                                        </tfoot>
                                    </Table>
                                </Card>
                                {/* Balance check banner */}
                                <div className={`p-4 rounded-2xl text-center text-sm font-bold border ${isBalanced
                                    ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-600 dark:text-green-400'
                                    : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-500'}`}>
                                    {isBalanced
                                        ? `✓ Trial Balance is balanced — Total DR ${formatNPR(totalDebit)} = Total CR ${formatNPR(totalCredit)}`
                                        : `⚠ Trial Balance out of balance — DR ${formatNPR(totalDebit)} ≠ CR ${formatNPR(totalCredit)} (difference: ${formatNPR(Math.abs(totalDebit - totalCredit))})`
                                    }
                                </div>
                            </div>
                        );
                    })()}
                </div>
            )}


            {/* ───────────────── BALANCE SHEET ───────────────── */}
            {activeTab === 'BS' && (
                <div className="animate-in fade-in duration-500">
                    {isLoadingBS ? <LoadingSkeleton /> : (
                        <div className="bg-white dark:bg-slate-800 rounded-3xl border shadow-sm overflow-hidden p-8" style={{ borderColor: theme.colors.border }}>
                            <h2 className="text-xl font-extrabold text-center mb-12 uppercase tracking-widest text-slate-400">Condensed Balance Sheet</h2>

                            {/* Summary Cards */}
                            <div className="grid grid-cols-3 gap-4 mb-10">
                                {[
                                    { label: 'Total Assets', value: bsData?.totalAssets || 0, color: theme.colors.primary },
                                    { label: 'Total Liabilities', value: bsData?.totalLiabilities || 0, color: '#f59e0b' },
                                    { label: 'Total Equity', value: bsData?.totalEquity || 0, color: '#22c55e' },
                                ].map(({ label, value, color }) => (
                                    <div key={label} className="p-5 rounded-2xl border text-center" style={{ backgroundColor: color + '10', borderColor: color + '30' }}>
                                        <p className="text-[10px] font-extrabold uppercase tracking-widest mb-1" style={{ color }}>{label}</p>
                                        <p className="text-2xl font-extrabold" style={{ color }}>{formatNPR(value)}</p>
                                    </div>
                                ))}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                {/* Assets */}
                                <div className="p-6 rounded-2xl border shadow-sm" style={{ backgroundColor: `${theme.colors.primary}08`, borderColor: `${theme.colors.primary}20` }}>
                                    <h3 className="font-extrabold mb-6 flex items-center gap-2" style={{ color: theme.colors.primary }}>
                                        <div className="p-2 rounded-lg" style={{ backgroundColor: `${theme.colors.primary}15` }}><Scale size={18} /></div>
                                        ASSETS
                                    </h3>
                                    <div className="space-y-3">
                                        {bsData?.assets?.length === 0 && <p className="text-sm text-slate-400">No asset accounts.</p>}
                                        {bsData?.assets?.map((a: any) => (
                                            <div key={a.id} className="flex justify-between items-center text-sm">
                                                <span className="font-bold text-slate-500 uppercase tracking-tight text-[11px]">{a.name}</span>
                                                <span className="font-extrabold" style={{ color: theme.colors.text }}>{formatNPR(a.displayBalance)}</span>
                                            </div>
                                        ))}
                                        <div className="pt-4 border-t flex justify-between items-center" style={{ borderColor: `${theme.colors.primary}20` }}>
                                            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Total Assets</span>
                                            <span className="font-extrabold text-lg" style={{ color: theme.colors.primary }}>{formatNPR(bsData?.totalAssets || 0)}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Liabilities */}
                                <div className="p-6 rounded-2xl bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/20 shadow-sm">
                                    <h3 className="font-extrabold text-amber-600 mb-6 flex items-center gap-2">
                                        <div className="p-2 rounded-lg bg-amber-100/50 dark:bg-amber-900/30"><FileText size={18} /></div>
                                        LIABILITIES
                                    </h3>
                                    <div className="space-y-3">
                                        {bsData?.liabilities?.length === 0 && <p className="text-sm text-slate-400">No liability accounts.</p>}
                                        {bsData?.liabilities?.map((a: any) => (
                                            <div key={a.id} className="flex justify-between items-center text-sm">
                                                <span className="text-slate-500 font-bold uppercase tracking-tight text-[11px]">{a.name}</span>
                                                <span className="font-extrabold text-slate-900 dark:text-white">{formatNPR(a.displayBalance)}</span>
                                            </div>
                                        ))}
                                        <div className="pt-4 border-t border-amber-100 dark:border-amber-900/20 flex justify-between items-center">
                                            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Total Liabilities</span>
                                            <span className="font-extrabold text-lg text-amber-600">{formatNPR(bsData?.totalLiabilities || 0)}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Equity */}
                                <div className="p-6 rounded-2xl bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-900/20 shadow-sm">
                                    <h3 className="font-extrabold text-green-600 mb-6 flex items-center gap-2">
                                        <div className="p-2 rounded-lg bg-green-100/50 dark:bg-green-900/30"><TrendingUp size={18} /></div>
                                        EQUITY
                                    </h3>
                                    <div className="space-y-3">
                                        {bsData?.equity?.length === 0 && <p className="text-sm text-slate-400">No equity accounts.</p>}
                                        {bsData?.equity?.map((a: any) => (
                                            <div key={a.id} className="flex justify-between items-center text-sm">
                                                <span className="text-slate-500 font-bold uppercase tracking-tight text-[11px]">{a.name}</span>
                                                <span className="font-extrabold text-slate-900 dark:text-white">{formatNPR(a.displayBalance)}</span>
                                            </div>
                                        ))}
                                        <div className="pt-4 border-t border-green-100 dark:border-green-900/20 flex justify-between items-center">
                                            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Total Equity</span>
                                            <span className="font-extrabold text-lg text-green-600">{formatNPR(bsData?.totalEquity || 0)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Accounting Equation Check */}
                            <div className={`mt-8 p-4 rounded-2xl text-center text-sm font-bold border ${Math.abs((bsData?.totalAssets || 0) - (bsData?.totalLiabilities || 0) - (bsData?.totalEquity || 0)) < 0.01
                                ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-600'
                                : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-500'
                                }`}>
                                {Math.abs((bsData?.totalAssets || 0) - (bsData?.totalLiabilities || 0) - (bsData?.totalEquity || 0)) < 0.01
                                    ? '✓ Balance Sheet is balanced — Assets = Liabilities + Equity'
                                    : `⚠ Balance Sheet out of balance by ${formatNPR(Math.abs((bsData?.totalAssets || 0) - (bsData?.totalLiabilities || 0) - (bsData?.totalEquity || 0)))}`
                                }
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ───────────────── SCHEDULE III ───────────────── */}
            {activeTab === 'S3' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {isLoadingS3 ? <LoadingSkeleton /> : (
                        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden p-8">
                            <h2 className="text-xl font-extrabold text-center mb-12 uppercase tracking-widest text-slate-400">Financial Statement (Schedule III)</h2>
                            <div className="max-w-4xl mx-auto space-y-12">
                                {(!s3Data || s3Data.every((g: any) => g.total === 0)) && (
                                    <p className="text-center text-slate-400 font-bold">No transactions to display. Post journal entries to generate Schedule III.</p>
                                )}
                                {s3Data?.filter((g: any) => g.total > 0).map((group: any) => (
                                    <section key={group.title} className="space-y-4">
                                        <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-700 pb-3">
                                            <div className="p-2 rounded-lg" style={{ backgroundColor: `${theme.colors.primary}15` }}>
                                                <FileText className="h-5 w-5" style={{ color: theme.colors.primary }} />
                                            </div>
                                            <h3 className="text-lg font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">{group.title}</h3>
                                        </div>
                                        <div className="space-y-6 pl-4">
                                            {group.sections.filter((s: any) => s.total > 0).map((section: any) => (
                                                <div key={section.title} className="space-y-3">
                                                    <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">{section.title}</h4>
                                                    <div className="space-y-2 pl-4">
                                                        {section.accounts.map((acc: any) => (
                                                            <div key={acc.id} className="flex justify-between items-center py-1 group">
                                                                <span className="text-sm text-slate-600 dark:text-slate-400 font-bold group-hover:text-slate-900 dark:group-hover:text-white transition-colors">{acc.name}</span>
                                                                <span className="text-sm font-bold text-slate-900 dark:text-white">{formatNPR(acc.displayBalance)}</span>
                                                            </div>
                                                        ))}
                                                        <div className="flex justify-between items-center pt-3 border-t font-extrabold text-slate-900 dark:text-white" style={{ borderColor: theme.colors.border }}>
                                                            <span className="text-xs uppercase tracking-tight text-slate-500">Total {section.title}</span>
                                                            <span>{formatNPR(section.total)}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                            <div className="flex justify-between items-center p-5 rounded-2xl border shadow-sm" style={{ backgroundColor: `${theme.colors.primary}05`, borderColor: `${theme.colors.primary}20` }}>
                                                <span className="font-extrabold uppercase tracking-widest text-xs" style={{ color: theme.colors.primary }}>
                                                    TOTAL {group.title.toUpperCase()}
                                                </span>
                                                <span className="font-extrabold text-xl" style={{ color: theme.colors.primary }}>{formatNPR(group.total)}</span>
                                            </div>
                                        </div>
                                    </section>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ───────────────── CASH FLOW STATEMENT ───────────────── */}
            {activeTab === 'CF' && (
                <div className="space-y-6 animate-in fade-in duration-500">
                    {isLoadingCF ? <LoadingSkeleton /> : (
                        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden p-8">
                            <h2 className="text-xl font-extrabold text-center mb-12 uppercase tracking-widest text-slate-400">Statement of Cash Flows (Indirect Method)</h2>
                            <div className="max-w-4xl mx-auto space-y-12">
                                {/* Operating */}
                                <section className="space-y-4">
                                    <SectionHeader icon={<Activity size={18} />} label="Cash Flows from Operating Activities" color={theme.colors.primary} />
                                    <div className="space-y-2 pl-4">
                                        <AccountRow name="Net Profit" amount={cfData?.operating?.netProfit || 0} />
                                        <AccountRow name="Depreciation & Amortization" amount={cfData?.operating?.depreciation || 0} />
                                        <div className="text-xs font-extrabold uppercase tracking-widest text-slate-400 pt-4 pb-2">Changes in Working Capital</div>
                                        {cfData?.operating?.changesInWorkingCapital?.map((w: any, idx: number) => (
                                            <AccountRow key={idx} name={w.name} amount={w.amount} />
                                        ))}
                                        <div className="flex justify-between items-center p-5 rounded-2xl border mt-4 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700">
                                            <span className="font-extrabold text-sm text-slate-900 dark:text-white uppercase tracking-widest">Net Cash from Operating Activities</span>
                                            <span className="font-extrabold text-lg text-slate-900 dark:text-white">{formatNPR(cfData?.operating?.total || 0)}</span>
                                        </div>
                                    </div>
                                </section>

                                {/* Investing */}
                                <section className="space-y-4">
                                    <SectionHeader icon={<Scale size={18} />} label="Cash Flows from Investing Activities" color="#f59e0b" />
                                    <div className="space-y-2 pl-4">
                                        {cfData?.investing?.flows?.map((w: any, idx: number) => (
                                            <AccountRow key={idx} name={w.name} amount={w.amount} />
                                        ))}
                                        <div className="flex justify-between items-center p-5 rounded-2xl border mt-4 bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-900/20">
                                            <span className="font-extrabold text-sm text-amber-900 dark:text-amber-400 uppercase tracking-widest">Net Cash from Investing Activities</span>
                                            <span className="font-extrabold text-lg text-amber-900 dark:text-amber-400">{formatNPR(cfData?.investing?.total || 0)}</span>
                                        </div>
                                    </div>
                                </section>

                                {/* Financing */}
                                <section className="space-y-4">
                                    <SectionHeader icon={<PieChart size={18} />} label="Cash Flows from Financing Activities" color="#8b5cf6" />
                                    <div className="space-y-2 pl-4">
                                        {cfData?.financing?.flows?.map((w: any, idx: number) => (
                                            <AccountRow key={idx} name={w.name} amount={w.amount} />
                                        ))}
                                        <div className="flex justify-between items-center p-5 rounded-2xl border mt-4 bg-purple-50 dark:bg-purple-900/10 border-purple-200 dark:border-purple-900/20">
                                            <span className="font-extrabold text-sm text-purple-900 dark:text-purple-400 uppercase tracking-widest">Net Cash from Financing Activities</span>
                                            <span className="font-extrabold text-lg text-purple-900 dark:text-purple-400">{formatNPR(cfData?.financing?.total || 0)}</span>
                                        </div>
                                    </div>
                                </section>

                                {/* Summary */}
                                <div className="pt-8 border-t-2 border-slate-200 dark:border-slate-700">
                                    <div className="flex justify-between items-center px-6 py-4">
                                        <span className="font-bold text-slate-500 uppercase tracking-widest">Net Increase (Decrease) in Cash</span>
                                        <span className="font-extrabold text-slate-900 dark:text-white">{formatNPR(cfData?.summary?.netIncreaseInCash || 0)}</span>
                                    </div>
                                    <div className="flex justify-between items-center px-6 py-4">
                                        <span className="font-bold text-slate-500 uppercase tracking-widest">Cash at Beginning of Period</span>
                                        <span className="font-extrabold text-slate-900 dark:text-white">{formatNPR(cfData?.summary?.beginningCash || 0)}</span>
                                    </div>
                                    <div className="flex justify-between items-center p-8 mt-4 rounded-2xl shadow-xl transition-all" style={{ backgroundColor: `${theme.colors.primary}15`, color: theme.colors.primary }}>
                                        <span className="text-xl font-extrabold uppercase tracking-widest">Cash at End of Period</span>
                                        <span className="text-3xl font-extrabold">{formatNPR(cfData?.summary?.endingCash || 0)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ───────────────── COMPARATIVE ANALYSIS ───────────────── */}
            {activeTab === 'CA' && (
                <div className="space-y-6 animate-in fade-in duration-500">
                    <div className="flex justify-end gap-2">
                        {['MoM', 'QoQ', 'YoY'].map(per => (
                            <Button
                                key={per}
                                variant={caPeriod === per ? 'default' : 'outline'}
                                onClick={() => setCaPeriod(per as any)}
                                className="font-extrabold text-xs tracking-widest"
                            >
                                {per}
                            </Button>
                        ))}
                    </div>

                    {isLoadingCA ? <LoadingSkeleton /> : (
                        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden p-8">
                            <h2 className="text-xl font-extrabold text-center mb-12 uppercase tracking-widest text-slate-400">Comparative Financial Analysis</h2>

                            <Table className="max-w-4xl mx-auto">
                                <TableHeader>
                                    <TableRow className="bg-slate-50 dark:bg-slate-900 border-b-2 border-slate-200 dark:border-slate-700">
                                        <TableHead className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest">Metric</TableHead>
                                        <TableHead className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest text-right">Current Period</TableHead>
                                        <TableHead className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest text-right">Previous Period</TableHead>
                                        <TableHead className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest text-right">Variance</TableHead>
                                        <TableHead className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest text-right">% Change</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {[
                                        { name: 'Revenue', data: caData?.summary?.revenue },
                                        { name: 'Expenses', data: caData?.summary?.expenses },
                                        { name: 'Net Profit', data: caData?.summary?.netProfit, isTotal: true }
                                    ].map((row: any, idx) => (
                                        <TableRow key={idx} className={row.isTotal ? 'bg-primary/5 border-t-2 border-primary/20' : 'hover-theme transition-colors'}>
                                            <TableCell className={`px-6 py-5 ${row.isTotal ? 'font-extrabold text-primary' : 'font-bold text-slate-600 dark:text-slate-300'}`}>
                                                {row.name}
                                            </TableCell>
                                            <TableCell className="px-6 py-5 text-right font-extrabold text-slate-900 dark:text-white">
                                                {formatNPR(row.data?.current || 0)}
                                            </TableCell>
                                            <TableCell className="px-6 py-5 text-right font-extrabold text-slate-400">
                                                {formatNPR(row.data?.previous || 0)}
                                            </TableCell>
                                            <TableCell className="px-6 py-5 text-right font-extrabold">
                                                <span className={row.data?.variance >= 0 == (!row.isTotal && row.name === 'Expenses' ? false : true) ? 'text-green-600' : 'text-red-500'}>
                                                    {row.data?.variance > 0 ? '+' : ''}{formatNPR(row.data?.variance || 0)}
                                                </span>
                                            </TableCell>
                                            <TableCell className="px-6 py-5 text-right font-extrabold">
                                                <span className={`px-3 py-1 rounded-full text-xs tracking-widest bg-opacity-10 
                                                    ${row.data?.percentChange >= 0 == (!row.isTotal && row.name === 'Expenses' ? false : true)
                                                        ? 'text-green-600 bg-green-500'
                                                        : 'text-red-500 bg-red-500'}`}
                                                >
                                                    {row.data?.percentChange > 0 ? '▲' : '▼'} {Math.abs(row.data?.percentChange || 0).toFixed(2)}%
                                                </span>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </div>
            )}

            {/* ───────────────── CONSOLIDATED STATEMENTS ───────────────── */}
            {activeTab === 'CON' && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {/* Date Filter */}
                    <div className="flex items-center gap-4 bg-white dark:bg-slate-800 p-5 rounded-2xl border shadow-sm" style={{ borderColor: theme.colors.border }}>
                        <div className="flex flex-wrap items-center gap-4">
                            {[['startDate', 'From'], ['endDate', 'To']].map(([key, label]) => (
                                <React.Fragment key={key}>
                                    {label !== 'From' && <span className="text-[10px] text-slate-400 font-extrabold tracking-widest uppercase">To</span>}
                                    <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-900 rounded-xl px-4 py-2 border" style={{ borderColor: theme.colors.border }}>
                                        <CalendarIcon size={18} className="text-slate-400" />
                                        <input
                                            type="date"
                                            className="bg-transparent border-none p-0 text-sm font-bold focus:ring-0 cursor-pointer"
                                            style={{ color: theme.colors.text }}
                                            value={conDateRange[key as keyof typeof conDateRange]}
                                            onChange={(e) => setConDateRange({ ...conDateRange, [key]: e.target.value })}
                                        />
                                    </div>
                                </React.Fragment>
                            ))}
                        </div>
                    </div>

                    {/* Consolidated P&L */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-8">
                        <h2 className="text-xl font-extrabold text-center mb-8 uppercase tracking-widest text-slate-400">
                            Consolidated Statement of Profit &amp; Loss
                        </h2>
                        {isLoadingConPL ? <LoadingSkeleton /> : (
                            <div className="max-w-4xl mx-auto space-y-12">
                                <section className="space-y-4">
                                    <SectionHeader icon={<TrendingUp size={18} />} label="Consolidated Revenue" color="#22c55e" />
                                    <div className="space-y-1">
                                        {(conPlData?.revenue || []).map((acc: any) => (
                                            <AccountRow key={acc.id} name={acc.name} amount={acc.displayBalance} />
                                        ))}
                                        <div className="flex justify-between items-center p-5 rounded-2xl border mt-4" style={{ backgroundColor: `${theme.colors.primary}05`, borderColor: `${theme.colors.primary}20` }}>
                                            <span className="font-extrabold uppercase tracking-widest text-xs" style={{ color: theme.colors.primary }}>Total Revenue</span>
                                            <span className="font-extrabold text-xl" style={{ color: theme.colors.primary }}>{formatNPR(conPlData?.totalRevenue || 0)}</span>
                                        </div>
                                    </div>
                                </section>
                                <section className="space-y-4">
                                    <SectionHeader icon={<TrendingUp size={18} className="rotate-180" />} label="Consolidated Expenses" color="#ef4444" />
                                    <div className="space-y-1">
                                        {(conPlData?.expense || []).map((acc: any) => (
                                            <AccountRow key={acc.id} name={acc.name} amount={acc.displayBalance} />
                                        ))}
                                        <div className="flex justify-between items-center p-5 rounded-2xl border mt-4" style={{ backgroundColor: '#ef444408', borderColor: '#ef444420' }}>
                                            <span className="font-extrabold text-red-500 uppercase tracking-widest text-xs">Total Expenses</span>
                                            <span className="font-extrabold text-red-500 text-xl">{formatNPR(conPlData?.totalExpense || 0)}</span>
                                        </div>
                                    </div>
                                </section>
                                <div className="pt-6 border-t-4 border-double border-slate-200 dark:border-slate-700">
                                    <div
                                        className="flex justify-between items-center p-8 rounded-2xl shadow-xl"
                                        style={(conPlData?.netProfit ?? 0) >= 0
                                            ? { color: theme.colors.primary, backgroundColor: `${theme.colors.primary}15` }
                                            : { backgroundColor: '#ef4444', color: '#fff' }
                                        }
                                    >
                                        <span className="text-xl font-extrabold">{(conPlData?.netProfit ?? 0) >= 0 ? 'CONSOLIDATED NET PROFIT' : 'CONSOLIDATED NET LOSS'}</span>
                                        <span className="text-3xl font-extrabold">{formatNPR(Math.abs(conPlData?.netProfit || 0))}</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Consolidated Balance Sheet */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-8">
                        <h2 className="text-xl font-extrabold text-center mb-8 uppercase tracking-widest text-slate-400">
                            Consolidated Balance Sheet
                        </h2>
                        {isLoadingConBS ? <LoadingSkeleton /> : (
                            <div className="max-w-4xl mx-auto">
                                <div className="grid grid-cols-3 gap-4 mb-10">
                                    {[
                                        { label: 'Total Assets', value: conBsData?.totalAssets || 0, color: theme.colors.primary },
                                        { label: 'Total Liabilities', value: conBsData?.totalLiabilities || 0, color: '#f59e0b' },
                                        { label: 'Total Equity', value: conBsData?.totalEquity || 0, color: '#22c55e' },
                                    ].map(({ label, value, color }) => (
                                        <div key={label} className="p-5 rounded-2xl border text-center" style={{ backgroundColor: color + '10', borderColor: color + '30' }}>
                                            <p className="text-[10px] font-extrabold uppercase tracking-widest mb-1" style={{ color }}>{label}</p>
                                            <p className="text-2xl font-extrabold" style={{ color }}>{formatNPR(value)}</p>
                                        </div>
                                    ))}
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                    <div className="p-6 rounded-2xl border shadow-sm" style={{ backgroundColor: `${theme.colors.primary}08`, borderColor: `${theme.colors.primary}20` }}>
                                        <h3 className="font-extrabold mb-6 flex items-center gap-2" style={{ color: theme.colors.primary }}>
                                            <div className="p-2 rounded-lg" style={{ backgroundColor: `${theme.colors.primary}15` }}><Scale size={18} /></div>
                                            ASSETS
                                        </h3>
                                        {(conBsData?.assets || []).map((a: any) => (
                                            <div key={a.id} className="flex justify-between items-center text-sm py-1">
                                                <span className="font-bold text-slate-500 text-[11px]">{a.name}</span>
                                                <span className="font-extrabold" style={{ color: theme.colors.text }}>{formatNPR(a.displayBalance)}</span>
                                            </div>
                                        ))}
                                        <div className="pt-4 border-t flex justify-between items-center mt-3" style={{ borderColor: `${theme.colors.primary}20` }}>
                                            <span className="text-[10px] font-extrabold text-slate-400 uppercase">Total Assets</span>
                                            <span className="font-extrabold text-lg" style={{ color: theme.colors.primary }}>{formatNPR(conBsData?.totalAssets || 0)}</span>
                                        </div>
                                    </div>
                                    <div className="p-6 rounded-2xl bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/20 shadow-sm">
                                        <h3 className="font-extrabold text-amber-600 mb-6 flex items-center gap-2">
                                            <div className="p-2 rounded-lg bg-amber-100/50"><FileText size={18} /></div>
                                            LIABILITIES
                                        </h3>
                                        {(conBsData?.liabilities || []).map((a: any) => (
                                            <div key={a.id} className="flex justify-between items-center text-sm py-1">
                                                <span className="font-bold text-slate-500 text-[11px]">{a.name}</span>
                                                <span className="font-extrabold text-slate-900 dark:text-white">{formatNPR(a.displayBalance)}</span>
                                            </div>
                                        ))}
                                        <div className="pt-4 border-t border-amber-100 flex justify-between items-center mt-3">
                                            <span className="text-[10px] font-extrabold text-slate-400 uppercase">Total Liabilities</span>
                                            <span className="font-extrabold text-lg text-amber-600">{formatNPR(conBsData?.totalLiabilities || 0)}</span>
                                        </div>
                                    </div>
                                    <div className="p-6 rounded-2xl bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-900/20 shadow-sm">
                                        <h3 className="font-extrabold text-green-600 mb-6 flex items-center gap-2">
                                            <div className="p-2 rounded-lg bg-green-100/50"><TrendingUp size={18} /></div>
                                            EQUITY
                                        </h3>
                                        {(conBsData?.equity || []).map((a: any) => (
                                            <div key={a.id} className="flex justify-between items-center text-sm py-1">
                                                <span className="font-bold text-slate-500 text-[11px]">{a.name}</span>
                                                <span className="font-extrabold text-slate-900 dark:text-white">{formatNPR(a.displayBalance)}</span>
                                            </div>
                                        ))}
                                        <div className="pt-4 border-t border-green-100 flex justify-between items-center mt-3">
                                            <span className="text-[10px] font-extrabold text-slate-400 uppercase">Total Equity</span>
                                            <span className="font-extrabold text-lg text-green-600">{formatNPR(conBsData?.totalEquity || 0)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ───────────────── RATIO DASHBOARD ───────────────── */}
            {activeTab === 'RAT' && (
                <div className="space-y-8 animate-in fade-in duration-500">
                    {isLoadingRAT ? <LoadingSkeleton /> : (
                        <div className="space-y-8">
                            {/* Liquidity */}
                            <section className="bg-white dark:bg-slate-800 rounded-[32px] p-8 md:p-12 border border-blue-100 dark:border-blue-900/30 shadow-lg shadow-blue-900/5 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-8 opacity-5 rotate-12 scale-150 transition-transform duration-700 group-hover:scale-[1.8]">
                                    <Activity size={200} className="text-blue-600" />
                                </div>
                                <h3 className="text-xl font-extrabold text-blue-600 dark:text-blue-400 mb-8 flex items-center gap-3">
                                    <div className="p-3 bg-blue-100 dark:bg-blue-900/50 rounded-2xl"><Activity size={24} /></div>
                                    LIQUIDITY RATIOS
                                    <span className="text-xs font-extrabold text-slate-400 uppercase tracking-widest ml-4 px-3 py-1 bg-slate-100 dark:bg-slate-900 rounded-full">Short-term solvency</span>
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                                    <div className="p-8 rounded-[24px] bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/20">
                                        <div className="text-xs font-extrabold text-blue-400 uppercase tracking-widest mb-2">{ratData?.liquidity?.currentRatio?.label}</div>
                                        <div className="text-5xl font-black text-blue-700 dark:text-blue-400">
                                            {ratData?.liquidity?.currentRatio?.value?.toFixed(2)}{ratData?.liquidity?.currentRatio?.suffix}
                                        </div>
                                    </div>
                                    <div className="p-8 rounded-[24px] bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/20">
                                        <div className="text-xs font-extrabold text-blue-400 uppercase tracking-widest mb-2">{ratData?.liquidity?.quickRatio?.label}</div>
                                        <div className="text-5xl font-black text-blue-700 dark:text-blue-400">
                                            {ratData?.liquidity?.quickRatio?.value?.toFixed(2)}{ratData?.liquidity?.quickRatio?.suffix}
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {/* Profitability */}
                            <section className="bg-white dark:bg-slate-800 rounded-[32px] p-8 md:p-12 border border-green-100 dark:border-green-900/30 shadow-lg shadow-green-900/5 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-8 opacity-5 rotate-12 scale-150 transition-transform duration-700 group-hover:scale-[1.8]">
                                    <TrendingUp size={200} className="text-green-600" />
                                </div>
                                <h3 className="text-xl font-extrabold text-green-600 dark:text-green-400 mb-8 flex items-center gap-3">
                                    <div className="p-3 bg-green-100 dark:bg-green-900/50 rounded-2xl"><TrendingUp size={24} /></div>
                                    PROFITABILITY RATIOS
                                    <span className="text-xs font-extrabold text-slate-400 uppercase tracking-widest ml-4 px-3 py-1 bg-slate-100 dark:bg-slate-900 rounded-full">Operational efficiency</span>
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                                    <div className="p-8 rounded-[24px] bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-900/20">
                                        <div className="text-xs font-extrabold text-green-500 uppercase tracking-widest mb-2">{ratData?.profitability?.grossProfitMargin?.label}</div>
                                        <div className="text-5xl font-black text-green-700 dark:text-green-400">
                                            {ratData?.profitability?.grossProfitMargin?.value?.toFixed(2)}{ratData?.profitability?.grossProfitMargin?.suffix}
                                        </div>
                                    </div>
                                    <div className="p-8 rounded-[24px] bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-900/20">
                                        <div className="text-xs font-extrabold text-green-500 uppercase tracking-widest mb-2">{ratData?.profitability?.netProfitMargin?.label}</div>
                                        <div className="text-5xl font-black text-green-700 dark:text-green-400">
                                            {ratData?.profitability?.netProfitMargin?.value?.toFixed(2)}{ratData?.profitability?.netProfitMargin?.suffix}
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {/* Leverage */}
                            <section className="bg-white dark:bg-slate-800 rounded-[32px] p-8 md:p-12 border border-amber-100 dark:border-amber-900/30 shadow-lg shadow-amber-900/5 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-8 opacity-5 rotate-12 scale-150 transition-transform duration-700 group-hover:scale-[1.8]">
                                    <Scale size={200} className="text-amber-600" />
                                </div>
                                <h3 className="text-xl font-extrabold text-amber-600 dark:text-amber-400 mb-8 flex items-center gap-3">
                                    <div className="p-3 bg-amber-100 dark:bg-amber-900/50 rounded-2xl"><Scale size={24} /></div>
                                    LEVERAGE RATIOS
                                    <span className="text-xs font-extrabold text-slate-400 uppercase tracking-widest ml-4 px-3 py-1 bg-slate-100 dark:bg-slate-900 rounded-full">Long-term stability</span>
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                                    <div className="p-8 rounded-[24px] bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/20">
                                        <div className="text-xs font-extrabold text-amber-500 uppercase tracking-widest mb-2">{ratData?.leverage?.debtToEquity?.label}</div>
                                        <div className="text-5xl font-black text-amber-700 dark:text-amber-400">
                                            {ratData?.leverage?.debtToEquity?.value?.toFixed(2)}{ratData?.leverage?.debtToEquity?.suffix}
                                        </div>
                                    </div>
                                </div>
                            </section>
                        </div>
                    )}
                </div>
            )}

            {/* ───────────────── NOTES TO FINANCIAL STATEMENTS ───────────────── */}
            {activeTab === 'NOTES' && (
                <div className="space-y-6 animate-in fade-in duration-500">
                    {/* Controls */}
                    <div className="flex flex-wrap items-center gap-4">
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider mb-1" style={{ color: theme.colors.textSecondary }}>Fiscal Year (B.S.)</label>
                            <input
                                type="text"
                                placeholder="e.g. 2080-81"
                                className="px-3 py-2 rounded-xl border text-sm font-medium"
                                style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.text }}
                                value={notesFiscalYear}
                                onChange={e => setNotesFiscalYear(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Add/Edit Form */}
                        <div className="lg:col-span-1">
                            <div className="rounded-2xl border p-6 space-y-4" style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border }}>
                                <h3 className="font-extrabold text-sm uppercase tracking-widest" style={{ color: theme.colors.textSecondary }}>
                                    {editingNoteId ? 'Edit Note' : 'Add Note'}
                                </h3>
                                <div>
                                    <label className="block text-xs font-bold mb-1" style={{ color: theme.colors.textSecondary }}>Section</label>
                                    <select
                                        className="w-full px-3 py-2 rounded-xl border text-sm"
                                        style={{ backgroundColor: theme.colors.background, borderColor: theme.colors.border, color: theme.colors.text }}
                                        value={notesSection}
                                        onChange={e => setNotesSection(e.target.value as NoteSection)}
                                    >
                                        {(['ASSETS', 'LIABILITIES', 'EQUITY', 'REVENUE', 'EXPENSES', 'OTHER'] as NoteSection[]).map(s => (
                                            <option key={s} value={s}>{s}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold mb-1" style={{ color: theme.colors.textSecondary }}>Title</label>
                                    <input
                                        type="text"
                                        placeholder="Note title"
                                        className="w-full px-3 py-2 rounded-xl border text-sm"
                                        style={{ backgroundColor: theme.colors.background, borderColor: theme.colors.border, color: theme.colors.text }}
                                        value={notesTitle}
                                        onChange={e => setNotesTitle(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold mb-1" style={{ color: theme.colors.textSecondary }}>Content</label>
                                    <textarea
                                        rows={5}
                                        placeholder="Describe the accounting policy, breakdown, or disclosure..."
                                        className="w-full px-3 py-2 rounded-xl border text-sm resize-none"
                                        style={{ backgroundColor: theme.colors.background, borderColor: theme.colors.border, color: theme.colors.text }}
                                        value={notesContent}
                                        onChange={e => setNotesContent(e.target.value)}
                                    />
                                </div>
                                <div className="flex gap-2">
                                    {editingNoteId && (
                                        <button onClick={() => { setEditingNoteId(null); setNotesTitle(''); setNotesContent(''); }}
                                            className="px-3 py-2 rounded-xl border text-xs font-bold"
                                            style={{ borderColor: theme.colors.border, color: theme.colors.textSecondary }}>Cancel</button>
                                    )}
                                    <button
                                        onClick={() => createNoteMutation.mutate({ fiscal_year: notesFiscalYear, section: notesSection, title: notesTitle, content: notesContent })}
                                        disabled={!notesTitle || createNoteMutation.isPending}
                                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-60"
                                        style={{ backgroundColor: theme.colors.primary }}
                                    >
                                        <Plus className="h-4 w-4" />
                                        {createNoteMutation.isPending ? 'Saving...' : (editingNoteId ? 'Update' : 'Add Note')}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Notes List */}
                        <div className="lg:col-span-2 space-y-4">
                            {isLoadingNotes ? <LoadingSkeleton /> : notesData.length === 0 ? (
                                <div className="rounded-2xl border p-12 text-center" style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border }}>
                                    <BookMarked className="h-10 w-10 mx-auto mb-3 opacity-30" style={{ color: theme.colors.textSecondary }} />
                                    <p className="text-sm" style={{ color: theme.colors.textSecondary }}>No notes for fiscal year {notesFiscalYear}. Add your first note.</p>
                                </div>
                            ) : notesData.map((note: any, idx: number) => (
                                <div key={note.id} className="rounded-2xl border p-6" style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border }}>
                                    <div className="flex items-start justify-between gap-3 mb-3">
                                        <div className="flex items-center gap-3">
                                            <span className="text-lg font-black" style={{ color: theme.colors.primary }}>Note {idx + 1}</span>
                                            <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ backgroundColor: `${theme.colors.primary}15`, color: theme.colors.primary }}>{note.section}</span>
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => { setEditingNoteId(note.id); setNotesTitle(note.title); setNotesContent(note.content ?? ''); setNotesSection(note.section); }}
                                                className="p-1.5 rounded-lg text-xs font-bold" style={{ color: theme.colors.primary }}>Edit</button>
                                            <button onClick={() => deleteNoteMutation.mutate(note.id)} className="p-1.5 rounded-lg" style={{ color: '#dc2626' }}>
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>
                                    <h4 className="font-extrabold mb-2" style={{ color: theme.colors.text }}>{note.title}</h4>
                                    <p className="text-sm whitespace-pre-wrap leading-relaxed" style={{ color: theme.colors.textSecondary }}>{note.content}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

