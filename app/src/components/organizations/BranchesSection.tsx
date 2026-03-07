import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import toast from '@shared/hooks/useToast';
import {
    Building2, Plus, Trash2, Shield, Search, LayoutGrid,
    List as ListIcon, Settings as SettingsIcon, Loader2, Sparkles,
    MapPin, Banknote, Edit, ArrowRightLeft
} from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { Button, Card, Loading, Progress } from '@shared';
import { formatLimit } from '../../utils/formatLimit';
import BranchDialog from './BranchDialog';

interface BranchesSectionProps {
    organization: any;
    onSwitchOrganization?: (id: string) => void;
    isSwitching?: boolean;
}

export default function BranchesSection({
    organization,
    onSwitchOrganization,
    isSwitching
}: BranchesSectionProps) {
    const { theme } = useTheme();
    const queryClient = useQueryClient();
    const [isBranchModalOpen, setIsBranchModalOpen] = useState(false);
    const [editingBranch, setEditingBranch] = useState<any>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

    const { data: branches, isLoading } = useQuery({
        queryKey: ['organization-branches'],
        queryFn: async () => {
            const response = await api.get('/organizations/me/branches');
            return response.data;
        },
    });

    const deleteBranchMutation = useMutation({
        mutationFn: async (branchId: string) => {
            await api.delete(`/organizations/branches/${branchId}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['organization-branches'] });
            queryClient.invalidateQueries({ queryKey: ['organization-stats'] });
            toast.success('Branch deleted successfully');
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Failed to delete branch');
        },
    });

    const filteredBranches = branches?.filter((b: any) =>
        b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.email?.toLowerCase().includes(searchQuery.toLowerCase())
    ) || [];

    if (isLoading) return <Loading />;

    const branchLimit = organization.branch_limit || organization.package?.base_branch_limit || 1;
    const currentBranchCount = branches?.length || 0;
    const isAtLimit = currentBranchCount >= branchLimit;

    return (
        <div className="space-y-6 animate-fadeIn">
            {/* Header & Stats */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div
                    className="p-6 rounded-2xl border flex flex-col justify-between relative overflow-hidden shadow-lg group transition-all duration-500 hover:shadow-primary/10"
                    style={{
                        background: `linear-gradient(135deg, ${theme.colors.surface}, ${theme.colors.surface}cc)`,
                        borderColor: `${theme.colors.border}40`
                    }}
                >
                    {/* Decorative Background Element */}
                    <div className="absolute -right-4 -top-4 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity duration-700">
                        <Building2 size={120} />
                    </div>

                    <div className="flex items-center justify-between mb-6 z-10">
                        <div className="space-y-1">
                            <span className="text-[10px] font-bold uppercase tracking-[0.1em]" style={{ color: theme.colors.primary }}>Network</span>
                            <h3 className="text-sm font-semibold opacity-60" style={{ color: theme.colors.textSecondary }}>Branch Utilization</h3>
                        </div>
                        <div className="p-2.5 rounded-xl bg-primary/10 backdrop-blur-md border border-primary/20">
                            <Building2 className="h-5 w-5" style={{ color: theme.colors.primary }} />
                        </div>
                    </div>

                    <div className="z-10 space-y-4">
                        <div className="flex items-baseline gap-2">
                            <span className="text-4xl font-bold tracking-tight" style={{ color: theme.colors.text }}>{currentBranchCount}</span>
                            <span className="text-xs font-semibold opacity-40 uppercase tracking-wider" style={{ color: theme.colors.textSecondary }}>/ {formatLimit(branchLimit)} Units</span>
                        </div>

                        <div className="space-y-3">
                            <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider opacity-60">
                                <span>Capacity utilization</span>
                                <span>{Math.round((currentBranchCount / branchLimit) * 100)}%</span>
                            </div>
                            <Progress
                                value={currentBranchCount}
                                max={branchLimit}
                                smartColor
                                size="lg"
                                className="shadow-inner"
                            />
                        </div>
                    </div>
                </div>

                <div
                    className="lg:col-span-2 p-8 rounded-2xl border flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden shadow-lg"
                    style={{
                        background: `linear-gradient(to bottom right, ${theme.colors.surface}, ${theme.colors.background}90)`,
                        borderColor: `${theme.colors.border}40`
                    }}
                >
                    {/* Animated background sparks */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 animate-pulse" />

                    <div className="space-y-3 z-10">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-2xl shadow-inner" style={{ backgroundColor: theme.colors.primary }}>
                                <Sparkles className="h-6 w-6 text-white" />
                            </div>
                            <h3 className="text-2xl font-bold tracking-tight" style={{ color: theme.colors.text }}>Expand Your Network</h3>
                        </div>
                        <p className="text-sm font-medium leading-relaxed max-w-xl opacity-70" style={{ color: theme.colors.textSecondary }}>
                            Grow your presence across regions. Add new branch units with specific regional settings,
                            synchronized inventory, and localized compliance controls.
                        </p>
                    </div>

                    <Button
                        variant="primary"
                        className="relative z-10 px-8 rounded-2xl shadow-xl hover:shadow-primary/20 font-bold text-sm h-14 group transition-all duration-300"
                        onClick={() => {
                            setEditingBranch(null);
                            setIsBranchModalOpen(true);
                        }}
                        disabled={isAtLimit}
                    >
                        <Plus className="h-5 w-5 mr-2 transition-transform duration-300 group-hover:rotate-90" />
                        Create New Branch
                    </Button>
                </div>
            </div>

            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-surface/50 p-2 rounded-2xl border border-border/20 backdrop-blur-md shadow-sm">
                <div className="relative w-full sm:max-w-md group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors group-focus-within:text-primary" style={{ color: theme.colors.textSecondary }} />
                    <input
                        type="text"
                        placeholder="Search branches..."
                        className="w-full pl-12 pr-4 py-3 rounded-xl border focus:ring-4 ring-primary/10 outline-none transition-all text-sm font-semibold"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{
                            backgroundColor: `${theme.colors.background}80`,
                            borderColor: `${theme.colors.border}40`,
                            color: theme.colors.text
                        }}
                    />
                </div>

                <div className="flex items-center gap-1 p-1 rounded-xl border" style={{ backgroundColor: `${theme.colors.background}cc`, borderColor: `${theme.colors.border}20` }}>
                    <button
                        onClick={() => setViewMode('grid')}
                        className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 font-bold text-[10px] uppercase tracking-wider ${viewMode === 'grid' ? 'shadow-lg scale-[1.02]' : 'opacity-40 hover:opacity-100'}`}
                        style={{
                            backgroundColor: viewMode === 'grid' ? theme.colors.surface : 'transparent',
                            color: viewMode === 'grid' ? theme.colors.primary : theme.colors.textSecondary,
                            border: viewMode === 'grid' ? `1px solid ${theme.colors.border}20` : 'none'
                        }}
                    >
                        <LayoutGrid className="h-4 w-4" />
                        Grid
                    </button>
                    <button
                        onClick={() => setViewMode('list')}
                        className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 font-bold text-[10px] uppercase tracking-wider ${viewMode === 'list' ? 'shadow-lg scale-[1.02]' : 'opacity-40 hover:opacity-100'}`}
                        style={{
                            backgroundColor: viewMode === 'list' ? theme.colors.surface : 'transparent',
                            color: viewMode === 'list' ? theme.colors.primary : theme.colors.textSecondary,
                            border: viewMode === 'list' ? `1px solid ${theme.colors.border}20` : 'none'
                        }}
                    >
                        <ListIcon className="h-4 w-4" />
                        List
                    </button>
                </div>
            </div>

            {filteredBranches.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-20 rounded-2xl border border-dashed border-border/20 bg-surface/30 backdrop-blur-sm">
                    <div className="p-6 rounded-3xl bg-background/50 border mb-6 shadow-xl">
                        <Building2 className="h-12 w-12 opacity-10" />
                    </div>
                    <h3 className="text-2xl font-bold mb-2 tracking-tight" style={{ color: theme.colors.text }}>No branches found</h3>
                    <p className="text-sm font-medium opacity-60 mb-8 max-w-sm text-center" style={{ color: theme.colors.textSecondary }}>
                        {searchQuery ? `No matches found for "${searchQuery}".` : "Your branch list is currently empty."}
                    </p>
                    {searchQuery ? (
                        <Button variant="ghost" className="font-bold text-[10px] uppercase tracking-wider rounded-xl px-10" onClick={() => setSearchQuery('')}>
                            Reset Search
                        </Button>
                    ) : (
                        <Button variant="primary" className="px-12 rounded-2xl font-bold text-sm h-14 shadow-xl" onClick={() => setIsBranchModalOpen(true)}>
                            <Plus className="h-5 w-5 mr-3" /> Create First Branch
                        </Button>
                    )}
                </div>
            ) : viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {filteredBranches.map((branch: any) => (
                        <Card
                            key={branch.id}
                            className="group transition-all duration-500 hover:shadow-2xl hover:-translate-y-2 relative rounded-3xl p-0 border-2 overflow-hidden flex flex-col items-center text-center"
                            style={{
                                backgroundColor: theme.colors.surface,
                                borderColor: branch.org_type === 'MAIN' ? `${theme.colors.primary}40` : `${theme.colors.border}40`,
                                boxShadow: branch.org_type === 'MAIN' ? `0 20px 40px -20px ${theme.colors.primary}30` : 'none'
                            }}
                        >
                            {/* Status Badge - Floating Corner */}
                            <div className="absolute top-4 right-4 z-20">
                                <div className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider border backdrop-blur-md shadow-sm`}
                                    style={{
                                        borderColor: branch.status === 'active' ? `${theme.colors.success}4d` : `${theme.colors.border}66`,
                                        color: branch.status === 'active' ? theme.colors.success : theme.colors.textSecondary,
                                        backgroundColor: branch.status === 'active' ? `${theme.colors.success}1a` : 'rgba(255,255,255,0.05)'
                                    }}
                                >
                                    <div className="flex items-center gap-1.5">
                                        <div className={`w-1.5 h-1.5 rounded-full animate-pulse`}
                                            style={{ backgroundColor: branch.status === 'active' ? theme.colors.success : theme.colors.textSecondary }}
                                        />
                                        {branch.status}
                                    </div>
                                </div>
                            </div>

                            {/* Card Content Area */}
                            <div className="p-8 pt-12 flex flex-col items-center w-full space-y-6 flex-1">
                                {/* Centered Icon Hub */}
                                <div className="relative">
                                    <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full transform group-hover:scale-150 transition-transform duration-700" />
                                    <div className={`relative p-5 rounded-2xl shadow-lg transform transition-all duration-700 group-hover:rotate-[360deg] ${branch.org_type === 'MAIN'
                                        ? 'bg-gradient-to-br from-indigo-500/90 to-blue-600/90'
                                        : 'bg-gradient-to-br from-primary/90 to-primary-dark/90'
                                        }`}
                                        style={{
                                            backgroundColor: branch.org_type === 'MAIN' ? undefined : theme.colors.primary,
                                            color: 'white',
                                            boxShadow: `0 10px 20px -5px ${branch.org_type === 'MAIN' ? '#4f46e5' : theme.colors.primary}40`
                                        }}>
                                        {branch.org_type === 'MAIN' ? <Shield size={28} /> : <Building2 size={28} />}
                                    </div>

                                    {branch.org_type === 'MAIN' && (
                                        <div className="absolute -bottom-2 -right-2 bg-white p-1 rounded-full shadow-lg border-2 border-indigo-500">
                                            <Sparkles size={12} className="text-indigo-600" />
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <div className="flex flex-col items-center">
                                        {branch.org_type === 'MAIN' && (
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-500 mb-1">Corporate HQ</span>
                                        )}
                                        <h4 className="font-bold text-lg tracking-tight leading-tight group-hover:text-primary transition-colors" style={{ color: theme.colors.text }}>
                                            {branch.name}
                                        </h4>
                                    </div>

                                    <div className="flex items-center justify-center gap-4 text-[11px] font-semibold opacity-50 uppercase tracking-wider" style={{ color: theme.colors.textSecondary }}>
                                        <div className="flex items-center gap-1.5 bg-background/50 px-3 py-1 rounded-lg border border-border/5">
                                            <MapPin size={12} className="text-primary" />
                                            {branch.city || 'Global'}
                                        </div>
                                        <div className="flex items-center gap-1.5 bg-background/50 px-3 py-1 rounded-lg border border-border/5">
                                            <Banknote size={12} className="text-primary" />
                                            {branch.currency}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Action Footer */}
                            <div className="w-full p-4 grid grid-cols-2 gap-3 bg-background/30 backdrop-blur-sm border-t border-border/10">
                                <Button
                                    variant="primary"
                                    className="rounded-xl h-12 font-bold text-xs tracking-wider uppercase group/btn overflow-hidden"
                                    onClick={() => onSwitchOrganization?.(branch.id)}
                                    disabled={isSwitching}
                                >
                                    {isSwitching ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <span className="flex items-center gap-2">
                                            Switch <ArrowRightLeft className="h-3.5 w-3.5 group-hover/btn:translate-x-1 transition-transform" />
                                        </span>
                                    )}
                                </Button>

                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        className="flex-1 rounded-xl h-12 flex items-center justify-center transition-all hover:border-primary/50 group/settings"
                                        onClick={() => {
                                            setEditingBranch(branch);
                                            setIsBranchModalOpen(true);
                                        }}
                                        style={{ backgroundColor: `${theme.colors.surface}cc`, borderColor: `${theme.colors.border}40` }}
                                    >
                                        <SettingsIcon className="h-5 w-5 opacity-40 group-hover/settings:opacity-100 group-hover/settings:rotate-90 transition-all" style={{ color: theme.colors.textSecondary }} />
                                    </Button>

                                    {branch.org_type !== 'MAIN' && (
                                        <Button
                                            variant="ghost"
                                            className="flex-1 rounded-xl h-12 flex items-center justify-center transition-all bg-error/5 hover:bg-error/10 text-error border border-error/10"
                                            onClick={() => {
                                                if (window.confirm(`Delete branch "${branch.name}"?`)) {
                                                    deleteBranchMutation.mutate(branch.id);
                                                }
                                            }}
                                        >
                                            <Trash2 className="h-5 w-5" />
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            ) : (
                <div className="rounded-[2rem] border-2 border-border/40 overflow-hidden shadow-2xl" style={{ backgroundColor: theme.colors.surface }}>
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b" style={{ backgroundColor: `${theme.colors.background}80`, borderColor: `${theme.colors.border}20` }}>
                                <th className="px-8 py-4 text-[10px] font-bold uppercase tracking-wider opacity-50">Branch Identity</th>
                                <th className="px-8 py-4 text-[10px] font-bold uppercase tracking-wider opacity-50">Region</th>
                                <th className="px-8 py-4 text-[10px] font-bold uppercase tracking-wider opacity-50">Status</th>
                                <th className="px-8 py-4 text-[10px] font-bold uppercase tracking-wider opacity-50 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y-2" style={{ borderColor: `${theme.colors.border}10` }}>
                            {filteredBranches.map((branch: any) => (
                                <tr key={branch.id} className="group transition-all duration-300 hover:bg-primary/[0.02]"
                                >
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-5">
                                            <div className="p-3.5 rounded-2xl shadow-lg transform transition-transform group-hover:scale-110"
                                                style={{
                                                    backgroundColor: branch.org_type === 'MAIN' ? 'rgba(99, 102, 241, 0.15)' : `${theme.colors.primary}15`,
                                                    color: branch.org_type === 'MAIN' ? '#6366f1' : theme.colors.primary,
                                                    border: `1px solid ${branch.org_type === 'MAIN' ? '#6366f130' : theme.colors.primary + '30'}`
                                                }}
                                            >
                                                {branch.org_type === 'MAIN' ? <Shield size={24} strokeWidth={2.5} /> : <Building2 size={24} strokeWidth={2.5} />}
                                            </div>
                                            <div>
                                                <p className="font-bold text-sm tracking-tight" style={{ color: theme.colors.text }}>{branch.name}</p>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    {branch.org_type === 'MAIN' && <span className="text-[9px] font-bold uppercase tracking-wider text-indigo-500 bg-indigo-500/10 px-2 py-0.5 rounded-full">Root</span>}
                                                    <p className="text-[10px] opacity-40 uppercase font-semibold tracking-wider" style={{ color: theme.colors.textSecondary }}>{branch.currency} Economy</p>
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-3 text-sm font-semibold opacity-60 group-hover:opacity-100 transition-opacity" style={{ color: theme.colors.textSecondary }}>
                                            <div className="p-1.5 rounded-lg bg-background">
                                                <MapPin size={14} className="text-primary" />
                                            </div>
                                            {branch.city || 'Global'}
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider border-2 shadow-sm`}
                                            style={{
                                                borderColor: branch.status === 'active' ? `${theme.colors.success}40` : `${theme.colors.border}40`,
                                                color: branch.status === 'active' ? theme.colors.success : theme.colors.textSecondary,
                                                backgroundColor: branch.status === 'active' ? `${theme.colors.success}10` : 'rgba(255,255,255,0.02)'
                                            }}
                                        >
                                            <div className={`w-2 h-2 rounded-full ${branch.status === 'active' ? 'animate-pulse' : ''}`}
                                                style={{
                                                    backgroundColor: branch.status === 'active' ? theme.colors.success : theme.colors.textSecondary,
                                                    boxShadow: branch.status === 'active' ? `0 0 8px ${theme.colors.success}80` : 'none'
                                                }}
                                            />
                                            {branch.status}
                                        </div>
                                    </td>
                                    <td className="px-8 py-6 text-right">
                                        <div className="flex items-center justify-end gap-3">
                                            <Button
                                                variant="primary"
                                                size="sm"
                                                className="h-10 px-5 rounded-xl font-bold text-[10px] uppercase tracking-wider shadow-lg hover:shadow-primary/20"
                                                onClick={() => onSwitchOrganization?.(branch.id)}
                                                disabled={isSwitching}
                                            >
                                                {isSwitching ? <Loader2 size={16} className="animate-spin" /> : <span className="flex items-center gap-2">Switch <ArrowRightLeft size={14} /></span>}
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="h-10 w-10 p-0 rounded-xl transition-all"
                                                style={{ color: theme.colors.textSecondary, borderColor: `${theme.colors.border}40`, backgroundColor: `${theme.colors.background}cc` }}
                                                onClick={() => {
                                                    setEditingBranch(branch);
                                                    setIsBranchModalOpen(true);
                                                }}
                                                title="Settings"
                                            >
                                                <Edit size={18} />
                                            </Button>

                                            {branch.org_type !== 'MAIN' && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-10 w-10 p-0 rounded-xl transition-all hover:bg-error/10 text-error"
                                                    onClick={() => {
                                                        if (window.confirm(`Delete branch "${branch.name}"?`)) {
                                                            deleteBranchMutation.mutate(branch.id);
                                                        }
                                                    }}
                                                    title="Delete Branch"
                                                >
                                                    <Trash2 size={18} />
                                                </Button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Modals */}
            <BranchDialog
                isOpen={isBranchModalOpen}
                onClose={() => {
                    setIsBranchModalOpen(false);
                    setEditingBranch(null);
                }}
                organization={organization}
                branch={editingBranch}
            />
        </div>
    );
}
