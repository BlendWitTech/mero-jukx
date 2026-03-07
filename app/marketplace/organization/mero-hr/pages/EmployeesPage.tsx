import React, { useEffect, useState } from 'react';
import {
    Plus,
    Search,
    Edit,
    Trash2,
    Users as UsersIcon,
    Filter,
    Download
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import {
    Card,
    Button,
    Input,
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
    Badge
} from '@shared';
import { HrEmployee, HrEmployeeStatus } from '../types';
import { hrService } from '../services/hrService';
import EmployeeDialog from '../components/EmployeeDialog';
import toast from '@shared/hooks/useToast';

export default function EmployeesPage() {
    const { theme } = useTheme();
    const [employees, setEmployees] = useState<HrEmployee[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedEmployee, setSelectedEmployee] = useState<HrEmployee | null>(null);

    const fetchEmployees = async () => {
        try {
            setLoading(true);
            const data = await hrService.getEmployees();
            setEmployees(data);
        } catch (error: any) {
            toast.error('Failed to load employees');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchEmployees();
    }, []);

    const handleAdd = () => {
        setSelectedEmployee(null);
        setIsDialogOpen(true);
    };

    const handleEdit = (employee: HrEmployee) => {
        setSelectedEmployee(employee);
        setIsDialogOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this employee?')) return;
        try {
            await hrService.deleteEmployee(id);
            toast.success('Employee deleted successfully');
            fetchEmployees();
        } catch (error: any) {
            toast.error('Failed to delete employee');
        }
    };

    const filteredEmployees = employees.filter(emp =>
        `${emp.first_name} ${emp.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
        emp.employee_id?.toLowerCase().includes(search.toLowerCase()) ||
        emp.designation?.toLowerCase().includes(search.toLowerCase())
    );

    const getStatusBadge = (status: HrEmployeeStatus) => {
        switch (status) {
            case HrEmployeeStatus.ACTIVE:
                return <Badge variant="success" className="font-bold">Active</Badge>;
            case HrEmployeeStatus.ON_LEAVE:
                return <Badge variant="warning" className="font-bold">On Leave</Badge>;
            case HrEmployeeStatus.TERMINATED:
                return <Badge variant="destructive" className="font-bold">Terminated</Badge>;
            case HrEmployeeStatus.RESIGNED:
                return <Badge variant="secondary" className="font-bold">Resigned</Badge>;
            default:
                return <Badge variant="secondary">{status}</Badge>;
        }
    };

    return (
        <div className="p-8 space-y-8 max-w-[1600px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-5">
                    <div className="p-4 rounded-2xl shadow-lg border transition-transform hover:scale-110"
                        style={{ backgroundColor: `${theme.colors.primary}15`, borderColor: `${theme.colors.primary}30` }}>
                        <UsersIcon className="h-8 w-8" style={{ color: theme.colors.primary }} />
                    </div>
                    <div>
                        <h1 className="text-4xl font-black tracking-tight" style={{ color: theme.colors.text }}>
                            Employee Directory
                        </h1>
                        <p className="font-medium opacity-60" style={{ color: theme.colors.textSecondary }}>
                            Manage your workforce and personnel records
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="outline" className="rounded-xl font-bold gap-2">
                        <Download className="h-4 w-4" /> Export
                    </Button>
                    <Button
                        onClick={handleAdd}
                        className="rounded-xl font-black px-6 shadow-xl shadow-primary/20 scale-105 active:scale-95 transition-all"
                    >
                        <Plus className="h-5 w-5 mr-2" /> Add Employee
                    </Button>
                </div>
            </div>

            {/* Filter Bar */}
            <Card className="p-4 border shadow-sm backdrop-blur-xl" style={{ backgroundColor: `${theme.colors.surface}80`, borderColor: theme.colors.border }}>
                <div className="flex flex-col md:flex-row gap-4 items-center">
                    <div className="relative flex-1 w-full group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 opacity-40 group-focus-within:opacity-100 transition-opacity" style={{ color: theme.colors.text }} />
                        <Input
                            placeholder="Search by name, ID or designation..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-12 h-12 rounded-xl border-none bg-black/5 dark:bg-white/5 focus:ring-2 focus:ring-primary/20 transition-all"
                        />
                    </div>
                    <Button variant="outline" className="h-12 rounded-xl px-6 font-bold gap-2">
                        <Filter className="h-4 w-4" /> Filters
                    </Button>
                </div>
            </Card>

            {/* Main Content Table */}
            <Card className="overflow-hidden border-none shadow-xl" style={{ backgroundColor: theme.colors.surface }}>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr style={{ backgroundColor: `${theme.colors.primary}05`, borderBottom: `1px solid ${theme.colors.border}` }}>
                                <th className="p-5 font-black uppercase text-[10px] tracking-widest opacity-60 text-primary">Employee</th>
                                <th className="p-5 font-black uppercase text-[10px] tracking-widest opacity-60 text-primary">ID</th>
                                <th className="p-5 font-black uppercase text-[10px] tracking-widest opacity-60 text-primary">Designation</th>
                                <th className="p-5 font-black uppercase text-[10px] tracking-widest opacity-60 text-center text-primary">Status</th>
                                <th className="p-5 font-black uppercase text-[10px] tracking-widest opacity-60 text-primary">Salary</th>
                                <th className="p-5 font-black uppercase text-[10px] tracking-widest opacity-60 text-right text-primary">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y" style={{ borderColor: theme.colors.border }}>
                            {loading ? (
                                Array(5).fill(0).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={6} className="p-8">
                                            <div className="h-6 bg-black/5 dark:bg-white/5 rounded-lg w-full"></div>
                                        </td>
                                    </tr>
                                ))
                            ) : filteredEmployees.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="p-20 text-center">
                                        <UsersIcon className="h-12 w-12 mx-auto opacity-10 mb-4" />
                                        <p className="font-bold opacity-30">No employees found matching your criteria</p>
                                    </td>
                                </tr>
                            ) : (
                                filteredEmployees.map((emp) => (
                                    <tr key={emp.id} className="group hover:bg-black/5 dark:hover:bg-white/5 transition-colors duration-200">
                                        <td className="p-5">
                                            <div className="flex items-center gap-4">
                                                <div className="h-10 w-10 rounded-full flex items-center justify-center font-bold shadow-inner"
                                                    style={{ backgroundColor: `${theme.colors.primary}15`, color: theme.colors.primary }}>
                                                    {emp.first_name[0]}{emp.last_name?.[0]}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-sm" style={{ color: theme.colors.text }}>{emp.first_name} {emp.last_name}</p>
                                                    <p className="text-xs opacity-60" style={{ color: theme.colors.textSecondary }}>{emp.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-5">
                                            <span className="font-mono text-xs font-bold" style={{ color: theme.colors.textSecondary }}>{emp.employee_id}</span>
                                        </td>
                                        <td className="p-5">
                                            <div>
                                                <p className="font-bold text-xs" style={{ color: theme.colors.text }}>{emp.designation}</p>
                                                <p className="text-[10px] opacity-60 uppercase font-black" style={{ color: theme.colors.textSecondary }}>{emp.department}</p>
                                            </div>
                                        </td>
                                        <td className="p-5 text-center">
                                            {getStatusBadge(emp.status)}
                                        </td>
                                        <td className="p-5">
                                            <span className="font-black text-sm" style={{ color: theme.colors.text }}>NPR {emp.base_salary.toLocaleString()}</span>
                                        </td>
                                        <td className="p-5">
                                            <div className="flex items-center justify-end gap-1">
                                                <button
                                                    onClick={() => handleEdit(emp)}
                                                    className="p-2.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-all"
                                                    style={{ color: theme.colors.textSecondary }}
                                                >
                                                    <Edit className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(emp.id)}
                                                    className="p-2.5 rounded-xl hover:bg-red-500/10 text-red-500 transition-all opacity-0 group-hover:opacity-100"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            <EmployeeDialog
                isOpen={isDialogOpen}
                onClose={() => setIsDialogOpen(false)}
                employee={selectedEmployee}
                onSuccess={fetchEmployees}
            />
        </div>
    );
}
