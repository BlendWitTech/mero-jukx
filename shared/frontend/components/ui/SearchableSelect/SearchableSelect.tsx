import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, ChevronDown, Check } from 'lucide-react';
import { cn } from '../../../utils/helpers/classNames';

export interface SelectOption {
    value: string | number;
    label: string;
    disabled?: boolean;
}

export interface ThemeColors {
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    border: string;
    primary: string;
    accent: string;
    info?: string;
    success?: string;
}

export interface SearchableSelectProps {
    options: SelectOption[];
    value: string | number;
    onChange: (value: string | number) => void;
    placeholder?: string;
    className?: string;
    fullWidth?: boolean;
    disabled?: boolean;
    theme?: {
        colors: ThemeColors;
    };
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
    options,
    value,
    onChange,
    placeholder = 'Select option...',
    className,
    fullWidth = false,
    disabled = false,
    theme,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const selectedOption = options.find(opt => opt.value === value);

    const filteredOptions = useMemo(() => {
        if (!search) return options;
        const lowerSearch = search.toLowerCase();
        return options.filter(opt =>
            opt.label.toLowerCase().includes(lowerSearch) ||
            String(opt.value).toLowerCase().includes(lowerSearch)
        );
    }, [options, search]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleToggle = () => {
        if (disabled) return;
        setIsOpen(!isOpen);
        if (!isOpen) {
            setSearch('');
            // Focus input on next tick
            setTimeout(() => inputRef.current?.focus(), 0);
        }
    };

    const handleSelect = (optionValue: string | number) => {
        onChange(optionValue);
        setIsOpen(false);
        setSearch('');
    };

    const colors = theme?.colors || {
        surface: 'var(--theme-surface)',
        text: 'var(--theme-text)',
        textSecondary: 'var(--theme-text-secondary)',
        border: 'var(--theme-border)',
        primary: 'var(--theme-primary)',
    };

    return (
        <div
            ref={containerRef}
            className={cn('relative', fullWidth && 'w-full', className)}
        >
            <div
                onClick={handleToggle}
                className={cn(
                    'flex h-9 w-full items-center justify-between rounded-md border px-3 py-2 text-xs transition-all cursor-pointer overflow-hidden',
                    disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-slate-400 dark:hover:border-slate-600',
                    isOpen ? 'ring-1' : ''
                )}
                style={{
                    backgroundColor: 'transparent',
                    borderColor: isOpen ? colors.primary : colors.border,
                    color: colors.text,
                    boxShadow: isOpen ? `0 0 0 1px ${colors.primary}20` : 'none'
                }}
            >
                <span className={cn('truncate', !selectedOption && 'text-slate-400')}>
                    {selectedOption ? selectedOption.label : placeholder}
                </span>
                <ChevronDown
                    size={14}
                    className={cn('transition-transform duration-200 ml-2 shrink-0', isOpen && 'rotate-180')}
                    style={{ color: colors.textSecondary }}
                />
            </div>

            {isOpen && (
                <div
                    className="absolute z-50 mt-1 w-full rounded-lg border shadow-xl shadow-black/10 animate-fadeIn overflow-hidden"
                    style={{
                        backgroundColor: theme ? colors.surface : 'var(--theme-surface)',
                        borderColor: colors.border
                    }}
                >
                    <div className="flex items-center px-3 py-2 border-b" style={{ borderColor: colors.border }}>
                        <Search size={14} className="text-slate-400 shrink-0" strokeWidth={3} />
                        <input
                            ref={inputRef}
                            type="text"
                            className="ml-2 w-full bg-transparent border-none outline-none text-xs"
                            placeholder="Type to search..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            style={{ color: colors.text }}
                        />
                    </div>
                    <div className="max-h-60 overflow-y-auto custom-scrollbar py-1">
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map((opt) => (
                                <div
                                    key={opt.value}
                                    onClick={() => handleSelect(opt.value)}
                                    className={cn(
                                        'flex items-center justify-between px-3 py-2 text-xs cursor-pointer transition-colors',
                                        opt.value === value ? 'bg-primary/5 dark:bg-primary/20' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                                    )}
                                    style={{
                                        color: opt.value === value ? colors.primary : colors.text,
                                        fontWeight: opt.value === value ? 700 : 400
                                    }}
                                >
                                    <span className="truncate">{opt.label}</span>
                                    {opt.value === value && <Check size={12} className="shrink-0" />}
                                </div>
                            ))
                        ) : (
                            <div className="px-3 py-4 text-center text-slate-400 text-[10px] font-bold uppercase tracking-widest italic">
                                No matching accounts
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
