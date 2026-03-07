import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/services/api';
import { useTheme } from '@/contexts/ThemeContext';
import { History, Search, Filter, User as UserIcon, Calendar, Info, AlertTriangle, ShieldAlert, Activity } from 'lucide-react';
import { formatNPR } from '@/utils/nepaliDateUtils';
import {
    Card,
    Button,
    Input,
    Table,
    TableHeader,
    TableBody,
    TableRow,
    TableHead,
    TableCell,
    Modal
} from '@shared';

interface AuditLog {
    id: string;
    action: string;
    entity_type: string;
    entity_id: string;
    old_values: any;
    new_values: any;
    severity: 'critical' | 'warning' | 'info';
    created_at: string;
    user: {
        name: string;
        email: string;
    };
}

export default function AuditLogPage() {
    const { theme } = useTheme();
    const [searchTerm, setSearchTerm] = useState('');

    const { data: logs, isLoading } = useQuery<AuditLog[]>({
        queryKey: ['accounting-audit-logs'],
        queryFn: async () => {
            const response = await api.get('/accounting/audit/logs');
            return response.data;
        }
    });

    const filteredLogs = (logs ?? []).filter((log) => {
        if (!searchTerm.trim()) return true;
        const term = searchTerm.toLowerCase();
        return (
            log.action.toLowerCase().includes(term) ||
            log.entity_type.toLowerCase().includes(term) ||
            (log.user?.name ?? '').toLowerCase().includes(term) ||
            (log.user?.email ?? '').toLowerCase().includes(term)
        );
    });

    const getSeverityIcon = (severity: string) => {
        switch (severity) {
            case 'critical': return <ShieldAlert className="text-red-500" size={18} />;
            case 'warning': return <AlertTriangle className="text-orange-500" size={18} />;
            default: return <Info className="text-blue-500" size={18} />;
        }
    };

    const getActionColor = (action: string) => {
        if (action.includes('DELETE') || action.includes('VOID')) return 'text-red-600 dark:text-red-400';
        if (action.includes('CREATE') || action.includes('POST')) return 'text-green-600 dark:text-green-400';
        return 'text-blue-600 dark:text-blue-400';
    };

    if (isLoading) {
        return <div className="p-8 animate-pulse space-y-4">
            <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-1/4"></div>
            <div className="h-64 bg-slate-100 dark:bg-slate-800 rounded-3xl"></div>
        </div>;
    }

    return (
        <div className="p-8 max-w-[1600px] mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="p-3 rounded-2xl" style={{ backgroundColor: `${theme.colors.primary}15` }}>
                        <History className="h-8 w-8" style={{ color: theme.colors.primary }} />
                    </div>
                    <div>
                        <h1 className="text-4xl font-extrabold tracking-tight" style={{ color: theme.colors.text }}>
                            Activity Log
                        </h1>
                        <p className="opacity-70" style={{ color: theme.colors.textSecondary }}>
                            Track recent financial activities and administrative changes
                        </p>
                    </div>
                </div>
            </div>

            <div className="flex flex-wrap gap-4 items-center">
                <div className="flex-1 min-w-[300px]">
                    <Input
                        placeholder="Search by action, user, or entity..."
                        leftIcon={<Search size={20} />}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                    />
                </div>
                <Button variant="ghost" className="px-6 h-12 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-bold hover:scale-[1.05] transition-transform shadow-sm">
                    <Filter className="h-5 w-5 mr-2" />
                    Filters
                </Button>
            </div>

            <Card className="overflow-hidden border-none shadow-sm" style={{ backgroundColor: theme.colors.surface, borderRadius: '24px' }}>
                <div className="divide-y divide-slate-100 dark:divide-slate-700">
                    {filteredLogs.map((log) => (
                        <div key={log.id} className="p-6 hover-theme transition-colors group">
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex items-start gap-4">
                                    <div className="mt-1">
                                        {getSeverityIcon(log.severity)}
                                    </div>
                                    <div className="flex-1 space-y-2">
                                        <div className="flex items-center gap-4">
                                            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 group-hover:border-primary/20 transition-all">
                                                <History size={18} className="text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 transition-colors" />
                                            </div>
                                            <div>
                                                <div className="font-extrabold text-slate-900 dark:text-white transition-colors uppercase tracking-tight text-sm">
                                                    {log.action.replace(/_/g, ' ')}
                                                </div>
                                                <div className="text-[10px] text-slate-500 font-extrabold uppercase tracking-widest opacity-70">
                                                    Target: {log.entity_type}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-5 text-sm">
                                            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                                                <div className="p-1.5 rounded-lg bg-primary/10 text-primary" style={{ color: theme.colors.primary, backgroundColor: `${theme.colors.primary}15` }}>
                                                    <UserIcon size={12} />
                                                </div>
                                                <span className="font-bold">{log.user?.name}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5 text-slate-500 text-xs font-bold">
                                                <Calendar size={12} />
                                                {new Date(log.created_at).toLocaleString()}
                                            </div>
                                        </div>
                                        {(log.old_values || log.new_values) && (
                                            <div className="mt-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 text-xs font-mono text-slate-600 dark:text-slate-400 border border-slate-100 dark:border-slate-700/50">
                                                <p className="mb-2 font-black uppercase tracking-widest text-[10px] text-slate-400">Modification Details</p>
                                                <pre className="whitespace-pre-wrap overflow-auto max-h-48 leading-relaxed">
                                                    {JSON.stringify(log.new_values || log.old_values, null, 2)}
                                                </pre>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{log.id.split('-')[0]}</span>
                                </div>
                            </div>
                        </div>
                    ))}

                    {filteredLogs.length === 0 && (
                        <div className="p-12 text-center text-slate-400">
                            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-4">
                                <History size={24} />
                            </div>
                            <p className="font-bold">
                                {searchTerm ? 'No matching activities found' : 'No recent activities found'}
                            </p>
                            <p className="text-sm">
                                {searchTerm ? 'Try a different search term.' : 'Activity logs will appear once financial documents are modified.'}
                            </p>
                        </div>
                    )}
                </div>
            </Card>
        </div>
    );
}
