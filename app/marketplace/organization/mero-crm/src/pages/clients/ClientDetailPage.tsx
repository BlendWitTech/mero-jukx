import React, { useEffect, useState } from 'react';
import { useTheme } from '@frontend/contexts/ThemeContext';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { clientsApi, Client } from '../../api/clients';
import { Card, Button, Badge } from '@shared';
import { ArrowLeft, Edit, Trash2, Mail, Phone, Building, MapPin, Briefcase, FileText, Receipt, DollarSign, Plus, MessageCircle } from 'lucide-react';
import { toast } from '@shared';
import { useAppContext } from '../../contexts/AppContext';
import ActivityTimeline from '../../components/ActivityTimeline';
import { dealsApi, Deal } from '../../api/deals';
import { invoicesApi, Invoice } from '../../api/invoices';
import { quotesApi, Quote } from '../../api/quotes';

export default function ClientDetailPage() {
    const { theme } = useTheme();
    const navigate = useNavigate();
    const { buildHref } = useAppContext();
    const { id } = useParams<{ id: string }>();
    const [client, setClient] = useState<Client | null>(null);
    const [deals, setDeals] = useState<Deal[]>([]);
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [quotes, setQuotes] = useState<Quote[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'overview' | 'deals' | 'invoices' | 'quotes' | 'activities'>('overview');

    useEffect(() => {
        if (id) {
            fetchClientData();
        }
    }, [id]);

    const fetchClientData = async () => {
        if (!id) return;
        try {
            setLoading(true);
            const [clientData, allDeals, allInvoices, allQuotes] = await Promise.all([
                clientsApi.getClient(id),
                dealsApi.getDeals(),
                invoicesApi.getInvoices(1, 100),
                quotesApi.getQuotes(1, 100)
            ]);

            setClient(clientData);

            // Filter deals/invoices/quotes for this client
            // Note: This is a temporary filter until API supports clientId param
            setDeals(allDeals.filter(d => d.lead?.email === clientData.email || d.leadId === id));
            setInvoices(allInvoices.data.filter(inv => inv.clientId === id));
            setQuotes(allQuotes.data.filter(q => q.clientId === id));
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to fetch client data');
            navigate(buildHref('/clients'));
        } finally {
            setLoading(false);
        }
    };

    const openWhatsApp = (phone: string, name: string) => {
        let normalized = phone.replace(/[\s\-]/g, '');
        if (normalized.startsWith('+')) normalized = normalized.slice(1);
        else if (normalized.startsWith('0')) normalized = '977' + normalized.slice(1);
        else if (!normalized.startsWith('977')) normalized = '977' + normalized;
        const message = encodeURIComponent(`Hello ${name}, I'm following up regarding our business relationship.`);
        window.open(`https://wa.me/${normalized}?text=${message}`, '_blank');
    };

    const handleDelete = async () => {
        if (!id || !confirm('Are you sure you want to delete this client?')) {
            return;
        }

        try {
            await clientsApi.deleteClient(id);
            toast.success('Client deleted successfully');
            navigate(buildHref('/clients'));
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to delete client');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center">
                    <div
                        className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4"
                        style={{ borderColor: theme.colors.primary }}
                    ></div>
                    <p style={{ color: theme.colors.textSecondary }}>Loading client...</p>
                </div>
            </div>
        );
    }

    if (!client) {
        return null;
    }

    const totalRevenue = invoices
        .filter(inv => inv.status === 'paid')
        .reduce((sum, inv) => sum + inv.total, 0);

    return (
        <div className="p-8 max-w-[1400px] mx-auto space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate(buildHref('/clients'))} className="p-3 rounded-2xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                        <ArrowLeft className="h-6 w-6" />
                    </button>
                    <div>
                        <h1 className="text-4xl font-extrabold tracking-tight" style={{ color: theme.colors.text }}>{client.name}</h1>
                        <p className="opacity-60" style={{ color: theme.colors.textSecondary }}>{client.company || 'Private Client'}</p>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <Button variant="secondary" onClick={() => navigate(buildHref(`/clients/${id}/edit`))} className="rounded-xl px-5 h-11">
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Client
                    </Button>
                    <Button variant="danger" onClick={handleDelete} className="rounded-xl px-5 h-11">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                    </Button>
                </div>
            </div>

            {/* Metrics Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card className="p-6 bg-primary/5 border-none shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-primary text-white"><DollarSign className="h-5 w-5" /></div>
                        <div>
                            <p className="text-xs font-bold uppercase opacity-50">Lifetime Value</p>
                            <p className="text-2xl font-black">NPR {totalRevenue.toLocaleString()}</p>
                        </div>
                    </div>
                </Card>
                <Card className="p-6 bg-blue-500/5 border-none shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-blue-500 text-white"><Briefcase className="h-5 w-5" /></div>
                        <div>
                            <p className="text-xs font-bold uppercase opacity-50">Active Deals</p>
                            <p className="text-2xl font-black">{deals.filter(d => d.status === 'OPEN').length}</p>
                        </div>
                    </div>
                </Card>
                <Card className="p-6 bg-emerald-500/5 border-none shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-emerald-500 text-white"><Receipt className="h-5 w-5" /></div>
                        <div>
                            <p className="text-xs font-bold uppercase opacity-50">Paid Invoices</p>
                            <p className="text-2xl font-black">{invoices.filter(i => i.status === 'paid').length}</p>
                        </div>
                    </div>
                </Card>
                <Card className="p-6 bg-purple-500/5 border-none shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-purple-500 text-white"><FileText className="h-5 w-5" /></div>
                        <div>
                            <p className="text-xs font-bold uppercase opacity-50">Pending Quotes</p>
                            <p className="text-2xl font-black">{quotes.filter(q => q.status === 'pending' || q.status === 'sent').length}</p>
                        </div>
                    </div>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                {/* Left Column: Details & Tabs */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Navigation Tabs */}
                    <div className="flex items-center gap-2 p-1 bg-black/5 dark:bg-white/5 rounded-2xl w-fit">
                        {[
                            { id: 'overview', label: 'Overview', icon: Building },
                            { id: 'deals', label: 'Deals', icon: Briefcase },
                            { id: 'invoices', label: 'Invoices', icon: Receipt },
                            { id: 'quotes', label: 'Quotes', icon: FileText },
                            { id: 'activities', label: 'Timeline', icon: Edit }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === tab.id ? 'bg-white dark:bg-gray-800 shadow-md text-primary' : 'opacity-60 hover:opacity-100'}`}
                            >
                                <tab.icon className="h-4 w-4" />
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Tab Content */}
                    <Card className="p-8 border-none shadow-xl shadow-black/5" style={{ backgroundColor: theme.colors.surface, borderRadius: '24px' }}>
                        {activeTab === 'overview' && (
                            <div className="space-y-8">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-6">
                                        <h3 className="text-xl font-bold border-b pb-4">Contact Info</h3>
                                        <div className="space-y-4">
                                            {client.category && (
                                                <div className="flex items-center gap-4">
                                                    <div className="p-2 rounded-lg bg-black/5"><Building className="h-4 w-4" /></div>
                                                    <div>
                                                        <p className="text-xs uppercase font-bold opacity-40">Category</p>
                                                        <Badge variant="primary" className="text-xs">{client.category}</Badge>
                                                    </div>
                                                </div>
                                            )}
                                            {client.tags && client.tags.length > 0 && (
                                                <div className="flex items-start gap-4">
                                                    <div className="p-2 rounded-lg bg-black/5"><FileText className="h-4 w-4" /></div>
                                                    <div>
                                                        <p className="text-xs uppercase font-bold opacity-40 mb-1">Tags</p>
                                                        <div className="flex flex-wrap gap-1">
                                                            {client.tags.map(tag => (
                                                                <span key={tag} className="px-2 py-0.5 text-xs rounded-md bg-black/5 dark:bg-white/10">{tag}</span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                            <div className="flex items-center gap-4">
                                                <div className="p-2 rounded-lg bg-black/5"><Mail className="h-4 w-4" /></div>
                                                <div>
                                                    <p className="text-xs uppercase font-bold opacity-40">Email</p>
                                                    <p className="font-bold">{client.email}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <div className="p-2 rounded-lg bg-black/5"><Phone className="h-4 w-4" /></div>
                                                <div>
                                                    <p className="text-xs uppercase font-bold opacity-40">Phone</p>
                                                    <p className="font-bold">{client.phone || '--'}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-6">
                                        <h3 className="text-xl font-bold border-b pb-4">Location</h3>
                                        <div className="flex items-start gap-4">
                                            <div className="p-2 rounded-lg bg-black/5 mt-1"><MapPin className="h-4 w-4" /></div>
                                            <div>
                                                <p className="text-xs uppercase font-bold opacity-40">Address</p>
                                                <p className="font-bold leading-relaxed">
                                                    {[client.address, client.city, client.state, client.zipCode, client.country]
                                                        .filter(Boolean)
                                                        .join(', ') || 'No address provided'}
                                                </p>
                                            </div>
                                        </div>

                                        {client.custom_fields && Object.keys(client.custom_fields).length > 0 && (
                                            <div className="pt-4 mt-4 border-t border-dashed">
                                                <h4 className="text-sm font-bold opacity-60 uppercase mb-3">Custom Fields</h4>
                                                <div className="space-y-3">
                                                    {Object.entries(client.custom_fields).map(([key, value]) => (
                                                        <div key={key} className="flex flex-col">
                                                            <p className="text-xs font-bold opacity-40 uppercase">{key}</p>
                                                            <p className="font-medium text-sm">{String(value)}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Contact Persons */}
                                <div className="pt-6 mt-6 border-t">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-xl font-bold">Contact Persons</h3>
                                    </div>
                                    {client.contacts && client.contacts.length > 0 ? (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {client.contacts.map((contact, idx) => (
                                                <div key={contact.id || idx} className="p-4 rounded-xl border relative" style={{ borderColor: theme.colors.border, backgroundColor: theme.colors.background }}>
                                                    {contact.is_primary && (
                                                        <div className="absolute top-0 right-0 m-2">
                                                            <Badge variant="success" className="text-[10px]">Primary</Badge>
                                                        </div>
                                                    )}
                                                    <h4 className="font-bold text-lg">{contact.first_name} {contact.last_name || ''}</h4>
                                                    {contact.job_title && <p className="text-sm opacity-60 mb-2">{contact.job_title}</p>}

                                                    <div className="space-y-1 mt-3">
                                                        {contact.email && (
                                                            <div className="flex items-center gap-2 text-sm">
                                                                <Mail className="h-3.5 w-3.5 opacity-50" />
                                                                <p className="font-medium">{contact.email}</p>
                                                            </div>
                                                        )}
                                                        {contact.phone && (
                                                            <div className="flex items-center gap-2 text-sm mt-1">
                                                                <Phone className="h-3.5 w-3.5 opacity-50" />
                                                                <p className="font-medium">{contact.phone}</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="p-4 rounded-xl border border-dashed text-center opacity-60 text-sm">
                                            No contact persons added.
                                        </div>
                                    )}
                                </div>

                                {client.notes && (
                                    <div className="pt-6 border-t mt-6">
                                        <h3 className="text-xl font-bold mb-4">Internal Notes</h3>
                                        <p className="opacity-70 leading-relaxed whitespace-pre-wrap">{client.notes}</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'deals' && (
                            <div className="space-y-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-xl font-bold">Associated Deals</h3>
                                    <Link to={buildHref(`/deals/new?clientId=${client.id}`)}>
                                        <Button size="sm" variant="primary"><Plus className="h-4 w-4 mr-2" /> New Deal</Button>
                                    </Link>
                                </div>
                                {deals.length === 0 ? (
                                    <p className="text-center py-12 opacity-50">No deals associated with this client.</p>
                                ) : (
                                    <div className="divide-y">
                                        {deals.map(deal => (
                                            <div key={deal.id} className="py-4 flex items-center justify-between hover:bg-black/5 px-4 rounded-xl transition-colors cursor-pointer" onClick={() => navigate(buildHref(`/deals/${deal.id}/edit`))}>
                                                <div>
                                                    <p className="font-bold">{deal.title}</p>
                                                    <p className="text-xs opacity-50">{deal.stage} • {deal.probability}% probability</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-black text-primary">{deal.currency} {deal.value.toLocaleString()}</p>
                                                    <p className="text-[10px] uppercase font-bold opacity-40">Status: {deal.status}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'invoices' && (
                            <div className="space-y-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-xl font-bold">Billing History</h3>
                                    <Link to={buildHref(`/invoices/new?clientId=${client.id}`)}>
                                        <Button size="sm" variant="primary"><Plus className="h-4 w-4 mr-2" /> New Invoice</Button>
                                    </Link>
                                </div>
                                {invoices.length === 0 ? (
                                    <p className="text-center py-12 opacity-50">No invoices generated yet.</p>
                                ) : (
                                    <div className="divide-y">
                                        {invoices.map(inv => (
                                            <div key={inv.id} className="py-4 flex items-center justify-between hover:bg-black/5 px-4 rounded-xl transition-colors cursor-pointer" onClick={() => navigate(buildHref(`/invoices/${inv.id}`))}>
                                                <div>
                                                    <p className="font-bold">INV-{inv.invoiceNumber}</p>
                                                    <p className="text-xs opacity-50 text-red-500">Due: {new Date(inv.dueDate).toLocaleDateString()}</p>
                                                </div>
                                                <div className="text-right flex items-center gap-6">
                                                    <div className="text-right">
                                                        <p className="font-black">USD {inv.total.toLocaleString()}</p>
                                                        <p className="text-[10px] uppercase font-bold opacity-40">{inv.status}</p>
                                                    </div>
                                                    <Badge variant={inv.status === 'paid' ? 'success' : 'warning'}>{inv.status.toUpperCase()}</Badge>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'quotes' && (
                            <div className="space-y-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-xl font-bold">Quotes & Proposals</h3>
                                    <Link to={buildHref(`/quotes/new?clientId=${client.id}`)}>
                                        <Button size="sm" variant="primary"><Plus className="h-4 w-4 mr-2" /> New Quote</Button>
                                    </Link>
                                </div>
                                {quotes.length === 0 ? (
                                    <p className="text-center py-12 opacity-50">No quotes created for this client.</p>
                                ) : (
                                    <div className="divide-y">
                                        {quotes.map(q => (
                                            <div key={q.id} className="py-4 flex items-center justify-between hover:bg-black/5 px-4 rounded-xl transition-colors cursor-pointer" onClick={() => navigate(buildHref(`/quotes/${q.id}`))}>
                                                <div>
                                                    <p className="font-bold">Quote #{q.number}/{q.year}</p>
                                                    <p className="text-xs opacity-50">Expires: {new Date(q.expiredDate).toLocaleDateString()}</p>
                                                </div>
                                                <div className="text-right flex items-center gap-6">
                                                    <div className="text-right">
                                                        <p className="font-black">{q.currency}{q.total.toLocaleString()}</p>
                                                        <p className="text-[10px] uppercase font-bold opacity-40">{q.status}</p>
                                                    </div>
                                                    <Badge variant="info">{q.status.toUpperCase()}</Badge>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'activities' && (
                            <div>
                                <h3 className="text-xl font-bold mb-6">Interaction Timeline</h3>
                                <ActivityTimeline leadId={client.leadId} />
                            </div>
                        )}
                    </Card>
                </div>

                {/* Right Column: Mini Stats & Quick Actions */}
                <div className="space-y-6">
                    <Card className="p-6 border-none shadow-lg" style={{ backgroundColor: theme.colors.surface, borderRadius: '24px' }}>
                        <h3 className="text-lg font-bold mb-6">Relationship Health</h3>
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <span className="text-sm opacity-60">Status</span>
                                <Badge variant="success" className="rounded-full px-4">Active Parent</Badge>
                            </div>
                            <div className="space-y-2">
                                <div className="flex justify-between text-xs font-bold uppercase opacity-40">
                                    <span>Engagement</span>
                                    <span>85%</span>
                                </div>
                                <div className="h-2 bg-black/5 rounded-full overflow-hidden">
                                    <div className="h-full bg-primary" style={{ width: '85%' }}></div>
                                </div>
                            </div>
                        </div>
                    </Card>

                    <Card className="p-6 border-none shadow-lg" style={{ backgroundColor: theme.colors.surface, borderRadius: '24px' }}>
                        <h3 className="text-lg font-bold mb-6">Quick Tools</h3>
                        <div className="grid grid-cols-1 gap-3">
                            <Button variant="outline" className="justify-start gap-3 h-12 rounded-xl" onClick={() => navigate(buildHref(`/invoices/new?clientId=${client.id}`))}>
                                <Receipt className="h-4 w-4" /> Generate Invoice
                            </Button>
                            <Button variant="outline" className="justify-start gap-3 h-12 rounded-xl" onClick={() => navigate(buildHref(`/quotes/new?clientId=${client.id}`))}>
                                <FileText className="h-4 w-4" /> Send Proposal
                            </Button>
                            <Button variant="outline" className="justify-start gap-3 h-12 rounded-xl" onClick={() => navigate(buildHref(`/deals/new?clientId=${client.id}`))}>
                                <Briefcase className="h-4 w-4" /> Log New Deal
                            </Button>
                            {client.phone && (
                                <Button
                                    className="justify-start gap-3 h-12 rounded-xl bg-green-50 text-green-700 hover:bg-green-100 border-none dark:bg-green-900/20 dark:text-green-400"
                                    onClick={() => openWhatsApp(client.phone!, client.name)}
                                >
                                    <MessageCircle className="h-4 w-4" /> WhatsApp Follow-up
                                </Button>
                            )}
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}
