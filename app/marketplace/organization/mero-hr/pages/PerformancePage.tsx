import React, { useState } from 'react';
import {
    Target, Plus, X, Star, Award, Users as UsersIcon,
    ChevronRight, CheckCircle2, BarChart3, Loader2
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { hrService } from '../services/hrService';
import { HrPerformanceGoal } from '../types';
import toast from 'react-hot-toast';
import { useTheme } from '@/contexts/ThemeContext';
import { Card, Button, Input } from '@shared';

const goalStatusConfig: Record<string, { color: string; bg: string; label: string }> = {
    NOT_STARTED: { color: 'text-slate-500', bg: 'bg-slate-100 dark:bg-slate-800', label: 'Not Started' },
    IN_PROGRESS: { color: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-900/30', label: 'In Progress' },
    COMPLETED: { color: 'text-green-500', bg: 'bg-green-100 dark:bg-green-900/30', label: 'Completed' },
    CANCELLED: { color: 'text-red-500', bg: 'bg-red-100 dark:bg-red-900/30', label: 'Cancelled' },
};

const reviewStatusColors: Record<string, string> = {
    DRAFT: 'text-slate-400', SUBMITTED: 'text-blue-500', REVIEWED: 'text-amber-500', APPROVED: 'text-green-500'
};

function getProgress(goal: HrPerformanceGoal): number {
    if (!goal.target_value || Number(goal.target_value) === 0) return goal.status === 'COMPLETED' ? 100 : 0;
    return Math.min(100, Math.round((Number(goal.current_value) / Number(goal.target_value)) * 100));
}

function StarRating({ score }: { score: number }) {
    return (
        <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map(i => (
                <Star key={i} className={`h-3.5 w-3.5 ${i <= Math.round(score) ? 'text-amber-400 fill-amber-400' : 'text-slate-300'}`} />
            ))}
            <span className="text-sm font-black ml-1 text-amber-500">{score?.toFixed(1)}</span>
        </div>
    );
}

export default function PerformancePage() {
    const { theme } = useTheme();
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState<'goals' | 'reviews' | 'kpi'>('goals');
    const [isAddGoalOpen, setIsAddGoalOpen] = useState(false);
    const [newGoal, setNewGoal] = useState({ title: '', category: 'INDIVIDUAL', due_date: '', weight: 10, target_value: 100 });

    const { data: goals = [], isLoading: goalsLoading } = useQuery({
        queryKey: ['hr-goals'],
        queryFn: () => hrService.getGoals(),
    });
    const { data: reviews = [], isLoading: reviewsLoading } = useQuery({
        queryKey: ['hr-reviews'],
        queryFn: () => hrService.getReviews(),
    });
    const createGoalMutation = useMutation({
        mutationFn: hrService.createGoal,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['hr-goals'] });
            toast.success('Goal created');
            setIsAddGoalOpen(false);
            setNewGoal({ title: '', category: 'INDIVIDUAL', due_date: '', weight: 10, target_value: 100 });
        },
        onError: () => toast.error('Failed to create goal'),
    });

    const isLoading = goalsLoading || reviewsLoading;
    const overallProgress = goals.length
        ? Math.round(goals.reduce((acc, g) => acc + getProgress(g) * ((g.weight || 1) / 100), 0))
        : 0;

    return (
        <div className="p-8 space-y-8 max-w-[1600px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-5">
                    <div className="p-4 rounded-2xl shadow-lg border" style={{ backgroundColor: `${theme.colors.primary}15`, borderColor: `${theme.colors.primary}30` }}>
                        <Target className="h-8 w-8" style={{ color: theme.colors.primary }} />
                    </div>
                    <div>
                        <h1 className="text-4xl font-black tracking-tight" style={{ color: theme.colors.text }}>Performance</h1>
                        <p className="font-medium opacity-60" style={{ color: theme.colors.textSecondary }}>Goals, KPIs & Review Cycles</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex rounded-xl border p-1 gap-1" style={{ borderColor: theme.colors.border, backgroundColor: theme.colors.surface }}>
                        {[{ key: 'goals', label: 'Goals' }, { key: 'reviews', label: 'Reviews' }, { key: 'kpi', label: 'KPI Dashboard' }].map(tab => (
                            <button key={tab.key} onClick={() => setActiveTab(tab.key as any)}
                                className="px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all"
                                style={{ backgroundColor: activeTab === tab.key ? theme.colors.primary : 'transparent', color: activeTab === tab.key ? '#fff' : theme.colors.text, opacity: activeTab === tab.key ? 1 : 0.5 }}>
                                {tab.label}
                            </button>
                        ))}
                    </div>
                    {activeTab === 'goals' && (
                        <Button onClick={() => setIsAddGoalOpen(true)} className="rounded-xl font-black px-6 shadow-xl shadow-primary/20">
                            <Plus className="h-4 w-4 mr-2" /> Add Goal
                        </Button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Overall Progress', value: `${overallProgress}%`, color: theme.colors.primary },
                    { label: 'In Progress', value: goals.filter(g => g.status === 'IN_PROGRESS').length, color: '#22c55e' },
                    { label: 'Not Started', value: goals.filter(g => g.status === 'NOT_STARTED').length, color: '#f59e0b' },
                    { label: 'Reviews Pending', value: reviews.filter(r => r.status !== 'APPROVED').length, color: '#8b5cf6' },
                ].map(stat => (
                    <Card key={stat.label} className="p-6 border-none shadow-lg" style={{ backgroundColor: theme.colors.surface }}>
                        <p className="text-[10px] font-black uppercase tracking-widest opacity-50 mb-2" style={{ color: theme.colors.text }}>{stat.label}</p>
                        <p className="text-3xl font-black" style={{ color: stat.color }}>{isLoading ? '—' : stat.value}</p>
                    </Card>
                ))}
            </div>

            {!isLoading && activeTab === 'goals' && (
                <div className="space-y-4">
                    {goals.length === 0 ? (
                        <div className="text-center py-16 rounded-2xl border opacity-50" style={{ borderColor: theme.colors.border }}>
                            <Target className="h-10 w-10 mx-auto mb-3" style={{ color: theme.colors.textSecondary }} />
                            <p style={{ color: theme.colors.text }}>No goals set yet. Add your first goal!</p>
                        </div>
                    ) : goals.map(goal => {
                        const progress = getProgress(goal);
                        const cfg = goalStatusConfig[goal.status] ?? goalStatusConfig.NOT_STARTED;
                        return (
                            <Card key={goal.id} className="p-6 border-none shadow-lg" style={{ backgroundColor: theme.colors.surface }}>
                                <div className="space-y-3">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <p className="font-black text-lg" style={{ color: theme.colors.text }}>{goal.title}</p>
                                            <div className="flex items-center gap-3 mt-1">
                                                <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full" style={{ backgroundColor: `${theme.colors.primary}10`, color: theme.colors.primary }}>{goal.category}</span>
                                                <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
                                                {goal.due_date && <span className="text-[10px] opacity-50 font-bold" style={{ color: theme.colors.textSecondary }}>Due: {new Date(goal.due_date as string).toLocaleDateString()}</span>}
                                            </div>
                                        </div>
                                        <span className="text-xs font-black opacity-40">Weight: {goal.weight}%</span>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="flex-1 h-2.5 rounded-full overflow-hidden bg-black/10 dark:bg-white/10">
                                            <div className="h-full rounded-full transition-all duration-1000"
                                                style={{ width: `${progress}%`, backgroundColor: goal.status === 'COMPLETED' ? '#22c55e' : theme.colors.primary }} />
                                        </div>
                                        <span className="text-sm font-black" style={{ color: theme.colors.text }}>
                                            {goal.target_value ? `${goal.current_value}/${goal.target_value}` : `${progress}%`}
                                        </span>
                                    </div>
                                </div>
                            </Card>
                        );
                    })}
                </div>
            )}

            {!isLoading && activeTab === 'reviews' && (
                <Card className="border-none shadow-xl overflow-hidden" style={{ backgroundColor: theme.colors.surface }}>
                    <div className="px-8 py-6 border-b" style={{ borderColor: theme.colors.border }}>
                        <h3 className="font-bold" style={{ color: theme.colors.text }}>Performance Reviews ({reviews.length})</h3>
                    </div>
                    {reviews.length === 0 ? (
                        <p className="text-center py-12 opacity-40" style={{ color: theme.colors.text }}>No reviews yet.</p>
                    ) : (
                        <div className="divide-y" style={{ borderColor: theme.colors.border }}>
                            {reviews.map(review => (
                                <div key={review.id} className="flex items-center justify-between px-8 py-5 hover:bg-black/5 dark:hover:bg-white/5 transition-colors group">
                                    <div className="flex items-center gap-4">
                                        <div className="h-10 w-10 rounded-xl flex items-center justify-center font-black text-sm" style={{ backgroundColor: `${theme.colors.primary}10`, color: theme.colors.primary }}>
                                            {review.employee?.first_name?.[0] ?? '?'}
                                        </div>
                                        <div>
                                            <p className="font-bold" style={{ color: theme.colors.text }}>{review.employee?.first_name} {review.employee?.last_name}</p>
                                            <p className="text-xs opacity-60">{review.review_period} · {review.fiscal_year}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-8">
                                        <div className="text-center hidden md:block">
                                            <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Self Score</p>
                                            {review.self_rating != null ? <StarRating score={Number(review.self_rating)} /> : <p className="text-xs opacity-30 mt-0.5">—</p>}
                                        </div>
                                        <div className="text-center hidden md:block">
                                            <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Manager Score</p>
                                            {review.manager_rating != null ? <StarRating score={Number(review.manager_rating)} /> : <p className="text-xs opacity-30 mt-0.5">—</p>}
                                        </div>
                                        <span className={`text-[10px] font-black uppercase tracking-widest ${reviewStatusColors[review.status] ?? 'text-slate-400'}`}>{review.status}</span>
                                        <Button size="sm" variant="outline" className="rounded-xl text-xs font-black opacity-0 group-hover:opacity-100 transition-all">Review <ChevronRight className="h-3 w-3 ml-1" /></Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </Card>
            )}

            {activeTab === 'kpi' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[
                        { label: 'Goals Completed', value: goals.filter(g => g.status === 'COMPLETED').length, max: Math.max(goals.length, 1), color: '#22c55e', icon: CheckCircle2 },
                        { label: 'Total Goals', value: goals.length, max: Math.max(goals.length, 1), color: theme.colors.primary, icon: Target },
                        { label: 'Avg Goal Progress', value: overallProgress, max: 100, color: '#f59e0b', icon: BarChart3, suffix: '%' },
                        { label: 'Reviews Approved', value: reviews.filter(r => r.status === 'APPROVED').length, max: Math.max(reviews.length, 1), color: '#8b5cf6', icon: Award },
                        { label: 'Reviews Pending', value: reviews.filter(r => r.status !== 'APPROVED').length, max: Math.max(reviews.length, 1), color: '#06b6d4', icon: UsersIcon },
                        { label: 'In Progress Goals', value: goals.filter(g => g.status === 'IN_PROGRESS').length, max: Math.max(goals.length, 1), color: '#ec4899', icon: Star },
                    ].map(kpi => (
                        <Card key={kpi.label} className="p-8 border-none shadow-xl relative overflow-hidden group" style={{ backgroundColor: theme.colors.surface }}>
                            <div className="absolute top-0 right-0 p-6 opacity-5 scale-150 group-hover:scale-[1.7] transition-transform duration-700">
                                <kpi.icon size={80} style={{ color: kpi.color }} />
                            </div>
                            <p className="text-[10px] font-black uppercase tracking-widest opacity-50 mb-2 relative z-10" style={{ color: theme.colors.text }}>{kpi.label}</p>
                            <p className="text-4xl font-black relative z-10" style={{ color: kpi.color }}>{isLoading ? '—' : kpi.value}{!isLoading && (kpi as any).suffix ? (kpi as any).suffix : ''}</p>
                            <div className="mt-4 h-2 rounded-full overflow-hidden bg-black/10 dark:bg-white/10 relative z-10">
                                <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${Math.min(100, (Number(kpi.value) / kpi.max) * 100)}%`, backgroundColor: kpi.color }} />
                            </div>
                        </Card>
                    ))}
                </div>
            )}

            {isAddGoalOpen && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="rounded-3xl shadow-2xl w-full max-w-md p-8 space-y-6 animate-in zoom-in duration-300" style={{ backgroundColor: theme.colors.surface }}>
                        <div className="flex items-center justify-between">
                            <h3 className="text-xl font-black" style={{ color: theme.colors.text }}>Add New Goal</h3>
                            <button onClick={() => setIsAddGoalOpen(false)} className="p-2 rounded-lg hover:bg-black/5"><X className="h-5 w-5" /></button>
                        </div>
                        <div className="space-y-4">
                            <Input placeholder="Goal title..." value={newGoal.title} onChange={e => setNewGoal(p => ({ ...p, title: e.target.value }))} className="rounded-xl" />
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs opacity-50 block mb-1" style={{ color: theme.colors.text }}>Category</label>
                                    <select value={newGoal.category} onChange={e => setNewGoal(p => ({ ...p, category: e.target.value }))}
                                        className="w-full px-3 py-2 rounded-xl border text-sm focus:outline-none"
                                        style={{ borderColor: theme.colors.border, backgroundColor: theme.colors.surface, color: theme.colors.text }}>
                                        {['INDIVIDUAL', 'TEAM', 'DEPARTMENT', 'COMPANY'].map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs opacity-50 block mb-1" style={{ color: theme.colors.text }}>Weight (%)</label>
                                    <Input type="number" min="1" max="100" value={newGoal.weight} onChange={e => setNewGoal(p => ({ ...p, weight: Number(e.target.value) }))} className="rounded-xl" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs opacity-50 block mb-1" style={{ color: theme.colors.text }}>Target Value</label>
                                    <Input type="number" value={newGoal.target_value} onChange={e => setNewGoal(p => ({ ...p, target_value: Number(e.target.value) }))} className="rounded-xl" />
                                </div>
                                <div>
                                    <label className="text-xs opacity-50 block mb-1" style={{ color: theme.colors.text }}>Due Date</label>
                                    <Input type="date" value={newGoal.due_date} onChange={e => setNewGoal(p => ({ ...p, due_date: e.target.value }))} className="rounded-xl" />
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-3 pt-4 border-t" style={{ borderColor: theme.colors.border }}>
                            <Button variant="outline" onClick={() => setIsAddGoalOpen(false)} className="flex-1 rounded-xl">Cancel</Button>
                            <Button
                                onClick={() => createGoalMutation.mutate({ title: newGoal.title, category: newGoal.category as any, weight: newGoal.weight, target_value: newGoal.target_value, due_date: newGoal.due_date || undefined })}
                                isLoading={createGoalMutation.isPending}
                                disabled={!newGoal.title.trim()}
                                className="flex-1 rounded-xl font-black shadow-xl shadow-primary/20">Save Goal</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
