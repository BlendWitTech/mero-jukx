import React, { useEffect, useState } from 'react';
import {
    Clock,
    MapPin,
    CheckCircle2,
    LogOut,
    LogIn,
    History,
    CalendarDays,
    Timer,
    AlertCircle,
    Loader2
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import {
    Card,
    Button,
    Input,
    Badge
} from '@shared';
import { HrAttendance, HrAttendanceStatus } from '../types';
import { hrService } from '../services/hrService';
import toast from '@shared/hooks/useToast';
import { format } from 'date-fns';

export default function AttendancePage() {
    const { theme } = useTheme();
    const [logs, setLogs] = useState<HrAttendance[]>([]);
    const [loading, setLoading] = useState(true);
    const [checking, setChecking] = useState(false);
    const [todayLog, setTodayLog] = useState<HrAttendance | null>(null);

    const fetchLogs = async () => {
        try {
            setLoading(true);
            const data = await hrService.getAttendanceLogs({
                startDate: new Date().toISOString().split('T')[0]
            });
            setLogs(data);

            // Find if there's an active check-in today
            const active = data.find(log => log.check_in && !log.check_out);
            setTodayLog(active || null);
        } catch (error: any) {
            toast.error('Failed to load attendance logs');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, []);

    const handleCheckIn = async () => {
        try {
            setChecking(true);
            await hrService.checkIn({ remarks: 'Web Check-in' });
            toast.success('Checked in successfully');
            fetchLogs();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Check-in failed');
        } finally {
            setChecking(false);
        }
    };

    const handleCheckOut = async () => {
        try {
            setChecking(true);
            await hrService.checkOut({ remarks: 'Web Check-out' });
            toast.success('Checked out successfully');
            fetchLogs();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Check-out failed');
        } finally {
            setChecking(false);
        }
    };

    const getStatusVariant = (status: HrAttendanceStatus) => {
        switch (status) {
            case HrAttendanceStatus.PRESENT: return 'success';
            case HrAttendanceStatus.LATE: return 'warning';
            case HrAttendanceStatus.ABSENT: return 'danger';
            default: return 'secondary';
        }
    };

    return (
        <div className="p-8 space-y-8 max-w-[1400px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-5">
                    <div className="p-4 rounded-2xl shadow-lg border transition-transform hover:rotate-3"
                        style={{ backgroundColor: `${theme.colors.primary}15`, borderColor: `${theme.colors.primary}30` }}>
                        <Clock className="h-8 w-8" style={{ color: theme.colors.primary }} />
                    </div>
                    <div>
                        <h1 className="text-4xl font-black tracking-tight" style={{ color: theme.colors.text }}>
                            Attendance
                        </h1>
                        <p className="font-medium opacity-60" style={{ color: theme.colors.textSecondary }}>
                            Track your time and daily activities
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-4 bg-black/5 dark:bg-white/5 p-4 rounded-2xl border" style={{ borderColor: theme.colors.border }}>
                    <div className="text-right">
                        <p className="text-[10px] font-black uppercase opacity-40" style={{ color: theme.colors.text }}>Current Time</p>
                        <p className="text-xl font-black" style={{ color: theme.colors.text }}>{format(new Date(), 'hh:mm:ss a')}</p>
                    </div>
                    <CalendarDays className="h-6 w-6 opacity-20" />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left: Action Card */}
                <div className="lg:col-span-1 space-y-8">
                    <Card className="p-8 text-center space-y-8 border-none shadow-2xl overflow-hidden relative"
                        style={{ backgroundColor: theme.colors.surface }}>
                        <div className="absolute top-0 left-0 w-full h-2 bg-primary" style={{ backgroundColor: theme.colors.primary }}></div>

                        <div className="space-y-4">
                            <div className="mx-auto w-24 h-24 rounded-full flex items-center justify-center border-4 border-dashed"
                                style={{ borderColor: `${theme.colors.primary}30`, backgroundColor: `${theme.colors.primary}05` }}>
                                {todayLog ? (
                                    <Clock className="h-10 w-10 animate-pulse" style={{ color: theme.colors.primary }} />
                                ) : (
                                    <LogIn className="h-10 w-10 opacity-20" style={{ color: theme.colors.text }} />
                                )}
                            </div>
                            <div>
                                <h3 className="text-2xl font-black" style={{ color: theme.colors.text }}>
                                    {todayLog ? 'Checked In' : 'Ready to Start?'}
                                </h3>
                                <p className="text-sm font-medium opacity-60" style={{ color: theme.colors.textSecondary }}>
                                    {todayLog
                                        ? `Since ${format(new Date(todayLog.check_in!), 'hh:mm a')}`
                                        : 'Mark your presence for today'}
                                </p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            {!todayLog ? (
                                <Button
                                    onClick={handleCheckIn}
                                    disabled={checking}
                                    className="w-full h-16 rounded-2xl font-black text-lg gap-3 shadow-xl shadow-primary/20 scale-105 active:scale-95 transition-all"
                                >
                                    {checking ? <Loader2 className="animate-spin" /> : <LogIn className="h-6 w-6" />}
                                    Check In Now
                                </Button>
                            ) : (
                                <Button
                                    variant="destructive"
                                    onClick={handleCheckOut}
                                    disabled={checking}
                                    className="w-full h-16 rounded-2xl font-black text-lg gap-3 shadow-xl shadow-red-500/20 scale-105 active:scale-95 transition-all"
                                >
                                    {checking ? <Loader2 className="animate-spin" /> : <LogOut className="h-6 w-6" />}
                                    Check Out (Wrap Up)
                                </Button>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-4 pt-8 border-t" style={{ borderColor: theme.colors.border }}>
                            <div className="text-left">
                                <p className="text-[10px] font-black uppercase opacity-40" style={{ color: theme.colors.text }}>Shift Starts</p>
                                <p className="font-bold">09:00 AM</p>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] font-black uppercase opacity-40" style={{ color: theme.colors.text }}>Status</p>
                                <Badge variant={todayLog ? 'success' : 'secondary'} className="font-black tracking-widest uppercase text-[10px]">
                                    {todayLog ? 'Working' : 'Off-duty'}
                                </Badge>
                            </div>
                        </div>
                    </Card>

                    <Card className="p-6 bg-blue-500/5 border border-blue-500/20 rounded-3xl flex gap-4">
                        <AlertCircle className="h-6 w-6 text-blue-500 shrink-0" />
                        <div>
                            <p className="font-bold text-sm text-blue-500">Auto Check-out</p>
                            <p className="text-xs opacity-70" style={{ color: theme.colors.textSecondary }}>System automatically logs you out at 11:59 PM if not done manually.</p>
                        </div>
                    </Card>
                </div>

                {/* Right: Activity Log */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xl font-black flex items-center gap-3" style={{ color: theme.colors.text }}>
                            <History className="h-6 w-6 opacity-40" />
                            Recent Activities
                        </h3>
                        <Button variant="ghost" className="text-xs font-bold gap-2">
                            View Full History
                        </Button>
                    </div>

                    <Card className="border-none shadow-xl overflow-hidden" style={{ backgroundColor: theme.colors.surface }}>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr style={{ backgroundColor: `${theme.colors.primary}05`, borderBottom: `1px solid ${theme.colors.border}` }}>
                                        <th className="p-5 font-black uppercase text-[10px] tracking-widest opacity-60 text-primary">Date</th>
                                        <th className="p-5 font-black uppercase text-[10px] tracking-widest opacity-60 text-primary">Check In</th>
                                        <th className="p-5 font-black uppercase text-[10px] tracking-widest opacity-60 text-primary">Check Out</th>
                                        <th className="p-5 font-black uppercase text-[10px] tracking-widest opacity-60 text-center text-primary">Status</th>
                                        <th className="p-5 font-black uppercase text-[10px] tracking-widest opacity-60 text-right text-primary">Remarks</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y" style={{ borderColor: theme.colors.border }}>
                                    {loading ? (
                                        Array(5).fill(0).map((_, i) => (
                                            <tr key={i} className="animate-pulse">
                                                <td colSpan={5} className="p-6"><div className="h-6 bg-black/5 dark:bg-white/5 rounded-lg w-full"></div></td>
                                            </tr>
                                        ))
                                    ) : logs.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="p-20 text-center">
                                                <Timer className="h-12 w-12 mx-auto opacity-10 mb-4" />
                                                <p className="font-bold opacity-30">No activities recorded for today</p>
                                            </td>
                                        </tr>
                                    ) : (
                                        logs.map((log) => (
                                            <tr key={log.id} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                                                <td className="p-5">
                                                    <p className="font-bold text-sm" style={{ color: theme.colors.text }}>
                                                        {format(new Date(log.date), 'MMM dd, yyyy')}
                                                    </p>
                                                </td>
                                                <td className="p-5">
                                                    <div className="flex items-center gap-2">
                                                        <LogIn className="h-3 w-3 text-green-500" />
                                                        <span className="font-mono text-xs font-bold">{log.check_in ? format(new Date(log.check_in), 'hh:mm a') : '--:--'}</span>
                                                    </div>
                                                </td>
                                                <td className="p-5">
                                                    <div className="flex items-center gap-2">
                                                        <LogOut className="h-3 w-3 text-orange-500" />
                                                        <span className="font-mono text-xs font-bold">{log.check_out ? format(new Date(log.check_out), 'hh:mm a') : '--:--'}</span>
                                                    </div>
                                                </td>
                                                <td className="p-5 text-center">
                                                    <Badge variant={getStatusVariant(log.status)} className="font-black tracking-widest uppercase text-[10px]">
                                                        {log.status}
                                                    </Badge>
                                                </td>
                                                <td className="p-5 text-right">
                                                    <span className="text-xs opacity-60 italic">{log.remarks || '-'}</span>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}
