import React, { useEffect, useState } from 'react';
import { useTheme } from '@frontend/contexts/ThemeContext';
import { Link } from 'react-router-dom';
import { Users, FileText, CreditCard, DollarSign, TrendingUp, Plus, Activity as LucideActivity, Zap, Target } from 'lucide-react';
import { useAppContext } from '../contexts/AppContext';
import { clientsApi } from '../api/clients';
import { invoicesApi } from '../api/invoices';
import { paymentsApi } from '../api/payments';
import { activitiesApi, Activity } from '../api/activities';
import { leadsApi } from '../api/leads';
import { dealsApi } from '../api/deals';
import { toast } from '@shared';

interface DashboardStats {
    totalClients: number;
    totalInvoices: number;
    totalPayments: number;
    totalRevenue: number;
    totalLeads: number;
    totalDeals: number;
}

export default function DashboardPage() {
    const { theme } = useTheme();
    const { buildHref } = useAppContext();
    const [stats, setStats] = useState<DashboardStats>({
        totalClients: 0,
        totalInvoices: 0,
        totalPayments: 0,
        totalRevenue: 0,
        totalLeads: 0,
        totalDeals: 0,
    });
    const [recentActivities, setRecentActivities] = useState<Activity[]>([]);
    const [forecast, setForecast] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            setLoading(true);
            const [clients, invoices, payments, leads, deals, activities, forecastData] = await Promise.all([
                clientsApi.getClients(1, 1),
                invoicesApi.getInvoices(1, 1),
                paymentsApi.getPayments(1, 1000),
                leadsApi.getLeads(),
                dealsApi.getDeals(),
                activitiesApi.getActivities(),
                leadsApi.getForecast()
            ]);

            const totalRevenue = payments.data
                .filter(p => p.status === 'completed')
                .reduce((acc, curr) => acc + Number(curr.amount), 0);

            setStats({
                totalClients: clients.total || 0,
                totalInvoices: invoices.total || 0,
                totalPayments: payments.total || 0,
                totalRevenue: totalRevenue,
                totalLeads: leads.length || 0,
                totalDeals: deals.length || 0,
            });
            setRecentActivities(activities.slice(0, 5));
            setForecast(forecastData);
        } catch (error: any) {
            toast.error('Failed to fetch dashboard statistics');
        } finally {
            setLoading(false);
        }
    };

    const statCards = [
        {
            title: 'Active Leads',
            value: stats.totalLeads,
            icon: Zap,
            color: '#3b82f6',
            link: buildHref('/leads/pipeline'),
            trend: '+12%',
        },
        {
            title: 'Open Deals',
            value: stats.totalDeals,
            icon: Target,
            color: '#8b5cf6',
            link: buildHref('/deals/pipeline'),
            trend: '+5%',
        },
        {
            title: 'Total Clients',
            value: stats.totalClients,
            icon: Users,
            color: theme.colors.primary,
            link: buildHref('/clients'),
            trend: '+2',
        },
        {
            title: 'Total Revenue',
            value: `Rs. ${stats.totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
            icon: DollarSign,
            color: '#10b981',
            link: buildHref('/payments'),
            trend: '+15%',
        },
    ];

    const quickActions = [
        { title: 'New Lead', icon: Zap, link: buildHref('/leads/new'), color: '#3b82f6' },
        { title: 'New Deal', icon: Target, link: buildHref('/deals/new'), color: '#8b5cf6' },
        { title: 'New Client', icon: Users, link: buildHref('/clients/new'), color: theme.colors.primary },
        { title: 'New Invoice', icon: FileText, link: buildHref('/invoices/new'), color: '#10b981' },
    ];

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{ borderColor: theme.colors.primary }}></div>
                    <p style={{ color: theme.colors.textSecondary }}>Syncing your data...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-[1600px] mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                    <div className="p-3 rounded-2xl shadow-lg" style={{ backgroundColor: theme.colors.primary }}>
                        <LucideActivity className="h-8 w-8 text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight" style={{ color: theme.colors.text }}>
                            CRM Dashboard
                        </h1>
                        <p className="mt-1" style={{ color: theme.colors.textSecondary }}>
                            Real-time overview of your sales performance and customer base.
                        </p>
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {statCards.map((stat, index) => {
                    const Icon = stat.icon;
                    return (
                        <Link key={stat.title} to={stat.link}
                            className="group relative backdrop-blur-sm rounded-3xl p-6 transition-all duration-300 shadow-lg hover:shadow-2xl hover:-translate-y-2 overflow-hidden"
                            style={{
                                background: `linear-gradient(135deg, ${theme.colors.surface} 0%, ${theme.colors.background} 100%)`,
                                border: `1px solid ${theme.colors.border}40`
                            }}
                        >
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                <Icon className="h-20 w-20" style={{ color: stat.color }} />
                            </div>

                            <div className="relative z-10 flex flex-col h-full justify-between">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="p-3 rounded-2xl shadow-inner" style={{ backgroundColor: `${stat.color}15` }}>
                                        <Icon className="h-6 w-6" style={{ color: stat.color }} />
                                    </div>
                                    <div className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full bg-green-500/10 text-green-500">
                                        <TrendingUp className="h-3 w-3" />
                                        {stat.trend}
                                    </div>
                                </div>

                                <div>
                                    <p className="text-sm font-bold tracking-wide uppercase transition-colors" style={{ color: theme.colors.textSecondary }}>{stat.title}</p>
                                    <p className="text-3xl font-black mt-1" style={{ color: theme.colors.text }}>{stat.value}</p>
                                </div>
                            </div>
                        </Link>
                    );
                })}
            </div>

            {/* Quick Actions & Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Recent Activities Feed */}
                <div className="lg:col-span-1 space-y-6">
                    <h2 className="text-2xl font-bold px-1" style={{ color: theme.colors.text }}>
                        Recent Interactions
                    </h2>
                    <div className="space-y-4">
                        {recentActivities.length === 0 ? (
                            <div className="p-12 text-center opacity-50 bg-black/5 rounded-3xl border border-dashed border-black/10">
                                <p>No interactions logged yet.</p>
                            </div>
                        ) : (
                            recentActivities.map((act) => (
                                <div key={act.id} className="p-4 rounded-2xl border bg-white dark:bg-gray-800 shadow-sm flex items-start gap-4 transition-all hover:shadow-md">
                                    <div className={`p-2 rounded-lg ${act.type === 'NOTE' ? 'bg-blue-500/10 text-blue-500' :
                                        act.type === 'CALL' ? 'bg-emerald-500/10 text-emerald-500' :
                                            act.type === 'MEETING' ? 'bg-purple-500/10 text-purple-500' :
                                                'bg-gray-500/10 text-gray-500'
                                        }`}>
                                        <FileText className="h-4 w-4" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-sm truncate" style={{ color: theme.colors.text }}>{act.subject}</p>
                                        <p className="text-[10px] opacity-60 uppercase font-black" style={{ color: theme.colors.textSecondary }}>
                                            {new Date(act.createdAt).toLocaleDateString()} • {act.type}
                                        </p>
                                    </div>
                                </div>
                            ))
                        )}
                        <Link to={buildHref('/leads')} className="block text-center text-xs font-bold text-primary hover:underline py-2">
                            View All Interactions →
                        </Link>
                    </div>
                </div>

                {/* Quick Actions (Moved or consolidated) */}
                <div className="lg:col-span-1 space-y-6">
                    <h2 className="text-2xl font-bold px-1" style={{ color: theme.colors.text }}>
                        Quick Actions
                    </h2>
                    <div className="grid grid-cols-1 gap-3">
                        {quickActions.map((action) => {
                            const Icon = action.icon;
                            return (
                                <Link key={action.title} to={action.link} className="group flex items-center justify-between p-4 rounded-2xl border hover:shadow-lg transition-all" style={{ backgroundColor: theme.colors.surface }}>
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-lg" style={{ backgroundColor: `${action.color}15` }}>
                                            <Icon className="h-5 w-5" style={{ color: action.color }} />
                                        </div>
                                        <span className="font-bold text-sm">{action.title}</span>
                                    </div>
                                    <Plus className="h-4 w-4 opacity-40 group-hover:opacity-100 transition-all" />
                                </Link>
                            );
                        })}
                    </div>
                </div>

                {/* Pipeline Health / Distribution */}
                <div className="lg:col-span-2 space-y-6">
                    <h2 className="text-2xl font-bold px-1" style={{ color: theme.colors.text }}>
                        Sales Pipeline Health
                    </h2>
                    <div
                        className="p-8 rounded-3xl shadow-lg border relative overflow-hidden h-[calc(100%-48px)] min-h-[350px]"
                        style={{
                            background: `linear-gradient(135deg, ${theme.colors.surface} 0%, ${theme.colors.background} 100%)`,
                            borderColor: `${theme.colors.border}40`
                        }}
                    >
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-8 relative z-20">
                            <div className="flex flex-col justify-center space-y-2">
                                <p className="text-sm font-bold uppercase tracking-widest opacity-60">Leads Quality</p>
                                <div className="flex items-center gap-4">
                                    <div className="flex-1 h-3 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                                        <div className="h-full bg-blue-500 rounded-full" style={{ width: '70%' }}></div>
                                    </div>
                                    <span className="font-bold">70%</span>
                                </div>
                                <p className="text-xs opacity-60">Higher than last month</p>
                            </div>

                            <div className="flex flex-col justify-center space-y-2">
                                <p className="text-sm font-bold uppercase tracking-widest opacity-60">Deal Velocity</p>
                                <div className="flex items-center gap-4">
                                    <div className="flex-1 h-3 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                                        <div className="h-full bg-purple-500 rounded-full" style={{ width: '45%' }}></div>
                                    </div>
                                    <span className="font-bold">12d</span>
                                </div>
                                <p className="text-xs opacity-60">Average closing time</p>
                            </div>

                            <div className="flex flex-col justify-center space-y-2">
                                <p className="text-sm font-bold uppercase tracking-widest opacity-60">Win Rate</p>
                                <div className="flex items-center gap-4">
                                    <div className="flex-1 h-3 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                                        <div className="h-full bg-green-500 rounded-full" style={{ width: '28%' }}></div>
                                    </div>
                                    <span className="font-bold">28%</span>
                                </div>
                                <p className="text-xs opacity-60">Conversion performance</p>
                            </div>
                        </div>

                        {forecast && (
                            <div className="mt-12 pt-8 border-t border-black/5 relative z-20">
                                <p className="text-sm font-bold uppercase tracking-widest opacity-60 mb-4">Weighted Revenue Forecast</p>
                                <div className="flex flex-col md:flex-row md:items-end gap-2 text-primary">
                                    <span className="text-5xl font-black">NPR {Math.round(forecast.totalWeightedValue).toLocaleString()}</span>
                                    <span className="text-sm font-bold opacity-40 mb-2">Expected from NPR {Math.round(forecast.totalRawValue).toLocaleString()} pipeline</span>
                                </div>
                            </div>
                        )}

                        {/* Visual Chart Placeholder */}
                        <div className="absolute bottom-0 left-0 right-0 h-32 opacity-10 flex items-end px-4 gap-1 z-10">
                            {[40, 70, 45, 90, 65, 80, 50, 85, 95, 75, 60, 85].map((h, i) => (
                                <div key={i} className="flex-1 bg-primary rounded-t-lg transition-all duration-1000" style={{ height: `${h}%` }}></div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
