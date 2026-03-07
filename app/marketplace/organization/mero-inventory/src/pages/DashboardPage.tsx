import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    TrendingUp,
    AlertTriangle,
    Package,
    Warehouse,
    ArrowUpRight,
    ArrowDownRight,
    DollarSign,
    PieChart,
    BarChart3,
    ArrowRight
} from 'lucide-react';
import { useTheme } from '@frontend/contexts/ThemeContext';
import { Card } from '@shared/frontend/components/ui/Card';
import { Button } from '@shared/frontend/components/ui/Button';
import api from '@frontend/services/api';
import { Link, useNavigate } from 'react-router-dom';
import { useAppContext } from '../contexts/AppContext';

export default function DashboardPage() {
    const { theme } = useTheme();
    const { buildHref } = useAppContext();
    const navigate = useNavigate();

    const { data: stats, isLoading: statsLoading } = useQuery({
        queryKey: ['inventory-dashboard-stats'],
        queryFn: async () => {
            const response = await api.get('/inventory/reports/dashboard');
            return response.data;
        }
    });

    const { data: valuation, isLoading: valuationLoading } = useQuery({
        queryKey: ['inventory-valuation'],
        queryFn: async () => {
            const response = await api.get('/inventory/reports/stock-valuation');
            return response.data;
        }
    });

    const { data: lowStock, isLoading: lowStockLoading } = useQuery({
        queryKey: ['inventory-low-stock'],
        queryFn: async () => {
            const response = await api.get('/inventory/reports/low-stock');
            return response.data;
        }
    });

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-NP', { style: 'currency', currency: 'NPR', maximumFractionDigits: 0 }).format(value);
    };

    if (statsLoading || valuationLoading || lowStockLoading) {
        return (
            <div className="p-8 flex items-center justify-center min-h-[400px]">
                <div className="flex flex-col items-center gap-4">
                    <div className="h-12 w-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                    <p className="text-sm font-medium opacity-60">Loading Dashboard Data...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-[1600px] mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-black tracking-tight" style={{ color: theme.colors.text }}>
                        Inventory Dashboard
                    </h1>
                    <p className="mt-2 text-lg" style={{ color: theme.colors.textSecondary }}>
                        Real-time overview of your warehouse network and stock health.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Link to={buildHref('/products/new')}>
                        <Button className="rounded-full px-6">New Product</Button>
                    </Link>
                    <Link to={buildHref('/transfers')}>
                        <Button variant="outline" className="rounded-full px-6">Stock Transfer</Button>
                    </Link>
                </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="p-6 border-none shadow-lg hover:scale-[1.02] transition-transform" style={{ backgroundColor: theme.colors.surface }}>
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-sm font-bold uppercase tracking-wider opacity-50" style={{ color: theme.colors.textSecondary }}>Total Valuation</p>
                            <h3 className="text-3xl font-black mt-1" style={{ color: theme.colors.text }}>{formatCurrency(stats?.totalStockValue || 0)}</h3>
                        </div>
                        <div className="p-3 rounded-2xl bg-green-500/10 text-green-600">
                            <DollarSign className="h-6 w-6" />
                        </div>
                    </div>
                    <div className="mt-4 flex items-center gap-1 text-xs font-bold text-green-600">
                        <TrendingUp className="h-3 w-3" />
                        <span>Current Portfolio Value</span>
                    </div>
                </Card>

                <Card className="p-6 border-none shadow-lg hover:scale-[1.02] transition-transform" style={{ backgroundColor: theme.colors.surface }}>
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-sm font-bold uppercase tracking-wider opacity-50" style={{ color: theme.colors.textSecondary }}>Total Products</p>
                            <h3 className="text-3xl font-black mt-1" style={{ color: theme.colors.text }}>{stats?.totalProducts || 0}</h3>
                        </div>
                        <div className="p-3 rounded-2xl bg-blue-500/10 text-blue-600">
                            <Package className="h-6 w-6" />
                        </div>
                    </div>
                    <div className="mt-4 flex items-center gap-1 text-xs font-bold opacity-50">
                        <span>Active SKU Catalog</span>
                    </div>
                </Card>

                <Card className="p-6 border-none shadow-lg hover:scale-[1.02] transition-transform" style={{ backgroundColor: theme.colors.surface }}>
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-sm font-bold uppercase tracking-wider opacity-50" style={{ color: theme.colors.textSecondary }}>Low Stock Alerts</p>
                            <h3 className="text-3xl font-black mt-1" style={{ color: stats?.lowStockItems > 0 ? theme.colors.error : theme.colors.text }}>{stats?.lowStockItems || 0}</h3>
                        </div>
                        <div className={`p-3 rounded-2xl ${stats?.lowStockItems > 0 ? 'bg-red-500/10 text-red-600' : 'bg-gray-500/10 text-gray-400'}`}>
                            <AlertTriangle className="h-6 w-6" />
                        </div>
                    </div>
                    <div className={`mt-4 flex items-center gap-1 text-xs font-bold ${stats?.lowStockItems > 0 ? 'text-red-600' : 'opacity-50'}`}>
                        <span>{stats?.lowStockItems > 0 ? 'Action Required Immediately' : 'Healthy Stock Levels'}</span>
                    </div>
                </Card>

                <Card className="p-6 border-none shadow-lg hover:scale-[1.02] transition-transform" style={{ backgroundColor: theme.colors.surface }}>
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-sm font-bold uppercase tracking-wider opacity-50" style={{ color: theme.colors.textSecondary }}>Warehouses</p>
                            <h3 className="text-3xl font-black mt-1" style={{ color: theme.colors.text }}>{stats?.totalWarehouses || 0}</h3>
                        </div>
                        <div className="p-3 rounded-2xl bg-purple-500/10 text-purple-600">
                            <Warehouse className="h-6 w-6" />
                        </div>
                    </div>
                    <div className="mt-4 flex items-center gap-1 text-xs font-bold opacity-50">
                        <span>Across your organization</span>
                    </div>
                </Card>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                {/* Valuation Charts */}
                <Card className="xl:col-span-2 p-8 border-none shadow-xl" style={{ backgroundColor: theme.colors.surface, borderRadius: '32px' }}>
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-xl font-bold" style={{ color: theme.colors.text }}>Warehouse Valuation</h3>
                            <p className="text-sm opacity-60">Value distribution across storage locations</p>
                        </div>
                        <PieChart className="h-5 w-5 opacity-40" />
                    </div>

                    <div className="space-y-6">
                        {Object.entries(valuation?.warehouseValuation || {}).map(([name, value]: [string, any], index) => {
                            const percentage = (value / valuation.totalValuation) * 100;
                            const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];
                            const color = colors[index % colors.length];

                            return (
                                <div key={name} className="space-y-2">
                                    <div className="flex justify-between items-end">
                                        <div>
                                            <span className="text-sm font-bold" style={{ color: theme.colors.text }}>{name}</span>
                                            <span className="ml-2 text-xs opacity-50">{percentage.toFixed(1)}%</span>
                                        </div>
                                        <span className="text-sm font-black" style={{ color: theme.colors.text }}>{formatCurrency(value)}</span>
                                    </div>
                                    <div className="h-3 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                        <div
                                            className="h-full rounded-full transition-all duration-1000"
                                            style={{ width: `${percentage}%`, backgroundColor: color }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                        {(!valuation?.warehouseValuation || Object.keys(valuation.warehouseValuation).length === 0) && (
                            <div className="h-40 flex items-center justify-center opacity-40 italic">
                                No valuation data available
                            </div>
                        )}
                    </div>
                </Card>

                {/* Low Stock Watchlist */}
                <Card className="p-8 border-none shadow-xl" style={{ backgroundColor: theme.colors.surface, borderRadius: '32px' }}>
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xl font-bold" style={{ color: theme.colors.text }}>Low Stock Watchlist</h3>
                        <Button variant="ghost" size="sm" onClick={() => navigate(buildHref('/products'))}>View All</Button>
                    </div>

                    <div className="space-y-4">
                        {lowStock?.slice(0, 5).map((item: any) => (
                            <div key={item.productId} className="flex items-center gap-4 p-3 rounded-2xl bg-black/5 dark:bg-white/5 border border-transparent hover:border-primary/20 transition-all cursor-pointer group">
                                <div className="h-10 w-10 rounded-xl bg-orange-500/10 flex items-center justify-center shrink-0">
                                    <AlertTriangle className="h-5 w-5 text-orange-500" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold truncate" style={{ color: theme.colors.text }}>{item.productName}</p>
                                    <p className="text-xs opacity-50 truncate">{item.warehouseName}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-black text-orange-500">{item.currentStock}</p>
                                    <p className="text-[10px] uppercase font-bold opacity-40">Qty</p>
                                </div>
                                <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
                            </div>
                        ))}
                        {(!lowStock || lowStock.length === 0) && (
                            <div className="flex flex-col items-center justify-center py-10 opacity-40 text-center space-y-3">
                                <CheckCircle2 className="h-10 w-10 text-green-500" />
                                <p className="text-sm">All inventory levels are healthy!</p>
                            </div>
                        )}
                    </div>

                    {lowStock?.length > 5 && (
                        <div className="mt-4 pt-4 border-t text-center" style={{ borderColor: theme.colors.border }}>
                            <p className="text-xs font-bold opacity-50">+{lowStock.length - 5} more items require attention</p>
                        </div>
                    )}
                </Card>
            </div>
        </div>
    );
}

const CheckCircle2 = ({ className, style }: any) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        style={style}
    >
        <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
        <path d="m9 12 2 2 4-4" />
    </svg>
);
