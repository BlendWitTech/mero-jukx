import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTheme } from '@frontend/contexts/ThemeContext';
import { useAppContext } from '../../contexts/AppContext';
import { Plus, FileText, CheckCircle, XCircle, ArrowRight, Trash2, ChevronDown } from 'lucide-react';
import toast from '@shared/frontend/hooks/useToast';

const statusColors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-700',
    pending: 'bg-yellow-100 text-yellow-700',
    approved: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
    converted: 'bg-blue-100 text-blue-700',
};

export default function PurchaseRequisitionsPage() {
    const { theme } = useTheme();
    const { apiCall } = useAppContext();
    const queryClient = useQueryClient();

    const [showCreate, setShowCreate] = useState(false);
    const [showConvert, setShowConvert] = useState<string | null>(null);
    const [showReject, setShowReject] = useState<string | null>(null);
    const [rejectionReason, setRejectionReason] = useState('');
    const [supplierId, setSupplierId] = useState('');
    const [form, setForm] = useState({
        title: '',
        reason: '',
        required_by_date: '',
        items: [{ product_id: '', product_name: '', quantity: 1, unit: 'pcs', estimated_unit_price: 0 }],
    });

    const { data: prs = [], isLoading } = useQuery({
        queryKey: ['purchase-requisitions'],
        queryFn: () => apiCall('GET', '/inventory/purchase-requisitions'),
    });

    const { data: suppliers = [] } = useQuery({
        queryKey: ['suppliers'],
        queryFn: () => apiCall('GET', '/inventory/suppliers'),
    });

    const createMutation = useMutation({
        mutationFn: (data: any) => apiCall('POST', '/inventory/purchase-requisitions', data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['purchase-requisitions'] });
            setShowCreate(false);
            setForm({ title: '', reason: '', required_by_date: '', items: [{ product_id: '', product_name: '', quantity: 1, unit: 'pcs', estimated_unit_price: 0 }] });
            toast.success('Purchase Requisition created');
        },
        onError: () => toast.error('Failed to create PR'),
    });

    const submitMutation = useMutation({
        mutationFn: (id: string) => apiCall('POST', `/inventory/purchase-requisitions/${id}/submit`),
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['purchase-requisitions'] }); toast.success('PR submitted for approval'); },
    });

    const approveMutation = useMutation({
        mutationFn: (id: string) => apiCall('POST', `/inventory/purchase-requisitions/${id}/approve`),
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['purchase-requisitions'] }); toast.success('PR approved'); },
    });

    const rejectMutation = useMutation({
        mutationFn: ({ id, reason }: { id: string; reason: string }) =>
            apiCall('POST', `/inventory/purchase-requisitions/${id}/reject`, { rejection_reason: reason }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['purchase-requisitions'] });
            setShowReject(null);
            setRejectionReason('');
            toast.success('PR rejected');
        },
    });

    const convertMutation = useMutation({
        mutationFn: ({ id, supplierId }: { id: string; supplierId: string }) =>
            apiCall('POST', `/inventory/purchase-requisitions/${id}/convert-to-po`, { supplierId }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['purchase-requisitions'] });
            setShowConvert(null);
            setSupplierId('');
            toast.success('PR converted to Purchase Order');
        },
        onError: () => toast.error('Failed to convert PR'),
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => apiCall('DELETE', `/inventory/purchase-requisitions/${id}`),
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['purchase-requisitions'] }); toast.success('PR deleted'); },
    });

    const addItem = () => setForm(f => ({
        ...f, items: [...f.items, { product_id: '', product_name: '', quantity: 1, unit: 'pcs', estimated_unit_price: 0 }],
    }));
    const removeItem = (i: number) => setForm(f => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }));
    const updateItem = (i: number, field: string, value: any) => setForm(f => ({
        ...f, items: f.items.map((item, idx) => idx === i ? { ...item, [field]: value } : item),
    }));

    return (
        <div className="flex-1 overflow-auto p-6" style={{ backgroundColor: theme.colors.background }}>
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold" style={{ color: theme.colors.text }}>Purchase Requisitions</h1>
                        <p className="text-sm mt-1" style={{ color: theme.colors.textSecondary }}>Internal purchase requests with approval workflow</p>
                    </div>
                    <button
                        onClick={() => setShowCreate(true)}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium"
                        style={{ backgroundColor: theme.colors.primary }}
                    >
                        <Plus className="h-4 w-4" /> New Requisition
                    </button>
                </div>

                {/* List */}
                {isLoading ? (
                    <div className="text-center py-12" style={{ color: theme.colors.textSecondary }}>Loading...</div>
                ) : (prs as any[]).length === 0 ? (
                    <div className="text-center py-16" style={{ color: theme.colors.textSecondary }}>
                        <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
                        <p className="font-medium">No purchase requisitions yet</p>
                        <p className="text-sm mt-1">Create one to start the procurement process</p>
                    </div>
                ) : (
                    <div className="rounded-lg border overflow-hidden" style={{ borderColor: theme.colors.border }}>
                        <table className="w-full">
                            <thead style={{ backgroundColor: theme.colors.surface }}>
                                <tr>
                                    {['PR Number', 'Title', 'Required By', 'Total', 'Status', 'Actions'].map(h => (
                                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: theme.colors.textSecondary }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody style={{ backgroundColor: theme.colors.background }}>
                                {(prs as any[]).map((pr: any) => (
                                    <tr key={pr.id} className="border-t" style={{ borderColor: theme.colors.border }}>
                                        <td className="px-4 py-3 font-mono text-sm font-semibold" style={{ color: theme.colors.text }}>{pr.pr_number}</td>
                                        <td className="px-4 py-3 text-sm" style={{ color: theme.colors.text }}>{pr.title || '—'}</td>
                                        <td className="px-4 py-3 text-sm" style={{ color: theme.colors.textSecondary }}>{pr.required_by_date || '—'}</td>
                                        <td className="px-4 py-3 text-sm font-medium" style={{ color: theme.colors.text }}>NPR {Number(pr.total_amount || 0).toLocaleString()}</td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[pr.status] || 'bg-gray-100 text-gray-600'}`}>
                                                {pr.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-1">
                                                {pr.status === 'draft' && (
                                                    <button onClick={() => submitMutation.mutate(pr.id)} className="px-2 py-1 text-xs rounded bg-yellow-100 text-yellow-700 hover:bg-yellow-200">Submit</button>
                                                )}
                                                {pr.status === 'pending' && (
                                                    <>
                                                        <button onClick={() => approveMutation.mutate(pr.id)} className="px-2 py-1 text-xs rounded bg-green-100 text-green-700 hover:bg-green-200">Approve</button>
                                                        <button onClick={() => setShowReject(pr.id)} className="px-2 py-1 text-xs rounded bg-red-100 text-red-700 hover:bg-red-200">Reject</button>
                                                    </>
                                                )}
                                                {pr.status === 'approved' && (
                                                    <button onClick={() => setShowConvert(pr.id)} className="flex items-center gap-1 px-2 py-1 text-xs rounded bg-blue-100 text-blue-700 hover:bg-blue-200">
                                                        <ArrowRight className="h-3 w-3" /> Convert to PO
                                                    </button>
                                                )}
                                                {(pr.status === 'draft' || pr.status === 'rejected') && (
                                                    <button onClick={() => deleteMutation.mutate(pr.id)} className="p-1 rounded hover:bg-red-50 text-red-500">
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Create Modal */}
                {showCreate && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <div className="w-full max-w-2xl rounded-xl shadow-xl max-h-[90vh] overflow-y-auto" style={{ backgroundColor: theme.colors.background }}>
                            <div className="p-6">
                                <h2 className="text-lg font-semibold mb-4" style={{ color: theme.colors.text }}>New Purchase Requisition</h2>
                                <div className="space-y-3">
                                    <input className="w-full px-3 py-2 rounded-lg border text-sm" style={{ borderColor: theme.colors.border, backgroundColor: theme.colors.surface, color: theme.colors.text }}
                                        placeholder="Title" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
                                    <textarea className="w-full px-3 py-2 rounded-lg border text-sm" rows={2} style={{ borderColor: theme.colors.border, backgroundColor: theme.colors.surface, color: theme.colors.text }}
                                        placeholder="Reason / Justification" value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} />
                                    <div>
                                        <label className="text-xs font-medium mb-1 block" style={{ color: theme.colors.textSecondary }}>Required By Date</label>
                                        <input type="date" className="w-full px-3 py-2 rounded-lg border text-sm" style={{ borderColor: theme.colors.border, backgroundColor: theme.colors.surface, color: theme.colors.text }}
                                            value={form.required_by_date} onChange={e => setForm(f => ({ ...f, required_by_date: e.target.value }))} />
                                    </div>
                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <label className="text-sm font-medium" style={{ color: theme.colors.text }}>Items</label>
                                            <button onClick={addItem} className="text-xs px-2 py-1 rounded" style={{ backgroundColor: theme.colors.primary, color: 'white' }}>+ Add Item</button>
                                        </div>
                                        {form.items.map((item, i) => (
                                            <div key={i} className="grid grid-cols-12 gap-2 mb-2">
                                                <input className="col-span-4 px-2 py-1.5 rounded border text-xs" style={{ borderColor: theme.colors.border, backgroundColor: theme.colors.surface, color: theme.colors.text }}
                                                    placeholder="Product name" value={item.product_name} onChange={e => updateItem(i, 'product_name', e.target.value)} />
                                                <input type="number" className="col-span-2 px-2 py-1.5 rounded border text-xs" style={{ borderColor: theme.colors.border, backgroundColor: theme.colors.surface, color: theme.colors.text }}
                                                    placeholder="Qty" value={item.quantity} onChange={e => updateItem(i, 'quantity', Number(e.target.value))} />
                                                <input className="col-span-2 px-2 py-1.5 rounded border text-xs" style={{ borderColor: theme.colors.border, backgroundColor: theme.colors.surface, color: theme.colors.text }}
                                                    placeholder="Unit" value={item.unit} onChange={e => updateItem(i, 'unit', e.target.value)} />
                                                <input type="number" className="col-span-3 px-2 py-1.5 rounded border text-xs" style={{ borderColor: theme.colors.border, backgroundColor: theme.colors.surface, color: theme.colors.text }}
                                                    placeholder="Est. Price" value={item.estimated_unit_price} onChange={e => updateItem(i, 'estimated_unit_price', Number(e.target.value))} />
                                                <button onClick={() => removeItem(i)} className="col-span-1 flex items-center justify-center text-red-500 hover:bg-red-50 rounded">
                                                    <XCircle className="h-4 w-4" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex justify-end gap-2 mt-5">
                                    <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm rounded-lg border" style={{ borderColor: theme.colors.border, color: theme.colors.textSecondary }}>Cancel</button>
                                    <button onClick={() => createMutation.mutate(form)} disabled={createMutation.isPending}
                                        className="px-4 py-2 text-sm rounded-lg text-white" style={{ backgroundColor: theme.colors.primary }}>
                                        {createMutation.isPending ? 'Creating...' : 'Create PR'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Reject Modal */}
                {showReject && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <div className="w-full max-w-md rounded-xl shadow-xl p-6" style={{ backgroundColor: theme.colors.background }}>
                            <h2 className="text-lg font-semibold mb-3" style={{ color: theme.colors.text }}>Reject Requisition</h2>
                            <textarea className="w-full px-3 py-2 rounded-lg border text-sm" rows={3} style={{ borderColor: theme.colors.border, backgroundColor: theme.colors.surface, color: theme.colors.text }}
                                placeholder="Reason for rejection..." value={rejectionReason} onChange={e => setRejectionReason(e.target.value)} />
                            <div className="flex justify-end gap-2 mt-4">
                                <button onClick={() => setShowReject(null)} className="px-4 py-2 text-sm rounded-lg border" style={{ borderColor: theme.colors.border, color: theme.colors.textSecondary }}>Cancel</button>
                                <button onClick={() => rejectMutation.mutate({ id: showReject, reason: rejectionReason })} className="px-4 py-2 text-sm rounded-lg bg-red-600 text-white">Reject</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Convert to PO Modal */}
                {showConvert && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <div className="w-full max-w-md rounded-xl shadow-xl p-6" style={{ backgroundColor: theme.colors.background }}>
                            <h2 className="text-lg font-semibold mb-3" style={{ color: theme.colors.text }}>Convert to Purchase Order</h2>
                            <label className="text-sm font-medium block mb-1" style={{ color: theme.colors.textSecondary }}>Select Supplier</label>
                            <select className="w-full px-3 py-2 rounded-lg border text-sm" style={{ borderColor: theme.colors.border, backgroundColor: theme.colors.surface, color: theme.colors.text }}
                                value={supplierId} onChange={e => setSupplierId(e.target.value)}>
                                <option value="">— Select supplier —</option>
                                {(suppliers as any[]).map((s: any) => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                            </select>
                            <div className="flex justify-end gap-2 mt-4">
                                <button onClick={() => setShowConvert(null)} className="px-4 py-2 text-sm rounded-lg border" style={{ borderColor: theme.colors.border, color: theme.colors.textSecondary }}>Cancel</button>
                                <button onClick={() => convertMutation.mutate({ id: showConvert, supplierId })} disabled={!supplierId || convertMutation.isPending}
                                    className="px-4 py-2 text-sm rounded-lg text-white" style={{ backgroundColor: theme.colors.primary }}>
                                    {convertMutation.isPending ? 'Converting...' : 'Convert to PO'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
