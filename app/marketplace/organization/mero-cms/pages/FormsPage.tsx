import { useEffect, useState } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { Plus, Edit2, Trash2, FormInput, Eye } from 'lucide-react';
import api from '@/services/api';
import toast from '@shared/frontend/hooks/useToast';

interface CmsForm {
    id: string;
    name: string;
    slug: string;
    status: 'ACTIVE' | 'INACTIVE';
    crm_sync: boolean;
    email_notify: boolean;
    notify_email: string | null;
    created_at: string;
}

interface CmsFormSubmission {
    id: string;
    data: Record<string, any>;
    submitted_at: string;
    ip_address: string | null;
}

interface FormData {
    name: string;
    slug: string;
    crm_sync: boolean;
    email_notify: boolean;
    notify_email: string;
    status: 'ACTIVE' | 'INACTIVE';
}

export default function FormsPage() {
    const { theme } = useTheme();
    const [forms, setForms] = useState<CmsForm[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingForm, setEditingForm] = useState<CmsForm | null>(null);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState<FormData>({ name: '', slug: '', crm_sync: false, email_notify: false, notify_email: '', status: 'ACTIVE' });
    const [viewingSubmissions, setViewingSubmissions] = useState<CmsForm | null>(null);
    const [submissions, setSubmissions] = useState<CmsFormSubmission[]>([]);
    const [loadingSubs, setLoadingSubs] = useState(false);

    const fetchForms = async () => {
        try { const res = await api.get('/cms/forms'); setForms(res.data); }
        catch { toast.error('Failed to load forms'); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchForms(); }, []);

    const openCreate = () => { setEditingForm(null); setFormData({ name: '', slug: '', crm_sync: false, email_notify: false, notify_email: '', status: 'ACTIVE' }); setShowForm(true); };
    const openEdit = (form: CmsForm) => { setEditingForm(form); setFormData({ name: form.name, slug: form.slug, crm_sync: form.crm_sync, email_notify: form.email_notify, notify_email: form.notify_email || '', status: form.status }); setShowForm(true); };

    const handleSave = async () => {
        if (!formData.name) return toast.error('Name is required');
        setSaving(true);
        try {
            if (editingForm) { await api.patch(`/cms/forms/${editingForm.id}`, formData); toast.success('Form updated'); }
            else { await api.post('/cms/forms', formData); toast.success('Form created'); }
            setShowForm(false); fetchForms();
        } catch { toast.error('Failed to save form'); }
        finally { setSaving(false); }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this form and all its submissions?')) return;
        try { await api.delete(`/cms/forms/${id}`); toast.success('Form deleted'); fetchForms(); }
        catch { toast.error('Failed to delete form'); }
    };

    const viewSubmissions = async (form: CmsForm) => {
        setViewingSubmissions(form);
        setLoadingSubs(true);
        try { const res = await api.get(`/cms/forms/${form.id}/submissions`); setSubmissions(res.data); }
        catch { toast.error('Failed to load submissions'); }
        finally { setLoadingSubs(false); }
    };

    return (
        <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold" style={{ color: theme.colors.text }}>Forms</h1>
                    <p className="text-sm mt-1" style={{ color: theme.colors.textSecondary }}>Create lead capture forms and collect submissions</p>
                </div>
                <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white" style={{ backgroundColor: theme.colors.primary }}>
                    <Plus className="h-4 w-4" /> New Form
                </button>
            </div>

            <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border }}>
                {loading ? (
                    <div className="p-8 text-center" style={{ color: theme.colors.textSecondary }}>Loading forms...</div>
                ) : forms.length === 0 ? (
                    <div className="p-12 text-center">
                        <FormInput className="h-12 w-12 mx-auto mb-3 opacity-30" style={{ color: theme.colors.textSecondary }} />
                        <p className="font-medium" style={{ color: theme.colors.text }}>No forms yet</p>
                        <p className="text-sm mt-1" style={{ color: theme.colors.textSecondary }}>Create a form to start collecting leads</p>
                    </div>
                ) : (
                    <table className="w-full">
                        <thead>
                            <tr className="border-b" style={{ borderColor: theme.colors.border }}>
                                {['Name', 'CRM Sync', 'Email Notify', 'Status', 'Actions'].map((h) => (
                                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: theme.colors.textSecondary }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {forms.map((form) => (
                                <tr key={form.id} className="border-b last:border-0" style={{ borderColor: theme.colors.border }}>
                                    <td className="px-4 py-3 font-medium text-sm" style={{ color: theme.colors.text }}>{form.name}</td>
                                    <td className="px-4 py-3 text-sm">{form.crm_sync ? <span className="px-2 py-0.5 rounded-full text-xs text-white bg-green-500">On</span> : <span className="px-2 py-0.5 rounded-full text-xs bg-gray-200 text-gray-700">Off</span>}</td>
                                    <td className="px-4 py-3 text-sm">{form.email_notify ? <span className="px-2 py-0.5 rounded-full text-xs text-white bg-blue-500">On</span> : <span className="px-2 py-0.5 rounded-full text-xs bg-gray-200 text-gray-700">Off</span>}</td>
                                    <td className="px-4 py-3"><span className="px-2 py-0.5 rounded-full text-xs text-white" style={{ backgroundColor: form.status === 'ACTIVE' ? '#10b981' : '#6b7280' }}>{form.status}</span></td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <button onClick={() => viewSubmissions(form)} className="p-1.5 rounded" style={{ color: '#3b82f6' }} title="View submissions"><Eye className="h-4 w-4" /></button>
                                            <button onClick={() => openEdit(form)} className="p-1.5 rounded" style={{ color: theme.colors.textSecondary }}><Edit2 className="h-4 w-4" /></button>
                                            <button onClick={() => handleDelete(form.id)} className="p-1.5 rounded text-red-500"><Trash2 className="h-4 w-4" /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Form Create/Edit Modal */}
            {showForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="rounded-xl shadow-xl w-full max-w-md p-6 space-y-4" style={{ backgroundColor: theme.colors.surface }}>
                        <h2 className="text-lg font-semibold" style={{ color: theme.colors.text }}>{editingForm ? 'Edit Form' : 'New Form'}</h2>
                        {[{ label: 'Name *', key: 'name' }, { label: 'Slug', key: 'slug' }, { label: 'Notify Email', key: 'notify_email' }].map(({ label, key }) => (
                            <div key={key}>
                                <label className="block text-sm font-medium mb-1" style={{ color: theme.colors.text }}>{label}</label>
                                <input type="text" className="w-full px-3 py-2 rounded-lg border text-sm" style={{ backgroundColor: theme.colors.background, borderColor: theme.colors.border, color: theme.colors.text }} value={(formData as any)[key]} onChange={(e) => setFormData({ ...formData, [key]: e.target.value })} />
                            </div>
                        ))}
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-medium" style={{ color: theme.colors.text }}>Sync submissions to CRM as leads</label>
                            <input type="checkbox" checked={formData.crm_sync} onChange={(e) => setFormData({ ...formData, crm_sync: e.target.checked })} />
                        </div>
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-medium" style={{ color: theme.colors.text }}>Email notification on submission</label>
                            <input type="checkbox" checked={formData.email_notify} onChange={(e) => setFormData({ ...formData, email_notify: e.target.checked })} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1" style={{ color: theme.colors.text }}>Status</label>
                            <select className="w-full px-3 py-2 rounded-lg border text-sm" style={{ backgroundColor: theme.colors.background, borderColor: theme.colors.border, color: theme.colors.text }} value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}>
                                <option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option>
                            </select>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={handleSave} disabled={saving} className="flex-1 py-2 rounded-lg text-sm font-medium text-white" style={{ backgroundColor: theme.colors.primary }}>{saving ? 'Saving...' : 'Save Form'}</button>
                            <button onClick={() => setShowForm(false)} className="flex-1 py-2 rounded-lg text-sm border" style={{ borderColor: theme.colors.border, color: theme.colors.text }}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Submissions Modal */}
            {viewingSubmissions && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="rounded-xl shadow-xl w-full max-w-2xl p-6 space-y-4 max-h-[80vh] flex flex-col" style={{ backgroundColor: theme.colors.surface }}>
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-semibold" style={{ color: theme.colors.text }}>Submissions — {viewingSubmissions.name}</h2>
                            <button onClick={() => setViewingSubmissions(null)} className="text-sm" style={{ color: theme.colors.textSecondary }}>Close</button>
                        </div>
                        <div className="flex-1 overflow-y-auto space-y-2">
                            {loadingSubs ? <div className="text-center py-4" style={{ color: theme.colors.textSecondary }}>Loading...</div> : submissions.length === 0 ? <div className="text-center py-8" style={{ color: theme.colors.textSecondary }}>No submissions yet</div> : submissions.map((sub) => (
                                <div key={sub.id} className="p-3 rounded-lg border" style={{ backgroundColor: theme.colors.background, borderColor: theme.colors.border }}>
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs font-medium" style={{ color: theme.colors.textSecondary }}>{new Date(sub.submitted_at).toLocaleString()}</span>
                                        {sub.ip_address && <span className="text-xs" style={{ color: theme.colors.textSecondary }}>{sub.ip_address}</span>}
                                    </div>
                                    <pre className="text-xs overflow-x-auto" style={{ color: theme.colors.text }}>{JSON.stringify(sub.data, null, 2)}</pre>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
