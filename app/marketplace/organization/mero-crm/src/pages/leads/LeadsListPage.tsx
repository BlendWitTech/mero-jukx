import React, { useEffect, useState } from 'react';
import { useTheme } from '@frontend/contexts/ThemeContext';
import { Link, useNavigate } from 'react-router-dom';
import { leadsApi, Lead } from '../../api/leads';
import { Card, Button, Input } from '@shared';
import { Plus, Search, Edit, Trash2, Eye, RefreshCw, UserPlus, LayoutGrid, List, Flame, Thermometer, Snowflake } from 'lucide-react';
import { toast } from '@shared';
import { useAppContext } from '../../contexts/AppContext';
import { CsvImportModal } from '@frontend/components/shared/CsvImportModal';
import { Upload } from 'lucide-react';

type ScoreFilter = 'all' | 'hot' | 'warm' | 'cold';

function getScoreBadge(score: number) {
    if (score >= 61) return { label: 'HOT', color: '#ef4444', bg: '#fef2f2', icon: Flame };
    if (score >= 31) return { label: 'WARM', color: '#f97316', bg: '#fff7ed', icon: Thermometer };
    return { label: 'COLD', color: '#3b82f6', bg: '#eff6ff', icon: Snowflake };
}

// Map Google Contacts CSV headers to our lead fields
function mapGoogleContactsRow(row: Record<string, string>) {
    return {
        first_name: row['Given Name'] || row['first_name'] || '',
        last_name: row['Family Name'] || row['last_name'] || '',
        email: row['E-mail 1 - Value'] || row['Email 1 - Value'] || row['email'] || '',
        phone: row['Phone 1 - Value'] || row['phone'] || '',
        company: row['Organization 1 - Name'] || row['company'] || '',
        job_title: row['Organization 1 - Title'] || row['job_title'] || '',
    };
}

export default function LeadsListPage() {
    const { theme } = useTheme();
    const navigate = useNavigate();
    const { buildHref } = useAppContext();
    const [leads, setLeads] = useState<Lead[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [search, setSearch] = useState('');
    const [searchDebounce, setSearchDebounce] = useState('');
    const [scoreFilter, setScoreFilter] = useState<ScoreFilter>('all');
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [importMode, setImportMode] = useState<'standard' | 'google'>('standard');

    useEffect(() => {
        const timer = setTimeout(() => {
            setSearchDebounce(search);
        }, 300);
        return () => clearTimeout(timer);
    }, [search]);

    useEffect(() => {
        fetchLeads();
    }, [page, searchDebounce]);

    const fetchLeads = async () => {
        try {
            setLoading(true);
            const data = await leadsApi.getLeads();
            setLeads(data);
            setTotal(data.length); // API currently returns all leads, pagination might be needed later
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to fetch leads');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this lead?')) {
            return;
        }

        try {
            await leadsApi.deleteLead(id);
            toast.success('Lead deleted successfully');
            fetchLeads();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to delete lead');
        }
    };

    const handleBulkImport = async (data: any[]) => {
        try {
            const mapped = importMode === 'google' ? data.map(mapGoogleContactsRow) : data;
            await leadsApi.bulkCreate(mapped);
            toast.success(`${mapped.length} leads imported successfully`);
            fetchLeads();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to import leads');
            throw error;
        }
    };

    const filteredLeads = leads.filter((lead) => {
        const score = lead.score || 0;
        if (scoreFilter === 'hot') return score >= 61;
        if (scoreFilter === 'warm') return score >= 31 && score < 61;
        if (scoreFilter === 'cold') return score < 31;
        return true;
    }).filter((lead) => {
        if (!searchDebounce) return true;
        const q = searchDebounce.toLowerCase();
        return (
            `${lead.first_name} ${lead.last_name}`.toLowerCase().includes(q) ||
            (lead.email || '').toLowerCase().includes(q) ||
            (lead.company || '').toLowerCase().includes(q)
        );
    });

    return (
        <div className="p-8 max-w-[1600px] mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="p-3 rounded-2xl" style={{ backgroundColor: `${theme.colors.primary}15` }}>
                        <UserPlus className="h-8 w-8" style={{ color: theme.colors.primary }} />
                    </div>
                    <div>
                        <h1 className="text-4xl font-extrabold tracking-tight" style={{ color: theme.colors.text }}>
                            Leads
                        </h1>
                        <p className="opacity-70" style={{ color: theme.colors.textSecondary }}>
                            Manage your potential customers
                        </p>
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
                            onClick={() => navigate(buildHref('/leads/pipeline'))}
                        >
                            <LayoutGrid className="h-4 w-4 mr-2" />
                            Pipeline
                        </Button>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant="secondary"
                            className="px-4"
                            onClick={() => { setImportMode('standard'); setIsImportModalOpen(true); }}
                        >
                            <Upload className="h-4 w-4 mr-2" />
                            Import CSV
                        </Button>
                        <Button
                            variant="secondary"
                            className="px-4"
                            onClick={() => { setImportMode('google'); setIsImportModalOpen(true); }}
                            title="Import from Google Contacts exported CSV"
                        >
                            <Upload className="h-4 w-4 mr-2" />
                            Google Contacts
                        </Button>
                    </div>
                    <Link to={buildHref('/leads/new')}>
                        <Button variant="primary" className="shadow-lg shadow-primary/20 scale-105 active:scale-95 transition-transform px-6">
                            <Plus className="h-5 w-5 mr-2" />
                            Add New Lead
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
                            placeholder="Search leads..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-12 h-12 bg-transparent border-none focus:ring-2 focus:ring-primary/20 text-lg transition-all"
                            style={{ borderRadius: '12px' }}
                        />
                    </div>
                    {/* Score Filter */}
                    <div className="flex gap-2">
                        {(['all', 'hot', 'warm', 'cold'] as ScoreFilter[]).map((f) => {
                            const labels: Record<ScoreFilter, string> = { all: 'All', hot: '🔥 Hot', warm: '🌡 Warm', cold: '❄ Cold' };
                            const active = scoreFilter === f;
                            return (
                                <button
                                    key={f}
                                    onClick={() => setScoreFilter(f)}
                                    className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
                                    style={{
                                        backgroundColor: active ? theme.colors.primary : theme.colors.border,
                                        color: active ? '#fff' : theme.colors.text,
                                    }}
                                >
                                    {labels[f]}
                                </button>
                            );
                        })}
                    </div>
                    <Button
                        variant="secondary"
                        onClick={fetchLeads}
                        className="h-12 px-6 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                        <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
                    </Button>
                </div>
            </Card>

            {/* Leads Table */}
            <Card style={{ backgroundColor: theme.colors.surface }}>
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="text-center">
                            <div
                                className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4"
                                style={{ borderColor: theme.colors.primary }}
                            ></div>
                            <p style={{ color: theme.colors.textSecondary }}>Loading leads...</p>
                        </div>
                    </div>
                ) : filteredLeads.length === 0 ? (
                    <div className="text-center py-12">
                        <p className="text-lg mb-2" style={{ color: theme.colors.text }}>
                            {leads.length > 0 ? 'No leads match the current filter' : 'No leads found'}
                        </p>
                        {leads.length === 0 && (
                            <Link to={buildHref('/leads/new')}>
                                <Button variant="primary">
                                    <Plus className="h-4 w-4 mr-2" />
                                    Create Lead
                                </Button>
                            </Link>
                        )}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr style={{ borderBottom: `1px solid ${theme.colors.border}` }}>
                                    <th className="text-left p-4 font-semibold" style={{ color: theme.colors.text }}>Name</th>
                                    <th className="text-left p-4 font-semibold" style={{ color: theme.colors.text }}>Status</th>
                                    <th className="text-left p-4 font-semibold" style={{ color: theme.colors.text }}>Score</th>
                                    <th className="text-left p-4 font-semibold" style={{ color: theme.colors.text }}>Company</th>
                                    <th className="text-left p-4 font-semibold" style={{ color: theme.colors.text }}>Source</th>
                                    <th className="text-right p-4 font-semibold" style={{ color: theme.colors.text }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredLeads.map((lead) => {
                                    const score = lead.score || 0;
                                    const badge = getScoreBadge(score);
                                    const BadgeIcon = badge.icon;
                                    return (
                                        <tr
                                            key={lead.id}
                                            style={{ borderBottom: `1px solid ${theme.colors.border}` }}
                                            className="hover:bg-opacity-50 transition-colors"
                                        >
                                            <td className="p-4">
                                                <div className="font-medium" style={{ color: theme.colors.text }}>
                                                    {lead.first_name} {lead.last_name}
                                                </div>
                                                <div className="text-sm" style={{ color: theme.colors.textSecondary }}>
                                                    {lead.email}
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                    {lead.status}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                <span
                                                    className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold"
                                                    style={{ backgroundColor: badge.bg, color: badge.color }}
                                                >
                                                    <BadgeIcon className="h-3 w-3" />
                                                    {badge.label} ({score})
                                                </span>
                                            </td>
                                            <td className="p-4" style={{ color: theme.colors.textSecondary }}>
                                                {lead.company || '-'}
                                            </td>
                                            <td className="p-4" style={{ color: theme.colors.textSecondary }}>
                                                {lead.source || '-'}
                                            </td>
                                            <td className="p-4">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => navigate(buildHref(`/leads/${lead.id}`))}
                                                        className="p-2 rounded transition-colors hover:bg-gray-100"
                                                    >
                                                        <Eye className="h-4 w-4" style={{ color: theme.colors.textSecondary }} />
                                                    </button>
                                                    <button
                                                        onClick={() => navigate(buildHref(`/leads/${lead.id}/edit`))}
                                                        className="p-2 rounded transition-colors hover:bg-gray-100"
                                                    >
                                                        <Edit className="h-4 w-4" style={{ color: theme.colors.textSecondary }} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(lead.id)}
                                                        className="p-2 rounded transition-colors hover:bg-red-50"
                                                    >
                                                        <Trash2 className="h-4 w-4" style={{ color: theme.colors.error }} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            <CsvImportModal
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                onImport={handleBulkImport}
                title={importMode === 'google' ? 'Import from Google Contacts CSV' : 'Import Leads from CSV'}
                expectedHeaders={
                    importMode === 'google'
                        ? ['Given Name', 'Family Name', 'E-mail 1 - Value', 'Phone 1 - Value', 'Organization 1 - Name', 'Organization 1 - Title']
                        : ['first_name', 'last_name', 'email', 'phone', 'company', 'job_title', 'estimated_value', 'source']
                }
                templateHeaders={['first_name', 'last_name', 'email', 'phone', 'company', 'job_title', 'estimated_value', 'source']}
            />
        </div>
    );
}
