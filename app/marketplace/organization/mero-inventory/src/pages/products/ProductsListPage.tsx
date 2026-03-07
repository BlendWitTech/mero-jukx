import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Package, Trash2, Edit, Filter, Scan, Upload } from 'lucide-react';
import { useTheme } from '@frontend/contexts/ThemeContext';
import { Card } from '@shared/frontend/components/ui/Card';
import { Button } from '@shared/frontend/components/ui/Button';
import { Input } from '@shared/frontend/components/ui/Input';
import api from '@frontend/services/api';
import toast from '@shared/frontend/hooks/useToast';
import { ConfirmDialog } from '@shared/frontend/components/feedback/ConfirmDialog';
import { useAppContext } from '../../contexts/AppContext';
import { Link } from 'react-router-dom';
import BarcodeScanner from '../../components/BarcodeScanner';
import { CsvImportModal } from '@frontend/components/shared/CsvImportModal';

interface Product {
    id: string;
    name: string;
    sku: string;
    category?: string;
    stockLevel: number; // calculated from stocks
    selling_price: number;
    cost_price: number;
    stocks?: { quantity: number }[];
}

export default function ProductsListPage() {
    const { theme } = useTheme();
    const { organizationId, buildHref } = useAppContext();
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState('');
    const [productToDelete, setProductToDelete] = useState<string | null>(null);
    const [showScanner, setShowScanner] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);

    const { data: products = [], isLoading } = useQuery({
        queryKey: ['products', organizationId],
        queryFn: async () => {
            const response = await api.get('/inventory/products');
            return response.data.map((p: any) => ({
                ...p,
                stockLevel: p.stocks?.reduce((acc: number, s: any) => acc + Number(s.quantity), 0) || 0
            }));
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            await api.delete(`/inventory/products/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['products'] });
            toast.success('Product deleted successfully');
            setProductToDelete(null);
        },
        onError: () => {
            toast.error('Failed to delete product');
        },
    });

    const bulkCreateMutation = useMutation({
        mutationFn: async (data: any[]) => {
            await api.post('/inventory/products/bulk', data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['products'] });
            toast.success('Products imported successfully');
            setIsImportModalOpen(false);
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Failed to import products');
        },
    });

    const filteredProducts = products.filter((p: Product) =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-8 max-w-[1600px] mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight" style={{ color: theme.colors.text }}>
                        Products
                    </h1>
                    <p className="mt-1" style={{ color: theme.colors.textSecondary }}>
                        Manage your product catalog and stock levels.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={() => setIsImportModalOpen(true)}>
                        <Upload className="h-4 w-4 mr-2" />
                        Import CSV
                    </Button>
                    <Link to={buildHref('/products/new')}>
                        <Button>
                            <Plus className="h-4 w-4 mr-2" />
                            Add Product
                        </Button>
                    </Link>
                </div>
            </div>

            <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                        placeholder="Search products (Name, SKU)..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9"
                    />
                </div>
                <Button variant="outline" onClick={() => setShowScanner(true)}>
                    <Scan className="h-4 w-4 mr-2" />
                    Scan Barcode
                </Button>
            </div>

            {showScanner && (
                <BarcodeScanner
                    onClose={() => setShowScanner(false)}
                />
            )}

            <Card style={{ backgroundColor: theme.colors.surface }}>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr style={{ borderBottom: `1px solid ${theme.colors.border}` }}>
                                <th className="text-left p-4 font-medium" style={{ color: theme.colors.textSecondary }}>Name</th>
                                <th className="text-left p-4 font-medium" style={{ color: theme.colors.textSecondary }}>SKU</th>
                                <th className="text-left p-4 font-medium" style={{ color: theme.colors.textSecondary }}>Category</th>
                                <th className="text-right p-4 font-medium" style={{ color: theme.colors.textSecondary }}>Stock</th>
                                <th className="text-right p-4 font-medium" style={{ color: theme.colors.textSecondary }}>Price</th>
                                <th className="text-right p-4 font-medium" style={{ color: theme.colors.textSecondary }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredProducts.map((product: Product) => (
                                <tr key={product.id} style={{ borderBottom: `1px solid ${theme.colors.border}` }} className="hover:bg-opacity-50 transition-colors">
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                                                <Package className="h-5 w-5 text-gray-500" />
                                            </div>
                                            <div>
                                                <div className="font-medium" style={{ color: theme.colors.text }}>{product.name}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4" style={{ color: theme.colors.text }}>{product.sku}</td>
                                    <td className="p-4" style={{ color: theme.colors.textSecondary }}>{product.category || '-'}</td>
                                    <td className="p-4 text-right">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${product.stockLevel > 0
                                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                            : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                                            }`}>
                                            {product.stockLevel}
                                        </span>
                                    </td>
                                    <td className="p-4 text-right" style={{ color: theme.colors.text }}>
                                        {new Intl.NumberFormat('en-NP', { style: 'currency', currency: 'NPR' }).format(product.selling_price)}
                                    </td>
                                    <td className="p-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            <Link to={buildHref(`/products/${product.id}/edit`)}>
                                                <button
                                                    className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                                    style={{ color: theme.colors.textSecondary }}
                                                >
                                                    <Edit className="h-4 w-4" />
                                                </button>
                                            </Link>
                                            <button
                                                onClick={() => setProductToDelete(product.id)}
                                                className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                                style={{ color: theme.colors.error }}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>

            <ConfirmDialog
                isOpen={!!productToDelete}
                onClose={() => setProductToDelete(null)}
                onConfirm={() => productToDelete && deleteMutation.mutate(productToDelete)}
                title="Delete Product"
                message="Are you sure you want to delete this product? This action cannot be undone."
                variant="danger"
                theme={theme}
            />

            <CsvImportModal
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                onImport={async (data) => bulkCreateMutation.mutate(data)}
                title="Import Products"
                expectedHeaders={['name', 'sku', 'category', 'selling_price', 'cost_price', 'description']}
                templateHeaders={['name', 'sku', 'category', 'selling_price', 'cost_price', 'description']}
            />
        </div>
    );
}
