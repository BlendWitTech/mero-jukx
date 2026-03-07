import React, { useEffect, useState } from 'react';
import { useTheme } from '@frontend/contexts/ThemeContext';
import { useNavigate, useParams } from 'react-router-dom';
import { dealsApi, Deal } from '../../api/deals';
import { Card, Button, Badge, Avatar, Input } from '@shared';
import { ArrowLeft, Edit, Trash2, Users, Target, Activity, Plus, X, MessageCircle } from 'lucide-react';
import { toast } from '@shared';
import { useAppContext } from '../../contexts/AppContext';
import ActivityTimeline from '../../components/ActivityTimeline';
import apiClient from '@frontend/services/api';

export default function DealDetailPage() {
    const { theme } = useTheme();
    const navigate = useNavigate();
    const { buildHref } = useAppContext();
    const { id } = useParams<{ id: string }>();
    const [deal, setDeal] = useState<Deal | null>(null);
    const [loading, setLoading] = useState(true);

    // Competitors state
    const [newCompetitor, setNewCompetitor] = useState('');

    // Team Members state
    const [users, setUsers] = useState<any[]>([]);
    const [selectedUserId, setSelectedUserId] = useState('');

    useEffect(() => {
        if (id) {
            fetchDealData();
        }
        fetchUsers();
    }, [id]);

    const fetchUsers = async () => {
        try {
            const res = await apiClient.get('/admin/users');
            setUsers(res.data);
        } catch (e) {
            console.error('Failed to load users for deal team assignment', e);
        }
    };

    const fetchDealData = async () => {
        if (!id) return;
        try {
            setLoading(true);
            const dealData = await dealsApi.getDeal(id);
            setDeal(dealData);
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to fetch deal data');
            navigate(buildHref('/deals'));
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!id || !confirm('Are you sure you want to delete this deal?')) {
            return;
        }

        try {
            await dealsApi.deleteDeal(id);
            toast.success('Deal deleted successfully');
            navigate(buildHref('/deals'));
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to delete deal');
        }
    };

    const openWhatsApp = (phone: string, name: string) => {
        let normalized = phone.replace(/[\s\-]/g, '');
        if (normalized.startsWith('+')) normalized = normalized.slice(1);
        else if (normalized.startsWith('0')) normalized = '977' + normalized.slice(1);
        else if (!normalized.startsWith('977')) normalized = '977' + normalized;
        const message = encodeURIComponent(`Hello ${name}, I'm following up on our deal discussion.`);
        window.open(`https://wa.me/${normalized}?text=${message}`, '_blank');
    };

    const handleWinLoss = async (status: 'WON' | 'LOST') => {
        if (!id) return;
        const reason = prompt(`Please enter a reason for marking this deal as ${status}:`);
        if (reason === null) return;

        try {
            setLoading(true);
            await dealsApi.updateDeal(id, { status, win_loss_reason: reason });
            toast.success(`Deal marked as ${status}`);
            fetchDealData();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to update deal status');
            setLoading(false);
        }
    };

    // --- Competitor Tracking ---
    const handleAddCompetitor = async () => {
        if (!id || !newCompetitor.trim() || !deal) return;

        const updatedCompetitors = [...(deal.competitors || []), newCompetitor.trim()];
        try {
            await dealsApi.updateDeal(id, { competitors: updatedCompetitors });
            setNewCompetitor('');
            fetchDealData();
            toast.success('Competitor added');
        } catch (error: any) {
            toast.error('Failed to add competitor');
        }
    };

    const handleRemoveCompetitor = async (compToRemove: string) => {
        if (!id || !deal) return;

        const updatedCompetitors = (deal.competitors || []).filter(c => c !== compToRemove);
        try {
            await dealsApi.updateDeal(id, { competitors: updatedCompetitors });
            fetchDealData();
            toast.success('Competitor removed');
        } catch (error: any) {
            toast.error('Failed to remove competitor');
        }
    };

    // --- Team Collaboration ---
    const handleAddTeamMember = async () => {
        if (!id || !selectedUserId) return;

        try {
            await dealsApi.addTeamMember(id, selectedUserId);
            setSelectedUserId('');
            fetchDealData();
            toast.success('Team member added');
        } catch (error: any) {
            toast.error('Failed to add team member');
        }
    };

    const handleRemoveTeamMember = async (userId: string) => {
        if (!id) return;

        try {
            await dealsApi.removeTeamMember(id, userId);
            fetchDealData();
            toast.success('Team member removed');
        } catch (error: any) {
            toast.error('Failed to remove team member');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{ borderColor: theme.colors.primary }}></div>
                    <p style={{ color: theme.colors.textSecondary }}>Loading deal...</p>
                </div>
            </div>
        );
    }

    if (!deal) return null;

    return (
        <div className="p-8 max-w-[1400px] mx-auto space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate(buildHref('/deals'))} className="p-3 rounded-2xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                        <ArrowLeft className="h-6 w-6" />
                    </button>
                    <div>
                        <h1 className="text-4xl font-extrabold tracking-tight" style={{ color: theme.colors.text }}>
                            {deal.title}
                        </h1>
                        <div className="flex items-center gap-3 mt-2">
                            <Badge variant="info" className="text-xs uppercase tracking-wider">{deal.stage}</Badge>
                            <Badge variant={deal.status === 'WON' ? 'success' : deal.status === 'LOST' ? 'danger' : 'warning'} className="text-xs uppercase tracking-wider">
                                {deal.status}
                            </Badge>
                            {deal.lead && (
                                <p className="text-sm font-medium opacity-60 ml-2" style={{ color: theme.colors.textSecondary }}>
                                    Lead: {deal.lead.first_name} {deal.lead.last_name || ''}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <Button variant="secondary" onClick={() => navigate(buildHref(`/deals/${id}/edit`))} className="rounded-xl px-5 h-11 border-none shadow-sm">
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Deal
                    </Button>
                    <Button variant="danger" onClick={handleDelete} className="rounded-xl px-5 h-11 border-none shadow-sm bg-red-50 text-red-600 hover:bg-red-100">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                    </Button>
                </div>
            </div>

            {/* Top Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
                <Card className="p-6 bg-primary/5 border-none shadow-sm rounded-[24px]">
                    <p className="text-xs font-bold uppercase opacity-50 mb-1" style={{ color: theme.colors.textSecondary }}>Deal Value</p>
                    <p className="text-3xl font-black">{deal.currency} {deal.value?.toLocaleString() || '0'}</p>
                </Card>
                <Card className="p-6 bg-amber-500/5 border-none shadow-sm rounded-[24px]">
                    <p className="text-xs font-bold uppercase opacity-50 mb-1" style={{ color: theme.colors.textSecondary }}>Probability</p>
                    <div className="flex items-center gap-4">
                        <div className="flex-1 bg-black/5 dark:bg-white/5 rounded-full h-2 overflow-hidden">
                            <div className="bg-amber-500 h-full" style={{ width: `${deal.probability}%` }}></div>
                        </div>
                        <p className="text-3xl font-black">{deal.probability || '0'}%</p>
                    </div>
                </Card>
                <Card className="p-6 bg-blue-500/5 border-none shadow-sm rounded-[24px]">
                    <p className="text-xs font-bold uppercase opacity-50 mb-1" style={{ color: theme.colors.textSecondary }}>Expected Close</p>
                    <p className="text-2xl font-black">
                        {deal.expected_close_date ? new Date(deal.expected_close_date).toLocaleDateString() : 'Not Set'}
                    </p>
                </Card>
                <Card className="p-6 bg-purple-500/5 border-none shadow-sm rounded-[24px]">
                    <p className="text-xs font-bold uppercase opacity-50 mb-1" style={{ color: theme.colors.textSecondary }}>Owner</p>
                    {deal.assignedTo ? (
                        <div className="flex items-center gap-3 mt-1">
                            <Avatar name={`${deal.assignedTo.firstName} ${deal.assignedTo.lastName}`} className="h-8 w-8" />
                            <p className="font-bold text-lg">{deal.assignedTo.firstName} {deal.assignedTo.lastName}</p>
                        </div>
                    ) : (
                        <p className="text-xl font-bold opacity-50">Unassigned</p>
                    )}
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">

                {/* Left Column: Data & Activity */}
                <div className="lg:col-span-2 space-y-8">

                    {/* Activity Timeline */}
                    <Card className="p-8 border-none shadow-xl shadow-black/5" style={{ backgroundColor: theme.colors.surface, borderRadius: '24px' }}>
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 rounded-lg bg-primary/10 text-primary">
                                <Activity className="h-5 w-5" />
                            </div>
                            <h3 className="text-xl font-bold">Deal Activity Timeline</h3>
                        </div>
                        <ActivityTimeline dealId={deal.id} />
                    </Card>

                    {/* Win/Loss Reason (if applicable) */}
                    {(deal.status === 'WON' || deal.status === 'LOST') && deal.win_loss_reason && (
                        <Card className={`p-6 border-none shadow-sm rounded-[24px] ${deal.status === 'WON' ? 'bg-green-50/50 dark:bg-green-900/10' : 'bg-red-50/50 dark:bg-red-900/10'}`}>
                            <h4 className={`text-sm font-bold uppercase mb-2 ${deal.status === 'WON' ? 'text-green-600' : 'text-red-600'}`}>
                                Reason for {deal.status === 'WON' ? 'Winning' : 'Losing'}
                            </h4>
                            <p className="font-medium" style={{ color: theme.colors.text }}>{deal.win_loss_reason}</p>
                        </Card>
                    )}
                </div>

                {/* Right Column: Collaboration & Tools */}
                <div className="space-y-6">

                    {/* Quick Status Actions */}
                    <Card className="p-6 border-none shadow-lg" style={{ backgroundColor: theme.colors.surface, borderRadius: '24px' }}>
                        <h3 className="text-lg font-bold mb-4">Quick Actions</h3>
                        <div className="grid grid-cols-1 gap-3">
                            {deal.status !== 'WON' && (
                                <Button className="justify-center h-12 rounded-xl bg-green-50 text-green-600 hover:bg-green-100 border-none font-bold" onClick={() => handleWinLoss('WON')}>
                                    Mark as Won
                                </Button>
                            )}
                            {deal.status !== 'LOST' && (
                                <Button className="justify-center h-12 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 border-none font-bold" onClick={() => handleWinLoss('LOST')}>
                                    Mark as Lost
                                </Button>
                            )}
                            {deal.lead?.phone && (
                                <Button
                                    className="justify-center h-12 rounded-xl bg-green-50 text-green-700 hover:bg-green-100 border-none font-bold dark:bg-green-900/20 dark:text-green-400"
                                    onClick={() => openWhatsApp(deal.lead!.phone!, `${deal.lead!.first_name} ${deal.lead!.last_name || ''}`)}
                                >
                                    <MessageCircle className="h-4 w-4 mr-2" /> WhatsApp Lead
                                </Button>
                            )}
                        </div>
                    </Card>

                    {/* Deal Team Collaboration */}
                    <Card className="p-6 border-none shadow-lg" style={{ backgroundColor: theme.colors.surface, borderRadius: '24px' }}>
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <Users className="h-5 w-5" style={{ color: theme.colors.primary }} />
                                <h3 className="text-lg font-bold">Deal Team</h3>
                            </div>
                            <Badge variant="secondary" className="rounded-full px-2">{deal.teamMembers?.length || 0}</Badge>
                        </div>

                        <div className="space-y-4">
                            <div className="flex gap-2">
                                <select
                                    value={selectedUserId}
                                    onChange={(e) => setSelectedUserId(e.target.value)}
                                    className="flex-1 p-2 rounded-xl border text-sm bg-transparent outline-none focus:ring-2"
                                    style={{ borderColor: theme.colors.border }}
                                >
                                    <option value="">Select user...</option>
                                    {users.filter(u => !(deal.teamMembers || []).find(m => m.id === u.id)).map(user => (
                                        <option key={user.id} value={user.id}>{user.first_name} {user.last_name}</option>
                                    ))}
                                </select>
                                <Button variant="secondary" onClick={handleAddTeamMember} disabled={!selectedUserId} className="rounded-xl px-3">
                                    <Plus className="h-4 w-4" />
                                </Button>
                            </div>

                            <div className="space-y-2 mt-4">
                                {(deal.teamMembers || []).map(member => (
                                    <div key={member.id} className="flex items-center justify-between p-3 rounded-xl bg-black/5 dark:bg-white/5">
                                        <div className="flex items-center gap-3">
                                            <Avatar name={`${member.first_name || member.firstName} ${member.last_name || member.lastName}`} className="h-8 w-8" />
                                            <div>
                                                <p className="text-sm font-bold">{member.first_name || member.firstName} {member.last_name || member.lastName}</p>
                                                <p className="text-xs opacity-60">{member.email}</p>
                                            </div>
                                        </div>
                                        <button onClick={() => handleRemoveTeamMember(member.id)} className="p-2 rounded-lg hover:bg-red-50 text-red-500 transition-colors">
                                            <X className="h-4 w-4" />
                                        </button>
                                    </div>
                                ))}
                                {(!deal.teamMembers || deal.teamMembers.length === 0) && (
                                    <p className="text-sm text-center py-4 opacity-50 italic">No additional team members.</p>
                                )}
                            </div>
                        </div>
                    </Card>

                    {/* Competitor Tracking */}
                    <Card className="p-6 border-none shadow-lg" style={{ backgroundColor: theme.colors.surface, borderRadius: '24px' }}>
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <Target className="h-5 w-5 text-amber-500" />
                                <h3 className="text-lg font-bold">Competitors</h3>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex gap-2">
                                <Input
                                    placeholder="Add competitor name..."
                                    value={newCompetitor}
                                    onChange={(e) => setNewCompetitor(e.target.value)}
                                    className="h-10 rounded-xl text-sm"
                                    onKeyPress={(e) => e.key === 'Enter' && handleAddCompetitor()}
                                />
                                <Button variant="secondary" onClick={handleAddCompetitor} disabled={!newCompetitor.trim()} className="rounded-xl px-3 h-10">
                                    <Plus className="h-4 w-4" />
                                </Button>
                            </div>

                            <div className="flex flex-wrap gap-2 mt-4">
                                {(deal.competitors || []).map((comp, idx) => (
                                    <div key={idx} className="flex items-center gap-2 pl-3 pr-1 py-1 rounded-full text-sm font-medium border" style={{ borderColor: theme.colors.border, backgroundColor: theme.colors.background }}>
                                        {comp}
                                        <button onClick={() => handleRemoveCompetitor(comp)} className="p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10 opacity-60 hover:opacity-100 transition-colors">
                                            <X className="h-3 w-3" />
                                        </button>
                                    </div>
                                ))}
                                {(!deal.competitors || deal.competitors.length === 0) && (
                                    <p className="text-sm text-center w-full py-4 opacity-50 italic">No known competitors.</p>
                                )}
                            </div>
                        </div>
                    </Card>

                </div>
            </div>
        </div>
    );
}
