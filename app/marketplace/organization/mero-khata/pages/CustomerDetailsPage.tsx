import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '@/services/api';
import { useTheme } from '@/contexts/ThemeContext';
import {
    ArrowLeft,
    Phone,
    MessageCircle,
    Calendar,
    FileText,
    Share2
} from 'lucide-react';
import AddTransactionModal from '../components/AddTransactionModal';

function buildWhatsAppMessage(customer: any): string {
    const balance = Number(customer?.currentBalance ?? 0);
    const balanceLabel = balance >= 0 ? 'You Owe (Udhar)' : 'Advance Paid';
    const lines: string[] = [
        `*Mero Khata - Account Statement*`,
        `Customer: ${customer?.name}`,
        `Phone: ${customer?.phone}`,
        ``,
        `*Balance: Rs. ${Math.abs(balance).toLocaleString()} (${balanceLabel})*`,
        ``,
        `*Recent Transactions:*`,
    ];

    const sorted = [...(customer?.transactions ?? [])].sort(
        (a: any, b: any) =>
            new Date(b.transaction_date ?? b.transactionDate).getTime() -
            new Date(a.transaction_date ?? a.transactionDate).getTime()
    ).slice(0, 10);

    if (sorted.length === 0) {
        lines.push('No transactions recorded.');
    } else {
        sorted.forEach((tx: any) => {
            const date = new Date(tx.transaction_date ?? tx.transactionDate).toLocaleDateString();
            const sign = tx.type === 'GIVE' ? '-' : '+';
            const detail = tx.details ? ` (${tx.details})` : '';
            lines.push(`${date}: ${sign} Rs. ${Number(tx.amount).toLocaleString()}${detail}`);
        });
    }

    lines.push('', '_Sent via Mero Khata_');
    return lines.join('\n');
}

function openWhatsApp(phone: string, message: string) {
    let digits = phone.replace(/\D/g, '');
    if (!digits.startsWith('977')) digits = '977' + digits;
    window.open(`https://wa.me/${digits}?text=${encodeURIComponent(message)}`, '_blank');
}

interface CustomerDetailsPageProps {
    appSlug: string;
}

export default function CustomerDetailsPage({ appSlug }: CustomerDetailsPageProps) {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { theme } = useTheme();
    const [isAddTxOpen, setIsAddTxOpen] = useState(false);
    const [txType, setTxType] = useState<'GIVE' | 'GET'>('GIVE');

    const { data: customer, isLoading } = useQuery({
        queryKey: ['khata-customer-details', id],
        queryFn: async () => {
            const response = await api.get(`/khata/customers/${id}`);
            return response.data;
        }
    });

    const openTxModal = (type: 'GIVE' | 'GET') => {
        setTxType(type);
        setIsAddTxOpen(true);
    };

    const handleWhatsAppShare = () => {
        if (!customer?.phone) return;
        const message = buildWhatsAppMessage(customer);
        openWhatsApp(customer.phone, message);
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: theme.colors.primary }}></div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-white dark:bg-slate-900">
            {/* Navbar */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between sticky top-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md z-10">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">
                        <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                    </button>
                    <div>
                        <h1 className="font-bold text-slate-900 dark:text-white leading-tight">{customer?.name}</h1>
                        <p className="text-xs text-slate-500">{customer?.phone}</p>
                    </div>
                </div>
                <div className="flex gap-1">
                    <a
                        href={`tel:${customer?.phone}`}
                        className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-green-600"
                        title="Call customer"
                    >
                        <Phone className="w-5 h-5" />
                    </a>
                    <button
                        onClick={handleWhatsAppShare}
                        className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-green-500"
                        title="Share statement via WhatsApp"
                    >
                        <MessageCircle className="w-5 h-5" />
                    </button>
                    <button
                        onClick={handleWhatsAppShare}
                        className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-blue-600"
                        title="Share account statement"
                    >
                        <Share2 className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Balance Card */}
            <div className="p-4">
                <div className={`p-6 rounded-2xl flex flex-col items-center justify-center border ${Number(customer?.currentBalance) >= 0 ? 'bg-red-50 border-red-100 dark:bg-red-900/10 dark:border-red-800' : 'bg-green-50 border-green-100 dark:bg-green-900/10 dark:border-green-800'}`}>
                    <div className="text-sm font-semibold text-slate-500 mb-1 uppercase tracking-wider">
                        {Number(customer?.currentBalance) >= 0 ? 'Customer Owes You' : 'You Owe Customer'}
                    </div>
                    <div className={`text-4xl font-black ${Number(customer?.currentBalance) >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                        Rs. {Math.abs(Number(customer?.currentBalance)).toLocaleString()}
                    </div>
                    {customer?.phone && (
                        <button
                            onClick={handleWhatsAppShare}
                            className="mt-4 flex items-center gap-2 px-4 py-2 rounded-full bg-green-500 hover:bg-green-600 text-white text-sm font-semibold transition-colors"
                        >
                            <MessageCircle className="w-4 h-4" />
                            Send Statement on WhatsApp
                        </button>
                    )}
                </div>
            </div>

            {/* Ledger Entries */}
            <div className="flex-1 overflow-auto p-4 pt-0">
                <div className="flex justify-between items-center mb-4 sticky top-0 bg-white dark:bg-slate-900 py-2">
                    <h3 className="text-sm font-bold text-slate-400 uppercase">Transaction History</h3>
                    <div className="flex gap-4 text-xs font-semibold">
                        <span className="text-red-500">GIVE</span>
                        <span className="text-green-500">GET</span>
                    </div>
                </div>

                <div className="space-y-4">
                    {customer?.transactions?.sort((a: any, b: any) => new Date(b.transaction_date ?? b.transactionDate).getTime() - new Date(a.transaction_date ?? a.transactionDate).getTime()).map((tx: any) => (
                        <div key={tx.id} className="flex gap-3">
                            <div className="flex flex-col items-center">
                                <div className={`w-2 h-2 rounded-full mt-2 ${tx.type === 'GIVE' ? 'bg-red-400' : 'bg-green-400'}`} />
                                <div className="flex-1 w-px bg-slate-100 dark:bg-slate-800 my-1" />
                            </div>
                            <div className="flex-1 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                                <div className="flex justify-between items-start mb-1">
                                    <div className="text-xs text-slate-400 flex items-center gap-1">
                                        <Calendar className="w-3 h-3" />
                                        {new Date(tx.transaction_date ?? tx.transactionDate).toLocaleDateString()}
                                    </div>
                                    <div className={`font-bold ${tx.type === 'GIVE' ? 'text-red-600' : 'text-green-600'}`}>
                                        {tx.type === 'GIVE' ? '-' : '+'} Rs. {Number(tx.amount).toLocaleString()}
                                    </div>
                                </div>
                                {tx.details && (
                                    <div className="text-sm text-slate-600 dark:text-slate-300 flex items-center gap-2">
                                        <FileText className="w-3 h-3 text-slate-400" />
                                        {tx.details}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}

                    {(!customer?.transactions || customer.transactions.length === 0) && (
                        <div className="text-center py-20 text-slate-400">
                            <p>No transactions found for this customer.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Sticky Footer Actions */}
            <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 flex gap-4">
                <button
                    onClick={() => openTxModal('GIVE')}
                    className="flex-1 py-4 px-4 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-bold flex items-center justify-center gap-2 shadow-lg shadow-red-500/20 active:scale-95 transition-all text-lg"
                >
                    GIVE Rs.
                </button>
                <button
                    onClick={() => openTxModal('GET')}
                    className="flex-1 py-4 px-4 rounded-2xl bg-green-600 hover:bg-green-700 text-white font-bold flex items-center justify-center gap-2 shadow-lg shadow-green-500/20 active:scale-95 transition-all text-lg"
                >
                    GET Rs.
                </button>
            </div>

            <AddTransactionModal
                isOpen={isAddTxOpen}
                onClose={() => setIsAddTxOpen(false)}
                customerId={customer?.id}
                customerName={customer?.name}
                type={txType}
            />
        </div>
    );
}
