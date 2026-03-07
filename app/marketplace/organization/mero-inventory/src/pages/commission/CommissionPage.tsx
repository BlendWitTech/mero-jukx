import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTheme } from '@frontend/contexts/ThemeContext';
import { useAppContext } from '../../contexts/AppContext';
import { Plus, DollarSign, Trash2, CheckCircle } from 'lucide-react';
import toast from '@shared/frontend/hooks/useToast';

export default function CommissionPage() {
    const { theme } = useTheme();
    const { apiCall } = useAppContext();
    const queryClient = useQueryClient();

    const [activeTab, setActiveTab] = useState<'rules' | 'records'>('rules');
    const [showAddRule, setShowAddRule] = useState(false);
    const [newRule, setNewRule] = useState({
        name: '',
        commission_type: 'percentage',
        rate: 5,
        applies_to: 'all_products',
        category: '',
        min_sale_amount: '',
    });

    const { data: rules = [] } = useQuery({
        queryKey: ['commission-rules'],
        queryFn: () => apiCall('GET', '/inventory/commission/rules'),
    });

    const { data: records = [] } = useQuery({
        queryKey: ['commission-records'],
        queryFn: () => apiCall('GET', '/inventory/commission/records'),
        enabled: activeTab === 'records',
    });

    const { data: summary } = useQuery({
        queryKey: ['commission-summary'],
        queryFn: () => apiCall('GET', '/inventory/commission/summary'),
    });

    const createRuleMutation = useMutation({
        mutationFn: (data: any) => apiCall('POST', '/inventory/commission/rules', data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['commission-rules'] });
            setShowAddRule(false);
            setNewRule({ name: '', commission_type: 'percentage', rate: 5, applies_to: 'all_products', category: '', min_sale_amount: '' });
            toast.success('Commission rule created');
        },
    });

    const deleteRuleMutation = useMutation({
        mutationFn: (id: string) => apiCall('DELETE', `/inventory/commission/rules/${id}`),
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['commission-rules'] }); toast.success('Rule deleted'); },
    });

    const markPaidMutation = useMutation({
        mutationFn: (id: string) => apiCall('POST', `/inventory/commission/records/${id}/mark-paid`),
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['commission-records', 'commission-summary'] }); toast.success('Marked as paid'); },
    });

    const toggleRuleMutation = useMutation({
        mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
            apiCall('PATCH', `/inventory/commission/rules/${id}`, { is_active }),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['commission-rules'] }),
    });

    const s = summary as any;

    return (
        <div className="flex-1 overflow-auto p-6" style={{ backgroundColor: theme.colors.background }}>
            <div className="max-w-6xl mx-auto">
                <h1 className="text-2xl font-bold mb-1" style={{ color: theme.colors.text }}>Sales Commission</h1>
                <p className="text-sm mb-6" style={{ color: theme.colors.textSecondary }}>Define commission rules and track payouts</p>

                {/* Summary Cards */}
                <div className="grid grid-cols-4 gap-4 mb-6">
                    {[
                        { label: 'Pending Commission', value: `NPR ${Number(s?.totalPending || 0).toLocaleString()}`, color: '#d97706' },
                        { label: 'Paid Commission', value: `NPR ${Number(s?.totalPaid || 0).toLocaleString()}`, color: '#16a34a' },
                        { label: 'Pending Records', value: s?.countPending || 0, color: theme.colors.primary },
                        { label: 'Active Rules', value: (rules as any[]).filter((r: any) => r.is_active).length, color: theme.colors.primary },
                    ].map(c => (
                        <div key={c.label} className="rounded-lg border p-4" style={{ borderColor: theme.colors.border, backgroundColor: theme.colors.surface }}>
                            <p className="text-xs font-medium mb-1" style={{ color: theme.colors.textSecondary }}>{c.label}</p>
                            <p className="text-xl font-bold" style={{ color: c.color }}>{c.value}</p>
                        </div>
                    ))}
                </div>

                {/* Tabs */}
                <div className="flex gap-2 mb-4">
                    {(['rules', 'records'] as const).map(tab => (
                        <button key={tab} onClick={() => setActiveTab(tab)}
                            className="px-4 py-2 text-sm rounded-lg font-medium capitalize"
                            style={{ backgroundColor: activeTab === tab ? theme.colors.primary : theme.colors.surface, color: activeTab === tab ? '#fff' : theme.colors.textSecondary, border: `1px solid ${theme.colors.border}` }}>
                            {tab}
                        </button>
                    ))}
                    <div className="flex-1" />
                    {activeTab === 'rules' && (
                        <button onClick={() => setShowAddRule(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium" style={{ backgroundColor: theme.colors.primary }}>
                            <Plus className="h-4 w-4" /> Add Rule
                        </button>
                    )}
                </div>

                {/* Rules Tab */}
                {activeTab === 'rules' && (
                    <div className="rounded-lg border overflow-hidden" style={{ borderColor: theme.colors.border }}>
                        {(rules as any[]).length === 0 ? (
                            <div className="text-center py-12" style={{ color: theme.colors.textSecondary }}>
                                <DollarSign className="h-10 w-10 mx-auto mb-2 opacity-30" />
                                <p>No commission rules. Add one to start tracking commissions.</p>
                            </div>
                        ) : (
                            <table className="w-full">
                                <thead style={{ backgroundColor: theme.colors.surface }}>
                                    <tr>
                                        {['Rule Name', 'Type', 'Rate', 'Applies To', 'Min Amount', 'Active', 'Actions'].map(h => (
                                            <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase" style={{ color: theme.colors.textSecondary }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody style={{ backgroundColor: theme.colors.background }}>
                                    {(rules as any[]).map((rule: any) => (
                                        <tr key={rule.id} className="border-t" style={{ borderColor: theme.colors.border }}>
                                            <td className="px-4 py-3 font-medium text-sm" style={{ color: theme.colors.text }}>{rule.name}</td>
                                            <td className="px-4 py-3 text-sm capitalize" style={{ color: theme.colors.textSecondary }}>{rule.commission_type}</td>
                                            <td className="px-4 py-3 text-sm font-semibold" style={{ color: theme.colors.primary }}>
                                                {rule.commission_type === 'percentage' ? `${rule.rate}%` : `NPR ${rule.rate}`}
                                            </td>
                                            <td className="px-4 py-3 text-sm" style={{ color: theme.colors.textSecondary }}>
                                                {rule.applies_to === 'all_products' ? 'All Products' : rule.applies_to === 'category' ? `Category: ${rule.category}` : 'Specific Product'}
                                            </td>
                                            <td className="px-4 py-3 text-sm" style={{ color: theme.colors.textSecondary }}>{rule.min_sale_amount ? `NPR ${rule.min_sale_amount}` : '—'}</td>
                                            <td className="px-4 py-3">
                                                <button onClick={() => toggleRuleMutation.mutate({ id: rule.id, is_active: !rule.is_active })}
                                                    className={`w-10 h-5 rounded-full transition-colors ${rule.is_active ? 'bg-green-500' : 'bg-gray-300'}`}>
                                                    <span className={`block w-4 h-4 rounded-full bg-white shadow transform transition-transform ${rule.is_active ? 'translate-x-5' : 'translate-x-0.5'}`} />
                                                </button>
                                            </td>
                                            <td className="px-4 py-3">
                                                <button onClick={() => deleteRuleMutation.mutate(rule.id)} className="p-1 text-red-500 hover:bg-red-50 rounded">
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                )}

                {/* Records Tab */}
                {activeTab === 'records' && (
                    <div className="rounded-lg border overflow-hidden" style={{ borderColor: theme.colors.border }}>
                        {(records as any[]).length === 0 ? (
                            <div className="text-center py-12" style={{ color: theme.colors.textSecondary }}>No commission records yet.</div>
                        ) : (
                            <table className="w-full">
                                <thead style={{ backgroundColor: theme.colors.surface }}>
                                    <tr>
                                        {['Sales Person', 'Sale Amount', 'Rate', 'Commission', 'Status', 'Date', 'Actions'].map(h => (
                                            <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase" style={{ color: theme.colors.textSecondary }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody style={{ backgroundColor: theme.colors.background }}>
                                    {(records as any[]).map((r: any) => (
                                        <tr key={r.id} className="border-t" style={{ borderColor: theme.colors.border }}>
                                            <td className="px-4 py-3 text-sm" style={{ color: theme.colors.text }}>{r.sales_person || '—'}</td>
                                            <td className="px-4 py-3 text-sm" style={{ color: theme.colors.textSecondary }}>NPR {Number(r.sale_amount).toLocaleString()}</td>
                                            <td className="px-4 py-3 text-sm" style={{ color: theme.colors.textSecondary }}>{r.commission_rate}%</td>
                                            <td className="px-4 py-3 text-sm font-semibold" style={{ color: theme.colors.primary }}>NPR {Number(r.commission_amount).toLocaleString()}</td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${r.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{r.status}</span>
                                            </td>
                                            <td className="px-4 py-3 text-sm" style={{ color: theme.colors.textSecondary }}>{new Date(r.created_at).toLocaleDateString()}</td>
                                            <td className="px-4 py-3">
                                                {r.status === 'pending' && (
                                                    <button onClick={() => markPaidMutation.mutate(r.id)} className="flex items-center gap-1 px-2 py-1 text-xs rounded bg-green-50 text-green-700 hover:bg-green-100">
                                                        <CheckCircle className="h-3 w-3" /> Mark Paid
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                )}

                {/* Add Rule Modal */}
                {showAddRule && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <div className="w-full max-w-md rounded-xl shadow-xl p-6" style={{ backgroundColor: theme.colors.background }}>
                            <h2 className="text-lg font-semibold mb-4" style={{ color: theme.colors.text }}>Add Commission Rule</h2>
                            <div className="space-y-3">
                                <input className="w-full px-3 py-2 rounded-lg border text-sm" style={{ borderColor: theme.colors.border, backgroundColor: theme.colors.surface, color: theme.colors.text }}
                                    placeholder="Rule name" value={newRule.name} onChange={e => setNewRule(r => ({ ...r, name: e.target.value }))} />
                                <div className="grid grid-cols-2 gap-2">
                                    <select className="px-3 py-2 rounded-lg border text-sm" style={{ borderColor: theme.colors.border, backgroundColor: theme.colors.surface, color: theme.colors.text }}
                                        value={newRule.commission_type} onChange={e => setNewRule(r => ({ ...r, commission_type: e.target.value }))}>
                                        <option value="percentage">Percentage (%)</option>
                                        <option value="fixed">Fixed Amount</option>
                                    </select>
                                    <input type="number" className="px-3 py-2 rounded-lg border text-sm" style={{ borderColor: theme.colors.border, backgroundColor: theme.colors.surface, color: theme.colors.text }}
                                        placeholder={newRule.commission_type === 'percentage' ? 'Rate (%)' : 'Amount'} value={newRule.rate}
                                        onChange={e => setNewRule(r => ({ ...r, rate: Number(e.target.value) }))} />
                                </div>
                                <select className="w-full px-3 py-2 rounded-lg border text-sm" style={{ borderColor: theme.colors.border, backgroundColor: theme.colors.surface, color: theme.colors.text }}
                                    value={newRule.applies_to} onChange={e => setNewRule(r => ({ ...r, applies_to: e.target.value }))}>
                                    <option value="all_products">All Products</option>
                                    <option value="category">By Category</option>
                                </select>
                                {newRule.applies_to === 'category' && (
                                    <input className="w-full px-3 py-2 rounded-lg border text-sm" style={{ borderColor: theme.colors.border, backgroundColor: theme.colors.surface, color: theme.colors.text }}
                                        placeholder="Category name" value={newRule.category} onChange={e => setNewRule(r => ({ ...r, category: e.target.value }))} />
                                )}
                                <input type="number" className="w-full px-3 py-2 rounded-lg border text-sm" style={{ borderColor: theme.colors.border, backgroundColor: theme.colors.surface, color: theme.colors.text }}
                                    placeholder="Minimum sale amount (optional)" value={newRule.min_sale_amount}
                                    onChange={e => setNewRule(r => ({ ...r, min_sale_amount: e.target.value }))} />
                            </div>
                            <div className="flex justify-end gap-2 mt-5">
                                <button onClick={() => setShowAddRule(false)} className="px-4 py-2 text-sm rounded-lg border" style={{ borderColor: theme.colors.border, color: theme.colors.textSecondary }}>Cancel</button>
                                <button onClick={() => createRuleMutation.mutate({ ...newRule, rate: Number(newRule.rate), min_sale_amount: newRule.min_sale_amount ? Number(newRule.min_sale_amount) : undefined })}
                                    disabled={!newRule.name || createRuleMutation.isPending}
                                    className="px-4 py-2 text-sm rounded-lg text-white" style={{ backgroundColor: theme.colors.primary }}>
                                    {createRuleMutation.isPending ? 'Saving...' : 'Create Rule'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
