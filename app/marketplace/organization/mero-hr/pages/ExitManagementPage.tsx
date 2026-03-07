import React, { useState } from 'react';
import { LogOut, FileText, DollarSign, X, Plus, AlertTriangle, CheckCircle2, Loader2, Search } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { Card, Button, Input } from '@shared';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { hrService } from '../services/hrService';
import { HrExitRecord } from '../types';
import toast from 'react-hot-toast';

type ExitStatus = 'INITIATED' | 'IN_PROGRESS' | 'COMPLETED';
type ClearanceStatus = 'PENDING' | 'PARTIAL' | 'COMPLETED';

const statusConfig: Record<ExitStatus, { color: string; bg: string; label: string }> = {
    INITIATED: { color: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-900/30', label: 'Initiated' },
    IN_PROGRESS: { color: 'text-amber-500', bg: 'bg-amber-100 dark:bg-amber-900/30', label: 'In Progress' },
    COMPLETED: { color: 'text-green-500', bg: 'bg-green-100 dark:bg-green-900/30', label: 'Completed' },
};

const clearanceConfig: Record<ClearanceStatus, { color: string; label: string }> = {
    PENDING: { color: 'text-red-500', label: 'Pending' },
    PARTIAL: { color: 'text-amber-500', label: 'Partial' },
    COMPLETED: { color: 'text-green-500', label: 'Completed' },
};

const reasonLabels: Record<string, string> = {
    RESIGNATION: 'Resignation', TERMINATION: 'Termination', RETIREMENT: 'Retirement',
    MUTUAL_SEPARATION: 'Mutual Separation', CONTRACT_END: 'Contract End', DEATH: 'Death', OTHER: 'Other',
};

export default function ExitManagementPage() {
    const { theme } = useTheme();
    const queryClient = useQueryClient();
    const [selectedExit, setSelectedExit] = useState<HrExitRecord | null>(null);
    const [isInitiateOpen, setIsInitiateOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [newExit, setNewExit] = useState({
        employee_id: '', reason: 'RESIGNATION', last_working_day: '', notice_period_days: 30, notes: '',
    });

    const { data: exits = [], isLoading } = useQuery({
        queryKey: ['hr-exits'],
        queryFn: () => hrService.getExitRecords(),
    });

    const createMutation = useMutation({
        mutationFn: hrService.createExitRecord,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['hr-exits'] });
            toast.success('Exit record initiated');
            setIsInitiateOpen(false);
            setNewExit({ employee_id: '', reason: 'RESIGNATION', last_working_day: '', notice_period_days: 30, notes: '' });
        },
        onError: () => toast.error('Failed to initiate exit'),
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<HrExitRecord> }) => hrService.updateExitRecord(id, data),
        onSuccess: (_, vars) => {
            queryClient.invalidateQueries({ queryKey: ['hr-exits'] });
            if (selectedExit?.id === vars.id) {
                setSelectedExit(prev => prev ? { ...prev, ...vars.data } : null);
            }
            toast.success('Exit record updated');
        },
        onError: () => toast.error('Failed to update record'),
    });

    const filtered = (exits as HrExitRecord[]).filter(e => {
        const name = `${e.employee?.first_name ?? ''} ${e.employee?.last_name ?? ''}`.toLowerCase();
        return name.includes(search.toLowerCase()) || e.reason?.toLowerCase().includes(search.toLowerCase());
    });

    const initiated = (exits as HrExitRecord[]).filter(e => e.status === 'INITIATED').length;
    const inProgress = (exits as HrExitRecord[]).filter(e => e.status === 'IN_PROGRESS').length;
    const fnfPending = (exits as HrExitRecord[]).filter(e => e.clearance_status !== 'COMPLETED' && e.status !== 'COMPLETED').length;
    const completed = (exits as HrExitRecord[]).filter(e => e.status === 'COMPLETED').length;

    return (
        <div className="p-8 space-y-8 max-w-[1600px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-5">
                    <div className="p-4 rounded-2xl shadow-lg border border-red-500/30 bg-red-500/10">
                        <LogOut className="h-8 w-8 text-red-500" />
                    </div>
                    <div>
                        <h1 className="text-4xl font-black tracking-tight" style={{ color: theme.colors.text }}>Exit Management</h1>
                        <p className="font-medium opacity-60" style={{ color: theme.colors.textSecondary }}>Offboarding, clearance & FnF settlements</p>
                    </div>
                </div>
                <Button onClick={() => setIsInitiateOpen(true)} className="rounded-xl font-black px-6 shadow-xl bg-red-500 hover:bg-red-600 shadow-red-500/20">
                    <Plus className="h-4 w-4 mr-2" /> Initiate Exit
                </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Initiated', value: isLoading ? '—' : initiated, color: '#3b82f6' },
                    { label: 'In Progress', value: isLoading ? '—' : inProgress, color: '#f59e0b' },
                    { label: 'FnF Pending', value: isLoading ? '—' : fnfPending, color: '#f97316' },
                    { label: 'Completed', value: isLoading ? '—' : completed, color: '#22c55e' },
                ].map(stat => (
                    <Card key={stat.label} className="p-6 border-none shadow-lg" style={{ backgroundColor: theme.colors.surface }}>
                        <p className="text-[10px] font-black uppercase tracking-widest opacity-50 mb-2" style={{ color: theme.colors.text }}>{stat.label}</p>
                        <p className="text-3xl font-black" style={{ color: stat.color }}>{stat.value}</p>
                    </Card>
                ))}
            </div>

            {isLoading && <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin" style={{ color: theme.colors.primary }} /></div>}

            {!isLoading && (
                <>
                    <div className="relative max-w-sm">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 opacity-40" />
                        <Input placeholder="Search by employee or reason..." value={search} onChange={e => setSearch(e.target.value)} className="pl-11 rounded-xl" />
                    </div>

                    {filtered.length === 0 ? (
                        <div className="text-center py-16 rounded-2xl border opacity-50" style={{ borderColor: theme.colors.border }}>
                            <LogOut className="h-10 w-10 mx-auto mb-3" style={{ color: theme.colors.textSecondary }} />
                            <p style={{ color: theme.colors.text }}>No exit records found.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {filtered.map((record: HrExitRecord) => {
                                const cfg = statusConfig[record.status as ExitStatus] ?? statusConfig.INITIATED;
                                const empName = `${record.employee?.first_name ?? '—'} ${record.employee?.last_name ?? ''}`.trim();
                                return (
                                    <Card key={record.id} onClick={() => setSelectedExit(record)}
                                        className="p-6 border-none shadow-lg cursor-pointer group hover:shadow-2xl transition-shadow" style={{ backgroundColor: theme.colors.surface }}>
                                        <div className="flex flex-col md:flex-row md:items-center gap-4">
                                            <div className="flex items-center gap-4 flex-1">
                                                <div className="h-12 w-12 rounded-2xl flex items-center justify-center text-xl font-black bg-red-500/10 text-red-500">
                                                    {(record.employee?.first_name?.[0] ?? '?')}
                                                </div>
                                                <div>
                                                    <p className="font-black text-lg" style={{ color: theme.colors.text }}>{empName}</p>
                                                    <p className="text-xs opacity-60">{reasonLabels[record.reason] ?? record.reason}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-6 flex-wrap">
                                                <div className="text-center">
                                                    <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Last Working Day</p>
                                                    <p className="text-sm font-bold mt-0.5" style={{ color: theme.colors.text }}>
                                                        {record.last_working_day ? new Date(record.last_working_day as string).toLocaleDateString() : '—'}
                                                    </p>
                                                </div>
                                                <div className="text-center">
                                                    <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Notice Days</p>
                                                    <p className="text-lg font-black mt-0.5 text-amber-500">{record.notice_period_days ?? '—'}</p>
                                                </div>
                                                <div className="text-center">
                                                    <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Clearance</p>
                                                    <p className={`text-sm font-black mt-0.5 ${clearanceConfig[record.clearance_status as ClearanceStatus]?.color ?? 'text-gray-400'}`}>
                                                        {clearanceConfig[record.clearance_status as ClearanceStatus]?.label ?? record.clearance_status}
                                                    </p>
                                                </div>
                                                <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full ${cfg.bg} ${cfg.color}`}>
                                                    {cfg.label}
                                                </span>
                                            </div>
                                        </div>
                                    </Card>
                                );
                            })}
                        </div>
                    )}
                </>
            )}

            {/* Detail Panel */}
            {selectedExit && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-end">
                    <div className="h-full w-full max-w-md shadow-2xl overflow-y-auto animate-in slide-in-from-right duration-300" style={{ backgroundColor: theme.colors.surface }}>
                        <div className="p-6 border-b flex items-center justify-between" style={{ borderColor: theme.colors.border }}>
                            <h3 className="font-black" style={{ color: theme.colors.text }}>Exit Details</h3>
                            <button onClick={() => setSelectedExit(null)} className="p-2 rounded-lg hover:bg-black/5"><X className="h-5 w-5" /></button>
                        </div>
                        <div className="p-6 space-y-6">
                            <div>
                                <h2 className="text-xl font-black" style={{ color: theme.colors.text }}>
                                    {selectedExit.employee?.first_name} {selectedExit.employee?.last_name}
                                </h2>
                                <p className="opacity-60 text-sm">{reasonLabels[selectedExit.reason] ?? selectedExit.reason} · {selectedExit.separation_type}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                {[
                                    { label: 'Last Working Day', value: selectedExit.last_working_day ? new Date(selectedExit.last_working_day as string).toLocaleDateString() : '—' },
                                    { label: 'Notice Period', value: `${selectedExit.notice_period_days ?? '—'} days` },
                                    { label: 'Clearance Status', value: clearanceConfig[selectedExit.clearance_status as ClearanceStatus]?.label ?? selectedExit.clearance_status },
                                    { label: 'Exit Status', value: statusConfig[selectedExit.status as ExitStatus]?.label ?? selectedExit.status },
                                ].map(item => (
                                    <div key={item.label} className="p-4 rounded-xl" style={{ backgroundColor: `${theme.colors.primary}08` }}>
                                        <p className="text-[10px] font-black uppercase tracking-widest opacity-50 mb-1" style={{ color: theme.colors.text }}>{item.label}</p>
                                        <p className="font-black" style={{ color: theme.colors.text }}>{item.value}</p>
                                    </div>
                                ))}
                            </div>

                            {selectedExit.handover_notes && (
                                <div>
                                    <h4 className="font-black mb-2" style={{ color: theme.colors.text }}>Handover Notes</h4>
                                    <p className="text-sm opacity-70 p-3 rounded-xl" style={{ backgroundColor: `${theme.colors.primary}08`, color: theme.colors.text }}>{selectedExit.handover_notes}</p>
                                </div>
                            )}

                            {/* Clearance progress */}
                            <div>
                                <h4 className="font-black mb-3" style={{ color: theme.colors.text }}>Exit Clearance</h4>
                                <div className="space-y-2">
                                    {['Asset Return (Laptop, ID Card)', 'Access Revocation (Email, Systems)', 'Knowledge Transfer Document', 'Exit Interview'].map((item, i) => {
                                        const done = selectedExit.clearance_status === 'COMPLETED' || (selectedExit.clearance_status === 'PARTIAL' && i < 2);
                                        return (
                                            <div key={i} className="flex items-center gap-3 p-3 rounded-xl border" style={{ borderColor: theme.colors.border }}>
                                                {done
                                                    ? <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                                                    : <div className="h-5 w-5 rounded-full border-2 border-slate-300 shrink-0" />
                                                }
                                                <span className={`text-sm font-bold ${done ? 'line-through opacity-50' : ''}`} style={{ color: theme.colors.text }}>{item}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {selectedExit.final_settlement_amount != null && (
                                <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500 mb-1">Full & Final Settlement</p>
                                    <p className="text-3xl font-black text-emerald-500">NPR {Number(selectedExit.final_settlement_amount).toLocaleString()}</p>
                                </div>
                            )}

                            <div className="space-y-2">
                                {selectedExit.clearance_status !== 'COMPLETED' && (
                                    <Button
                                        variant="outline"
                                        className="w-full rounded-xl gap-2"
                                        disabled={updateMutation.isPending}
                                        onClick={() => updateMutation.mutate({ id: selectedExit.id, data: { clearance_status: 'COMPLETED' } })}>
                                        <CheckCircle2 className="h-4 w-4" /> Mark Clearance Complete
                                    </Button>
                                )}
                                <div className="flex gap-3">
                                    <Button variant="outline" className="flex-1 rounded-xl gap-2"><FileText className="h-4 w-4" /> Experience Letter</Button>
                                    {selectedExit.status !== 'COMPLETED' && (
                                        <Button
                                            className="flex-1 rounded-xl gap-2 bg-emerald-500 hover:bg-emerald-600"
                                            disabled={updateMutation.isPending}
                                            onClick={() => updateMutation.mutate({ id: selectedExit.id, data: { status: 'COMPLETED' } })}>
                                            <DollarSign className="h-4 w-4" /> Process FnF
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Initiate Exit Modal */}
            {isInitiateOpen && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="rounded-3xl shadow-2xl w-full max-w-md p-8 space-y-6 animate-in zoom-in duration-300" style={{ backgroundColor: theme.colors.surface }}>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <AlertTriangle className="h-6 w-6 text-red-500" />
                                <h3 className="text-xl font-black" style={{ color: theme.colors.text }}>Initiate Exit</h3>
                            </div>
                            <button onClick={() => setIsInitiateOpen(false)} className="p-2 rounded-lg hover:bg-black/5"><X className="h-5 w-5" /></button>
                        </div>
                        <div className="space-y-4">
                            <Input
                                placeholder="Employee ID"
                                className="rounded-xl"
                                value={newExit.employee_id}
                                onChange={e => setNewExit(p => ({ ...p, employee_id: e.target.value }))} />
                            <select
                                className="w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                                style={{ borderColor: theme.colors.border, backgroundColor: theme.colors.background, color: theme.colors.text }}
                                value={newExit.reason}
                                onChange={e => setNewExit(p => ({ ...p, reason: e.target.value }))}>
                                {Object.entries(reasonLabels).map(([val, label]) => (
                                    <option key={val} value={val}>{label}</option>
                                ))}
                            </select>
                            <Input
                                type="date"
                                className="rounded-xl"
                                value={newExit.last_working_day}
                                onChange={e => setNewExit(p => ({ ...p, last_working_day: e.target.value }))} />
                            <Input
                                type="number"
                                placeholder="Notice period (days)"
                                className="rounded-xl"
                                value={newExit.notice_period_days}
                                onChange={e => setNewExit(p => ({ ...p, notice_period_days: Number(e.target.value) }))} />
                            <textarea rows={3} placeholder="Handover notes (optional)"
                                className="w-full px-4 py-3 rounded-xl border text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
                                style={{ backgroundColor: theme.colors.background, borderColor: theme.colors.border, color: theme.colors.text }}
                                value={newExit.notes}
                                onChange={e => setNewExit(p => ({ ...p, notes: e.target.value }))} />
                        </div>
                        <div className="flex gap-3 pt-4 border-t" style={{ borderColor: theme.colors.border }}>
                            <Button variant="outline" onClick={() => setIsInitiateOpen(false)} className="flex-1 rounded-xl">Cancel</Button>
                            <Button
                                className="flex-1 rounded-xl font-black bg-red-500 hover:bg-red-600 shadow-xl shadow-red-500/20"
                                disabled={createMutation.isPending || !newExit.employee_id || !newExit.last_working_day}
                                onClick={() => createMutation.mutate({ ...newExit, handover_notes: newExit.notes })}>
                                {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : 'Initiate Exit'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
