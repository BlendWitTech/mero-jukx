import React, { useEffect, useState } from 'react';
import { useTheme } from '@frontend/contexts/ThemeContext';
import { useNavigate } from 'react-router-dom';
import { activitiesApi, Activity } from '../../api/activities';
import { Card, Button, Badge } from '@shared';
import { Calendar as CalendarIcon, LayoutGrid, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { toast } from '@shared';
import { useAppContext } from '../../contexts/AppContext';
import ActivityFormModal from '../../components/ActivityFormModal';

export default function ActivityCalendarPage() {
    const { theme } = useTheme();
    const navigate = useNavigate();
    const { buildHref } = useAppContext();
    const [activities, setActivities] = useState<Activity[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const [currentDate, setCurrentDate] = useState(new Date());

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

    const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    const today = () => setCurrentDate(new Date());

    const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
    const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();

    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    const getActivitiesForDay = (day: number) => {
        return activities.filter(a => {
            if (!a.due_date) return false;
            const d = new Date(a.due_date);
            return d.getDate() === day && d.getMonth() === currentDate.getMonth() && d.getFullYear() === currentDate.getFullYear();
        });
    };

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
                        <CalendarIcon className="h-8 w-8 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold" style={{ color: theme.colors.text }}>Activity Calendar</h1>
                        <p style={{ color: theme.colors.textSecondary }}>Visual schedule of upcoming events</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <div className="flex rounded-xl bg-surface/50 p-1 border border-border/50">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="rounded-lg h-9 px-3 text-textSecondary"
                            onClick={() => navigate(buildHref('/activities'))}
                        >
                            <LayoutGrid className="h-4 w-4 mr-2" />
                            List
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="rounded-lg h-9 px-3 bg-primary text-white"
                            onClick={() => { }}
                        >
                            <CalendarIcon className="h-4 w-4 mr-2" />
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

            {/* Calendar Controls */}
            <Card className="p-4 flex items-center justify-between" style={{ backgroundColor: theme.colors.surface }}>
                <h2 className="text-xl font-bold" style={{ color: theme.colors.text }}>
                    {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                </h2>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={prevMonth}>
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={today}>
                        Today
                    </Button>
                    <Button variant="outline" size="sm" onClick={nextMonth}>
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            </Card>

            {/* Calendar Grid */}
            <Card className="overflow-hidden p-6" style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border }}>
                {loading ? (
                    <div className="p-8 text-center text-gray-500">Loading calendar...</div>
                ) : (
                    <div className="grid grid-cols-7 gap-px bg-black/5 dark:bg-white/5 border border-border rounded-xl overflow-hidden">
                        {/* Day Headers */}
                        {dayNames.map(day => (
                            <div key={day} className="bg-surface p-3 text-center text-xs font-bold uppercase tracking-wider" style={{ color: theme.colors.textSecondary }}>
                                {day}
                            </div>
                        ))}

                        {/* Empty cells before 1st of month */}
                        {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                            <div key={`empty-${i}`} className="bg-surface/50 min-h-[120px] p-2 opacity-50"></div>
                        ))}

                        {/* Days of month */}
                        {Array.from({ length: daysInMonth }).map((_, i) => {
                            const day = i + 1;
                            const isToday = day === new Date().getDate() &&
                                currentDate.getMonth() === new Date().getMonth() &&
                                currentDate.getFullYear() === new Date().getFullYear();
                            const dayActivities = getActivitiesForDay(day);

                            return (
                                <div key={day} className={`bg-surface min-h-[120px] p-2 border-t border-border hover:bg-black/5 dark:hover:bg-white/5 transition-colors group relative ${isToday ? 'bg-primary/5' : ''}`}>
                                    <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-medium mb-1 ${isToday ? 'bg-primary text-white shadow-md' : 'text-textSecondary group-hover:text-text'}`}>
                                        {day}
                                    </span>

                                    <div className="space-y-1 mt-1 overflow-y-auto max-h-[80px] scrollbar-thin">
                                        {dayActivities.map(activity => (
                                            <div
                                                key={activity.id}
                                                className={`text-[10px] px-2 py-1 rounded truncate border bg-${getTypeColor(activity.type)}-50 border-${getTypeColor(activity.type)}-200 text-${getTypeColor(activity.type)}-700 dark:bg-${getTypeColor(activity.type)}-900/30 dark:border-${getTypeColor(activity.type)}-800/50 dark:text-${getTypeColor(activity.type)}-300`}
                                                title={activity.subject}
                                            >
                                                <span className="font-bold mr-1">{activity.type.charAt(0)}:</span>
                                                {activity.subject}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}

                        {/* Empty cells after last day of month */}
                        {Array.from({ length: 42 - (firstDayOfMonth + daysInMonth) }).map((_, i) => (
                            <div key={`empty-end-${i}`} className="bg-surface/50 min-h-[120px] p-2 opacity-50 border-t border-border"></div>
                        ))}
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
