import React, { useEffect, useState } from 'react';
import { useTheme } from '@frontend/contexts/ThemeContext';
import { leadsApi, Lead } from '../../api/leads';
import { Card, Loading, toast } from '@shared';
import { ArrowLeft, PieChart, Users, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAppContext } from '../../contexts/AppContext';

export default function FunnelReport() {
    const { theme } = useTheme();
    const { buildHref } = useAppContext();
    const [leads, setLeads] = useState<Lead[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchLeads();
    }, []);

    const fetchLeads = async () => {
        try {
            setLoading(true);
            const data = await leadsApi.getLeads();
            setLeads(data);
        } catch (error: any) {
            toast.error('Failed to fetch leads for report');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div className="p-8 text-center"><Loading text="Generating report..." /></div>;
    }

    const stages = ['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL_SENT', 'CONVERTED'];

    // Calculate counts
    const stageCounts = stages.reduce((acc, stage) => {
        acc[stage] = leads.filter(l => l.status === stage).length;
        return acc;
    }, {} as Record<string, number>);

    // Total leads participating in the funnel (excluding LOST)
    const funnelTotal = leads.filter(l => l.status !== 'LOST').length;

    // Calculate progression: how many leads have reached AT LEAST this stage
    // To do this simply, we assume any lead in a later stage has already passed through the earlier ones.
    const getCumulativeCount = (targetStageIndex: number) => {
        return stages.slice(targetStageIndex).reduce((sum, stage) => sum + stageCounts[stage], 0);
    };

    const funnelData = stages.map((stage, index) => {
        const cumulativeCount = getCumulativeCount(index);
        const nextCumulativeCount = index < stages.length - 1 ? getCumulativeCount(index + 1) : 0;

        let conversionRate = 0;
        if (index === 0) {
            conversionRate = funnelTotal > 0 ? (cumulativeCount / funnelTotal) * 100 : 0;
        } else {
            const previousCumulative = getCumulativeCount(index - 1);
            conversionRate = previousCumulative > 0 ? (cumulativeCount / previousCumulative) * 100 : 0;
        }

        return {
            stage,
            label: stage.replace('_', ' '),
            count: stageCounts[stage],
            passed: cumulativeCount,
            rate: conversionRate.toFixed(1)
        };
    });

    const getStageColor = (index: number) => {
        const colors = ['#3b82f6', '#8b5cf6', '#f59e0b', '#ec4899', '#10b981']; // Blue, Purple, Orange, Pink, Green
        return colors[index % colors.length];
    };

    return (
        <div className="p-8 max-w-[1600px] mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <div className="flex items-center justify-between border-b pb-6" style={{ borderColor: theme.colors.border }}>
                <div className="flex items-center gap-4">
                    <Link to={buildHref('/reports')} className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                        <ArrowLeft className="h-6 w-6" style={{ color: theme.colors.textSecondary }} />
                    </Link>
                    <div className="p-3 rounded-2xl bg-blue-500/10">
                        <PieChart className="h-8 w-8 text-blue-500" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold" style={{ color: theme.colors.text }}>Lead Conversion Funnel</h1>
                        <p style={{ color: theme.colors.textSecondary }}>Analyze how effectively leads move through the pipeline</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Stats Summary */}
                <div className="lg:col-span-1 space-y-4">
                    <Card className="p-6" style={{ backgroundColor: theme.colors.surface }}>
                        <div className="flex items-center gap-3 mb-4 text-emerald-500">
                            <Users className="h-5 w-5" />
                            <h3 className="font-bold">Total Funnel Volume</h3>
                        </div>
                        <p className="text-4xl font-extrabold" style={{ color: theme.colors.text }}>{funnelTotal}</p>
                        <p className="text-sm mt-2" style={{ color: theme.colors.textSecondary }}>Active + Converted Leads</p>
                    </Card>

                    <Card className="p-6" style={{ backgroundColor: theme.colors.surface }}>
                        <div className="flex items-center gap-3 mb-4 text-blue-500">
                            <PieChart className="h-5 w-5" />
                            <h3 className="font-bold">Total Conversion Rate</h3>
                        </div>
                        <p className="text-4xl font-extrabold" style={{ color: theme.colors.text }}>
                            {funnelTotal > 0 ? ((stageCounts['CONVERTED'] / funnelTotal) * 100).toFixed(1) : 0}%
                        </p>
                        <p className="text-sm mt-2" style={{ color: theme.colors.textSecondary }}>Leads successfully closed</p>
                    </Card>

                    <Card className="p-6 border border-red-500/20 bg-red-500/5">
                        <h3 className="font-bold text-red-500 mb-2">Lost Leads</h3>
                        <p className="text-3xl font-extrabold text-red-600">{leads.filter(l => l.status === 'LOST').length}</p>
                    </Card>
                </div>

                {/* Visual Funnel */}
                <Card className="lg:col-span-2 p-8" style={{ backgroundColor: theme.colors.surface }}>
                    <h3 className="text-xl font-bold mb-8" style={{ color: theme.colors.text }}>Pipeline Drop-off</h3>

                    <div className="space-y-4">
                        {funnelData.map((data, idx) => {
                            // Calculate width percentage based on the max volume passing through (which is usually the first stage)
                            const maxPassed = funnelData[0]?.passed || 1;
                            const widthPercent = Math.max((data.passed / maxPassed) * 100, 5); // Minimum 5% width for visibility

                            return (
                                <div key={data.stage} className="relative group">
                                    <div className="flex items-center justify-between mb-1">
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-sm tracking-widest text-text" style={{ color: theme.colors.text }}>{data.label}</span>
                                            <span className="text-xs px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/5 font-mono" style={{ color: theme.colors.textSecondary }}>
                                                {data.passed} total
                                            </span>
                                        </div>
                                        <div className="text-sm font-bold opacity-70" style={{ color: theme.colors.textSecondary }}>
                                            {idx > 0 && <span className="text-xs mr-2 font-normal">Conversion from prev:</span>}
                                            {data.rate}%
                                        </div>
                                    </div>

                                    <div className="h-12 w-full bg-black/5 dark:bg-white/5 rounded-r-xl overflow-hidden flex transition-all">
                                        <div
                                            className="h-full flex items-center justify-end px-4 text-white font-bold transition-all duration-1000 ease-out relative overflow-hidden"
                                            style={{
                                                width: `${widthPercent}%`,
                                                backgroundColor: getStageColor(idx),
                                            }}
                                        >
                                            {/* Subdued striped pattern overlay for texture */}
                                            <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'linear-gradient(45deg, rgba(255,255,255,0.15) 25%, transparent 25%, transparent 50%, rgba(255,255,255,0.15) 50%, rgba(255,255,255,0.15) 75%, transparent 75%, transparent)', backgroundSize: '1rem 1rem' }}></div>
                                            <span className="relative z-10 drop-shadow-md">{data.count} currently in stage</span>
                                        </div>
                                    </div>

                                    {idx < funnelData.length - 1 && (
                                        <div className="flex justify-center -my-2 relative z-10 w-8 mx-auto rotate-90 opacity-20 group-hover:opacity-50 transition-opacity">
                                            <ArrowRight className="h-8 w-8 text-black dark:text-white" />
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </Card>
            </div>
        </div>
    );
}
