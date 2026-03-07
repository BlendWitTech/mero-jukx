import React, { useEffect, useState } from 'react';
import { useTheme } from '@frontend/contexts/ThemeContext';
import { useNavigate, useParams } from 'react-router-dom';
import { invoicesApi, Invoice } from '../../api/invoices';
import { Card, Button, Badge } from '@shared';
import { ArrowLeft, Edit, Trash2, FileText, Calendar, DollarSign, Send, Printer, Download, MessageSquare } from 'lucide-react';
import { toast } from '@shared';
import { useAppContext } from '../../contexts/AppContext';
import SendEmailModal from '../../components/SendEmailModal';

const PRINT_STYLES = `
  @media print {
    body * {
      visibility: hidden;
    }
    .print-content, .print-content * {
      visibility: visible;
    }
    .print-content {
      position: absolute;
      left: 0;
      top: 0;
      width: 100%;
      padding: 0 !important;
      margin: 0 !important;
      background: white !important;
      color: black !important;
      box-shadow: none !important;
    }
    .no-print {
      display: none !important;
    }
    @page {
      margin: 2cm;
    }
  }
`;

export default function InvoiceDetailPage() {
    const { theme } = useTheme();
    const navigate = useNavigate();
    const { buildHref } = useAppContext();
    const { id } = useParams<{ id: string }>();
    const [invoice, setInvoice] = useState<Invoice | null>(null);
    const [loading, setLoading] = useState(true);
    const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
    const [sendingWhatsApp, setSendingWhatsApp] = useState(false);

    useEffect(() => {
        const style = document.createElement('style');
        style.appendChild(document.createTextNode(PRINT_STYLES));
        document.head.appendChild(style);
        return () => {
            document.head.removeChild(style);
        };
    }, []);

    const fetchInvoice = async () => {
        if (!id) return;

        try {
            setLoading(true);
            const data = await invoicesApi.getInvoice(id);
            setInvoice(data);
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to fetch invoice');
            navigate(buildHref('/invoices'));
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!id || !confirm('Are you sure you want to delete this invoice?')) {
            return;
        }

        try {
            await invoicesApi.deleteInvoice(id);
            toast.success('Invoice deleted successfully');
            navigate(buildHref('/invoices'));
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to delete invoice');
        }
    };

    const handleSendWhatsApp = async () => {
        if (!id) return;
        setSendingWhatsApp(true);
        try {
            const result = await invoicesApi.sendWhatsApp(id);
            if (result.success) {
                toast.success('Invoice sent via WhatsApp!');
            } else {
                toast.error(result.error || 'Failed to send WhatsApp message');
            }
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to send WhatsApp message');
        } finally {
            setSendingWhatsApp(false);
        }
    };

    const handleSendEmail = async (data: { to: string; subject: string; message: string }) => {
        if (!id) return;
        try {
            await invoicesApi.sendEmail(id, data);
            toast.success('Invoice sent to client successfully!');
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to send email');
            throw error;
        }
    };

    const handlePrint = () => {
        window.print();
    };

    const getStatusBadge = (status: Invoice['status']) => {
        const statusConfig = {
            draft: { variant: 'secondary' as const, label: 'Draft' },
            sent: { variant: 'info' as const, label: 'Sent' },
            paid: { variant: 'success' as const, label: 'Paid' },
            overdue: { variant: 'danger' as const, label: 'Overdue' },
            cancelled: { variant: 'secondary' as const, label: 'Cancelled' },
        };
        const config = statusConfig[status];
        return <Badge variant={config.variant}>{config.label}</Badge>;
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

    if (!invoice) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <p style={{ color: theme.colors.textSecondary }}>Invoice not found.</p>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-[1200px] mx-auto space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate(buildHref('/invoices'))}
                        className="p-3 rounded-2xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors no-print"
                    >
                        <ArrowLeft className="h-6 w-6" />
                    </button>
                    <div>
                        <div className="flex items-center gap-4 mb-1">
                            <h1 className="text-4xl font-extrabold tracking-tight" style={{ color: theme.colors.text }}>
                                Invoice {invoice.invoiceNumber}
                            </h1>
                            {getStatusBadge(invoice.status)}
                        </div>
                        <p className="opacity-70" style={{ color: theme.colors.textSecondary }}>
                            Professional Invoice for {invoice.client?.name}
                        </p>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-3 no-print">
                    {invoice.status !== 'paid' && invoice.status !== 'cancelled' && (
                        <Button
                            variant="primary"
                            className="rounded-xl px-6 h-11 shadow-lg shadow-primary/20 bg-primary hover:primary border-none"
                            onClick={() => navigate(buildHref(`/payments/new?invoiceId=${id}`))}
                        >
                            <DollarSign className="h-4 w-4 mr-2" />
                            Record Payment
                        </Button>
                    )}
                    <Button
                        variant="secondary"
                        onClick={handleSendWhatsApp}
                        disabled={sendingWhatsApp}
                        className="rounded-xl px-5 h-11"
                        style={{ backgroundColor: '#25D366', color: '#fff', borderColor: '#25D366' }}
                    >
                        <MessageSquare className="h-4 w-4 mr-2" />
                        {sendingWhatsApp ? 'Sending...' : 'WhatsApp'}
                    </Button>
                    <Button variant="secondary" onClick={() => navigate(buildHref(`/invoices/${id}/edit`))} className="rounded-xl px-5 h-11">
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                    </Button>
                    <Button variant="danger" onClick={handleDelete} className="rounded-xl px-5 h-11">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                    </Button>
                </div>
            </div>

            {/* Invoice Information */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Document View */}
                <Card className="lg:col-span-2 p-10 border-none shadow-2xl shadow-black/5 min-h-[800px] flex flex-col print-content" style={{ backgroundColor: theme.colors.surface, borderRadius: '32px' }}>
                    {/* Brand/Top Header */}
                    <div className="flex justify-between items-start mb-16">
                        <div>
                            <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mb-4" style={{ backgroundColor: theme.colors.primary }}>
                                <FileText className="h-8 w-8 text-white" />
                            </div>
                            <h2 className="text-2xl font-black uppercase tracking-tighter">INVOICE</h2>
                        </div>
                        <div className="text-right space-y-1">
                            <p className="font-bold text-xl">#{invoice.invoiceNumber}</p>
                            <p className="opacity-50 text-sm">Issue Date: {new Date(invoice.issueDate).toLocaleDateString()}</p>
                            <p className="opacity-50 text-sm font-medium text-red-500">Due Date: {new Date(invoice.dueDate).toLocaleDateString()}</p>
                        </div>
                    </div>

                    {/* Parties Info */}
                    <div className="grid grid-cols-2 gap-12 mb-16">
                        <div>
                            <p className="text-xs uppercase font-bold opacity-40 mb-3 tracking-widest">From</p>
                            <p className="font-bold text-lg">Your Organization</p>
                            <p className="opacity-60 text-sm leading-relaxed whitespace-pre-wrap">
                                Organization details would go here...
                            </p>
                        </div>
                        <div>
                            <p className="text-xs uppercase font-bold opacity-40 mb-3 tracking-widest">Bill To</p>
                            <p className="font-bold text-lg">{invoice.client?.name}</p>
                            <p className="opacity-60 text-sm leading-relaxed">
                                {invoice.client?.email}
                                {invoice.client?.company && <><br />{invoice.client.company}</>}
                            </p>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="flex-1 overflow-x-auto mb-12">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b-2" style={{ borderColor: theme.colors.border }}>
                                    <th className="text-left py-4 font-bold text-sm uppercase">Description</th>
                                    <th className="text-right py-4 font-bold text-sm uppercase px-4">Qty</th>
                                    <th className="text-right py-4 font-bold text-sm uppercase px-4">Price</th>
                                    <th className="text-right py-4 font-bold text-sm uppercase pl-4">Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y" style={{ borderColor: theme.colors.border }}>
                                {invoice.items.map((item, idx) => (
                                    <tr key={idx}>
                                        <td className="py-6">
                                            <p className="font-bold uppercase text-xs">{item.description}</p>
                                        </td>
                                        <td className="py-6 text-right font-medium px-4">{item.quantity}</td>
                                        <td className="py-6 text-right font-medium px-4">${item.unitPrice.toFixed(2)}</td>
                                        <td className="py-6 text-right font-bold pl-4" style={{ color: theme.colors.primary }}>${item.total.toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Summary & Totals */}
                    <div className="flex flex-col md:flex-row justify-between gap-12 pt-12 border-t-2" style={{ borderColor: theme.colors.border }}>
                        <div className="flex-1 space-y-4">
                            <p className="text-xs uppercase font-bold opacity-40 tracking-widest">Notes & Terms</p>
                            <p className="text-sm opacity-60 leading-relaxed italic whitespace-pre-wrap">
                                {invoice.notes || 'No specific terms provided for this invoice.'}
                            </p>
                        </div>
                        <div className="w-full md:w-64 space-y-4">
                            <div className="flex justify-between items-center text-sm opacity-60 font-medium">
                                <span>Subtotal</span>
                                <span>${invoice.subtotal.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm opacity-60 font-medium">
                                <span>Tax ({invoice.taxRate}%)</span>
                                <span>${invoice.taxAmount.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm opacity-60 font-medium">
                                <span>Discount</span>
                                <span>-${invoice.discount.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center text-2xl font-black pt-4 border-t" style={{ borderColor: theme.colors.border }}>
                                <span>Total</span>
                                <span style={{ color: theme.colors.primary }}>${invoice.total.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>
                </Card>

                {/* Sidebar Actions/Info */}
                <div className="space-y-6 no-print">
                    <Card className="p-8 border-none shadow-xl shadow-black/5" style={{ backgroundColor: theme.colors.surface, borderRadius: '24px' }}>
                        <h3 className="text-xl font-bold mb-6">Actions</h3>
                        <div className="space-y-4">
                            <Button
                                variant="secondary"
                                className="w-full h-12 rounded-xl justify-start px-4 transition-all hover:bg-primary/10 group"
                                onClick={() => setIsEmailModalOpen(true)}
                            >
                                <Send className="h-4 w-4 mr-3 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                                Send to Client
                            </Button>
                            <Button
                                variant="secondary"
                                className="w-full h-12 rounded-xl justify-start px-4 transition-all hover:bg-primary/10 group"
                                onClick={handlePrint}
                            >
                                <Printer className="h-4 w-4 mr-3 group-hover:scale-110 transition-transform" />
                                Print / Save as PDF
                            </Button>
                        </div>
                    </Card>

                    <Card className="p-8 border-none shadow-xl shadow-black/5" style={{ backgroundColor: theme.colors.surface, borderRadius: '24px' }}>
                        <h3 className="text-xl font-bold mb-6">Invoice Info</h3>
                        <div className="space-y-6">
                            <div className="flex items-start gap-3">
                                <Calendar className="h-5 w-5 mt-0.5 opacity-40" />
                                <div>
                                    <p className="text-xs uppercase font-bold opacity-40 tracking-widest mb-1">Created At</p>
                                    <p className="font-bold text-sm">{new Date(invoice.createdAt).toLocaleString()}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <FileText className="h-5 w-5 mt-0.5 opacity-40" />
                                <div>
                                    <p className="text-xs uppercase font-bold opacity-40 tracking-widest mb-1">Created By</p>
                                    <p className="text-sm font-medium">
                                        {invoice.createdBy ? `${invoice.createdBy.firstName} ${invoice.createdBy.lastName}` : '-'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>

            <SendEmailModal
                isOpen={isEmailModalOpen}
                onClose={() => setIsEmailModalOpen(false)}
                onSend={handleSendEmail}
                title="Send Invoice to Client"
                initialData={{
                    to: invoice.client?.email || '',
                    subject: `Invoice #${invoice.invoiceNumber} - Mero CRM`,
                    message: `Please find your invoice #${invoice.invoiceNumber} attached for your review. We appreciate your business.`,
                }}
            />
        </div>
    );
}
