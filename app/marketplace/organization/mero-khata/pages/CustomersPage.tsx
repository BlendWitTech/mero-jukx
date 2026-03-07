import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/services/api';
import { useTheme } from '@/contexts/ThemeContext';
import { Users, ArrowUpCircle, ArrowDownCircle, Search, UserPlus } from 'lucide-react';
import AddCustomerModal from '../components/AddCustomerModal';
import AddTransactionModal from '../components/AddTransactionModal';

export default function CustomersPage() {
    const { theme } = useTheme();
    const navigate = useNavigate();
    const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
    const [isAddTxOpen, setIsAddTxOpen] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
    const [txType, setTxType] = useState<'GIVE' | 'GET'>('GIVE');
    const [search, setSearch] = useState('');

    const { data: customers = [], isLoading } = useQuery({
        queryKey: ['khata-customers'],
        queryFn: async () => {
            const response = await api.get('/khata/customers');
            return response.data;
        },
    });

    const openTxModal = (customer: any, type: 'GIVE' | 'GET') => {
        setSelectedCustomer(customer);
        setTxType(type);
        setIsAddTxOpen(true);
    };

    const filtered = customers.filter((c: any) =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.phone?.includes(search)
    );

    return (
        <div className="p-6 max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                        <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold" style={{ color: theme.colors.text }}>Customers</h1>
                        <p className="text-sm" style={{ color: theme.colors.textSecondary }}>Manage Udhar (credit) accounts</p>
                    </div>
                </div>
                <button
                    onClick={() => setIsAddCustomerOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-white font-semibold text-sm"
                    style={{ backgroundColor: theme.colors.primary }}
                >
                    <UserPlus className="w-4 h-4" />
                    Add Customer
                </button>
            </div>

            {/* Search */}
            <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: theme.colors.textSecondary }} />
                <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search customers..."
                    className="w-full pl-10 pr-4 py-2 rounded-lg border text-sm"
                    style={{ borderColor: theme.colors.border, backgroundColor: theme.colors.surface, color: theme.colors.text }}
                />
            </div>

            {isLoading ? (
                <div className="text-center py-12" style={{ color: theme.colors.textSecondary }}>Loading customers...</div>
            ) : filtered.length === 0 ? (
                <div className="text-center py-16 rounded-xl border" style={{ borderColor: theme.colors.border }}>
                    <Users className="w-12 h-12 mx-auto mb-3 opacity-30" style={{ color: theme.colors.textSecondary }} />
                    <p className="font-medium" style={{ color: theme.colors.text }}>
                        {search ? 'No customers match your search' : 'No customers yet'}
                    </p>
                    <p className="text-sm mt-1" style={{ color: theme.colors.textSecondary }}>
                        Add your first customer to start tracking Udhar
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filtered.map((customer: any) => (
                        <div
                            key={customer.id}
                            className="rounded-xl border p-4"
                            style={{ borderColor: theme.colors.border, backgroundColor: theme.colors.surface }}
                        >
                            <div className="flex items-center justify-between mb-3">
                                <div
                                    className="flex items-center gap-3 cursor-pointer"
                                    onClick={() => navigate(`customers/${customer.id}`)}
                                >
                                    <div
                                        className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white"
                                        style={{ backgroundColor: theme.colors.primary }}
                                    >
                                        {customer.name.charAt(0)}
                                    </div>
                                    <div>
                                        <div className="font-semibold text-sm" style={{ color: theme.colors.text }}>{customer.name}</div>
                                        <div className="text-xs" style={{ color: theme.colors.textSecondary }}>{customer.phone}</div>
                                    </div>
                                </div>

                                <div className="text-right">
                                    <div className={`font-bold ${Number(customer.currentBalance) >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                                        Rs. {Math.abs(Number(customer.currentBalance)).toLocaleString()}
                                    </div>
                                    <div className="text-xs font-medium uppercase" style={{ color: theme.colors.textSecondary }}>
                                        {Number(customer.currentBalance) >= 0 ? 'Due' : 'Advance'}
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <button
                                    onClick={() => openTxModal(customer, 'GIVE')}
                                    className="flex-1 py-2 px-3 rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 text-sm font-bold flex items-center justify-center gap-1"
                                >
                                    <ArrowUpCircle className="w-3.5 h-3.5" />
                                    GIVE
                                </button>
                                <button
                                    onClick={() => openTxModal(customer, 'GET')}
                                    className="flex-1 py-2 px-3 rounded-lg border border-green-200 bg-green-50 dark:bg-green-900/10 text-green-600 dark:text-green-400 text-sm font-bold flex items-center justify-center gap-1"
                                >
                                    <ArrowDownCircle className="w-3.5 h-3.5" />
                                    GET
                                </button>
                                <button
                                    onClick={() => navigate(`customers/${customer.id}`)}
                                    className="px-3 py-2 rounded-lg border text-sm font-medium"
                                    style={{ borderColor: theme.colors.border, color: theme.colors.textSecondary }}
                                >
                                    View
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

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
