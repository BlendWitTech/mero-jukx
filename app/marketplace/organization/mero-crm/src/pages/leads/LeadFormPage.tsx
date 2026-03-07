import React, { useEffect, useState } from 'react';
import { useTheme } from '@frontend/contexts/ThemeContext';
import { useNavigate, useParams } from 'react-router-dom';
import { leadsApi, CreateLeadDto } from '../../api/leads';
import { Card, Button, Input } from '@shared';
import { ArrowLeft, Save, UserCheck } from 'lucide-react';
import { toast, Modal } from '@shared';
import ActivityTimeline from '../../components/ActivityTimeline';
import { useAppContext } from '../../contexts/AppContext';
import { clientsApi } from '../../api/clients';
import { dealsApi } from '../../api/deals';

export default function LeadFormPage() {
    const { theme } = useTheme();
    const navigate = useNavigate();
    const { buildHref } = useAppContext();
    const { id } = useParams();
    const isEditMode = !!id;
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState<CreateLeadDto>({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        company: '',
        job_title: '',
        status: 'NEW',
        source: '',
        estimated_value: 0,
    });

    useEffect(() => {
        if (isEditMode) {
            fetchLead();
        }
    }, [id]);

    const fetchLead = async () => {
        try {
            setLoading(true);
            const lead = await leadsApi.getLead(id!);
            setFormData({
                first_name: lead.first_name,
                last_name: lead.last_name,
                email: lead.email,
                phone: lead.phone,
                company: lead.company,
                job_title: lead.job_title,
                status: lead.status,
                source: lead.source,
                estimated_value: lead.estimated_value,
            });
        } catch (error: any) {
            toast.error('Failed to fetch lead details');
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
                await leadsApi.updateLead(id!, formData);
                toast.success('Lead updated successfully');
            } else {
                await leadsApi.createLead(formData);
                toast.success('Lead created successfully');
            }
            navigate(-1);
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to save lead');
        } finally {
            setLoading(false);
        }
    };

    const handleConvert = async () => {
        if (!window.confirm('Convert this lead to a Client and create a Deal?')) return;
        try {
            setLoading(true);
            const fullName = `${formData.first_name} ${formData.last_name || ''}`.trim();

            // 1. Create Client
            const client = await clientsApi.createClient({
                name: fullName,
                email: formData.email || '',
                phone: formData.phone,
                company: formData.company,
            });

            // 2. Create Deal
            await dealsApi.createDeal({
                title: `${formData.company || fullName}'s Deal`,
                value: formData.estimated_value || 0,
                currency: 'NPR',
                stage: 'Qualification',
                probability: 20,
                status: 'OPEN',
                lead_id: id,
            });

            // 3. Update Lead Status
            await leadsApi.updateLead(id!, { status: 'CONVERTED' });

            toast.success('Lead converted to Client successfully!');
            navigate(buildHref(`/clients/${client.id}`));
        } catch (error: any) {
            toast.error('Failed to convert lead');
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
                    {isEditMode ? 'Edit Lead' : 'Create New Lead'}
                </h1>
            </div>

            <div className={`grid grid-cols-1 ${isEditMode ? 'lg:grid-cols-3' : ''} gap-8`}>
                <div className={isEditMode ? 'lg:col-span-2' : ''}>
                    <Card className="p-6" style={{ backgroundColor: theme.colors.surface }}>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-bold" style={{ color: theme.colors.text }}>Lead Details</h2>
                                {isEditMode && formData.status !== 'CONVERTED' && (
                                    <Button type="button" variant="outline" onClick={handleConvert} className="text-green-600 border-green-600 hover:bg-green-50">
                                        <UserCheck className="h-4 w-4 mr-2" />
                                        Convert to Client
                                    </Button>
                                )}
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* ... existing form fields ... */}
                                <div>
                                    <label className="block text-sm font-medium mb-2" style={{ color: theme.colors.textSecondary }}>First Name *</label>
                                    <Input
                                        name="first_name"
                                        value={formData.first_name}
                                        onChange={handleChange}
                                        required
                                        placeholder="John"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-2" style={{ color: theme.colors.textSecondary }}>Last Name</label>
                                    <Input
                                        name="last_name"
                                        value={formData.last_name || ''}
                                        onChange={handleChange}
                                        placeholder="Doe"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-2" style={{ color: theme.colors.textSecondary }}>Email</label>
                                    <Input
                                        name="email"
                                        type="email"
                                        value={formData.email || ''}
                                        onChange={handleChange}
                                        placeholder="john@example.com"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-2" style={{ color: theme.colors.textSecondary }}>Phone</label>
                                    <Input
                                        name="phone"
                                        value={formData.phone || ''}
                                        onChange={handleChange}
                                        placeholder="+977 9800000000"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-2" style={{ color: theme.colors.textSecondary }}>Company</label>
                                    <Input
                                        name="company"
                                        value={formData.company || ''}
                                        onChange={handleChange}
                                        placeholder="Acme Corp"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-2" style={{ color: theme.colors.textSecondary }}>Job Title</label>
                                    <Input
                                        name="job_title"
                                        value={formData.job_title || ''}
                                        onChange={handleChange}
                                        placeholder="Manager"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-2" style={{ color: theme.colors.textSecondary }}>Status</label>
                                    <select
                                        name="status"
                                        value={formData.status}
                                        onChange={handleChange}
                                        className="w-full p-3 rounded-xl border focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                        style={{
                                            backgroundColor: theme.colors.background,
                                            borderColor: theme.colors.border,
                                            color: theme.colors.text,
                                        }}
                                    >
                                        <option value="NEW">New</option>
                                        <option value="CONTACTED">Contacted</option>
                                        <option value="QUALIFIED">Qualified</option>
                                        <option value="PROPOSAL_SENT">Proposal Sent</option>
                                        <option value="CONVERTED">Converted</option>
                                        <option value="LOST">Lost</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-2" style={{ color: theme.colors.textSecondary }}>Source</label>
                                    <Input
                                        name="source"
                                        value={formData.source || ''}
                                        onChange={handleChange}
                                        placeholder="Web / Referral"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-2" style={{ color: theme.colors.textSecondary }}>Estimated Value</label>
                                    <Input
                                        name="estimated_value"
                                        type="number"
                                        value={formData.estimated_value || ''}
                                        onChange={handleChange}
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end pt-6">
                                <Button type="submit" variant="primary" disabled={loading}>
                                    <Save className="h-5 w-5 mr-2" />
                                    {loading ? 'Saving...' : 'Save Lead'}
                                </Button>
                            </div>
                        </form>
                    </Card>
                </div>

                {isEditMode && (
                    <div className="lg:col-span-1">
                        <Card className="p-6 h-full" style={{ backgroundColor: theme.colors.surface }}>
                            <ActivityTimeline leadId={id} />
                        </Card>
                    </div>
                )}
            </div>
        </div>
    );
}
