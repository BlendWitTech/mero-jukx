import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/services/api';
import { useTheme } from '@/contexts/ThemeContext';
import {
    ArrowLeft,
    Plus,
    Link,
    Unlink,
    CheckCircle,
    AlertCircle,
    Landmark,
    X,
    ArrowUpCircle,
    ArrowDownCircle,
} from 'lucide-react';

interface BankEntry {
    id: string;
    entryDate: string;
    description: string;
    amount: number;
    type: 'CREDIT' | 'DEBIT';
    reference?: string;
    isMatched: boolean;
    matchedTransactionId?: string;
}

interface KhataTransaction {
    id: string;
    transactionDate: string;
    amount: number;
    type: 'GIVE' | 'GET';
    details?: string;
    isReconciled: boolean;
    customer?: { name: string };
}

interface AddBankEntryForm {
    entryDate: string;
    description: string;
    amount: string;
    type: 'CREDIT' | 'DEBIT';
    reference: string;
}

const defaultForm: AddBankEntryForm = {
    entryDate: new Date().toISOString().split('T')[0],
    description: '',
    amount: '',
    type: 'CREDIT',
    reference: '',
};

export default function BankReconciliationPage() {
    const navigate = useNavigate();
    const { theme } = useTheme();
    const queryClient = useQueryClient();

    const [showAddForm, setShowAddForm] = useState(false);
    const [form, setForm] = useState<AddBankEntryForm>(defaultForm);
    const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);

    const { data: summary } = useQuery({
        queryKey: ['khata-reconciliation-summary'],
        queryFn: async () => (await api.get('/khata/reconciliation/summary')).data,
    });

    const { data: bankEntries = [], isLoading: entriesLoading } = useQuery({
        queryKey: ['khata-bank-entries'],
        queryFn: async () => (await api.get('/khata/bank-entries')).data,
    });

    const { data: unreconciledTx = [], isLoading: txLoading } = useQuery({
        queryKey: ['khata-unreconciled-transactions'],
        queryFn: async () => (await api.get('/khata/reconciliation/unreconciled-transactions')).data,
    });

    const addEntryMutation = useMutation({
        mutationFn: (data: any) => api.post('/khata/bank-entries', data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['khata-bank-entries'] });
            queryClient.invalidateQueries({ queryKey: ['khata-reconciliation-summary'] });
            setForm(defaultForm);
            setShowAddForm(false);
        },
    });

    const matchMutation = useMutation({
        mutationFn: ({ entryId, txId }: { entryId: string; txId: string }) =>
            api.post(`/khata/bank-entries/${entryId}/match/${txId}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['khata-bank-entries'] });
            queryClient.invalidateQueries({ queryKey: ['khata-unreconciled-transactions'] });
            queryClient.invalidateQueries({ queryKey: ['khata-reconciliation-summary'] });
            setSelectedEntryId(null);
        },
    });

    const unmatchMutation = useMutation({
        mutationFn: (entryId: string) => api.delete(`/khata/bank-entries/${entryId}/match`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['khata-bank-entries'] });
            queryClient.invalidateQueries({ queryKey: ['khata-unreconciled-transactions'] });
            queryClient.invalidateQueries({ queryKey: ['khata-reconciliation-summary'] });
        },
    });

    const handleMatch = (txId: string) => {
        if (!selectedEntryId) return;
        matchMutation.mutate({ entryId: selectedEntryId, txId });
    };

    const isLoading = entriesLoading || txLoading;

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900">
            {/* Header */}
            <div className="p-4 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center gap-3 sticky top-0 z-10">
                <button
                    onClick={() => navigate(-1)}
                    className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700"
                >
                    <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                </button>
                <div className="flex-1">
                    <h1 className="font-bold text-slate-900 dark:text-white">Bank Reconciliation</h1>
                    <p className="text-xs text-slate-500">Match bank entries with Khata transactions</p>
                </div>
                <button
                    onClick={() => setShowAddForm(true)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-white text-sm font-semibold shadow"
                    style={{ backgroundColor: theme.colors.primary }}
                >
                    <Plus className="w-4 h-4" />
                    Add Entry
                </button>
            </div>

            {/* Summary Cards */}
            {summary && (
                <div className="p-4 grid grid-cols-2 gap-3">
                    <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                        <div className="text-xs text-slate-500 mb-1">Bank Entries</div>
                        <div className="text-2xl font-bold text-slate-900 dark:text-white">{summary.totalBankEntries}</div>
                        <div className="text-xs mt-1">
                            <span className="text-green-600">{summary.matchedEntries} matched</span>
                            {' · '}
                            <span className="text-amber-600">{summary.unmatchedEntries} pending</span>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                        <div className="text-xs text-slate-500 mb-1">Khata Transactions</div>
                        <div className="text-2xl font-bold text-slate-900 dark:text-white">{summary.totalTransactions}</div>
                        <div className="text-xs mt-1">
                            <span className="text-green-600">{summary.reconciledTransactions} reconciled</span>
                            {' · '}
                            <span className="text-amber-600">{summary.unreconciledTransactions} pending</span>
                        </div>
                    </div>
                    <div className="col-span-2 bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 flex items-center gap-3">
                        <Landmark className="w-5 h-5 text-blue-500" />
                        <div>
                            <div className="text-xs text-slate-500">Bank Balance (from entries)</div>
                            <div className={`text-lg font-bold ${summary.bankBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                Rs. {Math.abs(summary.bankBalance).toLocaleString()}
                                <span className="text-sm font-normal text-slate-400 ml-1">
                                    {summary.bankBalance >= 0 ? 'credit' : 'debit'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {isLoading ? (
                <div className="flex items-center justify-center flex-1">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: theme.colors.primary }} />
                </div>
            ) : (
                <div className="flex-1 overflow-auto p-4 pt-0 space-y-6">
                    {/* Bank Entries */}
                    <div>
                        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                            <Landmark className="w-4 h-4" />
                            Bank Statement Entries
                        </h2>
                        {(bankEntries as BankEntry[]).length === 0 ? (
                            <div className="bg-white dark:bg-slate-800 rounded-xl p-8 text-center border border-slate-200 dark:border-slate-700">
                                <Landmark className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                                <p className="text-slate-500 text-sm">No bank entries yet. Add entries from your bank statement.</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {(bankEntries as BankEntry[]).map((entry) => (
                                    <div
                                        key={entry.id}
                                        className={`bg-white dark:bg-slate-800 rounded-xl p-4 border transition-all ${
                                            selectedEntryId === entry.id
                                                ? 'border-blue-400 ring-2 ring-blue-200 dark:ring-blue-800'
                                                : 'border-slate-200 dark:border-slate-700'
                                        }`}
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                                {entry.type === 'CREDIT' ? (
                                                    <ArrowDownCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                                                ) : (
                                                    <ArrowUpCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                                                )}
                                                <div className="min-w-0">
                                                    <div className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">
                                                        {entry.description || 'Bank Entry'}
                                                    </div>
                                                    <div className="text-xs text-slate-400">
                                                        {new Date(entry.entryDate).toLocaleDateString()}
                                                        {entry.reference && <span className="ml-2">Ref: {entry.reference}</span>}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right flex-shrink-0">
                                                <div className={`font-bold ${entry.type === 'CREDIT' ? 'text-green-600' : 'text-red-600'}`}>
                                                    {entry.type === 'CREDIT' ? '+' : '-'} Rs. {Number(entry.amount).toLocaleString()}
                                                </div>
                                                <div className="flex items-center justify-end gap-1 mt-1">
                                                    {entry.isMatched ? (
                                                        <>
                                                            <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                                                            <span className="text-xs text-green-600">Matched</span>
                                                            <button
                                                                onClick={() => unmatchMutation.mutate(entry.id)}
                                                                className="ml-1 p-0.5 rounded text-slate-400 hover:text-red-500"
                                                                title="Remove match"
                                                            >
                                                                <Unlink className="w-3 h-3" />
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                                                            <span className="text-xs text-amber-600">Unmatched</span>
                                                            <button
                                                                onClick={() => setSelectedEntryId(
                                                                    selectedEntryId === entry.id ? null : entry.id
                                                                )}
                                                                className="ml-1 p-0.5 rounded text-blue-500 hover:text-blue-700 text-xs font-semibold"
                                                                title="Select to match"
                                                            >
                                                                <Link className="w-3 h-3" />
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Unreconciled Khata Transactions */}
                    {selectedEntryId && (
                        <div>
                            <h2 className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-3">
                                Select a Khata transaction to match
                            </h2>
                            <div className="space-y-2">
                                {(unreconciledTx as KhataTransaction[]).length === 0 ? (
                                    <p className="text-slate-500 text-sm text-center py-4">All transactions are reconciled.</p>
                                ) : (
                                    (unreconciledTx as KhataTransaction[]).map((tx) => (
                                        <button
                                            key={tx.id}
                                            onClick={() => handleMatch(tx.id)}
                                            disabled={matchMutation.isPending}
                                            className="w-full bg-blue-50 dark:bg-blue-900/10 hover:bg-blue-100 dark:hover:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 text-left transition-colors disabled:opacity-50"
                                        >
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                                                        {tx.customer?.name ?? 'Unknown'}
                                                    </div>
                                                    <div className="text-xs text-slate-400">
                                                        {new Date(tx.transactionDate).toLocaleDateString()}
                                                        {tx.details && <span className="ml-2">· {tx.details}</span>}
                                                    </div>
                                                </div>
                                                <div className={`font-bold ${tx.type === 'GIVE' ? 'text-red-600' : 'text-green-600'}`}>
                                                    {tx.type === 'GIVE' ? '-' : '+'} Rs. {Number(tx.amount).toLocaleString()}
                                                </div>
                                            </div>
                                        </button>
                                    ))
                                )}
                                <button
                                    onClick={() => setSelectedEntryId(null)}
                                    className="w-full py-2 text-slate-400 text-sm hover:text-slate-600"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    )}

                    {!selectedEntryId && (
                        <div>
                            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                                Unreconciled Khata Transactions
                            </h2>
                            {(unreconciledTx as KhataTransaction[]).length === 0 ? (
                                <div className="bg-white dark:bg-slate-800 rounded-xl p-8 text-center border border-slate-200 dark:border-slate-700">
                                    <CheckCircle className="w-8 h-8 text-green-400 mx-auto mb-2" />
                                    <p className="text-slate-500 text-sm">All transactions are reconciled.</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {(unreconciledTx as KhataTransaction[]).map((tx) => (
                                        <div
                                            key={tx.id}
                                            className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700"
                                        >
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                                                        {tx.customer?.name ?? 'Unknown'}
                                                    </div>
                                                    <div className="text-xs text-slate-400">
                                                        {new Date(tx.transactionDate).toLocaleDateString()}
                                                        {tx.details && <span className="ml-2">· {tx.details}</span>}
                                                    </div>
                                                </div>
                                                <div className={`font-bold ${tx.type === 'GIVE' ? 'text-red-600' : 'text-green-600'}`}>
                                                    {tx.type === 'GIVE' ? '-' : '+'} Rs. {Number(tx.amount).toLocaleString()}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Add Bank Entry Modal */}
            {showAddForm && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md shadow-2xl">
                        <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Add Bank Entry</h2>
                            <button
                                onClick={() => { setShowAddForm(false); setForm(defaultForm); }}
                                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
                            >
                                <X className="w-5 h-5 text-slate-500" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    onClick={() => setForm(f => ({ ...f, type: 'CREDIT' }))}
                                    className={`py-2 rounded-lg font-semibold text-sm border transition-colors ${
                                        form.type === 'CREDIT'
                                            ? 'bg-green-600 text-white border-green-600'
                                            : 'border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300'
                                    }`}
                                >
                                    Credit (Money In)
                                </button>
                                <button
                                    onClick={() => setForm(f => ({ ...f, type: 'DEBIT' }))}
                                    className={`py-2 rounded-lg font-semibold text-sm border transition-colors ${
                                        form.type === 'DEBIT'
                                            ? 'bg-red-600 text-white border-red-600'
                                            : 'border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300'
                                    }`}
                                >
                                    Debit (Money Out)
                                </button>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-500 uppercase">Amount *</label>
                                <input
                                    type="number"
                                    placeholder="0"
                                    className="w-full px-4 py-3 text-xl font-bold rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-primary/20 outline-none"
                                    value={form.amount}
                                    onChange={(e) => setForm(f => ({ ...f, amount: e.target.value }))}
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-500 uppercase">Date *</label>
                                <input
                                    type="date"
                                    className="w-full px-4 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-primary/20"
                                    value={form.entryDate}
                                    onChange={(e) => setForm(f => ({ ...f, entryDate: e.target.value }))}
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-500 uppercase">Description</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Cash deposit, Cheque payment"
                                    className="w-full px-4 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-primary/20"
                                    value={form.description}
                                    onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-500 uppercase">Bank Reference (optional)</label>
                                <input
                                    type="text"
                                    placeholder="e.g. TXN123456"
                                    className="w-full px-4 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-primary/20"
                                    value={form.reference}
                                    onChange={(e) => setForm(f => ({ ...f, reference: e.target.value }))}
                                />
                            </div>
                        </div>
                        <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex gap-3">
                            <button
                                onClick={() => { setShowAddForm(false); setForm(defaultForm); }}
                                className="flex-1 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => addEntryMutation.mutate({
                                    entryDate: form.entryDate,
                                    description: form.description,
                                    amount: parseFloat(form.amount),
                                    type: form.type,
                                    reference: form.reference || undefined,
                                })}
                                disabled={addEntryMutation.isPending || !form.amount || !form.entryDate}
                                className="flex-1 py-3 rounded-xl text-white font-bold shadow disabled:opacity-50 transition-all active:scale-95"
                                style={{ backgroundColor: theme.colors.primary }}
                            >
                                {addEntryMutation.isPending ? 'Saving...' : 'Add Entry'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
