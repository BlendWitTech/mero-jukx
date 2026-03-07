import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@frontend/services/api';
import { Card, CardContent, CardHeader, CardTitle, Loading, Badge, Input } from '@shared/frontend';
import { AlertTriangle, Clock, XCircle, Package } from 'lucide-react';
import { useTheme } from '@frontend/contexts/ThemeContext';
import { useAuthStore } from '@frontend/store/authStore';
import { format, parseISO } from 'date-fns';

interface ExpiringProduct {
    productId: string;
    productName: string;
    sku: string;
    category: string;
    expiryDate: string;
    daysUntilExpiry: number;
    status: 'EXPIRED' | 'CRITICAL' | 'WARNING';
    alertDays: number;
}

function StatusBadge({ status, days }: { status: string; days: number }) {
    if (status === 'EXPIRED') return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">
            <XCircle className="h-3 w-3" /> Expired ({Math.abs(days)}d ago)
        </span>
    );
    if (status === 'CRITICAL') return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-700">
            <AlertTriangle className="h-3 w-3" /> Critical ({days}d left)
        </span>
    );
    return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700">
            <Clock className="h-3 w-3" /> Expiring ({days}d left)
        </span>
    );
}

export default function ExpiryAlertsPage() {
    const { theme } = useTheme();
    const { organization } = useAuthStore();
    const [daysAhead, setDaysAhead] = useState(30);
    const [search, setSearch] = useState('');

    const { data: products, isLoading } = useQuery<ExpiringProduct[]>({
        queryKey: ['inventory', 'expiring', organization?.id, daysAhead],
        queryFn: async () => {
            const res = await api.get(`/inventory/reports/expiring?days=${daysAhead}`);
            return res.data;
        },
        enabled: !!organization?.id,
    });

    const filtered = (products || []).filter(p =>
        !search || p.productName.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase())
    );

    const expired = filtered.filter(p => p.status === 'EXPIRED');
    const critical = filtered.filter(p => p.status === 'CRITICAL');
    const warning = filtered.filter(p => p.status === 'WARNING');

    if (isLoading) return (
        <div className="flex items-center justify-center min-h-screen">
            <Loading size="lg" text="Checking expiry dates..." />
        </div>
    );

    return (
        <div className="p-6 max-w-6xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold" style={{ color: theme.colors.text }}>Expiry Alerts</h1>
                    <p className="text-sm mt-1" style={{ color: theme.colors.textSecondary }}>
                        Products expiring within the next {daysAhead} days
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Input
                        placeholder="Search products..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-48"
                    />
                    <div className="flex items-center gap-2">
                        <label className="text-sm" style={{ color: theme.colors.textSecondary }}>Days ahead:</label>
                        {[7, 14, 30, 60, 90].map(d => (
                            <button
                                key={d}
                                onClick={() => setDaysAhead(d)}
                                className="text-xs px-2 py-1 rounded border transition-colors"
                                style={{
                                    backgroundColor: daysAhead === d ? theme.colors.primary : 'transparent',
                                    color: daysAhead === d ? '#fff' : theme.colors.textSecondary,
                                    borderColor: daysAhead === d ? theme.colors.primary : theme.colors.border,
                                }}
                            >
                                {d}d
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                    { label: 'Expired', count: expired.length, color: '#ef4444', bg: '#fee2e2', icon: XCircle },
                    { label: 'Critical (≤7 days)', count: critical.length, color: '#f97316', bg: '#ffedd5', icon: AlertTriangle },
                    { label: 'Warning', count: warning.length, color: '#f59e0b', bg: '#fef9c3', icon: Clock },
                ].map(c => (
                    <Card key={c.label} style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border }}>
                        <CardContent className="p-4 flex items-center gap-4">
                            <div className="p-3 rounded-lg" style={{ backgroundColor: c.bg }}>
                                <c.icon className="h-5 w-5" style={{ color: c.color }} />
                            </div>
                            <div>
                                <p className="text-2xl font-bold" style={{ color: c.color }}>{c.count}</p>
                                <p className="text-xs" style={{ color: theme.colors.textSecondary }}>{c.label}</p>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Product table */}
            <Card style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border }}>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2" style={{ color: theme.colors.text }}>
                        <Package className="h-5 w-5" />
                        {filtered.length === 0 ? 'No expiring products' : `${filtered.length} product${filtered.length !== 1 ? 's' : ''} flagged`}
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    {filtered.length === 0 ? (
                        <div className="p-8 text-center">
                            <Package className="h-10 w-10 mx-auto mb-3 opacity-30" style={{ color: theme.colors.textSecondary }} />
                            <p className="text-sm font-medium" style={{ color: theme.colors.text }}>
                                {products?.length === 0
                                    ? 'No products are expiring soon. Great job!'
                                    : 'No products match your search.'}
                            </p>
                            <p className="text-xs mt-1" style={{ color: theme.colors.textSecondary }}>
                                Make sure products have "Track Expiry" enabled and an expiry date set.
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b" style={{ borderColor: theme.colors.border }}>
                                        {['Product', 'SKU', 'Category', 'Expiry Date', 'Status'].map(h => (
                                            <th key={h} className="text-left px-4 py-3 text-xs font-semibold"
                                                style={{ color: theme.colors.textSecondary }}>
                                                {h}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.map(p => (
                                        <tr
                                            key={p.productId}
                                            className="border-b transition-colors"
                                            style={{
                                                borderColor: theme.colors.border,
                                                backgroundColor: p.status === 'EXPIRED' ? '#fee2e210' : 'transparent',
                                            }}
                                        >
                                            <td className="px-4 py-3 font-medium" style={{ color: theme.colors.text }}>
                                                {p.productName}
                                            </td>
                                            <td className="px-4 py-3 font-mono text-xs" style={{ color: theme.colors.textSecondary }}>
                                                {p.sku}
                                            </td>
                                            <td className="px-4 py-3">
                                                {p.category
                                                    ? <Badge variant="outline">{p.category}</Badge>
                                                    : <span style={{ color: theme.colors.textSecondary }}>—</span>}
                                            </td>
                                            <td className="px-4 py-3" style={{ color: theme.colors.text }}>
                                                {p.expiryDate
                                                    ? format(parseISO(p.expiryDate), 'dd MMM yyyy')
                                                    : '—'}
                                            </td>
                                            <td className="px-4 py-3">
                                                <StatusBadge status={p.status} days={p.daysUntilExpiry} />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
