import React, { useEffect, useState } from 'react';
import {
    Calendar,
    Clock,
    CheckCircle2,
    XCircle,
    AlertCircle,
    Plus,
    Filter,
    ArrowRight,
    MessageSquare,
    CalendarCheck2
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import {
    Card,
    Button,
    Input,
    Badge,
    Dialog,
    DialogContent,
    DialogTitle,
    Select
} from '@shared';
import { HrLeaveRequest, HrLeaveStatus, HrLeaveType, HrEmployee } from '../types';
import { hrService } from '../services/hrService';
import toast from '@shared/hooks/useToast';
import { format, differenceInDays } from 'date-fns';

export default function LeavePage() {
    const { theme } = useTheme();
    const [requests, setRequests] = useState<HrLeaveRequest[]>([]);
    const [employees, setEmployees] = useState<HrEmployee[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        employeeId: '',
        leave_type: HrLeaveType.CASUAL,
        start_date: '',
        end_date: '',
        reason: ''
    });

    const fetchRequests = async () => {
        try {
            setLoading(true);
            const data = await hrService.getLeaveRequests();
            setRequests(data);
        } catch (error: any) {
            toast.error('Failed to load leave requests');
        } finally {
            setLoading(false);
        }
    };

    const fetchEmployees = async () => {
        try {
            const data = await hrService.getEmployees();
            setEmployees(data);
        } catch (error) { }
    };

    useEffect(() => {
        fetchRequests();
        fetchEmployees();
    }, []);

    const handleApply = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setIsSubmitting(true);
            const days = differenceInDays(new Date(formData.end_date), new Date(formData.start_date)) + 1;
            await hrService.applyLeave({
                ...formData,
                total_days: days
            });
            toast.success('Leave application submitted');
            setIsDialogOpen(false);
            fetchRequests();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Submission failed');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleUpdateStatus = async (id: string, status: HrLeaveStatus) => {
        const remarks = window.prompt('Add admin remarks (optional):');
        if (remarks === null) return;
        try {
            await hrService.updateLeaveStatus(id, status, remarks);
            toast.success(`Request ${status.toLowerCase()}`);
            fetchRequests();
        } catch (error: any) {
            toast.error('Failed to update status');
        }
    };

    const getStatusVariant = (status: HrLeaveStatus) => {
        switch (status) {
            case HrLeaveStatus.APPROVED: return 'success';
            case HrLeaveStatus.REJECTED: return 'danger';
            case HrLeaveStatus.PENDING: return 'warning';
            default: return 'secondary';
        }
    };

    const getTypeColor = (type: HrLeaveType) => {
        switch (type) {
            case HrLeaveType.SICK: return '#ef4444';
            case HrLeaveType.CASUAL: return '#3b82f6';
            case HrLeaveType.ANNUAL: return '#10b981';
            default: return theme.colors.primary;
        }
    };

    return (
        <div className="p-8 space-y-8 max-w-[1600px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-5">
                    <div className="p-4 rounded-2xl shadow-lg border"
                        style={{ backgroundColor: `${theme.colors.primary}15`, borderColor: `${theme.colors.primary}30` }}>
                        <CalendarCheck2 className="h-8 w-8" style={{ color: theme.colors.primary }} />
                    </div>
                    <div>
                        <h1 className="text-4xl font-black tracking-tight" style={{ color: theme.colors.text }}>
                            Leave Management
                        </h1>
                        <p className="font-medium opacity-60" style={{ color: theme.colors.textSecondary }}>
                            Handle time-off requests and approvals
                        </p>
                    </div>
                </div>
                <Button
                    onClick={() => setIsDialogOpen(true)}
                    className="rounded-xl font-black px-6 shadow-xl shadow-primary/20 scale-105 transition-all"
                >
                    <Plus className="h-5 w-5 mr-2" /> Request Leave
                </Button>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                    { label: 'Pending Approvals', value: requests.filter(r => r.status === HrLeaveStatus.PENDING).length, color: '#f59e0b' },
                    { label: 'Approved This Month', value: requests.filter(r => r.status === HrLeaveStatus.APPROVED).length, color: '#10b981' },
                    { label: 'Active Leaves Today', value: 0, color: '#3b82f6' },
                    { label: 'Rejected Requests', value: requests.filter(r => r.status === HrLeaveStatus.REJECTED).length, color: '#ef4444' },
                ].map((stat, i) => (
                    <Card key={i} className="p-6 border-none shadow-sm" style={{ backgroundColor: theme.colors.surface }}>
                        <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-1" style={{ color: theme.colors.text }}>{stat.label}</p>
                        <p className="text-3xl font-black" style={{ color: stat.color }}>{stat.value}</p>
                    </Card>
                ))}
            </div>

            {/* Requests Table */}
            <Card className="overflow-hidden border-none shadow-xl" style={{ backgroundColor: theme.colors.surface }}>
                <div className="px-6 py-5 border-b flex items-center justify-between" style={{ borderColor: theme.colors.border }}>
                    <h3 className="font-bold flex items-center gap-2" style={{ color: theme.colors.text }}>
                        <Clock className="h-5 w-5 opacity-40" />
                        Recent Requests
                    </h3>
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" className="h-8 rounded-lg text-xs font-bold"><Filter className="h-3 w-3 mr-2" /> Filter</Button>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr style={{ backgroundColor: `${theme.colors.primary}05`, borderBottom: `1px solid ${theme.colors.border}` }}>
                                <th className="p-5 font-black uppercase text-[10px] tracking-widest opacity-60 text-primary">Employee</th>
                                <th className="p-5 font-black uppercase text-[10px] tracking-widest opacity-60 text-primary">Type</th>
                                <th className="p-5 font-black uppercase text-[10px] tracking-widest opacity-60 text-primary">Duration</th>
                                <th className="p-5 font-black uppercase text-[10px] tracking-widest opacity-60 text-primary">Reason</th>
                                <th className="p-5 font-black uppercase text-[10px] tracking-widest opacity-60 text-center text-primary">Status</th>
                                <th className="p-5 font-black uppercase text-[10px] tracking-widest opacity-60 text-right text-primary">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y" style={{ borderColor: theme.colors.border }}>
                            {loading ? (
                                Array(5).fill(0).map((_, i) => (
                                    <tr key={i} className="animate-pulse"><td colSpan={6} className="p-8"> <div className="h-6 bg-black/5 dark:bg-white/5 rounded-lg w-full"></div></td></tr>
                                ))
                            ) : requests.length === 0 ? (
                                <tr><td colSpan={6} className="p-20 text-center"><AlertCircle className="h-12 w-12 mx-auto opacity-10 mb-4" /><p className="font-bold opacity-30">No leave requests found</p></td></tr>
                            ) : (
                                requests.map((req) => (
                                    <tr key={req.id} className="group hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                                        <td className="p-5">
                                            <div className="flex items-center gap-3">
                                                <div className="h-8 w-8 rounded-full flex items-center justify-center font-bold text-[10px]"
                                                    style={{ backgroundColor: `${theme.colors.primary}15`, color: theme.colors.primary }}>
                                                    {req.employee?.first_name[0]}{req.employee?.last_name?.[0]}
                                                </div>
                                                <span className="font-bold text-sm" style={{ color: theme.colors.text }}>{req.employee?.first_name} {req.employee?.last_name}</span>
                                            </div>
                                        </td>
                                        <td className="p-5">
                                            <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: getTypeColor(req.leave_type) }} />
                                                <span className="font-bold text-xs" style={{ color: theme.colors.textSecondary }}>{req.leave_type}</span>
                                            </div>
                                        </td>
                                        <td className="p-5">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2 text-xs font-bold" style={{ color: theme.colors.text }}>
                                                    {format(new Date(req.start_date), 'MMM dd')} <ArrowRight className="h-3 w-3 opacity-30" /> {format(new Date(req.end_date), 'MMM dd')}
                                                </div>
                                                <p className="text-[10px] font-black uppercase opacity-40 text-primary">{req.total_days} Days</p>
                                            </div>
                                        </td>
                                        <td className="p-5 max-w-xs">
                                            <p className="text-xs truncate opacity-70" title={req.reason} style={{ color: theme.colors.textSecondary }}>{req.reason}</p>
                                        </td>
                                        <td className="p-5 text-center">
                                            <Badge variant={getStatusVariant(req.status)} className="font-black tracking-widest uppercase text-[10px]">
                                                {req.status}
                                            </Badge>
                                        </td>
                                        <td className="p-5">
                                            <div className="flex items-center justify-end gap-1">
                                                {req.status === HrLeaveStatus.PENDING && (
                                                    <>
                                                        <button
                                                            onClick={() => handleUpdateStatus(req.id, HrLeaveStatus.APPROVED)}
                                                            className="p-2 rounded-xl bg-green-500/10 text-green-600 hover:bg-green-500 hover:text-white transition-all"
                                                        >
                                                            <CheckCircle2 className="h-4 w-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleUpdateStatus(req.id, HrLeaveStatus.REJECTED)}
                                                            className="p-2 rounded-xl bg-red-500/10 text-red-600 hover:bg-red-500 hover:text-white transition-all"
                                                        >
                                                            <XCircle className="h-4 w-4" />
                                                        </button>
                                                    </>
                                                )}
                                                <button className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 opacity-40 hover:opacity-100 transition-all">
                                                    <MessageSquare className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Application Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-md p-0 border-none bg-transparent">
                    <div className="rounded-3xl shadow-2xl overflow-hidden" style={{ backgroundColor: theme.colors.surface }}>
                        <div className="p-6 border-b" style={{ borderColor: theme.colors.border }}>
                            <DialogTitle className="text-xl font-black">Request Leave</DialogTitle>
                        </div>
                        <form onSubmit={handleApply} className="p-6 space-y-5">
                            <div className="space-y-2">
                                <label className="text-xs font-black uppercase tracking-widest opacity-40" style={{ color: theme.colors.text }}>Employee</label>
                                <Select
                                    value={formData.employeeId}
                                    onValueChange={(v) => setFormData({ ...formData, employeeId: v })}
                                    options={employees.map(e => ({ value: e.id, label: `${e.first_name} ${e.last_name}` }))}
                                    className="rounded-xl h-12"
                                    placeholder="Select Employee"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-black uppercase tracking-widest opacity-40" style={{ color: theme.colors.text }}>Type</label>
                                    <Select
                                        value={formData.leave_type}
                                        onValueChange={(v) => setFormData({ ...formData, leave_type: v as HrLeaveType })}
                                        options={Object.values(HrLeaveType).map(t => ({ value: t, label: t }))}
                                        className="rounded-xl h-12"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black uppercase tracking-widest opacity-40" style={{ color: theme.colors.text }}>Reason</label>
                                    <Input
                                        placeholder="Brief title..."
                                        className="rounded-xl h-12"
                                        required
                                        value={formData.reason}
                                        onChange={e => setFormData({ ...formData, reason: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-black uppercase tracking-widest opacity-40" style={{ color: theme.colors.text }}>Start Date</label>
                                    <Input
                                        type="date"
                                        className="rounded-xl h-12"
                                        required
                                        value={formData.start_date}
                                        onChange={e => setFormData({ ...formData, start_date: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black uppercase tracking-widest opacity-40" style={{ color: theme.colors.text }}>End Date</label>
                                    <Input
                                        type="date"
                                        className="rounded-xl h-12"
                                        required
                                        value={formData.end_date}
                                        onChange={e => setFormData({ ...formData, end_date: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="pt-4 flex justify-end gap-3">
                                <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                                <Button type="submit" disabled={isSubmitting} className="rounded-xl font-black px-8">
                                    {isSubmitting ? 'Submitting...' : 'Submit Request'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
