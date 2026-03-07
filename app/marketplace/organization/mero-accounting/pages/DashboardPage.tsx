import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/services/api';
import { useTheme } from '@/contexts/ThemeContext';
import {
    TrendingUp,
    FileText,
    PieChart,
    ArrowUpRight,
    ArrowDownRight,
    Calendar,
    LayoutDashboard,
    ChevronRight,
    ExternalLink,
    Download,
    History,
    ShieldCheck
} from 'lucide-react';
import BikramSambatDatePicker from '@/components/nepal/BikramSambatDatePicker';
import { formatNPR, adToBs } from '@/utils/nepaliDateUtils';
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

export default function DashboardPage() {
    const { theme } = useTheme();
    const [date, setDate] = useState(new Date());

    const { data: plData, isLoading } = useQuery({
        queryKey: ['accounting-pl', date.getFullYear()],
        queryFn: async () => {
            const yearStr = date.getFullYear() + 56; // Rough BS year for filtering
            const response = await api.get('/accounting/reports/profit-and-loss', {
                params: {
                    startDate: `${yearStr}-01-01`,
                    endDate: `${yearStr}-12-30`
                }
            });
            return response.data;
        }
    });

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: theme.colors.primary }}></div>
            </div>
        );
    }

    const stats = [
        { label: 'Total Revenue', value: plData?.totalRevenue || 0, icon: ArrowUpRight, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/10' },
        { label: 'Total Expenses', value: plData?.totalExpense || 0, icon: ArrowDownRight, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-900/10' },
        { label: 'Net Profit', value: plData?.netProfit || 0, icon: TrendingUp, color: 'text-primary', bg: 'bg-primary/10', useTheme: true },
        { label: 'Pending Invoices', value: 0, icon: FileText, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/10' },
    ];

    return (
        <div className="p-8 max-w-[1600px] mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="flex items-center gap-4">
                    <div className="p-3 rounded-2xl" style={{ backgroundColor: `${theme.colors.primary}15` }}>
                        <LayoutDashboard className="h-8 w-8" style={{ color: theme.colors.primary }} />
                    </div>
                    <div>
                        <h1 className="text-4xl font-extrabold tracking-tight" style={{ color: theme.colors.text }}>
                            Accounting Overview
                        </h1>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="opacity-70 text-sm font-medium" style={{ color: theme.colors.textSecondary }}>
                                Real-time financial status
                            </span>
                            <div className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700 mx-1" />
                            <span className="text-xs font-extrabold text-primary px-2 py-0.5 rounded-full bg-primary/10" style={{ color: theme.colors.primary, backgroundColor: `${theme.colors.primary}15` }}>
                                Today: {adToBs(new Date()).formatted} BS
                            </span>
                        </div>
                    </div>
                </div>
                <div className="w-full md:w-72">
                    <BikramSambatDatePicker
                        label="Fiscal Period"
                        value={date}
                        onChange={setDate}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat, idx) => (
                    <Card key={idx} className="p-7 border-none shadow-sm hover:shadow-md transition-all group" style={{ backgroundColor: theme.colors.surface, borderRadius: '24px' }}>
                        <div className="flex justify-between items-start mb-6">
                            <div
                                className={`p-4 rounded-2xl ${stat.bg} transition-transform group-hover:scale-110 duration-300`}
                                style={stat.useTheme ? { color: theme.colors.primary, backgroundColor: `${theme.colors.primary}15` } : {}}
                            >
                                <stat.icon className="w-6 h-6" />
                            </div>
                            <div className="flex flex-col items-end">
                                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Growth</span>
                                <span className="text-xs font-bold text-green-500">+0%</span>
                            </div>
                        </div>
                        <h3 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1">{stat.label}</h3>
                        <div className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                            {formatNPR(stat.value)}
                        </div>
                    </Card>
                ))}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                <Card className="xl:col-span-2 p-8 border-none shadow-sm" style={{ backgroundColor: theme.colors.surface, borderRadius: '24px' }}>
                    <div className="flex justify-between items-center mb-8">
                        <h2 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-primary/10" style={{ backgroundColor: `${theme.colors.primary}15` }}>
                                <PieChart className="w-5 h-5 text-primary" style={{ color: theme.colors.primary }} />
                            </div>
                            Expense Breakdown
                        </h2>
                        <Button variant="ghost" className="text-xs font-extrabold text-primary uppercase tracking-widest hover:bg-primary/5" style={{ color: theme.colors.primary }}>
                            View Full Report
                            <ChevronRight className="ml-1 h-3 w-3" />
                        </Button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {plData?.expense?.map((exp: any) => (
                            <div key={exp.id} className="flex items-center justify-between p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700/50 hover-theme transition-all group overflow-hidden relative">
                                <div className="flex items-center gap-4 relative z-10">
                                    <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-800 flex items-center justify-center font-extrabold text-slate-400 border border-slate-100 dark:border-slate-700 group-hover:text-primary group-hover:border-primary/20 transition-all">
                                        {exp.code}
                                    </div>
                                    <div className="font-bold text-slate-700 dark:text-slate-200 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">{exp.name}</div>
                                </div>
                                <div className="font-extrabold text-slate-900 dark:text-white relative z-10">{formatNPR(exp.balance)}</div>
                                <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-500" />
                            </div>
                        ))}
                        {(!plData?.expense || plData.expense.length === 0) && (
                            <div className="col-span-2 text-center py-20 text-slate-400">
                                <FileText className="mx-auto mb-4 opacity-10" size={64} />
                                <p className="font-extrabold uppercase tracking-widest text-xs">No expenses recorded for this period.</p>
                            </div>
                        )}
                    </div>
                </Card>

                <Card className="rounded-[24px] p-8 text-white shadow-2xl shadow-primary/20 flex flex-col justify-between overflow-hidden relative border-none" style={{ backgroundColor: theme.colors.primary }}>
                    <div className="absolute top-0 right-0 p-4 opacity-10 rotate-12 scale-150">
                        <TrendingUp size={140} />
                    </div>
                    <div className="relative z-10">
                        <p className="text-[10px] font-extrabold uppercase tracking-widest opacity-80 mb-3 bg-white/10 w-fit px-3 py-1 rounded-full backdrop-blur-sm">Financial Health</p>
                        <h2 className="text-3xl font-extrabold mb-6 tracking-tight">Performance Summary</h2>
                        <p className="text-sm opacity-90 leading-relaxed font-medium">
                            Your organization's net profit stands at <span className="font-extrabold bg-white/20 px-2 py-0.5 rounded-lg">{formatNPR(plData?.netProfit || 0)}</span> for the current fiscal period. Keep up the great work!
                        </p>
                    </div>
                    <Button className="w-full h-14 bg-white/20 backdrop-blur-md rounded-2xl font-extrabold text-xs uppercase tracking-widest hover:bg-white/30 transition-all mt-8 relative z-10 hover-theme-strong">
                        <Download className="mr-2 h-4 w-4" />
                        Download Summary
                    </Button>
                </Card>
            </div>
        </div>
    );
}
