import React, { useEffect, useState } from 'react';
import { useTheme } from '@frontend/contexts/ThemeContext';
import { Card } from '@shared';
import { TrendingUp, TrendingDown, Trophy, XCircle, BarChart2 } from 'lucide-react';
import apiClient from '@frontend/services/api';
import { Link } from 'react-router-dom';
import { useAppContext } from '../../contexts/AppContext';

interface WinLossData {
    leads: { won: number; lost: number; winRate: number };
    deals: { won: number; lost: number; wonRevenue: number; lostRevenue: number; winRate: number };
    reasons: Array<{ reason: string; won: number; lost: number }>;
}

export default function WinLossReport() {
    const { theme } = useTheme();
    const { buildHref } = useAppContext();
    const [data, setData] = useState<WinLossData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        apiClient.get('/crm/analytics/win-loss')
            .then(res => setData(res.data))
            .catch(() => setData(null))
            .finally(() => setLoading(false));
    }, []);

    const formatCurrency = (n: number) =>
        new Intl.NumberFormat('en-NP', { style: 'currency', currency: 'NPR', maximumFractionDigits: 0 }).format(n);

    return (
        <div className="p-8 max-w-[1200px] mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link to={buildHref('/reports')} className="text-sm hover:underline" style={{ color: theme.colors.textSecondary }}>
                    ← Reports
                </Link>
            </div>
            <div className="flex items-center gap-4">
                <div className="p-3 rounded-2xl" style={{ backgroundColor: `${theme.colors.primary}15` }}>
                    <BarChart2 className="h-8 w-8" style={{ color: theme.colors.primary }} />
                </div>
                <div>
                    <h1 className="text-3xl font-bold" style={{ color: theme.colors.text }}>Win / Loss Analysis</h1>
                    <p style={{ color: theme.colors.textSecondary }}>Understand why deals are won or lost</p>
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center h-48" style={{ color: theme.colors.textSecondary }}>
                    Loading analytics...
                </div>
            ) : !data ? (
                <div className="text-center py-16" style={{ color: theme.colors.textSecondary }}>
                    Failed to load win/loss analytics.
                </div>
            ) : (
                <>
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <Card className="p-6" style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border }}>
                            <div className="flex items-center gap-3 mb-3">
                                <Trophy className="h-5 w-5 text-green-500" />
                                <span className="text-sm font-medium" style={{ color: theme.colors.textSecondary }}>Leads Won</span>
                            </div>
                            <p className="text-3xl font-bold" style={{ color: theme.colors.text }}>{data.leads.won}</p>
                            <p className="text-sm mt-1 text-green-500">{data.leads.winRate}% win rate</p>
                        </Card>
                        <Card className="p-6" style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border }}>
                            <div className="flex items-center gap-3 mb-3">
                                <XCircle className="h-5 w-5 text-red-500" />
                                <span className="text-sm font-medium" style={{ color: theme.colors.textSecondary }}>Leads Lost</span>
                            </div>
                            <p className="text-3xl font-bold" style={{ color: theme.colors.text }}>{data.leads.lost}</p>
                            <p className="text-sm mt-1 text-red-500">{100 - data.leads.winRate}% loss rate</p>
                        </Card>
                        <Card className="p-6" style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border }}>
                            <div className="flex items-center gap-3 mb-3">
                                <TrendingUp className="h-5 w-5 text-green-500" />
                                <span className="text-sm font-medium" style={{ color: theme.colors.textSecondary }}>Deals Won</span>
                            </div>
                            <p className="text-3xl font-bold" style={{ color: theme.colors.text }}>{data.deals.won}</p>
                            <p className="text-sm mt-1 text-green-500">{formatCurrency(data.deals.wonRevenue)}</p>
                        </Card>
                        <Card className="p-6" style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border }}>
                            <div className="flex items-center gap-3 mb-3">
                                <TrendingDown className="h-5 w-5 text-red-500" />
                                <span className="text-sm font-medium" style={{ color: theme.colors.textSecondary }}>Deals Lost</span>
                            </div>
                            <p className="text-3xl font-bold" style={{ color: theme.colors.text }}>{data.deals.lost}</p>
                            <p className="text-sm mt-1 text-red-500">{formatCurrency(data.deals.lostRevenue)} lost value</p>
                        </Card>
                    </div>

                    {/* Win Rate Bar */}
                    <Card className="p-6" style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border }}>
                        <h3 className="font-semibold mb-4" style={{ color: theme.colors.text }}>Deal Win Rate</h3>
                        <div className="flex items-center gap-4">
                            <div className="flex-1 h-4 rounded-full overflow-hidden" style={{ backgroundColor: theme.colors.border }}>
                                <div
                                    className="h-full rounded-full bg-green-500 transition-all duration-700"
                                    style={{ width: `${data.deals.winRate}%` }}
                                />
                            </div>
                            <span className="font-bold text-lg min-w-[48px]" style={{ color: theme.colors.text }}>
                                {data.deals.winRate}%
                            </span>
                        </div>
                        <div className="flex gap-6 mt-3 text-sm" style={{ color: theme.colors.textSecondary }}>
                            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-green-500 inline-block" /> Won ({data.deals.won})</span>
                            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-red-500 inline-block" /> Lost ({data.deals.lost})</span>
                        </div>
                    </Card>

                    {/* Reason Breakdown */}
                    <Card className="p-6" style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border }}>
                        <h3 className="font-semibold mb-4" style={{ color: theme.colors.text }}>
                            Win/Loss Reasons Breakdown
                        </h3>
                        {data.reasons.length === 0 ? (
                            <p className="text-sm py-8 text-center" style={{ color: theme.colors.textSecondary }}>
                                No win/loss reasons recorded yet. Mark deals as Won or Lost with a reason to see the breakdown here.
                            </p>
                        ) : (
                            <div className="space-y-3">
                                {data.reasons
                                    .sort((a, b) => (b.won + b.lost) - (a.won + a.lost))
                                    .map((item) => {
                                        const total = item.won + item.lost;
                                        const winPct = total > 0 ? Math.round((item.won / total) * 100) : 0;
                                        return (
                                            <div key={item.reason}>
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="text-sm font-medium" style={{ color: theme.colors.text }}>{item.reason}</span>
                                                    <div className="flex gap-4 text-xs" style={{ color: theme.colors.textSecondary }}>
                                                        <span className="text-green-500">{item.won} won</span>
                                                        <span className="text-red-500">{item.lost} lost</span>
                                                        <span>{winPct}% win</span>
                                                    </div>
                                                </div>
                                                <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: theme.colors.border }}>
                                                    <div
                                                        className="h-full rounded-full bg-green-500"
                                                        style={{ width: `${winPct}%` }}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}
                            </div>
                        )}
                    </Card>
                </>
            )}
        </div>
    );
}
