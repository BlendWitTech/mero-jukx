import React, { useEffect, useState } from 'react';
import { useTheme } from '@frontend/contexts/ThemeContext';
import { activitiesApi, Activity, CreateActivityDto } from '../api/activities';
import { Card, Button, Input, toast, Loading, Avatar } from '@shared';
import { Phone, Mail, MessageSquare, ClipboardList, Plus, FileText, Send, Calendar, CheckCircle2, Clock } from 'lucide-react';
import ActivityFormModal from './ActivityFormModal';

interface ActivityTimelineProps {
    leadId?: string;
    dealId?: string;
}

export default function ActivityTimeline({ leadId, dealId }: ActivityTimelineProps) {
    const { theme } = useTheme();
    const [activities, setActivities] = useState<Activity[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAdd, setShowAdd] = useState(false);

    useEffect(() => {
        fetchActivities();
    }, [leadId, dealId]);

    const fetchActivities = async () => {
        try {
            setLoading(true);
            const data = await activitiesApi.getActivities(leadId, dealId);
            setActivities(data);
        } catch (error: any) {
            toast.error('Failed to fetch activity history');
        } finally {
            setLoading(false);
        }
    };

    const getActivityIcon = (type: string) => {
        switch (type) {
            case 'CALL': return <Phone className="h-4 w-4" />;
            case 'EMAIL': return <Mail className="h-4 w-4" />;
            case 'MESSAGE': return <MessageSquare className="h-4 w-4" />;
            case 'MEETING': return <Calendar className="h-4 w-4" />;
            case 'TASK': return <ClipboardList className="h-4 w-4" />;
            default: return <FileText className="h-4 w-4" />;
        }
    };

    const getIconColor = (type: string) => {
        switch (type) {
            case 'CALL': return '#3b82f6';
            case 'EMAIL': return '#8b5cf6';
            case 'MEETING': return '#f59e0b';
            case 'TASK': return '#ef4444';
            default: return '#64748b';
        }
    };

    if (loading) return <Loading size="sm" text="Loading timeline..." />;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold" style={{ color: theme.colors.text }}>Activity History</h3>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAdd(!showAdd)}
                    style={{ borderColor: theme.colors.border }}
                >
                    {showAdd ? 'Cancel' : <><Plus className="h-4 w-4 mr-2" /> Log Activity</>}
                </Button>
            </div>

            {showAdd && (
                <ActivityFormModal
                    isOpen={showAdd}
                    onClose={() => setShowAdd(false)}
                    onSuccess={fetchActivities}
                    defaultLeadId={leadId}
                    defaultDealId={dealId}
                />
            )}

            <div className="relative space-y-8 before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border/50 before:to-transparent">
                {activities.length === 0 ? (
                    <div className="text-center py-8 text-sm opacity-50" style={{ color: theme.colors.textSecondary }}>
                        No activities logged yet.
                    </div>
                ) : activities.map((activity, idx) => (
                    <div key={activity.id} className="relative flex items-start gap-6 group">
                        {/* Icon circle */}
                        <div
                            className="flex items-center justify-center w-10 h-10 rounded-full shadow-lg ring-4 ring-background shrink-0 z-10 transition-transform group-hover:scale-110"
                            style={{ backgroundColor: getIconColor(activity.type), color: '#fff' }}
                        >
                            {getActivityIcon(activity.type)}
                        </div>

                        {/* Content */}
                        <div className="flex-1 pt-1">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-2">
                                <h4 className="font-bold text-sm" style={{ color: theme.colors.text }}>{activity.subject}</h4>
                                <div className="flex items-center gap-2 text-[10px] opacity-60" style={{ color: theme.colors.textSecondary }}>
                                    <Clock className="h-3 w-3" />
                                    {new Date(activity.createdAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                </div>
                            </div>

                            {activity.description && (
                                <p className="text-sm p-3 rounded-xl border leading-relaxed" style={{ backgroundColor: `${theme.colors.surface}30`, borderColor: theme.colors.border, color: theme.colors.textSecondary }}>
                                    {activity.description}
                                </p>
                            )}

                            <div className="mt-2 flex items-center gap-2">
                                {activity.assignedTo && (
                                    <div className="flex items-center gap-1.5 text-[10px]" style={{ color: theme.colors.textSecondary }}>
                                        <Avatar size="sm" className="h-4 w-4" name={`${activity.assignedTo.firstName} ${activity.assignedTo.lastName}`} />
                                        <span>{activity.assignedTo.firstName}</span>
                                    </div>
                                )}
                                <div className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-green-500/10 text-green-500 font-bold">
                                    <CheckCircle2 className="h-3 w-3" />
                                    {activity.status}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
