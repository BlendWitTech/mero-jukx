import React, { useState, useEffect, useRef } from 'react';
import { Search, Loader2, Package, Check } from 'lucide-react';
import { useTheme } from '@frontend/contexts/ThemeContext';
import api from '@frontend/services/api';

interface Product {
    id: string;
    name: string;
    sku: string;
    selling_price: number;
    description?: string;
}

interface ProductLookupProps {
    onSelect: (product: Product) => void;
}

export default function ProductLookup({ onSelect }: ProductLookupProps) {
    const { theme } = useTheme();
    const [searchTerm, setSearchTerm] = useState('');
    const [results, setResults] = useState<Product[]>([]);
    const [loading, setLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        const delayDebounce = setTimeout(() => {
            if (searchTerm.length >= 2) {
                handleSearch();
            } else {
                setResults([]);
            }
        }, 300);

        return () => clearTimeout(delayDebounce);
    }, [searchTerm]);

    const handleSearch = async () => {
        setLoading(true);
        try {
            const response = await api.get(`/inventory/products?search=${searchTerm}`);
            setResults(response.data);
            setIsOpen(true);
        } catch (error) {
            console.error('Failed to search products', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div ref={wrapperRef} className="relative w-full">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 opacity-40" />
                <input
                    type="text"
                    placeholder="Search from Inventory..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onFocus={() => searchTerm.length >= 2 && setIsOpen(true)}
                    className="w-full h-10 pl-9 pr-4 rounded-xl border-2 transition-all focus:border-primary bg-transparent text-sm"
                    style={{ borderColor: theme.colors.border }}
                />
                {loading && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    </div>
                )}
            </div>

            {isOpen && results.length > 0 && (
                <div
                    className="absolute z-50 mt-2 w-full max-h-60 overflow-y-auto rounded-2xl shadow-2xl border animate-in fade-in zoom-in-95 duration-200"
                    style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border }}
                >
                    {results.map((product) => (
                        <button
                            key={product.id}
                            type="button"
                            onClick={() => {
                                onSelect(product);
                                setIsOpen(false);
                                setSearchTerm('');
                            }}
                            className="w-full flex items-center justify-between p-3 hover:bg-black/5 dark:hover:bg-white/5 transition-colors border-b last:border-b-0 text-left"
                            style={{ borderColor: theme.colors.border }}
                        >
                            <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                    <Package className="h-4 w-4 text-primary" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold" style={{ color: theme.colors.text }}>{product.name}</p>
                                    <p className="text-[10px] uppercase font-bold opacity-40">{product.sku}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-sm font-black" style={{ color: theme.colors.primary }}>
                                    {new Intl.NumberFormat('en-NP', { style: 'currency', currency: 'NPR', maximumFractionDigits: 0 }).format(product.selling_price)}
                                </p>
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
