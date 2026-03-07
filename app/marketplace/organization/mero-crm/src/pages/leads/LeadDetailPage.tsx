import React, { useEffect, useState } from 'react';
import { useTheme } from '@frontend/contexts/ThemeContext';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { leadsApi, Lead } from '../../api/leads';
import { Card, Button, Badge, Avatar } from '@shared';
import { ArrowLeft, Edit, Trash2, Mail, Phone, User, MapPin, Briefcase, FileText, Plus, Target, Star, TrendingUp, MessageCircle } from 'lucide-react';
import { toast } from '@shared';
import { useAppContext } from '../../contexts/AppContext';
import ActivityTimeline from '../../components/ActivityTimeline';

export default function LeadDetailPage() {
    const { theme } = useTheme();
    const navigate = useNavigate();
    const { buildHref } = useAppContext();
    const { id } = useParams<{ id: string }>();
    const [lead, setLead] = useState<Lead | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'overview' | 'activities'>('overview');

    useEffect(() => {
        if (id) {
            fetchLeadData();
        }
    }, [id]);

    const fetchLeadData = async () => {
        if (!id) return;
        try {
            setLoading(true);
            const leadData = await leadsApi.getLead(id);
            setLead(leadData);
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to fetch lead data');
            navigate(buildHref('/leads'));
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!id || !confirm('Are you sure you want to delete this lead?')) {
            return;
        }

        try {
            await leadsApi.deleteLead(id);
            toast.success('Lead deleted successfully');
            navigate(buildHref('/leads'));
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to delete lead');
        }
    };

    const handleConvert = async () => {
        if (!id) return;
        try {
            setLoading(true);
            await leadsApi.convertToClient(id);
            toast.success('Lead converted to client successfully');
            fetchLeadData();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to convert lead');
            setLoading(false);
        }
    };

    const openWhatsApp = (phone: string, name: string) => {
        let normalized = phone.replace(/[\s\-]/g, '');
        if (normalized.startsWith('+')) normalized = normalized.slice(1);
        else if (normalized.startsWith('0')) normalized = '977' + normalized.slice(1);
        else if (!normalized.startsWith('977')) normalized = '977' + normalized;
        const message = encodeURIComponent(`Hello ${name}, I'm following up regarding our discussion.`);
        window.open(`https://wa.me/${normalized}?text=${message}`, '_blank');
    };

    const handleWinLoss = async (status: 'WON' | 'LOST') => {
        if (!id) return;
        const reason = prompt(`Please enter a reason for marking this lead as ${status}:`);
        if (reason === null) return; // User cancelled

        try {
            setLoading(true);
            await leadsApi.updateLead(id, { status, win_loss_reason: reason });
            toast.success(`Lead marked as ${status}`);
            fetchLeadData();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to update lead status');
            setLoading(false);
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
                    <p style={{ color: theme.colors.textSecondary }}>Loading lead...</p>
                </div>
            </div>
        );
    }

    if (!lead) return null;

    return (
        <div className="p-8 max-w-[1400px] mx-auto space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate(buildHref('/leads'))} className="p-3 rounded-2xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                        <ArrowLeft className="h-6 w-6" />
                    </button>
                    <div>
                        <h1 className="text-4xl font-extrabold tracking-tight" style={{ color: theme.colors.text }}>
                            {lead.first_name} {lead.last_name}
                        </h1>
                        <div className="flex items-center gap-2 mt-1">
                            <p className="opacity-60" style={{ color: theme.colors.textSecondary }}>{lead.company || 'Private Lead'}</p>
                            <Badge variant="info" className="text-[10px] py-0">{lead.status}</Badge>
                            {lead.score !== undefined && (
                                <Badge variant="warning" className="text-[10px] py-0" style={{ backgroundColor: `${theme.colors.primary}20`, color: theme.colors.primary }}>Score: {lead.score}</Badge>
                            )}
                        </div>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <Button variant="secondary" onClick={() => navigate(buildHref(`/leads/${id}/edit`))} className="rounded-xl px-5 h-11">
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Lead
                    </Button>
                    <Button variant="danger" onClick={handleDelete} className="rounded-xl px-5 h-11">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                    </Button>
                </div>
            </div>

            {/* Top Metrics / Highlights */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="p-6 bg-primary/5 border-none shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-primary text-white"><TrendingUp className="h-5 w-5" /></div>
                        <div>
                            <p className="text-xs font-bold uppercase opacity-50">Estimated Value</p>
                            <p className="text-2xl font-black">NPR {lead.estimated_value?.toLocaleString() || '0'}</p>
                        </div>
                    </div>
                </Card>
                <Card className="p-6 bg-amber-500/5 border-none shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-amber-500 text-white"><Star className="h-5 w-5" /></div>
                        <div>
                            <p className="text-xs font-bold uppercase opacity-50">Rating</p>
                            <p className="text-2xl font-black">{lead.rating || 'COLD'}</p>
                        </div>
                    </div>
                </Card>
                <Card className="p-6 bg-blue-500/5 border-none shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-blue-500 text-white"><Target className="h-5 w-5" /></div>
                        <div>
                            <p className="text-xs font-bold uppercase opacity-50">Source</p>
                            <p className="text-2xl font-black">{lead.source || 'Manual'}</p>
                        </div>
                    </div>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                <div className="lg:col-span-2 space-y-8">
                    {/* Tabs */}
                    <div className="flex items-center gap-2 p-1 bg-black/5 dark:bg-white/5 rounded-2xl w-fit">
                        {[
                            { id: 'overview', label: 'Overview', icon: User },
                            { id: 'activities', label: 'Timeline', icon: Edit }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === tab.id ? 'bg-white dark:bg-gray-800 shadow-md text-primary' : 'opacity-60 hover:opacity-100'}`}
                            >
                                <tab.icon className="h-4 w-4" />
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    <Card className="p-8 border-none shadow-xl shadow-black/5" style={{ backgroundColor: theme.colors.surface, borderRadius: '24px' }}>
                        {activeTab === 'overview' && (
                            <div className="space-y-8">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-6">
                                        <h3 className="text-xl font-bold border-b pb-4">Lead Details</h3>
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-4">
                                                <div className="p-2 rounded-lg bg-black/5"><Mail className="h-4 w-4" /></div>
                                                <div>
                                                    <p className="text-xs uppercase font-bold opacity-40">Email</p>
                                                    <p className="font-bold">{lead.email || '--'}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <div className="p-2 rounded-lg bg-black/5"><Phone className="h-4 w-4" /></div>
                                                <div>
                                                    <p className="text-xs uppercase font-bold opacity-40">Phone</p>
                                                    <p className="font-bold">{lead.phone || '--'}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <div className="p-2 rounded-lg bg-black/5"><Briefcase className="h-4 w-4" /></div>
                                                <div>
                                                    <p className="text-xs uppercase font-bold opacity-40">Job Title</p>
                                                    <p className="font-bold">{lead.job_title || '--'}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-6">
                                        <h3 className="text-xl font-bold border-b pb-4">Assignment</h3>
                                        <div className="flex items-center gap-4">
                                            {lead.assignedTo ? (
                                                <div className="flex items-center gap-3">
                                                    <Avatar name={`${lead.assignedTo.firstName} ${lead.assignedTo.lastName}`} className="h-10 w-10 ring-2 ring-primary/20" />
                                                    <div>
                                                        <p className="text-xs uppercase font-bold opacity-40">Owner</p>
                                                        <p className="font-bold">{lead.assignedTo.firstName} {lead.assignedTo.lastName}</p>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-3 opacity-50">
                                                    <div className="h-10 w-10 rounded-full bg-black/5 flex items-center justify-center">
                                                        <User className="h-5 w-5" />
                                                    </div>
                                                    <p className="text-sm font-medium">Unassigned</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'activities' && (
                            <div>
                                <h3 className="text-xl font-bold mb-6">Interaction Timeline</h3>
                                <ActivityTimeline leadId={lead.id} />
                            </div>
                        )}
                    </Card>
                </div>

                {/* Quick Actions Side */}
                <div className="space-y-6">
                    <Card className="p-6 border-none shadow-lg" style={{ backgroundColor: theme.colors.surface, borderRadius: '24px' }}>
                        <h3 className="text-lg font-bold mb-4">Quick Actions</h3>
                        <div className="grid grid-cols-1 gap-3">
                            {lead.status !== 'CONVERTED' && (
                                <Button variant="primary" className="justify-center h-12 rounded-xl" onClick={handleConvert}>
                                    Convert to Client
                                </Button>
                            )}
                            {lead.status !== 'WON' && lead.status !== 'CONVERTED' && (
                                <Button className="justify-center h-12 rounded-xl bg-green-50 text-green-600 hover:bg-green-100 border-none" onClick={() => handleWinLoss('WON')}>
                                    Mark as Won
                                </Button>
                            )}
                            {lead.status !== 'LOST' && lead.status !== 'CONVERTED' && (
                                <Button className="justify-center h-12 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 border-none" onClick={() => handleWinLoss('LOST')}>
                                    Mark as Lost
                                </Button>
                            )}
                            <Button variant="outline" className="justify-start gap-4 h-12 rounded-xl mt-2">
                                <Plus className="h-4 w-4" /> Log Call
                            </Button>
                            <Button variant="outline" className="justify-start gap-4 h-12 rounded-xl">
                                <Plus className="h-4 w-4" /> Schedule Meeting
                            </Button>
                            {lead.phone && (
                                <Button
                                    className="justify-start gap-4 h-12 rounded-xl bg-green-50 text-green-700 hover:bg-green-100 border-none dark:bg-green-900/20 dark:text-green-400"
                                    onClick={() => openWhatsApp(lead.phone!, `${lead.first_name} ${lead.last_name}`)}
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
