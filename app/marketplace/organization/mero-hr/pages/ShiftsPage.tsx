import React, { useEffect, useState } from 'react';
import {
    Clock,
    Plus,
    Pencil,
    Trash2,
    CheckCircle2,
    XCircle,
    CalendarClock,
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { Card, Button, Badge, Dialog, DialogContent, DialogTitle, Input, Label } from '@shared';
import { HrShift } from '../types';
import { hrService } from '../services/hrService';
import toast from '@shared/hooks/useToast';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function ShiftsPage() {
    const { theme } = useTheme();
    const [shifts, setShifts] = useState<HrShift[]>([]);
    const [loading, setLoading] = useState(true);
    const [showDialog, setShowDialog] = useState(false);
    const [editing, setEditing] = useState<HrShift | null>(null);
    const [form, setForm] = useState({
        name: '',
        start_time: '09:00',
        end_time: '18:00',
        work_hours: 8,
        work_days: '1,2,3,4,5',
        description: '',
    });

    const fetchShifts = async () => {
        try {
            setLoading(true);
            setShifts(await hrService.getShifts());
        } catch {
            toast.error('Failed to load shifts');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchShifts(); }, []);

    const openNew = () => {
        setEditing(null);
        setForm({ name: '', start_time: '09:00', end_time: '18:00', work_hours: 8, work_days: '1,2,3,4,5', description: '' });
        setShowDialog(true);
    };

    const openEdit = (s: HrShift) => {
        setEditing(s);
        setForm({ name: s.name, start_time: s.start_time, end_time: s.end_time, work_hours: s.work_hours, work_days: s.work_days, description: s.description || '' });
        setShowDialog(true);
    };

    const handleSave = async () => {
        try {
            if (editing) {
                await hrService.updateShift(editing.id, form);
                toast.success('Shift updated');
            } else {
                await hrService.createShift(form);
                toast.success('Shift created');
            }
            setShowDialog(false);
            fetchShifts();
        } catch {
            toast.error('Failed to save shift');
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await hrService.deleteShift(id);
            toast.success('Shift deleted');
            fetchShifts();
        } catch {
            toast.error('Failed to delete shift');
        }
    };

    const toggleDay = (day: number) => {
        const days = form.work_days.split(',').map(Number);
        const updated = days.includes(day) ? days.filter(d => d !== day) : [...days, day].sort();
        setForm(f => ({ ...f, work_days: updated.join(',') }));
    };

    return (
        <div className="p-8 space-y-8 max-w-[1600px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-5">
                    <div className="p-4 rounded-2xl shadow-lg border bg-violet-500/10 border-violet-500/30">
                        <CalendarClock className="h-8 w-8 text-violet-500" />
                    </div>
                    <div>
                        <h1 className="text-4xl font-black" style={{ color: theme.colors.text }}>Shift Management</h1>
                        <p className="font-medium opacity-60" style={{ color: theme.colors.textSecondary }}>
                            Define work schedules and rosters
                        </p>
                    </div>
                </div>
                <Button onClick={openNew} className="gap-2 rounded-xl font-black px-6">
                    <Plus className="h-4 w-4" /> New Shift
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {loading
                    ? Array(3).fill(0).map((_, i) => (
                        <Card key={i} className="p-6 animate-pulse h-40" style={{ backgroundColor: theme.colors.surface }}>
                            <div className="h-full" />
                        </Card>
                    ))
                    : shifts.length === 0
                        ? (
                            <div className="col-span-3 text-center p-20 opacity-30 font-bold" style={{ color: theme.colors.text }}>
                                No shifts yet. Create your first work schedule.
                            </div>
                        )
                        : shifts.map(shift => {
                            const activeDays = shift.work_days.split(',').map(Number);
                            return (
                                <Card key={shift.id} className="p-6 border-none shadow-xl group" style={{ backgroundColor: theme.colors.surface }}>
                                    <div className="flex items-start justify-between mb-4">
                                        <div>
                                            <p className="font-black text-lg" style={{ color: theme.colors.text }}>{shift.name}</p>
                                            <p className="text-sm opacity-50 mt-0.5" style={{ color: theme.colors.textSecondary }}>
                                                {shift.start_time} – {shift.end_time} · {shift.work_hours}h/day
                                            </p>
                                        </div>
                                        <Badge variant={shift.is_active ? 'success' : 'secondary'}>
                                            {shift.is_active ? <CheckCircle2 className="h-3 w-3 inline mr-1" /> : <XCircle className="h-3 w-3 inline mr-1" />}
                                            {shift.is_active ? 'Active' : 'Inactive'}
                                        </Badge>
                                    </div>
                                    <div className="flex gap-1.5 mb-5">
                                        {DAY_NAMES.map((d, i) => (
                                            <span
                                                key={i}
                                                className="w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black uppercase"
                                                style={{
                                                    backgroundColor: activeDays.includes(i) ? theme.colors.primary : `${theme.colors.border}`,
                                                    color: activeDays.includes(i) ? '#fff' : theme.colors.textSecondary,
                                                }}
                                            >
                                                {d}
                                            </span>
                                        ))}
                                    </div>
                                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button variant="outline" size="sm" onClick={() => openEdit(shift)} className="gap-1 flex-1">
                                            <Pencil className="h-3 w-3" /> Edit
                                        </Button>
                                        <Button variant="destructive" size="sm" onClick={() => handleDelete(shift.id)} className="gap-1">
                                            <Trash2 className="h-3 w-3" />
                                        </Button>
                                    </div>
                                </Card>
                            );
                        })
                }
            </div>

            <Dialog open={showDialog} onOpenChange={setShowDialog}>
                <DialogContent>
                    <DialogTitle>{editing ? 'Edit Shift' : 'New Shift'}</DialogTitle>
                    <div className="space-y-4 mt-4">
                        <div>
                            <Label style={{ color: theme.colors.textSecondary }}>Shift Name</Label>
                            <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Morning Shift" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label style={{ color: theme.colors.textSecondary }}>Start Time</Label>
                                <Input type="time" value={form.start_time} onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))} />
                            </div>
                            <div>
                                <Label style={{ color: theme.colors.textSecondary }}>End Time</Label>
                                <Input type="time" value={form.end_time} onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))} />
                            </div>
                        </div>
                        <div>
                            <Label style={{ color: theme.colors.textSecondary }}>Work Days</Label>
                            <div className="flex gap-2 mt-2">
                                {DAY_NAMES.map((d, i) => {
                                    const active = form.work_days.split(',').map(Number).includes(i);
                                    return (
                                        <button
                                            key={i}
                                            type="button"
                                            onClick={() => toggleDay(i)}
                                            className="w-9 h-9 rounded-lg text-[11px] font-black uppercase transition-colors"
                                            style={{
                                                backgroundColor: active ? theme.colors.primary : theme.colors.border,
                                                color: active ? '#fff' : theme.colors.textSecondary,
                                            }}
                                        >
                                            {d}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 pt-2">
                            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
                            <Button onClick={handleSave}>{editing ? 'Update' : 'Create'}</Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
