import React, { useState, useEffect } from 'react';
import {
    GitGraph,
    ZoomIn,
    ZoomOut,
    Maximize2,
    Search,
    ChevronDown,
    ChevronUp,
    Briefcase,
    Building2,
    MapPin,
    Users
} from 'lucide-react';
import { hrService } from '../services/hrService';
import { HrEmployee, HrDepartment } from '../types';

export default function OrgChartPage() {
    const [employees, setEmployees] = useState<HrEmployee[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await hrService.getEmployees();
            setEmployees(data);
        } catch (error) {
            console.error('Failed to load org chart data:', error);
        } finally {
            setLoading(false);
        }
    };

    // Simple recursive component for the tree
    const OrgNode = ({ employee, employees }: { employee: HrEmployee, employees: HrEmployee[] }) => {
        const subordinates = employees.filter(e => e.supervisorId === employee.id);
        const [isExpanded, setIsExpanded] = useState(true);

        return (
            <div className="flex flex-col items-center">
                <div className="relative p-6 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl shadow-slate-200/50 dark:shadow-none min-w-[240px] group transition-all hover:border-indigo-500 dark:hover:border-indigo-500">
                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <div className="h-14 w-14 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden border-2 border-indigo-500/20">
                                {employee.photo_url ? (
                                    <img src={employee.photo_url} alt="" className="h-full w-full object-cover" />
                                ) : (
                                    <div className="h-full w-full flex items-center justify-center text-xl font-bold text-indigo-500">
                                        {employee.first_name[0]}
                                    </div>
                                )}
                            </div>
                            <div className="absolute -bottom-1 -right-1 h-5 w-5 bg-green-500 border-2 border-white dark:border-slate-800 rounded-full" />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-900 dark:text-white truncate max-w-[140px]">
                                {employee.first_name} {employee.last_name}
                            </h3>
                            <p className="text-sm text-indigo-500 font-medium flex items-center gap-1">
                                <Briefcase className="h-3 w-3" />
                                {employee.designationRel?.name || employee.designation || 'Specialist'}
                            </p>
                        </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700 flex flex-col gap-1.5">
                        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                            <Building2 className="h-3 w-3 text-slate-400" />
                            {employee.departmentRel?.name || employee.department || 'Not Assigned'}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                            <MapPin className="h-3 w-3 text-slate-400" />
                            {employee.address || 'Kathmandu, NP'}
                        </div>
                    </div>

                    {subordinates.length > 0 && (
                        <button
                            onClick={() => setIsExpanded(!isExpanded)}
                            className="absolute -bottom-4 left-1/2 -translate-x-1/2 p-1.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-full shadow-md text-slate-500 dark:text-slate-300 hover:text-indigo-500 transition-colors"
                        >
                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </button>
                    )}
                </div>

                {isExpanded && subordinates.length > 0 && (
                    <div className="relative pt-12 flex items-start gap-8">
                        {/* Connecting lines - CSS would be better but keeping it simple */}
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-12 bg-slate-300 dark:bg-slate-600" />
                        <div className="absolute top-12 left-[50%] -translate-x-1/2 h-px bg-slate-300 dark:bg-slate-600" style={{ width: `calc(100% - ${subordinates.length > 1 ? '160px' : '0px'})` }} />

                        {subordinates.map(sub => (
                            <OrgNode key={sub.id} employee={sub} employees={employees} />
                        ))}
                    </div>
                )}
            </div>
        );
    };

    // Filter employees by search query
    const filteredEmployees = searchQuery.trim()
        ? employees.filter(e => {
            const term = searchQuery.toLowerCase();
            return (
                `${e.first_name} ${e.last_name}`.toLowerCase().includes(term) ||
                (e.designationRel?.name || e.designation || '').toLowerCase().includes(term) ||
                (e.departmentRel?.name || e.department || '').toLowerCase().includes(term)
            );
        })
        : employees;

    // Find top-level managers (those without supervisors)
    const rootManagers = filteredEmployees.filter(e => !e.supervisorId);

    return (
        <div className="p-8 h-full flex flex-col min-h-screen animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 shrink-0">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                        <div className="p-2 bg-indigo-500/10 rounded-xl">
                            <GitGraph className="h-8 w-8 text-indigo-500" />
                        </div>
                        Organization Chart
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Visualize company hierarchy and reporting structure</p>
                </div>

                <div className="flex items-center gap-2">
                    <div className="relative w-64 mr-4">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Find in chart..."
                            className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className="flex bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-1 shadow-sm">
                        <button className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-500"><ZoomIn className="h-4 w-4" /></button>
                        <button className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-500"><ZoomOut className="h-4 w-4" /></button>
                        <div className="w-px bg-slate-200 dark:bg-slate-700 mx-1 my-1" />
                        <button className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-500"><Maximize2 className="h-4 w-4" /></button>
                    </div>
                </div>
            </div>

            <div className="flex-1 bg-slate-50/50 dark:bg-slate-900/50 rounded-3xl border border-slate-200/60 dark:border-slate-800 border-dashed overflow-auto p-12 custom-scrollbar">
                <div className="min-w-max flex justify-center">
                    {rootManagers.length > 0 ? (
                        <div className="flex gap-20">
                            {rootManagers.map(root => (
                                <OrgNode key={root.id} employee={root} employees={filteredEmployees} />
                            ))}
                        </div>
                    ) : (
                        loading ? (
                            <div className="text-slate-400">Loading chart...</div>
                        ) : (
                            <div className="text-center py-20">
                                <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-full inline-block mb-4">
                                    <Users className="h-10 w-10 text-slate-400" />
                                </div>
                                <h3 className="text-lg font-medium text-slate-900 dark:text-white">
                                    {searchQuery ? 'No matching employees found' : 'No hierarchy data available'}
                                </h3>
                                <p className="text-slate-500 max-w-sm mx-auto mt-2">
                                    {searchQuery ? 'Try a different search term.' : 'Add employees and assign supervisors to see the organization chart.'}
                                </p>
                            </div>
                        )
                    )}
                </div>
            </div>
        </div>
    );
}
