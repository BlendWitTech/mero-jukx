import React, { useEffect, useState } from 'react';
import { useTheme } from '@frontend/contexts/ThemeContext';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { quotesApi, CreateQuoteDto, QuoteItem } from '../../api/quotes';
import { clientsApi, Client } from '../../api/clients';
import { taxesApi, Tax } from '../../api/taxes';
import { Card, Button, Input, Label, Textarea } from '@shared';
import { ArrowLeft, Save, Plus, Trash2, FileSpreadsheet } from 'lucide-react';
import { toast } from '@shared';
import { useAppContext } from '../../contexts/AppContext';
import ProductLookup from '../../components/ProductLookup';

export default function QuoteFormPage() {
    const { theme } = useTheme();
    const navigate = useNavigate();
    const { buildHref } = useAppContext();
    const { id } = useParams<{ id: string }>();
    const [searchParams] = useSearchParams();
    const isEdit = !!id;

    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [clients, setClients] = useState<Client[]>([]);
    const [taxes, setTaxes] = useState<Tax[]>([]);
    const [formData, setFormData] = useState<CreateQuoteDto>({
        clientId: searchParams.get('clientId') || '',
        items: [{ itemName: '', description: '', quantity: 1, price: 0 }],
        taxRate: 0,
        discount: 0,
        date: new Date().toISOString().split('T')[0],
        expiredDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        notes: '',
        currency: '$',
    });

    useEffect(() => {
        fetchInitialData();
        if (isEdit) {
            fetchQuote();
        }
    }, [id]);

    const fetchInitialData = async () => {
        try {
            const [clientsRes, taxesRes] = await Promise.all([
                clientsApi.getClients(1, 100),
                taxesApi.getTaxes(true),
            ]);
            setClients(clientsRes.data);
            setTaxes(taxesRes);

            // Set default tax if creating new
            if (!isEdit) {
                const defaultTax = taxesRes.find(t => t.isDefault);
                if (defaultTax) {
                    setFormData(prev => ({ ...prev, taxRate: defaultTax.taxValue }));
                }
            }
        } catch (error: any) {
            toast.error('Failed to fetch initial data');
        }
    };

    const fetchQuote = async () => {
        if (!id) return;
        try {
            setLoading(true);
            const quote = await quotesApi.getQuote(id);
            setFormData({
                clientId: quote.clientId,
                items: quote.items.map(item => ({
                    itemName: item.itemName,
                    description: item.description || '',
                    quantity: item.quantity,
                    price: item.price,
                })),
                taxRate: quote.taxRate,
                discount: quote.discount,
                date: quote.date.split('T')[0],
                expiredDate: quote.expiredDate.split('T')[0],
                notes: quote.notes || '',
                currency: quote.currency || '$',
            });
        } catch (error: any) {
            toast.error('Failed to fetch quote');
            navigate(buildHref('/quotes'));
        } finally {
            setLoading(false);
        }
    };

    const handleItemChange = (index: number, field: keyof Omit<QuoteItem, 'id' | 'total'>, value: string | number) => {
        const newItems = [...formData.items];
        newItems[index] = { ...newItems[index], [field]: value };
        setFormData((prev) => ({ ...prev, items: newItems }));
    };

    const addItem = () => {
        setFormData((prev) => ({
            ...prev,
            items: [...prev.items, { itemName: '', description: '', quantity: 1, price: 0 }],
        }));
    };

    const removeItem = (index: number) => {
        if (formData.items.length === 1) {
            toast.error('Quote must have at least one item');
            return;
        }
        setFormData((prev) => ({
            ...prev,
            items: prev.items.filter((_, i) => i !== index),
        }));
    };

    const calculateSubtotal = () => {
        return formData.items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
    };

    const calculateTaxTotal = () => {
        return (calculateSubtotal() * (formData.taxRate || 0)) / 100;
    };

    const calculateTotal = () => {
        return calculateSubtotal() + calculateTaxTotal() - (formData.discount || 0);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.clientId) {
            toast.error('Please select a client');
            return;
        }
        try {
            setSubmitting(true);
            if (isEdit && id) {
                await quotesApi.updateQuote(id, formData);
                toast.success('Quote updated successfully');
            } else {
                await quotesApi.createQuote(formData);
                toast.success('Quote created successfully');
            }
            navigate(buildHref('/quotes'));
        } catch (error: any) {
            toast.error('Failed to save quote');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return <div className="p-24 text-center">Loading quote...</div>;
    }

    const subtotal = calculateSubtotal();
    const taxTotal = calculateTaxTotal();
    const total = calculateTotal();

    return (
        <div className="p-8 max-w-[1200px] mx-auto space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center gap-4">
                <button onClick={() => navigate(buildHref('/quotes'))} className="p-3 rounded-2xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                    <ArrowLeft className="h-6 w-6" />
                </button>
                <div>
                    <h1 className="text-4xl font-extrabold tracking-tight" style={{ color: theme.colors.text }}>
                        {isEdit ? 'Edit Quote' : 'New Quote'}
                    </h1>
                    <p className="opacity-70" style={{ color: theme.colors.textSecondary }}>
                        {isEdit ? 'Update your proforma invoice' : 'Create a professional proposal for your client'}
                    </p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
                {/* Client & Dates */}
                <Card className="p-8 space-y-8 border-none shadow-xl shadow-black-5" style={{ backgroundColor: theme.colors.surface, borderRadius: '24px' }}>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="space-y-2">
                            <Label>Client <span className="text-red-500">*</span></Label>
                            <select
                                value={formData.clientId}
                                onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                                className="w-full h-12 px-4 rounded-xl border-2 focus:border-primary transition-all bg-transparent"
                                style={{ borderColor: theme.colors.border }}
                                required
                            >
                                <option value="">Select a client</option>
                                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <Label>Quote Date</Label>
                            <Input
                                type="date"
                                value={formData.date}
                                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                className="h-12 rounded-xl border-2"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Expiry Date</Label>
                            <Input
                                type="date"
                                value={formData.expiredDate}
                                onChange={(e) => setFormData({ ...formData, expiredDate: e.target.value })}
                                className="h-12 rounded-xl border-2"
                            />
                        </div>
                    </div>
                </Card>

                {/* Items */}
                <Card className="p-8 space-y-6 border-none shadow-xl shadow-black-5" style={{ backgroundColor: theme.colors.surface, borderRadius: '24px' }}>
                    <div className="flex items-center justify-between">
                        <h3 className="text-xl font-bold">Items</h3>
                        <Button type="button" variant="secondary" onClick={addItem} className="rounded-xl px-6">
                            <Plus className="h-4 w-4 mr-2" />
                            Add Item
                        </Button>
                    </div>

                    <div className="space-y-4">
                        {formData.items.map((item, index) => (
                            <div key={index} className="grid grid-cols-12 gap-4 p-6 rounded-2xl bg-black/5 dark:bg-white/5 relative group animate-in slide-in-from-right-2 duration-300">
                                <div className="col-span-12 md:col-span-4 space-y-2">
                                    <Label>Item Name</Label>
                                    <ProductLookup
                                        onSelect={(product) => {
                                            handleItemChange(index, 'itemName', product.name);
                                            handleItemChange(index, 'price', product.selling_price);
                                            if (product.description) {
                                                handleItemChange(index, 'description', product.description);
                                            }
                                        }}
                                    />
                                    <Input
                                        placeholder="Or enter manually..."
                                        value={item.itemName}
                                        onChange={(e) => handleItemChange(index, 'itemName', e.target.value)}
                                        className="bg-surface rounded-xl mt-2"
                                        required
                                    />
                                </div>
                                <div className="col-span-12 md:col-span-4 space-y-2">
                                    <Label>Description</Label>
                                    <Input
                                        placeholder="Optional details..."
                                        value={item.description}
                                        onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                                        className="bg-surface rounded-xl"
                                    />
                                </div>
                                <div className="col-span-4 md:col-span-1 space-y-2">
                                    <Label>Qty</Label>
                                    <Input
                                        type="number"
                                        value={item.quantity}
                                        onChange={(e) => handleItemChange(index, 'quantity', Number(e.target.value))}
                                        className="bg-surface rounded-xl"
                                        required
                                    />
                                </div>
                                <div className="col-span-4 md:col-span-2 space-y-2">
                                    <Label>Price</Label>
                                    <Input
                                        type="number"
                                        value={item.price}
                                        onChange={(e) => handleItemChange(index, 'price', Number(e.target.value))}
                                        className="bg-surface rounded-xl"
                                        required
                                    />
                                </div>
                                <div className="col-span-4 md:col-span-1 flex items-end justify-center">
                                    <button
                                        type="button"
                                        onClick={() => removeItem(index)}
                                        className="p-3 rounded-xl text-red-500 hover:bg-red-500 hover:text-white transition-all"
                                    >
                                        <Trash2 className="h-5 w-5" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>

                {/* Footer: Notes & Calculations */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <Card className="p-8 space-y-4 border-none shadow-xl shadow-black-5" style={{ backgroundColor: theme.colors.surface, borderRadius: '24px' }}>
                        <h3 className="text-xl font-bold">Notes</h3>
                        <Textarea
                            placeholder="Terms and conditions, payment details, etc."
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            className="bg-transparent border-2 rounded-2xl p-4 min-h-[150px]"
                            style={{ borderColor: theme.colors.border }}
                        />
                    </Card>

                    <Card className="p-8 space-y-6 border-none shadow-xl shadow-black-5" style={{ backgroundColor: theme.colors.surface, borderRadius: '24px' }}>
                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label>Tax Rate (%)</Label>
                                <select
                                    value={formData.taxRate}
                                    onChange={(e) => setFormData({ ...formData, taxRate: Number(e.target.value) })}
                                    className="w-full h-12 px-4 rounded-xl border-2 bg-transparent"
                                    style={{ borderColor: theme.colors.border }}
                                >
                                    <option value="0">No Tax (0%)</option>
                                    {taxes.map(t => <option key={t.id} value={t.taxValue}>{t.taxName} ({t.taxValue}%)</option>)}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <Label>Discount ({formData.currency})</Label>
                                <Input
                                    type="number"
                                    value={formData.discount}
                                    onChange={(e) => setFormData({ ...formData, discount: Number(e.target.value) })}
                                    className="h-12 rounded-xl"
                                />
                            </div>
                        </div>

                        <div className="pt-6 space-y-3" style={{ borderTop: `1px solid ${theme.colors.border}` }}>
                            <div className="flex justify-between items-center opacity-60">
                                <span>Subtotal</span>
                                <span className="font-bold">{formData.currency}{subtotal.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center opacity-60">
                                <span>Tax Total</span>
                                <span className="font-bold">{formData.currency}{taxTotal.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center opacity-60">
                                <span>Discount</span>
                                <span className="font-bold">-{formData.currency}{formData.discount?.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center pt-3 mt-3 text-2xl font-black" style={{ borderTop: `2px solid ${theme.colors.border}`, color: theme.colors.primary }}>
                                <span>Total</span>
                                <span>{formData.currency}{total.toFixed(2)}</span>
                            </div>
                        </div>

                        <div className="pt-6">
                            <Button type="submit" variant="primary" className="w-full h-14 rounded-2xl text-lg font-bold shadow-lg shadow-primary/30" disabled={submitting}>
                                {submitting ? 'Saving Quote...' : (
                                    <>
                                        <Save className="h-6 w-6 mr-3" />
                                        {isEdit ? 'Update Quote' : 'Create & Save Quote'}
                                    </>
                                )}
                            </Button>
                        </div>
                    </Card>
                </div>
            </form>
        </div>
    );
}
