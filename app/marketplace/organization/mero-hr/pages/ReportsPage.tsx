import React, { useState } from 'react';
import {
    FileBarChart, Download, RefreshCw, TrendingUp, Shield,
    PiggyBank, ArrowUpRight, CalendarDays, Award, Loader2,
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { Card, Button, Input } from '@shared';
import { useQuery } from '@tanstack/react-query';
import { hrService } from '../services/hrService';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

type TabKey = 'ssf-cit' | 'gratuity';

export default function ReportsPage() {
    const { theme } = useTheme();
    const [activeTab, setActiveTab] = useState<TabKey>('ssf-cit');
    const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));

    const { data: payrolls = [], isLoading: payrollLoading, refetch } = useQuery({
        queryKey: ['hr-reports-payroll', selectedMonth],
        queryFn: () => hrService.getPayrollHistory(selectedMonth),
    });

    const { data: gratuityData = [], isLoading: gratuityLoading } = useQuery({
        queryKey: ['hr-gratuity-report'],
        queryFn: () => hrService.getGratuityReport(),
        enabled: activeTab === 'gratuity',
    });

    const summary = (payrolls as any[]).reduce(
        (acc, p) => ({
            totalBasic: acc.totalBasic + Number(p.basic_salary),
            totalAllowances: acc.totalAllowances + Number(p.allowances || 0),
            totalSSFEmployee: acc.totalSSFEmployee + Number(p.ssf_contribution_employee),
            totalSSFEmployer: acc.totalSSFEmployer + Number(p.ssf_contribution_employer),
            totalSSFCombined: acc.totalSSFCombined + Number(p.ssf_contribution_employee) + Number(p.ssf_contribution_employer),
            totalCIT: acc.totalCIT + Number(p.cit_contribution || 0),
            totalIncomeTax: acc.totalIncomeTax + Number(p.income_tax),
            totalNetSalary: acc.totalNetSalary + Number(p.net_salary),
            totalEmployeeCount: acc.totalEmployeeCount + 1,
        }),
        { totalBasic: 0, totalAllowances: 0, totalSSFEmployee: 0, totalSSFEmployer: 0, totalSSFCombined: 0, totalCIT: 0, totalIncomeTax: 0, totalNetSalary: 0, totalEmployeeCount: 0 }
    );

    const handleExportSSFCsv = () => {
        if ((payrolls as any[]).length === 0) { toast.error('No payroll data to export'); return; }
        const header = 'Employee,Basic Salary,SSF Employee (11%),SSF Employer (20%),CIT,Income Tax,Net Salary\n';
        const rows = (payrolls as any[]).map(p =>
            `"${p.employee?.first_name} ${p.employee?.last_name}",${p.basic_salary},${p.ssf_contribution_employee},${p.ssf_contribution_employer},${p.cit_contribution || 0},${p.income_tax},${p.net_salary}`
        ).join('\n');
        const total = `"TOTAL (${summary.totalEmployeeCount} employees)",${summary.totalBasic},${summary.totalSSFEmployee},${summary.totalSSFEmployer},${summary.totalCIT},${summary.totalIncomeTax},${summary.totalNetSalary}`;
        const csv = header + rows + '\n' + total;
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `ssf-cit-report-${selectedMonth}.csv`; a.click();
        URL.revokeObjectURL(url);
        toast.success('CSV exported');
    };

    const handleExportGratuityCsv = () => {
        if ((gratuityData as any[]).length === 0) { toast.error('No gratuity data to export'); return; }
        const header = 'Employee,Joining Date,Years of Service,Basic (Monthly),Rate %,Monthly Accrual,Accrued Gratuity,Eligible\n';
        const rows = (gratuityData as any[]).map(g =>
            `"${g.employee_name}",${g.joining_date},${g.years_of_service},${g.basic_monthly},${g.rate_percent},${g.monthly_accrual},${g.accrued_gratuity},${g.eligible ? 'Yes' : 'No'}`
        ).join('\n');
        const csv = header + rows;
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = `gratuity-report.csv`; a.click();
        URL.revokeObjectURL(url);
        toast.success('Gratuity report exported');
    };

    const statCards = [
        { label: 'SSF – Employee (11%)', value: summary.totalSSFEmployee, icon: Shield, color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/30', description: 'Deducted from employee gross' },
        { label: 'SSF – Employer (20%)', value: summary.totalSSFEmployer, icon: TrendingUp, color: 'text-purple-500', bg: 'bg-purple-500/10', border: 'border-purple-500/30', description: 'Company contribution to SSF' },
        { label: 'CIT Deductions', value: summary.totalCIT, icon: PiggyBank, color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/30', description: 'Citizen Investment Trust' },
        { label: 'Income Tax (PIT)', value: summary.totalIncomeTax, icon: FileBarChart, color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/30', description: 'Progressive slab-based tax' },
    ];

    const totalGratuityAccrued = (gratuityData as any[]).reduce((s, g) => s + (g.accrued_gratuity || 0), 0);
    const totalMonthlyAccrual = (gratuityData as any[]).reduce((s, g) => s + (g.monthly_accrual || 0), 0);
    const eligibleCount = (gratuityData as any[]).filter(g => g.eligible).length;

    return (
        <div className="p-8 space-y-8 max-w-[1600px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-5">
                    <div className="p-4 rounded-2xl shadow-lg border bg-blue-500/10 border-blue-500/30">
                        <FileBarChart className="h-8 w-8 text-blue-500" />
                    </div>
                    <div>
                        <h1 className="text-4xl font-black tracking-tight" style={{ color: theme.colors.text }}>HR Reports</h1>
                        <p className="font-medium opacity-60" style={{ color: theme.colors.textSecondary }}>Nepal statutory compliance — SSF, CIT, Gratuity</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {/* Tab switcher */}
                    <div className="flex rounded-xl border p-1 gap-1" style={{ borderColor: theme.colors.border, backgroundColor: theme.colors.surface }}>
                        {[{ key: 'ssf-cit', label: 'SSF/CIT' }, { key: 'gratuity', label: 'Gratuity' }].map(tab => (
                            <button key={tab.key} onClick={() => setActiveTab(tab.key as TabKey)}
                                className="px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all"
                                style={{ backgroundColor: activeTab === tab.key ? theme.colors.primary : 'transparent', color: activeTab === tab.key ? '#fff' : theme.colors.text, opacity: activeTab === tab.key ? 1 : 0.5 }}>
                                {tab.label}
                            </button>
                        ))}
                    </div>
                    {activeTab === 'ssf-cit' && (
                        <>
                            <div className="flex bg-black/5 dark:bg-white/5 p-1 rounded-xl border" style={{ borderColor: theme.colors.border }}>
                                <Input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="bg-transparent border-none h-10 w-40 font-bold" />
                            </div>
                            <Button onClick={() => refetch()} variant="outline" className="h-10 rounded-xl font-bold gap-2">
                                <RefreshCw className={`h-4 w-4 ${payrollLoading ? 'animate-spin' : ''}`} /> Refresh
                            </Button>
                            <Button onClick={handleExportSSFCsv} className="h-10 rounded-xl font-black gap-2">
                                <Download className="h-4 w-4" /> Export CSV
                            </Button>
                        </>
                    )}
                    {activeTab === 'gratuity' && (
                        <Button onClick={handleExportGratuityCsv} className="h-10 rounded-xl font-black gap-2">
                            <Download className="h-4 w-4" /> Export CSV
                        </Button>
                    )}
                </div>
            </div>

            {/* ── SSF/CIT TAB ── */}
            {activeTab === 'ssf-cit' && (
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {statCards.map(card => {
                            const Icon = card.icon;
                            return (
                                <Card key={card.label} className={`p-6 border shadow-xl relative overflow-hidden group ${card.border}`} style={{ backgroundColor: theme.colors.surface }}>
                                    <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:scale-110 transition-transform duration-500">
                                        <ArrowUpRight size={64} style={{ color: theme.colors.text }} />
                                    </div>
                                    <div className={`inline-flex p-2.5 rounded-xl ${card.bg} mb-4`}>
                                        <Icon className={`h-5 w-5 ${card.color}`} />
                                    </div>
                                    <p className="text-[10px] font-black uppercase tracking-widest opacity-50 mb-1" style={{ color: theme.colors.text }}>{card.label}</p>
                                    <p className={`text-3xl font-black ${card.color}`}>{payrollLoading ? '—' : `NPR ${card.value.toLocaleString()}`}</p>
                                    <p className="text-xs opacity-50 mt-2" style={{ color: theme.colors.textSecondary }}>{card.description}</p>
                                </Card>
                            );
                        })}
                    </div>

                    {!payrollLoading && (payrolls as any[]).length > 0 && (
                        <Card className="p-6 border-none shadow-xl" style={{ backgroundColor: theme.colors.surface }}>
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="flex items-center gap-4">
                                    <CalendarDays className="h-6 w-6 opacity-40" style={{ color: theme.colors.text }} />
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-widest opacity-40" style={{ color: theme.colors.text }}>Total Statutory Remittance for {selectedMonth}</p>
                                        <p className="text-3xl font-black" style={{ color: theme.colors.text }}>NPR {(summary.totalSSFCombined + summary.totalCIT + summary.totalIncomeTax).toLocaleString()}</p>
                                    </div>
                                </div>
                                <p className="text-sm opacity-60 font-medium max-w-sm" style={{ color: theme.colors.textSecondary }}>
                                    Across <strong>{summary.totalEmployeeCount}</strong> employees — includes SSF (employee + employer), CIT, and income tax withheld.
                                </p>
                            </div>
                        </Card>
                    )}

                    <Card className="border-none shadow-xl overflow-hidden" style={{ backgroundColor: theme.colors.surface }}>
                        <div className="px-8 py-6 border-b flex items-center gap-2" style={{ borderColor: theme.colors.border }}>
                            <FileBarChart className="h-5 w-5 opacity-40" />
                            <h3 className="font-bold" style={{ color: theme.colors.text }}>Per-Employee Breakdown — {selectedMonth}</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr style={{ backgroundColor: `${theme.colors.primary}05`, borderBottom: `1px solid ${theme.colors.border}` }}>
                                        {['Employee', 'Basic Salary', 'SSF (Emp 11%)', 'SSF (Emp 20%)', 'CIT', 'Income Tax', 'Net Salary'].map(h => (
                                            <th key={h} className="p-4 font-black uppercase text-[10px] tracking-widest opacity-60 text-left text-primary">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y" style={{ borderColor: theme.colors.border }}>
                                    {payrollLoading ? (
                                        Array(5).fill(0).map((_, i) => (
                                            <tr key={i} className="animate-pulse"><td colSpan={7} className="p-6"><div className="h-5 bg-black/5 dark:bg-white/5 rounded-lg" /></td></tr>
                                        ))
                                    ) : (payrolls as any[]).length === 0 ? (
                                        <tr><td colSpan={7} className="p-20 text-center"><p className="font-bold opacity-20">No payroll generated for this month.</p></td></tr>
                                    ) : (
                                        (payrolls as any[]).map(pay => (
                                            <tr key={pay.id} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                                                <td className="p-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-8 w-8 rounded-lg flex items-center justify-center font-black text-xs" style={{ backgroundColor: `${theme.colors.primary}15`, color: theme.colors.primary }}>{pay.employee?.first_name?.[0]}</div>
                                                        <div>
                                                            <p className="font-bold text-sm" style={{ color: theme.colors.text }}>{pay.employee?.first_name} {pay.employee?.last_name}</p>
                                                            <p className="text-[10px] opacity-40 uppercase font-black">{pay.employee?.designation || '—'}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-4 font-mono font-bold text-sm" style={{ color: theme.colors.text }}>{Number(pay.basic_salary).toLocaleString()}</td>
                                                <td className="p-4 font-mono font-bold text-sm text-blue-500">{Number(pay.ssf_contribution_employee).toLocaleString()}</td>
                                                <td className="p-4 font-mono font-bold text-sm text-purple-500">{Number(pay.ssf_contribution_employer).toLocaleString()}</td>
                                                <td className="p-4 font-mono font-bold text-sm text-amber-500">{Number(pay.cit_contribution || 0).toLocaleString()}</td>
                                                <td className="p-4 font-mono font-bold text-sm text-red-500">{Number(pay.income_tax).toLocaleString()}</td>
                                                <td className="p-4 font-mono font-black text-sm" style={{ color: theme.colors.text }}>NPR {Number(pay.net_salary).toLocaleString()}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                                {!payrollLoading && (payrolls as any[]).length > 0 && (
                                    <tfoot>
                                        <tr style={{ backgroundColor: `${theme.colors.primary}08`, borderTop: `2px solid ${theme.colors.border}` }}>
                                            <td className="p-4 font-black text-[10px] uppercase tracking-widest opacity-60" style={{ color: theme.colors.text }}>TOTAL ({summary.totalEmployeeCount} employees)</td>
                                            <td className="p-4 font-black font-mono text-sm" style={{ color: theme.colors.text }}>{summary.totalBasic.toLocaleString()}</td>
                                            <td className="p-4 font-black font-mono text-sm text-blue-500">{summary.totalSSFEmployee.toLocaleString()}</td>
                                            <td className="p-4 font-black font-mono text-sm text-purple-500">{summary.totalSSFEmployer.toLocaleString()}</td>
                                            <td className="p-4 font-black font-mono text-sm text-amber-500">{summary.totalCIT.toLocaleString()}</td>
                                            <td className="p-4 font-black font-mono text-sm text-red-500">{summary.totalIncomeTax.toLocaleString()}</td>
                                            <td className="p-4 font-black font-mono text-sm" style={{ color: theme.colors.text }}>NPR {summary.totalNetSalary.toLocaleString()}</td>
                                        </tr>
                                    </tfoot>
                                )}
                            </table>
                        </div>
                    </Card>
                </>
            )}

            {/* ── GRATUITY TAB ── */}
            {activeTab === 'gratuity' && (
                <>
                    {/* Info Banner */}
                    <Card className="p-5 border-none shadow-lg" style={{ backgroundColor: `${theme.colors.primary}08` }}>
                        <p className="text-xs font-bold opacity-70" style={{ color: theme.colors.text }}>
                            <strong>Nepal Labor Act 2074 — Gratuity:</strong> Employees with ≥1 year receive 8.33% of annual basic per year of service. Employees with ≥7 years receive 12.5% per year.
                        </p>
                    </Card>

                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {[
                            { label: 'Total Accrued Gratuity', value: `NPR ${totalGratuityAccrued.toLocaleString()}`, color: 'text-emerald-500', icon: Award },
                            { label: 'Monthly Accrual', value: `NPR ${totalMonthlyAccrual.toLocaleString()}`, color: 'text-blue-500', icon: TrendingUp },
                            { label: 'Eligible Employees', value: `${eligibleCount} / ${(gratuityData as any[]).length}`, color: 'text-purple-500', icon: Shield },
                        ].map(stat => {
                            const Icon = stat.icon;
                            return (
                                <Card key={stat.label} className="p-6 border-none shadow-xl" style={{ backgroundColor: theme.colors.surface }}>
                                    <div className="flex items-center gap-3 mb-3">
                                        <Icon className={`h-5 w-5 ${stat.color}`} />
                                        <p className="text-[10px] font-black uppercase tracking-widest opacity-50" style={{ color: theme.colors.text }}>{stat.label}</p>
                                    </div>
                                    <p className={`text-3xl font-black ${stat.color}`}>{gratuityLoading ? '—' : stat.value}</p>
                                </Card>
                            );
                        })}
                    </div>

                    <Card className="border-none shadow-xl overflow-hidden" style={{ backgroundColor: theme.colors.surface }}>
                        <div className="px-8 py-6 border-b flex items-center gap-2" style={{ borderColor: theme.colors.border }}>
                            <Award className="h-5 w-5 opacity-40" />
                            <h3 className="font-bold" style={{ color: theme.colors.text }}>Employee Gratuity Accrual</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr style={{ backgroundColor: `${theme.colors.primary}05`, borderBottom: `1px solid ${theme.colors.border}` }}>
                                        {['Employee', 'Joining Date', 'Years', 'Basic (Monthly)', 'Rate', 'Monthly Accrual', 'Total Accrued', 'Status'].map(h => (
                                            <th key={h} className="p-4 font-black uppercase text-[10px] tracking-widest opacity-60 text-left" style={{ color: theme.colors.text }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y" style={{ borderColor: theme.colors.border }}>
                                    {gratuityLoading ? (
                                        Array(5).fill(0).map((_, i) => (
                                            <tr key={i} className="animate-pulse"><td colSpan={8} className="p-6"><div className="h-5 bg-black/5 dark:bg-white/5 rounded-lg" /></td></tr>
                                        ))
                                    ) : (gratuityData as any[]).length === 0 ? (
                                        <tr><td colSpan={8} className="p-20 text-center"><p className="font-bold opacity-20">No employees found.</p></td></tr>
                                    ) : (
                                        (gratuityData as any[]).map(emp => (
                                            <tr key={emp.employee_id} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                                                <td className="p-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-8 w-8 rounded-lg flex items-center justify-center font-black text-xs" style={{ backgroundColor: `${theme.colors.primary}15`, color: theme.colors.primary }}>{emp.employee_name?.[0]}</div>
                                                        <div>
                                                            <p className="font-bold text-sm" style={{ color: theme.colors.text }}>{emp.employee_name}</p>
                                                            <p className="text-[10px] opacity-40 uppercase font-black">{emp.designation || '—'}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-4 text-sm" style={{ color: theme.colors.textSecondary }}>{emp.joining_date ? new Date(emp.joining_date).toLocaleDateString() : '—'}</td>
                                                <td className="p-4 font-black text-sm" style={{ color: theme.colors.text }}>{emp.years_of_service}y</td>
                                                <td className="p-4 font-mono text-sm" style={{ color: theme.colors.text }}>NPR {Number(emp.basic_monthly).toLocaleString()}</td>
                                                <td className="p-4 font-bold text-sm text-blue-500">{emp.rate_percent}%</td>
                                                <td className="p-4 font-mono font-bold text-sm text-emerald-500">NPR {Number(emp.monthly_accrual).toLocaleString()}</td>
                                                <td className="p-4 font-mono font-black text-sm text-emerald-600">NPR {Number(emp.accrued_gratuity).toLocaleString()}</td>
                                                <td className="p-4">
                                                    <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-full ${emp.eligible ? 'bg-green-100 text-green-600 dark:bg-green-900/30' : 'bg-red-100 text-red-500 dark:bg-red-900/30'}`}>
                                                        {emp.eligible ? 'Eligible' : 'Not Eligible'}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </>
            )}
        </div>
    );
}
