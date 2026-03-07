import React, { useState } from 'react';
import { useTheme } from '@frontend/contexts/ThemeContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@shared';
import {
    Users,
    Search,
    Plus,
    Trash2,
    Edit,
    Phone,
    Mail,
    Briefcase,
    Star,
    X,
    Check,
} from 'lucide-react';
import apiClient from '@frontend/services/api';
import { ClientContact } from '../../api/clients';

interface ContactWithClient extends ClientContact {
    client?: {
        id: string;
        name: string;
    };
}

interface ContactFormState {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    job_title: string;
    client_id: string;
    is_primary: boolean;
}

const defaultForm: ContactFormState = {
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    job_title: '',
    client_id: '',
    is_primary: false,
};

export default function ContactsListPage() {
    const { theme } = useTheme();
    const queryClient = useQueryClient();
    const [search, setSearch] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [editingContact, setEditingContact] = useState<ContactWithClient | null>(null);
    const [form, setForm] = useState<ContactFormState>(defaultForm);

    // Fetch all clients (to get contacts from each)
    const { data: clientsData, isLoading } = useQuery({
        queryKey: ['crm-clients-for-contacts'],
        queryFn: async () => {
            const res = await apiClient.get('/crm/clients?limit=200');
            return res.data;
        },
    });

    // Flatten contacts from all clients
    const allContacts: ContactWithClient[] = React.useMemo(() => {
        if (!clientsData?.data) return [];
        const contacts: ContactWithClient[] = [];
        for (const client of clientsData.data) {
            if (client.contacts && Array.isArray(client.contacts)) {
                for (const c of client.contacts) {
                    contacts.push({ ...c, client: { id: client.id, name: client.name } });
                }
            }
        }
        return contacts;
    }, [clientsData]);

    const filteredContacts = allContacts.filter((c) => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return (
            c.first_name?.toLowerCase().includes(q) ||
            c.last_name?.toLowerCase().includes(q) ||
            c.email?.toLowerCase().includes(q) ||
            c.phone?.toLowerCase().includes(q) ||
            c.job_title?.toLowerCase().includes(q) ||
            c.client?.name?.toLowerCase().includes(q)
        );
    });

    const clients = clientsData?.data || [];

    // Add contact mutation
    const addMutation = useMutation({
        mutationFn: async (data: ContactFormState) => {
            const res = await apiClient.post('/crm/clients/contacts', {
                first_name: data.first_name,
                last_name: data.last_name,
                email: data.email,
                phone: data.phone,
                job_title: data.job_title,
                client_id: data.client_id,
                is_primary: data.is_primary,
            });
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['crm-clients-for-contacts'] });
            setShowForm(false);
            setForm(defaultForm);
        },
    });

    // Update contact mutation
    const updateMutation = useMutation({
        mutationFn: async (data: ContactFormState & { id: string }) => {
            const res = await apiClient.put(`/crm/clients/contacts/${data.id}`, {
                first_name: data.first_name,
                last_name: data.last_name,
                email: data.email,
                phone: data.phone,
                job_title: data.job_title,
                is_primary: data.is_primary,
            });
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['crm-clients-for-contacts'] });
            setEditingContact(null);
            setForm(defaultForm);
        },
    });

    // Delete contact mutation
    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            await apiClient.delete(`/crm/clients/contacts/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['crm-clients-for-contacts'] });
        },
    });

    const handleSubmit = () => {
        if (!form.first_name.trim()) return;
        if (editingContact?.id) {
            updateMutation.mutate({ ...form, id: editingContact.id });
        } else {
            if (!form.client_id) return;
            addMutation.mutate(form);
        }
    };

    const openEdit = (contact: ContactWithClient) => {
        setEditingContact(contact);
        setForm({
            first_name: contact.first_name || '',
            last_name: contact.last_name || '',
            email: contact.email || '',
            phone: contact.phone || '',
            job_title: contact.job_title || '',
            client_id: contact.clientId || contact.client?.id || '',
            is_primary: contact.is_primary || false,
        });
        setShowForm(true);
    };

    const closeForm = () => {
        setShowForm(false);
        setEditingContact(null);
        setForm(defaultForm);
    };

    const inputStyle: React.CSSProperties = {
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.background,
        color: theme.colors.text,
    };

    return (
        <div className="p-8 max-w-[1200px] mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="p-3 rounded-2xl" style={{ backgroundColor: `${theme.colors.primary}15` }}>
                        <Users className="h-8 w-8" style={{ color: theme.colors.primary }} />
                    </div>
                    <div>
                        <h1 className="text-4xl font-extrabold tracking-tight" style={{ color: theme.colors.text }}>
                            Contacts
                        </h1>
                        <p className="opacity-70" style={{ color: theme.colors.textSecondary }}>
                            {allContacts.length} contact{allContacts.length !== 1 ? 's' : ''} across all clients
                        </p>
                    </div>
                </div>
                <button
                    onClick={() => { setEditingContact(null); setForm(defaultForm); setShowForm(true); }}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
                    style={{ backgroundColor: theme.colors.primary }}
                >
                    <Plus className="h-4 w-4" />
                    Add Contact
                </button>
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: theme.colors.textSecondary }} />
                <input
                    type="text"
                    placeholder="Search contacts by name, email, phone, company..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm"
                    style={inputStyle}
                />
            </div>

            {/* Add/Edit Form */}
            {showForm && (
                <Card className="p-6" style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border }}>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold" style={{ color: theme.colors.text }}>
                            {editingContact ? 'Edit Contact' : 'New Contact'}
                        </h3>
                        <button onClick={closeForm}>
                            <X className="h-5 w-5" style={{ color: theme.colors.textSecondary }} />
                        </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium mb-1" style={{ color: theme.colors.textSecondary }}>First Name *</label>
                            <input
                                type="text"
                                value={form.first_name}
                                onChange={(e) => setForm(f => ({ ...f, first_name: e.target.value }))}
                                className="w-full px-3 py-2 rounded-lg border text-sm"
                                style={inputStyle}
                                placeholder="John"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium mb-1" style={{ color: theme.colors.textSecondary }}>Last Name</label>
                            <input
                                type="text"
                                value={form.last_name}
                                onChange={(e) => setForm(f => ({ ...f, last_name: e.target.value }))}
                                className="w-full px-3 py-2 rounded-lg border text-sm"
                                style={inputStyle}
                                placeholder="Doe"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium mb-1" style={{ color: theme.colors.textSecondary }}>Email</label>
                            <input
                                type="email"
                                value={form.email}
                                onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
                                className="w-full px-3 py-2 rounded-lg border text-sm"
                                style={inputStyle}
                                placeholder="john@company.com"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium mb-1" style={{ color: theme.colors.textSecondary }}>Phone</label>
                            <input
                                type="tel"
                                value={form.phone}
                                onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))}
                                className="w-full px-3 py-2 rounded-lg border text-sm"
                                style={inputStyle}
                                placeholder="+977 98XXXXXXXX"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium mb-1" style={{ color: theme.colors.textSecondary }}>Job Title</label>
                            <input
                                type="text"
                                value={form.job_title}
                                onChange={(e) => setForm(f => ({ ...f, job_title: e.target.value }))}
                                className="w-full px-3 py-2 rounded-lg border text-sm"
                                style={inputStyle}
                                placeholder="CEO, Manager..."
                            />
                        </div>
                        {!editingContact && (
                            <div>
                                <label className="block text-xs font-medium mb-1" style={{ color: theme.colors.textSecondary }}>Client *</label>
                                <select
                                    value={form.client_id}
                                    onChange={(e) => setForm(f => ({ ...f, client_id: e.target.value }))}
                                    className="w-full px-3 py-2 rounded-lg border text-sm"
                                    style={inputStyle}
                                >
                                    <option value="">Select client...</option>
                                    {clients.map((c: any) => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="is_primary"
                                checked={form.is_primary}
                                onChange={(e) => setForm(f => ({ ...f, is_primary: e.target.checked }))}
                                className="rounded"
                            />
                            <label htmlFor="is_primary" className="text-sm" style={{ color: theme.colors.text }}>
                                Primary contact
                            </label>
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 mt-4">
                        <button onClick={closeForm} className="px-4 py-2 rounded-lg text-sm border" style={{ borderColor: theme.colors.border, color: theme.colors.text }}>
                            Cancel
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={addMutation.isPending || updateMutation.isPending}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white"
                            style={{ backgroundColor: theme.colors.primary }}
                        >
                            <Check className="h-4 w-4" />
                            {editingContact ? 'Update' : 'Save'} Contact
                        </button>
                    </div>
                </Card>
            )}

            {/* Contacts Table */}
            {isLoading ? (
                <div className="flex items-center justify-center py-16">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: theme.colors.primary }} />
                </div>
            ) : filteredContacts.length === 0 ? (
                <Card className="p-12 text-center" style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border }}>
                    <Users className="h-12 w-12 mx-auto mb-3 opacity-30" style={{ color: theme.colors.textSecondary }} />
                    <p className="font-medium" style={{ color: theme.colors.text }}>
                        {search ? 'No contacts match your search' : 'No contacts yet'}
                    </p>
                    <p className="text-sm mt-1" style={{ color: theme.colors.textSecondary }}>
                        {search ? 'Try a different search term' : 'Add contacts to your clients to see them here'}
                    </p>
                </Card>
            ) : (
                <Card className="overflow-hidden" style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border }}>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr style={{ borderBottom: `1px solid ${theme.colors.border}` }}>
                                    {['Name', 'Job Title', 'Email', 'Phone', 'Client', 'Primary', 'Actions'].map((h) => (
                                        <th
                                            key={h}
                                            className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide"
                                            style={{ color: theme.colors.textSecondary }}
                                        >
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {filteredContacts.map((contact, idx) => (
                                    <tr
                                        key={contact.id || idx}
                                        style={{ borderBottom: `1px solid ${theme.colors.border}` }}
                                        className="hover:opacity-90 transition-opacity"
                                    >
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <div
                                                    className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                                                    style={{ backgroundColor: theme.colors.primary }}
                                                >
                                                    {contact.first_name?.[0]?.toUpperCase()}{contact.last_name?.[0]?.toUpperCase()}
                                                </div>
                                                <span className="font-medium text-sm" style={{ color: theme.colors.text }}>
                                                    {contact.first_name} {contact.last_name}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-1.5">
                                                <Briefcase className="h-3.5 w-3.5" style={{ color: theme.colors.textSecondary }} />
                                                <span className="text-sm" style={{ color: contact.job_title ? theme.colors.text : theme.colors.textSecondary }}>
                                                    {contact.job_title || '—'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            {contact.email ? (
                                                <a href={`mailto:${contact.email}`} className="flex items-center gap-1.5 text-sm hover:underline" style={{ color: theme.colors.primary }}>
                                                    <Mail className="h-3.5 w-3.5" />
                                                    {contact.email}
                                                </a>
                                            ) : (
                                                <span className="text-sm" style={{ color: theme.colors.textSecondary }}>—</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            {contact.phone ? (
                                                <a href={`tel:${contact.phone}`} className="flex items-center gap-1.5 text-sm hover:underline" style={{ color: theme.colors.text }}>
                                                    <Phone className="h-3.5 w-3.5" style={{ color: theme.colors.textSecondary }} />
                                                    {contact.phone}
                                                </a>
                                            ) : (
                                                <span className="text-sm" style={{ color: theme.colors.textSecondary }}>—</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span
                                                className="text-xs px-2 py-0.5 rounded-full font-medium"
                                                style={{ backgroundColor: `${theme.colors.primary}15`, color: theme.colors.primary }}
                                            >
                                                {contact.client?.name || '—'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            {contact.is_primary && (
                                                <Star className="h-4 w-4 inline text-yellow-500" fill="currentColor" />
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => openEdit(contact)}
                                                    className="p-1.5 rounded-lg transition-colors hover:opacity-80"
                                                    style={{ backgroundColor: `${theme.colors.primary}15`, color: theme.colors.primary }}
                                                    title="Edit"
                                                >
                                                    <Edit className="h-3.5 w-3.5" />
                                                </button>
                                                <button
                                                    onClick={() => contact.id && deleteMutation.mutate(contact.id)}
                                                    className="p-1.5 rounded-lg transition-colors hover:opacity-80"
                                                    style={{ backgroundColor: '#fef2f2', color: '#ef4444' }}
                                                    title="Delete"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="px-4 py-3 text-sm" style={{ color: theme.colors.textSecondary, borderTop: `1px solid ${theme.colors.border}` }}>
                        Showing {filteredContacts.length} of {allContacts.length} contact{allContacts.length !== 1 ? 's' : ''}
                    </div>
                </Card>
            )}
        </div>
    );
}
