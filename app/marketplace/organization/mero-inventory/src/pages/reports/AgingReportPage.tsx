import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from '@frontend/contexts/ThemeContext';
import { useAppContext } from '../../contexts/AppContext';
import { AlertTriangle, TrendingDown } from 'lucide-react';

const classColors: Record<string, string> = {
    dead: 'bg-red-100 text-red-700',
    slow: 'bg-orange-100 text-orange-700',
    aging: 'bg-yellow-100 text-yellow-700',
};

export default function AgingReportPage() {
    const { theme } = useTheme();
    const { apiCall } = useAppContext();
    const [thresholdDays, setThresholdDays] = useState(90);

    const { data: items = [], isLoading } = useQuery({
        queryKey: ['aging-analysis', thresholdDays],
        queryFn: () => apiCall('GET', `/inventory/reports/aging?days=${thresholdDays}`),
    });

    const agingItems = items as any[];
    const dead = agingItems.filter(i => i.classification === 'dead');
    const slow = agingItems.filter(i => i.classification === 'slow');
    const aging = agingItems.filter(i => i.classification === 'aging');
    const totalValue = agingItems.reduce((s, i) => s + Number(i.stockValue || 0), 0);

    return (
        <div className="flex-1 overflow-auto p-6" style={{ backgroundColor: theme.colors.background }}>
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold" style={{ color: theme.colors.text }}>Dead Stock & Aging Analysis</h1>
                        <p className="text-sm mt-1" style={{ color: theme.colors.textSecondary }}>
                            Items with no stock movement in the last {thresholdDays} days
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <label className="text-sm font-medium" style={{ color: theme.colors.textSecondary }}>Threshold:</label>
                        <select className="px-3 py-2 rounded-lg border text-sm" style={{ borderColor: theme.colors.border, backgroundColor: theme.colors.surface, color: theme.colors.text }}
                            value={thresholdDays} onChange={e => setThresholdDays(Number(e.target.value))}>
                            <option value={30}>30 days</option>
                            <option value={60}>60 days</option>
                            <option value={90}>90 days</option>
                            <option value={180}>180 days</option>
                            <option value={365}>365 days</option>
                        </select>
                    </div>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-4 gap-4 mb-6">
                    <div className="rounded-lg border p-4" style={{ borderColor: theme.colors.border, backgroundColor: theme.colors.surface }}>
                        <p className="text-xs font-medium mb-1" style={{ color: theme.colors.textSecondary }}>Dead Stock (365+ days)</p>
                        <p className="text-2xl font-bold text-red-600">{dead.length}</p>
                        <p className="text-xs mt-1 text-red-500">NPR {dead.reduce((s, i) => s + Number(i.stockValue || 0), 0).toLocaleString()}</p>
                    </div>
                    <div className="rounded-lg border p-4" style={{ borderColor: theme.colors.border, backgroundColor: theme.colors.surface }}>
                        <p className="text-xs font-medium mb-1" style={{ color: theme.colors.textSecondary }}>Slow Moving (180+ days)</p>
                        <p className="text-2xl font-bold text-orange-600">{slow.length}</p>
                        <p className="text-xs mt-1 text-orange-500">NPR {slow.reduce((s, i) => s + Number(i.stockValue || 0), 0).toLocaleString()}</p>
                    </div>
                    <div className="rounded-lg border p-4" style={{ borderColor: theme.colors.border, backgroundColor: theme.colors.surface }}>
                        <p className="text-xs font-medium mb-1" style={{ color: theme.colors.textSecondary }}>Aging ({thresholdDays}+ days)</p>
                        <p className="text-2xl font-bold text-yellow-600">{aging.length}</p>
                        <p className="text-xs mt-1 text-yellow-500">NPR {aging.reduce((s, i) => s + Number(i.stockValue || 0), 0).toLocaleString()}</p>
                    </div>
                    <div className="rounded-lg border p-4" style={{ borderColor: theme.colors.border, backgroundColor: theme.colors.surface }}>
                        <p className="text-xs font-medium mb-1" style={{ color: theme.colors.textSecondary }}>Total Value at Risk</p>
                        <p className="text-2xl font-bold" style={{ color: theme.colors.primary }}>NPR {totalValue.toLocaleString()}</p>
                        <p className="text-xs mt-1" style={{ color: theme.colors.textSecondary }}>{agingItems.length} items total</p>
                    </div>
                </div>

                {/* Table */}
                {isLoading ? (
                    <div className="text-center py-12" style={{ color: theme.colors.textSecondary }}>Analyzing stock movements...</div>
                ) : agingItems.length === 0 ? (
                    <div className="text-center py-16" style={{ color: theme.colors.textSecondary }}>
                        <TrendingDown className="h-12 w-12 mx-auto mb-3 opacity-30" />
                        <p className="font-medium">No aging stock found</p>
                        <p className="text-sm mt-1">All products have had movement within the last {thresholdDays} days</p>
                    </div>
                ) : (
                    <div className="rounded-lg border overflow-hidden" style={{ borderColor: theme.colors.border }}>
                        <table className="w-full">
                            <thead style={{ backgroundColor: theme.colors.surface }}>
                                <tr>
                                    {['Product', 'SKU', 'Category', 'Warehouse', 'Stock Qty', 'Unit Cost', 'Stock Value', 'Days Since Move', 'Classification'].map(h => (
                                        <th key={h} className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: theme.colors.textSecondary }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody style={{ backgroundColor: theme.colors.background }}>
                                {agingItems.map((item: any, i: number) => (
                                    <tr key={i} className="border-t" style={{ borderColor: theme.colors.border }}>
                                        <td className="px-3 py-3 text-sm font-medium" style={{ color: theme.colors.text }}>{item.productName}</td>
                                        <td className="px-3 py-3 text-xs font-mono" style={{ color: theme.colors.textSecondary }}>{item.sku || '—'}</td>
                                        <td className="px-3 py-3 text-sm" style={{ color: theme.colors.textSecondary }}>{item.category || '—'}</td>
                                        <td className="px-3 py-3 text-sm" style={{ color: theme.colors.textSecondary }}>{item.warehouseName || '—'}</td>
                                        <td className="px-3 py-3 text-sm font-medium" style={{ color: theme.colors.text }}>{item.currentStock}</td>
                                        <td className="px-3 py-3 text-sm" style={{ color: theme.colors.textSecondary }}>NPR {Number(item.unitCost).toLocaleString()}</td>
                                        <td className="px-3 py-3 text-sm font-semibold" style={{ color: '#dc2626' }}>NPR {Number(item.stockValue).toLocaleString()}</td>
                                        <td className="px-3 py-3 text-sm">
                                            <div className="flex items-center gap-1">
                                                {item.daysSinceLastMovement >= 365 && <AlertTriangle className="h-3.5 w-3.5 text-red-500" />}
                                                <span className={item.daysSinceLastMovement >= 365 ? 'text-red-600 font-semibold' : item.daysSinceLastMovement >= 180 ? 'text-orange-600' : 'text-yellow-600'}>
                                                    {item.daysSinceLastMovement} days
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-3 py-3">
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${classColors[item.classification] || 'bg-gray-100 text-gray-600'}`}>
                                                {item.classification}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
