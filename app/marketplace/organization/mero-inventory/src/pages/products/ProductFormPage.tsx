import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Save, Plus, Trash2, Layers, CheckCircle2 } from 'lucide-react';
import { useTheme } from '@frontend/contexts/ThemeContext';
import { Card } from '@shared/frontend/components/ui/Card';
import { Button } from '@shared/frontend/components/ui/Button';
import { Input } from '@shared/frontend/components/ui/Input';
import api from '@frontend/services/api';
import toast from '@shared/frontend/hooks/useToast';
import { useAppContext } from '../../contexts/AppContext';

interface ProductFormData {
    name: string;
    sku: string;
    category?: string;
    unit: string;
    cost_price: number;
    selling_price: number;
    description?: string;
    is_active?: boolean;
    parent_id?: string;
    attribute_type?: string;
    attribute_value?: string;
}

export default function ProductFormPage() {
    const { theme } = useTheme();
    const { buildHref } = useAppContext();
    const navigate = useNavigate();
    const { id } = useParams();
    const isEditMode = !!id;
    const queryClient = useQueryClient();

    const [hasVariants, setHasVariants] = useState(false);
    const [attributeType, setAttributeType] = useState('Size');
    const [attributeValues, setAttributeValues] = useState<string[]>([]);
    const [newValue, setNewValue] = useState('');
    const [generatedVariants, setGeneratedVariants] = useState<any[]>([]);

    const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<ProductFormData>();
    const watchName = watch('name');
    const watchSku = watch('sku');
    const watchCost = watch('cost_price');
    const watchPrice = watch('selling_price');

    const { data: product } = useQuery({
        queryKey: ['product', id],
        queryFn: async () => {
            const response = await api.get(`/inventory/products/${id}`);
            return response.data;
        },
        enabled: isEditMode,
    });

    const { data: variants = [] } = useQuery({
        queryKey: ['product-variants', id],
        queryFn: async () => {
            const response = await api.get(`/inventory/products?parentId=${id}`);
            return response.data;
        },
        enabled: isEditMode,
    });

    useEffect(() => {
        if (product) {
            reset(product);
        }
    }, [product, reset]);

    const mutation = useMutation({
        mutationFn: async (data: ProductFormData) => {
            if (isEditMode) {
                const response = await api.patch(`/inventory/products/${id}`, data);
                return response.data;
            } else {
                const response = await api.post('/inventory/products', data);
                return response.data;
            }
        },
        onSuccess: async (data) => {
            if (hasVariants && generatedVariants.length > 0) {
                try {
                    const productId = isEditMode ? id : data.id;
                    await api.post(`/inventory/products/${productId}/variants/bulk`, generatedVariants);
                    toast.success('Product and variants created successfully');
                } catch (error) {
                    toast.error('Product saved, but failed to generate variants');
                }
            } else {
                toast.success(`Product ${isEditMode ? 'updated' : 'created'} successfully`);
            }
            queryClient.invalidateQueries({ queryKey: ['products'] });
            navigate(buildHref('/products'));
        },
        onError: () => {
            toast.error(`Failed to ${isEditMode ? 'update' : 'create'} product`);
        },
    });

    const onSubmit = (data: ProductFormData) => {
        mutation.mutate({
            ...data,
            cost_price: Number(data.cost_price),
            selling_price: Number(data.selling_price),
        });
    };

    const addAttributeValue = () => {
        if (newValue && !attributeValues.includes(newValue)) {
            setAttributeValues([...attributeValues, newValue]);
            setNewValue('');
        }
    };

    const removeAttributeValue = (val: string) => {
        setAttributeValues(attributeValues.filter(v => v !== val));
    };

    const generatePreview = () => {
        if (!watchName || !watchSku) {
            toast.error('Please enter Product Name and SKU first');
            return;
        }
        const newVariants = attributeValues.map(val => ({
            name: `${watchName} - ${val}`,
            sku: `${watchSku}-${val.toUpperCase().replace(/\s+/g, '')}`,
            attribute_type: attributeType,
            attribute_value: val,
            cost_price: Number(watchCost) || 0,
            selling_price: Number(watchPrice) || 0,
            unit: product?.unit || 'pcs'
        }));
        setGeneratedVariants(newVariants);
    };

    return (
        <div className="p-8 max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex items-center gap-4">
                <Button variant="ghost" onClick={() => navigate(buildHref('/products'))}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                </Button>
                <h1 className="text-3xl font-bold tracking-tight" style={{ color: theme.colors.text }}>
                    {isEditMode ? 'Edit Product' : 'New Product'}
                </h1>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-8">
                        <Card className="p-8 space-y-6 shadow-xl border-none" style={{ backgroundColor: theme.colors.surface, borderRadius: '24px' }}>
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                <Layers className="h-5 w-5 text-primary" />
                                Basic Information
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-xs uppercase font-bold opacity-50 tracking-wider">Product Name</label>
                                    <Input
                                        className="h-12 rounded-xl"
                                        {...register('name', { required: 'Name is required' })}
                                        error={errors.name?.message}
                                        placeholder="e.g. Premium T-Shirt"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs uppercase font-bold opacity-50 tracking-wider">Base SKU</label>
                                    <Input
                                        className="h-12 rounded-xl"
                                        {...register('sku', { required: 'SKU is required' })}
                                        error={errors.sku?.message}
                                        placeholder="TSHIRT-001"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs uppercase font-bold opacity-50 tracking-wider">Category</label>
                                    <Input
                                        className="h-12 rounded-xl"
                                        {...register('category')}
                                        placeholder="e.g. Apparel"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs uppercase font-bold opacity-50 tracking-wider">Unit of Measure</label>
                                    <Input
                                        className="h-12 rounded-xl"
                                        {...register('unit', { required: 'Unit is required' })}
                                        error={errors.unit?.message}
                                        placeholder="pcs, kg, box"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs uppercase font-bold opacity-50 tracking-wider">Default Cost Price</label>
                                    <Input
                                        className="h-12 rounded-xl"
                                        type="number"
                                        step="0.01"
                                        {...register('cost_price', { required: 'Cost price is required', min: 0 })}
                                        error={errors.cost_price?.message}
                                        placeholder="0.00"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs uppercase font-bold opacity-50 tracking-wider">Default Selling Price</label>
                                    <Input
                                        className="h-12 rounded-xl"
                                        type="number"
                                        step="0.01"
                                        {...register('selling_price', { required: 'Selling price is required', min: 0 })}
                                        error={errors.selling_price?.message}
                                        placeholder="0.00"
                                    />
                                </div>

                                <div className="col-span-full space-y-2">
                                    <label className="text-xs uppercase font-bold opacity-50 tracking-wider">Description</label>
                                    <textarea
                                        {...register('description')}
                                        className="w-full h-32 rounded-xl border p-4 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus:ring-2 focus:ring-primary transition-all"
                                        style={{
                                            backgroundColor: 'transparent',
                                            borderColor: theme.colors.border,
                                            color: theme.colors.text
                                        }}
                                        placeholder="High quality cotton t-shirt..."
                                    />
                                </div>
                            </div>
                        </Card>

                        {(!isEditMode || product?.parent_id === null) && (
                            <Card className="p-8 space-y-6 shadow-xl border-none" style={{ backgroundColor: theme.colors.surface, borderRadius: '24px' }}>
                                <div className="flex items-center justify-between">
                                    <h2 className="text-xl font-bold flex items-center gap-2">
                                        <Layers className="h-5 w-5 text-primary" />
                                        Product Variants
                                    </h2>
                                    <div className="flex items-center gap-3">
                                        <span className="text-sm font-medium opacity-60">This product has variants</span>
                                        <button
                                            type="button"
                                            onClick={() => setHasVariants(!hasVariants)}
                                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${hasVariants ? 'bg-primary' : 'bg-gray-200 dark:bg-gray-700'}`}
                                        >
                                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${hasVariants ? 'translate-x-6' : 'translate-x-1'}`} />
                                        </button>
                                    </div>
                                </div>

                                {hasVariants && (
                                    <div className="space-y-8 animate-in fade-in duration-500">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 rounded-2xl bg-black/5 dark:bg-white/5 border border-dashed border-primary/20">
                                            <div className="space-y-2">
                                                <label className="text-xs uppercase font-bold opacity-50 tracking-wider">Attribute Type</label>
                                                <select
                                                    value={attributeType}
                                                    onChange={(e) => setAttributeType(e.target.value)}
                                                    className="w-full h-12 rounded-xl border px-4 bg-transparent focus:ring-2 focus:ring-primary outline-none transition-all"
                                                    style={{ borderColor: theme.colors.border }}
                                                >
                                                    <option value="Size">Size</option>
                                                    <option value="Color">Color</option>
                                                    <option value="Material">Material</option>
                                                    <option value="Style">Style</option>
                                                </select>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs uppercase font-bold opacity-50 tracking-wider">Add {attributeType} Values</label>
                                                <div className="flex gap-2">
                                                    <Input
                                                        className="h-12 rounded-xl flex-1"
                                                        value={newValue}
                                                        onChange={(e) => setNewValue(e.target.value)}
                                                        placeholder={`e.g. ${attributeType === 'Size' ? 'XL, L, M' : 'Red, Blue'}`}
                                                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addAttributeValue())}
                                                    />
                                                    <Button type="button" onClick={addAttributeValue} className="rounded-xl px-4 h-12">
                                                        <Plus className="h-5 w-5" />
                                                    </Button>
                                                </div>
                                            </div>
                                            <div className="col-span-full">
                                                <div className="flex flex-wrap gap-2">
                                                    {attributeValues.map(val => (
                                                        <span key={val} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/10 text-primary font-bold text-sm border border-primary/20">
                                                            {val}
                                                            <button type="button" onClick={() => removeAttributeValue(val)} className="hover:text-red-500 transition-colors">
                                                                <Trash2 className="h-3 w-3" />
                                                            </button>
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="col-span-full pt-4">
                                                <Button
                                                    type="button"
                                                    variant="secondary"
                                                    className="w-full h-12 rounded-xl bg-primary/20 border-primary text-primary hover:bg-primary hover:text-white transition-all font-bold"
                                                    onClick={generatePreview}
                                                    disabled={attributeValues.length === 0}
                                                >
                                                    Generate Variant List
                                                </Button>
                                            </div>
                                        </div>

                                        {generatedVariants.length > 0 && (
                                            <div className="space-y-4">
                                                <h3 className="text-md font-bold opacity-60">Variants to be created:</h3>
                                                <div className="overflow-hidden rounded-2xl border" style={{ borderColor: theme.colors.border }}>
                                                    <table className="w-full text-left text-sm">
                                                        <thead className="bg-black/5 dark:bg-white/5 border-b" style={{ borderColor: theme.colors.border }}>
                                                            <tr>
                                                                <th className="p-4 font-bold">Variant Name</th>
                                                                <th className="p-4 font-bold">SKU</th>
                                                                <th className="p-4 font-bold text-right">Price</th>
                                                                <th className="p-4 font-bold w-10"></th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y" style={{ borderColor: theme.colors.border }}>
                                                            {generatedVariants.map((v, i) => (
                                                                <tr key={i} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                                                                    <td className="p-4 font-medium">{v.name}</td>
                                                                    <td className="p-4 text-muted-foreground">{v.sku}</td>
                                                                    <td className="p-4 text-right font-bold text-primary">${v.selling_price.toFixed(2)}</td>
                                                                    <td className="p-4">
                                                                        <button type="button" onClick={() => setGeneratedVariants(generatedVariants.filter((_, idx) => idx !== i))} className="text-red-500 p-2 hover:bg-red-500/10 rounded-lg">
                                                                            <Trash2 className="h-4 w-4" />
                                                                        </button>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </Card>
                        )}
                    </div>

                    <div className="space-y-8">
                        <Card className="p-8 space-y-6 shadow-xl border-none" style={{ backgroundColor: theme.colors.surface, borderRadius: '24px' }}>
                            <h3 className="text-lg font-bold">Status & Visibility</h3>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-4 rounded-2xl bg-green-500/5 border border-green-500/20">
                                    <div className="flex items-center gap-3">
                                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                                        <span className="font-bold text-sm text-green-700 dark:text-green-400">Active</span>
                                    </div>
                                    <input type="checkbox" {...register('is_active')} defaultChecked className="h-5 w-5 rounded-md border-gray-300 text-primary focus:ring-primary" />
                                </div>

                                <div className="p-4 rounded-2xl bg-blue-500/5 border border-blue-500/20">
                                    <p className="text-xs font-bold text-blue-700 dark:text-blue-400 uppercase tracking-widest mb-1">Creation Date</p>
                                    <p className="text-sm font-medium">{product?.created_at ? new Date(product.created_at).toLocaleDateString() : 'Today'}</p>
                                </div>
                            </div>
                        </Card>

                        <div className="p-8 rounded-3xl bg-primary text-white space-y-4 shadow-xl shadow-primary/30">
                            <h3 className="font-bold">Inventory Tips</h3>
                            <ul className="text-sm opacity-90 space-y-2">
                                <li className="flex gap-2">
                                    <div className="h-1.5 w-1.5 rounded-full bg-white mt-1.5 shrink-0" />
                                    <span>Use descriptive SKUs to quickly identify products.</span>
                                </li>
                                <li className="flex gap-2">
                                    <div className="h-1.5 w-1.5 rounded-full bg-white mt-1.5 shrink-0" />
                                    <span>Set accurate cost prices for correct profit calculation.</span>
                                </li>
                                <li className="flex gap-2">
                                    <div className="h-1.5 w-1.5 rounded-full bg-white mt-1.5 shrink-0" />
                                    <span>Variants inherit category and unit from the parent.</span>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end items-center gap-4 pt-8 border-t" style={{ borderColor: theme.colors.border }}>
                    <Button type="button" variant="outline" className="h-12 px-8 rounded-xl font-bold" onClick={() => navigate(buildHref('/products'))}>
                        Discard Changes
                    </Button>
                    <Button type="submit" disabled={mutation.isPending} className="h-12 px-10 rounded-xl font-bold bg-primary shadow-lg shadow-primary/20 hover:scale-105 transition-all">
                        <Save className="h-5 w-5 mr-3" />
                        {mutation.isPending ? 'Syncing...' : isEditMode ? 'Update Product' : 'Create Everything'}
                    </Button>
                </div>
            </form>
        </div>
    );
}
