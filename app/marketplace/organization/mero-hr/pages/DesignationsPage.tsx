import React, { useState, useEffect } from 'react';
import {
    Award,
    Plus,
    Search,
    Edit2,
    Trash2,
    Calendar,
    Briefcase
} from 'lucide-react';
import { hrService } from '../services/hrService';
import { HrDesignation } from '../types';

export default function DesignationsPage() {
    const [designations, setDesignations] = useState<HrDesignation[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        loadDesignations();
    }, []);

    const loadDesignations = async () => {
        setLoading(true);
        try {
            const data = await hrService.getDesignations();
            setDesignations(data);
        } catch (error) {
            console.error('Failed to load designations:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredDesignations = designations.filter(des =>
        des.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        des.grade?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="p-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                        <div className="p-2 bg-amber-500/10 rounded-xl">
                            <Briefcase className="h-8 w-8 text-amber-500" />
                        </div>
                        Designations
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Define roles and grades for your organization</p>
                </div>
                <button
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl transition-all shadow-lg shadow-indigo-600/20 font-medium active:scale-95"
                    onClick={() => { }}
                >
                    <Plus className="h-5 w-5" />
                    Add Designation
                </button>
            </div>

            <div className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search designations..."
                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-4 py-2 text-slate-900 dark:text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50/50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 text-sm font-medium uppercase tracking-wider">
                                <th className="px-6 py-4">Role Title</th>
                                <th className="px-6 py-4">Grade</th>
                                <th className="px-6 py-4">Description</th>
                                <th className="px-6 py-4">Created At</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                            {filteredDesignations.map((des) => (
                                <tr key={des.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 bg-amber-500/10 rounded-lg flex items-center justify-center text-amber-600">
                                                <Award className="h-5 w-5" />
                                            </div>
                                            <span className="font-medium text-slate-900 dark:text-white">{des.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="px-3 py-1 bg-amber-100 dark:bg-amber-900/20 rounded-full text-xs font-semibold text-amber-700 dark:text-amber-500 uppercase">
                                            {des.grade || 'Standard'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400 max-w-xs truncate">
                                        {des.description || 'No description provided.'}
                                    </td>
                                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                                        <div className="flex items-center gap-2">
                                            <Calendar className="h-4 w-4 opacity-50" />
                                            {new Date(des.createdAt).toLocaleDateString()}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-400 transition-colors">
                                                <Edit2 className="h-4 w-4" />
                                            </button>
                                            <button className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-red-600 transition-colors">
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredDesignations.length === 0 && !loading && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">
                                        No designations found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
