import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTheme } from '@frontend/contexts/ThemeContext';
import { useAppContext } from '../../contexts/AppContext';
import { Plus, ClipboardCheck, CheckCircle, AlertCircle } from 'lucide-react';
import toast from '@shared/frontend/hooks/useToast';

const matchingColors: Record<string, string> = {
    matched: 'bg-green-100 text-green-700',
    partial: 'bg-yellow-100 text-yellow-700',
    over_received: 'bg-orange-100 text-orange-700',
    under_received: 'bg-blue-100 text-blue-700',
    pending: 'bg-gray-100 text-gray-600',
};

export default function GRNPage() {
    const { theme } = useTheme();
    const { apiCall } = useAppContext();
    const queryClient = useQueryClient();

    const [showCreate, setShowCreate] = useState(false);
    const [selectedGRN, setSelectedGRN] = useState<any>(null);
    const [form, setForm] = useState({
        purchase_order_id: '',
        warehouse_id: '',
        received_date: new Date().toISOString().split('T')[0],
        notes: '',
        items: [] as Array<{ product_id: string; product_name: string; ordered_quantity: number; received_quantity: number; rejected_quantity: number; unit_price: number }>,
    });

    const { data: grns = [], isLoading } = useQuery({
        queryKey: ['grns'],
        queryFn: () => apiCall('GET', '/inventory/grn'),
    });

    const { data: purchaseOrders = [] } = useQuery({
        queryKey: ['purchase-orders'],
        queryFn: () => apiCall('GET', '/inventory/purchase-orders'),
    });

    const { data: warehouses = [] } = useQuery({
        queryKey: ['warehouses'],
        queryFn: () => apiCall('GET', '/inventory/warehouses'),
    });

    const { data: poDetail } = useQuery({
        queryKey: ['po-detail', form.purchase_order_id],
        queryFn: () => apiCall('GET', `/inventory/purchase-orders/${form.purchase_order_id}`),
        enabled: !!form.purchase_order_id,
        onSuccess: (data: any) => {
            if (data?.items) {
                setForm(f => ({
                    ...f,
                    items: data.items.map((item: any) => ({
                        product_id: item.productId || item.product_id,
                        product_name: item.product?.name || item.productName || 'Unknown',
                        ordered_quantity: Number(item.quantity),
                        received_quantity: Number(item.quantity),
                        rejected_quantity: 0,
                        unit_price: Number(item.unitPrice || item.unit_price || 0),
                    })),
                }));
            }
        },
    } as any);

    const createMutation = useMutation({
        mutationFn: (data: any) => apiCall('POST', '/inventory/grn', data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['grns'] });
            setShowCreate(false);
            toast.success('GRN created');
        },
        onError: () => toast.error('Failed to create GRN'),
    });

    const confirmMutation = useMutation({
        mutationFn: (id: string) => apiCall('POST', `/inventory/grn/${id}/confirm`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['grns'] });
            toast.success('GRN confirmed — stock updated');
        },
        onError: (e: any) => toast.error(e?.message || 'Failed to confirm GRN'),
    });

    const updateItem = (i: number, field: string, value: any) => {
        setForm(f => ({ ...f, items: f.items.map((item, idx) => idx === i ? { ...item, [field]: value } : item) }));
    };

    return (
        <div className="flex-1 overflow-auto p-6" style={{ backgroundColor: theme.colors.background }}>
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold" style={{ color: theme.colors.text }}>Goods Receipt Notes</h1>
                        <p className="text-sm mt-1" style={{ color: theme.colors.textSecondary }}>Record received goods and verify against purchase orders</p>
                    </div>
                    <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium" style={{ backgroundColor: theme.colors.primary }}>
                        <Plus className="h-4 w-4" /> New GRN
                    </button>
                </div>

                {/* Table */}
                {isLoading ? (
                    <div className="text-center py-12" style={{ color: theme.colors.textSecondary }}>Loading...</div>
                ) : (grns as any[]).length === 0 ? (
                    <div className="text-center py-16" style={{ color: theme.colors.textSecondary }}>
                        <ClipboardCheck className="h-12 w-12 mx-auto mb-3 opacity-30" />
                        <p className="font-medium">No GRNs yet</p>
                        <p className="text-sm mt-1">Create a GRN to record received goods from a purchase order</p>
                    </div>
                ) : (
                    <div className="rounded-lg border overflow-hidden" style={{ borderColor: theme.colors.border }}>
                        <table className="w-full">
                            <thead style={{ backgroundColor: theme.colors.surface }}>
                                <tr>
                                    {['GRN No.', 'PO ID', 'Received Date', 'Status', 'Matching', 'Actions'].map(h => (
                                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: theme.colors.textSecondary }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody style={{ backgroundColor: theme.colors.background }}>
                                {(grns as any[]).map((grn: any) => (
                                    <tr key={grn.id} className="border-t" style={{ borderColor: theme.colors.border }}>
                                        <td className="px-4 py-3 font-mono text-sm font-semibold" style={{ color: theme.colors.text }}>{grn.grn_number}</td>
                                        <td className="px-4 py-3 text-xs font-mono" style={{ color: theme.colors.textSecondary }}>{grn.purchase_order_id?.slice(0, 8)}...</td>
                                        <td className="px-4 py-3 text-sm" style={{ color: theme.colors.textSecondary }}>{grn.received_date || '—'}</td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${grn.status === 'received' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                                {grn.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${matchingColors[grn.matching_status] || 'bg-gray-100 text-gray-600'}`}>
                                                {grn.matching_status?.replace('_', ' ')}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex gap-1">
                                                <button onClick={() => setSelectedGRN(grn)} className="px-2 py-1 text-xs rounded bg-blue-50 text-blue-600 hover:bg-blue-100">View</button>
                                                {grn.status === 'draft' && (
                                                    <button onClick={() => confirmMutation.mutate(grn.id)} className="px-2 py-1 text-xs rounded bg-green-50 text-green-700 hover:bg-green-100">Confirm</button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* GRN Detail Modal */}
                {selectedGRN && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <div className="w-full max-w-2xl rounded-xl shadow-xl p-6 max-h-[85vh] overflow-y-auto" style={{ backgroundColor: theme.colors.background }}>
                            <h2 className="text-lg font-semibold mb-1" style={{ color: theme.colors.text }}>{selectedGRN.grn_number}</h2>
                            <p className="text-sm mb-4" style={{ color: theme.colors.textSecondary }}>Matching: <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${matchingColors[selectedGRN.matching_status]}`}>{selectedGRN.matching_status}</span></p>
                            <table className="w-full text-sm">
                                <thead><tr className="border-b" style={{ borderColor: theme.colors.border }}>
                                    {['Product', 'Ordered', 'Received', 'Rejected'].map(h => <th key={h} className="text-left py-2 pr-4 font-medium text-xs" style={{ color: theme.colors.textSecondary }}>{h}</th>)}
                                </tr></thead>
                                <tbody>
                                    {(selectedGRN.items || []).map((item: any, i: number) => (
                                        <tr key={i} className="border-t" style={{ borderColor: theme.colors.border }}>
                                            <td className="py-2 pr-4" style={{ color: theme.colors.text }}>{item.product_name || '—'}</td>
                                            <td className="py-2 pr-4" style={{ color: theme.colors.textSecondary }}>{item.ordered_quantity}</td>
                                            <td className="py-2 pr-4">
                                                <span className={Number(item.received_quantity) >= Number(item.ordered_quantity) ? 'text-green-600' : 'text-yellow-600'}>{item.received_quantity}</span>
                                            </td>
                                            <td className="py-2 pr-4" style={{ color: Number(item.rejected_quantity) > 0 ? '#dc2626' : theme.colors.textSecondary }}>{item.rejected_quantity}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <button onClick={() => setSelectedGRN(null)} className="mt-4 px-4 py-2 text-sm rounded-lg border w-full" style={{ borderColor: theme.colors.border, color: theme.colors.textSecondary }}>Close</button>
                        </div>
                    </div>
                )}

                {/* Create GRN Modal */}
                {showCreate && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <div className="w-full max-w-2xl rounded-xl shadow-xl p-6 max-h-[90vh] overflow-y-auto" style={{ backgroundColor: theme.colors.background }}>
                            <h2 className="text-lg font-semibold mb-4" style={{ color: theme.colors.text }}>New Goods Receipt Note</h2>
                            <div className="space-y-3">
                                <div>
                                    <label className="text-xs font-medium mb-1 block" style={{ color: theme.colors.textSecondary }}>Purchase Order</label>
                                    <select className="w-full px-3 py-2 rounded-lg border text-sm" style={{ borderColor: theme.colors.border, backgroundColor: theme.colors.surface, color: theme.colors.text }}
                                        value={form.purchase_order_id} onChange={e => setForm(f => ({ ...f, purchase_order_id: e.target.value, items: [] }))}>
                                        <option value="">— Select PO —</option>
                                        {(purchaseOrders as any[]).filter((po: any) => po.status !== 'cancelled').map((po: any) => (
                                            <option key={po.id} value={po.id}>{po.number} - {po.supplier?.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-medium mb-1 block" style={{ color: theme.colors.textSecondary }}>Warehouse</label>
                                    <select className="w-full px-3 py-2 rounded-lg border text-sm" style={{ borderColor: theme.colors.border, backgroundColor: theme.colors.surface, color: theme.colors.text }}
                                        value={form.warehouse_id} onChange={e => setForm(f => ({ ...f, warehouse_id: e.target.value }))}>
                                        <option value="">— Select warehouse —</option>
                                        {(warehouses as any[]).map((w: any) => <option key={w.id} value={w.id}>{w.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-medium mb-1 block" style={{ color: theme.colors.textSecondary }}>Received Date</label>
                                    <input type="date" className="w-full px-3 py-2 rounded-lg border text-sm" style={{ borderColor: theme.colors.border, backgroundColor: theme.colors.surface, color: theme.colors.text }}
                                        value={form.received_date} onChange={e => setForm(f => ({ ...f, received_date: e.target.value }))} />
                                </div>
                                {form.items.length > 0 && (
                                    <div>
                                        <p className="text-sm font-medium mb-2" style={{ color: theme.colors.text }}>Items from PO</p>
                                        {form.items.map((item, i) => (
                                            <div key={i} className="grid grid-cols-3 gap-2 mb-2 items-center">
                                                <span className="text-sm col-span-1" style={{ color: theme.colors.text }}>{item.product_name}</span>
                                                <div>
                                                    <label className="text-xs" style={{ color: theme.colors.textSecondary }}>Received (of {item.ordered_quantity})</label>
                                                    <input type="number" className="w-full px-2 py-1 rounded border text-sm" style={{ borderColor: theme.colors.border, backgroundColor: theme.colors.surface, color: theme.colors.text }}
                                                        value={item.received_quantity} onChange={e => updateItem(i, 'received_quantity', Number(e.target.value))} />
                                                </div>
                                                <div>
                                                    <label className="text-xs" style={{ color: theme.colors.textSecondary }}>Rejected</label>
                                                    <input type="number" className="w-full px-2 py-1 rounded border text-sm" style={{ borderColor: theme.colors.border, backgroundColor: theme.colors.surface, color: theme.colors.text }}
                                                        value={item.rejected_quantity} onChange={e => updateItem(i, 'rejected_quantity', Number(e.target.value))} />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className="flex justify-end gap-2 mt-5">
                                <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm rounded-lg border" style={{ borderColor: theme.colors.border, color: theme.colors.textSecondary }}>Cancel</button>
                                <button onClick={() => createMutation.mutate(form)} disabled={createMutation.isPending || !form.purchase_order_id}
                                    className="px-4 py-2 text-sm rounded-lg text-white" style={{ backgroundColor: theme.colors.primary }}>
                                    {createMutation.isPending ? 'Creating...' : 'Create GRN'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
