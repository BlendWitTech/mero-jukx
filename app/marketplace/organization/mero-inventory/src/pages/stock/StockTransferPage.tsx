import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Send, CheckCircle2, AlertTriangle, Package, Warehouse, Info } from 'lucide-react';
import { useTheme } from '@frontend/contexts/ThemeContext';
import { Card } from '@shared/frontend/components/ui/Card';
import { Button } from '@shared/frontend/components/ui/Button';
import { Input } from '@shared/frontend/components/ui/Input';
import api from '@frontend/services/api';
import toast from '@shared/frontend/hooks/useToast';
import { useAppContext } from '../../contexts/AppContext';

interface TransferFormData {
    productId: string;
    fromWarehouseId: string;
    toWarehouseId: string;
    quantity: number;
    notes: string;
}

export default function StockTransferPage() {
    const { theme } = useTheme();
    const { buildHref } = useAppContext();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<TransferFormData>({
        defaultValues: {
            quantity: 1
        }
    });

    const watchFromWarehouse = watch('fromWarehouseId');
    const watchProduct = watch('productId');

    const { data: products = [] } = useQuery({
        queryKey: ['products'],
        queryFn: async () => {
            const response = await api.get('/inventory/products');
            return response.data;
        }
    });

    const { data: warehouses = [] } = useQuery({
        queryKey: ['warehouses'],
        queryFn: async () => {
            const response = await api.get('/inventory/warehouses');
            return response.data;
        }
    });

    const { data: stockInfo } = useQuery({
        queryKey: ['stock', watchProduct, watchFromWarehouse],
        queryFn: async () => {
            if (!watchProduct || !watchFromWarehouse) return null;
            const response = await api.get(`/inventory/products/${watchProduct}`);
            const stock = response.data.stocks?.find((s: any) => s.warehouseId === watchFromWarehouse);
            return stock || { quantity: 0 };
        },
        enabled: !!watchProduct && !!watchFromWarehouse
    });

    const transferMutation = useMutation({
        mutationFn: async (data: TransferFormData) => {
            await api.post('/inventory/stock/transfer', {
                ...data,
                quantity: Number(data.quantity)
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['products'] });
            queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
            toast.success('Stock transferred successfully');
            navigate(buildHref('/movements'));
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Failed to transfer stock');
        }
    });

    const onSubmit = (data: TransferFormData) => {
        if (data.fromWarehouseId === data.toWarehouseId) {
            toast.error('Source and destination warehouses must be different');
            return;
        }
        if (stockInfo && Number(data.quantity) > Number(stockInfo.quantity)) {
            toast.error('Insufficient stock in source warehouse');
            return;
        }
        transferMutation.mutate(data);
    };

    return (
        <div className="p-8 max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex items-center gap-4">
                <Button variant="ghost" onClick={() => navigate(-1)}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                </Button>
                <h1 className="text-3xl font-bold tracking-tight" style={{ color: theme.colors.text }}>
                    Stock Transfer
                </h1>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-2 space-y-8">
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                        <Card className="p-8 space-y-6 shadow-xl border-none" style={{ backgroundColor: theme.colors.surface, borderRadius: '24px' }}>
                            <div className="space-y-2">
                                <label className="text-xs uppercase font-bold opacity-50 tracking-wider">Select Product</label>
                                <select
                                    {...register('productId', { required: 'Product is required' })}
                                    className="w-full h-12 rounded-xl border px-4 bg-transparent focus:ring-2 focus:ring-primary outline-none transition-all"
                                    style={{ borderColor: theme.colors.border }}
                                >
                                    <option value="">Choose a product...</option>
                                    {products.map((p: any) => (
                                        <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-xs uppercase font-bold opacity-50 tracking-wider">From Warehouse</label>
                                    <select
                                        {...register('fromWarehouseId', { required: 'Source warehouse is required' })}
                                        className="w-full h-12 rounded-xl border px-4 bg-transparent focus:ring-2 focus:ring-primary outline-none transition-all"
                                        style={{ borderColor: theme.colors.border }}
                                    >
                                        <option value="">Select source...</option>
                                        {warehouses.map((w: any) => (
                                            <option key={w.id} value={w.id}>{w.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs uppercase font-bold opacity-50 tracking-wider">To Warehouse</label>
                                    <select
                                        {...register('toWarehouseId', { required: 'Destination warehouse is required' })}
                                        className="w-full h-12 rounded-xl border px-4 bg-transparent focus:ring-2 focus:ring-primary outline-none transition-all"
                                        style={{ borderColor: theme.colors.border }}
                                    >
                                        <option value="">Select destination...</option>
                                        {warehouses.map((w: any) => (
                                            <option key={w.id} value={w.id}>{w.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs uppercase font-bold opacity-50 tracking-wider">Transfer Quantity</label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    {...register('quantity', { required: 'Quantity is required', min: 0.01 })}
                                    error={errors.quantity?.message}
                                    className="h-12 rounded-xl"
                                    placeholder="0.00"
                                />
                                {stockInfo && (
                                    <p className="text-sm font-medium pt-1" style={{ color: Number(stockInfo.quantity) > 0 ? theme.colors.success : theme.colors.error }}>
                                        Current Stock at Source: {stockInfo.quantity}
                                    </p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs uppercase font-bold opacity-50 tracking-wider">Transfer Notes</label>
                                <textarea
                                    {...register('notes', { required: 'Notes are required' })}
                                    className="w-full h-24 rounded-xl border p-4 text-sm focus:ring-2 focus:ring-primary outline-none transition-all"
                                    style={{ backgroundColor: 'transparent', borderColor: theme.colors.border }}
                                    placeholder="Reason for transfer..."
                                />
                            </div>

                            <div className="pt-4">
                                <Button
                                    type="submit"
                                    className="w-full h-14 rounded-2xl bg-primary text-white font-bold text-lg shadow-lg shadow-primary/30 hover:scale-[1.02] active:scale-95 transition-all"
                                    disabled={transferMutation.isPending}
                                >
                                    <Send className="h-5 w-5 mr-3" />
                                    {transferMutation.isPending ? 'Processing Transfer...' : 'Complete Transfer'}
                                </Button>
                            </div>
                        </Card>
                    </form>
                </div>

                <div className="space-y-6">
                    <Card className="p-6 space-y-4 shadow-xl border-none" style={{ backgroundColor: theme.colors.surface, borderRadius: '24px' }}>
                        <h3 className="font-bold flex items-center gap-2">
                            <Info className="h-4 w-4 text-blue-500" />
                            Transfer Guide
                        </h3>
                        <div className="space-y-4 text-sm opacity-80">
                            <div className="flex gap-3">
                                <div className="h-6 w-6 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">1</div>
                                <p>Select the item you want to move between locations.</p>
                            </div>
                            <div className="flex gap-3">
                                <div className="h-6 w-6 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">2</div>
                                <p>Ensure the source warehouse has enough stock for the transfer.</p>
                            </div>
                            <div className="flex gap-3">
                                <div className="h-6 w-6 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">3</div>
                                <p>Movements will be recorded as TRANSFER_OUT and TRANSFER_IN automatically.</p>
                            </div>
                        </div>
                    </Card>

                    <div className="p-8 rounded-3xl bg-amber-500/10 border border-amber-500/20 space-y-3">
                        <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                            <AlertTriangle className="h-5 w-5" />
                            <h3 className="font-bold">Important Notice</h3>
                        </div>
                        <p className="text-sm opacity-90 leading-relaxed">
                            Stock transfers are permanent once processed. Please verify quantities and locations carefully before completing the transfer.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
