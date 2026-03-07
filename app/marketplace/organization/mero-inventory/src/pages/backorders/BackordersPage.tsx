import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTheme } from '@frontend/contexts/ThemeContext';
import { useAppContext } from '../../contexts/AppContext';
import { Package, CheckCircle, XCircle } from 'lucide-react';
import toast from '@shared/frontend/hooks/useToast';

const statusColors: Record<string, string> = {
    open: 'bg-red-100 text-red-700',
    partially_fulfilled: 'bg-yellow-100 text-yellow-700',
    fulfilled: 'bg-green-100 text-green-700',
    cancelled: 'bg-gray-100 text-gray-500',
};

export default function BackordersPage() {
    const { theme } = useTheme();
    const { apiCall } = useAppContext();
    const queryClient = useQueryClient();

    const [filterStatus, setFilterStatus] = useState('');
    const [fulfillId, setFulfillId] = useState<string | null>(null);
    const [fulfillQty, setFulfillQty] = useState(1);

    const { data: backorders = [], isLoading } = useQuery({
        queryKey: ['backorders', filterStatus],
        queryFn: () => apiCall('GET', `/inventory/backorders${filterStatus ? `?status=${filterStatus}` : ''}`),
    });

    const fulfillMutation = useMutation({
        mutationFn: ({ id, quantity }: { id: string; quantity: number }) =>
            apiCall('POST', `/inventory/backorders/${id}/fulfill`, { quantity }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['backorders'] });
            setFulfillId(null);
            toast.success('Backorder fulfilled');
        },
        onError: (e: any) => toast.error(e?.message || 'Failed to fulfill'),
    });

    const cancelMutation = useMutation({
        mutationFn: (id: string) => apiCall('POST', `/inventory/backorders/${id}/cancel`),
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['backorders'] }); toast.success('Backorder cancelled'); },
    });

    const filtered = (backorders as any[]);

    return (
        <div className="flex-1 overflow-auto p-6" style={{ backgroundColor: theme.colors.background }}>
            <div className="max-w-6xl mx-auto">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold" style={{ color: theme.colors.text }}>Backorders</h1>
                        <p className="text-sm mt-1" style={{ color: theme.colors.textSecondary }}>Track and fulfill backordered items from sales orders</p>
                    </div>
                    <select className="px-3 py-2 rounded-lg border text-sm" style={{ borderColor: theme.colors.border, backgroundColor: theme.colors.surface, color: theme.colors.text }}
                        value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                        <option value="">All Statuses</option>
                        <option value="open">Open</option>
                        <option value="partially_fulfilled">Partially Fulfilled</option>
                        <option value="fulfilled">Fulfilled</option>
                        <option value="cancelled">Cancelled</option>
                    </select>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-4 gap-4 mb-6">
                    {[
                        { label: 'Open', status: 'open', color: '#dc2626' },
                        { label: 'Partially Fulfilled', status: 'partially_fulfilled', color: '#d97706' },
                        { label: 'Fulfilled', status: 'fulfilled', color: '#16a34a' },
                        { label: 'Total', status: '', color: theme.colors.primary },
                    ].map(s => (
                        <div key={s.label} className="rounded-lg border p-4" style={{ borderColor: theme.colors.border, backgroundColor: theme.colors.surface }}>
                            <p className="text-xs font-medium mb-1" style={{ color: theme.colors.textSecondary }}>{s.label}</p>
                            <p className="text-2xl font-bold" style={{ color: s.color }}>
                                {s.status ? (backorders as any[]).filter((b: any) => b.status === s.status).length : (backorders as any[]).length}
                            </p>
                        </div>
                    ))}
                </div>

                {isLoading ? (
                    <div className="text-center py-12" style={{ color: theme.colors.textSecondary }}>Loading...</div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-16" style={{ color: theme.colors.textSecondary }}>
                        <Package className="h-12 w-12 mx-auto mb-3 opacity-30" />
                        <p className="font-medium">No backorders found</p>
                    </div>
                ) : (
                    <div className="rounded-lg border overflow-hidden" style={{ borderColor: theme.colors.border }}>
                        <table className="w-full">
                            <thead style={{ backgroundColor: theme.colors.surface }}>
                                <tr>
                                    {['BO Number', 'Product', 'Backordered', 'Fulfilled', 'Expected Date', 'Status', 'Actions'].map(h => (
                                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: theme.colors.textSecondary }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody style={{ backgroundColor: theme.colors.background }}>
                                {filtered.map((bo: any) => (
                                    <tr key={bo.id} className="border-t" style={{ borderColor: theme.colors.border }}>
                                        <td className="px-4 py-3 font-mono text-sm font-semibold" style={{ color: theme.colors.text }}>{bo.backorder_number}</td>
                                        <td className="px-4 py-3 text-sm" style={{ color: theme.colors.text }}>{bo.product_name || '—'}</td>
                                        <td className="px-4 py-3 text-sm font-medium" style={{ color: '#dc2626' }}>{bo.backordered_quantity}</td>
                                        <td className="px-4 py-3 text-sm" style={{ color: '#16a34a' }}>{bo.fulfilled_quantity}</td>
                                        <td className="px-4 py-3 text-sm" style={{ color: theme.colors.textSecondary }}>{bo.expected_fulfillment_date || '—'}</td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[bo.status] || 'bg-gray-100 text-gray-600'}`}>
                                                {bo.status?.replace('_', ' ')}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex gap-1">
                                                {(bo.status === 'open' || bo.status === 'partially_fulfilled') && (
                                                    <button onClick={() => { setFulfillId(bo.id); setFulfillQty(Number(bo.backordered_quantity) - Number(bo.fulfilled_quantity)); }}
                                                        className="px-2 py-1 text-xs rounded bg-green-100 text-green-700 hover:bg-green-200">Fulfill</button>
                                                )}
                                                {bo.status !== 'fulfilled' && bo.status !== 'cancelled' && (
                                                    <button onClick={() => cancelMutation.mutate(bo.id)} className="px-2 py-1 text-xs rounded bg-red-50 text-red-600 hover:bg-red-100">Cancel</button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Fulfill Modal */}
                {fulfillId && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <div className="w-full max-w-sm rounded-xl shadow-xl p-6" style={{ backgroundColor: theme.colors.background }}>
                            <h2 className="text-lg font-semibold mb-3" style={{ color: theme.colors.text }}>Fulfill Backorder</h2>
                            <label className="text-sm font-medium block mb-1" style={{ color: theme.colors.textSecondary }}>Quantity to Fulfill</label>
                            <input type="number" min={1} className="w-full px-3 py-2 rounded-lg border text-sm mb-4" style={{ borderColor: theme.colors.border, backgroundColor: theme.colors.surface, color: theme.colors.text }}
                                value={fulfillQty} onChange={e => setFulfillQty(Number(e.target.value))} />
                            <div className="flex gap-2">
                                <button onClick={() => setFulfillId(null)} className="flex-1 px-3 py-2 text-sm rounded-lg border" style={{ borderColor: theme.colors.border, color: theme.colors.textSecondary }}>Cancel</button>
                                <button onClick={() => fulfillMutation.mutate({ id: fulfillId, quantity: fulfillQty })} disabled={fulfillMutation.isPending}
                                    className="flex-1 px-3 py-2 text-sm rounded-lg text-white" style={{ backgroundColor: '#16a34a' }}>
                                    {fulfillMutation.isPending ? 'Fulfilling...' : 'Confirm'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
