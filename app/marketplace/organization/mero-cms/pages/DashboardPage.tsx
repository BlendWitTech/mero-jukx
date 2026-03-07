import { useEffect, useState } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { FileText, BookOpen, Image, FormInput, TrendingUp, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import api from '@/services/api';

interface CmsStats {
    pages: { total: number; published: number; drafts: number };
    posts: { total: number; published: number; drafts: number };
    media: { total: number; totalSize: number };
    forms: { totalForms: number; activeForms: number; totalSubmissions: number };
}

export default function DashboardPage() {
    const { theme } = useTheme();
    const { organization } = useAuthStore();
    const navigate = useNavigate();
    const [stats, setStats] = useState<CmsStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const [pagesRes, postsRes, mediaRes, formsRes] = await Promise.all([
                    api.get('/cms/pages/stats'),
                    api.get('/cms/posts/stats'),
                    api.get('/cms/media/stats'),
                    api.get('/cms/forms/stats'),
                ]);
                setStats({
                    pages: pagesRes.data,
                    posts: postsRes.data,
                    media: mediaRes.data,
                    forms: formsRes.data,
                });
            } catch (error) {
                console.error('Failed to load CMS stats:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    const cards = [
        {
            label: 'Pages',
            icon: FileText,
            total: stats?.pages.total ?? 0,
            sub: `${stats?.pages.published ?? 0} published`,
            color: '#3b82f6',
            path: '/pages',
        },
        {
            label: 'Blog Posts',
            icon: BookOpen,
            total: stats?.posts.total ?? 0,
            sub: `${stats?.posts.published ?? 0} published`,
            color: '#8b5cf6',
            path: '/posts',
        },
        {
            label: 'Media Files',
            icon: Image,
            total: stats?.media.total ?? 0,
            sub: `${((stats?.media.totalSize ?? 0) / 1024 / 1024).toFixed(1)} MB used`,
            color: '#10b981',
            path: '/media',
        },
        {
            label: 'Forms',
            icon: FormInput,
            total: stats?.forms.totalForms ?? 0,
            sub: `${stats?.forms.totalSubmissions ?? 0} submissions`,
            color: '#f59e0b',
            path: '/forms',
        },
    ];

    const getBase = () => `/org/${organization?.slug}/app/mero-cms`;

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold" style={{ color: theme.colors.text }}>CMS Dashboard</h1>
                    <p className="text-sm mt-1" style={{ color: theme.colors.textSecondary }}>Manage your website content, blog, and media</p>
                </div>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {cards.map((card) => {
                    const Icon = card.icon;
                    return (
                        <div
                            key={card.label}
                            className="rounded-xl p-5 border cursor-pointer transition-all hover:shadow-md"
                            style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border }}
                            onClick={() => navigate(`${getBase()}${card.path}`)}
                        >
                            <div className="flex items-center justify-between mb-3">
                                <div className="h-10 w-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${card.color}20` }}>
                                    <Icon className="h-5 w-5" style={{ color: card.color }} />
                                </div>
                                <TrendingUp className="h-4 w-4" style={{ color: theme.colors.textSecondary }} />
                            </div>
                            <div className="text-2xl font-bold mb-1" style={{ color: theme.colors.text }}>
                                {loading ? '—' : card.total}
                            </div>
                            <div className="text-sm font-medium mb-0.5" style={{ color: theme.colors.text }}>{card.label}</div>
                            <div className="text-xs" style={{ color: theme.colors.textSecondary }}>{loading ? 'Loading...' : card.sub}</div>
                        </div>
                    );
                })}
            </div>

            {/* Quick Actions */}
            <div className="rounded-xl border p-5" style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border }}>
                <h2 className="text-lg font-semibold mb-4" style={{ color: theme.colors.text }}>Quick Actions</h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                        { label: 'New Page', path: '/pages', icon: FileText, color: '#3b82f6' },
                        { label: 'New Post', path: '/posts', icon: BookOpen, color: '#8b5cf6' },
                        { label: 'Upload Media', path: '/media', icon: Image, color: '#10b981' },
                        { label: 'Create Form', path: '/forms', icon: FormInput, color: '#f59e0b' },
                    ].map((action) => {
                        const Icon = action.icon;
                        return (
                            <button
                                key={action.label}
                                onClick={() => navigate(`${getBase()}${action.path}`)}
                                className="flex items-center gap-2 px-4 py-3 rounded-lg border text-sm font-medium transition-all hover:shadow-sm"
                                style={{ backgroundColor: theme.colors.background, borderColor: theme.colors.border, color: theme.colors.text }}
                            >
                                <Plus className="h-4 w-4" style={{ color: action.color }} />
                                {action.label}
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
