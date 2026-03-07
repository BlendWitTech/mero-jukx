import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/services/api';
import { useTheme } from '@/contexts/ThemeContext';
import { Plus, Search, Building2, TrendingDown, Calendar, Hash, Calculator, RefreshCw, Eye, FileText, History } from 'lucide-react';
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
    Modal
} from '@shared';

interface FixedAsset {
    id: string;
    name: string;
    assetCode?: string;
    purchaseDate: string;
    purchaseCost: number;
    bookValue: number;
    status: 'ACTIVE' | 'DISPOSED' | 'FULLY_DEPRECIATED';
    depreciationMethod: 'STRAIGHT_LINE' | 'WDV';
    usefulLifeYears: number;
    assetAccount?: { name: string };
}

interface Account {
    id: string;
    name: string;
    code: string;
    accountType: string;
}

export default function FixedAssetsPage() {
    const { theme } = useTheme();
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState('');
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [formStep, setFormStep] = useState(1);

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        assetCode: '',
        purchaseDate: new Date().toISOString().split('T')[0],
        purchaseCost: 0,
        usefulLifeYears: 5,
        depreciationMethod: 'STRAIGHT_LINE',
        salvageValue: 0,
        depreciationRate: 0,
        assetAccountId: '',
        depreciationExpenseAccountId: '',
        accumulatedDepreciationAccountId: ''
    });

    const { data: accounts } = useQuery<Account[]>({
        queryKey: ['accounting-accounts'],
        queryFn: async () => {
            const response = await api.get('/accounting/accounts');
            return response.data;
        }
    });

    const { data: assets, isLoading } = useQuery<FixedAsset[]>({
        queryKey: ['accounting-fixed-assets'],
        queryFn: async () => {
            const response = await api.get('/accounting/fixed-assets');
            return response.data;
        }
    });

    const createAsset = useMutation({
        mutationFn: async (data: typeof formData) => {
            await api.post('/accounting/fixed-assets', data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['accounting-fixed-assets'] });
            setIsAddDialogOpen(false);
            setFormData({
                name: '',
                assetCode: '',
                purchaseDate: new Date().toISOString().split('T')[0],
                purchaseCost: 0,
                usefulLifeYears: 5,
                depreciationMethod: 'STRAIGHT_LINE',
                salvageValue: 0,
                depreciationRate: 0,
                assetAccountId: '',
                depreciationExpenseAccountId: '',
                accumulatedDepreciationAccountId: ''
            });
            toast.success('Asset registered successfully');
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Failed to register asset');
        }
    });

    const runDepreciationMutation = useMutation({
        mutationFn: async (id: string) => {
            return api.post(`/accounting/fixed-assets/${id}/depreciate`, {
                date: new Date().toISOString()
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['accounting-fixed-assets'] });
            toast.success('Depreciation run successfully!');
        },
        onError: () => toast.error('Failed to run depreciation')
    });

    const filteredAssets = assets?.filter(a =>
        a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.assetCode?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'ACTIVE': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
            case 'FULLY_DEPRECIATED': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
            case 'DISPOSED': return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400';
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
                        <Building2 className="h-8 w-8" style={{ color: theme.colors.primary }} />
                    </div>
                    <div>
                        <h1 className="text-4xl font-extrabold tracking-tight" style={{ color: theme.colors.text }}>
                            Fixed Assets
                        </h1>
                        <p className="opacity-70" style={{ color: theme.colors.textSecondary }}>
                            Track company assets and manage depreciation schedules
                        </p>
                    </div>
                </div>
                <Button
                    onClick={() => setIsAddDialogOpen(true)}
                    variant="primary"
                    className="shadow-lg shadow-primary/20 scale-105 active:scale-95 transition-transform px-6 h-12 rounded-xl"
                >
                    <Plus className="h-5 w-5 mr-2" />
                    Register Asset
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
                            placeholder="Search assets by name or code..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-12 h-12 bg-transparent border-none focus:ring-2 focus:ring-primary/20 text-lg transition-all"
                            style={{ borderRadius: '12px' }}
                        />
                    </div>
                    <div className="flex gap-4">
                        <div className="px-6 py-3 rounded-xl bg-primary/5 border border-primary/10 flex items-center gap-3">
                            <Calculator className="h-5 w-5 text-primary" style={{ color: theme.colors.primary }} />
                            <div>
                                <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest leading-tight">Total Book Value</p>
                                <p className="text-lg font-extrabold text-slate-900 dark:text-white leading-tight">
                                    {formatNPR(assets?.reduce((acc, a) => acc + Number(a.bookValue), 0) || 0)}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </Card>

            <Card className="overflow-hidden border-none shadow-sm" style={{ backgroundColor: theme.colors.surface, borderRadius: '16px' }}>
                <Table>
                    <TableHeader>
                        <TableRow style={{ borderBottom: `1px solid ${theme.colors.border}` }}>
                            <TableHead className="px-6 py-4 text-xs font-extrabold text-slate-400 uppercase tracking-wider">Asset Info</TableHead>
                            <TableHead className="px-6 py-4 text-xs font-extrabold text-slate-400 uppercase tracking-wider">Purchase Details</TableHead>
                            <TableHead className="px-6 py-4 text-xs font-extrabold text-slate-400 uppercase tracking-wider">Depreciation</TableHead>
                            <TableHead className="px-6 py-4 text-xs font-extrabold text-slate-400 uppercase tracking-wider text-right">Book Value</TableHead>
                            <TableHead className="px-6 py-4 text-xs font-extrabold text-slate-400 uppercase tracking-wider">Status</TableHead>
                            <TableHead className="px-6 py-4 text-xs font-extrabold text-slate-400 uppercase tracking-wider text-center">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredAssets?.map((asset) => (
                            <TableRow key={asset.id} className="hover-theme transition-colors group" style={{ borderBottom: `1px solid ${theme.colors.border}` }}>
                                <TableCell className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center" style={{ backgroundColor: `${theme.colors.primary}15` }}>
                                            <Building2 className="h-5 w-5" style={{ color: theme.colors.primary }} />
                                        </div>
                                        <div>
                                            <div className="font-extrabold text-slate-900 dark:text-white capitalize">{asset.name}</div>
                                            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{asset.assetCode || 'NO CODE'}</div>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell className="px-6 py-4 whitespace-nowrap">
                                    <div className="space-y-1">
                                        <div className="text-sm text-slate-700 dark:text-slate-300 font-bold">
                                            {formatNPR(asset.purchaseCost)}
                                        </div>
                                        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                                            {new Date(asset.purchaseDate).toLocaleDateString()}
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell className="px-6 py-4">
                                    <div className="w-32 space-y-2">
                                        <div className="flex justify-between items-center text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                                            <span>{Math.round((asset.bookValue / asset.purchaseCost) * 100)}%</span>
                                        </div>
                                        <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-primary transition-all duration-500"
                                                style={{
                                                    width: `${(asset.bookValue / asset.purchaseCost) * 100}%`,
                                                    backgroundColor: theme.colors.primary
                                                }}
                                            />
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell className="px-6 py-4 whitespace-nowrap text-right">
                                    <div className="text-lg font-extrabold text-slate-900 dark:text-white">
                                        {formatNPR(asset.bookValue)}
                                    </div>
                                </TableCell>
                                <TableCell className="px-6 py-4 whitespace-nowrap">
                                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-widest ${getStatusStyle(asset.status)}`}>
                                        {asset.status.replace('_', ' ')}
                                    </span>
                                </TableCell>
                                <TableCell className="px-6 py-4 whitespace-nowrap text-center">
                                    <div className="flex justify-center gap-2">
                                        <Button
                                            onClick={() => runDepreciationMutation.mutate(asset.id)}
                                            disabled={asset.status !== 'ACTIVE' || runDepreciationMutation.isPending}
                                            variant="ghost"
                                            size="sm"
                                            className="px-3 py-1.5 rounded-xl bg-primary/10 text-primary text-xs font-extrabold hover:bg-primary hover:text-white"
                                            style={{ color: theme.colors.primary }}
                                        >
                                            <RefreshCw size={14} className={runDepreciationMutation.isPending ? 'animate-spin mr-1' : 'mr-1'} />
                                            Depreciate
                                        </Button>
                                        <button className="p-2 rounded-xl hover-theme-strong text-slate-500 transition-colors">
                                            <Eye size={16} />
                                        </button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
                {filteredAssets?.length === 0 && (
                    <div className="p-12 text-center text-slate-400">
                        <div className="w-16 h-16 bg-slate-100 dark:bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Building2 size={24} />
                        </div>
                        <p className="font-extrabold">No fixed assets registered</p>
                        <p className="text-sm">Start tracking your business equipment, furniture, or property.</p>
                    </div>
                )}
            </Card>

            {/* Register Asset Modal */}
            {/* Register Asset Modal */}
            <Modal
                isOpen={isAddDialogOpen}
                onClose={() => {
                    setIsAddDialogOpen(false);
                    setFormStep(1);
                }}
                title="Register Fixed Asset"
                size="lg"
                theme={{ colors: theme.colors }}
                footer={
                    <div className="flex gap-3 w-full">
                        <Button
                            onClick={() => formStep === 1 ? setIsAddDialogOpen(false) : setFormStep(formStep - 1)}
                            variant="ghost"
                            className="flex-1 px-6 py-3 rounded-xl bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold border border-slate-200 dark:border-slate-700 hover:bg-slate-100"
                        >
                            {formStep === 1 ? 'Cancel' : 'Back'}
                        </Button>
                        {formStep < 3 ? (
                            <Button
                                onClick={() => setFormStep(formStep + 1)}
                                disabled={(formStep === 1 && (!formData.name || !formData.assetCode))}
                                variant="primary"
                                className="flex-1 px-6 py-3 rounded-xl font-bold shadow-lg shadow-primary/20 scale-105 active:scale-95 transition-transform"
                            >
                                Next Step
                            </Button>
                        ) : (
                            <Button
                                onClick={() => createAsset.mutate(formData)}
                                disabled={createAsset.isPending || !formData.purchaseCost || !formData.assetAccountId || !formData.depreciationExpenseAccountId || !formData.accumulatedDepreciationAccountId}
                                variant="primary"
                                className="flex-1 px-6 py-3 rounded-xl font-bold shadow-lg shadow-primary/20 scale-105 active:scale-95 transition-transform"
                                isLoading={createAsset.isPending}
                            >
                                {createAsset.isPending ? 'Registering...' : 'Complete Registration'}
                            </Button>
                        )}
                    </div>
                }
            >
                <div className="p-1 space-y-6 max-h-[75vh] overflow-y-auto custom-scrollbar pr-2">
                    {/* Progress Indicator */}
                    <div className="flex items-center justify-center gap-4 mb-8">
                        {[1, 2, 3].map((s) => (
                            <div key={s} className="flex items-center">
                                <div
                                    className={`w-10 h-10 rounded-full flex items-center justify-center font-extrabold transition-all duration-300 border-2 ${formStep >= s
                                        ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20'
                                        : 'bg-white dark:bg-slate-800 text-slate-300 border-slate-200 dark:border-slate-700'
                                        }`}
                                    style={formStep >= s ? { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary } : {}}
                                >
                                    {s}
                                </div>
                                {s < 3 && (
                                    <div className={`w-12 h-0.5 mx-2 transition-colors duration-300 ${formStep > s ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-700'}`} style={formStep > s ? { backgroundColor: theme.colors.primary } : {}} />
                                )}
                            </div>
                        ))}
                    </div>

                    {formStep === 1 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-1">
                                    <label className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Asset Name</label>
                                    <Input
                                        type="text"
                                        className="h-12 bg-slate-100 dark:bg-slate-900 border-none font-bold placeholder:opacity-50"
                                        placeholder="e.g. MacBook Pro 16"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Asset Code</label>
                                    <Input
                                        type="text"
                                        className="h-12 bg-slate-100 dark:bg-slate-900 border-none font-bold placeholder:opacity-50"
                                        placeholder="e.g. IT-ASSET-001"
                                        value={formData.assetCode}
                                        onChange={(e) => setFormData({ ...formData, assetCode: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10 flex items-start gap-3">
                                <Building2 className="h-5 w-5 mt-0.5" style={{ color: theme.colors.primary }} />
                                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                                    Step 1: Define the core identity of the asset. The code should be unique to your internal inventory system.
                                </p>
                            </div>
                        </div>
                    )}

                    {formStep === 2 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="grid grid-cols-3 gap-6">
                                <div className="space-y-1">
                                    <label className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Purchase Date</label>
                                    <Input
                                        type="date"
                                        className="h-12 bg-slate-100 dark:bg-slate-900 border-none font-bold"
                                        value={formData.purchaseDate}
                                        onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Purchase Cost (NPR)</label>
                                    <Input
                                        type="number"
                                        className="h-12 bg-slate-100 dark:bg-slate-900 border-none font-bold placeholder:opacity-50"
                                        placeholder="0.00"
                                        value={formData.purchaseCost || ''}
                                        onChange={(e) => setFormData({ ...formData, purchaseCost: Number(e.target.value) })}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Salvage Value</label>
                                    <Input
                                        type="number"
                                        className="h-12 bg-slate-100 dark:bg-slate-900 border-none font-bold placeholder:opacity-50"
                                        placeholder="0.00"
                                        value={formData.salvageValue || ''}
                                        onChange={(e) => setFormData({ ...formData, salvageValue: Number(e.target.value) })}
                                    />
                                </div>
                            </div>
                            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/20 flex items-start gap-3">
                                <History className="h-5 w-5 mt-0.5 text-amber-500" />
                                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                                    Step 2: Enter acquisition details. Salvage value is the estimated residual value at the end of its useful life.
                                </p>
                            </div>
                        </div>
                    )}

                    {formStep === 3 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="grid grid-cols-3 gap-6">
                                <div className="space-y-1">
                                    <label className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Method</label>
                                    <select
                                        className="w-full px-4 py-3 h-12 rounded-xl bg-slate-100 dark:bg-slate-900 border-none focus:ring-2 focus:ring-primary/20 text-slate-700 dark:text-slate-300 font-bold cursor-pointer"
                                        value={formData.depreciationMethod}
                                        onChange={(e) => setFormData({ ...formData, depreciationMethod: e.target.value as any })}
                                    >
                                        <option value="STRAIGHT_LINE">Straight Line</option>
                                        <option value="WDV">Reducing Balance (WDV)</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Useful Life (Y)</label>
                                    <Input
                                        type="number"
                                        className="h-12 bg-slate-100 dark:bg-slate-900 border-none font-bold"
                                        value={formData.usefulLifeYears}
                                        onChange={(e) => setFormData({ ...formData, usefulLifeYears: Number(e.target.value) })}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Rate (%)</label>
                                    <Input
                                        type="number"
                                        disabled={formData.depreciationMethod !== 'WDV'}
                                        className="h-12 bg-slate-100 dark:bg-slate-900 border-none font-bold placeholder:opacity-50 disabled:opacity-30"
                                        placeholder="0.00"
                                        value={formData.depreciationRate || ''}
                                        onChange={(e) => setFormData({ ...formData, depreciationRate: Number(e.target.value) })}
                                    />
                                </div>
                            </div>

                            <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                                <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Account Mapping</h4>
                                <div className="grid grid-cols-1 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-tight">Asset Account</label>
                                        <select
                                            className="w-full px-4 py-3 h-12 rounded-xl bg-slate-100 dark:bg-slate-900 border-none focus:ring-2 focus:ring-primary/20 text-slate-700 dark:text-slate-300 font-bold cursor-pointer"
                                            value={formData.assetAccountId}
                                            onChange={(e) => setFormData({ ...formData, assetAccountId: e.target.value })}
                                        >
                                            <option value="">Select Account...</option>
                                            {accounts?.filter(a => a.accountType === 'ASSET').map(a => (
                                                <option key={a.id} value={a.id}>{a.code} - {a.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-tight">Expense Account</label>
                                            <select
                                                className="w-full px-4 py-3 h-12 rounded-xl bg-slate-100 dark:bg-slate-900 border-none focus:ring-2 focus:ring-primary/20 text-slate-700 dark:text-slate-300 font-bold cursor-pointer"
                                                value={formData.depreciationExpenseAccountId}
                                                onChange={(e) => setFormData({ ...formData, depreciationExpenseAccountId: e.target.value })}
                                            >
                                                <option value="">Select Account...</option>
                                                {accounts?.filter(a => a.accountType === 'EXPENSE').map(a => (
                                                    <option key={a.id} value={a.id}>{a.code} - {a.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-tight">Accumulated Dep. Account</label>
                                            <select
                                                className="w-full px-4 py-3 h-12 rounded-xl bg-slate-100 dark:bg-slate-900 border-none focus:ring-2 focus:ring-primary/20 text-slate-700 dark:text-slate-300 font-bold cursor-pointer"
                                                value={formData.accumulatedDepreciationAccountId}
                                                onChange={(e) => setFormData({ ...formData, accumulatedDepreciationAccountId: e.target.value })}
                                            >
                                                <option value="">Select Account...</option>
                                                {accounts?.filter(a => a.accountType === 'ASSET' || a.accountType === 'LIABILITY').map(a => (
                                                    <option key={a.id} value={a.id}>{a.code} - {a.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </Modal>
        </div>
    );
}

