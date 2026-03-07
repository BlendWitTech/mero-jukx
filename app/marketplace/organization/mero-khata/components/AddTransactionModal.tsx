import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/services/api';
import { useTheme } from '@/contexts/ThemeContext';
import { X, Calculator, FileText, Calendar } from 'lucide-react';

interface AddTransactionModalProps {
    isOpen: boolean;
    onClose: () => void;
    customerId?: string;
    customerName?: string;
    type: 'GIVE' | 'GET';
}

export default function AddTransactionModal({ isOpen, onClose, customerId, customerName, type }: AddTransactionModalProps) {
    const { theme } = useTheme();
    const queryClient = useQueryClient();
    const [formData, setFormData] = useState({
        amount: '',
        details: '',
        transaction_date: new Date().toISOString().split('T')[0],
        type: type // GIVE or GET
    });

    const mutation = useMutation({
        mutationFn: (data: any) => api.post('/khata/transactions', { ...data, customerId }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['khata-customers'] });
            queryClient.invalidateQueries({ queryKey: ['khata-stats'] });
            queryClient.invalidateQueries({ queryKey: ['khata-customer-details', customerId] });
            onClose();
        }
    });

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
                <div className={`p-4 border-b flex justify-between items-center ${type === 'GIVE' ? 'bg-red-50 dark:bg-red-900/10 border-red-100' : 'bg-green-50 dark:bg-green-900/10 border-green-100'}`}>
                    <div>
                        <h2 className={`text-lg font-bold ${type === 'GIVE' ? 'text-red-700' : 'text-green-700'}`}>
                            {type === 'GIVE' ? 'You Gave (Udhar)' : 'You Got (Payment)'}
                        </h2>
                        <p className="text-xs text-slate-500">For {customerName}</p>
                    </div>
                    <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">
                        <X className="w-5 h-5 text-slate-500" />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Amount *</label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lg font-bold text-slate-400">Rs.</span>
                            <input
                                type="number"
                                autoFocus
                                className="w-full pl-12 pr-4 py-3 text-2xl font-bold rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-primary/20 outline-none"
                                placeholder="0"
                                value={formData.amount}
                                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Details / Description</label>
                        <div className="relative">
                            <FileText className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                            <textarea
                                className="w-full pl-10 pr-4 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-primary/20 outline-none h-24 resize-none"
                                placeholder="Ex: Samosa, Cold Drink, Part Payment..."
                                value={formData.details}
                                onChange={(e) => setFormData({ ...formData, details: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</label>
                        <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="date"
                                className="w-full pl-10 pr-4 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-primary/20 outline-none"
                                value={formData.transaction_date}
                                onChange={(e) => setFormData({ ...formData, transaction_date: e.target.value })}
                            />
                        </div>
                    </div>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-700 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 px-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => mutation.mutate(formData)}
                        disabled={mutation.isPending || !formData.amount}
                        className={`flex-1 py-3 px-4 rounded-xl text-white font-bold shadow-lg disabled:opacity-50 transition-all active:scale-95 ${type === 'GIVE' ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}
                    >
                        {mutation.isPending ? 'Saving...' : 'Save Transaction'}
                    </button>
                </div>
            </div>
        </div>
    );
}
