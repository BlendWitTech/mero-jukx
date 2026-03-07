import React from 'react';
import { useTheme } from '@frontend/contexts/ThemeContext';
import { useQuery } from '@tanstack/react-query';
import api from '@frontend/services/api';
import { Card, CardContent, CardHeader, CardTitle, Loading, Badge } from '@shared/frontend';
import { DollarSign, Package, Warehouse, ArrowUp } from 'lucide-react';
import { useAuthStore } from '@frontend/store/authStore';

interface StockValuation {
    productId: string;
    productName: string;
    sku: string;
    category: string;
    warehouseName: string;
    availableQuantity: number;
    unitPrice: number;
    totalValue: number;
}

export default function ValuationPage() {
    const { theme } = useTheme();
    const { organization } = useAuthStore();

    const { data: valuationData, isLoading } = useQuery<{
        data: StockValuation[];
        summary: {
            totalItems: number;
            totalValue: number;
            warehouseBreakdown: Record<string, number>;
            categoryBreakdown: Record<string, number>;
        }
    }>({
        queryKey: ['inventory', 'reports', 'valuation', organization?.id],
        queryFn: async () => {
            const response = await api.get(`/inventory/reports/valuation`);
            return response.data;
        },
        enabled: !!organization?.id,
    });

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loading size="lg" text="Calculating stock value..." />
            </div>
        );
    }

    const reportData = valuationData?.data || [];
    const summary = valuationData?.summary || { totalItems: 0, totalValue: 0, warehouseBreakdown: {}, categoryBreakdown: {} };

    return (
        <div className="p-8 max-w-[1400px] mx-auto space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight" style={{ color: theme.colors.text }}>
                        Stock Valuation Report
                    </h1>
                    <p className="text-sm mt-1" style={{ color: theme.colors.textSecondary }}>
                        Real-time financial assessment of your current inventory assets
                    </p>
                </div>
                <div
                    className="flex items-center gap-3 px-4 py-2 rounded-xl border"
                    style={{ backgroundColor: `${theme.colors.primary}10`, borderColor: `${theme.colors.primary}30` }}
                >
                    <DollarSign className="h-5 w-5" style={{ color: theme.colors.primary }} />
                    <div>
                        <p className="text-xs font-semibold uppercase" style={{ color: `${theme.colors.primary}80` }}>
                            Total Inventory Value
                        </p>
                        <p className="text-xl font-bold" style={{ color: theme.colors.primary }}>
                            Rs. {summary.totalValue.toLocaleString('en-NP', { minimumFractionDigits: 2 })}
                        </p>
                    </div>
                </div>
            </div>

            {/* Summary Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border }}>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2" style={{ color: theme.colors.textSecondary }}>
                            <Package className="h-4 w-4" /> Total Items
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl font-bold" style={{ color: theme.colors.text }}>
                            {summary.totalItems.toLocaleString()}
                        </p>
                    </CardContent>
                </Card>
                <Card style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border }}>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2" style={{ color: theme.colors.textSecondary }}>
                            <Warehouse className="h-4 w-4" /> Warehouses
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl font-bold" style={{ color: theme.colors.text }}>
                            {Object.keys(summary.warehouseBreakdown).length}
                        </p>
                    </CardContent>
                </Card>
                <Card style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border }}>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2" style={{ color: theme.colors.textSecondary }}>
                            <ArrowUp className="h-4 w-4 text-green-500" /> Avg. Item Value
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl font-bold" style={{ color: theme.colors.text }}>
                            Rs. {(summary.totalValue / (summary.totalItems || 1)).toFixed(2)}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Warehouse breakdown */}
            {Object.keys(summary.warehouseBreakdown).length > 0 && (
                <Card style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border }}>
                    <CardHeader>
                        <CardTitle style={{ color: theme.colors.text }}>By Warehouse</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {Object.entries(summary.warehouseBreakdown).map(([warehouse, value]) => {
                                const pct = summary.totalValue > 0 ? (value / summary.totalValue) * 100 : 0;
                                return (
                                    <div key={warehouse}>
                                        <div className="flex justify-between text-sm mb-1">
                                            <span style={{ color: theme.colors.text }}>{warehouse}</span>
                                            <span className="font-semibold" style={{ color: theme.colors.text }}>
                                                Rs. {value.toLocaleString('en-NP', { minimumFractionDigits: 2 })}
                                                <span className="ml-2 text-xs font-normal" style={{ color: theme.colors.textSecondary }}>
                                                    ({pct.toFixed(1)}%)
                                                </span>
                                            </span>
                                        </div>
                                        <div className="h-1.5 rounded-full" style={{ backgroundColor: theme.colors.border }}>
                                            <div
                                                className="h-1.5 rounded-full"
                                                style={{ width: `${pct}%`, backgroundColor: theme.colors.primary }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Detail table */}
            <Card style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border }}>
                <CardHeader>
                    <CardTitle style={{ color: theme.colors.text }}>Inventory Assets Breakdown</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b" style={{ borderColor: theme.colors.border }}>
                                    {['Product', 'Category', 'Warehouse', 'Qty', 'Unit Cost', 'Total Value'].map(h => (
                                        <th key={h} className="px-6 py-4 text-xs font-semibold uppercase"
                                            style={{ color: theme.colors.textSecondary }}>
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {reportData.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-8 text-center text-sm"
                                            style={{ color: theme.colors.textSecondary }}>
                                            No stock data available
                                        </td>
                                    </tr>
                                ) : (
                                    reportData.map((item, idx) => (
                                        <tr key={idx} className="border-b hover:bg-black/5 transition-colors"
                                            style={{ borderColor: theme.colors.border }}>
                                            <td className="px-6 py-4">
                                                <div className="font-semibold" style={{ color: theme.colors.text }}>{item.productName}</div>
                                                <div className="text-xs" style={{ color: theme.colors.textSecondary }}>{item.sku}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <Badge variant="outline">{item.category || '—'}</Badge>
                                            </td>
                                            <td className="px-6 py-4 text-sm" style={{ color: theme.colors.textSecondary }}>
                                                {item.warehouseName}
                                            </td>
                                            <td className="px-6 py-4 font-mono text-sm" style={{ color: theme.colors.text }}>
                                                {item.availableQuantity}
                                            </td>
                                            <td className="px-6 py-4 font-mono text-sm" style={{ color: theme.colors.text }}>
                                                Rs. {item.unitPrice.toFixed(2)}
                                            </td>
                                            <td className="px-6 py-4 font-mono font-bold" style={{ color: theme.colors.primary }}>
                                                Rs. {item.totalValue.toLocaleString('en-NP', { minimumFractionDigits: 2 })}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
