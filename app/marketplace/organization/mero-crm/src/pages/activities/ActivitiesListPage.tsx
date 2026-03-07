import React, { useEffect, useState } from 'react';
import { useTheme } from '@frontend/contexts/ThemeContext';
import { Link, useNavigate } from 'react-router-dom';
import { activitiesApi, Activity } from '../../api/activities';
import { Card, Button, Input, Badge } from '@shared';
import { Plus, Search, CalendarCheck, Edit, Trash2, Calendar, LayoutGrid, CheckCircle } from 'lucide-react';
import { toast } from '@shared';
import { useAppContext } from '../../contexts/AppContext';
import ActivityFormModal from '../../components/ActivityFormModal';

export default function ActivitiesListPage() {
    const { theme } = useTheme();
    const navigate = useNavigate();
    const { buildHref } = useAppContext();
    const [activities, setActivities] = useState<Activity[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        fetchActivities();
    }, []);

    const fetchActivities = async () => {
        try {
            setLoading(true);
            const data = await activitiesApi.getActivities();
            setActivities(data);
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to fetch activities');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this activity?')) return;
        try {
            await activitiesApi.deleteActivity(id);
            setActivities(activities.filter(a => a.id !== id));
            toast.success('Activity deleted');
        } catch (error: any) {
            toast.error('Failed to delete activity');
        }
    };

    const handleMarkCompleted = async (id: string) => {
        try {
            await activitiesApi.updateActivity(id, { status: 'COMPLETED' });
            toast.success('Activity marked as completed');
            fetchActivities();
        } catch (error: any) {
            toast.error('Failed to complete activity');
        }
    }

    const filteredActivities = activities.filter(activity =>
        activity.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        activity.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'CALL': return 'blue';
            case 'MEETING': return 'purple';
            case 'EMAIL': return 'amber';
            case 'TASK': return 'green';
            case 'NOTE': return 'gray';
            default: return 'gray';
        }
    };

    return (
        <div className="p-8 max-w-[1600px] mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="p-3 rounded-2xl bg-primary/10">
                        <CalendarCheck className="h-8 w-8 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold" style={{ color: theme.colors.text }}>Activities</h1>
                        <p style={{ color: theme.colors.textSecondary }}>Manage your tasks, calls, and meetings</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <div className="flex rounded-xl bg-surface/50 p-1 border border-border/50">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="rounded-lg h-9 px-3 bg-primary text-white"
                            onClick={() => { }}
                        >
                            <LayoutGrid className="h-4 w-4 mr-2" />
                            List
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="rounded-lg h-9 px-3 text-textSecondary"
                            onClick={() => navigate(buildHref('/activities/calendar'))}
                        >
                            <Calendar className="h-4 w-4 mr-2" />
                            Calendar
                        </Button>
                    </div>
                    <Button
                        variant="primary"
                        className="shadow-lg shadow-primary/20 scale-105 active:scale-95 transition-transform px-6"
                        onClick={() => setIsModalOpen(true)}
                    >
                        <Plus className="h-5 w-5 mr-2" />
                        Log Activity
                    </Button>
                </div>
            </div>

            {/* Search and Filters */}
            <Card className="p-4" style={{ backgroundColor: theme.colors.surface }}>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                        className="pl-10"
                        placeholder="Search activities by subject or description..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{ backgroundColor: theme.colors.background, borderColor: theme.colors.border }}
                    />
                </div>
            </Card>

            {/* Activities Table */}
            <Card className="overflow-hidden" style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border }}>
                {loading ? (
                    <div className="p-8 text-center text-gray-500">Loading activities...</div>
                ) : filteredActivities.length === 0 ? (
                    <div className="p-12 text-center flex flex-col items-center">
                        <div className="h-16 w-16 bg-black/5 dark:bg-white/5 rounded-full flex items-center justify-center mb-4">
                            <CalendarCheck className="h-8 w-8 text-primary" />
                        </div>
                        <h3 className="text-lg font-bold mb-2">No activities found</h3>
                        <p style={{ color: theme.colors.textSecondary }}>You don't have any tasks or activities logged yet.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs uppercase bg-black/5 dark:bg-white/5" style={{ color: theme.colors.textSecondary }}>
                                <tr>
                                    <th className="px-6 py-4 rounded-tl-xl font-bold">Type</th>
                                    <th className="px-6 py-4 font-bold">Subject</th>
                                    <th className="px-6 py-4 font-bold">Assigned To</th>
                                    <th className="px-6 py-4 font-bold">Due Date</th>
                                    <th className="px-6 py-4 font-bold">Status</th>
                                    <th className="px-6 py-4 font-bold">Related To</th>
                                    <th className="px-6 py-4 rounded-tr-xl font-bold text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredActivities.map((activity) => (
                                    <tr key={activity.id} className="border-b transition-colors hover:bg-black/5 dark:hover:bg-white/5 last:border-0" style={{ borderColor: theme.colors.border }}>
                                        <td className="px-6 py-4">
                                            <Badge className={`bg-${getTypeColor(activity.type)}-100 text-${getTypeColor(activity.type)}-700 dark:bg-${getTypeColor(activity.type)}-900/30 dark:text-${getTypeColor(activity.type)}-400`}>
                                                {activity.type}
                                            </Badge>
                                        </td>
                                        <td className="px-6 py-4 font-medium" style={{ color: theme.colors.text }}>
                                            {activity.subject}
                                        </td>
                                        <td className="px-6 py-4" style={{ color: theme.colors.textSecondary }}>
                                            {activity.assignedTo ? `${activity.assignedTo.firstName} ${activity.assignedTo.lastName}` : 'Unassigned'}
                                        </td>
                                        <td className="px-6 py-4">
                                            {activity.due_date ? new Date(activity.due_date).toLocaleDateString() : '-'}
                                        </td>
                                        <td className="px-6 py-4">
                                            <Badge variant={activity.status === 'COMPLETED' ? 'success' : activity.status === 'CANCELLED' ? 'danger' : 'warning'} className="text-xs">
                                                {activity.status}
                                            </Badge>
                                        </td>
                                        <td className="px-6 py-4">
                                            {activity.lead ? (
                                                <Link to={buildHref(`/leads/${activity.leadId}`)} className="text-primary hover:underline">
                                                    Lead: {activity.lead.first_name} {activity.lead.last_name || ''}
                                                </Link>
                                            ) : activity.deal ? (
                                                <Link to={buildHref(`/deals/${activity.dealId}`)} className="text-primary hover:underline">
                                                    Deal: {activity.deal.title}
                                                </Link>
                                            ) : '-'}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-end gap-2">
                                                {activity.status !== 'COMPLETED' && (
                                                    <button
                                                        onClick={() => handleMarkCompleted(activity.id)}
                                                        className="p-2 rounded transition-colors hover:bg-green-50 text-green-600"
                                                        title="Mark Completed"
                                                    >
                                                        <CheckCircle className="h-4 w-4" />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => handleDelete(activity.id)}
                                                    className="p-2 rounded transition-colors hover:bg-red-50 text-red-500"
                                                    title="Delete Activity"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            <ActivityFormModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={fetchActivities}
            />
        </div>
    );
}
