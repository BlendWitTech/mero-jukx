import React, { useState } from 'react';
import { useTheme } from '@frontend/contexts/ThemeContext';
import { Card } from '@shared';
import { BarChart2, PieChart, Activity, DollarSign, Filter, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAppContext } from '../../contexts/AppContext';

export default function ReportsPage() {
    const { theme } = useTheme();
    const { buildHref } = useAppContext();

    return (
        <div className="p-8 max-w-[1600px] mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex items-center gap-4">
                <div className="p-3 rounded-2xl bg-primary/10">
                    <BarChart2 className="h-8 w-8 text-primary" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold" style={{ color: theme.colors.text }}>Reports & Analytics</h1>
                    <p style={{ color: theme.colors.textSecondary }}>Gain actionable insights from your CRM data</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Link to={buildHref('/reports/funnel')} className="block">
                    <Card className="p-6 cursor-pointer hover:border-primary transition-colors h-full" style={{ backgroundColor: theme.colors.surface }}>
                        <PieChart className="h-8 w-8 text-blue-500 mb-4" />
                        <h3 className="font-bold mb-2" style={{ color: theme.colors.text }}>Lead Conversion Funnel</h3>
                        <p className="text-sm" style={{ color: theme.colors.textSecondary }}>Track how leads progress through your pipeline stages.</p>
                    </Card>
                </Link>

                <Link to={buildHref('/reports/velocity')} className="block">
                    <Card className="p-6 cursor-pointer hover:border-primary transition-colors h-full" style={{ backgroundColor: theme.colors.surface }}>
                        <Activity className="h-8 w-8 text-orange-500 mb-4" />
                        <h3 className="font-bold mb-2" style={{ color: theme.colors.text }}>Pipeline Velocity</h3>
                        <p className="text-sm" style={{ color: theme.colors.textSecondary }}>Analyze the average time spent in each deal stage.</p>
                    </Card>
                </Link>

                <Link to={buildHref('/reports/revenue')} className="block">
                    <Card className="p-6 cursor-pointer hover:border-primary transition-colors h-full" style={{ backgroundColor: theme.colors.surface }}>
                        <DollarSign className="h-8 w-8 text-green-500 mb-4" />
                        <h3 className="font-bold mb-2" style={{ color: theme.colors.text }}>Revenue Forecast</h3>
                        <p className="text-sm" style={{ color: theme.colors.textSecondary }}>Project future revenue based on deal probability.</p>
                    </Card>
                </Link>

                <Link to={buildHref('/reports/custom')} className="block">
                    <Card className="p-6 cursor-pointer hover:border-primary transition-colors h-full" style={{ backgroundColor: theme.colors.surface }}>
                        <Filter className="h-8 w-8 text-purple-500 mb-4" />
                        <h3 className="font-bold mb-2" style={{ color: theme.colors.text }}>Custom Report</h3>
                        <p className="text-sm" style={{ color: theme.colors.textSecondary }}>Build a tabular report from any CRM entity.</p>
                    </Card>
                </Link>

                <Link to={buildHref('/reports/win-loss')} className="block">
                    <Card className="p-6 cursor-pointer hover:border-primary transition-colors h-full" style={{ backgroundColor: theme.colors.surface }}>
                        <TrendingUp className="h-8 w-8 text-red-500 mb-4" />
                        <h3 className="font-bold mb-2" style={{ color: theme.colors.text }}>Win / Loss Analysis</h3>
                        <p className="text-sm" style={{ color: theme.colors.textSecondary }}>Understand why deals are won or lost and identify patterns.</p>
                    </Card>
                </Link>
            </div>
        </div>
    );
}
