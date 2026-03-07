import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTheme } from '@/contexts/ThemeContext';
import { Settings, Plus, Trash2, TrendingUp, TrendingDown, Zap } from 'lucide-react';
import * as khataService from '../services/khataService';
import type { KhataCategory } from '../services/khataService';

export default function SettingsPage() {
    const { theme } = useTheme();
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState<'INCOME' | 'EXPENSE'>('INCOME');
    const [newCategoryName, setNewCategoryName] = useState('');

    const { data: incomeCategories = [] } = useQuery({
        queryKey: ['khata-categories', 'INCOME'],
        queryFn: () => khataService.getCategories('INCOME'),
    });

    const { data: expenseCategories = [] } = useQuery({
        queryKey: ['khata-categories', 'EXPENSE'],
        queryFn: () => khataService.getCategories('EXPENSE'),
    });

    const createMutation = useMutation({
        mutationFn: (data: Partial<KhataCategory>) => khataService.createCategory(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['khata-categories'] });
            setNewCategoryName('');
        },
    });

    const deleteMutation = useMutation({
        mutationFn: khataService.deleteCategory,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['khata-categories'] });
        },
    });

    const seedMutation = useMutation({
        mutationFn: khataService.seedDefaultCategories,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['khata-categories'] });
        },
    });

    const categories = activeTab === 'INCOME' ? incomeCategories : expenseCategories;

    const handleAddCategory = () => {
        if (!newCategoryName.trim()) return;
        createMutation.mutate({
            name: newCategoryName.trim(),
            type: activeTab,
        });
    };

    return (
        <div className="p-6 max-w-3xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-700">
                    <Settings className="w-6 h-6" style={{ color: theme.colors.textSecondary }} />
                </div>
                <div>
                    <h1 className="text-2xl font-bold" style={{ color: theme.colors.text }}>Settings</h1>
                    <p className="text-sm" style={{ color: theme.colors.textSecondary }}>Manage categories and preferences</p>
                </div>
            </div>

            {/* Categories Section */}
            <div className="rounded-xl border overflow-hidden mb-6" style={{ borderColor: theme.colors.border, backgroundColor: theme.colors.surface }}>
                <div className="px-6 py-4 border-b" style={{ borderColor: theme.colors.border }}>
                    <div className="flex items-center justify-between">
                        <h3 className="font-semibold" style={{ color: theme.colors.text }}>Categories</h3>
                        <button
                            onClick={() => seedMutation.mutate()}
                            disabled={seedMutation.isPending}
                            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium border transition-colors"
                            style={{
                                borderColor: theme.colors.primary,
                                color: theme.colors.primary,
                            }}
                        >
                            <Zap className="w-3.5 h-3.5" />
                            {seedMutation.isPending ? 'Seeding...' : 'Seed Defaults'}
                        </button>
                    </div>
                    <p className="text-xs mt-1" style={{ color: theme.colors.textSecondary }}>
                        Organize your income and expense entries with categories
                    </p>
                </div>

                {/* Tab Switcher */}
                <div className="flex border-b" style={{ borderColor: theme.colors.border }}>
                    <button
                        onClick={() => setActiveTab('INCOME')}
                        className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors border-b-2"
                        style={{
                            borderBottomColor: activeTab === 'INCOME' ? theme.colors.primary : 'transparent',
                            color: activeTab === 'INCOME' ? theme.colors.primary : theme.colors.textSecondary,
                            backgroundColor: 'transparent',
                        }}
                    >
                        <TrendingUp className="w-4 h-4" />
                        Income ({incomeCategories.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('EXPENSE')}
                        className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors border-b-2"
                        style={{
                            borderBottomColor: activeTab === 'EXPENSE' ? theme.colors.primary : 'transparent',
                            color: activeTab === 'EXPENSE' ? theme.colors.primary : theme.colors.textSecondary,
                            backgroundColor: 'transparent',
                        }}
                    >
                        <TrendingDown className="w-4 h-4" />
                        Expense ({expenseCategories.length})
                    </button>
                </div>

                {/* Add Category Input */}
                <div className="px-6 py-4 border-b flex gap-2" style={{ borderColor: theme.colors.border }}>
                    <input
                        type="text"
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
                        placeholder={`New ${activeTab.toLowerCase()} category...`}
                        className="flex-1 px-3 py-2 rounded-lg border text-sm"
                        style={{ borderColor: theme.colors.border, backgroundColor: theme.colors.background, color: theme.colors.text }}
                    />
                    <button
                        onClick={handleAddCategory}
                        disabled={!newCategoryName.trim() || createMutation.isPending}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-white text-sm font-semibold disabled:opacity-50"
                        style={{ backgroundColor: theme.colors.primary }}
                    >
                        <Plus className="w-4 h-4" />
                        Add
                    </button>
                </div>

                {/* Category List */}
                <div className="divide-y" style={{ borderColor: theme.colors.border }}>
                    {categories.length === 0 ? (
                        <div className="py-12 text-center">
                            <p className="text-sm" style={{ color: theme.colors.textSecondary }}>
                                No {activeTab.toLowerCase()} categories yet.
                            </p>
                            <p className="text-xs mt-1" style={{ color: theme.colors.textSecondary }}>
                                Add one above or click "Seed Defaults"
                            </p>
                        </div>
                    ) : (
                        categories.map((cat) => (
                            <div
                                key={cat.id}
                                className="flex items-center justify-between px-6 py-3"
                                style={{ borderColor: theme.colors.border }}
                            >
                                <div className="flex items-center gap-3">
                                    <div
                                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                        style={{ backgroundColor: activeTab === 'INCOME' ? '#16a34a' : '#dc2626' }}
                                    />
                                    <div>
                                        <span className="text-sm font-medium" style={{ color: theme.colors.text }}>{cat.name}</span>
                                        {cat.isDefault && (
                                            <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400">
                                                default
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <button
                                    onClick={() => deleteMutation.mutate(cat.id)}
                                    disabled={deleteMutation.isPending}
                                    className="p-1.5 rounded text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Info Box */}
            <div className="rounded-xl border p-5" style={{ borderColor: theme.colors.border, backgroundColor: theme.colors.surface }}>
                <h4 className="font-semibold mb-2" style={{ color: theme.colors.text }}>About Mero Khata</h4>
                <div className="space-y-2 text-sm" style={{ color: theme.colors.textSecondary }}>
                    <p>• <strong style={{ color: theme.colors.text }}>Udhar (Customers)</strong>: Track money you give and receive from customers</p>
                    <p>• <strong style={{ color: theme.colors.text }}>Income & Expenses</strong>: Record daily income and expense transactions</p>
                    <p>• <strong style={{ color: theme.colors.text }}>Invoices</strong>: Create VAT invoices (13%) for customers</p>
                    <p>• <strong style={{ color: theme.colors.text }}>Bills</strong>: Track supplier bills and payables</p>
                    <p>• <strong style={{ color: theme.colors.text }}>VAT Summary</strong>: Compute output and input VAT for IRD filing</p>
                    <p>• <strong style={{ color: theme.colors.text }}>Bank Reconciliation</strong>: Match bank entries with transactions</p>
                </div>
            </div>
        </div>
    );
}
