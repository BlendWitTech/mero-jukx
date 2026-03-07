import React, { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api from '../../services/api';
import toast from '@shared/hooks/useToast';
import { Building2, Mail, Phone, MapPin, Globe, Clock, Banknote, Shield, Check, X, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    Button,
    Input,
    Checkbox
} from '@shared';

const branchSchema = z.object({
    name: z.string().min(2, 'Name is required'),
    email: z.string().email('Invalid email').optional().or(z.literal('')),
    phone: z.string().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    country: z.string().optional(),
    currency: z.string().min(1, 'Currency is required'),
    timezone: z.string().min(1, 'Timezone is required'),
    language: z.string().min(1, 'Language is required'),
    app_ids: z.array(z.number()).default([]),
});

type BranchFormData = z.infer<typeof branchSchema>;

interface BranchDialogProps {
    isOpen: boolean;
    onClose: () => void;
    organization: any;
    branch?: any; // If provided, we are in edit mode
}

export default function BranchDialog({ isOpen, onClose, organization, branch }: BranchDialogProps) {
    const { theme } = useTheme();
    const queryClient = useQueryClient();
    const [step, setStep] = useState(1);
    const isEdit = !!branch;

    const { data: orgApps, isLoading: isLoadingApps } = useQuery({
        queryKey: ['my-organization-apps'],
        queryFn: async () => {
            const response = await api.get(`/organizations/${organization.id}/apps`);
            return response.data.filter((app: any) => app.status === 'active');
        },
        enabled: isOpen,
    });

    // For edit mode, we might need to fetch the branch's current app IDs if not provided in 'branch' prop
    const { data: branchApps } = useQuery({
        queryKey: ['branch-apps', branch?.id],
        queryFn: async () => {
            const response = await api.get(`/organizations/${branch.id}/apps`);
            return response.data;
        },
        enabled: isOpen && isEdit && !!branch?.id,
    });

    const {
        register,
        handleSubmit,
        setValue,
        watch,
        formState: { errors },
        reset
    } = useForm<BranchFormData>({
        resolver: zodResolver(branchSchema),
        defaultValues: {
            currency: organization?.currency || 'USD',
            timezone: organization?.timezone || 'Asia/Kathmandu',
            language: organization?.language || 'en',
            app_ids: [],
        },
    });

    useEffect(() => {
        if (isOpen && branch) {
            reset({
                name: branch.name,
                email: branch.email || '',
                phone: branch.phone || '',
                address: branch.address || '',
                city: branch.city || '',
                state: branch.state || '',
                country: branch.country || '',
                currency: branch.currency || organization?.currency || 'USD',
                timezone: branch.timezone || organization?.timezone || 'Asia/Kathmandu',
                language: branch.language || organization?.language || 'en',
                app_ids: branch.app_ids || [],
            });

            if (branchApps) {
                const appIds = branchApps.map((ba: any) => ba.app_id);
                setValue('app_ids', appIds);
            }
        } else if (isOpen && !branch) {
            reset({
                currency: organization?.currency || 'USD',
                timezone: organization?.timezone || 'Asia/Kathmandu',
                language: organization?.language || 'en',
                app_ids: [],
            });
        }
    }, [isOpen, branch, reset, organization, branchApps, setValue]);

    const selectedAppIds = watch('app_ids');

    const mutation = useMutation({
        mutationFn: async (data: BranchFormData) => {
            const payload = {
                ...data,
                email: data.email || undefined,
            };
            if (isEdit) {
                // Determine if this is the Master Organization or a Sub-branch
                const endpoint = branch.org_type === 'MAIN'
                    ? `/organizations/${branch.id}`
                    : `/organizations/branches/${branch.id}`;
                const response = await api.put(endpoint, payload);
                return response.data;
            } else {
                const response = await api.post('/organizations/me/branches', payload);
                return response.data;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['organization-branches'] });
            queryClient.invalidateQueries({ queryKey: ['organization-stats'] });
            toast.success(isEdit ? 'Branch updated successfully' : 'Branch created successfully');
            handleClose();
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || `Failed to ${isEdit ? 'update' : 'create'} branch`);
        },
    });

    const handleClose = () => {
        reset();
        setStep(1);
        onClose();
    };

    const toggleApp = (appId: number) => {
        if (selectedAppIds.includes(appId)) {
            setValue('app_ids', selectedAppIds.filter(id => id !== appId));
        } else {
            setValue('app_ids', [...selectedAppIds, appId]);
        }
    };

    const onSubmit = (data: BranchFormData) => {
        mutation.mutate(data);
    };

    const nextStep = () => setStep(s => Math.min(s + 1, 3));
    const prevStep = () => setStep(s => Math.max(s - 1, 1));

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
            <DialogContent className="max-w-2xl max-h-[95vh] overflow-y-auto p-0 border-none bg-transparent shadow-2xl">
                <div className="bg-surface rounded-3xl overflow-hidden" style={{ backgroundColor: theme.colors.surface }}>
                    <div className="relative h-32 bg-primary flex items-center px-8" style={{ background: `linear-gradient(135deg, ${theme.colors.primary}, ${theme.colors.secondary})` }}>
                        <div className="absolute right-0 top-0 p-8 opacity-10">
                            <Building2 size={120} className="text-white" />
                        </div>
                        <div className="flex items-center gap-4 z-10">
                            <div className="p-3 bg-white/20 backdrop-blur-md rounded-2xl shadow-inner border border-white/30">
                                {isEdit ? <Sparkles className="h-8 w-8 text-white" /> : <Building2 className="h-8 w-8 text-white" />}
                            </div>
                            <div>
                                <DialogTitle className="text-2xl font-black text-white tracking-tight">
                                    {isEdit ? 'Edit Branch Details' : 'Create New Branch'}
                                </DialogTitle>
                                <p className="text-white/80 text-sm font-medium">
                                    {isEdit ? `Modifying ${branch.name}` : 'Expand your organization presence'}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={handleClose}
                            className="absolute top-6 right-6 p-2 rounded-xl hover:bg-white/10 transition-colors text-white/70 hover:text-white"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    <div className="px-8 py-6">
                        {/* Progressive Stepper */}
                        <div className="flex items-center gap-3 mb-8">
                            {[1, 2, 3].map((i) => (
                                <React.Fragment key={i}>
                                    <div
                                        className={`h-2.5 rounded-full transition-all duration-500 relative ${step >= i ? 'flex-[2]' : 'flex-1'}`}
                                        style={{ backgroundColor: step >= i ? theme.colors.primary : `${theme.colors.border}80` }}
                                    >
                                        {step === i && (
                                            <div className="absolute inset-0 bg-white/30 animate-pulse rounded-full" />
                                        )}
                                    </div>
                                    {i < 3 && <div className="w-2 h-2 rounded-full opacity-20" style={{ backgroundColor: theme.colors.textSecondary }} />}
                                </React.Fragment>
                            ))}
                        </div>

                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
                            {step === 1 && (
                                <div className="space-y-6 animate-fadeIn">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="w-1.5 h-6 rounded-full" style={{ backgroundColor: theme.colors.primary }} />
                                        <h3 className="text-base font-bold tracking-tight" style={{ color: theme.colors.text }}>Basic Information</h3>
                                    </div>

                                    <div className="grid grid-cols-1 gap-6">
                                        <Input
                                            label="Branch Name *"
                                            {...register('name')}
                                            error={errors.name?.message}
                                            placeholder="e.g. Downtown Hub"
                                            fullWidth
                                            className="rounded-2xl border-2 focus:border-primary transition-all"
                                        />

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <Input
                                                label="Contact Email"
                                                {...register('email')}
                                                error={errors.email?.message}
                                                placeholder="branch@company.com"
                                                fullWidth
                                                leftIcon={<Mail className="h-4 w-4 opacity-50" />}
                                                className="rounded-2xl border-2"
                                            />
                                            <Input
                                                label="Contact Phone"
                                                {...register('phone')}
                                                error={errors.phone?.message}
                                                placeholder="+977 1XXXXXX"
                                                fullWidth
                                                leftIcon={<Phone className="h-4 w-4 opacity-50" />}
                                                className="rounded-2xl border-2"
                                            />
                                        </div>

                                        <Input
                                            label="Physical Address"
                                            {...register('address')}
                                            error={errors.address?.message}
                                            placeholder="Street, Block, etc."
                                            fullWidth
                                            leftIcon={<MapPin className="h-4 w-4 opacity-50" />}
                                            className="rounded-2xl border-2"
                                        />

                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                            <Input label="City" {...register('city')} placeholder="Kathmandu" className="rounded-2xl border-2" />
                                            <Input label="State" {...register('state')} placeholder="Bagmati" className="rounded-2xl border-2" />
                                            <Input label="Country" {...register('country')} placeholder="Nepal" className="rounded-2xl border-2" />
                                        </div>
                                    </div>

                                    <div className="flex justify-end pt-4">
                                        <Button
                                            type="button"
                                            variant="primary"
                                            onClick={nextStep}
                                            className="px-8 py-6 rounded-2xl shadow-lg hover:shadow-primary/20 transition-all font-bold"
                                        >
                                            Next: Regional Settings
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {step === 2 && (
                                <div className="space-y-6 animate-fadeIn">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="w-1.5 h-6 rounded-full" style={{ backgroundColor: theme.colors.primary }} />
                                        <h3 className="text-base font-bold tracking-tight" style={{ color: theme.colors.text }}>Regional Overrides</h3>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-6 rounded-3xl border-2 border-dashed" style={{ borderColor: theme.colors.border }}>
                                        <div className="space-y-3">
                                            <label className="text-sm font-bold flex items-center gap-2" style={{ color: theme.colors.text }}>
                                                <Banknote className="h-4 w-4 opacity-50" /> Transaction Currency *
                                            </label>
                                            <select
                                                {...register('currency')}
                                                className="w-full h-14 px-4 py-2 rounded-2xl border-2 focus:ring-4 outline-none transition-all appearance-none cursor-pointer"
                                                style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.text }}
                                            >
                                                <option value="USD">USD - United States Dollar</option>
                                                <option value="NPR">NPR - Nepalese Rupee</option>
                                                <option value="EUR">EUR - Euro</option>
                                                <option value="INR">INR - Indian Rupee</option>
                                                <option value="GBP">GBP - British Pound</option>
                                            </select>
                                        </div>

                                        <div className="space-y-3">
                                            <label className="text-sm font-bold flex items-center gap-2" style={{ color: theme.colors.text }}>
                                                <Globe className="h-4 w-4 opacity-50" /> Default Language *
                                            </label>
                                            <select
                                                {...register('language')}
                                                className="w-full h-14 px-4 py-2 rounded-2xl border-2 focus:ring-4 outline-none transition-all appearance-none cursor-pointer"
                                                style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.text }}
                                            >
                                                <option value="en">English (Universal)</option>
                                                <option value="ne">Nepali (Local)</option>
                                                <option value="hi">Hindi</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <label className="text-sm font-bold flex items-center gap-2" style={{ color: theme.colors.text }}>
                                            <Clock className="h-4 w-4 opacity-50" /> Operational Timezone *
                                        </label>
                                        <select
                                            {...register('timezone')}
                                            className="w-full h-14 px-4 py-2 rounded-2xl border-2 focus:ring-4 outline-none transition-all appearance-none cursor-pointer"
                                            style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.text }}
                                        >
                                            <option value="Asia/Kathmandu">(GMT+05:45) Kathmandu, Nepal</option>
                                            <option value="UTC">(GMT+00:00) UTC Standard Time</option>
                                            <option value="Asia/Kolkata">(GMT+05:30) Mumbai, India</option>
                                            <option value="America/New_York">(GMT-05:00) New York, USA</option>
                                            <option value="Europe/London">(GMT+00:00) London, UK</option>
                                        </select>
                                    </div>

                                    <div className="flex justify-between items-center pt-8 border-t" style={{ borderColor: `${theme.colors.border}40` }}>
                                        <Button type="button" variant="outline" onClick={prevStep} className="px-8 py-6 rounded-2xl font-bold">
                                            Return to Info
                                        </Button>
                                        <Button type="button" variant="primary" onClick={nextStep} className="px-8 py-6 rounded-2xl shadow-lg font-bold">
                                            Next: App Permissions
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {step === 3 && (
                                <div className="space-y-6 animate-fadeIn">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="w-1.5 h-6 rounded-full" style={{ backgroundColor: theme.colors.primary }} />
                                            <h3 className="text-base font-bold tracking-tight" style={{ color: theme.colors.text }}>Application Ecosystem</h3>
                                        </div>
                                        {selectedAppIds.length > 0 && (
                                            <Badge variant="primary" size="sm">{selectedAppIds.length} Apps Selected</Badge>
                                        )}
                                    </div>

                                    <p className="text-sm font-medium leading-relaxed" style={{ color: theme.colors.textSecondary }}>
                                        Provision access to specific software tools for this branch. Users in this branch will only be able to interact with enabled applications.
                                    </p>

                                    {isLoadingApps ? (
                                        <div className="flex flex-col items-center justify-center py-20 gap-4">
                                            <Loader2 className="h-12 w-12 animate-spin" style={{ color: theme.colors.primary }} />
                                            <p className="text-sm font-bold opacity-50">Syncing App Inventory...</p>
                                        </div>
                                    ) : orgApps?.length === 0 ? (
                                        <div className="p-12 text-center rounded-[2rem] border-2 border-dashed flex flex-col items-center gap-4 bg-surface-alt"
                                            style={{ borderColor: theme.colors.border }}>
                                            <div className="p-4 bg-surface rounded-2xl shadow-sm">
                                                <Shield className="h-8 w-8 opacity-20" />
                                            </div>
                                            <div className="space-y-1">
                                                <p className="font-bold text-base" style={{ color: theme.colors.text }}>Catalogue is Empty</p>
                                                <p className="text-sm" style={{ color: theme.colors.textSecondary }}>No subscription-active applications found in your Master Organization.</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                            {orgApps?.map((orgApp: any) => (
                                                <div
                                                    key={orgApp.app.id}
                                                    onClick={() => toggleApp(orgApp.app.id)}
                                                    className={`group p-4 rounded-3xl border-2 cursor-pointer transition-all duration-300 flex items-center justify-between relative overflow-hidden ${selectedAppIds.includes(orgApp.app.id)
                                                        ? 'scale-[0.98] ring-4 ring-primary/10'
                                                        : 'hover:scale-[1.02] hover:shadow-lg'
                                                        }`}
                                                    style={{
                                                        borderColor: selectedAppIds.includes(orgApp.app.id) ? theme.colors.primary : theme.colors.border,
                                                        backgroundColor: selectedAppIds.includes(orgApp.app.id) ? `${theme.colors.primary}08` : 'transparent'
                                                    }}
                                                >
                                                    <div className="flex items-center gap-4">
                                                        <div className={`p-2 rounded-2xl border transition-colors ${selectedAppIds.includes(orgApp.app.id) ? 'bg-white' : 'bg-surface'}`}
                                                            style={{ borderColor: theme.colors.border }}>
                                                            <img
                                                                src={orgApp.app.icon_url || '/app-placeholder.png'}
                                                                alt={orgApp.app.name}
                                                                className="w-10 h-10 object-contain rounded-lg"
                                                            />
                                                        </div>
                                                        <div>
                                                            <span className="font-black text-sm tracking-tight" style={{ color: theme.colors.text }}>{orgApp.app.name}</span>
                                                            <div className="flex items-center gap-1 mt-0.5">
                                                                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: theme.colors.success }} />
                                                                <span className="text-[10px] font-bold opacity-60 uppercase tracking-widest text-success">Subscribed</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    {selectedAppIds.includes(orgApp.app.id) ? (
                                                        <div className="p-1.5 rounded-full shadow-lg border-2 border-white" style={{ backgroundColor: theme.colors.primary }}>
                                                            <Check className="h-3 w-3 text-white" />
                                                        </div>
                                                    ) : (
                                                        <div className="w-6 h-6 rounded-full border-2 border-dashed opacity-20" style={{ borderColor: theme.colors.textSecondary }} />
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    <div className="p-4 rounded-2xl flex items-start gap-4 transition-all" style={{ backgroundColor: `${theme.colors.info}08`, border: `1px solid ${theme.colors.info}20` }}>
                                        <AlertCircle className="h-5 w-5 mt-0.5 shrink-0" style={{ color: theme.colors.info }} />
                                        <p className="text-xs font-semibold leading-relaxed" style={{ color: theme.colors.textSecondary }}>
                                            Managing app access here defines the "Software Stack" for the entire branch business unit. Individual user permissions within each app can be managed in User Management.
                                        </p>
                                    </div>

                                    <div className="flex justify-between items-center pt-8 border-t" style={{ borderColor: `${theme.colors.border}40` }}>
                                        <Button type="button" variant="outline" onClick={prevStep} className="px-8 py-6 rounded-2xl font-bold">
                                            Return to Region
                                        </Button>
                                        <Button
                                            type="submit"
                                            variant="primary"
                                            isLoading={mutation.isPending}
                                            className="px-12 py-6 rounded-2xl shadow-xl hover:shadow-primary/30 font-black h-16 text-lg tracking-tight"
                                        >
                                            {isEdit ? 'Update Branch' : 'Finalize & Create'}
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </form>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

const Badge = ({ children, variant = 'primary', size = 'md' }: { children: React.ReactNode, variant?: string, size?: string }) => {
    const { theme } = useTheme();
    return (
        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 shadow-sm border ${size === 'sm' ? 'scale-90 transform origin-right' : ''}`}
            style={{
                backgroundColor: variant === 'primary' ? `${theme.colors.primary}15` : `${theme.colors.success}15`,
                color: variant === 'primary' ? theme.colors.primary : theme.colors.success,
                borderColor: variant === 'primary' ? `${theme.colors.primary}30` : `${theme.colors.success}30`
            }}
        >
            {variant === 'success' && <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: theme.colors.success }} />}
            {children}
        </span>
    );
};
