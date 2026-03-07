import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    Button,
    Input,
    Select
} from '@shared';
import { useTheme } from '@/contexts/ThemeContext';
import { HrEmployee, HrEmployeeStatus, HrDepartment, HrDesignation } from '../types';
import { hrService } from '../services/hrService';
import toast from '@shared/hooks/useToast';
import { format } from 'date-fns';
import {
    User,
    Briefcase,
    CreditCard,
    Phone,
    Mail,
    MapPin,
    Calendar,
    ChevronRight,
    Building,
    Check,
    Image,
    ShieldAlert,
    Clock
} from 'lucide-react';

const employeeSchema = z.object({
    employee_id: z.string().min(1, 'Employee ID is required'),
    first_name: z.string().min(1, 'First name is required'),
    last_name: z.string().min(1, 'Last name is required'),
    email: z.string().email().optional().or(z.literal('')),
    phone: z.string().optional().or(z.literal('')),
    photo_url: z.string().optional().or(z.literal('')),
    designationId: z.string().optional().or(z.literal('')),
    departmentId: z.string().optional().or(z.literal('')),
    supervisorId: z.string().optional().or(z.literal('')),
    joining_date: z.string().min(1, 'Joining date is required'),
    probation_end_date: z.string().optional().or(z.literal('')),
    contract_end_date: z.string().optional().or(z.literal('')),
    status: z.nativeEnum(HrEmployeeStatus),
    base_salary: z.coerce.number().min(0),
    pan_number: z.string().optional().or(z.literal('')),
    emergency_contact: z.object({
        name: z.string().default(''),
        relation: z.string().default(''),
        phone: z.string().default(''),
    }).optional(),
    bank_details: z.object({
        bank_name: z.string().default(''),
        account_name: z.string().default(''),
        account_number: z.string().default(''),
        branch: z.string().default(''),
    }).optional()
});

type EmployeeFormData = z.infer<typeof employeeSchema>;

interface EmployeeDialogProps {
    isOpen: boolean;
    onClose: () => void;
    employee?: HrEmployee | null;
    onSuccess: () => void;
}

export default function EmployeeDialog({ isOpen, onClose, employee, onSuccess }: EmployeeDialogProps) {
    const { theme } = useTheme();
    const isEdit = !!employee;
    const [activeTab, setActiveTab] = useState<'basic' | 'org' | 'contract' | 'emergency' | 'financials'>('basic');
    const [departments, setDepartments] = useState<HrDepartment[]>([]);
    const [designations, setDesignations] = useState<HrDesignation[]>([]);
    const [employees, setEmployees] = useState<HrEmployee[]>([]);

    const { register, handleSubmit, formState: { errors }, reset, setValue, watch } = useForm<EmployeeFormData>({
        resolver: zodResolver(employeeSchema),
        defaultValues: {
            status: HrEmployeeStatus.ACTIVE,
            base_salary: 0,
            emergency_contact: { name: '', relation: '', phone: '' },
            bank_details: {
                bank_name: '',
                account_name: '',
                account_number: '',
                branch: ''
            }
        }
    });

    const loadMetaData = async () => {
        try {
            const [depts, desigs, emps] = await Promise.all([
                hrService.getDepartments(),
                hrService.getDesignations(),
                hrService.getEmployees()
            ]);
            setDepartments(depts);
            setDesignations(desigs);
            setEmployees(emps.filter(e => e.id !== employee?.id));
        } catch (error) {
            console.error('Failed to load metadata:', error);
        }
    };

    useEffect(() => {
        if (isOpen) {
            loadMetaData();
            if (employee) {
                reset({
                    employee_id: employee.employee_id,
                    first_name: employee.first_name,
                    last_name: employee.last_name,
                    departmentId: employee.departmentId || '',
                    designationId: employee.designationId || '',
                    supervisorId: employee.supervisorId || '',
                    status: employee.status,
                    base_salary: Number(employee.base_salary),
                    joining_date: employee.joining_date ? format(new Date(employee.joining_date), 'yyyy-MM-dd') : '',
                    probation_end_date: employee.probation_end_date ? format(new Date(employee.probation_end_date), 'yyyy-MM-dd') : '',
                    contract_end_date: employee.contract_end_date ? format(new Date(employee.contract_end_date), 'yyyy-MM-dd') : '',
                    email: employee.email || '',
                    phone: employee.phone || '',
                    photo_url: employee.photo_url || '',
                    pan_number: employee.pan_number || '',
                    emergency_contact: {
                        name: employee.emergency_contact?.name || '',
                        relation: employee.emergency_contact?.relation || '',
                        phone: employee.emergency_contact?.phone || '',
                    },
                    bank_details: {
                        bank_name: employee.bank_details?.bank_name || '',
                        account_name: employee.bank_details?.account_name || '',
                        account_number: employee.bank_details?.account_number || '',
                        branch: employee.bank_details?.branch || '',
                    }
                });
            } else {
                reset({
                    status: HrEmployeeStatus.ACTIVE,
                    base_salary: 0,
                    emergency_contact: { name: '', relation: '', phone: '' },
                    bank_details: {
                        bank_name: '',
                        account_name: '',
                        account_number: '',
                        branch: ''
                    }
                });
            }
            setActiveTab('basic');
        }
    }, [isOpen, employee, reset]);

    const onSubmit = async (values: EmployeeFormData) => {
        try {
            const data: Partial<HrEmployee> = {
                ...values,
                emergency_contact: values.emergency_contact ? {
                    name: values.emergency_contact.name || '',
                    relation: values.emergency_contact.relation || '',
                    phone: values.emergency_contact.phone || '',
                } : undefined,
                bank_details: values.bank_details ? {
                    bank_name: values.bank_details.bank_name || '',
                    account_name: values.bank_details.account_name || '',
                    account_number: values.bank_details.account_number || '',
                    branch: values.bank_details.branch || '',
                } : undefined
            };

            if (isEdit && employee) {
                await hrService.updateEmployee(employee.id, data);
                toast.success('Employee updated successfully');
            } else {
                await hrService.createEmployee(data);
                toast.success('Employee created successfully');
            }
            onSuccess();
            onClose();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Something went wrong');
        }
    };

    const status = watch('status');

    const TabButton = ({ id, label, icon: Icon }: { id: typeof activeTab, label: string, icon: any }) => (
        <button
            type="button"
            onClick={() => setActiveTab(id)}
            className="flex items-center gap-3 px-6 py-4 transition-all relative whitespace-nowrap"
            style={{
                color: activeTab === id ? theme.colors.primary : theme.colors.textSecondary,
                fontWeight: activeTab === id ? '900' : '500'
            }}
        >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="text-[10px] uppercase tracking-widest">{label}</span>
            {activeTab === id && (
                <div className="absolute bottom-0 left-0 w-full h-1 rounded-t-full bg-primary" style={{ backgroundColor: theme.colors.primary }} />
            )}
        </button>
    );

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl p-0 border-none bg-transparent overflow-hidden">
                <div className="bg-surface rounded-[40px] shadow-2xl border overflow-hidden animate-in zoom-in-95 duration-300"
                    style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border }}>

                    {/* Header */}
                    <div className="p-8 border-b" style={{ borderColor: theme.colors.border, backgroundColor: `${theme.colors.primary}05` }}>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="p-3 rounded-2xl" style={{ backgroundColor: `${theme.colors.primary}15` }}>
                                    <User className="h-6 w-6 text-primary" style={{ color: theme.colors.primary }} />
                                </div>
                                <div>
                                    <DialogTitle className="text-2xl font-black text-text">
                                        {isEdit ? 'Refine Employee' : 'New Personnel'}
                                    </DialogTitle>
                                    <p className="text-xs font-bold opacity-40 uppercase tracking-tighter" style={{ color: theme.colors.textSecondary }}>
                                        {isEdit ? `Editing ID: ${employee.employee_id}` : 'Fill in the professional details'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="flex border-b overflow-x-auto no-scrollbar" style={{ borderColor: theme.colors.border }}>
                        <TabButton id="basic" label="Identity" icon={User} />
                        <TabButton id="org" label="Organization" icon={Building} />
                        <TabButton id="contract" label="Contract" icon={Calendar} />
                        <TabButton id="emergency" label="Emergency" icon={ShieldAlert} />
                        <TabButton id="financials" label="Financials" icon={CreditCard} />
                    </div>

                    <form onSubmit={handleSubmit(onSubmit)} className="p-8">
                        <div className="space-y-8 min-h-[380px]">
                            {activeTab === 'basic' && (
                                <div className="grid grid-cols-2 gap-8 animate-in slide-in-from-right-4 duration-300">
                                    <div className="col-span-2 flex justify-center mb-4">
                                        <div className="relative group">
                                            <div className="h-24 w-24 rounded-3xl bg-slate-100 dark:bg-slate-800 border-2 border-dashed border-slate-300 dark:border-slate-700 flex flex-col items-center justify-center text-slate-400 group-hover:border-indigo-500 group-hover:text-indigo-500 transition-all cursor-pointer overflow-hidden">
                                                {watch('photo_url') ? (
                                                    <img src={watch('photo_url')} alt="" className="h-full w-full object-cover" />
                                                ) : (
                                                    <>
                                                        <Image className="h-8 w-8 mb-1" />
                                                        <span className="text-[10px] font-bold">PHOTO</span>
                                                    </>
                                                )}
                                            </div>
                                            <input
                                                type="text"
                                                {...register('photo_url')}
                                                placeholder="Photo URL"
                                                className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-32 h-6 text-[8px] rounded bg-white dark:bg-slate-900 border text-center opacity-0 group-hover:opacity-100 transition-opacity"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest opacity-40 px-1">First Name</label>
                                        <Input {...register('first_name')} placeholder="e.g. John" className="h-12 rounded-2xl border-2 focus:ring-0" />
                                        {errors.first_name && <p className="text-[10px] text-red-500 font-bold px-1">{errors.first_name.message}</p>}
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest opacity-40 px-1">Last Name</label>
                                        <Input {...register('last_name')} placeholder="e.g. Doe" className="h-12 rounded-2xl border-2 focus:ring-0" />
                                        {errors.last_name && <p className="text-[10px] text-red-500 font-bold px-1">{errors.last_name.message}</p>}
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest opacity-40 px-1">Email</label>
                                        <div className="relative">
                                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 opacity-20" />
                                            <Input {...register('email')} placeholder="john@company.com" className="h-12 pl-12 rounded-2xl border-2 focus:ring-0" />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest opacity-40 px-1">Phone</label>
                                        <div className="relative">
                                            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 opacity-20" />
                                            <Input {...register('phone')} placeholder="+977 98XXXXXXXX" className="h-12 pl-12 rounded-2xl border-2 focus:ring-0" />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'org' && (
                                <div className="grid grid-cols-2 gap-8 animate-in slide-in-from-right-4 duration-300">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest opacity-40 px-1">Employee ID</label>
                                        <Input {...register('employee_id')} placeholder="BW-2024-001" className="h-12 rounded-2xl border-2 focus:ring-0" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest opacity-40 px-1">Status</label>
                                        <Select
                                            value={status}
                                            onValueChange={(v) => setValue('status', v as HrEmployeeStatus)}
                                            options={Object.values(HrEmployeeStatus).map(s => ({ value: s, label: s }))}
                                            className="h-12 rounded-2xl border-2 focus:ring-0"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest opacity-40 px-1">Department</label>
                                        <Select
                                            value={watch('departmentId')}
                                            onValueChange={(v) => setValue('departmentId', v)}
                                            options={departments.map(d => ({ value: d.id, label: d.name }))}
                                            className="h-12 rounded-2xl border-2 focus:ring-0"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest opacity-40 px-1">Designation</label>
                                        <Select
                                            value={watch('designationId')}
                                            onValueChange={(v) => setValue('designationId', v)}
                                            options={designations.map(d => ({ value: d.id, label: d.name }))}
                                            className="h-12 rounded-2xl border-2 focus:ring-0"
                                        />
                                    </div>
                                    <div className="space-y-2 col-span-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest opacity-40 px-1">Reports To (Supervisor)</label>
                                        <Select
                                            value={watch('supervisorId')}
                                            onValueChange={(v) => setValue('supervisorId', v)}
                                            options={[
                                                { value: '', label: 'No Supervisor' },
                                                ...employees.map(e => ({ value: e.id, label: `${e.first_name} ${e.last_name || ''}` }))
                                            ]}
                                            className="h-12 rounded-2xl border-2 focus:ring-0"
                                        />
                                    </div>
                                </div>
                            )}

                            {activeTab === 'contract' && (
                                <div className="grid grid-cols-2 gap-8 animate-in slide-in-from-right-4 duration-300">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest opacity-40 px-1">Joining Date</label>
                                        <div className="relative">
                                            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 opacity-20" />
                                            <Input {...register('joining_date')} type="date" className="h-12 pl-12 rounded-2xl border-2 focus:ring-0" />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest opacity-40 px-1">Probation End Date</label>
                                        <div className="relative">
                                            <Clock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 opacity-20" />
                                            <Input {...register('probation_end_date')} type="date" className="h-12 pl-12 rounded-2xl border-2 focus:ring-0" />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest opacity-40 px-1">Contract End Date</label>
                                        <div className="relative">
                                            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 opacity-20" />
                                            <Input {...register('contract_end_date')} type="date" className="h-12 pl-12 rounded-2xl border-2 focus:ring-0" />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'emergency' && (
                                <div className="grid grid-cols-2 gap-8 animate-in slide-in-from-right-4 duration-300">
                                    <div className="space-y-2 col-span-2 text-center py-4">
                                        <ShieldAlert className="h-12 w-12 text-red-500 mx-auto opacity-20" />
                                        <p className="text-xs text-slate-500 font-medium mt-2">Information to be used in case of medical or other emergencies.</p>
                                    </div>
                                    <div className="space-y-2 col-span-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest opacity-40 px-1">Contact Name</label>
                                        <Input {...register('emergency_contact.name')} placeholder="Full Name" className="h-12 rounded-2xl border-2 focus:ring-0" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest opacity-40 px-1">Relation</label>
                                        <Input {...register('emergency_contact.relation')} placeholder="e.g. Spouse, Parent" className="h-12 rounded-2xl border-2 focus:ring-0" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest opacity-40 px-1">Emergency Phone</label>
                                        <div className="relative">
                                            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 opacity-20" />
                                            <Input {...register('emergency_contact.phone')} placeholder="+977 98XXXXXXXX" className="h-12 pl-12 rounded-2xl border-2 focus:ring-0" />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'financials' && (
                                <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                                    <div className="grid grid-cols-2 gap-8">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest opacity-40 px-1">Base Salary (NPR)</label>
                                            <Input {...register('base_salary')} type="number" className="h-12 rounded-2xl border-2 focus:ring-0 font-black text-primary text-xl" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest opacity-40 px-1">PAN Number</label>
                                            <Input {...register('pan_number')} placeholder="Tax ID" className="h-12 rounded-2xl border-2 focus:ring-0 font-mono" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest opacity-40 px-1">Bank Name</label>
                                            <Input {...register('bank_details.bank_name')} className="h-12 rounded-2xl border-2 focus:ring-0" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest opacity-40 px-1">Account Number</label>
                                            <Input {...register('bank_details.account_number')} className="h-12 rounded-2xl border-2 focus:ring-0 font-mono" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest opacity-40 px-1">Account Name</label>
                                            <Input {...register('bank_details.account_name')} className="h-12 rounded-2xl border-2 focus:ring-0" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest opacity-40 px-1">Branch</label>
                                            <Input {...register('bank_details.branch')} className="h-12 rounded-2xl border-2 focus:ring-0" />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer Actions */}
                        <div className="mt-12 flex items-center justify-between gap-4">
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={onClose}
                                className="rounded-2xl h-14 px-8 font-black uppercase tracking-widest text-[10px] opacity-40 hover:opacity-100 transition-all"
                            >
                                Discard
                            </Button>

                            <div className="flex items-center gap-3">
                                {activeTab !== 'financials' ? (
                                    <Button
                                        type="button"
                                        onClick={() => {
                                            const steps: typeof activeTab[] = ['basic', 'org', 'contract', 'emergency', 'financials'];
                                            const nextIdx = steps.indexOf(activeTab) + 1;
                                            setActiveTab(steps[nextIdx]);
                                        }}
                                        className="rounded-2xl h-14 px-8 font-black gap-2 transition-all"
                                    >
                                        Next Step <ChevronRight className="h-4 w-4" />
                                    </Button>
                                ) : (
                                    <Button
                                        type="submit"
                                        className="rounded-2xl h-14 px-12 font-black shadow-xl shadow-primary/20 scale-105 active:scale-95 transition-all"
                                    >
                                        <Check className="h-5 w-5 mr-2" /> {isEdit ? 'Update Professional' : 'Onboard Employee'}
                                    </Button>
                                )}
                            </div>
                        </div>
                    </form>
                </div>
            </DialogContent>
        </Dialog>
    );
}
