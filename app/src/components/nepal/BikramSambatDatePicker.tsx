import React, { useState } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Globe } from 'lucide-react';
import { adToBs } from '@/utils/nepaliDateUtils';
import { useTheme } from '@/contexts/ThemeContext';

interface BSDatePickerProps {
    value?: Date;
    onChange: (date: Date) => void;
    label?: string;
}

export default function BikramSambatDatePicker({ value = new Date(), onChange, label }: BSDatePickerProps) {
    const { theme } = useTheme();
    const [mode, setMode] = useState<'AD' | 'BS'>('BS');
    const [isOpen, setIsOpen] = useState(false);

    const bsDate = adToBs(value);

    return (
        <div className="relative">
            {label && <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{label}</label>}
            <div
                className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 cursor-pointer"
                onClick={() => setIsOpen(!isOpen)}
            >
                <div className="flex items-center gap-3">
                    <CalendarIcon className="w-4 h-4 text-slate-400" />
                    <span className="font-semibold text-slate-900 dark:text-white">
                        {mode === 'BS' ? bsDate.formatted : value.toLocaleDateString()}
                    </span>
                    <span className="text-[10px] py-0.5 px-1.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 font-bold">
                        {mode}
                    </span>
                </div>
                <Globe
                    className="w-4 h-4 text-primary hover:scale-110 transition-transform"
                    style={{ color: theme.colors.primary }}
                    onClick={(e) => {
                        e.stopPropagation();
                        setMode(mode === 'AD' ? 'BS' : 'AD');
                    }}
                />
            </div>

            {/* Simulated Calendar Dropdown */}
            {isOpen && (
                <div className="absolute top-full left-0 mt-2 z-50 w-64 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-4">
                    <div className="flex justify-between items-center mb-4">
                        <button className="p-1 rounded-lg hover:bg-slate-100"><ChevronLeft className="w-4 h-4" /></button>
                        <div className="font-bold text-sm">
                            {mode === 'BS' ? `${bsDate.monthName} ${bsDate.year}` : value.toLocaleString('default', { month: 'long', year: 'numeric' })}
                        </div>
                        <button className="p-1 rounded-lg hover:bg-slate-100"><ChevronRight className="w-4 h-4" /></button>
                    </div>

                    <div className="grid grid-cols-7 gap-1 text-center mb-2">
                        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(d => (
                            <div key={d} className="text-[10px] font-bold text-slate-400">{d}</div>
                        ))}
                    </div>

                    <div className="grid grid-cols-7 gap-1 text-center">
                        {/* Dummy days for POC */}
                        {Array.from({ length: 30 }).map((_, i) => (
                            <div
                                key={i}
                                className={`text-xs p-2 rounded-lg cursor-pointer hover:bg-primary/10 ${i + 1 === (mode === 'BS' ? bsDate.day : value.getDate()) ? 'text-white' : ''}`}
                                style={i + 1 === (mode === 'BS' ? bsDate.day : value.getDate()) ? { backgroundColor: theme.colors.primary } : {}}
                                onClick={() => {
                                    setIsOpen(false);
                                    // Normally this would update based on real selection
                                }}
                            >
                                {i + 1}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
