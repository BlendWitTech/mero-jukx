import { Routes, Route } from 'react-router-dom';
import MeroInventoryLayout from './layouts/MeroInventoryLayout';
import DashboardPage from './pages/DashboardPage';
import { AppProvider } from './contexts/AppContext';
import { useAuthStore } from '@frontend/store/authStore';

import ProductsListPage from './pages/products/ProductsListPage';
import ProductFormPage from './pages/products/ProductFormPage';
import StockTransferPage from './pages/stock/StockTransferPage';
import WarehousesListPage from './pages/warehouses/WarehousesListPage';
import StockMovementsPage from './pages/stock/StockMovementsPage';
import StockAdjustmentPage from './pages/stock/StockAdjustmentPage';
import SuppliersListPage from './pages/suppliers/SuppliersListPage';
import SupplierFormPage from './pages/suppliers/SupplierFormPage';
import PurchaseOrdersListPage from './pages/purchase-orders/PurchaseOrdersListPage';
import PurchaseOrderFormPage from './pages/purchase-orders/PurchaseOrderFormPage';
import ShipmentsListPage from './pages/shipments/ShipmentsListPage';
import ValuationPage from './pages/reports/ValuationPage';
import ExpiryAlertsPage from './pages/reports/ExpiryAlertsPage';
import PurchaseRequisitionsPage from './pages/purchase-requisitions/PurchaseRequisitionsPage';
import GRNPage from './pages/grn/GRNPage';
import BackordersPage from './pages/backorders/BackordersPage';
import CommissionPage from './pages/commission/CommissionPage';
import AgingReportPage from './pages/reports/AgingReportPage';

export default function MeroInventoryRouter() {
    const { organization } = useAuthStore();

    if (!organization) {
        return null; // Or a loading spinner
    }

    return (
        <AppProvider appSlug="mero-inventory" organizationId={organization.id}>
            <Routes>
                <Route element={<MeroInventoryLayout />}>
                    <Route index element={<DashboardPage />} />

                    {/* Products Routes */}
                    <Route path="products" element={<ProductsListPage />} />
                    <Route path="products/new" element={<ProductFormPage />} />
                    <Route path="products/:id/edit" element={<ProductFormPage />} />

                    {/* Warehouses Routes */}
                    <Route path="warehouses" element={<WarehousesListPage />} />

                    {/* Stock Routes */}
                    <Route path="movements" element={<StockMovementsPage />} />
                    <Route path="adjustments" element={<StockAdjustmentPage />} />
                    <Route path="transfers" element={<StockTransferPage />} />

                    {/* Suppliers Routes */}
                    <Route path="suppliers" element={<SuppliersListPage />} />
                    <Route path="suppliers/new" element={<SupplierFormPage />} />
                    <Route path="suppliers/:id/edit" element={<SupplierFormPage />} />

                    {/* Purchase Orders Routes */}
                    <Route path="purchase-orders" element={<PurchaseOrdersListPage />} />
                    <Route path="purchase-orders/new" element={<PurchaseOrderFormPage />} />
                    <Route path="purchase-orders/:id" element={<PurchaseOrderFormPage />} />

                    {/* Shipments Routes */}
                    <Route path="shipments" element={<ShipmentsListPage />} />

                    {/* Procurement Routes */}
                    <Route path="purchase-requisitions" element={<PurchaseRequisitionsPage />} />
                    <Route path="grn" element={<GRNPage />} />

                    {/* Backorders */}
                    <Route path="backorders" element={<BackordersPage />} />

                    {/* Commission */}
                    <Route path="commission" element={<CommissionPage />} />

                    {/* Reports Routes */}
                    <Route path="valuation" element={<ValuationPage />} />
                    <Route path="expiry-alerts" element={<ExpiryAlertsPage />} />
                    <Route path="aging" element={<AgingReportPage />} />
                </Route>
            </Routes>
        </AppProvider>
    );
}
