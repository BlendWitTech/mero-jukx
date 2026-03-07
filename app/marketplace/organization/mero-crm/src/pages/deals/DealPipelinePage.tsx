import React, { useEffect, useState } from 'react';
import { useTheme } from '@frontend/contexts/ThemeContext';
import { dealsApi, Deal, Pipeline, Stage } from '../../api/deals';
import { toast, Loading, Modal, Button, Input } from '@shared';
import CrmKanban from '../../components/CrmKanban';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../../contexts/AppContext';
import { Layout, Plus, Settings2, Trash2 } from 'lucide-react';

export default function DealPipelinePage() {
    const { theme } = useTheme();
    const navigate = useNavigate();
    const { buildHref } = useAppContext();
    const [pipelines, setPipelines] = useState<Pipeline[]>([]);
    const [currentPipeline, setCurrentPipeline] = useState<Pipeline | null>(null);
    const [deals, setDeals] = useState<Deal[]>([]);
    const [loading, setLoading] = useState(true);

    // Modal state
    const [showStageModal, setShowStageModal] = useState(false);
    const [editingStage, setEditingStage] = useState<Partial<Stage> | null>(null);

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        try {
            setLoading(true);
            const [fetchedPipelines, fetchedDeals] = await Promise.all([
                dealsApi.getPipelines(),
                dealsApi.getDeals(),
            ]);
            setPipelines(fetchedPipelines);
            setDeals(fetchedDeals);

            if (fetchedPipelines.length > 0) {
                const defaultPipeline = fetchedPipelines.find(p => p.isDefault) || fetchedPipelines[0];
                setCurrentPipeline(defaultPipeline);
            }
        } catch (error: any) {
            toast.error('Failed to load pipeline data');
        } finally {
            setLoading(false);
        }
    };

    const handleDealMove = async (dealId: string, targetStageId: string) => {
        try {
            const targetStage = currentPipeline?.stages?.find(s => s.id === targetStageId);
            if (!targetStage) return;

            // Optimistic update
            setDeals(prev => prev.map(deal =>
                deal.id === dealId ? { ...deal, stageId: targetStageId, stageName: targetStage.name, probability: targetStage.probability } : deal
            ));

            await dealsApi.updateDeal(dealId, {
                stage: targetStage.name, // For backward compatibility if needed
                probability: targetStage.probability
            });

            toast.success('Deal moved');
        } catch (error: any) {
            toast.error('Failed to move deal');
            fetchInitialData(); // Rollback
        }
    };

    const handleColumnMove = async (stageId: string, newPosition: number) => {
        if (!currentPipeline?.stages) return;
        try {
            const stage = currentPipeline.stages.find(s => s.id === stageId);
            if (!stage) return;

            await dealsApi.updateStage(stageId, { position: newPosition });

            // Re-fetch to get updated order
            const fetchedPipelines = await dealsApi.getPipelines();
            setPipelines(fetchedPipelines);
            const updated = fetchedPipelines.find(p => p.id === currentPipeline.id);
            if (updated) setCurrentPipeline(updated);

            toast.success('Stage reordered');
        } catch (error: any) {
            toast.error('Failed to reorder stage');
        }
    };

    const handleSaveStage = async () => {
        if (!currentPipeline || !editingStage?.name) return;
        try {
            if (editingStage.id) {
                await dealsApi.updateStage(editingStage.id, editingStage);
                toast.success('Stage updated');
            } else {
                await dealsApi.createStage({
                    ...editingStage,
                    pipelineId: currentPipeline.id,
                    position: currentPipeline.stages?.length || 0,
                    color: editingStage.color || theme.colors.primary,
                    probability: editingStage.probability || 0,
                });
                toast.success('Stage created');
            }
            setShowStageModal(false);
            setEditingStage(null);
            fetchInitialData();
        } catch (error: any) {
            toast.error('Failed to save stage');
        }
    };

    const handleDeleteStage = async (stageId: string) => {
        if (!confirm('Are you sure you want to delete this stage? All deals in this stage will need to be moved.')) return;
        try {
            await dealsApi.deleteStage(stageId);
            toast.success('Stage deleted');
            fetchInitialData();
        } catch (error: any) {
            toast.error('Failed to delete stage');
        }
    };

    const kanbanColumns = (currentPipeline?.stages || []).sort((a, b) => a.position - b.position).map(stage => ({
        id: stage.id,
        name: stage.name,
        color: stage.color,
        items: deals
            .filter(deal => (deal.stageId === stage.id) || (!deal.stageId && deal.stage === stage.name))
            .map(deal => ({
                id: deal.id,
                title: deal.title,
                subtitle: deal.lead?.company || deal.lead?.first_name ? `Lead: ${deal.lead.first_name}` : undefined,
                value: deal.value,
                status: deal.stage,
                date: deal.expected_close_date,
                assignee: deal.assignedTo ? {
                    firstName: deal.assignedTo.firstName,
                    lastName: deal.assignedTo.lastName,
                } : undefined,
            })),
    }));

    if (loading && !currentPipeline) {
        return <Loading size="lg" text="Loading deals pipeline..." />;
    }

    return (
        <div className="h-full flex flex-col space-y-4 p-6 overflow-hidden">
            {/* Pipeline Selector & Actions */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
                <div className="flex items-center gap-4">
                    <div className="p-2.5 rounded-2xl bg-primary/10">
                        <Layout className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black tracking-tight" style={{ color: theme.colors.text }}>
                            {currentPipeline?.name || 'Sales Pipeline'}
                        </h1>
                        <p className="text-xs opacity-60 font-medium uppercase tracking-widest" style={{ color: theme.colors.textSecondary }}>
                            Manage your deals through custom stages
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <select
                        value={currentPipeline?.id}
                        onChange={(e) => {
                            const p = pipelines.find(pl => pl.id === e.target.value);
                            if (p) setCurrentPipeline(p);
                        }}
                        className="h-10 px-4 rounded-xl border-none shadow-sm focus:ring-2 focus:ring-primary/20 outline-none font-bold text-sm transition-all"
                        style={{ backgroundColor: theme.colors.surface, color: theme.colors.text }}
                    >
                        {pipelines.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                    </select>
                    <Button variant="outline" size="sm" className="rounded-xl h-10 px-4 border-none shadow-sm" style={{ backgroundColor: theme.colors.surface }}>
                        <Settings2 className="h-4 w-4 mr-2" />
                        Configure
                    </Button>
                </div>
            </div>

            <div className="flex-1 overflow-hidden">
                <CrmKanban
                    columns={kanbanColumns}
                    onItemMove={handleDealMove}
                    onColumnMove={handleColumnMove}
                    onItemClick={(dealId) => navigate(buildHref(`/deals/${dealId}/edit`))}
                    onAddStage={() => {
                        setEditingStage({ name: '', color: theme.colors.primary, probability: 10 });
                        setShowStageModal(true);
                    }}
                />
            </div>

            {/* Stage Creation/Editing Modal */}
            <Modal
                isOpen={showStageModal}
                onClose={() => setShowStageModal(false)}
                title={editingStage?.id ? 'Edit Stage' : 'Add New Pipeline Stage'}
                theme={theme}
            >
                <div className="space-y-5 py-2">
                    <div className="space-y-2">
                        <label className="text-xs font-black uppercase tracking-widest opacity-60">Stage Name</label>
                        <Input
                            placeholder="e.g. Negotiation"
                            value={editingStage?.name}
                            onChange={e => setEditingStage(prev => ({ ...prev, name: e.target.value }))}
                            className="h-12 border-none bg-black/5 dark:bg-white/5 rounded-xl font-bold"
                            autoFocus
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase tracking-widest opacity-60">Color</label>
                            <input
                                type="color"
                                value={editingStage?.color}
                                onChange={e => setEditingStage(prev => ({ ...prev, color: e.target.value }))}
                                className="w-full h-12 p-1 rounded-xl bg-black/5 dark:bg-white/5 border-none cursor-pointer"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase tracking-widest opacity-60">Probability (%)</label>
                            <Input
                                type="number"
                                min="0"
                                max="100"
                                value={editingStage?.probability}
                                onChange={e => setEditingStage(prev => ({ ...prev, probability: parseInt(e.target.value) }))}
                                className="h-12 border-none bg-black/5 dark:bg-white/5 rounded-xl font-bold"
                            />
                        </div>
                    </div>

                    <div className="flex justify-between items-center pt-4 mt-6 border-t border-black/5 dark:border-white/5">
                        {editingStage?.id ? (
                            <Button variant="danger" size="sm" onClick={() => handleDeleteStage(editingStage.id!)} className="rounded-xl px-4">
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete Stage
                            </Button>
                        ) : <div />}
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={() => setShowStageModal(false)} className="rounded-xl px-6 h-11">Cancel</Button>
                            <Button
                                variant="primary"
                                onClick={handleSaveStage}
                                disabled={!editingStage?.name}
                                className="rounded-xl px-8 h-11 shadow-lg shadow-primary/20"
                            >
                                {editingStage?.id ? 'Update Stage' : 'Create Stage'}
                            </Button>
                        </div>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
