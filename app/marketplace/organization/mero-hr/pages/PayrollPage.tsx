import React, { useEffect, useState } from 'react';
import {
    Banknote,
    Calendar,
    RefreshCw,
    Send,
    CheckCircle2,
    FileText,
    Calculator,
    Download,
    Eye,
    ChevronRight,
    Search,
    ArrowUpRight
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import {
    Card,
    Button,
    Input,
    Badge,
    Dialog,
    DialogContent,
    DialogTitle
} from '@shared';
import { HrPayroll, HrPayrollStatus } from '../types';
import { hrService } from '../services/hrService';
import toast from '@shared/hooks/useToast';
import { format } from 'date-fns';

export default function PayrollPage() {
    const { theme } = useTheme();
    const [payrolls, setPayrolls] = useState<HrPayroll[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
    const [processing, setProcessing] = useState(false);

    const fetchPayroll = async (month?: string) => {
        try {
            setLoading(true);
            const data = await hrService.getPayrollHistory(month);
            setPayrolls(data);
        } catch (error: any) {
            toast.error('Failed to load payroll records');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPayroll(selectedMonth);
    }, [selectedMonth]);

    const handleGenerate = async () => {
        try {
            setProcessing(true);
            await hrService.generatePayroll(selectedMonth);
            toast.success(`Payroll generated for ${selectedMonth}`);
            fetchPayroll(selectedMonth);
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Generation failed');
        } finally {
            setProcessing(false);
        }
    };

    const handlePostToAccounting = async (id: string) => {
        try {
            await hrService.postToAccounting(id);
            toast.success('Posted to Mero Accounting');
            fetchPayroll(selectedMonth);
        } catch (error: any) {
            toast.error('Failed to post to accounting');
        }
    };

    const handleBankFileDownload = async () => {
        try {
            const result = await hrService.getBankFile(selectedMonth);
            if (!result?.csv) { toast.error('No payroll data for this month'); return; }
            const blob = new Blob([result.csv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = `bank-salary-file-${selectedMonth}.csv`; a.click();
            URL.revokeObjectURL(url);
            toast.success('Bank salary file downloaded');
        } catch {
            toast.error('Failed to generate bank file');
        }
    };

    const getStatusVariant = (status: HrPayrollStatus) => {
        switch (status) {
            case HrPayrollStatus.PAID: return 'success';
            case HrPayrollStatus.PROCESSED: return 'info';
            case HrPayrollStatus.DRAFT: return 'warning';
            default: return 'secondary';
        }
    };

    return (
        <div className="p-8 space-y-8 max-w-[1600px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-5">
                    <div className="p-4 rounded-2xl shadow-lg border bg-emerald-500/10 border-emerald-500/30">
                        <Banknote className="h-8 w-8 text-emerald-500" />
                    </div>
                    <div>
                        <h1 className="text-4xl font-black tracking-tight" style={{ color: theme.colors.text }}>
                            Payroll Engine
                        </h1>
                        <p className="font-medium opacity-60" style={{ color: theme.colors.textSecondary }}>
                            Automated salary processing & accounting integration
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex bg-black/5 dark:bg-white/5 p-1 rounded-xl border" style={{ borderColor: theme.colors.border }}>
                        <Input
                            type="month"
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                            className="bg-transparent border-none h-10 w-40 font-bold"
                        />
                    </div>
                    <Button
                        onClick={handleGenerate}
                        disabled={processing}
                        className="rounded-xl font-black px-6 shadow-xl shadow-primary/20 bg-primary hover:bg-primary/90"
                    >
                        {processing ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Calculator className="h-4 w-4 mr-2" />}
                        Process Payroll
                    </Button>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <Card className="p-8 border-none shadow-xl relative overflow-hidden group" style={{ backgroundColor: theme.colors.surface }}>
                    <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform">
                        <ArrowUpRight size={80} style={{ color: theme.colors.text }} />
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-2" style={{ color: theme.colors.text }}>Monthly Total Outflow</p>
                    <p className="text-4xl font-black" style={{ color: theme.colors.text }}>
                        NPR {payrolls.reduce((acc, curr) => acc + Number(curr.net_salary), 0).toLocaleString()}
                    </p>
                    <div className="flex items-center gap-2 mt-4 text-emerald-500 font-bold text-xs">
                        <CheckCircle2 className="h-4 w-4" /> <span>Calculated for {payrolls.length} Employees</span>
                    </div>
                </Card>

                <Card className="p-8 border-none shadow-xl relative overflow-hidden group" style={{ backgroundColor: theme.colors.surface }}>
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-2" style={{ color: theme.colors.text }}>Statutory Deductions (SSF/CIT)</p>
                    <p className="text-4xl font-black text-orange-500">
                        NPR {payrolls.reduce((acc, curr) => acc + Number(curr.ssf_contribution_employee) + Number(curr.cit_contribution), 0).toLocaleString()}
                    </p>
                    <p className="text-xs font-medium opacity-60 mt-4" style={{ color: theme.colors.textSecondary }}>Compliance matched for Nepal FY 2080/81</p>
                </Card>

                <Card className="p-8 border-none shadow-xl relative overflow-hidden group" style={{ backgroundColor: theme.colors.surface }}>
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-2" style={{ color: theme.colors.text }}>Accounting Sync</p>
                    <p className="text-4xl font-black text-blue-500">
                        {payrolls.filter(p => p.status === HrPayrollStatus.PAID).length} / {payrolls.length}
                    </p>
                    <p className="text-xs font-medium opacity-60 mt-4" style={{ color: theme.colors.textSecondary }}>Synced with Mero Accounting Ledger</p>
                </Card>
            </div>

            {/* Payroll History */}
            <Card className="border-none shadow-xl overflow-hidden" style={{ backgroundColor: theme.colors.surface }}>
                <div className="px-8 py-6 border-b flex items-center justify-between" style={{ borderColor: theme.colors.border }}>
                    <div className="flex items-center gap-2">
                        <FileText className="h-5 w-5 opacity-40" />
                        <h3 className="font-bold" style={{ color: theme.colors.text }}>Payslips - {selectedMonth}</h3>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="relative w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 opacity-30" />
                            <Input placeholder="Find employee..." className="pl-10 h-10 rounded-xl" value={search} onChange={e => setSearch(e.target.value)} />
                        </div>
                        <Button variant="outline" className="h-10 rounded-xl font-bold gap-2" onClick={handleBankFileDownload}><Download className="h-4 w-4" /> Bank File</Button>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr style={{ backgroundColor: `${theme.colors.primary}05`, borderBottom: `1px solid ${theme.colors.border}` }}>
                                <th className="p-5 font-black uppercase text-[10px] tracking-widest opacity-60 text-primary">Employee</th>
                                <th className="p-5 font-black uppercase text-[10px] tracking-widest opacity-60 text-primary">Gross Salary</th>
                                <th className="p-5 font-black uppercase text-[10px] tracking-widest opacity-60 text-primary">Deductions</th>
                                <th className="p-5 font-black uppercase text-[10px] tracking-widest opacity-60 text-center text-primary">Net Payable</th>
                                <th className="p-5 font-black uppercase text-[10px] tracking-widest opacity-60 text-center text-primary">Status</th>
                                <th className="p-5 font-black uppercase text-[10px] tracking-widest opacity-60 text-right text-primary">Accounting</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y" style={{ borderColor: theme.colors.border }}>
                            {loading ? (
                                Array(5).fill(0).map((_, i) => <tr key={i} className="animate-pulse"><td colSpan={6} className="p-8"><div className="h-6 bg-black/5 dark:bg-white/5 rounded-lg"></div></td></tr>)
                            ) : payrolls.length === 0 ? (
                                <tr><td colSpan={6} className="p-20 text-center"><p className="font-bold opacity-20">No payroll generated for this month yet.</p></td></tr>
                            ) : (
                                payrolls.filter(p => `${p.employee?.first_name} ${p.employee?.last_name}`.toLowerCase().includes(search.toLowerCase())).map((pay) => (
                                    <tr key={pay.id} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors group">
                                        <td className="p-5">
                                            <div className="flex items-center gap-3">
                                                <div className="h-9 w-9 rounded-xl flex items-center justify-center font-black text-xs" style={{ backgroundColor: `${theme.colors.primary}10`, color: theme.colors.primary }}>
                                                    {pay.employee?.first_name[0]}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-sm" style={{ color: theme.colors.text }}>{pay.employee?.first_name} {pay.employee?.last_name}</p>
                                                    <p className="text-[10px] font-black uppercase opacity-40">{pay.employee?.designation}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-5">
                                            <p className="font-bold text-xs" style={{ color: theme.colors.textSecondary }}>NPR {(Number(pay.basic_salary) + Number(pay.allowances)).toLocaleString()}</p>
                                        </td>
                                        <td className="p-5">
                                            <p className="text-red-500 font-bold text-xs">-(NPR {(Number(pay.ssf_contribution_employee) + Number(pay.cit_contribution) + Number(pay.income_tax)).toLocaleString()})</p>
                                        </td>
                                        <td className="p-5 text-center">
                                            <span className="font-black text-sm" style={{ color: theme.colors.text }}>NPR {Number(pay.net_salary).toLocaleString()}</span>
                                        </td>
                                        <td className="p-5 text-center">
                                            <Badge variant={getStatusVariant(pay.status)} className="font-black tracking-widest uppercase text-[10px]">
                                                {pay.status}
                                            </Badge>
                                        </td>
                                        <td className="p-5">
                                            <div className="flex items-center justify-end gap-2">
                                                {pay.status === HrPayrollStatus.PROCESSED ? (
                                                    <Button
                                                        size="sm"
                                                        className="h-8 rounded-lg text-[10px] font-black uppercase tracking-tight gap-1 bg-blue-500 hover:bg-blue-600"
                                                        onClick={() => handlePostToAccounting(pay.id)}
                                                    >
                                                        <Send className="h-3 w-3" /> Post Entry
                                                    </Button>
                                                ) : pay.status === HrPayrollStatus.PAID ? (
                                                    <div className="flex items-center gap-1 text-emerald-500 text-[10px] font-black uppercase">
                                                        <CheckCircle2 className="h-3 w-3" /> Synced
                                                    </div>
                                                ) : null}
                                                <button className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 opacity-0 group-hover:opacity-100 transition-all">
                                                    <Eye className="h-4 w-4 opacity-40" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
}
