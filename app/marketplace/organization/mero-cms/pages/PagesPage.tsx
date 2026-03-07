import { useEffect, useState } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { Plus, Edit2, Trash2, Globe, EyeOff, FileText } from 'lucide-react';
import api from '@/services/api';
import toast from '@shared/frontend/hooks/useToast';

interface CmsPage {
    id: string;
    title: string;
    slug: string;
    status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
    published_at: string | null;
    created_at: string;
    meta_title?: string;
}

interface PageFormData {
    title: string;
    slug: string;
    meta_title: string;
    meta_description: string;
    status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
}

export default function PagesPage() {
    const { theme } = useTheme();
    const [pages, setPages] = useState<CmsPage[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingPage, setEditingPage] = useState<CmsPage | null>(null);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState<PageFormData>({ title: '', slug: '', meta_title: '', meta_description: '', status: 'DRAFT' });

    const fetchPages = async () => {
        try {
            const res = await api.get('/cms/pages');
            setPages(res.data);
        } catch { toast.error('Failed to load pages'); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchPages(); }, []);

    const openCreate = () => {
        setEditingPage(null);
        setForm({ title: '', slug: '', meta_title: '', meta_description: '', status: 'DRAFT' });
        setShowForm(true);
    };

    const openEdit = (page: CmsPage) => {
        setEditingPage(page);
        setForm({ title: page.title, slug: page.slug, meta_title: page.meta_title || '', meta_description: '', status: page.status });
        setShowForm(true);
    };

    const handleSave = async () => {
        if (!form.title) return toast.error('Title is required');
        setSaving(true);
        try {
            if (editingPage) {
                await api.patch(`/cms/pages/${editingPage.id}`, form);
                toast.success('Page updated');
            } else {
                await api.post('/cms/pages', form);
                toast.success('Page created');
            }
            setShowForm(false);
            fetchPages();
        } catch { toast.error('Failed to save page'); }
        finally { setSaving(false); }
    };

    const handlePublish = async (page: CmsPage) => {
        try {
            if (page.status === 'PUBLISHED') {
                await api.post(`/cms/pages/${page.id}/unpublish`);
                toast.success('Page unpublished');
            } else {
                await api.post(`/cms/pages/${page.id}/publish`);
                toast.success('Page published');
            }
            fetchPages();
        } catch { toast.error('Failed to update page status'); }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this page?')) return;
        try {
            await api.delete(`/cms/pages/${id}`);
            toast.success('Page deleted');
            fetchPages();
        } catch { toast.error('Failed to delete page'); }
    };

    const statusBadge = (status: string) => {
        const colors = { PUBLISHED: '#10b981', DRAFT: '#6b7280', ARCHIVED: '#f59e0b' };
        return <span className="px-2 py-0.5 rounded-full text-xs font-medium text-white" style={{ backgroundColor: colors[status] || '#6b7280' }}>{status}</span>;
    };

    return (
        <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold" style={{ color: theme.colors.text }}>Pages</h1>
                    <p className="text-sm mt-1" style={{ color: theme.colors.textSecondary }}>Manage your website pages</p>
                </div>
                <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white" style={{ backgroundColor: theme.colors.primary }}>
                    <Plus className="h-4 w-4" /> New Page
                </button>
            </div>

            {/* Table */}
            <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border }}>
                {loading ? (
                    <div className="p-8 text-center" style={{ color: theme.colors.textSecondary }}>Loading pages...</div>
                ) : pages.length === 0 ? (
                    <div className="p-12 text-center">
                        <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" style={{ color: theme.colors.textSecondary }} />
                        <p className="font-medium" style={{ color: theme.colors.text }}>No pages yet</p>
                        <p className="text-sm mt-1" style={{ color: theme.colors.textSecondary }}>Create your first page to get started</p>
                    </div>
                ) : (
                    <table className="w-full">
                        <thead>
                            <tr className="border-b" style={{ borderColor: theme.colors.border }}>
                                {['Title', 'Slug', 'Status', 'Published', 'Actions'].map((h) => (
                                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: theme.colors.textSecondary }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {pages.map((page) => (
                                <tr key={page.id} className="border-b last:border-0" style={{ borderColor: theme.colors.border }}>
                                    <td className="px-4 py-3 font-medium text-sm" style={{ color: theme.colors.text }}>{page.title}</td>
                                    <td className="px-4 py-3 text-sm font-mono" style={{ color: theme.colors.textSecondary }}>/{page.slug}</td>
                                    <td className="px-4 py-3">{statusBadge(page.status)}</td>
                                    <td className="px-4 py-3 text-sm" style={{ color: theme.colors.textSecondary }}>{page.published_at ? new Date(page.published_at).toLocaleDateString() : '—'}</td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <button onClick={() => handlePublish(page)} className="p-1.5 rounded transition-colors" style={{ color: page.status === 'PUBLISHED' ? '#f59e0b' : '#10b981' }} title={page.status === 'PUBLISHED' ? 'Unpublish' : 'Publish'}>
                                                {page.status === 'PUBLISHED' ? <EyeOff className="h-4 w-4" /> : <Globe className="h-4 w-4" />}
                                            </button>
                                            <button onClick={() => openEdit(page)} className="p-1.5 rounded transition-colors" style={{ color: theme.colors.textSecondary }}>
                                                <Edit2 className="h-4 w-4" />
                                            </button>
                                            <button onClick={() => handleDelete(page.id)} className="p-1.5 rounded transition-colors text-red-500">
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Form Modal */}
            {showForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="rounded-xl shadow-xl w-full max-w-lg p-6 space-y-4" style={{ backgroundColor: theme.colors.surface }}>
                        <h2 className="text-lg font-semibold" style={{ color: theme.colors.text }}>{editingPage ? 'Edit Page' : 'New Page'}</h2>
                        {[
                            { label: 'Title *', key: 'title', type: 'text' },
                            { label: 'Slug', key: 'slug', type: 'text' },
                            { label: 'Meta Title', key: 'meta_title', type: 'text' },
                            { label: 'Meta Description', key: 'meta_description', type: 'textarea' },
                        ].map(({ label, key, type }) => (
                            <div key={key}>
                                <label className="block text-sm font-medium mb-1" style={{ color: theme.colors.text }}>{label}</label>
                                {type === 'textarea' ? (
                                    <textarea rows={2} className="w-full px-3 py-2 rounded-lg border text-sm" style={{ backgroundColor: theme.colors.background, borderColor: theme.colors.border, color: theme.colors.text }} value={(form as any)[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
                                ) : (
                                    <input type="text" className="w-full px-3 py-2 rounded-lg border text-sm" style={{ backgroundColor: theme.colors.background, borderColor: theme.colors.border, color: theme.colors.text }} value={(form as any)[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
                                )}
                            </div>
                        ))}
                        <div>
                            <label className="block text-sm font-medium mb-1" style={{ color: theme.colors.text }}>Status</label>
                            <select className="w-full px-3 py-2 rounded-lg border text-sm" style={{ backgroundColor: theme.colors.background, borderColor: theme.colors.border, color: theme.colors.text }} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as any })}>
                                <option value="DRAFT">Draft</option>
                                <option value="PUBLISHED">Published</option>
                                <option value="ARCHIVED">Archived</option>
                            </select>
                        </div>
                        <div className="flex gap-2 pt-2">
                            <button onClick={handleSave} disabled={saving} className="flex-1 py-2 rounded-lg text-sm font-medium text-white" style={{ backgroundColor: theme.colors.primary }}>{saving ? 'Saving...' : 'Save Page'}</button>
                            <button onClick={() => setShowForm(false)} className="flex-1 py-2 rounded-lg text-sm font-medium border" style={{ borderColor: theme.colors.border, color: theme.colors.text }}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
