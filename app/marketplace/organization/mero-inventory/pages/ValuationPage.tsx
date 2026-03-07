import React from 'react';
import { useTheme } from '@frontend/contexts/ThemeContext';
import { useQuery } from '@tanstack/react-query';
import api from '@frontend/services/api';
import { Card, CardContent, CardHeader, CardTitle, Loading, Badge } from '@shared/frontend';
import { DollarSign, Package, Warehouse, ArrowDown, ArrowUp } from 'lucide-react';
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
        <div className="p-8 max-w-[1400px] mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight" style={{ color: theme.colors.text }}>Stock Valuation Report</h1>
                    <p className="text-sm mt-1" style={{ color: theme.colors.textSecondary }}>
                        Real-time financial assessment of your current inventory assets.
                    </p>
                </div>
                <div className="flex items-center gap-3 bg-primary/10 px-4 py-2 rounded-xl border border-primary/20">
                    <DollarSign className="h-5 w-5 text-primary" />
                    <div>
                        <p className="text-[10px] uppercase font-black text-primary/60 leading-none">Total Inventory Value</p>
                        <p className="text-xl font-black text-primary">
                            ${summary.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </p>
                    </div>
                </div>
            </div>

            {/* Summary Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border }}>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium opacity-60 flex items-center gap-2">
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
                        <CardTitle className="text-sm font-medium opacity-60 flex items-center gap-2">
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
                        <CardTitle className="text-sm font-medium opacity-60 flex items-center gap-2">
                            <ArrowUp className="h-4 w-4 text-green-500" /> Avg. Item Value
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl font-bold" style={{ color: theme.colors.text }}>
                            ${(summary.totalValue / (summary.totalItems || 1)).toFixed(2)}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Table */}
            <Card style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border }}>
                <CardHeader>
                    <CardTitle style={{ color: theme.colors.text }}>Inventory Assets Breakdown</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b" style={{ borderColor: theme.colors.border }}>
                                    <th className="px-6 py-4 text-xs font-black uppercase opacity-40">Product</th>
                                    <th className="px-6 py-4 text-xs font-black uppercase opacity-40">Category</th>
                                    <th className="px-6 py-4 text-xs font-black uppercase opacity-40">Warehouse</th>
                                    <th className="px-6 py-4 text-xs font-black uppercase opacity-40 text-right">Qty</th>
                                    <th className="px-6 py-4 text-xs font-black uppercase opacity-40 text-right">Unit Cost</th>
                                    <th className="px-6 py-4 text-xs font-black uppercase opacity-40 text-right">Total Value</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y" style={{ borderColor: theme.colors.border }}>
                                {reportData.map((item, idx) => (
                                    <tr key={idx} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="font-bold" style={{ color: theme.colors.text }}>{item.productName}</div>
                                            <div className="text-[10px] opacity-40">{item.sku}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <Badge variant="outline" className="text-[10px]">{item.category}</Badge>
                                        </td>
                                        <td className="px-6 py-4 text-sm opacity-60">{item.warehouseName}</td>
                                        <td className="px-6 py-4 text-right font-mono text-sm">{item.availableQuantity}</td>
                                        <td className="px-6 py-4 text-right font-mono text-sm">${item.unitPrice.toFixed(2)}</td>
                                        <td className="px-6 py-4 text-right font-mono font-bold text-primary">${item.totalValue.toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

