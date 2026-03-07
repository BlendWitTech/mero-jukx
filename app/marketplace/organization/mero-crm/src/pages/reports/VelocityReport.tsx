import React, { useEffect, useState } from 'react';
import { useTheme } from '@frontend/contexts/ThemeContext';
import { dealsApi, Deal } from '../../api/deals';
import { leadsApi, Lead } from '../../api/leads';
import { Card, Loading, toast, Badge } from '@shared';
import { ArrowLeft, Activity, Clock, Timer, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAppContext } from '../../contexts/AppContext';

export default function VelocityReport() {
    const { theme } = useTheme();
    const { buildHref } = useAppContext();
    const [deals, setDeals] = useState<Deal[]>([]);
    const [leads, setLeads] = useState<Lead[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [dealsData, leadsData] = await Promise.all([
                dealsApi.getDeals(),
                leadsApi.getLeads()
            ]);
            setDeals(dealsData);
            setLeads(leadsData);
        } catch (error: any) {
            toast.error('Failed to fetch pipeline data');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div className="p-8 text-center"><Loading text="Calculating velocity..." /></div>;
    }

    // Helper to calculate days between two dates
    const getDaysDifference = (from: string, to: string = new Date().toISOString()) => {
        const d1 = new Date(from);
        const d2 = new Date(to);
        const diffTime = Math.abs(d2.getTime() - d1.getTime());
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    };

    // Calculate Average Deal Cycle (Time from creation to WON)
    const wonDeals = deals.filter(d => d.status === 'WON');
    let avgDealCycle = 0;
    if (wonDeals.length > 0) {
        const totalDays = wonDeals.reduce((sum, deal) => sum + getDaysDifference(deal.createdAt, deal.updatedAt), 0);
        avgDealCycle = Math.round(totalDays / wonDeals.length);
    }

    // Calculate Total Pipeline Pipeline Value vs Total Stagnant Pipeline Value
    const activeDeals = deals.filter(d => !['WON', 'LOST'].includes(d.status));

    // Calculate Average Age by Deal Stage
    const dealStages = ['NEW', 'DISCOVERY', 'PROPOSAL', 'NEGOTIATION'];
    const dealAgeByStage = dealStages.map(stage => {
        const stageDeals = activeDeals.filter(d => d.stage === stage);
        const avgAge = stageDeals.length > 0
            ? Math.round(stageDeals.reduce((sum, deal) => sum + getDaysDifference(deal.updatedAt), 0) / stageDeals.length)
            : 0;
        return { stage, count: stageDeals.length, avgAge };
    });

    // Identify Stagnant Records (No updates in > 14 days)
    const stagnantThresholdDays = 14;
    const stagnantDeals = activeDeals.filter(d => getDaysDifference(d.updatedAt) >= stagnantThresholdDays);
    const stagnantLeads = leads.filter(l => !['CONVERTED', 'LOST'].includes(l.status) && getDaysDifference(l.updatedAt) >= stagnantThresholdDays);

    const stagnantValue = stagnantDeals.reduce((sum, d) => sum + Number(d.value || 0), 0);

    return (
        <div className="p-8 max-w-[1600px] mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <div className="flex items-center justify-between border-b pb-6" style={{ borderColor: theme.colors.border }}>
                <div className="flex items-center gap-4">
                    <Link to={buildHref('/reports')} className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                        <ArrowLeft className="h-6 w-6" style={{ color: theme.colors.textSecondary }} />
                    </Link>
                    <div className="p-3 rounded-2xl bg-orange-500/10">
                        <Activity className="h-8 w-8 text-orange-500" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold" style={{ color: theme.colors.text }}>Pipeline Velocity</h1>
                        <p style={{ color: theme.colors.textSecondary }}>Identify bottlenecks and track sales cycle speed</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Card className="p-6" style={{ backgroundColor: theme.colors.surface }}>
                    <div className="flex items-center gap-3 mb-4 text-orange-500">
                        <Timer className="h-5 w-5" />
                        <h3 className="font-bold">Average Sales Cycle</h3>
                    </div>
                    <p className="text-4xl font-extrabold" style={{ color: theme.colors.text }}>
                        {avgDealCycle} <span className="text-xl font-medium" style={{ color: theme.colors.textSecondary }}>days</span>
                    </p>
                    <p className="text-sm mt-2" style={{ color: theme.colors.textSecondary }}>Time from creation to closed WON</p>
                </Card>

                <Card className="p-6 border border-red-500/20 bg-red-500/5">
                    <div className="flex items-center gap-3 mb-4 text-red-500">
                        <AlertCircle className="h-5 w-5" />
                        <h3 className="font-bold">Stagnant Pipeline Value</h3>
                    </div>
                    <p className="text-4xl font-extrabold text-red-600">
                        ${stagnantValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <p className="text-sm mt-2 text-red-800/70 dark:text-red-300/70">
                        Deals with no activity in {stagnantThresholdDays}+ days
                    </p>
                </Card>

                <Card className="p-6" style={{ backgroundColor: theme.colors.surface }}>
                    <div className="flex items-center gap-3 mb-4 text-blue-500">
                        <Clock className="h-5 w-5" />
                        <h3 className="font-bold">Stagnant Entities</h3>
                    </div>
                    <div className="flex gap-4">
                        <div>
                            <p className="text-3xl font-extrabold" style={{ color: theme.colors.text }}>{stagnantDeals.length}</p>
                            <p className="text-xs uppercase font-bold" style={{ color: theme.colors.textSecondary }}>Deals</p>
                        </div>
                        <div className="w-px bg-border my-2"></div>
                        <div>
                            <p className="text-3xl font-extrabold" style={{ color: theme.colors.text }}>{stagnantLeads.length}</p>
                            <p className="text-xs uppercase font-bold" style={{ color: theme.colors.textSecondary }}>Leads</p>
                        </div>
                    </div>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Deal Stage Age Analysis */}
                <Card className="p-6" style={{ backgroundColor: theme.colors.surface }}>
                    <h3 className="text-xl font-bold mb-6" style={{ color: theme.colors.text }}>Average Days in Deal Stage</h3>

                    <div className="space-y-6">
                        {dealAgeByStage.map(stageData => {
                            // Find the max age to calculate relative width, or fallback to a standard 30 day marker
                            const maxAge = Math.max(...dealAgeByStage.map(s => s.avgAge), 30);
                            const widthPercent = Math.max((stageData.avgAge / maxAge) * 100, 2); // At least 2% for visibility

                            // Determine color based on health (e.g. older than 14 days is warning, older than 21 is danger)
                            let colorClass = "bg-blue-500";
                            if (stageData.avgAge >= 21) colorClass = "bg-red-500";
                            else if (stageData.avgAge >= 10) colorClass = "bg-orange-500";

                            return (
                                <div key={stageData.stage}>
                                    <div className="flex justify-between text-sm mb-2">
                                        <span className="font-bold" style={{ color: theme.colors.text }}>{stageData.stage}</span>
                                        <div className="flex items-center gap-3">
                                            <span style={{ color: theme.colors.textSecondary }}>{stageData.count} deals</span>
                                            <span className="font-bold w-12 text-right" style={{ color: theme.colors.text }}>
                                                {stageData.avgAge}d
                                            </span>
                                        </div>
                                    </div>
                                    <div className="h-4 w-full bg-black/5 dark:bg-white/5 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full ${colorClass} transition-all duration-1000`}
                                            style={{ width: `${widthPercent}%` }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </Card>

                {/* Critical Stagnant List */}
                <Card className="p-6 flex flex-col" style={{ backgroundColor: theme.colors.surface }}>
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xl font-bold" style={{ color: theme.colors.text }}>Critical Stagnant Deals</h3>
                        <Badge variant="danger">{stagnantDeals.length} Deals at Risk</Badge>
                    </div>

                    {stagnantDeals.length === 0 ? (
                        <div className="text-center py-12 flex-1 flex flex-col items-center justify-center opacity-50">
                            <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
                            <p style={{ color: theme.colors.textSecondary }}>Your pipeline is healthy!</p>
                            <p className="text-sm mt-1" style={{ color: theme.colors.textSecondary }}>No deals have been stagnant for over {stagnantThresholdDays} days.</p>
                        </div>
                    ) : (
                        <div className="overflow-y-auto max-h-[400px] -mx-6 px-6 space-y-3">
                            {stagnantDeals
                                .sort((a, b) => getDaysDifference(b.updatedAt) - getDaysDifference(a.updatedAt)) // Sort by oldest first
                                .map(deal => (
                                    <div key={deal.id} className="p-4 rounded-xl border flex items-center justify-between bg-black/5 dark:bg-white/5 border-border">
                                        <div>
                                            <Link to={buildHref(`/deals/${deal.id}`)} className="font-bold hover:underline" style={{ color: theme.colors.text }}>
                                                {deal.title}
                                            </Link>
                                            <div className="flex items-center gap-2 mt-1 text-xs" style={{ color: theme.colors.textSecondary }}>
                                                <span>Stage: {deal.stage}</span>
                                                <span>&bull;</span>
                                                <span>Value: ${Number(deal.value || 0).toLocaleString()}</span>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-bold text-red-500">
                                                {getDaysDifference(deal.updatedAt)} days
                                            </div>
                                            <div className="text-[10px] uppercase tracking-wider" style={{ color: theme.colors.textSecondary }}>
                                                since last update
                                            </div>
                                        </div>
                                    </div>
                                ))}
                        </div>
                    )}
                </Card>
            </div>
        </div>
    );
}
