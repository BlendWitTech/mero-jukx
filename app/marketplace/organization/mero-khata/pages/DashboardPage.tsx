import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '@/services/api';
import { useTheme } from '@/contexts/ThemeContext';
import {
    Users,
    ArrowUpCircle,
    ArrowDownCircle,
    Search,
    UserPlus,
    MessageSquare,
    Landmark
} from 'lucide-react';
import AddCustomerModal from '../components/AddCustomerModal';
import AddTransactionModal from '../components/AddTransactionModal';

interface DashboardPageProps {
    appSlug: string;
}

export default function DashboardPage({ appSlug }: DashboardPageProps) {
    const { theme } = useTheme();
    const navigate = useNavigate();
    const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
    const [isAddTxOpen, setIsAddTxOpen] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
    const [txType, setTxType] = useState<'GIVE' | 'GET'>('GIVE');

    const { data: stats, isLoading: statsLoading } = useQuery({
        queryKey: ['khata-stats'],
        queryFn: async () => {
            const response = await api.get('/khata/stats');
            return response.data;
        }
    });

    const { data: customers, isLoading: customersLoading } = useQuery({
        queryKey: ['khata-customers'],
        queryFn: async () => {
            const response = await api.get('/khata/customers');
            return response.data;
        }
    });

    const openTxModal = (customer: any, type: 'GIVE' | 'GET') => {
        setSelectedCustomer(customer);
        setTxType(type);
        setIsAddTxOpen(true);
    };

    if (statsLoading || customersLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: theme.colors.primary }}></div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full overflow-hidden bg-slate-50 dark:bg-slate-900">
            {/* Header / Summary Section */}
            <div className="p-4 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-xl font-bold text-slate-900 dark:text-white">Mero Khata</h1>
                    <button
                        onClick={() => setIsAddCustomerOpen(true)}
                        className="p-2 rounded-lg text-white shadow-lg flex items-center gap-2 px-4"
                        style={{ backgroundColor: theme.colors.primary }}
                    >
                        <UserPlus className="w-5 h-5" />
                        <span className="font-semibold text-sm">Add Customer</span>
                    </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800">
                        <div className="flex items-center gap-2 text-red-600 dark:text-red-400 mb-1">
                            <ArrowUpCircle className="w-4 h-4" />
                            <span className="text-sm font-medium">You Give</span>
                        </div>
                        <div className="text-xl font-bold text-red-700 dark:text-red-300">
                            Rs. {stats?.totalYouGive?.toLocaleString() || 0}
                        </div>
                    </div>

                    <div className="p-4 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800">
                        <div className="flex items-center gap-2 text-green-600 dark:text-green-400 mb-1">
                            <ArrowDownCircle className="w-4 h-4" />
                            <span className="text-sm font-medium">You Get</span>
                        </div>
                        <div className="text-xl font-bold text-green-700 dark:text-green-300">
                            Rs. {stats?.totalYouGet?.toLocaleString() || 0}
                        </div>
                    </div>
                </div>
            </div>

            {/* Search & List Section */}
            <div className="flex-1 overflow-auto p-4 space-y-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search customers..."
                        className="w-full pl-10 pr-4 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                </div>

                <div className="space-y-3">
                    {customers?.map((customer: any) => (
                        <div
                            key={customer.id}
                            className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm transition-all"
                        >
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center font-bold text-slate-600 dark:text-slate-300">
                                        {customer.name.charAt(0)}
                                    </div>
                                    <div>
                                        <div className="font-semibold text-slate-900 dark:text-white">{customer.name}</div>
                                        <div className="text-xs text-slate-500">{customer.phone}</div>
                                    </div>
                                </div>

                                <div className="text-right">
                                    <div className={`font-bold ${Number(customer.currentBalance) >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                                        Rs. {Math.abs(Number(customer.currentBalance)).toLocaleString()}
                                    </div>
                                    <div className="text-[10px] text-slate-400 uppercase font-medium">
                                        {Number(customer.currentBalance) >= 0 ? 'Due' : 'Advance'}
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <button
                                    onClick={() => openTxModal(customer, 'GIVE')}
                                    className="flex-1 py-2 px-3 rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 text-sm font-bold active:scale-95 transition-transform"
                                >
                                    GIVE
                                </button>
                                <button
                                    onClick={() => openTxModal(customer, 'GET')}
                                    className="flex-1 py-2 px-3 rounded-lg border border-green-200 bg-green-50 dark:bg-green-900/10 text-green-600 dark:text-green-400 text-sm font-bold active:scale-95 transition-transform"
                                >
                                    GET
                                </button>
                            </div>
                        </div>
                    ))}

                    {customers?.length === 0 && (
                        <div className="text-center py-12">
                            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
                                <Users className="w-8 h-8" />
                            </div>
                            <h3 className="text-slate-900 dark:text-white font-medium">No customers yet</h3>
                            <p className="text-slate-500 text-sm">Add your first customer to start tracking Udhar</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Bottom Action Bar (Fixed) */}
            <div className="p-4 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex gap-3">
                <button
                    onClick={() => navigate('bank-reconciliation')}
                    className="flex-1 py-3 px-4 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold flex items-center justify-center gap-2"
                >
                    <Landmark className="w-5 h-5" />
                    Reconcile
                </button>
                <button className="flex-1 py-3 px-4 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold flex items-center justify-center gap-2">
                    <MessageSquare className="w-5 h-5" />
                    Reminders
                </button>
            </div>

            <AddCustomerModal
                isOpen={isAddCustomerOpen}
                onClose={() => setIsAddCustomerOpen(false)}
            />

            <AddTransactionModal
                isOpen={isAddTxOpen}
                onClose={() => setIsAddTxOpen(false)}
                customerId={selectedCustomer?.id}
                customerName={selectedCustomer?.name}
                type={txType}
            />
        </div>
    );
}
