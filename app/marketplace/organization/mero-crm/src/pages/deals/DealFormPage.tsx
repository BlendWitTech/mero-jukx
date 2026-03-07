import React, { useEffect, useState } from 'react';
import { useTheme } from '@frontend/contexts/ThemeContext';
import { useNavigate, useParams } from 'react-router-dom';
import { dealsApi, CreateDealDto } from '../../api/deals';
import { leadsApi, Lead } from '../../api/leads';
import { Card, Button, Input } from '@shared';
import { ArrowLeft, Save } from 'lucide-react';
import { toast } from '@shared';
import ActivityTimeline from '../../components/ActivityTimeline';
import { useAppContext } from '../../contexts/AppContext';

export default function DealFormPage() {
    const { theme } = useTheme();
    const navigate = useNavigate();
    const { buildHref } = useAppContext();
    const { id } = useParams();
    const isEditMode = !!id;
    const [loading, setLoading] = useState(false);
    const [leads, setLeads] = useState<Lead[]>([]);

    const [formData, setFormData] = useState<CreateDealDto>({
        title: '',
        value: 0,
        currency: 'NPR',
        stage: 'New',
        probability: 10,
        status: 'OPEN',
        lead_id: '',
    });

    useEffect(() => {
        fetchLeads();
        if (isEditMode) {
            fetchDeal();
        }
    }, [id]);

    const fetchLeads = async () => {
        try {
            const data = await leadsApi.getLeads();
            setLeads(data);
        } catch (error) {
            console.error('Failed to fetch leads');
        }
    };

    const fetchDeal = async () => {
        try {
            setLoading(true);
            const deal = await dealsApi.getDeal(id!);
            setFormData({
                title: deal.title,
                value: deal.value,
                currency: deal.currency,
                stage: deal.stage,
                probability: deal.probability,
                status: deal.status,
                lead_id: deal.leadId,
                expected_close_date: deal.expected_close_date ? new Date(deal.expected_close_date).toISOString().split('T')[0] : undefined,
            });
        } catch (error: any) {
            toast.error('Failed to fetch deal details');
            navigate(-1);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setLoading(true);
            if (isEditMode) {
                await dealsApi.updateDeal(id!, formData);
                toast.success('Deal updated successfully');
            } else {
                await dealsApi.createDeal(formData);
                toast.success('Deal created successfully');
            }
            navigate(-1);
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to save deal');
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    return (
        <div className="p-8 max-w-4xl mx-auto space-y-8">
            <div className="flex items-center gap-4">
                <Button variant="ghost" onClick={() => navigate(-1)}>
                    <ArrowLeft className="h-5 w-5 mr-2" />
                    Back
                </Button>
                <h1 className="text-3xl font-bold" style={{ color: theme.colors.text }}>
                    {isEditMode ? 'Edit Deal' : 'Create New Deal'}
                </h1>
            </div>

            <div className={`grid grid-cols-1 ${isEditMode ? 'lg:grid-cols-3' : ''} gap-8 items-start`}>
                <div className={isEditMode ? 'lg:col-span-2' : ''}>
                    <Card className="p-8" style={{ backgroundColor: theme.colors.surface }}>
                        <form onSubmit={handleSubmit} className="space-y-8">
                            <div className="border-b pb-6" style={{ borderColor: theme.colors.border }}>
                                <h2 className="text-xl font-bold" style={{ color: theme.colors.text }}>Deal Information</h2>
                                <p className="text-sm opacity-60" style={{ color: theme.colors.textSecondary }}>Details about this sales opportunity.</p>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                                <div className="md:col-span-2 space-y-2">
                                    <label className="text-sm font-bold tracking-tight" style={{ color: theme.colors.textSecondary }}>Deal Title *</label>
                                    <Input
                                        name="title"
                                        value={formData.title}
                                        onChange={handleChange}
                                        required
                                        placeholder="E.g. Website Redesign Project"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-bold tracking-tight" style={{ color: theme.colors.textSecondary }}>Value</label>
                                    <Input
                                        name="value"
                                        type="number"
                                        value={formData.value}
                                        onChange={handleChange}
                                        placeholder="0.00"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-bold tracking-tight" style={{ color: theme.colors.textSecondary }}>Currency</label>
                                    <Input
                                        name="currency"
                                        value={formData.currency}
                                        onChange={handleChange}
                                        placeholder="NPR"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-bold tracking-tight" style={{ color: theme.colors.textSecondary }}>Associated Lead</label>
                                    <select
                                        name="lead_id"
                                        value={formData.lead_id || ''}
                                        onChange={handleChange}
                                        className="w-full p-3 rounded-xl border focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm"
                                        style={{
                                            backgroundColor: theme.colors.background,
                                            borderColor: theme.colors.border,
                                            color: theme.colors.text,
                                        }}
                                    >
                                        <option value="">Select a lead...</option>
                                        {leads.map(lead => (
                                            <option key={lead.id} value={lead.id}>
                                                {lead.first_name} {lead.last_name} ({lead.company})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-bold tracking-tight" style={{ color: theme.colors.textSecondary }}>Expected Close Date</label>
                                    <Input
                                        name="expected_close_date"
                                        type="date"
                                        value={formData.expected_close_date || ''}
                                        onChange={handleChange}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-bold tracking-tight" style={{ color: theme.colors.textSecondary }}>Stage</label>
                                    <Input
                                        name="stage"
                                        value={formData.stage}
                                        onChange={handleChange}
                                        placeholder="Qualification"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-bold tracking-tight" style={{ color: theme.colors.textSecondary }}>Probability (%)</label>
                                    <Input
                                        name="probability"
                                        type="number"
                                        min="0"
                                        max="100"
                                        value={formData.probability}
                                        onChange={handleChange}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-bold tracking-tight" style={{ color: theme.colors.textSecondary }}>Status</label>
                                    <select
                                        name="status"
                                        value={formData.status}
                                        onChange={handleChange}
                                        className="w-full p-3 rounded-xl border focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm"
                                        style={{
                                            backgroundColor: theme.colors.background,
                                            borderColor: theme.colors.border,
                                            color: theme.colors.text,
                                        }}
                                    >
                                        <option value="OPEN">Open</option>
                                        <option value="WON">Won</option>
                                        <option value="LOST">Lost</option>
                                    </select>
                                </div>
                            </div>

                            <div className="flex justify-end pt-8 border-t" style={{ borderColor: theme.colors.border }}>
                                <Button type="submit" variant="primary" disabled={loading} className="px-8 py-3 rounded-xl shadow-lg shadow-primary/20">
                                    <Save className="h-5 w-5 mr-2" />
                                    {loading ? 'Saving...' : 'Save Deal Changes'}
                                </Button>
                            </div>
                        </form>
                    </Card>
                </div>

                {isEditMode && (
                    <div className="lg:col-span-1 h-fit sticky top-8">
                        <Card className="p-8" style={{ backgroundColor: theme.colors.surface }}>
                            <ActivityTimeline dealId={id} />
                        </Card>
                    </div>
                )}
            </div>
        </div>
    );
}
