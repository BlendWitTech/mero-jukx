import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from '@/contexts/ThemeContext';
import { BarChart3, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import * as khataService from '../services/khataService';

export default function ReportsPage() {
    const { theme } = useTheme();

    const currentYear = new Date().getFullYear();
    const [startDate, setStartDate] = useState(`${currentYear}-01-01`);
    const [endDate, setEndDate] = useState(`${currentYear}-12-31`);

    const { data: pnl, isLoading, refetch } = useQuery({
        queryKey: ['khata-pnl', startDate, endDate],
        queryFn: () => khataService.getPnlReport(startDate, endDate),
        enabled: !!(startDate && endDate),
    });

    const { data: summary } = useQuery({
        queryKey: ['khata-summary-report', startDate, endDate],
        queryFn: () => khataService.getEntrySummary(startDate, endDate),
        enabled: !!(startDate && endDate),
    });

    const maxAmount = pnl
        ? Math.max(
            ...((pnl.income || []).map((i: any) => Number(i.total))),
            ...((pnl.expenses || []).map((e: any) => Number(e.total))),
            1
          )
        : 1;

    return (
        <div className="p-6 max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/30">
                    <BarChart3 className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold" style={{ color: theme.colors.text }}>Profit & Loss Report</h1>
                    <p className="text-sm" style={{ color: theme.colors.textSecondary }}>Income vs expense breakdown by category</p>
                </div>
            </div>

            {/* Date Range */}
            <div className="flex flex-wrap items-end gap-3 mb-6 p-4 rounded-xl border" style={{ borderColor: theme.colors.border, backgroundColor: theme.colors.surface }}>
                <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: theme.colors.textSecondary }}>Start Date</label>
                    <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="px-3 py-2 rounded-lg border text-sm"
                        style={{ borderColor: theme.colors.border, backgroundColor: theme.colors.background, color: theme.colors.text }}
                    />
                </div>
                <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: theme.colors.textSecondary }}>End Date</label>
                    <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="px-3 py-2 rounded-lg border text-sm"
                        style={{ borderColor: theme.colors.border, backgroundColor: theme.colors.background, color: theme.colors.text }}
                    />
                </div>
                <button
                    onClick={() => refetch()}
                    className="px-4 py-2 rounded-lg text-white font-semibold text-sm"
                    style={{ backgroundColor: theme.colors.primary }}
                >
                    Generate Report
                </button>
            </div>

            {isLoading ? (
                <div className="text-center py-12" style={{ color: theme.colors.textSecondary }}>Generating report...</div>
            ) : pnl ? (
                <>
                    {/* KPI Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <div className="rounded-xl p-5 bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800">
                            <div className="flex items-center gap-2 text-green-600 dark:text-green-400 mb-2">
                                <TrendingUp className="w-5 h-5" />
                                <span className="text-sm font-semibold">Total Income</span>
                            </div>
                            <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                                Rs. {Number(pnl.totalIncome || 0).toLocaleString()}
                            </p>
                        </div>

                        <div className="rounded-xl p-5 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800">
                            <div className="flex items-center gap-2 text-red-600 dark:text-red-400 mb-2">
                                <TrendingDown className="w-5 h-5" />
                                <span className="text-sm font-semibold">Total Expenses</span>
                            </div>
                            <p className="text-2xl font-bold text-red-700 dark:text-red-300">
                                Rs. {Number(pnl.totalExpense || 0).toLocaleString()}
                            </p>
                        </div>

                        <div
                            className="rounded-xl p-5 border"
                            style={{ borderColor: theme.colors.border, backgroundColor: theme.colors.surface }}
                        >
                            <div className="flex items-center gap-2 mb-2" style={{ color: theme.colors.textSecondary }}>
                                <DollarSign className="w-5 h-5" />
                                <span className="text-sm font-semibold">Net Profit</span>
                            </div>
                            <p className={`text-2xl font-bold ${Number(pnl.grossProfit || 0) >= 0 ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
                                Rs. {Number(pnl.grossProfit || 0).toLocaleString()}
                            </p>
                            <p className="text-xs mt-1" style={{ color: theme.colors.textSecondary }}>
                                Margin: {pnl.totalIncome > 0 ? ((pnl.grossProfit / pnl.totalIncome) * 100).toFixed(1) : 0}%
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Income Breakdown */}
                        <div className="rounded-xl border overflow-hidden" style={{ borderColor: theme.colors.border, backgroundColor: theme.colors.surface }}>
                            <div className="px-5 py-4 border-b flex items-center gap-2" style={{ borderColor: theme.colors.border }}>
                                <TrendingUp className="w-4 h-4 text-green-600" />
                                <h3 className="font-semibold text-sm" style={{ color: theme.colors.text }}>Income by Category</h3>
                            </div>
                            <div className="p-5 space-y-3">
                                {(pnl.income || []).length === 0 ? (
                                    <p className="text-sm text-center py-4" style={{ color: theme.colors.textSecondary }}>No income entries</p>
                                ) : (
                                    (pnl.income || []).map((item: any) => (
                                        <div key={item.category}>
                                            <div className="flex justify-between text-sm mb-1">
                                                <span style={{ color: theme.colors.text }}>{item.category || 'Uncategorized'}</span>
                                                <span className="font-medium text-green-600 dark:text-green-400">
                                                    Rs. {Number(item.total).toLocaleString()}
                                                </span>
                                            </div>
                                            <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                                                <div
                                                    className="h-full rounded-full bg-green-500"
                                                    style={{ width: `${(Number(item.total) / maxAmount) * 100}%` }}
                                                />
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Expense Breakdown */}
                        <div className="rounded-xl border overflow-hidden" style={{ borderColor: theme.colors.border, backgroundColor: theme.colors.surface }}>
                            <div className="px-5 py-4 border-b flex items-center gap-2" style={{ borderColor: theme.colors.border }}>
                                <TrendingDown className="w-4 h-4 text-red-600" />
                                <h3 className="font-semibold text-sm" style={{ color: theme.colors.text }}>Expenses by Category</h3>
                            </div>
                            <div className="p-5 space-y-3">
                                {(pnl.expenses || []).length === 0 ? (
                                    <p className="text-sm text-center py-4" style={{ color: theme.colors.textSecondary }}>No expense entries</p>
                                ) : (
                                    (pnl.expenses || []).map((item: any) => (
                                        <div key={item.category}>
                                            <div className="flex justify-between text-sm mb-1">
                                                <span style={{ color: theme.colors.text }}>{item.category || 'Uncategorized'}</span>
                                                <span className="font-medium text-red-600 dark:text-red-400">
                                                    Rs. {Number(item.total).toLocaleString()}
                                                </span>
                                            </div>
                                            <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                                                <div
                                                    className="h-full rounded-full bg-red-500"
                                                    style={{ width: `${(Number(item.total) / maxAmount) * 100}%` }}
                                                />
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    {/* P&L Summary Table */}
                    <div className="rounded-xl border overflow-hidden mt-6" style={{ borderColor: theme.colors.border, backgroundColor: theme.colors.surface }}>
                        <div className="px-5 py-4 border-b" style={{ borderColor: theme.colors.border }}>
                            <h3 className="font-semibold" style={{ color: theme.colors.text }}>Profit & Loss Statement</h3>
                            <p className="text-xs mt-0.5" style={{ color: theme.colors.textSecondary }}>
                                {new Date(startDate).toLocaleDateString()} — {new Date(endDate).toLocaleDateString()}
                            </p>
                        </div>
                        <div className="p-5">
                            <div className="flex justify-between py-2 border-b font-semibold" style={{ borderColor: theme.colors.border, color: theme.colors.text }}>
                                <span>Total Revenue (Income)</span>
                                <span className="text-green-600">Rs. {Number(pnl.totalIncome || 0).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between py-2 border-b" style={{ borderColor: theme.colors.border, color: theme.colors.textSecondary }}>
                                <span>Less: Total Expenses</span>
                                <span className="text-red-500">(Rs. {Number(pnl.totalExpense || 0).toLocaleString()})</span>
                            </div>
                            <div className="flex justify-between py-3 font-bold text-lg" style={{ color: theme.colors.text }}>
                                <span>Net Profit / (Loss)</span>
                                <span className={Number(pnl.grossProfit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}>
                                    Rs. {Number(pnl.grossProfit || 0).toLocaleString()}
                                </span>
                            </div>
                        </div>
                    </div>
                </>
            ) : (
                <div className="text-center py-16 rounded-xl border" style={{ borderColor: theme.colors.border }}>
                    <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-30" style={{ color: theme.colors.textSecondary }} />
                    <p className="font-medium" style={{ color: theme.colors.text }}>Select a date range to generate P&L report</p>
                </div>
            )}
        </div>
    );
}
