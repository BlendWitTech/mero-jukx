import React, { useEffect, useState } from 'react';
import { useTheme } from '@frontend/contexts/ThemeContext';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { invoicesApi, CreateInvoiceDto, InvoiceItem } from '../../api/invoices';
import { clientsApi, Client } from '../../api/clients';
import { Card, Button, Input, Label, Textarea } from '@shared';
import { ArrowLeft, Save, Plus, Trash2 } from 'lucide-react';
import { toast } from '@shared';
import { useAppContext } from '../../contexts/AppContext';
import ProductLookup from '../../components/ProductLookup';

export default function InvoiceFormPage() {
    const { theme } = useTheme();
    const navigate = useNavigate();
    const { buildHref } = useAppContext();
    const { id } = useParams<{ id: string }>();
    const [searchParams] = useSearchParams();
    const isEdit = !!id;

    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [clients, setClients] = useState<Client[]>([]);
    const [formData, setFormData] = useState<CreateInvoiceDto>({
        clientId: searchParams.get('clientId') || '',
        items: [{ description: '', quantity: 1, unitPrice: 0, total: 0 }],
        taxRate: 0,
        discount: 0,
        issueDate: new Date().toISOString().split('T')[0],
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        notes: '',
        status: 'draft',
    });

    useEffect(() => {
        fetchClients();
        if (isEdit) {
            fetchInvoice();
        }
    }, [id]);

    const fetchClients = async () => {
        try {
            const response = await clientsApi.getClients(1, 100);
            setClients(response.data);
        } catch (error: any) {
            toast.error('Failed to fetch clients');
        }
    };

    const fetchInvoice = async () => {
        if (!id) return;

        try {
            setLoading(true);
            const invoice = await invoicesApi.getInvoice(id);
            setFormData({
                clientId: invoice.clientId,
                items: invoice.items,
                taxRate: invoice.taxRate,
                discount: invoice.discount,
                issueDate: invoice.issueDate.split('T')[0],
                dueDate: invoice.dueDate.split('T')[0],
                notes: invoice.notes || '',
                status: invoice.status as any,
            });
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to fetch invoice');
            navigate(buildHref('/invoices'));
        } finally {
            setLoading(false);
        }
    };

    const calculateItemTotal = (quantity: number, unitPrice: number) => {
        return quantity * unitPrice;
    };

    const calculateSubtotal = () => {
        return formData.items.reduce((sum, item) => sum + item.total, 0);
    };

    const calculateTaxAmount = () => {
        return (calculateSubtotal() * formData.taxRate) / 100;
    };

    const calculateTotal = () => {
        return calculateSubtotal() + calculateTaxAmount() - formData.discount;
    };

    const handleItemChange = (index: number, field: keyof InvoiceItem, value: string | number) => {
        const newItems = [...formData.items];
        newItems[index] = { ...newItems[index], [field]: value };

        if (field === 'quantity' || field === 'unitPrice') {
            newItems[index].total = calculateItemTotal(
                Number(newItems[index].quantity),
                Number(newItems[index].unitPrice)
            );
        }

        setFormData((prev) => ({ ...prev, items: newItems }));
    };

    const addItem = () => {
        setFormData((prev) => ({
            ...prev,
            items: [...prev.items, { description: '', quantity: 1, unitPrice: 0, total: 0 }],
        }));
    };

    const removeItem = (index: number) => {
        if (formData.items.length === 1) {
            toast.error('Invoice must have at least one item');
            return;
        }
        setFormData((prev) => ({
            ...prev,
            items: prev.items.filter((_, i) => i !== index),
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.clientId) {
            toast.error('Please select a client');
            return;
        }

        if (formData.items.length === 0 || formData.items.some((item) => !item.description)) {
            toast.error('Please add at least one item with a description');
            return;
        }

        try {
            setSubmitting(true);
            if (isEdit && id) {
                await invoicesApi.updateInvoice(id, formData);
                toast.success('Invoice updated successfully');
            } else {
                await invoicesApi.createInvoice(formData);
                toast.success('Invoice created successfully');
            }
            navigate(buildHref('/invoices'));
        } catch (error: any) {
            toast.error(error.response?.data?.message || `Failed to ${isEdit ? 'update' : 'create'} invoice`);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center">
                    <div
                        className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4"
                        style={{ borderColor: theme.colors.primary }}
                    ></div>
                    <p style={{ color: theme.colors.textSecondary }}>Loading invoice...</p>
                </div>
            </div>
        );
    }

    const subtotal = calculateSubtotal();
    const taxAmount = calculateTaxAmount();
    const total = calculateTotal();

    return (
        <div className="p-6 space-y-6 max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-4">
                <button
                    onClick={() => navigate(buildHref('/invoices'))}
                    className="p-2 rounded transition-colors"
                    style={{ color: theme.colors.textSecondary }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = theme.colors.border;
                        e.currentTarget.style.color = theme.colors.text;
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.color = theme.colors.textSecondary;
                    }}
                >
                    <ArrowLeft className="h-5 w-5" />
                </button>
                <div>
                    <h1 className="text-3xl font-bold mb-2" style={{ color: theme.colors.text }}>
                        {isEdit ? 'Edit Invoice' : 'New Invoice'}
                    </h1>
                    <p style={{ color: theme.colors.textSecondary }}>
                        {isEdit ? 'Update invoice information' : 'Create a new invoice'}
                    </p>
                </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit}>
                <div className="space-y-6">
                    {/* Basic Information */}
                    <Card className="p-6" style={{ backgroundColor: theme.colors.surface }}>
                        <h2 className="text-lg font-semibold mb-4" style={{ color: theme.colors.text }}>
                            Invoice Details
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="clientId">
                                    Client <span className="text-red-500">*</span>
                                </Label>
                                <select
                                    id="clientId"
                                    value={formData.clientId}
                                    onChange={(e) => setFormData((prev) => ({ ...prev, clientId: e.target.value }))}
                                    className="w-full px-3 py-2 rounded border"
                                    style={{
                                        backgroundColor: theme.colors.background,
                                        borderColor: theme.colors.border,
                                        color: theme.colors.text,
                                    }}
                                    required
                                >
                                    <option value="">Select a client</option>
                                    {clients.map((client) => (
                                        <option key={client.id} value={client.id}>
                                            {client.name} ({client.email})
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <Label htmlFor="status">Status</Label>
                                <select
                                    id="status"
                                    value={formData.status}
                                    onChange={(e) => setFormData((prev) => ({ ...prev, status: e.target.value as any }))}
                                    className="w-full px-3 py-2 rounded border"
                                    style={{
                                        backgroundColor: theme.colors.background,
                                        borderColor: theme.colors.border,
                                        color: theme.colors.text,
                                    }}
                                >
                                    <option value="draft">Draft</option>
                                    <option value="sent">Sent</option>
                                </select>
                            </div>
                            <div>
                                <Label htmlFor="issueDate">
                                    Issue Date <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="issueDate"
                                    type="date"
                                    value={formData.issueDate}
                                    onChange={(e) => setFormData((prev) => ({ ...prev, issueDate: e.target.value }))}
                                    required
                                />
                            </div>
                            <div>
                                <Label htmlFor="dueDate">
                                    Due Date <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="dueDate"
                                    type="date"
                                    value={formData.dueDate}
                                    onChange={(e) => setFormData((prev) => ({ ...prev, dueDate: e.target.value }))}
                                    required
                                />
                            </div>
                        </div>
                    </Card>

                    {/* Invoice Items */}
                    <Card className="p-6" style={{ backgroundColor: theme.colors.surface }}>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold" style={{ color: theme.colors.text }}>
                                Invoice Items
                            </h2>
                            <Button type="button" variant="secondary" onClick={addItem}>
                                <Plus className="h-4 w-4 mr-2" />
                                Add Item
                            </Button>
                        </div>
                        <div className="space-y-4">
                            {formData.items.map((item, index) => (
                                <div
                                    key={index}
                                    className="grid grid-cols-12 gap-4 p-4 rounded"
                                    style={{ backgroundColor: theme.colors.background }}
                                >
                                    <div className="col-span-12 md:col-span-5">
                                        <Label htmlFor={`description-${index}`}>Description</Label>
                                        <ProductLookup
                                            onSelect={(product) => {
                                                handleItemChange(index, 'description', product.name);
                                                handleItemChange(index, 'unitPrice', product.selling_price);
                                            }}
                                        />
                                        <Input
                                            id={`description-${index}`}
                                            type="text"
                                            value={item.description}
                                            onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                                            placeholder="Or enter manually..."
                                            className="mt-2"
                                            required
                                        />
                                    </div>
                                    <div className="col-span-4 md:col-span-2">
                                        <Label htmlFor={`quantity-${index}`}>Quantity</Label>
                                        <Input
                                            id={`quantity-${index}`}
                                            type="number"
                                            min="1"
                                            value={item.quantity}
                                            onChange={(e) => handleItemChange(index, 'quantity', Number(e.target.value))}
                                            required
                                        />
                                    </div>
                                    <div className="col-span-4 md:col-span-2">
                                        <Label htmlFor={`unitPrice-${index}`}>Unit Price</Label>
                                        <Input
                                            id={`unitPrice-${index}`}
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={item.unitPrice}
                                            onChange={(e) => handleItemChange(index, 'unitPrice', Number(e.target.value))}
                                            required
                                        />
                                    </div>
                                    <div className="col-span-3 md:col-span-2">
                                        <Label>Total</Label>
                                        <div
                                            className="px-3 py-2 rounded border font-medium"
                                            style={{
                                                backgroundColor: theme.colors.surface,
                                                borderColor: theme.colors.border,
                                                color: theme.colors.text,
                                            }}
                                        >
                                            ${item.total.toFixed(2)}
                                        </div>
                                    </div>
                                    <div className="col-span-1 flex items-end">
                                        <button
                                            type="button"
                                            onClick={() => removeItem(index)}
                                            className="p-2 rounded transition-colors"
                                            style={{ color: theme.colors.textSecondary }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.backgroundColor = '#fee2e2';
                                                e.currentTarget.style.color = '#dc2626';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.backgroundColor = 'transparent';
                                                e.currentTarget.style.color = theme.colors.textSecondary;
                                            }}
                                            title="Remove item"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>

                    {/* Calculations */}
                    <Card className="p-6" style={{ backgroundColor: theme.colors.surface }}>
                        <h2 className="text-lg font-semibold mb-4" style={{ color: theme.colors.text }}>
                            Calculations
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                            <div>
                                <Label htmlFor="taxRate">Tax Rate (%)</Label>
                                <Input
                                    id="taxRate"
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="0.01"
                                    value={formData.taxRate}
                                    onChange={(e) => setFormData((prev) => ({ ...prev, taxRate: Number(e.target.value) }))}
                                />
                            </div>
                            <div>
                                <Label htmlFor="discount">Discount ($)</Label>
                                <Input
                                    id="discount"
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={formData.discount}
                                    onChange={(e) => setFormData((prev) => ({ ...prev, discount: Number(e.target.value) }))}
                                />
                            </div>
                        </div>
                        <div className="space-y-2 pt-4" style={{ borderTop: `1px solid ${theme.colors.border}` }}>
                            <div className="flex justify-between">
                                <span style={{ color: theme.colors.textSecondary }}>Subtotal:</span>
                                <span className="font-medium" style={{ color: theme.colors.text }}>
                                    ${subtotal.toFixed(2)}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span style={{ color: theme.colors.textSecondary }}>
                                    Tax ({formData.taxRate}%):
                                </span>
                                <span className="font-medium" style={{ color: theme.colors.text }}>
                                    ${taxAmount.toFixed(2)}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span style={{ color: theme.colors.textSecondary }}>Discount:</span>
                                <span className="font-medium" style={{ color: theme.colors.text }}>
                                    -${formData.discount.toFixed(2)}
                                </span>
                            </div>
                            <div
                                className="flex justify-between pt-2 text-lg"
                                style={{ borderTop: `1px solid ${theme.colors.border}` }}
                            >
                                <span className="font-semibold" style={{ color: theme.colors.text }}>
                                    Total:
                                </span>
                                <span className="font-bold" style={{ color: theme.colors.primary }}>
                                    ${total.toFixed(2)}
                                </span>
                            </div>
                        </div>
                    </Card>

                    {/* Notes */}
                    <Card className="p-6" style={{ backgroundColor: theme.colors.surface }}>
                        <h2 className="text-lg font-semibold mb-4" style={{ color: theme.colors.text }}>
                            Additional Notes
                        </h2>
                        <div>
                            <Label htmlFor="notes">Notes</Label>
                            <Textarea
                                id="notes"
                                value={formData.notes}
                                onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                                placeholder="Add any additional notes..."
                                rows={4}
                            />
                        </div>
                    </Card>

                    {/* Actions */}
                    <Card className="p-6" style={{ backgroundColor: theme.colors.surface }}>
                        <div className="flex items-center justify-end gap-4">
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={() => navigate(buildHref('/invoices'))}
                                disabled={submitting}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" variant="primary" disabled={submitting}>
                                {submitting ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                        {isEdit ? 'Updating...' : 'Creating...'}
                                    </>
                                ) : (
                                    <>
                                        <Save className="h-4 w-4 mr-2" />
                                        {isEdit ? 'Update Invoice' : 'Create Invoice'}
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
