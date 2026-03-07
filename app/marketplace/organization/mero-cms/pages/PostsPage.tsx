import { useEffect, useState } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { Plus, Edit2, Trash2, Globe, EyeOff, BookOpen } from 'lucide-react';
import api from '@/services/api';
import toast from '@shared/frontend/hooks/useToast';

interface CmsPost {
    id: string;
    title: string;
    slug: string;
    status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
    category: string | null;
    published_at: string | null;
    created_at: string;
    author_id: string;
}

interface PostFormData {
    title: string;
    slug: string;
    content: string;
    excerpt: string;
    category: string;
    status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
    meta_title: string;
    meta_description: string;
}

export default function PostsPage() {
    const { theme } = useTheme();
    const [posts, setPosts] = useState<CmsPost[]>([]);
    const [categories, setCategories] = useState<string[]>([]);
    const [selectedCategory, setSelectedCategory] = useState('');
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingPost, setEditingPost] = useState<CmsPost | null>(null);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState<PostFormData>({ title: '', slug: '', content: '', excerpt: '', category: '', status: 'DRAFT', meta_title: '', meta_description: '' });

    const fetchPosts = async () => {
        try {
            const params = selectedCategory ? `?category=${selectedCategory}` : '';
            const [postsRes, catsRes] = await Promise.all([api.get(`/cms/posts${params}`), api.get('/cms/posts/categories')]);
            setPosts(postsRes.data);
            setCategories(catsRes.data);
        } catch { toast.error('Failed to load posts'); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchPosts(); }, [selectedCategory]);

    const openCreate = () => { setEditingPost(null); setForm({ title: '', slug: '', content: '', excerpt: '', category: '', status: 'DRAFT', meta_title: '', meta_description: '' }); setShowForm(true); };
    const openEdit = (post: CmsPost) => { setEditingPost(post); setForm({ title: post.title, slug: post.slug, content: '', excerpt: '', category: post.category || '', status: post.status, meta_title: '', meta_description: '' }); setShowForm(true); };

    const handleSave = async () => {
        if (!form.title) return toast.error('Title is required');
        setSaving(true);
        try {
            if (editingPost) { await api.patch(`/cms/posts/${editingPost.id}`, form); toast.success('Post updated'); }
            else { await api.post('/cms/posts', form); toast.success('Post created'); }
            setShowForm(false); fetchPosts();
        } catch { toast.error('Failed to save post'); }
        finally { setSaving(false); }
    };

    const handlePublish = async (post: CmsPost) => {
        try {
            if (post.status === 'PUBLISHED') { await api.post(`/cms/posts/${post.id}/unpublish`); toast.success('Post unpublished'); }
            else { await api.post(`/cms/posts/${post.id}/publish`); toast.success('Post published'); }
            fetchPosts();
        } catch { toast.error('Failed to update post status'); }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this post?')) return;
        try { await api.delete(`/cms/posts/${id}`); toast.success('Post deleted'); fetchPosts(); }
        catch { toast.error('Failed to delete post'); }
    };

    const statusBadge = (status: string) => {
        const colors = { PUBLISHED: '#10b981', DRAFT: '#6b7280', ARCHIVED: '#f59e0b' };
        return <span className="px-2 py-0.5 rounded-full text-xs font-medium text-white" style={{ backgroundColor: colors[status] || '#6b7280' }}>{status}</span>;
    };

    return (
        <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold" style={{ color: theme.colors.text }}>Blog Posts</h1>
                    <p className="text-sm mt-1" style={{ color: theme.colors.textSecondary }}>Write and publish blog articles</p>
                </div>
                <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white" style={{ backgroundColor: theme.colors.primary }}>
                    <Plus className="h-4 w-4" /> New Post
                </button>
            </div>

            {/* Category Filter */}
            {categories.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                    <button onClick={() => setSelectedCategory('')} className="px-3 py-1 rounded-full text-xs font-medium border transition-colors" style={{ backgroundColor: !selectedCategory ? theme.colors.primary : 'transparent', color: !selectedCategory ? '#fff' : theme.colors.textSecondary, borderColor: theme.colors.border }}>All</button>
                    {categories.map((cat) => (
                        <button key={cat} onClick={() => setSelectedCategory(cat)} className="px-3 py-1 rounded-full text-xs font-medium border transition-colors" style={{ backgroundColor: selectedCategory === cat ? theme.colors.primary : 'transparent', color: selectedCategory === cat ? '#fff' : theme.colors.textSecondary, borderColor: theme.colors.border }}>{cat}</button>
                    ))}
                </div>
            )}

            <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border }}>
                {loading ? (
                    <div className="p-8 text-center" style={{ color: theme.colors.textSecondary }}>Loading posts...</div>
                ) : posts.length === 0 ? (
                    <div className="p-12 text-center">
                        <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-30" style={{ color: theme.colors.textSecondary }} />
                        <p className="font-medium" style={{ color: theme.colors.text }}>No posts yet</p>
                        <p className="text-sm mt-1" style={{ color: theme.colors.textSecondary }}>Write your first blog post</p>
                    </div>
                ) : (
                    <table className="w-full">
                        <thead>
                            <tr className="border-b" style={{ borderColor: theme.colors.border }}>
                                {['Title', 'Category', 'Status', 'Published', 'Actions'].map((h) => (
                                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: theme.colors.textSecondary }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {posts.map((post) => (
                                <tr key={post.id} className="border-b last:border-0" style={{ borderColor: theme.colors.border }}>
                                    <td className="px-4 py-3 font-medium text-sm" style={{ color: theme.colors.text }}>{post.title}</td>
                                    <td className="px-4 py-3 text-sm" style={{ color: theme.colors.textSecondary }}>{post.category || '—'}</td>
                                    <td className="px-4 py-3">{statusBadge(post.status)}</td>
                                    <td className="px-4 py-3 text-sm" style={{ color: theme.colors.textSecondary }}>{post.published_at ? new Date(post.published_at).toLocaleDateString() : '—'}</td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <button onClick={() => handlePublish(post)} className="p-1.5 rounded" style={{ color: post.status === 'PUBLISHED' ? '#f59e0b' : '#10b981' }} title={post.status === 'PUBLISHED' ? 'Unpublish' : 'Publish'}>
                                                {post.status === 'PUBLISHED' ? <EyeOff className="h-4 w-4" /> : <Globe className="h-4 w-4" />}
                                            </button>
                                            <button onClick={() => openEdit(post)} className="p-1.5 rounded" style={{ color: theme.colors.textSecondary }}><Edit2 className="h-4 w-4" /></button>
                                            <button onClick={() => handleDelete(post.id)} className="p-1.5 rounded text-red-500"><Trash2 className="h-4 w-4" /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {showForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="rounded-xl shadow-xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto" style={{ backgroundColor: theme.colors.surface }}>
                        <h2 className="text-lg font-semibold" style={{ color: theme.colors.text }}>{editingPost ? 'Edit Post' : 'New Post'}</h2>
                        {[
                            { label: 'Title *', key: 'title', type: 'text' },
                            { label: 'Slug', key: 'slug', type: 'text' },
                            { label: 'Category', key: 'category', type: 'text' },
                            { label: 'Excerpt', key: 'excerpt', type: 'textarea' },
                            { label: 'Content', key: 'content', type: 'textarea' },
                        ].map(({ label, key, type }) => (
                            <div key={key}>
                                <label className="block text-sm font-medium mb-1" style={{ color: theme.colors.text }}>{label}</label>
                                {type === 'textarea' ? (
                                    <textarea rows={3} className="w-full px-3 py-2 rounded-lg border text-sm" style={{ backgroundColor: theme.colors.background, borderColor: theme.colors.border, color: theme.colors.text }} value={(form as any)[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
                                ) : (
                                    <input type="text" className="w-full px-3 py-2 rounded-lg border text-sm" style={{ backgroundColor: theme.colors.background, borderColor: theme.colors.border, color: theme.colors.text }} value={(form as any)[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
                                )}
                            </div>
                        ))}
                        <div>
                            <label className="block text-sm font-medium mb-1" style={{ color: theme.colors.text }}>Status</label>
                            <select className="w-full px-3 py-2 rounded-lg border text-sm" style={{ backgroundColor: theme.colors.background, borderColor: theme.colors.border, color: theme.colors.text }} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as any })}>
                                <option value="DRAFT">Draft</option><option value="PUBLISHED">Published</option><option value="ARCHIVED">Archived</option>
                            </select>
                        </div>
                        <div className="flex gap-2 pt-2">
                            <button onClick={handleSave} disabled={saving} className="flex-1 py-2 rounded-lg text-sm font-medium text-white" style={{ backgroundColor: theme.colors.primary }}>{saving ? 'Saving...' : 'Save Post'}</button>
                            <button onClick={() => setShowForm(false)} className="flex-1 py-2 rounded-lg text-sm border" style={{ borderColor: theme.colors.border, color: theme.colors.text }}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
