import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/services/api';
import { useTheme } from '@/contexts/ThemeContext';
import { Plus, Search, Filter, Eye, FileText, Calendar as CalendarIcon, Trash2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { formatNPR } from '@/utils/nepaliDateUtils';
import toast from '@shared/hooks/useToast';
import {
    Card,
    Button,
    Input,
    Table,
    TableHeader,
    TableBody,
    TableRow,
    TableHead,
    TableCell,
    Modal,
} from '@shared';

interface JournalLine {
    id: string;
    account: {
        id: string;
        name: string;
        code: string;
    };
    debit: number;
    credit: number;
    description: string;
}

interface JournalEntry {
    id: string;
    entryNumber: string;
    entryDate: string;
    narration: string;
    status: 'DRAFT' | 'POSTED' | 'CANCELLED';
    lines: JournalLine[];
}

interface Account {
    id: string;
    code: string;
    name: string;
}

export default function JournalEntriesPage() {
    const { theme } = useTheme();
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState('');
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
    const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);

    // Form State
    const [narration, setNarration] = useState('');
    const [entryDate, setEntryDate] = useState(new Date().toISOString().split('T')[0]);
    const [lines, setLines] = useState<{ accountId: string, debit: number, credit: number, description: string }[]>([
        { accountId: '', debit: 0, credit: 0, description: '' },
        { accountId: '', debit: 0, credit: 0, description: '' }
    ]);

    const { data: journalEntries, isLoading } = useQuery<JournalEntry[]>({
        queryKey: ['accounting-journal-entries'],
        queryFn: async () => {
            const response = await api.get('/accounting/journal-entries');
            return response.data;
        }
    });

    const { data: accounts } = useQuery<Account[]>({
        queryKey: ['accounting-accounts'],
        queryFn: async () => {
            const response = await api.get('/accounting/accounts');
            return response.data;
        },
        enabled: isAddDialogOpen
    });

    const createEntry = useMutation({
        mutationFn: async (data: any) => {
            await api.post('/accounting/journal-entries', data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['accounting-journal-entries'] });
            setIsAddDialogOpen(false);
            setNarration('');
            setLines([{ accountId: '', debit: 0, credit: 0, description: '' }, { accountId: '', debit: 0, credit: 0, description: '' }]);
            toast.success('Journal entry posted successfully');
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Failed to post journal entry');
        }
    });

    const deleteEntry = useMutation({
        mutationFn: async (id: string) => {
            await api.delete(`/accounting/journal-entries/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['accounting-journal-entries'] });
            toast.success('Journal entry deleted successfully');
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Failed to delete journal entry');
        }
    });

    const addLine = () => setLines([...lines, { accountId: '', debit: 0, credit: 0, description: '' }]);
    const removeLine = (index: number) => setLines(lines.filter((_, i) => i !== index));
    const updateLine = (index: number, field: string, value: any) => {
        const newLines = [...lines];
        newLines[index] = { ...newLines[index], [field]: value };
        // If debit is updated, reset credit and vice versa (one must be 0)
        if (field === 'debit' && value > 0) newLines[index].credit = 0;
        if (field === 'credit' && value > 0) newLines[index].debit = 0;
        setLines(newLines);
    };

    const totalDebit = lines.reduce((sum, l) => sum + Number(l.debit), 0);
    const totalCredit = lines.reduce((sum, l) => sum + Number(l.credit), 0);
    const isValid = totalDebit > 0 && totalDebit === totalCredit && lines.every(l => l.accountId && (l.debit > 0 || l.credit > 0));

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'POSTED': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
            case 'DRAFT': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
            case 'CANCELLED': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
            default: return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400';
        }
    };

    if (isLoading) {
        return <div className="p-8 animate-pulse space-y-4">
            <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-1/4"></div>
            <div className="h-64 bg-slate-100 dark:bg-slate-800 rounded-2xl"></div>
        </div>;
    }

    return (
        <div className="p-8 max-w-[1600px] mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="p-3 rounded-2xl" style={{ backgroundColor: `${theme.colors.primary}15` }}>
                        <FileText className="h-8 w-8" style={{ color: theme.colors.primary }} />
                    </div>
                    <div>
                        <h1 className="text-4xl font-extrabold tracking-tight" style={{ color: theme.colors.text }}>
                            Journal Entries
                        </h1>
                        <p className="opacity-70" style={{ color: theme.colors.textSecondary }}>
                            Record and track manual transactions
                        </p>
                    </div>
                </div>
                <Button
                    onClick={() => setIsAddDialogOpen(true)}
                    variant="primary"
                    className="shadow-lg shadow-primary/20 scale-105 active:scale-95 transition-transform px-6 h-12 rounded-xl"
                >
                    <Plus className="h-5 w-5 mr-2" />
                    New Entry
                </Button>
            </div>

            <Card className="p-5 border-none shadow-sm backdrop-blur-sm" style={{ backgroundColor: `${theme.colors.surface}90`, borderRadius: '16px' }}>
                <div className="flex flex-col md:flex-row items-center gap-4">
                    <div className="flex-1 w-full relative group">
                        <Search
                            className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 transition-colors group-focus-within:text-primary"
                            style={{ color: theme.colors.textSecondary }}
                        />
                        <Input
                            type="text"
                            placeholder="Search by entry number or narration..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-12 h-12 bg-transparent border-none focus:ring-2 focus:ring-primary/20 text-lg transition-all"
                            style={{ borderRadius: '12px' }}
                        />
                    </div>
                    <Button variant="ghost" className="h-12 px-6 rounded-xl bg-slate-100 dark:bg-slate-900 border-none font-bold">
                        <CalendarIcon className="h-5 w-5 mr-2" />
                        Date Filter
                    </Button>
                </div>
            </Card>

            <Card className="overflow-hidden border-none shadow-sm" style={{ backgroundColor: theme.colors.surface, borderRadius: '16px' }}>
                <Table>
                    <TableHeader>
                        <TableRow style={{ borderBottom: `1px solid ${theme.colors.border}` }}>
                            <TableHead className="px-6 py-4 text-xs font-extrabold text-slate-400 uppercase tracking-wider">Date</TableHead>
                            <TableHead className="px-6 py-4 text-xs font-extrabold text-slate-400 uppercase tracking-wider">Entry No.</TableHead>
                            <TableHead className="px-6 py-4 text-xs font-extrabold text-slate-400 uppercase tracking-wider">Narration</TableHead>
                            <TableHead className="px-6 py-4 text-xs font-extrabold text-slate-400 uppercase tracking-wider text-right">Amount</TableHead>
                            <TableHead className="px-6 py-4 text-xs font-extrabold text-slate-400 uppercase tracking-wider">Status</TableHead>
                            <TableHead className="px-6 py-4 text-xs font-extrabold text-slate-400 uppercase tracking-wider text-center">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {journalEntries?.map((entry) => {
                            const totalAmount = entry.lines?.reduce((sum, line) => sum + Number(line.debit), 0) || 0;
                            return (
                                <TableRow key={entry.id} className="hover-theme transition-colors group" style={{ borderBottom: `1px solid ${theme.colors.border}` }}>
                                    <TableCell className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-500">
                                        {new Date(entry.entryDate).toLocaleDateString()}
                                    </TableCell>
                                    <TableCell className="px-6 py-4 whitespace-nowrap font-extrabold" style={{ color: theme.colors.primary }}>
                                        {entry.entryNumber}
                                    </TableCell>
                                    <TableCell className="px-6 py-4">
                                        <div className="text-sm font-bold text-slate-900 dark:text-white line-clamp-1">{entry.narration}</div>
                                    </TableCell>
                                    <TableCell className="px-6 py-4 whitespace-nowrap text-right font-extrabold text-slate-900 dark:text-white">
                                        {formatNPR(totalAmount)}
                                    </TableCell>
                                    <TableCell className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-3 py-1 rounded-lg text-[10px] font-extrabold leading-none uppercase tracking-widest ${getStatusColor(entry.status)}`}>
                                            {entry.status}
                                        </span>
                                    </TableCell>
                                    <TableCell className="px-6 py-4 whitespace-nowrap text-center space-x-2">
                                        <button
                                            onClick={() => {
                                                setSelectedEntry(entry);
                                                setIsViewDialogOpen(true);
                                            }}
                                            className="p-2 rounded-xl hover-theme-strong text-slate-500 transition-colors"
                                        >
                                            <Eye size={18} />
                                        </button>
                                        <button
                                            onClick={() => {
                                                if (confirm(`Are you sure you want to delete this ${entry.status.toLowerCase()} journal entry? This will reverse any account balances.`)) {
                                                    deleteEntry.mutate(entry.id);
                                                }
                                            }}
                                            className="p-2 rounded-xl hover:bg-slate-100/50 text-red-400 hover:text-red-500 transition-colors"
                                            title="Delete Entry"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
                {journalEntries?.length === 0 && (
                    <div className="p-12 text-center text-slate-400">
                        <div className="w-16 h-16 bg-slate-100/10 dark:bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-4">
                            <FileText size={24} />
                        </div>
                        <p className="font-extrabold">No journal entries found</p>
                        <p className="text-sm">Create your first entry to get started.</p>
                    </div>
                )}
            </Card>

            {/* New Entry Modal */}
            <Modal
                isOpen={isAddDialogOpen}
                onClose={() => {
                    setIsAddDialogOpen(false);
                }}
                title="Journal Voucher Creation"
                size="5xl"
                theme={{ colors: theme.colors }}
                footer={
                    <div className="flex items-center justify-between w-full p-4 bg-transparent dark:bg-slate-900/40 rounded-b-3xl border-t border-slate-100/30 dark:border-slate-800">
                        <div className="flex items-center gap-6">
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Total Debit</span>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-3xl font-black text-slate-900 dark:text-white leading-none">{formatNPR(totalDebit)}</span>
                                    <span className="text-[10px] font-bold text-green-500 bg-green-500/10 dark:bg-green-900/20 px-2 py-0.5 rounded uppercase tracking-tighter">DR</span>
                                </div>
                            </div>
                            <div className="h-10 w-px bg-slate-200/50 dark:bg-slate-700" />
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Total Credit</span>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-3xl font-black text-slate-900 dark:text-white leading-none">{formatNPR(totalCredit)}</span>
                                    <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded uppercase tracking-tighter" style={{ color: theme.colors.primary }}>CR</span>
                                </div>
                            </div>
                            {totalDebit !== totalCredit && (
                                <div className="flex items-center gap-2 text-red-500 bg-red-500/10 dark:bg-red-900/20 px-4 py-2 rounded-2xl animate-pulse ml-2 border border-red-500/20 dark:border-red-900/30">
                                    <AlertCircle size={18} />
                                    <span className="text-[10px] font-black uppercase tracking-widest leading-none">Voucher Out of Balance</span>
                                </div>
                            )}
                        </div>
                        <div className="flex gap-4 items-center">
                            <Button
                                onClick={() => setIsAddDialogOpen(false)}
                                variant="ghost"
                                className="px-6 h-10 rounded-xl font-bold border border-slate-200 dark:border-slate-700 hover:bg-slate-100/10 dark:hover:bg-slate-800 transition-all text-sm"
                            >
                                Discard
                            </Button>
                            <Button
                                onClick={() => createEntry.mutate({
                                    narration,
                                    entryDate,
                                    status: 'POSTED',
                                    lines: lines.filter(l => l.accountId && (l.debit > 0 || l.credit > 0))
                                })}
                                disabled={createEntry.isPending || !isValid}
                                variant="primary"
                                className="px-10 h-11 rounded-xl font-black shadow-xl shadow-primary/20 hover:shadow-primary/30 active:scale-95 transition-all flex items-center gap-3 text-sm"
                                isLoading={createEntry.isPending}
                            >
                                <CheckCircle2 size={18} />
                                {createEntry.isPending ? 'Validating...' : 'Post Journal Voucher'}
                            </Button>
                        </div>
                    </div>
                }
            >
                <div className="space-y-4 p-0">
                    {/* Ghost Header Section - Single Line */}
                    <div className="px-6 py-4 border-b border-slate-100/30 dark:border-slate-800">
                        <div className="flex items-center gap-10">
                            <div className="flex-1 space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Voucher Number</label>
                                <div className="h-8 flex items-center px-3 rounded-lg bg-transparent dark:bg-slate-800/30 border border-slate-100/30 dark:border-slate-700 text-slate-500 font-bold text-[10px] uppercase italic">
                                    JE-SYSTEM-GENERATED
                                </div>
                            </div>

                            <div className="flex-1">
                                {/* Spacer */}
                            </div>

                            <div className="flex-1 space-y-1 text-right">
                                <label className="text-[10px] font-black text-primary uppercase tracking-widest mr-1" style={{ color: theme.colors.primary }}>Statement Date</label>
                                <div className="flex justify-end">
                                    <input
                                        type="date"
                                        className="w-40 h-8 px-3 bg-transparent dark:bg-transparent border border-slate-200/50 dark:border-slate-800 focus:border-primary rounded-lg text-xs font-bold text-right"
                                        value={entryDate}
                                        onChange={(e) => setEntryDate(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Precision Tabular System - No Box */}
                    <div className="overflow-x-auto custom-scrollbar">
                        <div className="min-w-[1100px]">
                            {/* Precisely Aligned Header */}
                            <div className="px-6 py-2 border-b border-slate-100/30 dark:border-slate-700">
                                <div className="flex flex-row items-center gap-4">
                                    <div className="w-[25%] font-black text-[9px] text-slate-400 uppercase tracking-widest px-3">Account Name</div>
                                    <div className="w-[35%] font-black text-[9px] text-slate-400 uppercase tracking-widest px-3">Transaction Memo</div>
                                    <div className="w-[15%] font-black text-[9px] text-slate-400 uppercase tracking-widest text-right pr-3">Debit</div>
                                    <div className="w-[15%] font-black text-[9px] text-slate-400 uppercase tracking-widest text-right pr-3">Credit</div>
                                    <div className="w-[10%] font-black text-[9px] text-slate-400 uppercase tracking-widest text-center">Action</div>
                                </div>
                            </div>

                            {/* Pixel-Perfect Aligned Rows */}
                            <div className="max-h-[30vh] overflow-y-auto custom-scrollbar">
                                {lines.map((line, index) => (
                                    <div key={index} className="flex flex-row items-center gap-4 px-6 py-1.5 border-b border-slate-100/20 dark:border-slate-800/20 hover:bg-slate-100/10 dark:hover:bg-slate-800/10 transition-colors">
                                        <div className="w-[25%]">
                                            <select
                                                className="w-full h-9 px-2 rounded-md bg-transparent dark:bg-slate-900 border border-slate-200/50 dark:border-slate-700 focus:border-primary text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer"
                                                value={line.accountId}
                                                onChange={(e) => updateLine(index, 'accountId', e.target.value)}
                                            >
                                                <option value="">Select Account...</option>
                                                {accounts?.map(acc => (
                                                    <option key={acc.id} value={acc.id}>{acc.code} • {acc.name}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="w-[35%]">
                                            <input
                                                type="text"
                                                className="w-full h-9 px-3 rounded-md bg-transparent dark:bg-transparent border border-slate-200/50 dark:border-slate-700 focus:border-primary text-xs"
                                                placeholder="Entry description..."
                                                value={line.description}
                                                onChange={(e) => updateLine(index, 'description', e.target.value)}
                                            />
                                        </div>

                                        <div className="w-[15%]">
                                            <input
                                                type="number"
                                                className="w-full h-9 px-3 rounded-md bg-transparent dark:bg-transparent border border-slate-200/50 dark:border-slate-700 focus:border-green-500 text-right text-xs font-bold"
                                                placeholder="0.00"
                                                onFocus={(e) => e.target.select()}
                                                value={line.debit || ''}
                                                onChange={(e) => updateLine(index, 'debit', Number(e.target.value))}
                                            />
                                        </div>

                                        <div className="w-[15%]">
                                            <input
                                                type="number"
                                                className="w-full h-9 px-3 rounded-md bg-transparent dark:bg-transparent border border-slate-200/50 dark:border-slate-700 focus:border-primary text-right text-xs font-bold"
                                                placeholder="0.00"
                                                onFocus={(e) => e.target.select()}
                                                value={line.credit || ''}
                                                onChange={(e) => updateLine(index, 'credit', Number(e.target.value))}
                                            />
                                        </div>

                                        <div className="w-[10%] flex justify-center">
                                            <button
                                                onClick={() => removeLine(index)}
                                                className="p-1.5 text-slate-300 hover:text-red-500 transition-colors"
                                                disabled={lines.length <= 2}
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Ghost Add Row */}
                            <div className="px-6 py-2">
                                <button
                                    onClick={addLine}
                                    className="flex items-center gap-2 px-2 py-1 text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-primary transition-colors"
                                    style={{ '--hover-color': theme.colors.primary } as any}
                                >
                                    <Plus size={12} /> Add Entry Line
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Precision Footer */}
                    <div className="px-6 py-4 grid grid-cols-12 gap-10 items-start border-t border-slate-100/30 dark:border-slate-800">
                        <div className="col-span-8 space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">General Voucher Narration</label>
                            <textarea
                                className="w-full p-3 h-20 rounded-lg bg-transparent dark:bg-transparent border border-slate-200/50 dark:border-slate-800 focus:bg-slate-100/10 dark:focus:bg-slate-800/20 focus:border-primary transition-all resize-none text-xs leading-relaxed"
                                placeholder="State the purpose of this voucher..."
                                value={narration}
                                onChange={(e) => setNarration(e.target.value)}
                            />
                        </div>

                        <div className="col-span-4 space-y-4">
                            <div className="p-4 rounded-xl border border-slate-100/30 dark:border-slate-800 space-y-3">
                                <div className="flex items-center justify-between border-b border-slate-100/20 dark:border-slate-800 pb-2">
                                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Total Debit</span>
                                    <span className="text-sm font-black text-green-600">{formatNPR(totalDebit)}</span>
                                </div>
                                <div className="flex items-center justify-between border-b border-slate-100/20 dark:border-slate-800 pb-2">
                                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Total Credit</span>
                                    <span className="text-sm font-black text-primary" style={{ color: theme.colors.primary }}>{formatNPR(totalCredit)}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Difference</span>
                                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${totalDebit === totalCredit && totalDebit > 0 ? 'bg-emerald-500/10 text-emerald-600' : 'bg-red-500/10 text-red-600'}`}>
                                        {totalDebit === totalCredit && totalDebit > 0 ? 'BALANCED' : formatNPR(Math.abs(totalDebit - totalCredit))}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </Modal>

            {/* View Details Modal */}
            <Modal
                isOpen={isViewDialogOpen}
                onClose={() => setIsViewDialogOpen(false)}
                title={`Journal Entry: ${selectedEntry?.entryNumber}`}
                size="5xl"
                theme={{ colors: theme.colors }}
                footer={
                    <div className="flex justify-end w-full">
                        <Button
                            onClick={() => setIsViewDialogOpen(false)}
                            variant="primary"
                            className="px-8 py-3 rounded-xl font-bold"
                        >
                            Close
                        </Button>
                    </div>
                }
            >
                <div className="space-y-4 p-0">
                    {/* Ghost Header Section - Single Line */}
                    <div className="px-6 py-4 border-b border-slate-100/30 dark:border-slate-800">
                        <div className="flex items-center gap-10">
                            <div className="flex-1">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Statement Date</p>
                                <p className="font-bold text-slate-900 dark:text-white text-base">{selectedEntry && new Date(selectedEntry.entryDate).toLocaleDateString(undefined, { dateStyle: 'long' })}</p>
                            </div>
                            <div className="flex-1 border-l border-slate-100/30 dark:border-slate-800/50 pl-8">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Voucher Status</p>
                                <span className={`inline-flex px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest ${selectedEntry && getStatusColor(selectedEntry.status)}`}>
                                    {selectedEntry?.status}
                                </span>
                            </div>
                            <div className="flex-[2] border-l border-slate-100/30 dark:border-slate-800/50 pl-8">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Narration / Internal Note</p>
                                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed italic line-clamp-2">
                                    "{selectedEntry?.narration || 'No internal narration provided.'}"
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Precision Tabular View - No Box */}
                    <div className="overflow-x-auto custom-scrollbar">
                        <div className="min-w-[1000px]">
                            <div className="px-6 py-2 border-b border-slate-100/30 dark:border-slate-700">
                                <div className="flex flex-row items-center gap-4 w-full text-[9px] font-black uppercase tracking-widest text-slate-400">
                                    <div className="w-[25%]">Account Name</div>
                                    <div className="w-[35%]">Line Description</div>
                                    <div className="w-[15%] text-right pr-2">Debit</div>
                                    <div className="w-[15%] text-right pr-2">Credit</div>
                                    <div className="w-[10%]"></div>
                                </div>
                            </div>
                            <div className="max-h-[30vh] overflow-y-auto custom-scrollbar">
                                {selectedEntry?.lines.map((line, idx) => (
                                    <div key={idx} className="flex flex-row items-center gap-4 px-6 py-2 border-b border-slate-100/20 dark:border-slate-800/20 hover:bg-slate-100/10 transition-colors">
                                        <div className="w-[25%] flex flex-col">
                                            <span className="text-[9px] font-black text-primary mb-0.5 uppercase tracking-tighter" style={{ color: theme.colors.primary }}>{line.account.code}</span>
                                            <span className="font-bold text-slate-900 dark:text-slate-100 text-xs truncate">{line.account.name}</span>
                                        </div>
                                        <div className="w-[35%]">
                                            <span className="text-slate-600 dark:text-slate-400 text-xs italic">
                                                {line.description || '—'}
                                            </span>
                                        </div>
                                        <div className="w-[15%] text-right font-black text-slate-900 dark:text-white text-sm pr-2">
                                            {line.debit > 0 ? formatNPR(line.debit) : '—'}
                                        </div>
                                        <div className="w-[15%] text-right font-black text-slate-900 dark:text-white text-sm pr-2">
                                            {line.credit > 0 ? formatNPR(line.credit) : '—'}
                                        </div>
                                        <div className="w-[10%]"></div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Integrated Financial Footnote */}
                    <div className="px-6 py-4 flex justify-end gap-10 border-t border-slate-100/30 dark:border-slate-800">
                        <div className="text-right">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Debit</p>
                            <p className="text-xl font-black text-green-600">
                                {formatNPR(selectedEntry?.lines.reduce((sum, l) => sum + Number(l.debit), 0) || 0)}
                            </p>
                        </div>
                        <div className="text-right border-l border-slate-100/30 dark:border-slate-800 pl-10">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Credit</p>
                            <p className="text-xl font-black text-primary" style={{ color: theme.colors.primary }}>
                                {formatNPR(selectedEntry?.lines.reduce((sum, l) => sum + Number(l.credit), 0) || 0)}
                            </p>
                        </div>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
