import React, { useState } from 'react';
import KhaltiPayment from './KhaltiPayment';
import EsewaPayment from './EsewaPayment';
import { useTheme } from '@/contexts/ThemeContext';
import { CreditCard, Landmark } from 'lucide-react';

interface PaymentSelectorProps {
    amount: number;
    purchaseId: string;
    purchaseName: string;
    onSuccess: (method: string, data?: any) => void;
}

export default function PaymentSelector({ amount, purchaseId, purchaseName, onSuccess }: PaymentSelectorProps) {
    const { theme } = useTheme();
    const [selectedMethod, setSelectedMethod] = useState<'KHALTI' | 'ESEWA' | 'STRIPE' | null>(null);

    return (
        <div className="space-y-6">
            <div className="text-center">
                <div className="text-sm font-medium text-slate-500 uppercase tracking-widest mb-1">Total Amount</div>
                <div className="text-4xl font-black text-slate-900 dark:text-white">
                    Rs. {amount.toLocaleString()}
                </div>
            </div>

            <div className="grid grid-cols-1 gap-3">
                <KhaltiPayment
                    amount={amount}
                    purchaseId={purchaseId}
                    purchaseName={purchaseName}
                    onSuccess={(data) => onSuccess('KHALTI', data)}
                    onError={(err) => console.error(err)}
                />

                <EsewaPayment
                    amount={amount}
                    productId={purchaseId}
                    onSuccess={() => onSuccess('ESEWA')}
                />

                <button
                    className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all active:scale-95"
                >
                    <Landmark className="w-5 h-5" />
                    Bank Transfer / ConnectIPS
                </button>
            </div>

            <div className="relative py-4">
                <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-200 dark:border-slate-700"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white dark:bg-slate-900 px-2 text-slate-500">Global Payments</span>
                </div>
            </div>

            <button
                className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl font-bold bg-[#635BFF] text-white hover:bg-[#5249db] transition-all active:scale-95 shadow-md shadow-purple-500/20"
            >
                <CreditCard className="w-5 h-5" />
                Pay with Credit Card (Stripe)
            </button>
        </div>
    );
}
