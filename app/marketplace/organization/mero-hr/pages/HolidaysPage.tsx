import React, { useEffect, useState } from 'react';
import {
    CalendarDays,
    Plus,
    Trash2,
    Sparkles,
    CheckCircle2,
    XCircle,
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { Card, Button, Badge, Dialog, DialogContent, DialogTitle, Input, Label } from '@shared';
import { HrPublicHoliday } from '../types';
import { hrService } from '../services/hrService';
import toast from '@shared/hooks/useToast';
import { format } from 'date-fns';

export default function HolidaysPage() {
    const { theme } = useTheme();
    const [holidays, setHolidays] = useState<HrPublicHoliday[]>([]);
    const [loading, setLoading] = useState(true);
    const [seeding, setSeeding] = useState(false);
    const [showDialog, setShowDialog] = useState(false);
    const [year, setYear] = useState(new Date().getFullYear());
    const [form, setForm] = useState({
        name: '',
        date: '',
        nepali_year: '2081',
        is_paid: true,
        description: '',
    });

    const fetchHolidays = async () => {
        try {
            setLoading(true);
            setHolidays(await hrService.getHolidays(year));
        } catch {
            toast.error('Failed to load holidays');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchHolidays(); }, [year]);

    const handleSeed = async () => {
        try {
            setSeeding(true);
            const seeded = await hrService.seedNepalHolidays();
            toast.success(`${seeded.length} Nepal FY 2081 holidays seeded!`);
            fetchHolidays();
        } catch {
            toast.error('Failed to seed holidays');
        } finally {
            setSeeding(false);
        }
    };

    const handleCreate = async () => {
        try {
            await hrService.createHoliday({ ...form, year: new Date(form.date).getFullYear() });
            toast.success('Holiday added');
            setShowDialog(false);
            fetchHolidays();
        } catch {
            toast.error('Failed to add holiday');
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await hrService.deleteHoliday(id);
            toast.success('Holiday removed');
            fetchHolidays();
        } catch {
            toast.error('Failed to delete holiday');
        }
    };

    const monthGroups = holidays.reduce<Record<string, HrPublicHoliday[]>>((acc, h) => {
        const month = format(new Date(h.date), 'MMMM yyyy');
        if (!acc[month]) acc[month] = [];
        acc[month].push(h);
        return acc;
    }, {});

    return (
        <div className="p-8 space-y-8 max-w-[1600px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-5">
                    <div className="p-4 rounded-2xl shadow-lg border bg-orange-500/10 border-orange-500/30">
                        <CalendarDays className="h-8 w-8 text-orange-500" />
                    </div>
                    <div>
                        <h1 className="text-4xl font-black" style={{ color: theme.colors.text }}>Public Holidays</h1>
                        <p className="font-medium opacity-60" style={{ color: theme.colors.textSecondary }}>
                            Nepal calendar — Bikram Sambat
                        </p>
                    </div>
                </div>
                <div className="flex gap-3 items-center">
                    <div className="flex bg-black/5 dark:bg-white/5 p-1 rounded-xl border" style={{ borderColor: theme.colors.border }}>
                        <Input
                            type="number"
                            value={year}
                            onChange={e => setYear(+e.target.value)}
                            className="bg-transparent border-none h-10 w-28 font-bold"
                            min={2020} max={2030}
                        />
                    </div>
                    <Button
                        onClick={handleSeed}
                        disabled={seeding}
                        variant="outline"
                        className="gap-2 rounded-xl font-bold"
                    >
                        <Sparkles className="h-4 w-4 text-orange-500" />
                        {seeding ? 'Seeding...' : 'Seed Nepal 2081'}
                    </Button>
                    <Button onClick={() => setShowDialog(true)} className="gap-2 rounded-xl font-black px-6">
                        <Plus className="h-4 w-4" /> Add Holiday
                    </Button>
                </div>
            </div>

            {/* Summary bar */}
            <Card className="p-5 border-none shadow-xl" style={{ backgroundColor: theme.colors.surface }}>
                <div className="flex gap-8">
                    <div>
                        <p className="text-[10px] uppercase font-black tracking-widest opacity-40" style={{ color: theme.colors.text }}>Total</p>
                        <p className="text-3xl font-black" style={{ color: theme.colors.text }}>{holidays.length}</p>
                    </div>
                    <div>
                        <p className="text-[10px] uppercase font-black tracking-widest opacity-40 text-emerald-500">Paid</p>
                        <p className="text-3xl font-black text-emerald-500">{holidays.filter(h => h.is_paid).length}</p>
                    </div>
                    <div>
                        <p className="text-[10px] uppercase font-black tracking-widest opacity-40 text-orange-500">Unpaid</p>
                        <p className="text-3xl font-black text-orange-500">{holidays.filter(h => !h.is_paid).length}</p>
                    </div>
                </div>
            </Card>

            {/* Holiday list by month */}
            {loading ? (
                <div className="space-y-4">
                    {Array(3).fill(0).map((_, i) => (
                        <Card key={i} className="p-6 h-24 animate-pulse" style={{ backgroundColor: theme.colors.surface }}>
                            <div className="h-full" />
                        </Card>
                    ))}
                </div>
            ) : holidays.length === 0 ? (
                <Card className="p-20 text-center border-none shadow-xl" style={{ backgroundColor: theme.colors.surface }}>
                    <p className="font-bold opacity-20 text-lg" style={{ color: theme.colors.text }}>
                        No holidays for {year}. Use "Seed Nepal 2081" to populate.
                    </p>
                </Card>
            ) : (
                (Object.entries(monthGroups) as [string, HrPublicHoliday[]][]).map(([month, items]) => (
                    <div key={month}>
                        <p className="text-[10px] font-black uppercase tracking-widest opacity-50 mb-3" style={{ color: theme.colors.text }}>
                            {month}
                        </p>
                        <div className="space-y-2">
                            {items.map(h => (
                                <Card
                                    key={h.id}
                                    className="flex items-center justify-between px-5 py-4 border-none shadow group"
                                    style={{ backgroundColor: theme.colors.surface }}
                                >
                                    <div className="flex items-center gap-4">
                                        <div
                                            className="w-12 h-12 rounded-xl flex flex-col items-center justify-center flex-shrink-0"
                                            style={{ backgroundColor: `${theme.colors.primary}15` }}
                                        >
                                            <span className="text-xl font-black leading-none" style={{ color: theme.colors.primary }}>
                                                {format(new Date(h.date), 'd')}
                                            </span>
                                            <span className="text-[9px] font-black uppercase opacity-60" style={{ color: theme.colors.primary }}>
                                                {format(new Date(h.date), 'EEE')}
                                            </span>
                                        </div>
                                        <div>
                                            <p className="font-bold" style={{ color: theme.colors.text }}>{h.name}</p>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                {h.nepali_year && (
                                                    <span className="text-[10px] opacity-40 font-medium" style={{ color: theme.colors.textSecondary }}>
                                                        BS {h.nepali_year}
                                                    </span>
                                                )}
                                                <Badge variant={h.is_paid ? 'success' : 'secondary'} className="text-[9px]">
                                                    {h.is_paid
                                                        ? <><CheckCircle2 className="h-3 w-3 inline mr-1" />Paid</>
                                                        : <><XCircle className="h-3 w-3 inline mr-1" />Unpaid</>
                                                    }
                                                </Badge>
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleDelete(h.id)}
                                        className="p-2 rounded-lg text-red-500 opacity-0 group-hover:opacity-100 hover:bg-red-500/10 transition-all"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </Card>
                            ))}
                        </div>
                    </div>
                ))
            )}

            {/* Add Holiday Dialog */}
            <Dialog open={showDialog} onOpenChange={setShowDialog}>
                <DialogContent>
                    <DialogTitle>Add Public Holiday</DialogTitle>
                    <div className="space-y-4 mt-4">
                        <div>
                            <Label style={{ color: theme.colors.textSecondary }}>Holiday Name</Label>
                            <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Dashain" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label style={{ color: theme.colors.textSecondary }}>Date</Label>
                                <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
                            </div>
                            <div>
                                <Label style={{ color: theme.colors.textSecondary }}>Nepali Year (BS)</Label>
                                <Input value={form.nepali_year} onChange={e => setForm(f => ({ ...f, nepali_year: e.target.value }))} placeholder="e.g. 2081" />
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <input
                                type="checkbox"
                                id="is_paid"
                                checked={form.is_paid}
                                onChange={e => setForm(f => ({ ...f, is_paid: e.target.checked }))}
                                className="h-4 w-4 rounded"
                            />
                            <label htmlFor="is_paid" className="text-sm font-medium" style={{ color: theme.colors.text }}>
                                Paid Holiday
                            </label>
                        </div>
                        <div className="flex justify-end gap-3 pt-2">
                            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
                            <Button onClick={handleCreate}>Add Holiday</Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
