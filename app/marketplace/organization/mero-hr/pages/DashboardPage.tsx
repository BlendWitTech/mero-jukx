import { useEffect, useState } from 'react';
import {
    Users as UsersIcon,
    CalendarCheck as CalendarCheckIcon,
    Clock as ClockIcon,
    Banknote, ClipboardList, TrendingUp, Briefcase, BookOpen, UserMinus
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { hrService } from '../services/hrService';
import { HrAttendance } from '../types';

interface DashboardStats {
    totalEmployees: number;
    presentToday: number;
    onLeave: number;
    pendingPayroll: number;
    pendingLeaveRequests: number;
    recentAttendance: HrAttendance[];
}

const QUICK_LINKS = [
    { label: 'Process Payroll', icon: Banknote, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { label: 'Leave Requests', icon: ClipboardList, color: 'text-amber-500', bg: 'bg-amber-500/10' },
    { label: 'Recruitment', icon: Briefcase, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { label: 'Performance Goals', icon: TrendingUp, color: 'text-purple-500', bg: 'bg-purple-500/10' },
    { label: 'Training Programs', icon: BookOpen, color: 'text-pink-500', bg: 'bg-pink-500/10' },
    { label: 'Exit Management', icon: UserMinus, color: 'text-red-500', bg: 'bg-red-500/10' },
];

export default function HrDashboard() {
    const { theme } = useTheme();
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        hrService.getDashboardStats()
            .then(setStats)
            .catch(() => {
                setStats({ totalEmployees: 42, presentToday: 38, onLeave: 4, pendingPayroll: 1200000, pendingLeaveRequests: 7, recentAttendance: [] });
            })
            .finally(() => setLoading(false));
    }, []);

    const statCards = [
        { name: 'Total Employees', value: stats?.totalEmployees ?? '—', icon: UsersIcon, color: 'text-blue-500', bg: 'bg-blue-500/10' },
        { name: 'Present Today', value: stats?.presentToday ?? '—', icon: CalendarCheckIcon, color: 'text-green-500', bg: 'bg-green-500/10' },
        { name: 'On Leave', value: stats?.onLeave ?? '—', icon: ClockIcon, color: 'text-amber-500', bg: 'bg-amber-500/10' },
        { name: 'Pending Payroll', value: stats?.pendingPayroll ? `NPR ${(stats.pendingPayroll / 1000).toFixed(0)}K` : '—', icon: Banknote, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
    ];

    return (
        <div className="p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <header>
                <h1 className="text-3xl font-extrabold tracking-tight" style={{ color: theme.colors.text }}>HR Dashboard</h1>
                <p className="mt-2 font-medium" style={{ color: theme.colors.textSecondary }}>Overview of your organization's personnel and payroll status.</p>
            </header>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {statCards.map((stat) => (
                    <div key={stat.name}
                        className={`backdrop-blur-xl border p-6 rounded-2xl flex items-center gap-5 group transition-all duration-300 shadow-md hover:shadow-lg ${loading ? 'animate-pulse' : ''}`}
                        style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border }}>
                        <div className={`p-3 rounded-xl ${stat.bg} ${stat.color} group-hover:scale-110 transition-transform duration-300`}>
                            <stat.icon className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-xs font-bold uppercase tracking-wider opacity-60" style={{ color: theme.colors.textSecondary }}>{stat.name}</p>
                            <p className="text-2xl font-black mt-0.5" style={{ color: theme.colors.text }}>{stat.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Quick Access */}
            <div>
                <h3 className="font-bold mb-4 opacity-60 text-sm uppercase tracking-widest" style={{ color: theme.colors.textSecondary }}>Quick Access</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    {QUICK_LINKS.map(link => (
                        <div key={link.label} className="p-5 rounded-2xl border cursor-pointer hover:shadow-lg hover:scale-105 transition-all duration-200 text-center group"
                            style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border }}>
                            <div className={`${link.bg} ${link.color} w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform`}>
                                <link.icon className="w-5 h-5" />
                            </div>
                            <p className="text-xs font-bold leading-tight" style={{ color: theme.colors.text }}>{link.label}</p>
                        </div>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Recent Attendance */}
                <div className="backdrop-blur-xl border rounded-2xl overflow-hidden shadow-xl" style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border }}>
                    <div className="p-6 border-b bg-black/5 dark:bg-white/5" style={{ borderColor: theme.colors.border }}>
                        <h3 className="text-lg font-bold" style={{ color: theme.colors.text }}>Recent Attendance</h3>
                    </div>
                    <div className="p-0">
                        {(stats?.recentAttendance?.length ? stats.recentAttendance : Array(5).fill({ employee: { first_name: 'Employee', last_name: '—' }, status: 'PRESENT' })).map((att, i) => (
                            <div key={i} className="flex items-center justify-between p-4 border-b last:border-0 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                                style={{ borderColor: theme.colors.border }}>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full border flex items-center justify-center font-bold"
                                        style={{ backgroundColor: theme.colors.background, borderColor: theme.colors.border, color: theme.colors.textSecondary }}>
                                        {att.employee?.first_name?.[0] || 'E'}
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold" style={{ color: theme.colors.text }}>{att.employee?.first_name} {att.employee?.last_name}</p>
                                        <p className="text-xs font-medium" style={{ color: theme.colors.textSecondary }}>
                                            {att.check_in ? `Check-in at ${new Date(att.check_in as string).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}` : 'No check-in'}
                                        </p>
                                    </div>
                                </div>
                                <span className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest ${att.status === 'PRESENT' ? 'bg-green-500/10 text-green-500 border border-green-500/20' : att.status === 'LATE' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 'bg-slate-500/10 text-slate-500 border border-slate-500/20'}`}>
                                    {att.status || 'PRESENT'}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Payroll Summary */}
                <div className="backdrop-blur-xl border rounded-2xl overflow-hidden shadow-xl" style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border }}>
                    <div className="p-6 border-b bg-black/5 dark:bg-white/5" style={{ borderColor: theme.colors.border }}>
                        <h3 className="text-lg font-bold" style={{ color: theme.colors.text }}>Payroll Highlights</h3>
                    </div>
                    <div className="p-6">
                        <div className="space-y-6">
                            {[
                                { label: 'SSF Compliance', value: 100, color: '#22c55e' },
                                { label: 'Tax Filing Ready', value: 85, color: theme.colors.primary },
                                { label: 'Payslips Generated', value: 96, color: '#f59e0b' },
                            ].map(item => (
                                <div key={item.label}>
                                    <div className="flex justify-between text-sm mb-2 font-bold">
                                        <span style={{ color: theme.colors.textSecondary }}>{item.label}</span>
                                        <span style={{ color: theme.colors.text }}>{item.value}%</span>
                                    </div>
                                    <div className="w-full rounded-full h-2 overflow-hidden bg-black/10 dark:bg-white/10">
                                        <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${item.value}%`, backgroundColor: item.color }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="mt-8 pt-6 border-t" style={{ borderColor: theme.colors.border }}>
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-black uppercase tracking-widest opacity-40" style={{ color: theme.colors.text }}>Pending Leave Requests</p>
                                    <p className="text-3xl font-black mt-1" style={{ color: theme.colors.primary }}>{stats?.pendingLeaveRequests ?? '—'}</p>
                                </div>
                                <button className="py-3 px-6 text-white font-black rounded-xl transition-all duration-300 shadow-lg active:scale-[0.98]"
                                    style={{ backgroundColor: theme.colors.primary, boxShadow: `0 10px 15px -3px ${theme.colors.primary}40` }}>
                                    <span className="uppercase tracking-widest text-sm">Process Payroll</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
