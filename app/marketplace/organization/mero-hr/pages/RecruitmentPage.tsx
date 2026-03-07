import React, { useState } from 'react';
import {
    Briefcase, Plus, Search, X, User,
    CalendarDays, FileText, Star, CheckCircle2, Mail, Phone, Eye, Loader2
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { Card, Button, Input } from '@shared';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { hrService } from '../services/hrService';
import toast from 'react-hot-toast';

type Stage = 'APPLIED' | 'SCREENING' | 'INTERVIEW' | 'TECHNICAL' | 'OFFER' | 'HIRED' | 'REJECTED';

const STAGES: { key: Stage; label: string; color: string; bg: string }[] = [
    { key: 'APPLIED', label: 'Applied', color: 'text-slate-500', bg: 'bg-slate-100 dark:bg-slate-800' },
    { key: 'SCREENING', label: 'Screening', color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20' },
    { key: 'INTERVIEW', label: 'Interview', color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-900/20' },
    { key: 'TECHNICAL', label: 'Technical', color: 'text-indigo-500', bg: 'bg-indigo-50 dark:bg-indigo-900/20' },
    { key: 'OFFER', label: 'Offer', color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20' },
    { key: 'HIRED', label: 'Hired', color: 'text-green-500', bg: 'bg-green-50 dark:bg-green-900/20' },
    { key: 'REJECTED', label: 'Rejected', color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-900/20' },
];

export default function RecruitmentPage() {
    const { theme } = useTheme();
    const queryClient = useQueryClient();
    const [view, setView] = useState<'pipeline' | 'jobs'>('pipeline');
    const [search, setSearch] = useState('');
    const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
    const [isAddJobOpen, setIsAddJobOpen] = useState(false);
    const [newJob, setNewJob] = useState({ title: '', department: '', employment_type: 'FULL_TIME', vacancies: 1 });

    const { data: jobs = [], isLoading: jobsLoading } = useQuery({
        queryKey: ['hr-jobs'],
        queryFn: hrService.getJobs,
    });

    const { data: candidates = [], isLoading: candidatesLoading } = useQuery({
        queryKey: ['hr-candidates'],
        queryFn: () => hrService.getCandidates(),
    });

    const createJobMutation = useMutation({
        mutationFn: hrService.createJob,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['hr-jobs'] });
            toast.success('Job posted successfully');
            setIsAddJobOpen(false);
            setNewJob({ title: '', department: '', employment_type: 'FULL_TIME', vacancies: 1 });
        },
        onError: () => toast.error('Failed to post job'),
    });

    const updateCandidateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: any }) => hrService.updateCandidate(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['hr-candidates'] });
            toast.success('Candidate updated');
        },
        onError: () => toast.error('Failed to update candidate'),
    });

    const selectedCandidate = selectedCandidateId ? candidates.find(c => c.id === selectedCandidateId) : null;

    const filtered = candidates.filter(c => {
        const name = `${c.first_name} ${c.last_name ?? ''}`.toLowerCase();
        return name.includes(search.toLowerCase()) || (c.job?.title ?? '').toLowerCase().includes(search.toLowerCase());
    });

    const isLoading = jobsLoading || candidatesLoading;

    return (
        <div className="p-8 space-y-8 max-w-[1600px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-5">
                    <div className="p-4 rounded-2xl shadow-lg border" style={{ backgroundColor: `${theme.colors.primary}15`, borderColor: `${theme.colors.primary}30` }}>
                        <Briefcase className="h-8 w-8" style={{ color: theme.colors.primary }} />
                    </div>
                    <div>
                        <h1 className="text-4xl font-black tracking-tight" style={{ color: theme.colors.text }}>Recruitment</h1>
                        <p className="font-medium opacity-60" style={{ color: theme.colors.textSecondary }}>Applicant tracking & hiring pipeline</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex rounded-xl border p-1 gap-1" style={{ borderColor: theme.colors.border, backgroundColor: theme.colors.surface }}>
                        {['pipeline', 'jobs'].map(v => (
                            <button key={v} onClick={() => setView(v as any)}
                                className="px-5 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all"
                                style={{ backgroundColor: view === v ? theme.colors.primary : 'transparent', color: view === v ? '#fff' : theme.colors.text, opacity: view === v ? 1 : 0.5 }}>
                                {v === 'pipeline' ? 'Pipeline' : 'Job Openings'}
                            </button>
                        ))}
                    </div>
                    <Button onClick={() => setIsAddJobOpen(true)} className="rounded-xl font-black px-6 shadow-xl shadow-primary/20">
                        <Plus className="h-4 w-4 mr-2" /> New Job
                    </Button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Total Applicants', value: candidates.length, color: 'text-blue-500' },
                    { label: 'In Interview', value: candidates.filter(c => c.stage === 'INTERVIEW').length, color: 'text-purple-500' },
                    { label: 'Offer Extended', value: candidates.filter(c => c.stage === 'OFFER').length, color: 'text-amber-500' },
                    { label: 'Hired', value: candidates.filter(c => c.stage === 'HIRED').length, color: 'text-green-500' },
                ].map(stat => (
                    <Card key={stat.label} className="p-6 border-none shadow-lg" style={{ backgroundColor: theme.colors.surface }}>
                        <p className="text-[10px] font-black uppercase tracking-widest opacity-50 mb-2" style={{ color: theme.colors.text }}>{stat.label}</p>
                        <p className={`text-3xl font-black ${stat.color}`}>{isLoading ? '—' : stat.value}</p>
                    </Card>
                ))}
            </div>

            {isLoading && (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="h-8 w-8 animate-spin" style={{ color: theme.colors.primary }} />
                </div>
            )}

            {!isLoading && view === 'pipeline' && (
                <>
                    <div className="relative max-w-sm">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 opacity-40" />
                        <Input placeholder="Search candidates..." value={search} onChange={e => setSearch(e.target.value)} className="pl-11 rounded-xl" />
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-7 gap-4">
                        {STAGES.map(stage => (
                            <div key={stage.key} className={`rounded-2xl p-4 space-y-3 ${stage.bg}`}>
                                <div className="flex items-center justify-between mb-4">
                                    <span className={`text-xs font-black uppercase tracking-widest ${stage.color}`}>{stage.label}</span>
                                    <span className={`text-xs font-black px-2 py-0.5 rounded-full ${stage.bg} ${stage.color}`}>
                                        {filtered.filter(c => c.stage === stage.key).length}
                                    </span>
                                </div>
                                {filtered.filter(c => c.stage === stage.key).map(candidate => (
                                    <div key={candidate.id}
                                        onClick={() => setSelectedCandidateId(candidate.id)}
                                        className="bg-white dark:bg-slate-900 rounded-xl p-3 shadow-sm border cursor-pointer hover:shadow-md transition-all"
                                        style={{ borderColor: theme.colors.border }}>
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-black"
                                                style={{ backgroundColor: `${theme.colors.primary}15`, color: theme.colors.primary }}>
                                                {candidate.first_name[0]}
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold" style={{ color: theme.colors.text }}>{candidate.first_name} {candidate.last_name}</p>
                                                <p className="text-[10px] opacity-50">{candidate.job?.title ?? '—'}</p>
                                            </div>
                                        </div>
                                        {candidate.rating != null && (
                                            <div className="flex items-center gap-1 mt-2">
                                                <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
                                                <span className="text-[10px] font-black text-amber-500">{candidate.rating}/5</span>
                                            </div>
                                        )}
                                        <p className="text-[10px] opacity-40 mt-2">{candidate.source}</p>
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                </>
            )}

            {!isLoading && view === 'jobs' && (
                <Card className="border-none shadow-xl overflow-hidden" style={{ backgroundColor: theme.colors.surface }}>
                    <div className="px-8 py-6 border-b" style={{ borderColor: theme.colors.border }}>
                        <h3 className="font-bold" style={{ color: theme.colors.text }}>Job Openings ({jobs.length})</h3>
                    </div>
                    {jobs.length === 0 ? (
                        <div className="text-center py-16 opacity-50">
                            <Briefcase className="h-10 w-10 mx-auto mb-3" style={{ color: theme.colors.textSecondary }} />
                            <p style={{ color: theme.colors.text }}>No job openings yet. Post your first job!</p>
                        </div>
                    ) : (
                        <div className="divide-y" style={{ borderColor: theme.colors.border }}>
                            {jobs.map(job => (
                                <div key={job.id} className="flex items-center justify-between px-8 py-5 hover:bg-black/5 dark:hover:bg-white/5 transition-colors group">
                                    <div className="flex items-center gap-4">
                                        <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${theme.colors.primary}10`, color: theme.colors.primary }}>
                                            <Briefcase className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <p className="font-bold" style={{ color: theme.colors.text }}>{job.title}</p>
                                            <p className="text-xs opacity-60">{job.department ?? '—'} · {job.employment_type.replace('_', ' ')}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-6">
                                        <div className="text-center">
                                            <p className="text-lg font-black" style={{ color: theme.colors.text }}>{job.vacancies}</p>
                                            <p className="text-[10px] font-bold opacity-40">VACANCIES</p>
                                        </div>
                                        <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest ${job.status === 'OPEN' ? 'bg-green-100 text-green-600 dark:bg-green-900/30' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'}`}>
                                            {job.status}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </Card>
            )}

            {/* Candidate Detail Panel */}
            {selectedCandidate && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-end">
                    <div className="h-full w-full max-w-md shadow-2xl overflow-y-auto animate-in slide-in-from-right duration-300"
                        style={{ backgroundColor: theme.colors.surface }}>
                        <div className="p-6 border-b flex items-center justify-between" style={{ borderColor: theme.colors.border }}>
                            <h3 className="font-bold" style={{ color: theme.colors.text }}>Candidate Profile</h3>
                            <button onClick={() => setSelectedCandidateId(null)} className="p-2 rounded-lg hover:bg-black/5">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-6">
                            <div className="flex items-center gap-4">
                                <div className="h-16 w-16 rounded-2xl flex items-center justify-center text-2xl font-black"
                                    style={{ backgroundColor: `${theme.colors.primary}15`, color: theme.colors.primary }}>
                                    {selectedCandidate.first_name[0]}
                                </div>
                                <div>
                                    <h2 className="text-xl font-black" style={{ color: theme.colors.text }}>{selectedCandidate.first_name} {selectedCandidate.last_name}</h2>
                                    <p className="font-bold opacity-60" style={{ color: theme.colors.textSecondary }}>{selectedCandidate.job?.title ?? '—'}</p>
                                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest ${STAGES.find(s => s.key === selectedCandidate.stage)?.bg} ${STAGES.find(s => s.key === selectedCandidate.stage)?.color}`}>
                                        {selectedCandidate.stage}
                                    </span>
                                </div>
                            </div>
                            <div className="space-y-3">
                                {[
                                    { icon: Mail, label: selectedCandidate.email },
                                    { icon: Phone, label: selectedCandidate.phone ?? '—' },
                                    { icon: CalendarDays, label: `Applied: ${new Date(selectedCandidate.createdAt).toLocaleDateString()}` },
                                    { icon: User, label: `Source: ${selectedCandidate.source}` },
                                ].map(({ icon: Icon, label }) => (
                                    <div key={label} className="flex items-center gap-3">
                                        <Icon className="h-4 w-4 opacity-40" />
                                        <span className="text-sm font-bold" style={{ color: theme.colors.text }}>{label}</span>
                                    </div>
                                ))}
                            </div>
                            {selectedCandidate.rating != null && (
                                <div className="p-4 rounded-2xl" style={{ backgroundColor: `${theme.colors.primary}08` }}>
                                    <p className="text-xs font-black uppercase tracking-widest opacity-50 mb-2">Rating</p>
                                    <div className="flex items-center gap-3">
                                        <div className="flex-1 h-3 rounded-full overflow-hidden bg-black/10 dark:bg-white/10">
                                            <div className="h-full rounded-full transition-all duration-1000"
                                                style={{ width: `${(selectedCandidate.rating / 5) * 100}%`, backgroundColor: theme.colors.primary }} />
                                        </div>
                                        <span className="text-2xl font-black" style={{ color: theme.colors.primary }}>{selectedCandidate.rating}/5</span>
                                    </div>
                                </div>
                            )}
                            <div className="space-y-2 pt-4 border-t" style={{ borderColor: theme.colors.border }}>
                                <p className="text-xs font-black uppercase tracking-widest opacity-40">Move to Stage</p>
                                <div className="flex flex-wrap gap-2">
                                    {STAGES.filter(s => s.key !== selectedCandidate.stage).map(stage => (
                                        <button key={stage.key}
                                            onClick={() => updateCandidateMutation.mutate({ id: selectedCandidate.id, data: { stage: stage.key } })}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-black ${stage.bg} ${stage.color} transition-all hover:scale-105`}>
                                            {stage.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3 pt-2">
                                <Button variant="outline" className="rounded-xl font-bold gap-2">
                                    <FileText className="h-4 w-4" /> View CV
                                </Button>
                                <Button
                                    onClick={() => updateCandidateMutation.mutate({ id: selectedCandidate.id, data: { stage: 'HIRED' } })}
                                    className="rounded-xl font-bold gap-2 bg-green-500 hover:bg-green-600">
                                    <CheckCircle2 className="h-4 w-4" /> Hire
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Job Modal */}
            {isAddJobOpen && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="rounded-3xl shadow-2xl w-full max-w-md p-8 space-y-6 animate-in zoom-in duration-300" style={{ backgroundColor: theme.colors.surface }}>
                        <div className="flex items-center justify-between">
                            <h3 className="text-xl font-black" style={{ color: theme.colors.text }}>Post New Job</h3>
                            <button onClick={() => setIsAddJobOpen(false)} className="p-2 rounded-lg hover:bg-black/5"><X className="h-5 w-5" /></button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-black uppercase tracking-widest opacity-50 block mb-2" style={{ color: theme.colors.text }}>Job Title *</label>
                                <Input value={newJob.title} onChange={e => setNewJob(p => ({ ...p, title: e.target.value }))} placeholder="e.g. Senior Developer" className="rounded-xl" />
                            </div>
                            <div>
                                <label className="text-xs font-black uppercase tracking-widest opacity-50 block mb-2" style={{ color: theme.colors.text }}>Department</label>
                                <Input value={newJob.department} onChange={e => setNewJob(p => ({ ...p, department: e.target.value }))} placeholder="e.g. Engineering" className="rounded-xl" />
                            </div>
                            <div>
                                <label className="text-xs font-black uppercase tracking-widest opacity-50 block mb-2" style={{ color: theme.colors.text }}>Employment Type</label>
                                <select value={newJob.employment_type} onChange={e => setNewJob(p => ({ ...p, employment_type: e.target.value }))}
                                    className="w-full px-3 py-2 rounded-xl border text-sm focus:outline-none"
                                    style={{ borderColor: theme.colors.border, backgroundColor: theme.colors.surface, color: theme.colors.text }}>
                                    {['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN'].map(t => (
                                        <option key={t} value={t}>{t.replace('_', ' ')}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="flex gap-3 pt-4 border-t" style={{ borderColor: theme.colors.border }}>
                            <Button variant="outline" onClick={() => setIsAddJobOpen(false)} className="flex-1 rounded-xl">Cancel</Button>
                            <Button
                                onClick={() => createJobMutation.mutate({ title: newJob.title, department: newJob.department, employment_type: newJob.employment_type as any, vacancies: newJob.vacancies, status: 'OPEN' })}
                                isLoading={createJobMutation.isPending}
                                disabled={!newJob.title.trim()}
                                className="flex-1 rounded-xl font-black shadow-xl shadow-primary/20">
                                Post Job
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
