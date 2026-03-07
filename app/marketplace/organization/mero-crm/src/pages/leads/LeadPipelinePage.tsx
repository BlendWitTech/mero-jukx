import React, { useEffect, useState } from 'react';
import { useTheme } from '@frontend/contexts/ThemeContext';
import { leadsApi, Lead } from '../../api/leads';
import { toast, Loading, Button } from '@shared';
import CrmKanban from '../../components/CrmKanban';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../../contexts/AppContext';
import { Users, LayoutGrid, List } from 'lucide-react';

export default function LeadPipelinePage() {
    const { theme } = useTheme();
    const navigate = useNavigate();
    const { buildHref } = useAppContext();
    const [leads, setLeads] = useState<Lead[]>([]);
    const [loading, setLoading] = useState(true);

    const stages = [
        { id: 'NEW', name: 'New Leads', color: '#3b82f6' },
        { id: 'CONTACTED', name: 'Contacted', color: '#f59e0b' },
        { id: 'QUALIFIED', name: 'Qualified', color: '#10b981' },
        { id: 'PROPOSAL_SENT', name: 'Proposal Sent', color: '#8b5cf6' },
        { id: 'CONVERTED', name: 'Converted', color: '#22c55e' },
        { id: 'LOST', name: 'Lost', color: '#ef4444' },
    ];

    useEffect(() => {
        fetchLeads();
    }, []);

    const fetchLeads = async () => {
        try {
            setLoading(true);
            const data = await leadsApi.getLeads();
            setLeads(data);
        } catch (error: any) {
            toast.error('Failed to fetch leads');
        } finally {
            setLoading(false);
        }
    };

    const handleLeadMove = async (leadId: string, targetStatus: string) => {
        try {
            // Optimistic update
            setLeads(prev => prev.map(lead =>
                lead.id === leadId ? { ...lead, status: targetStatus as any } : lead
            ));
            await leadsApi.updateLead(leadId, { status: targetStatus });
            toast.success('Lead status updated');
        } catch (error: any) {
            toast.error('Failed to update lead status');
            fetchLeads(); // Rollback
        }
    };

    const kanbanColumns = stages.map(stage => ({
        id: stage.id,
        name: stage.name,
        color: stage.color,
        items: leads
            .filter(lead => lead.status === stage.id)
            .map(lead => ({
                id: lead.id,
                title: `${lead.first_name} ${lead.last_name || ''}`,
                subtitle: lead.company || lead.email,
                value: lead.estimated_value,
                status: lead.status,
                priority: lead.rating,
                date: lead.createdAt,
                assignee: lead.assignedTo ? {
                    firstName: lead.assignedTo.firstName,
                    lastName: lead.assignedTo.lastName,
                } : undefined,
            })),
    }));

    if (loading) {
        return <Loading size="lg" text="Loading leads pipeline..." />;
    }

    return (
        <div className="h-full flex flex-col space-y-4 p-6 overflow-hidden">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
                <div className="flex items-center gap-4">
                    <div className="p-2.5 rounded-2xl bg-primary/10">
                        <Users className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black tracking-tight" style={{ color: theme.colors.text }}>
                            Leads Pipeline
                        </h1>
                        <p className="text-xs opacity-60 font-medium uppercase tracking-widest" style={{ color: theme.colors.textSecondary }}>
                            Track and nurture your prospects
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <div className="flex rounded-xl bg-surface/50 p-1 border border-border/50 shadow-sm" style={{ backdropFilter: 'blur(8px)' }}>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="rounded-lg h-9 px-3 text-textSecondary"
                            onClick={() => navigate(buildHref('/leads'))}
                        >
                            <List className="h-4 w-4 mr-2" />
                            List
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="rounded-lg h-9 px-3 bg-primary text-white shadow-sm"
                            onClick={() => { }}
                        >
                            <LayoutGrid className="h-4 w-4 mr-2" />
                            Pipeline
                        </Button>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-hidden">
                <CrmKanban
                    columns={kanbanColumns}
                    onItemMove={handleLeadMove}
                    onItemClick={(leadId) => navigate(buildHref(`/leads/${leadId}`))}
                />
            </div>
        </div>
    );
}
