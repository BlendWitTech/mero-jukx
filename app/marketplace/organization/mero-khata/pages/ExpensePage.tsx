import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTheme } from '@/contexts/ThemeContext';
import { Plus, TrendingDown, Trash2, Filter } from 'lucide-react';
import * as khataService from '../services/khataService';

export default function ExpensePage() {
    const { theme } = useTheme();
    const queryClient = useQueryClient();

    const [showForm, setShowForm] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [form, setForm] = useState({
        amount: '',
        categoryId: '',
        paymentMethod: 'CASH',
        date: new Date().toISOString().split('T')[0],
        notes: '',
        reference: '',
    });

    const { data: categories = [] } = useQuery({
        queryKey: ['khata-categories', 'EXPENSE'],
        queryFn: () => khataService.getCategories('EXPENSE'),
    });

    const { data: entries = [], isLoading } = useQuery({
        queryKey: ['khata-entries', 'EXPENSE', startDate, endDate],
        queryFn: () => khataService.getEntries('EXPENSE', startDate || undefined, endDate || undefined),
    });

    const { data: summary } = useQuery({
        queryKey: ['khata-summary', startDate, endDate],
        queryFn: () => khataService.getEntrySummary(startDate || undefined, endDate || undefined),
    });

    const createMutation = useMutation({
        mutationFn: (data: any) => khataService.createEntry({ ...data, type: 'EXPENSE' }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['khata-entries'] });
            queryClient.invalidateQueries({ queryKey: ['khata-summary'] });
            setShowForm(false);
            setForm({ amount: '', categoryId: '', paymentMethod: 'CASH', date: new Date().toISOString().split('T')[0], notes: '', reference: '' });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: khataService.deleteEntry,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['khata-entries'] });
            queryClient.invalidateQueries({ queryKey: ['khata-summary'] });
        },
    });

    const filteredEntries = selectedCategory
        ? entries.filter((e) => e.categoryId === selectedCategory)
        : entries;

    return (
        <div className="p-6 max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
                        <TrendingDown className="w-6 h-6 text-red-600 dark:text-red-400" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold" style={{ color: theme.colors.text }}>Expenses</h1>
                        <p className="text-sm" style={{ color: theme.colors.textSecondary }}>Track all your expenses</p>
                    </div>
                </div>
                <button
                    onClick={() => setShowForm(true)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-white font-semibold text-sm"
                    style={{ backgroundColor: theme.colors.primary }}
                >
                    <Plus className="w-4 h-4" />
                    Add Expense
                </button>
            </div>

            {/* Summary Card */}
            <div className="rounded-xl p-4 mb-6 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800">
                <p className="text-sm font-medium text-red-600 dark:text-red-400 mb-1">Total Expenses</p>
                <p className="text-3xl font-bold text-red-700 dark:text-red-300">
                    Rs. {Number(summary?.totalExpense || 0).toLocaleString()}
                </p>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3 mb-4 p-4 rounded-xl border" style={{ borderColor: theme.colors.border, backgroundColor: theme.colors.surface }}>
                <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4" style={{ color: theme.colors.textSecondary }} />
                    <span className="text-sm font-medium" style={{ color: theme.colors.textSecondary }}>Filter:</span>
                </div>
                <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="text-sm px-3 py-1.5 rounded-lg border"
                    style={{ borderColor: theme.colors.border, backgroundColor: theme.colors.background, color: theme.colors.text }}
                >
                    <option value="">All Categories</option>
                    {categories.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                </select>
                <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="text-sm px-3 py-1.5 rounded-lg border"
                    style={{ borderColor: theme.colors.border, backgroundColor: theme.colors.background, color: theme.colors.text }}
                />
                <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="text-sm px-3 py-1.5 rounded-lg border"
                    style={{ borderColor: theme.colors.border, backgroundColor: theme.colors.background, color: theme.colors.text }}
                />
            </div>

            {/* Add Expense Form */}
            {showForm && (
                <div className="rounded-xl border p-6 mb-6" style={{ borderColor: theme.colors.border, backgroundColor: theme.colors.surface }}>
                    <h3 className="text-lg font-semibold mb-4" style={{ color: theme.colors.text }}>Add Expense Entry</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1" style={{ color: theme.colors.textSecondary }}>Amount (Rs.) *</label>
                            <input
                                type="number"
                                value={form.amount}
                                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                                placeholder="0.00"
                                className="w-full px-3 py-2 rounded-lg border text-sm"
                                style={{ borderColor: theme.colors.border, backgroundColor: theme.colors.background, color: theme.colors.text }}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1" style={{ color: theme.colors.textSecondary }}>Category</label>
                            <select
                                value={form.categoryId}
                                onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                                className="w-full px-3 py-2 rounded-lg border text-sm"
                                style={{ borderColor: theme.colors.border, backgroundColor: theme.colors.background, color: theme.colors.text }}
                            >
                                <option value="">Select Category</option>
                                {categories.map((c) => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1" style={{ color: theme.colors.textSecondary }}>Date *</label>
                            <input
                                type="date"
                                value={form.date}
                                onChange={(e) => setForm({ ...form, date: e.target.value })}
                                className="w-full px-3 py-2 rounded-lg border text-sm"
                                style={{ borderColor: theme.colors.border, backgroundColor: theme.colors.background, color: theme.colors.text }}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1" style={{ color: theme.colors.textSecondary }}>Payment Method</label>
                            <select
                                value={form.paymentMethod}
                                onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}
                                className="w-full px-3 py-2 rounded-lg border text-sm"
                                style={{ borderColor: theme.colors.border, backgroundColor: theme.colors.background, color: theme.colors.text }}
                            >
                                <option value="CASH">Cash</option>
                                <option value="BANK_TRANSFER">Bank Transfer</option>
                                <option value="CHEQUE">Cheque</option>
                                <option value="ESEWA">eSewa</option>
                                <option value="KHALTI">Khalti</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1" style={{ color: theme.colors.textSecondary }}>Reference</label>
                            <input
                                type="text"
                                value={form.reference}
                                onChange={(e) => setForm({ ...form, reference: e.target.value })}
                                placeholder="Bill #, Receipt #..."
                                className="w-full px-3 py-2 rounded-lg border text-sm"
                                style={{ borderColor: theme.colors.border, backgroundColor: theme.colors.background, color: theme.colors.text }}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1" style={{ color: theme.colors.textSecondary }}>Notes</label>
                            <input
                                type="text"
                                value={form.notes}
                                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                                placeholder="Optional notes..."
                                className="w-full px-3 py-2 rounded-lg border text-sm"
                                style={{ borderColor: theme.colors.border, backgroundColor: theme.colors.background, color: theme.colors.text }}
                            />
                        </div>
                    </div>
                    <div className="flex gap-3 mt-4">
                        <button
                            onClick={() => createMutation.mutate(form)}
                            disabled={!form.amount || !form.date || createMutation.isPending}
                            className="px-4 py-2 rounded-lg text-white font-semibold text-sm disabled:opacity-50"
                            style={{ backgroundColor: theme.colors.primary }}
                        >
                            {createMutation.isPending ? 'Saving...' : 'Save Entry'}
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

            {/* Entries List */}
            {isLoading ? (
                <div className="text-center py-12" style={{ color: theme.colors.textSecondary }}>Loading entries...</div>
            ) : filteredEntries.length === 0 ? (
                <div className="text-center py-16 rounded-xl border" style={{ borderColor: theme.colors.border }}>
                    <TrendingDown className="w-12 h-12 mx-auto mb-3 opacity-30" style={{ color: theme.colors.textSecondary }} />
                    <p className="font-medium" style={{ color: theme.colors.text }}>No expense entries yet</p>
                    <p className="text-sm mt-1" style={{ color: theme.colors.textSecondary }}>Click "Add Expense" to record your first entry</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {filteredEntries.map((entry) => (
                        <div
                            key={entry.id}
                            className="flex items-center justify-between p-4 rounded-xl border"
                            style={{ borderColor: theme.colors.border, backgroundColor: theme.colors.surface }}
                        >
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-semibold" style={{ color: theme.colors.text }}>
                                        Rs. {Number(entry.amount).toLocaleString()}
                                    </span>
                                    {entry.category && (
                                        <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300">
                                            {entry.category.name}
                                        </span>
                                    )}
                                    {entry.paymentMethod && (
                                        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400">
                                            {entry.paymentMethod.replace('_', ' ')}
                                        </span>
                                    )}
                                </div>
                                {entry.notes && (
                                    <p className="text-xs mt-0.5 truncate" style={{ color: theme.colors.textSecondary }}>{entry.notes}</p>
                                )}
                                <p className="text-xs mt-0.5" style={{ color: theme.colors.textSecondary }}>
                                    {new Date(entry.date).toLocaleDateString('en-NP', { year: 'numeric', month: 'short', day: 'numeric' })}
                                    {entry.reference && ` · ${entry.reference}`}
                                </p>
                            </div>
                            <button
                                onClick={() => deleteMutation.mutate(entry.id)}
                                className="p-2 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors ml-3"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
