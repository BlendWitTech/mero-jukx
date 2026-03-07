import React, { useState } from 'react';
import {
    User, Calendar, ClipboardCheck, Banknote, FileText,
    CheckCircle2, Clock, X, Plus, Loader2, ChevronRight,
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { Card, Button, Input } from '@shared';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { hrService } from '../services/hrService';
import { HrLeaveRequest, HrLeaveType } from '../types';
import toast from 'react-hot-toast';
import { format, subDays, startOfMonth } from 'date-fns';

const leaveTypeColors: Record<string, string> = {
    SICK: 'text-red-500', CASUAL: 'text-blue-500', ANNUAL: 'text-green-500',
    MATERNITY: 'text-pink-500', PATERNITY: 'text-indigo-500', UNPAID: 'text-amber-500', OTHER: 'text-gray-500',
};

const attendanceStatusConfig: Record<string, { color: string; label: string }> = {
    PRESENT: { color: 'text-green-500', label: 'Present' },
    ABSENT: { color: 'text-red-500', label: 'Absent' },
    LATE: { color: 'text-amber-500', label: 'Late' },
    ON_LEAVE: { color: 'text-blue-500', label: 'On Leave' },
    HOLIDAY: { color: 'text-purple-500', label: 'Holiday' },
};

type TabKey = 'overview' | 'leave' | 'attendance' | 'payslips';

export default function SelfServicePage() {
    const { theme } = useTheme();
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState<TabKey>('overview');
    const [isApplyLeaveOpen, setIsApplyLeaveOpen] = useState(false);
    const [leaveForm, setLeaveForm] = useState<Partial<HrLeaveRequest>>({
        leave_type: 'CASUAL' as HrLeaveType, start_date: '', end_date: '', reason: '',
    });

    const today = new Date();
    const monthStart = format(startOfMonth(today), 'yyyy-MM-dd');
    const todayStr = format(today, 'yyyy-MM-dd');
    const thirtyDaysAgo = format(subDays(today, 30), 'yyyy-MM-dd');

    const { data: profile, isLoading: profileLoading } = useQuery({
        queryKey: ['hr-self-profile'],
        queryFn: () => hrService.getSelfProfile(),
    });

    const { data: payslips = [], isLoading: payslipsLoading } = useQuery({
        queryKey: ['hr-self-payslips'],
        queryFn: () => hrService.getSelfPayslips(),
    });

    const { data: leaveBalances = [], isLoading: leaveLoading } = useQuery({
        queryKey: ['hr-self-leave-balances'],
        queryFn: () => hrService.getSelfLeaveBalance(),
    });

    const { data: leaveRequests = [], isLoading: leaveReqLoading } = useQuery({
        queryKey: ['hr-self-leave-requests'],
        queryFn: () => hrService.getLeaveRequests(),
    });

    const { data: attendance = [], isLoading: attendanceLoading } = useQuery({
        queryKey: ['hr-self-attendance'],
        queryFn: () => hrService.getSelfAttendance({ startDate: thirtyDaysAgo, endDate: todayStr }),
    });

    const applyLeaveMutation = useMutation({
        mutationFn: (data: any) => hrService.applyLeave(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['hr-self-leave-requests'] });
            queryClient.invalidateQueries({ queryKey: ['hr-self-leave-balances'] });
            toast.success('Leave request submitted');
            setIsApplyLeaveOpen(false);
            setLeaveForm({ leave_type: 'CASUAL' as HrLeaveType, start_date: '', end_date: '', reason: '' });
        },
        onError: () => toast.error('Failed to submit leave request'),
    });

    const tabs: { key: TabKey; label: string; icon: any }[] = [
        { key: 'overview', label: 'Overview', icon: User },
        { key: 'leave', label: 'Leave', icon: ClipboardCheck },
        { key: 'attendance', label: 'Attendance', icon: Calendar },
        { key: 'payslips', label: 'Payslips', icon: Banknote },
    ];

    const presentDays = (attendance as any[]).filter(a => a.status === 'PRESENT').length;
    const lateDays = (attendance as any[]).filter(a => a.status === 'LATE').length;
    const absentDays = (attendance as any[]).filter(a => a.status === 'ABSENT').length;
    const pendingLeaves = (leaveRequests as HrLeaveRequest[]).filter(l => l.status === 'PENDING').length;

    return (
        <div className="p-8 space-y-8 max-w-[1400px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-5">
                    <div className="p-4 rounded-2xl shadow-lg border" style={{ backgroundColor: `${theme.colors.primary}15`, borderColor: `${theme.colors.primary}30` }}>
                        <User className="h-8 w-8" style={{ color: theme.colors.primary }} />
                    </div>
                    <div>
                        {profileLoading ? (
                            <div className="h-8 w-48 bg-black/10 rounded-lg animate-pulse" />
                        ) : (
                            <h1 className="text-4xl font-black tracking-tight" style={{ color: theme.colors.text }}>
                                {profile ? `${(profile as any).first_name} ${(profile as any).last_name}` : 'Employee Self-Service'}
                            </h1>
                        )}
                        <p className="font-medium opacity-60" style={{ color: theme.colors.textSecondary }}>
                            {(profile as any)?.designation ?? 'Employee Portal'} {(profile as any)?.department ? `· ${(profile as any).department}` : ''}
                        </p>
                    </div>
                </div>
                <div className="flex rounded-xl border p-1 gap-1" style={{ borderColor: theme.colors.border, backgroundColor: theme.colors.surface }}>
                    {tabs.map(tab => {
                        const Icon = tab.icon;
                        return (
                            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                                className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all"
                                style={{ backgroundColor: activeTab === tab.key ? theme.colors.primary : 'transparent', color: activeTab === tab.key ? '#fff' : theme.colors.text, opacity: activeTab === tab.key ? 1 : 0.5 }}>
                                <Icon className="h-3.5 w-3.5" />{tab.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Present (30d)', value: presentDays, color: '#22c55e', loading: attendanceLoading },
                    { label: 'Late (30d)', value: lateDays, color: '#f59e0b', loading: attendanceLoading },
                    { label: 'Absent (30d)', value: absentDays, color: '#ef4444', loading: attendanceLoading },
                    { label: 'Pending Leaves', value: pendingLeaves, color: '#3b82f6', loading: leaveReqLoading },
                ].map(stat => (
                    <Card key={stat.label} className="p-6 border-none shadow-lg" style={{ backgroundColor: theme.colors.surface }}>
                        <p className="text-[10px] font-black uppercase tracking-widest opacity-50 mb-2" style={{ color: theme.colors.text }}>{stat.label}</p>
                        <p className="text-3xl font-black" style={{ color: stat.color }}>
                            {stat.loading ? '—' : stat.value}
                        </p>
                    </Card>
                ))}
            </div>

            {/* ── OVERVIEW TAB ── */}
            {activeTab === 'overview' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Profile Card */}
                    <Card className="p-6 border-none shadow-xl" style={{ backgroundColor: theme.colors.surface }}>
                        <h3 className="font-black mb-4" style={{ color: theme.colors.text }}>My Profile</h3>
                        {profileLoading ? (
                            <div className="space-y-3">{Array(6).fill(0).map((_, i) => <div key={i} className="h-5 bg-black/5 rounded animate-pulse" />)}</div>
                        ) : !profile ? (
                            <p className="text-sm opacity-40" style={{ color: theme.colors.text }}>Profile not linked. Contact HR.</p>
                        ) : (
                            <div className="space-y-3">
                                {[
                                    { label: 'Employee ID', value: (profile as any).employee_id },
                                    { label: 'Email', value: (profile as any).email },
                                    { label: 'Phone', value: (profile as any).phone },
                                    { label: 'Joining Date', value: (profile as any).joining_date ? new Date((profile as any).joining_date).toLocaleDateString() : '—' },
                                    { label: 'Department', value: (profile as any).department },
                                    { label: 'Designation', value: (profile as any).designation },
                                ].map(item => (
                                    <div key={item.label} className="flex items-center justify-between py-2 border-b last:border-0" style={{ borderColor: theme.colors.border }}>
                                        <span className="text-xs font-black uppercase tracking-widest opacity-50" style={{ color: theme.colors.text }}>{item.label}</span>
                                        <span className="text-sm font-bold" style={{ color: theme.colors.text }}>{item.value ?? '—'}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Card>

                    {/* Leave Balances */}
                    <Card className="p-6 border-none shadow-xl" style={{ backgroundColor: theme.colors.surface }}>
                        <h3 className="font-black mb-4" style={{ color: theme.colors.text }}>Leave Balances</h3>
                        {leaveLoading ? (
                            <div className="space-y-3">{Array(4).fill(0).map((_, i) => <div key={i} className="h-8 bg-black/5 rounded animate-pulse" />)}</div>
                        ) : (leaveBalances as any[]).length === 0 ? (
                            <p className="text-sm opacity-40 text-center py-8" style={{ color: theme.colors.text }}>No leave balance data.</p>
                        ) : (
                            <div className="space-y-4">
                                {(leaveBalances as any[]).map((bal: any) => {
                                    const used = Number(bal.used_days) || 0;
                                    const entitled = Number(bal.entitled_days) || 0;
                                    const remaining = entitled - used + (Number(bal.carried_forward) || 0);
                                    return (
                                        <div key={bal.id}>
                                            <div className="flex items-center justify-between mb-1.5">
                                                <span className={`text-xs font-black uppercase ${leaveTypeColors[bal.leave_type] ?? 'text-gray-500'}`}>{bal.leave_type}</span>
                                                <span className="text-xs font-bold" style={{ color: theme.colors.text }}>{remaining} / {entitled} days remaining</span>
                                            </div>
                                            <div className="h-1.5 rounded-full overflow-hidden bg-black/10 dark:bg-white/10">
                                                <div className="h-full rounded-full" style={{ width: `${entitled > 0 ? (used / entitled) * 100 : 0}%`, backgroundColor: theme.colors.primary }} />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                        <Button
                            className="w-full mt-6 rounded-xl font-black shadow-xl shadow-primary/20"
                            onClick={() => { setActiveTab('leave'); setIsApplyLeaveOpen(true); }}>
                            <Plus className="h-4 w-4 mr-2" /> Apply for Leave
                        </Button>
                    </Card>
                </div>
            )}

            {/* ── LEAVE TAB ── */}
            {activeTab === 'leave' && (
                <>
                    <div className="flex items-center justify-between">
                        <h3 className="font-black text-lg" style={{ color: theme.colors.text }}>My Leave Requests</h3>
                        <Button onClick={() => setIsApplyLeaveOpen(true)} className="rounded-xl font-black shadow-xl shadow-primary/20">
                            <Plus className="h-4 w-4 mr-2" /> Apply for Leave
                        </Button>
                    </div>
                    {leaveReqLoading ? (
                        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" style={{ color: theme.colors.primary }} /></div>
                    ) : (leaveRequests as HrLeaveRequest[]).length === 0 ? (
                        <div className="text-center py-16 rounded-2xl border opacity-50" style={{ borderColor: theme.colors.border }}>
                            <ClipboardCheck className="h-10 w-10 mx-auto mb-3 opacity-40" style={{ color: theme.colors.textSecondary }} />
                            <p style={{ color: theme.colors.text }}>No leave requests found.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {(leaveRequests as HrLeaveRequest[]).map(req => (
                                <Card key={req.id} className="p-5 border-none shadow-lg" style={{ backgroundColor: theme.colors.surface }}>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className={`text-xs font-black uppercase px-3 py-1 rounded-full ${leaveTypeColors[req.leave_type] ?? 'text-gray-500'} bg-black/5 dark:bg-white/5`}>
                                                {req.leave_type}
                                            </div>
                                            <div>
                                                <p className="font-bold text-sm" style={{ color: theme.colors.text }}>
                                                    {new Date(req.start_date as string).toLocaleDateString()} → {new Date(req.end_date as string).toLocaleDateString()}
                                                </p>
                                                <p className="text-xs opacity-60 mt-0.5" style={{ color: theme.colors.textSecondary }}>{req.reason ?? '—'}</p>
                                            </div>
                                        </div>
                                        <span className={`text-xs font-black uppercase px-3 py-1.5 rounded-full ${req.status === 'APPROVED' ? 'bg-green-100 text-green-600 dark:bg-green-900/30' : req.status === 'REJECTED' ? 'bg-red-100 text-red-600 dark:bg-red-900/30' : 'bg-amber-100 text-amber-600 dark:bg-amber-900/30'}`}>
                                            {req.status}
                                        </span>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    )}
                </>
            )}

            {/* ── ATTENDANCE TAB ── */}
            {activeTab === 'attendance' && (
                <>
                    <h3 className="font-black text-lg" style={{ color: theme.colors.text }}>Attendance — Last 30 Days</h3>
                    {attendanceLoading ? (
                        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" style={{ color: theme.colors.primary }} /></div>
                    ) : (attendance as any[]).length === 0 ? (
                        <div className="text-center py-16 rounded-2xl border opacity-50" style={{ borderColor: theme.colors.border }}>
                            <Calendar className="h-10 w-10 mx-auto mb-3 opacity-40" />
                            <p style={{ color: theme.colors.text }}>No attendance records found.</p>
                        </div>
                    ) : (
                        <Card className="border-none shadow-xl overflow-hidden" style={{ backgroundColor: theme.colors.surface }}>
                            <table className="w-full">
                                <thead>
                                    <tr style={{ backgroundColor: `${theme.colors.primary}05`, borderBottom: `1px solid ${theme.colors.border}` }}>
                                        {['Date', 'Check In', 'Check Out', 'Status', 'Remarks'].map(h => (
                                            <th key={h} className="p-4 font-black uppercase text-[10px] tracking-widest opacity-60 text-left" style={{ color: theme.colors.text }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y" style={{ borderColor: theme.colors.border }}>
                                    {(attendance as any[]).map(rec => {
                                        const cfg = attendanceStatusConfig[rec.status] ?? { color: 'text-gray-500', label: rec.status };
                                        return (
                                            <tr key={rec.id} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                                                <td className="p-4 font-bold text-sm" style={{ color: theme.colors.text }}>{new Date(rec.date).toLocaleDateString()}</td>
                                                <td className="p-4 text-sm font-mono" style={{ color: theme.colors.textSecondary }}>{rec.check_in ? new Date(rec.check_in).toLocaleTimeString() : '—'}</td>
                                                <td className="p-4 text-sm font-mono" style={{ color: theme.colors.textSecondary }}>{rec.check_out ? new Date(rec.check_out).toLocaleTimeString() : '—'}</td>
                                                <td className="p-4"><span className={`text-[10px] font-black uppercase px-2 py-1 rounded-full bg-black/5 dark:bg-white/5 ${cfg.color}`}>{cfg.label}</span></td>
                                                <td className="p-4 text-xs opacity-60" style={{ color: theme.colors.textSecondary }}>{rec.remarks ?? '—'}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </Card>
                    )}
                </>
            )}

            {/* ── PAYSLIPS TAB ── */}
            {activeTab === 'payslips' && (
                <>
                    <h3 className="font-black text-lg" style={{ color: theme.colors.text }}>My Payslips</h3>
                    {payslipsLoading ? (
                        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" style={{ color: theme.colors.primary }} /></div>
                    ) : (payslips as any[]).length === 0 ? (
                        <div className="text-center py-16 rounded-2xl border opacity-50" style={{ borderColor: theme.colors.border }}>
                            <Banknote className="h-10 w-10 mx-auto mb-3 opacity-40" />
                            <p style={{ color: theme.colors.text }}>No payslips available.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {(payslips as any[]).map(pay => (
                                <Card key={pay.id} className="p-5 border-none shadow-lg" style={{ backgroundColor: theme.colors.surface }}>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="font-black" style={{ color: theme.colors.text }}>{pay.month}</p>
                                            <p className="text-xs opacity-60 mt-0.5">
                                                Basic: NPR {Number(pay.basic_salary).toLocaleString()} &nbsp;|&nbsp;
                                                Deductions: NPR {(Number(pay.ssf_contribution_employee) + Number(pay.income_tax)).toLocaleString()}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="text-right">
                                                <p className="text-xl font-black" style={{ color: theme.colors.primary }}>NPR {Number(pay.net_salary).toLocaleString()}</p>
                                                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${pay.status === 'PAID' ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'}`}>{pay.status}</span>
                                            </div>
                                            <button className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5">
                                                <FileText className="h-4 w-4 opacity-40" />
                                            </button>
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    )}
                </>
            )}

            {/* Apply Leave Modal */}
            {isApplyLeaveOpen && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="rounded-3xl shadow-2xl w-full max-w-md p-8 space-y-6 animate-in zoom-in duration-300" style={{ backgroundColor: theme.colors.surface }}>
                        <div className="flex items-center justify-between">
                            <h3 className="text-xl font-black" style={{ color: theme.colors.text }}>Apply for Leave</h3>
                            <button onClick={() => setIsApplyLeaveOpen(false)} className="p-2 rounded-lg hover:bg-black/5"><X className="h-5 w-5" /></button>
                        </div>
                        <div className="space-y-4">
                            <select
                                className="w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                                style={{ borderColor: theme.colors.border, backgroundColor: theme.colors.background, color: theme.colors.text }}
                                value={leaveForm.leave_type ?? 'CASUAL'}
                                onChange={e => setLeaveForm(p => ({ ...p, leave_type: e.target.value as HrLeaveType }))}>
                                {['SICK', 'CASUAL', 'ANNUAL', 'MATERNITY', 'PATERNITY', 'UNPAID', 'OTHER'].map(t => (
                                    <option key={t} value={t}>{t}</option>
                                ))}
                            </select>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest opacity-50 mb-1.5" style={{ color: theme.colors.text }}>From</p>
                                    <Input type="date" className="rounded-xl" value={leaveForm.start_date ?? ''} onChange={e => setLeaveForm(p => ({ ...p, start_date: e.target.value }))} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest opacity-50 mb-1.5" style={{ color: theme.colors.text }}>To</p>
                                    <Input type="date" className="rounded-xl" value={leaveForm.end_date ?? ''} onChange={e => setLeaveForm(p => ({ ...p, end_date: e.target.value }))} />
                                </div>
                            </div>
                            <textarea rows={3} placeholder="Reason (optional)"
                                className="w-full px-4 py-3 rounded-xl border text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
                                style={{ backgroundColor: theme.colors.background, borderColor: theme.colors.border, color: theme.colors.text }}
                                value={leaveForm.reason ?? ''}
                                onChange={e => setLeaveForm(p => ({ ...p, reason: e.target.value }))} />
                        </div>
                        <div className="flex gap-3 pt-4 border-t" style={{ borderColor: theme.colors.border }}>
                            <Button variant="outline" onClick={() => setIsApplyLeaveOpen(false)} className="flex-1 rounded-xl">Cancel</Button>
                            <Button
                                className="flex-1 rounded-xl font-black shadow-xl shadow-primary/20"
                                disabled={applyLeaveMutation.isPending || !leaveForm.start_date || !leaveForm.end_date}
                                onClick={() => applyLeaveMutation.mutate(leaveForm)}>
                                {applyLeaveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : 'Submit Request'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
