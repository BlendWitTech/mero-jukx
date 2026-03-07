import { Routes, Route, Navigate } from 'react-router-dom';
import DashboardPage from './pages/DashboardPage';
import ProductsPage from './pages/ProductsPage';
import ProductDetailPage from './pages/ProductDetailPage';
import WarehousesPage from './pages/WarehousesPage';
import SalesOrdersPage from './pages/SalesOrdersPage';
import SalesOrderDetailPage from './pages/SalesOrderDetailPage';
import ShipmentsPage from './pages/ShipmentsPage';
import StockMovementsPage from './pages/StockMovementsPage';
import StockAdjustmentsPage from './pages/StockAdjustmentsPage';
import ValuationPage from './pages/ValuationPage';
import InventorySettingsPage from './pages/InventorySettingsPage';
import InventoryLayout from './layouts/InventoryLayout';
import { AppProvider } from './contexts/AppContext';
import { useAuthStore } from '@frontend/store/authStore';

interface MeroInventoryRouterProps {
    appSlug: string;
}

export default function MeroInventoryRouter({ appSlug }: MeroInventoryRouterProps) {
    const { organization } = useAuthStore();

    if (!organization) {
        return null;
    }

    return (
        <AppProvider appSlug={appSlug} organizationId={organization.id}>
            <Routes>
                <Route element={<InventoryLayout />}>
                    <Route path="/" element={<DashboardPage />} />
                    <Route path="/products" element={<ProductsPage />} />
                    <Route path="/products/warehouses" element={<Navigate to="../warehouses" replace />} />
                    <Route path="/products/:id" element={<ProductDetailPage />} />
                    <Route path="/warehouses" element={<WarehousesPage />} />
                    <Route path="/sales-orders" element={<SalesOrdersPage />} />
                    <Route path="/sales-orders/:id" element={<SalesOrderDetailPage />} />
                    <Route path="/shipments" element={<ShipmentsPage />} />
                    <Route path="/movements" element={<StockMovementsPage />} />
                    <Route path="/adjustments" element={<StockAdjustmentsPage />} />
                    <Route path="/reports/valuation" element={<ValuationPage />} />
                    <Route path="/settings" element={<InventorySettingsPage />} />
                </Route>
                <Route path="*" element={<Navigate to="" replace />} />
            </Routes>
        </AppProvider>
    );
}
