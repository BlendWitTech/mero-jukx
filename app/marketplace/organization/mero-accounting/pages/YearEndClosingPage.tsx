import { useState } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/services/api';
import toast from 'react-hot-toast';
import { CalendarCheck2, Plus, Lock, AlertTriangle, X, CheckCircle } from 'lucide-react';

interface FiscalYear {
    id: string;
    name: string;
    startDate: string;
    endDate: string;
    isClosed: boolean;
    closedAt?: string;
    closingEntryId?: string;
}

interface ClosingResult {
    message: string;
    closingEntryId?: string;
    netAmount?: number;
    transferredTo?: string;
}

export default function YearEndClosingPage() {
    const { theme } = useTheme();
    const queryClient = useQueryClient();

    const [showNewModal, setShowNewModal] = useState(false);
    const [showCloseConfirm, setShowCloseConfirm] = useState<FiscalYear | null>(null);
    const [closingResult, setClosingResult] = useState<ClosingResult | null>(null);
    const [newFY, setNewFY] = useState({ name: '', startDate: '', endDate: '' });

    const { data: fiscalYears = [], isLoading } = useQuery({
        queryKey: ['fiscal-years'],
        queryFn: async () => {
            const res = await api.get('/accounting/fiscal-years');
            return res.data as FiscalYear[];
        },
    });

    const createMutation = useMutation({
        mutationFn: (data: typeof newFY) => api.post('/accounting/fiscal-years', data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['fiscal-years'] });
            setShowNewModal(false);
            setNewFY({ name: '', startDate: '', endDate: '' });
            toast.success('Fiscal year created');
        },
        onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to create fiscal year'),
    });

    const closeMutation = useMutation({
        mutationFn: (id: string) => api.post(`/accounting/fiscal-years/${id}/close`),
        onSuccess: (res) => {
            queryClient.invalidateQueries({ queryKey: ['fiscal-years'] });
            setShowCloseConfirm(null);
            setClosingResult(res.data);
        },
        onError: (err: any) => {
            setShowCloseConfirm(null);
            toast.error(err?.response?.data?.message || 'Failed to close fiscal year');
        },
    });

    const inputStyle = {
        backgroundColor: theme.colors.background,
        borderColor: theme.colors.border,
        color: theme.colors.text,
    };

    if (isLoading) {
        return <div className="p-6 text-center" style={{ color: theme.colors.textSecondary }}>Loading fiscal years...</div>;
    }

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold" style={{ color: theme.colors.text }}>Year-End Closing</h1>
                    <p className="text-sm mt-1" style={{ color: theme.colors.textSecondary }}>
                        Manage fiscal years and perform year-end closing to transfer P&L to retained earnings
                    </p>
                </div>
                <button
                    onClick={() => setShowNewModal(true)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white"
                    style={{ backgroundColor: theme.colors.primary }}
                >
                    <Plus className="h-4 w-4" /> New Fiscal Year
                </button>
            </div>

            {/* Closing Result Banner */}
            {closingResult && (
                <div className="rounded-lg border p-4 flex items-start gap-3" style={{ backgroundColor: '#f0fdf4', borderColor: '#86efac' }}>
                    <CheckCircle className="h-5 w-5 mt-0.5 flex-shrink-0" style={{ color: '#16a34a' }} />
                    <div>
                        <p className="font-medium text-sm" style={{ color: '#15803d' }}>{closingResult.message}</p>
                        {closingResult.netAmount !== undefined && (
                            <p className="text-xs mt-1" style={{ color: '#166534' }}>
                                Net P&L transferred to retained earnings: NPR {Number(closingResult.netAmount).toLocaleString()}
                            </p>
                        )}
                    </div>
                    <button onClick={() => setClosingResult(null)} className="ml-auto">
                        <X className="h-4 w-4" style={{ color: '#16a34a' }} />
                    </button>
                </div>
            )}

            {/* Info Card */}
            <div className="rounded-lg border p-4 flex items-start gap-3" style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border }}>
                <AlertTriangle className="h-5 w-5 mt-0.5 flex-shrink-0" style={{ color: '#f59e0b' }} />
                <div>
                    <p className="font-medium text-sm" style={{ color: theme.colors.text }}>About Year-End Closing</p>
                    <p className="text-xs mt-1" style={{ color: theme.colors.textSecondary }}>
                        Closing a fiscal year will zero out all revenue and expense accounts and transfer the net profit or loss
                        to Retained Earnings (Equity). This action cannot be undone. Ensure all transactions for the period
                        are posted before closing.
                    </p>
                </div>
            </div>

            {/* Fiscal Years Table */}
            <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border }}>
                <div className="p-4 border-b flex items-center gap-2" style={{ borderColor: theme.colors.border }}>
                    <CalendarCheck2 className="h-5 w-5" style={{ color: theme.colors.primary }} />
                    <h2 className="text-base font-semibold" style={{ color: theme.colors.text }}>Fiscal Years</h2>
                </div>

                {fiscalYears.length === 0 ? (
                    <div className="p-8 text-center" style={{ color: theme.colors.textSecondary }}>
                        No fiscal years defined. Create one to get started.
                    </div>
                ) : (
                    <table className="w-full text-sm">
                        <thead>
                            <tr style={{ backgroundColor: theme.colors.background }}>
                                <th className="text-left px-4 py-3 font-medium" style={{ color: theme.colors.textSecondary }}>Fiscal Year</th>
                                <th className="text-left px-4 py-3 font-medium" style={{ color: theme.colors.textSecondary }}>Start Date</th>
                                <th className="text-left px-4 py-3 font-medium" style={{ color: theme.colors.textSecondary }}>End Date</th>
                                <th className="text-left px-4 py-3 font-medium" style={{ color: theme.colors.textSecondary }}>Status</th>
                                <th className="text-left px-4 py-3 font-medium" style={{ color: theme.colors.textSecondary }}>Closed On</th>
                                <th className="text-right px-4 py-3 font-medium" style={{ color: theme.colors.textSecondary }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {fiscalYears.map((fy, i) => (
                                <tr key={fy.id} style={{ borderTop: i > 0 ? `1px solid ${theme.colors.border}` : undefined }}>
                                    <td className="px-4 py-3 font-medium" style={{ color: theme.colors.text }}>{fy.name}</td>
                                    <td className="px-4 py-3" style={{ color: theme.colors.textSecondary }}>{fy.startDate}</td>
                                    <td className="px-4 py-3" style={{ color: theme.colors.textSecondary }}>{fy.endDate}</td>
                                    <td className="px-4 py-3">
                                        <span
                                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                                            style={fy.isClosed
                                                ? { backgroundColor: '#fee2e2', color: '#dc2626' }
                                                : { backgroundColor: '#dcfce7', color: '#16a34a' }
                                            }
                                        >
                                            {fy.isClosed ? <><Lock className="h-3 w-3" /> Closed</> : <><CheckCircle className="h-3 w-3" /> Open</>}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3" style={{ color: theme.colors.textSecondary }}>
                                        {fy.closedAt ? new Date(fy.closedAt).toLocaleDateString() : '—'}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        {!fy.isClosed && (
                                            <button
                                                onClick={() => setShowCloseConfirm(fy)}
                                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium ml-auto"
                                                style={{ backgroundColor: '#fee2e2', color: '#dc2626' }}
                                            >
                                                <Lock className="h-3 w-3" /> Close Year
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* New Fiscal Year Modal */}
            {showNewModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                    <div className="rounded-xl shadow-2xl w-full max-w-md p-6 space-y-4" style={{ backgroundColor: theme.colors.surface }}>
                        <div className="flex items-center justify-between">
                            <h3 className="font-semibold text-lg" style={{ color: theme.colors.text }}>New Fiscal Year</h3>
                            <button onClick={() => setShowNewModal(false)}><X className="h-5 w-5" style={{ color: theme.colors.textSecondary }} /></button>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1" style={{ color: theme.colors.text }}>Year Name</label>
                            <input
                                type="text"
                                placeholder="e.g. FY 2080-81 or FY 2024-25"
                                className="w-full px-3 py-2 rounded-lg border text-sm"
                                style={inputStyle}
                                value={newFY.name}
                                onChange={e => setNewFY({ ...newFY, name: e.target.value })}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-sm font-medium mb-1" style={{ color: theme.colors.text }}>Start Date</label>
                                <input
                                    type="date"
                                    className="w-full px-3 py-2 rounded-lg border text-sm"
                                    style={inputStyle}
                                    value={newFY.startDate}
                                    onChange={e => setNewFY({ ...newFY, startDate: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1" style={{ color: theme.colors.text }}>End Date</label>
                                <input
                                    type="date"
                                    className="w-full px-3 py-2 rounded-lg border text-sm"
                                    style={inputStyle}
                                    value={newFY.endDate}
                                    onChange={e => setNewFY({ ...newFY, endDate: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="flex gap-3 pt-2">
                            <button
                                onClick={() => setShowNewModal(false)}
                                className="flex-1 px-4 py-2 rounded-lg border text-sm font-medium"
                                style={{ borderColor: theme.colors.border, color: theme.colors.text }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => createMutation.mutate(newFY)}
                                disabled={!newFY.name || !newFY.startDate || !newFY.endDate || createMutation.isPending}
                                className="flex-1 px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-60"
                                style={{ backgroundColor: theme.colors.primary }}
                            >
                                {createMutation.isPending ? 'Creating...' : 'Create'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Close Confirmation Modal */}
            {showCloseConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                    <div className="rounded-xl shadow-2xl w-full max-w-md p-6 space-y-4" style={{ backgroundColor: theme.colors.surface }}>
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-full" style={{ backgroundColor: '#fee2e2' }}>
                                <AlertTriangle className="h-5 w-5" style={{ color: '#dc2626' }} />
                            </div>
                            <h3 className="font-semibold text-lg" style={{ color: theme.colors.text }}>Close Fiscal Year</h3>
                        </div>
                        <p className="text-sm" style={{ color: theme.colors.textSecondary }}>
                            Are you sure you want to close <strong>{showCloseConfirm.name}</strong>?
                            This will generate closing journal entries and transfer all P&L balances to Retained Earnings.
                            <br /><br />
                            <strong style={{ color: '#dc2626' }}>This action cannot be undone.</strong>
                        </p>
                        <div className="flex gap-3 pt-2">
                            <button
                                onClick={() => setShowCloseConfirm(null)}
                                className="flex-1 px-4 py-2 rounded-lg border text-sm font-medium"
                                style={{ borderColor: theme.colors.border, color: theme.colors.text }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => closeMutation.mutate(showCloseConfirm.id)}
                                disabled={closeMutation.isPending}
                                className="flex-1 px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-60"
                                style={{ backgroundColor: '#dc2626' }}
                            >
                                {closeMutation.isPending ? 'Closing...' : 'Yes, Close Year'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
