import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/services/api';
import { useTheme } from '@/contexts/ThemeContext';
import { ShieldCheck, FileText, PieChart, Info, Percent, AlertTriangle, Scale, Award, Flame, Plus, Trash2, X } from 'lucide-react';
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

interface TaxCategory {
    id: string;
    name: string;
    rate: number;
    type: 'VAT' | 'TDS';
}

interface Vendor { id: string; name: string; panNumber?: string; }
interface ExciseDutyRate { id: string; category: string; description?: string; rate: number; status: string; }

export default function TaxCompliancePage() {
    const { theme } = useTheme();
    const queryClient = useQueryClient();

    // TDS Certificate state
    const [tdsVendorId, setTdsVendorId] = useState('');
    const [tdsStartDate, setTdsStartDate] = useState('');
    const [tdsEndDate, setTdsEndDate] = useState('');
    const [tdsCertLoading, setTdsCertLoading] = useState(false);

    // Excise Duty state
    const [showAddExcise, setShowAddExcise] = useState(false);
    const [newExcise, setNewExcise] = useState({ category: '', description: '', rate: '' });

    const { data: vatCategories, isLoading: loadingVat } = useQuery<TaxCategory[]>({
        queryKey: ['accounting-vat-categories'],
        queryFn: async () => {
            const response = await api.get('/accounting/tax/vat-categories');
            return response.data;
        }
    });

    const { data: tdsCategories, isLoading: loadingTds } = useQuery<TaxCategory[]>({
        queryKey: ['accounting-tds-categories'],
        queryFn: async () => {
            const response = await api.get('/accounting/tax/tds-categories');
            return response.data;
        }
    });

    const { data: vendors = [] } = useQuery<Vendor[]>({
        queryKey: ['accounting-vendors-list'],
        queryFn: async () => { const res = await api.get('/accounting/vendors'); return res.data?.data ?? res.data ?? []; },
    });

    const { data: exciseRates = [], isLoading: loadingExcise } = useQuery<ExciseDutyRate[]>({
        queryKey: ['accounting-excise-duty'],
        queryFn: async () => { const res = await api.get('/accounting/excise-duty'); return res.data; },
    });

    const addExciseMutation = useMutation({
        mutationFn: (data: typeof newExcise) => api.post('/accounting/excise-duty', { ...data, rate: parseFloat(data.rate) }),
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['accounting-excise-duty'] }); setShowAddExcise(false); setNewExcise({ category: '', description: '', rate: '' }); toast.success('Excise duty rate added'); },
        onError: () => toast.error('Failed to add rate'),
    });

    const deleteExciseMutation = useMutation({
        mutationFn: (id: string) => api.delete(`/accounting/excise-duty/${id}`),
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['accounting-excise-duty'] }); toast.success('Rate removed'); },
        onError: () => toast.error('Failed to remove rate'),
    });

    const handleGenerateTdsCertificate = async () => {
        if (!tdsVendorId || !tdsStartDate || !tdsEndDate) {
            toast.error('Please select vendor and date range');
            return;
        }
        setTdsCertLoading(true);
        try {
            const res = await api.get(`/accounting/tax-reports/tds-certificate/${tdsVendorId}?startDate=${tdsStartDate}&endDate=${tdsEndDate}`);
            const data = res.data;
            if (data.message) { toast.error(data.message); return; }
            const ctx = data.certificateContext;
            const details = data.details ?? [];
            const win = window.open('', '_blank', 'width=800,height=900');
            if (!win) { toast.error('Popup blocked. Please allow popups for this site.'); return; }
            const rows = details.map((d: any) => `<tr>
                <td>${d.invoiceDate}</td><td>${d.invoiceNumber}</td>
                <td>${d.tdsCategory ?? ''}</td>
                <td style="text-align:right">NPR ${Number(d.amountPaid).toLocaleString()}</td>
                <td style="text-align:right">NPR ${Number(d.tdsDeducted).toLocaleString()}</td>
            </tr>`).join('');
            win.document.write(`<!DOCTYPE html><html><head><title>TDS Certificate</title>
            <style>body{font-family:Arial,sans-serif;padding:40px;color:#111}h1{font-size:22px;margin-bottom:4px}
            h2{font-size:16px;font-weight:normal;color:#555;margin-bottom:24px}
            table{width:100%;border-collapse:collapse;margin-top:16px}
            th,td{border:1px solid #ccc;padding:8px 12px;font-size:13px}
            th{background:#f5f5f5;font-weight:bold;text-align:left}
            .total{background:#f0f0f0;font-weight:bold}
            .footer{margin-top:40px;display:flex;justify-content:space-between}
            .sig{border-top:1px solid #333;padding-top:8px;min-width:180px;text-align:center;font-size:12px}
            </style></head><body>
            <h1>TDS Deduction Certificate</h1>
            <h2>Issued: ${ctx.issueDate} (B.S. ${ctx.issueBsDate})</h2>
            <p><strong>Vendor:</strong> ${ctx.vendor.name}<br>
            <strong>PAN No.:</strong> ${ctx.vendor.pan}<br>
            <strong>Address:</strong> ${ctx.vendor.address}</p>
            <p><strong>Period:</strong> ${ctx.period.startDate} to ${ctx.period.endDate}<br>
            (B.S.: ${ctx.period.startBsDate} to ${ctx.period.endBsDate})</p>
            <table>
            <thead><tr><th>Date</th><th>Invoice No.</th><th>TDS Category</th><th>Amount Paid</th><th>TDS Deducted</th></tr></thead>
            <tbody>${rows}</tbody>
            <tfoot>
            <tr class="total"><td colspan="3">TOTAL</td>
            <td style="text-align:right">NPR ${Number(ctx.totals.totalAmountPaid).toLocaleString()}</td>
            <td style="text-align:right">NPR ${Number(ctx.totals.totalTdsDeducted).toLocaleString()}</td>
            </tr></tfoot></table>
            <div class="footer">
            <div class="sig">Authorised Signatory<br>(Deductor)</div>
            <div class="sig">Received By<br>(Vendor / Deductee)</div>
            </div>
            <script>window.onload=function(){window.print();}</script>
            </body></html>`);
            win.document.close();
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Failed to generate certificate');
        } finally {
            setTdsCertLoading(false);
        }
    };

    if (loadingVat || loadingTds) {
        return <div className="p-8 animate-pulse space-y-4">
            <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-1/4"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="h-64 bg-slate-100 dark:bg-slate-800 rounded-3xl"></div>
                <div className="h-64 bg-slate-100 dark:bg-slate-800 rounded-3xl"></div>
            </div>
        </div>;
    }

    return (
        <div className="p-8 max-w-[1600px] mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="p-3 rounded-2xl" style={{ backgroundColor: `${theme.colors.primary}15` }}>
                        <ShieldCheck className="h-8 w-8" style={{ color: theme.colors.primary }} />
                    </div>
                    <div>
                        <h1 className="text-4xl font-extrabold tracking-tight" style={{ color: theme.colors.text }}>
                            Tax Compliance
                        </h1>
                        <p className="opacity-70" style={{ color: theme.colors.textSecondary }}>
                            Manage VAT, TDS and tax filing reports
                        </p>
                    </div>
                </div>
                <Button
                    variant="primary"
                    className="px-6 h-12 rounded-xl font-bold shadow-lg shadow-primary/20 hover:scale-[1.05] transition-transform active:scale-95"
                >
                    <FileText className="h-5 w-5 mr-2" />
                    Generate VAT Return
                </Button>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                {/* VAT Configuration */}
                <Card className="p-8 border-none shadow-sm h-fit" style={{ backgroundColor: theme.colors.surface, borderRadius: '24px' }}>
                    <div className="flex items-center gap-5 mb-8">
                        <div className="p-4 rounded-xl bg-primary/10 text-primary" style={{ color: theme.colors.primary, backgroundColor: `${theme.colors.primary}15` }}>
                            <ShieldCheck size={28} />
                        </div>
                        <div>
                            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">VAT Categories</h2>
                            <p className="text-sm text-slate-500">Value Added Tax rates currently applied</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {vatCategories?.map((cat) => (
                            <div key={cat.id} className="flex justify-between items-center p-5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700/50 group hover-theme transition-all">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 rounded-xl bg-white dark:bg-slate-800 text-slate-400 group-hover:text-primary transition-colors" style={cat.rate > 0 ? { color: theme.colors.primary } : {}}>
                                        <Percent size={20} />
                                    </div>
                                    <span className="font-extrabold text-slate-700 dark:text-slate-200">{cat.name}</span>
                                </div>
                                <div className="text-2xl font-extrabold text-primary" style={{ color: theme.colors.primary }}>{cat.rate}%</div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-8 p-6 rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/20 flex gap-4">
                        <Info className="text-amber-600 shrink-0" size={20} />
                        <p className="text-sm text-amber-800 dark:text-amber-200 leading-relaxed font-medium">
                            Standard VAT in Nepal is <span className="font-extrabold">13%</span>. Ensure your sales and purchase ledgers are properly linked to VAT accounts for accurate returns.
                        </p>
                    </div>
                </Card>

                {/* TDS Configuration */}
                <Card className="p-8 border-none shadow-sm h-fit" style={{ backgroundColor: theme.colors.surface, borderRadius: '24px' }}>
                    <div className="flex items-center gap-5 mb-8">
                        <div className="p-4 rounded-xl bg-primary/10 text-primary" style={{ color: theme.colors.primary, backgroundColor: `${theme.colors.primary}15` }}>
                            <PieChart size={28} />
                        </div>
                        <div>
                            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">Withholding Tax (TDS)</h2>
                            <p className="text-sm text-slate-500">Tax Deductible at Source categories</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                        {tdsCategories?.map((cat) => (
                            <div key={cat.id} className="group flex justify-between items-center p-5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700/50 hover:border-primary/30 transition-all">
                                <span className="font-extrabold text-slate-700 dark:text-slate-200">{cat.name}</span>
                                <div className="flex items-center gap-6">
                                    <span className="text-lg font-extrabold text-primary" style={{ color: theme.colors.primary }}>{cat.rate}%</span>
                                    <button className="p-2.5 rounded-xl bg-white dark:bg-slate-800 text-slate-300 hover:text-primary transition-colors hover:shadow-md">
                                        <Info size={18} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-8 p-6 rounded-xl bg-slate-100 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700">
                        <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <AlertTriangle size={14} className="text-amber-500" /> Compliance Note
                        </h4>
                        <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed italic font-medium">
                            Tax Deductible at Source (TDS) must be deposited to the Inland Revenue Department (IRD) within 25 days of the month following the deduction.
                        </p>
                    </div>
                </Card>
            </div>

            {/* TDS Certificate Generator */}
            <Card className="p-8 border-none shadow-sm" style={{ backgroundColor: theme.colors.surface, borderRadius: '24px' }}>
                <div className="flex items-center gap-5 mb-6">
                    <div className="p-4 rounded-xl" style={{ color: theme.colors.primary, backgroundColor: `${theme.colors.primary}15` }}>
                        <Award size={28} />
                    </div>
                    <div>
                        <h2 className="text-xl font-extrabold" style={{ color: theme.colors.text }}>TDS Certificate</h2>
                        <p className="text-sm" style={{ color: theme.colors.textSecondary }}>Generate a printable TDS deduction certificate for a vendor</p>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="md:col-span-2">
                        <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: theme.colors.textSecondary }}>Vendor</label>
                        <select
                            className="w-full px-3 py-2.5 rounded-xl border text-sm font-medium"
                            style={{ backgroundColor: theme.colors.background, borderColor: theme.colors.border, color: theme.colors.text }}
                            value={tdsVendorId}
                            onChange={e => setTdsVendorId(e.target.value)}
                        >
                            <option value="">— Select vendor —</option>
                            {vendors.map((v: Vendor) => (
                                <option key={v.id} value={v.id}>{v.name}{v.panNumber ? ` (PAN: ${v.panNumber})` : ''}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: theme.colors.textSecondary }}>From Date</label>
                        <input type="date" className="w-full px-3 py-2.5 rounded-xl border text-sm" style={{ backgroundColor: theme.colors.background, borderColor: theme.colors.border, color: theme.colors.text }} value={tdsStartDate} onChange={e => setTdsStartDate(e.target.value)} />
                    </div>
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: theme.colors.textSecondary }}>To Date</label>
                        <input type="date" className="w-full px-3 py-2.5 rounded-xl border text-sm" style={{ backgroundColor: theme.colors.background, borderColor: theme.colors.border, color: theme.colors.text }} value={tdsEndDate} onChange={e => setTdsEndDate(e.target.value)} />
                    </div>
                </div>
                <div className="mt-4">
                    <Button
                        onClick={handleGenerateTdsCertificate}
                        disabled={tdsCertLoading || !tdsVendorId || !tdsStartDate || !tdsEndDate}
                        variant="primary"
                        className="px-6 h-11 rounded-xl font-bold"
                    >
                        <FileText className="h-4 w-4 mr-2" />
                        {tdsCertLoading ? 'Generating...' : 'Generate & Print Certificate'}
                    </Button>
                </div>
            </Card>

            {/* Excise Duty Rates */}
            <Card className="p-8 border-none shadow-sm" style={{ backgroundColor: theme.colors.surface, borderRadius: '24px' }}>
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-5">
                        <div className="p-4 rounded-xl" style={{ color: theme.colors.primary, backgroundColor: `${theme.colors.primary}15` }}>
                            <Flame size={28} />
                        </div>
                        <div>
                            <h2 className="text-xl font-extrabold" style={{ color: theme.colors.text }}>Excise Duty Rates</h2>
                            <p className="text-sm" style={{ color: theme.colors.textSecondary }}>Manage excise duty categories and applicable rates</p>
                        </div>
                    </div>
                    <Button onClick={() => setShowAddExcise(true)} variant="primary" className="px-5 h-10 rounded-xl font-bold text-sm">
                        <Plus className="h-4 w-4 mr-1.5" /> Add Rate
                    </Button>
                </div>
                {loadingExcise ? (
                    <div className="text-center py-8" style={{ color: theme.colors.textSecondary }}>Loading...</div>
                ) : (
                    <div className="space-y-3">
                        {exciseRates.map(rate => (
                            <div key={rate.id} className="flex items-center justify-between p-4 rounded-xl" style={{ backgroundColor: theme.colors.background, border: `1px solid ${theme.colors.border}` }}>
                                <div>
                                    <p className="font-bold text-sm" style={{ color: theme.colors.text }}>{rate.category}</p>
                                    {rate.description && <p className="text-xs mt-0.5" style={{ color: theme.colors.textSecondary }}>{rate.description}</p>}
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className="text-xl font-extrabold" style={{ color: theme.colors.primary }}>{rate.rate}%</span>
                                    <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={rate.status === 'ACTIVE' ? { backgroundColor: '#dcfce7', color: '#16a34a' } : { backgroundColor: '#fee2e2', color: '#dc2626' }}>{rate.status}</span>
                                    <button onClick={() => deleteExciseMutation.mutate(rate.id)} className="p-1.5 rounded-lg" style={{ color: '#dc2626' }}>
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                        {exciseRates.length === 0 && (
                            <p className="text-center py-6 text-sm" style={{ color: theme.colors.textSecondary }}>No excise duty rates defined yet.</p>
                        )}
                    </div>
                )}

                {/* Add Excise Duty Modal */}
                {showAddExcise && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                        <div className="rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4" style={{ backgroundColor: theme.colors.surface }}>
                            <div className="flex items-center justify-between">
                                <h3 className="font-bold text-base" style={{ color: theme.colors.text }}>Add Excise Duty Rate</h3>
                                <button onClick={() => setShowAddExcise(false)}><X className="h-5 w-5" style={{ color: theme.colors.textSecondary }} /></button>
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider mb-1" style={{ color: theme.colors.textSecondary }}>Category Name</label>
                                <input type="text" placeholder="e.g. Spirits & Liquor" className="w-full px-3 py-2 rounded-lg border text-sm" style={{ backgroundColor: theme.colors.background, borderColor: theme.colors.border, color: theme.colors.text }} value={newExcise.category} onChange={e => setNewExcise({ ...newExcise, category: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider mb-1" style={{ color: theme.colors.textSecondary }}>Description (optional)</label>
                                <input type="text" placeholder="Brief description" className="w-full px-3 py-2 rounded-lg border text-sm" style={{ backgroundColor: theme.colors.background, borderColor: theme.colors.border, color: theme.colors.text }} value={newExcise.description} onChange={e => setNewExcise({ ...newExcise, description: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider mb-1" style={{ color: theme.colors.textSecondary }}>Rate (%)</label>
                                <input type="number" placeholder="e.g. 40" min="0" max="500" className="w-full px-3 py-2 rounded-lg border text-sm" style={{ backgroundColor: theme.colors.background, borderColor: theme.colors.border, color: theme.colors.text }} value={newExcise.rate} onChange={e => setNewExcise({ ...newExcise, rate: e.target.value })} />
                            </div>
                            <div className="flex gap-3">
                                <button onClick={() => setShowAddExcise(false)} className="flex-1 px-3 py-2 rounded-lg border text-sm font-medium" style={{ borderColor: theme.colors.border, color: theme.colors.text }}>Cancel</button>
                                <button
                                    onClick={() => addExciseMutation.mutate(newExcise)}
                                    disabled={!newExcise.category || !newExcise.rate || addExciseMutation.isPending}
                                    className="flex-1 px-3 py-2 rounded-lg text-sm font-bold text-white disabled:opacity-60"
                                    style={{ backgroundColor: theme.colors.primary }}
                                >
                                    {addExciseMutation.isPending ? 'Adding...' : 'Add'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </Card>
        </div>
    );
}
