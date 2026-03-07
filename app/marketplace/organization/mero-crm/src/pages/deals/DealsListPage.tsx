import React, { useEffect, useState } from 'react';
import { useTheme } from '@frontend/contexts/ThemeContext';
import { Link, useNavigate } from 'react-router-dom';
import { dealsApi, Deal } from '../../api/deals';
import { Card, Button, Input } from '@shared';
import { Plus, Briefcase, Search, Edit, Trash2, LayoutGrid, List, Eye } from 'lucide-react';
import { toast } from '@shared';
import { useAppContext } from '../../contexts/AppContext';

export default function DealsListPage() {
    const { theme } = useTheme();
    const navigate = useNavigate();
    const { buildHref } = useAppContext();
    const [deals, setDeals] = useState<Deal[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchDeals();
    }, []);

    const fetchDeals = async () => {
        try {
            setLoading(true);
            const data = await dealsApi.getDeals();
            setDeals(data);
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to fetch deals');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this deal?')) return;
        try {
            await dealsApi.deleteDeal(id);
            setDeals(deals.filter(d => d.id !== id));
            toast.success('Deal deleted');
        } catch (error: any) {
            toast.error('Failed to delete deal');
        }
    };

    const filteredDeals = deals.filter(deal =>
        deal.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        deal.lead?.first_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-8 max-w-[1600px] mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="p-3 rounded-2xl bg-primary/10">
                        <Briefcase className="h-8 w-8 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold" style={{ color: theme.colors.text }}>Deals</h1>
                        <p style={{ color: theme.colors.textSecondary }}>Manage your sales opportunities</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <div className="flex rounded-xl bg-surface/50 p-1 border border-border/50">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="rounded-lg h-9 px-3 bg-primary text-white"
                            onClick={() => { }}
                        >
                            <List className="h-4 w-4 mr-2" />
                            List
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="rounded-lg h-9 px-3 text-textSecondary"
                            onClick={() => navigate(buildHref('/deals/pipeline'))}
                        >
                            <LayoutGrid className="h-4 w-4 mr-2" />
                            Pipeline
                        </Button>
                    </div>
                    <Link to={buildHref('/deals/new')}>
                        <Button variant="primary" className="shadow-lg shadow-primary/20 scale-105 active:scale-95 transition-transform px-6">
                            <Plus className="h-5 w-5 mr-2" />
                            Create Deal
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Search and Filters */}
            <Card className="p-4" style={{ backgroundColor: theme.colors.surface }}>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                        className="pl-10"
                        placeholder="Search deals by title or lead..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </Card>

            {/* Content */}
            <Card style={{ backgroundColor: theme.colors.surface }}>
                {loading ? (
                    <div className="p-12 text-center">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent"></div>
                        <p className="mt-4 text-gray-500">Loading deals...</p>
                    </div>
                ) : filteredDeals.length === 0 ? (
                    <div className="p-12 text-center">
                        <Briefcase className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                        <h3 className="text-lg font-medium" style={{ color: theme.colors.text }}>No deals found</h3>
                        <p className="text-gray-500">Get started by creating your first deal.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="text-left border-b" style={{ borderColor: theme.colors.border }}>
                                    <th className="p-4 font-semibold" style={{ color: theme.colors.textSecondary }}>Title</th>
                                    <th className="p-4 font-semibold" style={{ color: theme.colors.textSecondary }}>Value</th>
                                    <th className="p-4 font-semibold" style={{ color: theme.colors.textSecondary }}>Stage</th>
                                    <th className="p-4 font-semibold" style={{ color: theme.colors.textSecondary }}>Probability</th>
                                    <th className="p-4 font-semibold" style={{ color: theme.colors.textSecondary }}>Lead</th>
                                    <th className="p-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredDeals.map((deal) => (
                                    <tr key={deal.id} className="border-b transition-colors hover:bg-gray-50/50" style={{ borderColor: theme.colors.border }}>
                                        <td className="p-4">
                                            <div className="font-medium" style={{ color: theme.colors.text }}>{deal.title}</div>
                                        </td>
                                        <td className="p-4" style={{ color: theme.colors.textSecondary }}>
                                            {deal.value.toLocaleString()} {deal.currency}
                                        </td>
                                        <td className="p-4">
                                            <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                {deal.stage}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-16 bg-gray-200 rounded-full h-1.5 overflow-hidden">
                                                    <div className="bg-primary h-full" style={{ width: `${deal.probability}%` }}></div>
                                                </div>
                                                <span className="text-xs" style={{ color: theme.colors.textSecondary }}>{deal.probability}%</span>
                                            </div>
                                        </td>
                                        <td className="p-4" style={{ color: theme.colors.textSecondary }}>
                                            {deal.lead ? `${deal.lead.first_name} ${deal.lead.last_name || ''}` : '-'}
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => navigate(buildHref(`/deals/${deal.id}`))}
                                                    className="p-2 rounded transition-colors hover:bg-gray-100"
                                                    title="View Details"
                                                >
                                                    <Eye className="h-4 w-4" style={{ color: theme.colors.textSecondary }} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(deal.id)}
                                                    className="p-2 rounded transition-colors hover:bg-red-50"
                                                >
                                                    <Trash2 className="h-4 w-4" style={{ color: theme.colors.error }} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>
        </div>
    );
}
