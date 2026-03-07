import React, { useEffect, useState } from 'react';
import { useTheme } from '@frontend/contexts/ThemeContext';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { paymentsApi, CreatePaymentDto } from '../../api/payments';
import { invoicesApi, Invoice } from '../../api/invoices';
import { Card, Button, Input, Label, Textarea } from '@shared';
import { ArrowLeft, Save } from 'lucide-react';
import { toast } from '@shared';
import { useAppContext } from '../../contexts/AppContext';

export default function PaymentFormPage() {
    const { theme } = useTheme();
    const navigate = useNavigate();
    const { buildHref } = useAppContext();
    const { id } = useParams<{ id: string }>();
    const [searchParams] = useSearchParams();
    const isEdit = !!id;

    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [formData, setFormData] = useState<CreatePaymentDto>({
        invoiceId: searchParams.get('invoiceId') || '',
        amount: 0,
        paymentMethod: 'bank_transfer',
        paymentDate: new Date().toISOString().split('T')[0],
        notes: '',
        status: 'completed',
    });

    useEffect(() => {
        fetchInvoices();
        if (isEdit) {
            fetchPayment();
        }
    }, [id]);

    const fetchInvoices = async () => {
        try {
            const response = await invoicesApi.getInvoices(1, 100);
            setInvoices(response.data);
        } catch (error: any) {
            toast.error('Failed to fetch invoices');
        }
    };

    const fetchPayment = async () => {
        if (!id) return;

        try {
            setLoading(true);
            const payment = await paymentsApi.getPayment(id);
            setFormData({
                invoiceId: payment.invoiceId,
                amount: payment.amount,
                paymentMethod: payment.paymentMethod,
                paymentDate: payment.paymentDate.split('T')[0],
                notes: payment.notes || '',
                status: payment.status as any,
            });
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to fetch payment');
            navigate(buildHref('/payments'));
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.invoiceId) {
            toast.error('Please select an invoice');
            return;
        }

        if (formData.amount <= 0) {
            toast.error('Amount must be greater than 0');
            return;
        }

        try {
            setSubmitting(true);
            if (isEdit && id) {
                await paymentsApi.updatePayment(id, formData);
                toast.success('Payment updated successfully');
            } else {
                await paymentsApi.createPayment(formData);
                toast.success('Payment recorded successfully');
            }
            navigate(buildHref('/payments'));
        } catch (error: any) {
            toast.error(error.response?.data?.message || `Failed to ${isEdit ? 'update' : 'record'} payment`);
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
                    <p style={{ color: theme.colors.textSecondary }}>Loading payment...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6 max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-4">
                <button
                    onClick={() => navigate(buildHref('/payments'))}
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
                        {isEdit ? 'Edit Payment' : 'Record Payment'}
                    </h1>
                    <p style={{ color: theme.colors.textSecondary }}>
                        {isEdit ? 'Update payment information' : 'Record a new payment'}
                    </p>
                </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit}>
                <Card className="p-6 space-y-6" style={{ backgroundColor: theme.colors.surface }}>
                    {/* Payment Information */}
                    <div>
                        <h2 className="text-lg font-semibold mb-4" style={{ color: theme.colors.text }}>
                            Payment Details
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2">
                                <Label htmlFor="invoiceId">
                                    Invoice <span className="text-red-500">*</span>
                                </Label>
                                <select
                                    id="invoiceId"
                                    value={formData.invoiceId}
                                    onChange={(e) => {
                                        const selectedInvoice = invoices.find((inv) => inv.id === e.target.value);
                                        setFormData((prev) => ({
                                            ...prev,
                                            invoiceId: e.target.value,
                                            amount: selectedInvoice?.total || prev.amount,
                                        }));
                                    }}
                                    className="w-full px-3 py-2 rounded border"
                                    style={{
                                        backgroundColor: theme.colors.background,
                                        borderColor: theme.colors.border,
                                        color: theme.colors.text,
                                    }}
                                    required
                                >
                                    <option value="">Select an invoice</option>
                                    {invoices.map((invoice) => (
                                        <option key={invoice.id} value={invoice.id}>
                                            {invoice.invoiceNumber} - {invoice.client?.name} (${invoice.total.toFixed(2)})
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <Label htmlFor="amount">
                                    Amount <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="amount"
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={formData.amount}
                                    onChange={(e) => setFormData((prev) => ({ ...prev, amount: Number(e.target.value) }))}
                                    placeholder="0.00"
                                    required
                                />
                            </div>
                            <div>
                                <Label htmlFor="paymentMethod">
                                    Payment Method <span className="text-red-500">*</span>
                                </Label>
                                <select
                                    id="paymentMethod"
                                    value={formData.paymentMethod}
                                    onChange={(e) =>
                                        setFormData((prev) => ({ ...prev, paymentMethod: e.target.value as any }))
                                    }
                                    className="w-full px-3 py-2 rounded border"
                                    style={{
                                        backgroundColor: theme.colors.background,
                                        borderColor: theme.colors.border,
                                        color: theme.colors.text,
                                    }}
                                    required
                                >
                                    <option value="cash">Cash</option>
                                    <option value="check">Check</option>
                                    <option value="credit_card">Credit Card</option>
                                    <option value="bank_transfer">Bank Transfer</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                            <div>
                                <Label htmlFor="paymentDate">
                                    Payment Date <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="paymentDate"
                                    type="date"
                                    value={formData.paymentDate}
                                    onChange={(e) => setFormData((prev) => ({ ...prev, paymentDate: e.target.value }))}
                                    required
                                />
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
                                    <option value="pending">Pending</option>
                                    <option value="completed">Completed</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Notes */}
                    <div>
                        <h2 className="text-lg font-semibold mb-4" style={{ color: theme.colors.text }}>
                            Additional Notes
                        </h2>
                        <div>
                            <Label htmlFor="notes">Notes</Label>
                            <Textarea
                                id="notes"
                                value={formData.notes}
                                onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                                placeholder="Add any additional notes about this payment..."
                                rows={4}
                            />
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-4 pt-4" style={{ borderTop: `1px solid ${theme.colors.border}` }}>
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => navigate(buildHref('/payments'))}
                            disabled={submitting}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" variant="primary" disabled={submitting}>
                            {submitting ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                    {isEdit ? 'Updating...' : 'Recording...'}
                                </>
                            ) : (
                                <>
                                    <Save className="h-4 w-4 mr-2" />
                                    {isEdit ? 'Update Payment' : 'Record Payment'}
                                </>
                            )}
                        </Button>
                    </div>
                </Card>
            </form>
        </div>
    );
}
