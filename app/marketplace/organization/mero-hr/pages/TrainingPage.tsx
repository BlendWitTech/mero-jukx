import React, { useState } from 'react';
import { BookOpen, Plus, X, Users as UsersIcon, Clock, Award, CalendarDays, Search, Loader2 } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { Card, Button, Input } from '@shared';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { hrService } from '../services/hrService';
import { HrTrainingProgram } from '../types';
import toast from 'react-hot-toast';

type TrainingStatus = 'UPCOMING' | 'ONGOING' | 'COMPLETED' | 'CANCELLED';

const statusConfig: Record<TrainingStatus, { color: string; bg: string }> = {
    UPCOMING: { color: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-900/30' },
    ONGOING: { color: 'text-amber-500', bg: 'bg-amber-100 dark:bg-amber-900/30' },
    COMPLETED: { color: 'text-green-500', bg: 'bg-green-100 dark:bg-green-900/30' },
    CANCELLED: { color: 'text-red-500', bg: 'bg-red-100 dark:bg-red-900/30' },
};

export default function TrainingPage() {
    const { theme } = useTheme();
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState<'programs' | 'calendar'>('programs');
    const [search, setSearch] = useState('');
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [newProgram, setNewProgram] = useState({ title: '', category: '', trainer: '', start_date: '', end_date: '', duration: '', capacity: 20, mode: 'IN_PERSON' });

    const { data: programs = [], isLoading } = useQuery({
        queryKey: ['hr-training'],
        queryFn: () => hrService.getTrainingPrograms(),
    });
    const createMutation = useMutation({
        mutationFn: hrService.createTrainingProgram,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['hr-training'] });
            toast.success('Training program created');
            setIsAddOpen(false);
            setNewProgram({ title: '', category: '', trainer: '', start_date: '', end_date: '', duration: '', capacity: 20, mode: 'IN_PERSON' });
        },
        onError: () => toast.error('Failed to create program'),
    });
    const enrollMutation = useMutation({
        mutationFn: hrService.enrollTraining,
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['hr-training'] }); toast.success('Enrolled successfully'); },
        onError: () => toast.error('Enrollment failed'),
    });

    const filtered = programs.filter((t: HrTrainingProgram) =>
        t.title.toLowerCase().includes(search.toLowerCase()) ||
        t.category.toLowerCase().includes(search.toLowerCase())
    );
    const avgCompletion = programs.filter(p => p.completion_rate != null).length
        ? Math.round(programs.filter(p => p.completion_rate != null).reduce((a, t) => a + Number(t.completion_rate), 0) / programs.filter(p => p.completion_rate != null).length)
        : 0;

    return (
        <div className="p-8 space-y-8 max-w-[1600px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-5">
                    <div className="p-4 rounded-2xl shadow-lg border" style={{ backgroundColor: `${theme.colors.primary}15`, borderColor: `${theme.colors.primary}30` }}>
                        <BookOpen className="h-8 w-8" style={{ color: theme.colors.primary }} />
                    </div>
                    <div>
                        <h1 className="text-4xl font-black tracking-tight" style={{ color: theme.colors.text }}>Training & Development</h1>
                        <p className="font-medium opacity-60" style={{ color: theme.colors.textSecondary }}>Programs, enrollment & skills inventory</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex rounded-xl border p-1 gap-1" style={{ borderColor: theme.colors.border, backgroundColor: theme.colors.surface }}>
                        {[{ key: 'programs', label: 'Programs' }, { key: 'calendar', label: 'Calendar' }].map(tab => (
                            <button key={tab.key} onClick={() => setActiveTab(tab.key as any)}
                                className="px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all"
                                style={{ backgroundColor: activeTab === tab.key ? theme.colors.primary : 'transparent', color: activeTab === tab.key ? '#fff' : theme.colors.text, opacity: activeTab === tab.key ? 1 : 0.5 }}>
                                {tab.label}
                            </button>
                        ))}
                    </div>
                    <Button onClick={() => setIsAddOpen(true)} className="rounded-xl font-black px-6 shadow-xl shadow-primary/20">
                        <Plus className="h-4 w-4 mr-2" /> New Program
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Total Programs', value: programs.length, color: theme.colors.primary },
                    { label: 'Ongoing', value: programs.filter(t => t.status === 'ONGOING').length, color: '#f59e0b' },
                    { label: 'Completed', value: programs.filter(t => t.status === 'COMPLETED').length, color: '#22c55e' },
                    { label: 'Avg Completion Rate', value: `${avgCompletion}%`, color: '#8b5cf6' },
                ].map(stat => (
                    <Card key={stat.label} className="p-6 border-none shadow-lg" style={{ backgroundColor: theme.colors.surface }}>
                        <p className="text-[10px] font-black uppercase tracking-widest opacity-50 mb-2" style={{ color: theme.colors.text }}>{stat.label}</p>
                        <p className="text-3xl font-black" style={{ color: stat.color }}>{isLoading ? '—' : stat.value}</p>
                    </Card>
                ))}
            </div>

            {isLoading && <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin" style={{ color: theme.colors.primary }} /></div>}

            {!isLoading && activeTab === 'programs' && (
                <>
                    <div className="relative max-w-sm">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 opacity-40" />
                        <Input placeholder="Search programs..." value={search} onChange={e => setSearch(e.target.value)} className="pl-11 rounded-xl" />
                    </div>
                    {filtered.length === 0 ? (
                        <div className="text-center py-16 rounded-2xl border opacity-50" style={{ borderColor: theme.colors.border }}>
                            <BookOpen className="h-10 w-10 mx-auto mb-3" style={{ color: theme.colors.textSecondary }} />
                            <p style={{ color: theme.colors.text }}>No programs yet. Create your first training!</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                            {filtered.map((training: HrTrainingProgram) => {
                                const cfg = statusConfig[training.status as TrainingStatus] ?? statusConfig.UPCOMING;
                                return (
                                    <Card key={training.id} className="p-6 border-none shadow-xl space-y-4 group hover:shadow-2xl transition-shadow" style={{ backgroundColor: theme.colors.surface }}>
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>{training.status}</span>
                                                <h3 className="font-black text-base mt-2 leading-snug" style={{ color: theme.colors.text }}>{training.title}</h3>
                                                <p className="text-xs opacity-50 mt-0.5" style={{ color: theme.colors.textSecondary }}>{training.category}</p>
                                            </div>
                                        </div>
                                        <div className="pt-2 space-y-2 text-xs" style={{ color: theme.colors.textSecondary }}>
                                            <div className="flex items-center gap-2"><Award className="h-3.5 w-3.5 opacity-50" /><span className="font-bold">{training.trainer}</span></div>
                                            <div className="flex items-center gap-2"><CalendarDays className="h-3.5 w-3.5 opacity-50" /><span>{new Date(training.start_date as string).toLocaleDateString()} → {new Date(training.end_date as string).toLocaleDateString()}</span></div>
                                            <div className="flex items-center gap-2"><Clock className="h-3.5 w-3.5 opacity-50" /><span>{training.duration}</span></div>
                                            <div className="flex items-center gap-2"><UsersIcon className="h-3.5 w-3.5 opacity-50" /><span>{training.enrolled}/{training.capacity} enrolled</span></div>
                                        </div>
                                        <div className="space-y-1">
                                            <div className="h-1.5 rounded-full overflow-hidden bg-black/10 dark:bg-white/10">
                                                <div className="h-full rounded-full" style={{ width: `${(training.enrolled / training.capacity) * 100}%`, backgroundColor: theme.colors.primary }} />
                                            </div>
                                            {training.completion_rate != null && (
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[10px] opacity-40">Completion</span>
                                                    <span className="text-[10px] font-black text-green-500">{training.completion_rate}%</span>
                                                </div>
                                            )}
                                        </div>
                                        <Button
                                            variant={training.status === 'UPCOMING' ? 'primary' : 'outline'}
                                            onClick={() => training.status === 'UPCOMING' && enrollMutation.mutate(training.id)}
                                            disabled={training.enrolled >= training.capacity}
                                            className="w-full rounded-xl text-xs font-black">
                                            {training.status === 'UPCOMING' ? (training.enrolled >= training.capacity ? 'Full' : 'Enroll Now') : training.status === 'ONGOING' ? 'View Progress' : 'View Report'}
                                        </Button>
                                    </Card>
                                );
                            })}
                        </div>
                    )}
                </>
            )}

            {!isLoading && activeTab === 'calendar' && (
                <Card className="p-8 border-none shadow-xl" style={{ backgroundColor: theme.colors.surface }}>
                    <h3 className="font-black mb-4" style={{ color: theme.colors.text }}>Training Schedule</h3>
                    {programs.length === 0 ? (
                        <p className="text-center py-8 opacity-40" style={{ color: theme.colors.text }}>No programs scheduled.</p>
                    ) : (
                        <div className="space-y-3">
                            {[...programs].sort((a, b) => new Date(a.start_date as string).getTime() - new Date(b.start_date as string).getTime()).map((t: HrTrainingProgram) => {
                                const cfg = statusConfig[t.status as TrainingStatus] ?? statusConfig.UPCOMING;
                                const d = new Date(t.start_date as string);
                                return (
                                    <div key={t.id} className="flex items-center gap-4 p-4 rounded-2xl border" style={{ borderColor: theme.colors.border, backgroundColor: `${theme.colors.primary}04` }}>
                                        <div className="text-center min-w-[60px]">
                                            <p className="text-2xl font-black" style={{ color: theme.colors.primary }}>{d.getDate()}</p>
                                            <p className="text-[10px] font-black uppercase opacity-40">{d.toLocaleString('default', { month: 'short' })}</p>
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-bold" style={{ color: theme.colors.text }}>{t.title}</p>
                                            <p className="text-xs opacity-60">by {t.trainer} · {t.duration}</p>
                                        </div>
                                        <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-full ${cfg.bg} ${cfg.color}`}>{t.status}</span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </Card>
            )}

            {isAddOpen && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="rounded-3xl shadow-2xl w-full max-w-md p-8 space-y-6 animate-in zoom-in duration-300" style={{ backgroundColor: theme.colors.surface }}>
                        <div className="flex items-center justify-between">
                            <h3 className="text-xl font-black" style={{ color: theme.colors.text }}>New Training Program</h3>
                            <button onClick={() => setIsAddOpen(false)} className="p-2 rounded-lg hover:bg-black/5"><X className="h-5 w-5" /></button>
                        </div>
                        <div className="space-y-4">
                            <Input placeholder="Program title" className="rounded-xl" value={newProgram.title} onChange={e => setNewProgram(p => ({ ...p, title: e.target.value }))} />
                            <Input placeholder="Category (Technical, Legal...)" className="rounded-xl" value={newProgram.category} onChange={e => setNewProgram(p => ({ ...p, category: e.target.value }))} />
                            <Input placeholder="Trainer name" className="rounded-xl" value={newProgram.trainer} onChange={e => setNewProgram(p => ({ ...p, trainer: e.target.value }))} />
                            <div className="grid grid-cols-2 gap-3">
                                <Input type="date" className="rounded-xl" value={newProgram.start_date} onChange={e => setNewProgram(p => ({ ...p, start_date: e.target.value }))} />
                                <Input type="date" className="rounded-xl" value={newProgram.end_date} onChange={e => setNewProgram(p => ({ ...p, end_date: e.target.value }))} />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <Input placeholder="Duration (e.g. 2 days)" className="rounded-xl" value={newProgram.duration} onChange={e => setNewProgram(p => ({ ...p, duration: e.target.value }))} />
                                <Input type="number" placeholder="Capacity" className="rounded-xl" value={newProgram.capacity} onChange={e => setNewProgram(p => ({ ...p, capacity: Number(e.target.value) }))} />
                            </div>
                            <select className="w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                                style={{ borderColor: theme.colors.border, backgroundColor: theme.colors.background, color: theme.colors.text }}
                                value={newProgram.mode} onChange={e => setNewProgram(p => ({ ...p, mode: e.target.value }))}>
                                <option value="IN_PERSON">In Person</option>
                                <option value="ONLINE">Online</option>
                                <option value="HYBRID">Hybrid</option>
                            </select>
                        </div>
                        <div className="flex gap-3 pt-4 border-t" style={{ borderColor: theme.colors.border }}>
                            <Button variant="outline" onClick={() => setIsAddOpen(false)} className="flex-1 rounded-xl">Cancel</Button>
                            <Button
                                className="flex-1 rounded-xl font-black shadow-xl shadow-primary/20"
                                disabled={createMutation.isPending || !newProgram.title || !newProgram.start_date}
                                onClick={() => createMutation.mutate(newProgram)}>
                                {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : 'Create Program'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
