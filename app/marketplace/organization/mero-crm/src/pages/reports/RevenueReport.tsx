import React, { useEffect, useState } from 'react';
import { useTheme } from '@frontend/contexts/ThemeContext';
import { dealsApi, Deal } from '../../api/deals';
import { Card, Loading, toast } from '@shared';
import { ArrowLeft, DollarSign, TrendingUp, Target, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAppContext } from '../../contexts/AppContext';

export default function RevenueReport() {
    const { theme } = useTheme();
    const { buildHref } = useAppContext();
    const [deals, setDeals] = useState<Deal[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDeals();
    }, []);

    const fetchDeals = async () => {
        try {
            setLoading(true);
            const data = await dealsApi.getDeals();
            setDeals(data);
        } catch (error: any) {
            toast.error('Failed to fetch revenue data');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div className="p-8 text-center"><Loading text="Calculating forecast..." /></div>;
    }

    // Revenue Metrics
    const formatMoney = (val: number) => `$${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const wonDeals = deals.filter(d => d.status === 'WON');
    const closedWonValue = wonDeals.reduce((sum, d) => sum + Number(d.value || 0), 0);

    // Total Pipeline (excluding WON/LOST)
    const activeDeals = deals.filter(d => !['WON', 'LOST'].includes(d.status));
    const totalPipelineValue = activeDeals.reduce((sum, d) => sum + Number(d.value || 0), 0);

    // Weighted Pipeline (Value * Probability)
    const weightedPipeline = activeDeals.reduce((sum, d) => {
        const value = Number(d.value || 0);
        const probability = Number(d.probability || 0) / 100;
        return sum + (value * probability);
    }, 0);

    // Monthly Projection Breakdown
    // Group active deals by their expected close date month
    const currentDate = new Date();
    const nextMonths = Array.from({ length: 6 }).map((_, i) => {
        const d = new Date(currentDate.getFullYear(), currentDate.getMonth() + i, 1);
        return {
            label: d.toLocaleString('default', { month: 'short' }) + ' ' + d.getFullYear(),
            month: d.getMonth(),
            year: d.getFullYear(),
            deals: [] as Deal[],
            projectedValue: 0
        };
    });

    activeDeals.forEach(deal => {
        if (!deal.expected_close_date) return;
        const closeDate = new Date(deal.expected_close_date);

        // Find matching month bucket
        const bucket = nextMonths.find(m => m.month === closeDate.getMonth() && m.year === closeDate.getFullYear());
        if (bucket) {
            bucket.deals.push(deal);
            bucket.projectedValue += (Number(deal.value || 0) * (Number(deal.probability || 0) / 100));
        }
    });

    // Find the max value for the bar chart scaling
    const maxProjected = Math.max(...nextMonths.map(m => m.projectedValue), 1);

    return (
        <div className="p-8 max-w-[1600px] mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <div className="flex items-center justify-between border-b pb-6" style={{ borderColor: theme.colors.border }}>
                <div className="flex items-center gap-4">
                    <Link to={buildHref('/reports')} className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                        <ArrowLeft className="h-6 w-6" style={{ color: theme.colors.textSecondary }} />
                    </Link>
                    <div className="p-3 rounded-2xl bg-green-500/10">
                        <DollarSign className="h-8 w-8 text-green-500" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold" style={{ color: theme.colors.text }}>Revenue Forecast</h1>
                        <p style={{ color: theme.colors.textSecondary }}>Project your future revenue based on deal probability</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="p-6" style={{ backgroundColor: theme.colors.surface }}>
                    <div className="flex items-center gap-3 mb-4 text-green-500">
                        <TrendingUp className="h-5 w-5" />
                        <h3 className="font-bold">Closed Won Value</h3>
                    </div>
                    <p className="text-4xl font-extrabold" style={{ color: theme.colors.text }}>
                        {formatMoney(closedWonValue)}
                    </p>
                    <p className="text-sm mt-2" style={{ color: theme.colors.textSecondary }}>Total revenue generated</p>
                </Card>

                <Card className="p-6" style={{ backgroundColor: theme.colors.surface }}>
                    <div className="flex items-center gap-3 mb-4 text-blue-500">
                        <Target className="h-5 w-5" />
                        <h3 className="font-bold">Weighted Pipeline</h3>
                    </div>
                    <p className="text-4xl font-extrabold" style={{ color: theme.colors.text }}>
                        {formatMoney(weightedPipeline)}
                    </p>
                    <p className="text-sm mt-2" style={{ color: theme.colors.textSecondary }}>Expected value based on probability</p>
                </Card>

                <Card className="p-6" style={{ backgroundColor: theme.colors.surface }}>
                    <div className="flex items-center gap-3 mb-4" style={{ color: theme.colors.textSecondary }}>
                        <DollarSign className="h-5 w-5" />
                        <h3 className="font-bold">Total Pipeline Value</h3>
                    </div>
                    <p className="text-4xl font-extrabold" style={{ color: theme.colors.text }}>
                        {formatMoney(totalPipelineValue)}
                    </p>
                    <p className="text-sm mt-2" style={{ color: theme.colors.textSecondary }}>Unweighted active deal sum</p>
                </Card>
            </div>

            {/* 6-Month Projection Chart */}
            <Card className="p-8" style={{ backgroundColor: theme.colors.surface }}>
                <div className="flex items-center gap-3 mb-8">
                    <Calendar className="h-6 w-6 text-primary" />
                    <h3 className="text-xl font-bold" style={{ color: theme.colors.text }}>6-Month Expected Revenue Outlook</h3>
                </div>

                <div className="h-64 flex items-end gap-x-2 sm:gap-x-4 lg:gap-x-8 pt-6">
                    {nextMonths.map((monthData, idx) => {
                        const heightPercent = Math.max((monthData.projectedValue / maxProjected) * 100, 2); // At least 2% to show a nub

                        return (
                            <div key={idx} className="flex-1 flex flex-col items-center justify-end h-full group relative">
                                {/* Tooltip */}
                                <div className="absolute -top-12 opacity-0 group-hover:opacity-100 transition-opacity bg-black text-white text-xs py-1 px-3 rounded-lg shadow-lg pointer-events-none z-10 whitespace-nowrap">
                                    {formatMoney(monthData.projectedValue)}
                                    <div className="text-[10px] text-white/70 text-center">{monthData.deals.length} deals</div>
                                </div>

                                <div
                                    className="w-full max-w-[80px] bg-gradient-to-t from-green-600/50 to-green-400 rounded-t-xl transition-all duration-1000 border-t border-x border-green-300/30"
                                    style={{ height: `${heightPercent}%` }}
                                >
                                    <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'linear-gradient(45deg, rgba(255,255,255,0.15) 25%, transparent 25%, transparent 50%, rgba(255,255,255,0.15) 50%, rgba(255,255,255,0.15) 75%, transparent 75%, transparent)', backgroundSize: '0.5rem 0.5rem' }}></div>
                                </div>
                                <div className="mt-4 text-xs font-bold text-center" style={{ color: theme.colors.textSecondary }}>
                                    {monthData.label}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </Card>
        </div>
    );
}
