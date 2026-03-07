import React, { useEffect, useState } from 'react';
import { useTheme } from '@frontend/contexts/ThemeContext';
import { Link, useNavigate } from 'react-router-dom';
import { clientsApi, Client } from '../../api/clients';
import { Card, Button, Input, Badge } from '@shared';
import { Plus, Search, Edit, Trash2, Eye, RefreshCw, Users as UsersIcon, Upload, Filter } from 'lucide-react';
import { toast } from '@shared';
import { useAppContext } from '../../contexts/AppContext';
import { CsvImportModal } from '@frontend/components/shared/CsvImportModal';

export default function ClientsListPage() {
    const { theme } = useTheme();
    const navigate = useNavigate();
    const { buildHref } = useAppContext();
    const [clients, setClients] = useState<Client[]>([]);
    // ... rest of state ...
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [limit] = useState(10);
    const [search, setSearch] = useState('');
    const [searchDebounce, setSearchDebounce] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            setSearchDebounce(search);
        }, 300);
        return () => clearTimeout(timer);
    }, [search]);

    useEffect(() => {
        fetchClients();
    }, [page, searchDebounce, categoryFilter]);

    const fetchClients = async () => {
        try {
            setLoading(true);
            const response = await clientsApi.getClients(page, limit, searchDebounce || undefined);

            // Client-side category filtering since backend pagination might not support it natively yet
            // If backend supports category param later, add it to getClients call.
            let filteredData = response.data;
            if (categoryFilter) {
                filteredData = filteredData.filter(c => c.category === categoryFilter);
            }

            setClients(filteredData);
            setTotal(categoryFilter ? filteredData.length : response.total); // Approximate pagination behavior
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to fetch clients');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this client?')) {
            return;
        }

        try {
            await clientsApi.deleteClient(id);
            toast.success('Client deleted successfully');
            fetchClients();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to delete client');
        }
    };

    const handleBulkImport = async (data: any[]) => {
        try {
            await clientsApi.bulkCreateClient(data);
            toast.success(`Successfully imported ${data.length} clients`);
            setIsImportModalOpen(false);
            fetchClients();
        } catch (error: any) {
            toast.error(error.message || 'Failed to import clients');
            throw error;
        }
    };

    const totalPages = Math.ceil(total / limit);

    return (
        <div className="p-8 max-w-[1600px] mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="p-3 rounded-2xl" style={{ backgroundColor: `${theme.colors.primary}15` }}>
                        <UsersIcon className="h-8 w-8" style={{ color: theme.colors.primary }} />
                    </div>
                    <div>
                        <h1 className="text-4xl font-extrabold tracking-tight" style={{ color: theme.colors.text }}>
                            Clients
                        </h1>
                        <p className="opacity-70" style={{ color: theme.colors.textSecondary }}>
                            Manage and organize your client relationships
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="outline" onClick={() => setIsImportModalOpen(true)} className="px-4 shadow-sm border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors rounded-xl font-bold">
                        <Upload className="h-5 w-5 mr-2" />
                        Bulk Import
                    </Button>
                    <Link to={buildHref('/clients/new')}>
                        <Button variant="primary" className="shadow-lg shadow-primary/20 scale-105 active:scale-95 transition-transform px-6 rounded-xl font-bold">
                            <Plus className="h-5 w-5 mr-2" />
                            Add New Client
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Search and Filters */}
            <Card className="p-5 border-none shadow-sm backdrop-blur-sm" style={{ backgroundColor: `${theme.colors.surface}90`, borderRadius: '16px' }}>
                <div className="flex flex-col md:flex-row items-center gap-4">
                    <div className="flex-1 w-full relative group">
                        <Search
                            className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 transition-colors group-focus-within:text-primary"
                            style={{ color: theme.colors.textSecondary }}
                        />
                        <Input
                            type="text"
                            placeholder="Search by name, email, or company..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-12 h-12 bg-transparent border-none focus:ring-2 focus:ring-primary/20 text-lg transition-all"
                            style={{ borderRadius: '12px' }}
                        />
                    </div>

                    <div className="w-full md:w-48 relative border-l pl-4" style={{ borderColor: theme.colors.border }}>
                        <div className="flex items-center gap-2 mb-1">
                            <Filter className="h-4 w-4" style={{ color: theme.colors.textSecondary }} />
                            <span className="text-xs font-bold uppercase" style={{ color: theme.colors.textSecondary }}>Category</span>
                        </div>
                        <select
                            value={categoryFilter}
                            onChange={(e) => setCategoryFilter(e.target.value)}
                            className="w-full bg-transparent outline-none cursor-pointer font-medium"
                            style={{ color: theme.colors.text }}
                        >
                            <option value="">All Categories</option>
                            <option value="CUSTOMER">Customers</option>
                            <option value="LEAD">Leads</option>
                            <option value="VENDOR">Vendors</option>
                            <option value="PARTNER">Partners</option>
                        </select>
                    </div>

                    <Button
                        variant="secondary"
                        onClick={fetchClients}
                        className="h-12 px-6 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                        <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
                    </Button>
                </div>
            </Card>

            {/* Clients Table */}
            <Card style={{ backgroundColor: theme.colors.surface }}>
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="text-center">
                            <div
                                className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4"
                                style={{ borderColor: theme.colors.primary }}
                            ></div>
                            <p style={{ color: theme.colors.textSecondary }}>Loading clients...</p>
                        </div>
                    </div>
                ) : clients.length === 0 ? (
                    <div className="text-center py-12">
                        <p className="text-lg mb-2" style={{ color: theme.colors.text }}>
                            No clients found
                        </p>
                        <p className="mb-4" style={{ color: theme.colors.textSecondary }}>
                            {search ? 'Try adjusting your search' : 'Get started by creating your first client'}
                        </p>
                        {!search && (
                            <Link to={buildHref('/clients/new')}>
                                <Button variant="primary">
                                    <Plus className="h-4 w-4 mr-2" />
                                    Create Client
                                </Button>
                            </Link>
                        )}
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr style={{ borderBottom: `1px solid ${theme.colors.border}` }}>
                                        <th className="text-left p-4 font-semibold w-1/4" style={{ color: theme.colors.text }}>
                                            Client info
                                        </th>
                                        <th className="text-left p-4 font-semibold" style={{ color: theme.colors.text }}>
                                            Contact
                                        </th>
                                        <th className="text-left p-4 font-semibold" style={{ color: theme.colors.text }}>
                                            Tags
                                        </th>
                                        <th className="text-left p-4 font-semibold" style={{ color: theme.colors.text }}>
                                            Assigned To
                                        </th>
                                        <th className="text-right p-4 font-semibold" style={{ color: theme.colors.text }}>
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {clients.map((client) => (
                                        <tr
                                            key={client.id}
                                            style={{ borderBottom: `1px solid ${theme.colors.border}` }}
                                            className="hover:bg-opacity-50 transition-colors"
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.backgroundColor = theme.colors.border;
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.backgroundColor = 'transparent';
                                            }}
                                        >
                                            <td className="p-4">
                                                <div className="font-bold text-base mb-1" style={{ color: theme.colors.text }}>
                                                    {client.name}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {client.category && (
                                                        <Badge variant={client.category === 'CUSTOMER' ? 'success' : client.category === 'LEAD' ? 'warning' : 'secondary'} className="text-[10px]">
                                                            {client.category}
                                                        </Badge>
                                                    )}
                                                    <span className="text-xs" style={{ color: theme.colors.textSecondary }}>{client.company || '-'}</span>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <div className="text-sm font-medium" style={{ color: theme.colors.text }}>{client.email}</div>
                                                <div className="text-xs mt-1" style={{ color: theme.colors.textSecondary }}>{client.phone || '-'}</div>
                                            </td>
                                            <td className="p-4" style={{ color: theme.colors.textSecondary }}>
                                                {client.tags && client.tags.length > 0 ? (
                                                    <div className="flex flex-wrap gap-1 max-w-[200px]">
                                                        {client.tags.slice(0, 3).map(tag => (
                                                            <span key={tag} className="px-2 py-0.5 text-[10px] rounded bg-black/5 dark:bg-white/10 truncate max-w-[80px]" title={tag}>
                                                                {tag}
                                                            </span>
                                                        ))}
                                                        {client.tags.length > 3 && (
                                                            <span className="px-1 py-0.5 text-[10px] rounded bg-black/5 dark:bg-white/10">+{client.tags.length - 3}</span>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="opacity-50 text-sm">-</span>
                                                )}
                                            </td>
                                            <td className="p-4" style={{ color: theme.colors.textSecondary }}>
                                                {client.assignedTo
                                                    ? `${client.assignedTo.firstName} ${client.assignedTo.lastName}`
                                                    : '-'}
                                            </td>
                                            <td className="p-4">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => navigate(buildHref(`/clients/${client.id}`))}
                                                        className="p-2 rounded transition-colors"
                                                        style={{ color: theme.colors.textSecondary }}
                                                        onMouseEnter={(e) => {
                                                            e.currentTarget.style.backgroundColor = theme.colors.border;
                                                            e.currentTarget.style.color = theme.colors.text;
                                                        }}
                                                        onMouseLeave={(e) => {
                                                            e.currentTarget.style.backgroundColor = 'transparent';
                                                            e.currentTarget.style.color = theme.colors.textSecondary;
                                                        }}
                                                        title="View"
                                                    >
                                                        <Eye className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => navigate(buildHref(`/clients/${client.id}/edit`))}
                                                        className="p-2 rounded transition-colors"
                                                        style={{ color: theme.colors.textSecondary }}
                                                        onMouseEnter={(e) => {
                                                            e.currentTarget.style.backgroundColor = theme.colors.border;
                                                            e.currentTarget.style.color = theme.colors.text;
                                                        }}
                                                        onMouseLeave={(e) => {
                                                            e.currentTarget.style.backgroundColor = 'transparent';
                                                            e.currentTarget.style.color = theme.colors.textSecondary;
                                                        }}
                                                        title="Edit"
                                                    >
                                                        <Edit className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(client.id)}
                                                        className="p-2 rounded transition-colors"
                                                        style={{ color: theme.colors.textSecondary }}
                                                        onMouseEnter={(e) => {
                                                            e.currentTarget.style.backgroundColor = '#fee2e2';
                                                            e.currentTarget.style.color = '#dc2626';
                                                        }}
                                                        onMouseLeave={(e) => {
                                                            e.currentTarget.style.backgroundColor = 'transparent';
                                                            e.currentTarget.style.color = theme.colors.textSecondary;
                                                        }}
                                                        title="Delete"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="flex items-center justify-between p-4" style={{ borderTop: `1px solid ${theme.colors.border}` }}>
                                <p style={{ color: theme.colors.textSecondary }}>
                                    Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} clients
                                </p>
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="secondary"
                                        onClick={() => setPage(page - 1)}
                                        disabled={page === 1}
                                    >
                                        Previous
                                    </Button>
                                    <span style={{ color: theme.colors.text }}>
                                        Page {page} of {totalPages}
                                    </span>
                                    <Button
                                        variant="secondary"
                                        onClick={() => setPage(page + 1)}
                                        disabled={page === totalPages}
                                    >
                                        Next
                                    </Button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </Card>

            <CsvImportModal
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                onImport={handleBulkImport}
                title="Import Clients"
                expectedHeaders={['name', 'email', 'phone', 'company', 'address', 'city', 'state', 'country']}
                templateHeaders={['name', 'email', 'phone', 'company', 'address', 'city', 'state', 'country']}
            />
        </div>
    );
}
