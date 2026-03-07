import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Truck, Search, Plus, Eye, CheckCircle2, Package, MapPin, Calendar, ExternalLink } from 'lucide-react';
import { useTheme } from '@frontend/contexts/ThemeContext';
import { Card } from '@shared/frontend/components/ui/Card';
import { Button } from '@shared/frontend/components/ui/Button';
import { Input } from '@shared/frontend/components/ui/Input';
import api from '@frontend/services/api';
import toast from '@shared/frontend/hooks/useToast';
import { useAppContext } from '../../contexts/AppContext';

interface Shipment {
    id: string;
    shipment_number: string;
    status: 'PENDING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
    carrier_name?: string;
    tracking_number?: string;
    destination_address?: string;
    shipped_at?: string;
    estimated_delivery?: string;
    items: any[];
}

export default function ShipmentsListPage() {
    const { theme } = useTheme();
    const { organizationId } = useAppContext();
    const [searchTerm, setSearchTerm] = useState('');

    const { data: shipments = [], isLoading } = useQuery({
        queryKey: ['shipments', organizationId],
        queryFn: async () => {
            const response = await api.get('/inventory/shipments');
            return response.data;
        },
    });

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'DELIVERED': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
            case 'SHIPPED': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
            case 'CANCELLED': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
            default: return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
        }
    };

    const filteredShipments = shipments.filter((s: Shipment) =>
        s.shipment_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.carrier_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-8 max-w-[1600px] mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="p-3 rounded-2xl bg-primary/10">
                        <Truck className="h-8 w-8 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight" style={{ color: theme.colors.text }}>
                            Shipments
                        </h1>
                        <p className="mt-1 opacity-70" style={{ color: theme.colors.textSecondary }}>
                            Track outbound orders and logistics.
                        </p>
                    </div>
                </div>
                <Button disabled>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Shipment
                </Button>
            </div>

            <Card style={{ backgroundColor: theme.colors.surface }} className="p-4">
                <div className="relative max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                        placeholder="Search shipments..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9"
                    />
                </div>
            </Card>

            {isLoading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                </div>
            ) : filteredShipments.length === 0 ? (
                <Card className="p-12 text-center">
                    <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p style={{ color: theme.colors.textSecondary }}>No shipments found.</p>
                </Card>
            ) : (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    {filteredShipments.map((shipment: Shipment) => (
                        <Card key={shipment.id} className="overflow-hidden hover:shadow-lg transition-shadow border-none ring-1 ring-border/50">
                            <div className="p-6 space-y-4">
                                <div className="flex items-start justify-between">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <span className="text-lg font-bold" style={{ color: theme.colors.text }}>#{shipment.shipment_number}</span>
                                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${getStatusColor(shipment.status)}`}>
                                                {shipment.status}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm" style={{ color: theme.colors.textSecondary }}>
                                            <Truck className="h-3.5 w-3.5" />
                                            <span>{shipment.carrier_name || 'No carrier assigned'}</span>
                                            {shipment.tracking_number && (
                                                <span className="flex items-center gap-1 text-primary">
                                                    • {shipment.tracking_number} <ExternalLink className="h-3 w-3" />
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                        <Eye className="h-4 w-4" />
                                    </Button>
                                </div>

                                <div className="grid grid-cols-2 gap-4 pt-2">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-gray-400">
                                            <MapPin className="h-3 w-3" /> Destination
                                        </div>
                                        <p className="text-sm line-clamp-1" style={{ color: theme.colors.text }}>
                                            {shipment.destination_address || 'Not specified'}
                                        </p>
                                    </div>
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-gray-400">
                                            <Calendar className="h-3 w-3" /> Shipped At
                                        </div>
                                        <p className="text-sm" style={{ color: theme.colors.text }}>
                                            {shipment.shipped_at ? new Date(shipment.shipped_at).toLocaleDateString() : 'Pending'}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between pt-4 border-t border-border/50">
                                    <span className="text-xs text-gray-400">{shipment.items?.length || 0} items in shipment</span>
                                    {shipment.status === 'SHIPPED' && (
                                        <Button variant="outline" size="sm" className="h-8 text-xs">
                                            Mark as Delivered
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
