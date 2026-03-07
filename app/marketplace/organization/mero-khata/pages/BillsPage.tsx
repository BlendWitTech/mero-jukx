import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTheme } from '@/contexts/ThemeContext';
import { Plus, Receipt, Trash2, Edit2, ChevronDown, ChevronUp, X } from 'lucide-react';
import * as khataService from '../services/khataService';
import type { KhataBill, InvoiceItem } from '../services/khataService';

const STATUS_COLORS: Record<string, string> = {
    PENDING: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    PAID: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    OVERDUE: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
};

const emptyForm = () => ({
    supplierName: '',
    supplierPhone: '',
    items: [{ description: '', quantity: 1, rate: 0, amount: 0 }] as InvoiceItem[],
    vatAmount: 0,
    dueDate: '',
    notes: '',
    status: 'PENDING' as const,
});

export default function BillsPage() {
    const { theme } = useTheme();
    const queryClient = useQueryClient();
    const [statusFilter, setStatusFilter] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [form, setForm] = useState(emptyForm());

    const { data: bills = [], isLoading } = useQuery({
        queryKey: ['khata-bills', statusFilter],
        queryFn: () => khataService.getBills(statusFilter || undefined),
    });

    const createMutation = useMutation({
        mutationFn: (data: any) => editingId
            ? khataService.updateBill(editingId, data)
            : khataService.createBill(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['khata-bills'] });
            setShowForm(false);
            setEditingId(null);
            setForm(emptyForm());
        },
    });

    const deleteMutation = useMutation({
        mutationFn: khataService.deleteBill,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['khata-bills'] }),
    });

    const updateItem = (index: number, field: keyof InvoiceItem, value: string | number) => {
        const items = [...form.items];
        items[index] = { ...items[index], [field]: value };
        if (field === 'quantity' || field === 'rate') {
            items[index].amount = Number(items[index].quantity) * Number(items[index].rate);
        }
        setForm((prev) => ({ ...prev, items }));
    };

    const addItem = () => {
        setForm({ ...form, items: [...form.items, { description: '', quantity: 1, rate: 0, amount: 0 }] });
    };

    const removeItem = (index: number) => {
        setForm({ ...form, items: form.items.filter((_, i) => i !== index) });
    };

    const subtotal = form.items.reduce((sum, item) => sum + Number(item.amount), 0);
    const total = subtotal + Number(form.vatAmount);

    const handleEdit = (bill: KhataBill) => {
        setForm({
            supplierName: bill.supplierName,
            supplierPhone: bill.supplierPhone || '',
            items: bill.items,
            vatAmount: bill.vatAmount,
            dueDate: bill.dueDate || '',
            notes: bill.notes || '',
            status: bill.status,
        });
        setEditingId(bill.id);
        setShowForm(true);
    };

    const handleSubmit = () => {
        createMutation.mutate({ ...form, subtotal, total });
    };

    return (
        <div className="p-6 max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30">
                        <Receipt className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold" style={{ color: theme.colors.text }}>Bills</h1>
                        <p className="text-sm" style={{ color: theme.colors.textSecondary }}>Track bills from suppliers</p>
                    </div>
                </div>
                <button
                    onClick={() => { setForm(emptyForm()); setEditingId(null); setShowForm(true); }}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-white font-semibold text-sm"
                    style={{ backgroundColor: theme.colors.primary }}
                >
                    <Plus className="w-4 h-4" />
                    New Bill
                </button>
            </div>

            {/* Status Filter */}
            <div className="flex gap-2 mb-6">
                {['', 'PENDING', 'PAID', 'OVERDUE'].map((s) => (
                    <button
                        key={s}
                        onClick={() => setStatusFilter(s)}
                        className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                        style={{
                            backgroundColor: statusFilter === s ? theme.colors.primary : theme.colors.surface,
                            color: statusFilter === s ? '#fff' : theme.colors.textSecondary,
                            border: `1px solid ${theme.colors.border}`,
                        }}
                    >
                        {s || 'All'}
                    </button>
                ))}
            </div>

            {/* Bill Form */}
            {showForm && (
                <div className="rounded-xl border p-6 mb-6" style={{ borderColor: theme.colors.border, backgroundColor: theme.colors.surface }}>
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold" style={{ color: theme.colors.text }}>
                            {editingId ? 'Edit Bill' : 'New Bill'}
                        </h3>
                        <button onClick={() => setShowForm(false)} style={{ color: theme.colors.textSecondary }}>
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div>
                            <label className="block text-sm font-medium mb-1" style={{ color: theme.colors.textSecondary }}>Supplier Name *</label>
                            <input
                                type="text"
                                value={form.supplierName}
                                onChange={(e) => setForm({ ...form, supplierName: e.target.value })}
                                className="w-full px-3 py-2 rounded-lg border text-sm"
                                style={{ borderColor: theme.colors.border, backgroundColor: theme.colors.background, color: theme.colors.text }}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1" style={{ color: theme.colors.textSecondary }}>Phone</label>
                            <input
                                type="text"
                                value={form.supplierPhone}
                                onChange={(e) => setForm({ ...form, supplierPhone: e.target.value })}
                                className="w-full px-3 py-2 rounded-lg border text-sm"
                                style={{ borderColor: theme.colors.border, backgroundColor: theme.colors.background, color: theme.colors.text }}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1" style={{ color: theme.colors.textSecondary }}>Due Date</label>
                            <input
                                type="date"
                                value={form.dueDate}
                                onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                                className="w-full px-3 py-2 rounded-lg border text-sm"
                                style={{ borderColor: theme.colors.border, backgroundColor: theme.colors.background, color: theme.colors.text }}
                            />
                        </div>
                    </div>

                    {/* Line Items */}
                    <div className="mb-4">
                        <div className="flex justify-between items-center mb-2">
                            <h4 className="text-sm font-semibold" style={{ color: theme.colors.text }}>Items</h4>
                            <button onClick={addItem} className="text-xs font-medium" style={{ color: theme.colors.primary }}>+ Add Row</button>
                        </div>
                        <div className="space-y-2">
                            {form.items.map((item, index) => (
                                <div key={index} className="grid grid-cols-12 gap-2 items-center">
                                    <input
                                        type="text"
                                        value={item.description}
                                        onChange={(e) => updateItem(index, 'description', e.target.value)}
                                        placeholder="Description"
                                        className="col-span-5 px-3 py-2 rounded-lg border text-sm"
                                        style={{ borderColor: theme.colors.border, backgroundColor: theme.colors.background, color: theme.colors.text }}
                                    />
                                    <input
                                        type="number"
                                        value={item.quantity}
                                        onChange={(e) => updateItem(index, 'quantity', Number(e.target.value))}
                                        placeholder="Qty"
                                        className="col-span-2 px-3 py-2 rounded-lg border text-sm"
                                        style={{ borderColor: theme.colors.border, backgroundColor: theme.colors.background, color: theme.colors.text }}
                                    />
                                    <input
                                        type="number"
                                        value={item.rate}
                                        onChange={(e) => updateItem(index, 'rate', Number(e.target.value))}
                                        placeholder="Rate"
                                        className="col-span-2 px-3 py-2 rounded-lg border text-sm"
                                        style={{ borderColor: theme.colors.border, backgroundColor: theme.colors.background, color: theme.colors.text }}
                                    />
                                    <div className="col-span-2 text-sm text-right font-medium" style={{ color: theme.colors.text }}>
                                        Rs. {Number(item.amount).toLocaleString()}
                                    </div>
                                    <button onClick={() => removeItem(index)} className="col-span-1 flex justify-center text-red-400 hover:text-red-600">
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* VAT + Totals */}
                    <div className="flex justify-end mb-4">
                        <div className="w-64 space-y-2">
                            <div className="flex justify-between text-sm" style={{ color: theme.colors.textSecondary }}>
                                <span>Subtotal</span>
                                <span>Rs. {subtotal.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-sm items-center" style={{ color: theme.colors.textSecondary }}>
                                <span>VAT Amount (Rs.)</span>
                                <input
                                    type="number"
                                    value={form.vatAmount}
                                    onChange={(e) => setForm({ ...form, vatAmount: Number(e.target.value) })}
                                    className="w-24 px-2 py-1 rounded border text-right text-sm"
                                    style={{ borderColor: theme.colors.border, backgroundColor: theme.colors.background, color: theme.colors.text }}
                                />
                            </div>
                            <div className="flex justify-between font-bold border-t pt-1" style={{ color: theme.colors.text, borderColor: theme.colors.border }}>
                                <span>Total</span>
                                <span>Rs. {total.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={handleSubmit}
                            disabled={!form.supplierName || createMutation.isPending}
                            className="px-4 py-2 rounded-lg text-white font-semibold text-sm disabled:opacity-50"
                            style={{ backgroundColor: theme.colors.primary }}
                        >
                            {createMutation.isPending ? 'Saving...' : (editingId ? 'Update Bill' : 'Create Bill')}
                        </button>
                        <button
                            onClick={() => setShowForm(false)}
                            className="px-4 py-2 rounded-lg font-semibold text-sm border"
                            style={{ borderColor: theme.colors.border, color: theme.colors.textSecondary }}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* Bills List */}
            {isLoading ? (
                <div className="text-center py-12" style={{ color: theme.colors.textSecondary }}>Loading bills...</div>
            ) : bills.length === 0 ? (
                <div className="text-center py-16 rounded-xl border" style={{ borderColor: theme.colors.border }}>
                    <Receipt className="w-12 h-12 mx-auto mb-3 opacity-30" style={{ color: theme.colors.textSecondary }} />
                    <p className="font-medium" style={{ color: theme.colors.text }}>No bills yet</p>
                    <p className="text-sm mt-1" style={{ color: theme.colors.textSecondary }}>Add supplier bills to track payables</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {bills.map((bill) => (
                        <div
                            key={bill.id}
                            className="rounded-xl border overflow-hidden"
                            style={{ borderColor: theme.colors.border, backgroundColor: theme.colors.surface }}
                        >
                            <div
                                className="flex items-center justify-between p-4 cursor-pointer"
                                onClick={() => setExpandedId(expandedId === bill.id ? null : bill.id)}
                            >
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-semibold text-sm" style={{ color: theme.colors.text }}>{bill.billNumber}</span>
                                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[bill.status]}`}>
                                            {bill.status}
                                        </span>
                                    </div>
                                    <p className="text-xs mt-0.5" style={{ color: theme.colors.textSecondary }}>
                                        {bill.supplierName} · {new Date(bill.createdAt).toLocaleDateString()}
                                    </p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="font-bold" style={{ color: theme.colors.text }}>Rs. {Number(bill.total).toLocaleString()}</span>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleEdit(bill); }}
                                        className="p-1.5 rounded text-slate-400 hover:text-slate-600"
                                    >
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(bill.id); }}
                                        className="p-1.5 rounded text-red-400 hover:text-red-600"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                    {expandedId === bill.id ? <ChevronUp className="w-4 h-4" style={{ color: theme.colors.textSecondary }} /> : <ChevronDown className="w-4 h-4" style={{ color: theme.colors.textSecondary }} />}
                                </div>
                            </div>

                            {expandedId === bill.id && (
                                <div className="px-4 pb-4 border-t" style={{ borderColor: theme.colors.border }}>
                                    <table className="w-full mt-3 text-sm">
                                        <thead>
                                            <tr style={{ color: theme.colors.textSecondary }}>
                                                <th className="text-left pb-2">Description</th>
                                                <th className="text-right pb-2">Qty</th>
                                                <th className="text-right pb-2">Rate</th>
                                                <th className="text-right pb-2">Amount</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {bill.items.map((item, i) => (
                                                <tr key={i} style={{ color: theme.colors.text }}>
                                                    <td className="py-1">{item.description}</td>
                                                    <td className="text-right py-1">{item.quantity}</td>
                                                    <td className="text-right py-1">Rs. {Number(item.rate).toLocaleString()}</td>
                                                    <td className="text-right py-1">Rs. {Number(item.amount).toLocaleString()}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    <div className="flex justify-end mt-2 text-sm gap-4" style={{ color: theme.colors.textSecondary }}>
                                        <span>VAT: Rs. {Number(bill.vatAmount).toLocaleString()}</span>
                                        <span className="font-bold" style={{ color: theme.colors.text }}>Total: Rs. {Number(bill.total).toLocaleString()}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
