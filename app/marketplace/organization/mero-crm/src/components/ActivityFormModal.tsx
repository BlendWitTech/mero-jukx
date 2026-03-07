import React, { useState, useEffect } from 'react';
import { useTheme } from '@frontend/contexts/ThemeContext';
import { Activity, CreateActivityDto, activitiesApi } from '../api/activities';
import { Button, Input, Card } from '@shared';
import { X, Phone, Mail, Users, CheckSquare, FileText } from 'lucide-react';
import { toast } from '@shared';
import apiClient from '@frontend/services/api';

interface ActivityFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    defaultDate?: Date;
    defaultLeadId?: string;
    defaultDealId?: string;
    activityToEdit?: Activity;
}

export default function ActivityFormModal({
    isOpen,
    onClose,
    onSuccess,
    defaultDate,
    defaultLeadId,
    defaultDealId,
    activityToEdit
}: ActivityFormModalProps) {
    const { theme } = useTheme();
    const [loading, setLoading] = useState(false);
    const [users, setUsers] = useState<any[]>([]);

    const [formData, setFormData] = useState<CreateActivityDto>({
        type: 'TASK',
        subject: '',
        description: '',
        due_date: defaultDate ? defaultDate.toISOString().slice(0, 16) : '',
        status: 'PENDING',
        lead_id: defaultLeadId || '',
        deal_id: defaultDealId || '',
        assigned_to: ''
    });

    useEffect(() => {
        if (isOpen) {
            fetchUsers();
            if (activityToEdit) {
                setFormData({
                    type: activityToEdit.type,
                    subject: activityToEdit.subject,
                    description: activityToEdit.description || '',
                    due_date: activityToEdit.due_date ? new Date(activityToEdit.due_date).toISOString().slice(0, 16) : '',
                    status: activityToEdit.status,
                    lead_id: activityToEdit.leadId || '',
                    deal_id: activityToEdit.dealId || '',
                    assigned_to: activityToEdit.assignedToId || ''
                });
            } else {
                setFormData({
                    type: 'TASK',
                    subject: '',
                    description: '',
                    due_date: defaultDate ? defaultDate.toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16),
                    status: 'PENDING',
                    lead_id: defaultLeadId || '',
                    deal_id: defaultDealId || '',
                    assigned_to: ''
                });
            }
        }
    }, [isOpen, activityToEdit, defaultDate, defaultLeadId, defaultDealId]);

    const fetchUsers = async () => {
        try {
            const res = await apiClient.get('/admin/users');
            setUsers(res.data);
        } catch (e) {
            console.error('Failed to load users', e);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setLoading(true);
            const payload = { ...formData };
            if (!payload.lead_id) delete payload.lead_id;
            if (!payload.deal_id) delete payload.deal_id;
            if (!payload.assigned_to) delete payload.assigned_to;

            if (activityToEdit) {
                await activitiesApi.updateActivity(activityToEdit.id, payload);
                toast.success('Activity updated');
            } else {
                await activitiesApi.createActivity(payload);
                toast.success('Activity created');
            }
            onSuccess();
            onClose();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to save activity');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    const activityTypes = [
        { value: 'CALL', label: 'Call', icon: Phone, color: 'blue' },
        { value: 'MEETING', label: 'Meeting', icon: Users, color: 'purple' },
        { value: 'EMAIL', label: 'Email', icon: Mail, color: 'amber' },
        { value: 'TASK', label: 'Task', icon: CheckSquare, color: 'green' },
        { value: 'NOTE', label: 'Note', icon: FileText, color: 'gray' }
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <Card className="w-full max-w-lg shadow-2xl overflow-hidden" style={{ backgroundColor: theme.colors.surface }}>
                <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: theme.colors.border }}>
                    <h2 className="text-xl font-bold" style={{ color: theme.colors.text }}>
                        {activityToEdit ? 'Edit Activity' : 'Log Activity'}
                    </h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                        <X className="h-5 w-5" style={{ color: theme.colors.textSecondary }} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Activity Type Selector */}
                    <div className="space-y-2">
                        <label className="text-sm font-bold" style={{ color: theme.colors.textSecondary }}>Activity Type</label>
                        <div className="grid grid-cols-5 gap-2">
                            {activityTypes.map(type => (
                                <button
                                    key={type.value}
                                    type="button"
                                    onClick={() => setFormData({ ...formData, type: type.value })}
                                    className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${formData.type === type.value
                                            ? `bg-${type.color}-50 border-${type.color}-500 text-${type.color}-700 dark:bg-${type.color}-900/20 dark:border-${type.color}-500 dark:text-${type.color}-300 ring-2 ring-${type.color}-500/20`
                                            : 'bg-transparent border-border hover:bg-black/5 dark:hover:bg-white/5 opacity-70 hover:opacity-100'
                                        }`}
                                >
                                    <type.icon className="h-5 w-5 mb-1" />
                                    <span className="text-[10px] uppercase font-bold tracking-wider">{type.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-1" style={{ color: theme.colors.textSecondary }}>Subject</label>
                            <Input
                                required
                                placeholder="E.g., Follow up call..."
                                value={formData.subject}
                                onChange={e => setFormData({ ...formData, subject: e.target.value })}
                                className="w-full"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1" style={{ color: theme.colors.textSecondary }}>Due Date & Time</label>
                            <Input
                                type="datetime-local"
                                required
                                value={formData.due_date}
                                onChange={e => setFormData({ ...formData, due_date: e.target.value })}
                                className="w-full"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1" style={{ color: theme.colors.textSecondary }}>Assigned To</label>
                            <select
                                value={formData.assigned_to}
                                onChange={e => setFormData({ ...formData, assigned_to: e.target.value })}
                                className="w-full p-2.5 rounded-xl border bg-transparent text-sm focus:ring-2 focus:ring-primary outline-none transition-shadow"
                                style={{ borderColor: theme.colors.border, color: theme.colors.text }}
                            >
                                <option value="">Select Assignee...</option>
                                {users.map(u => (
                                    <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1" style={{ color: theme.colors.textSecondary }}>Description / Notes</label>
                            <textarea
                                rows={3}
                                placeholder="Add notes here..."
                                value={formData.description}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                                className="w-full p-3 rounded-xl border bg-transparent text-sm focus:ring-2 focus:ring-primary outline-none transition-shadow"
                                style={{ borderColor: theme.colors.border, color: theme.colors.text }}
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t" style={{ borderColor: theme.colors.border }}>
                        <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
                            Cancel
                        </Button>
                        <Button type="submit" variant="primary" disabled={loading} className="px-6">
                            {loading ? 'Saving...' : 'Save Activity'}
                        </Button>
                    </div>
                </form>
            </Card>
        </div>
    );
}
