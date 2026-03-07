import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/services/api';
import {
    Card, CardContent, CardHeader, CardTitle,
    Loading, Badge, Button, Input, Select,
} from '@shared/frontend';
import { PlusCircle, TrendingUp, AlertTriangle, CheckCircle, ChevronDown, ChevronRight } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import toast from '@shared/frontend/hooks/useToast';

interface Budget {
    id: string;
    name: string;
    type: 'GLOBAL' | 'DEPARTMENT' | 'PROJECT';
    fiscal_year?: { name: string };
    department?: { name: string };
    project?: { name: string };
    budget_lines: Array<{ id: string; account: { name: string; code: string }; allocatedAmount: number }>;
    created_at: string;
}

interface VarianceLine {
    accountId: string;
    accountName: string;
    accountCode: string;
    allocated: number;
    actual: number;
    variance: number;
    utilization: number;
}

export default function BudgetsPage() {
    const { theme } = useTheme();
    const queryClient = useQueryClient();
    const [selectedBudgetId, setSelectedBudgetId] = useState<string | null>(null);
    const [showCreate, setShowCreate] = useState(false);
    const [createForm, setCreateForm] = useState({ name: '', type: 'GLOBAL' as const });

    const { data: budgets, isLoading } = useQuery<Budget[]>({
        queryKey: ['accounting', 'budgets'],
        queryFn: async () => (await api.get('/accounting/budgets')).data,
    });

    const { data: variance, isLoading: varianceLoading } = useQuery<VarianceLine[]>({
        queryKey: ['accounting', 'budgets', selectedBudgetId, 'variance'],
        queryFn: async () => (await api.get(`/accounting/budgets/${selectedBudgetId}/variance`)).data,
        enabled: !!selectedBudgetId,
    });

    const createMutation = useMutation({
        mutationFn: async (data: typeof createForm) => (await api.post('/accounting/budgets', data)).data,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['accounting', 'budgets'] });
            setShowCreate(false);
            setCreateForm({ name: '', type: 'GLOBAL' });
            toast.success('Budget created');
        },
        onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to create budget'),
    });

    const selectedBudget = budgets?.find(b => b.id === selectedBudgetId);

    const totalAllocated = variance?.reduce((s, l) => s + l.allocated, 0) ?? 0;
    const totalActual = variance?.reduce((s, l) => s + l.actual, 0) ?? 0;
    const totalVariance = totalAllocated - totalActual;
    const overallUtil = totalAllocated > 0 ? (totalActual / totalAllocated) * 100 : 0;

    const fmtCurrency = (n: number) =>
        'Rs. ' + Math.abs(n).toLocaleString('en-NP', { minimumFractionDigits: 2 });

    const utilizationColor = (pct: number) =>
        pct >= 100 ? '#ef4444' : pct >= 80 ? '#f59e0b' : '#10b981';

    if (isLoading) return (
        <div className="flex items-center justify-center min-h-screen">
            <Loading size="lg" text="Loading budgets..." />
        </div>
    );

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold" style={{ color: theme.colors.text }}>Budgets</h1>
                    <p className="text-sm mt-1" style={{ color: theme.colors.textSecondary }}>
                        Track allocated vs. actual spending across accounts
                    </p>
                </div>
                <Button
                    onClick={() => setShowCreate(!showCreate)}
                    className="flex items-center gap-2"
                    style={{ backgroundColor: theme.colors.primary, color: '#fff' }}
                >
                    <PlusCircle className="h-4 w-4" /> New Budget
                </Button>
            </div>

            {/* Create form */}
            {showCreate && (
                <Card style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border }}>
                    <CardHeader>
                        <CardTitle style={{ color: theme.colors.text }}>Create Budget</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm font-medium block mb-1" style={{ color: theme.colors.text }}>
                                    Budget Name
                                </label>
                                <Input
                                    placeholder="e.g. FY 2024-25 Operations"
                                    value={createForm.name}
                                    onChange={e => setCreateForm({ ...createForm, name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium block mb-1" style={{ color: theme.colors.text }}>
                                    Budget Type
                                </label>
                                <Select
                                    value={createForm.type}
                                    onChange={e => setCreateForm({ ...createForm, type: e.target.value as any })}
                                    options={[
                                        { value: 'GLOBAL', label: 'Global (Company-wide)' },
                                        { value: 'DEPARTMENT', label: 'Department' },
                                        { value: 'PROJECT', label: 'Project' },
                                    ]}
                                />
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Button
                                onClick={() => createMutation.mutate(createForm)}
                                disabled={!createForm.name.trim() || createMutation.isPending}
                                style={{ backgroundColor: theme.colors.primary, color: '#fff' }}
                            >
                                Create
                            </Button>
                            <Button variant="outline" onClick={() => setShowCreate(false)}
                                style={{ borderColor: theme.colors.border, color: theme.colors.text }}>
                                Cancel
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Budget list */}
                <div className="space-y-3">
                    <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: theme.colors.textSecondary }}>
                        {budgets?.length ?? 0} Budget{budgets?.length !== 1 ? 's' : ''}
                    </h2>
                    {(!budgets || budgets.length === 0) && (
                        <p className="text-sm" style={{ color: theme.colors.textSecondary }}>
                            No budgets yet. Create one to get started.
                        </p>
                    )}
                    {budgets?.map(b => (
                        <div
                            key={b.id}
                            className="p-3 rounded-lg cursor-pointer border transition-all"
                            style={{
                                backgroundColor: selectedBudgetId === b.id ? `${theme.colors.primary}15` : theme.colors.surface,
                                borderColor: selectedBudgetId === b.id ? theme.colors.primary : theme.colors.border,
                            }}
                            onClick={() => setSelectedBudgetId(b.id === selectedBudgetId ? null : b.id)}
                        >
                            <div className="flex items-center justify-between">
                                <span className="font-medium text-sm" style={{ color: theme.colors.text }}>{b.name}</span>
                                {selectedBudgetId === b.id
                                    ? <ChevronDown className="h-4 w-4" style={{ color: theme.colors.primary }} />
                                    : <ChevronRight className="h-4 w-4" style={{ color: theme.colors.textSecondary }} />}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                                <Badge variant="outline" size="sm">{b.type}</Badge>
                                {b.fiscal_year && (
                                    <span className="text-xs" style={{ color: theme.colors.textSecondary }}>{b.fiscal_year.name}</span>
                                )}
                            </div>
                            <p className="text-xs mt-1" style={{ color: theme.colors.textSecondary }}>
                                {b.budget_lines?.length ?? 0} account line{b.budget_lines?.length !== 1 ? 's' : ''}
                            </p>
                        </div>
                    ))}
                </div>

                {/* Variance analysis panel */}
                <div className="lg:col-span-2">
                    {!selectedBudgetId ? (
                        <Card style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border }}>
                            <CardContent className="flex items-center justify-center h-48">
                                <p className="text-sm" style={{ color: theme.colors.textSecondary }}>
                                    Select a budget to view variance analysis
                                </p>
                            </CardContent>
                        </Card>
                    ) : varianceLoading ? (
                        <div className="flex items-center justify-center h-48">
                            <Loading size="md" text="Calculating variance..." />
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {/* Summary cards */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                {[
                                    { label: 'Total Allocated', value: fmtCurrency(totalAllocated), color: theme.colors.primary },
                                    { label: 'Actual Spent', value: fmtCurrency(totalActual), color: '#6b7280' },
                                    {
                                        label: 'Remaining',
                                        value: fmtCurrency(totalVariance),
                                        color: totalVariance >= 0 ? '#10b981' : '#ef4444',
                                    },
                                    { label: 'Utilization', value: `${overallUtil.toFixed(1)}%`, color: utilizationColor(overallUtil) },
                                ].map(c => (
                                    <Card key={c.label} style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border }}>
                                        <CardContent className="p-4 text-center">
                                            <p className="text-xl font-bold" style={{ color: c.color }}>{c.value}</p>
                                            <p className="text-xs mt-0.5" style={{ color: theme.colors.textSecondary }}>{c.label}</p>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>

                            {/* Variance table */}
                            <Card style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border }}>
                                <CardHeader>
                                    <CardTitle style={{ color: theme.colors.text }}>
                                        Variance Analysis — {selectedBudget?.name}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-0">
                                    {!variance || variance.length === 0 ? (
                                        <div className="p-6 text-center text-sm" style={{ color: theme.colors.textSecondary }}>
                                            No budget lines configured. Edit the budget to add account lines.
                                        </div>
                                    ) : (
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-sm">
                                                <thead>
                                                    <tr className="border-b" style={{ borderColor: theme.colors.border }}>
                                                        {['Account', 'Allocated', 'Actual', 'Variance', 'Utilization'].map(h => (
                                                            <th key={h} className="text-left px-4 py-3 text-xs font-semibold"
                                                                style={{ color: theme.colors.textSecondary }}>
                                                                {h}
                                                            </th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {variance.map(line => {
                                                        const util = line.utilization;
                                                        const uColor = utilizationColor(util);
                                                        return (
                                                            <tr key={line.accountId} className="border-b"
                                                                style={{ borderColor: theme.colors.border }}>
                                                                <td className="px-4 py-3">
                                                                    <div className="font-medium" style={{ color: theme.colors.text }}>
                                                                        {line.accountName}
                                                                    </div>
                                                                    <div className="text-xs" style={{ color: theme.colors.textSecondary }}>
                                                                        {line.accountCode}
                                                                    </div>
                                                                </td>
                                                                <td className="px-4 py-3 font-mono" style={{ color: theme.colors.text }}>
                                                                    {fmtCurrency(line.allocated)}
                                                                </td>
                                                                <td className="px-4 py-3 font-mono" style={{ color: theme.colors.text }}>
                                                                    {fmtCurrency(line.actual)}
                                                                </td>
                                                                <td className="px-4 py-3 font-mono font-semibold"
                                                                    style={{ color: line.variance >= 0 ? '#10b981' : '#ef4444' }}>
                                                                    {line.variance >= 0 ? '+' : ''}{fmtCurrency(line.variance)}
                                                                </td>
                                                                <td className="px-4 py-3">
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="flex-1 h-1.5 rounded-full" style={{ backgroundColor: theme.colors.border }}>
                                                                            <div className="h-1.5 rounded-full transition-all"
                                                                                style={{
                                                                                    width: `${Math.min(100, util)}%`,
                                                                                    backgroundColor: uColor,
                                                                                }} />
                                                                        </div>
                                                                        <span className="text-xs font-semibold w-10 text-right"
                                                                            style={{ color: uColor }}>
                                                                            {util.toFixed(0)}%
                                                                        </span>
                                                                        {util >= 100
                                                                            ? <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
                                                                            : util >= 80
                                                                                ? <TrendingUp className="h-3.5 w-3.5 text-amber-500" />
                                                                                : <CheckCircle className="h-3.5 w-3.5 text-green-500" />}
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
