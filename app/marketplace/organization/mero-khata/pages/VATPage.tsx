import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from '@/contexts/ThemeContext';
import { Percent, ArrowUpCircle, ArrowDownCircle, Calculator } from 'lucide-react';
import * as khataService from '../services/khataService';

export default function VATPage() {
    const { theme } = useTheme();

    const currentYear = new Date().getFullYear();
    const [startDate, setStartDate] = useState(`${currentYear}-01-01`);
    const [endDate, setEndDate] = useState(`${currentYear}-12-31`);

    const { data: vatData, isLoading, refetch } = useQuery({
        queryKey: ['khata-vat', startDate, endDate],
        queryFn: () => khataService.getVatSummary(startDate, endDate),
        enabled: !!(startDate && endDate),
    });

    return (
        <div className="p-6 max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                    <Percent className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold" style={{ color: theme.colors.text }}>VAT Summary</h1>
                    <p className="text-sm" style={{ color: theme.colors.textSecondary }}>Nepal VAT at 13% — Input/Output tax reconciliation</p>
                </div>
            </div>

            {/* Date Range Filter */}
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
                    Calculate
                </button>
            </div>

            {isLoading ? (
                <div className="text-center py-12" style={{ color: theme.colors.textSecondary }}>Calculating VAT...</div>
            ) : vatData ? (
                <>
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <div className="rounded-xl p-5 border bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-800">
                            <div className="flex items-center gap-2 text-green-600 dark:text-green-400 mb-2">
                                <ArrowUpCircle className="w-5 h-5" />
                                <span className="text-sm font-semibold">Output VAT</span>
                            </div>
                            <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                                Rs. {Number(vatData.outputVat || 0).toFixed(2)}
                            </p>
                            <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                                Sales: Rs. {Number(vatData.totalSales || 0).toLocaleString()}
                            </p>
                        </div>

                        <div className="rounded-xl p-5 border bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-800">
                            <div className="flex items-center gap-2 text-red-600 dark:text-red-400 mb-2">
                                <ArrowDownCircle className="w-5 h-5" />
                                <span className="text-sm font-semibold">Input VAT</span>
                            </div>
                            <p className="text-2xl font-bold text-red-700 dark:text-red-300">
                                Rs. {Number(vatData.inputVat || 0).toFixed(2)}
                            </p>
                            <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                                Purchases: Rs. {Number(vatData.totalPurchases || 0).toLocaleString()}
                            </p>
                        </div>

                        <div
                            className="rounded-xl p-5 border"
                            style={{
                                borderColor: theme.colors.border,
                                backgroundColor: Number(vatData.vatPayable || 0) > 0 ? '#fef3c7' : '#f0fdf4',
                            }}
                        >
                            <div className="flex items-center gap-2 mb-2" style={{ color: theme.colors.text }}>
                                <Calculator className="w-5 h-5" />
                                <span className="text-sm font-semibold">VAT Payable</span>
                            </div>
                            <p className="text-2xl font-bold" style={{ color: Number(vatData.vatPayable || 0) > 0 ? '#b45309' : '#15803d' }}>
                                Rs. {Number(vatData.vatPayable || 0).toFixed(2)}
                            </p>
                            <p className="text-xs mt-1" style={{ color: theme.colors.textSecondary }}>
                                {Number(vatData.vatPayable || 0) > 0 ? 'Amount payable to IRD' : 'VAT credit available'}
                            </p>
                        </div>
                    </div>

                    {/* Detailed Breakdown */}
                    <div className="rounded-xl border overflow-hidden" style={{ borderColor: theme.colors.border, backgroundColor: theme.colors.surface }}>
                        <div className="px-6 py-4 border-b" style={{ borderColor: theme.colors.border }}>
                            <h3 className="font-semibold" style={{ color: theme.colors.text }}>VAT Computation</h3>
                        </div>
                        <div className="p-6 space-y-3">
                            <div className="flex justify-between text-sm py-2 border-b" style={{ borderColor: theme.colors.border }}>
                                <span style={{ color: theme.colors.textSecondary }}>Total Taxable Sales</span>
                                <span className="font-medium" style={{ color: theme.colors.text }}>Rs. {Number(vatData.totalSales || 0).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-sm py-2 border-b" style={{ borderColor: theme.colors.border }}>
                                <span style={{ color: theme.colors.textSecondary }}>Output VAT (13% on Sales)</span>
                                <span className="font-medium text-green-600 dark:text-green-400">Rs. {Number(vatData.outputVat || 0).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-sm py-2 border-b" style={{ borderColor: theme.colors.border }}>
                                <span style={{ color: theme.colors.textSecondary }}>Total Taxable Purchases</span>
                                <span className="font-medium" style={{ color: theme.colors.text }}>Rs. {Number(vatData.totalPurchases || 0).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-sm py-2 border-b" style={{ borderColor: theme.colors.border }}>
                                <span style={{ color: theme.colors.textSecondary }}>Input VAT (from bills)</span>
                                <span className="font-medium text-red-600 dark:text-red-400">Rs. {Number(vatData.inputVat || 0).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-sm py-3 font-bold" style={{ color: theme.colors.text }}>
                                <span>Net VAT Payable (Output - Input)</span>
                                <span className={Number(vatData.vatPayable || 0) > 0 ? 'text-amber-600' : 'text-green-600'}>
                                    Rs. {Number(vatData.vatPayable || 0).toFixed(2)}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="mt-4 p-4 rounded-xl border border-blue-100 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20">
                        <p className="text-sm text-blue-700 dark:text-blue-300 font-medium">Note</p>
                        <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                            This is a simplified VAT summary based on Mero Khata invoices and bills.
                            For official IRD filings, please use the official VAT return forms (VAT-03/VAT-09).
                            Output VAT is calculated from non-draft invoices. Input VAT is from bills (paid/pending).
                        </p>
                    </div>
                </>
            ) : (
                <div className="text-center py-16 rounded-xl border" style={{ borderColor: theme.colors.border }}>
                    <Percent className="w-12 h-12 mx-auto mb-3 opacity-30" style={{ color: theme.colors.textSecondary }} />
                    <p className="font-medium" style={{ color: theme.colors.text }}>Select a date range to view VAT summary</p>
                </div>
            )}
        </div>
    );
}
