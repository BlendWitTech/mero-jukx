import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import MeroKhataLayout from './layouts/MeroKhataLayout';

const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const CustomersPage = lazy(() => import('./pages/CustomersPage'));
const CustomerDetailsPage = lazy(() => import('./pages/CustomerDetailsPage'));
const BankReconciliationPage = lazy(() => import('./pages/BankReconciliationPage'));
const IncomePage = lazy(() => import('./pages/IncomePage'));
const ExpensePage = lazy(() => import('./pages/ExpensePage'));
const InvoicesPage = lazy(() => import('./pages/InvoicesPage'));
const BillsPage = lazy(() => import('./pages/BillsPage'));
const VATPage = lazy(() => import('./pages/VATPage'));
const ReportsPage = lazy(() => import('./pages/ReportsPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));

const Loading = ({ label }: { label: string }) => (
    <div className="p-8 text-slate-400">Loading {label}...</div>
);

interface MeroKhataRouterProps {
    appSlug: string;
}

export default function MeroKhataRouter({ appSlug }: MeroKhataRouterProps) {
    return (
        <Routes>
            <Route element={<MeroKhataLayout />}>
                <Route index element={
                    <Suspense fallback={<Loading label="Dashboard" />}>
                        <DashboardPage appSlug={appSlug} />
                    </Suspense>
                } />
                <Route path="customers" element={
                    <Suspense fallback={<Loading label="Customers" />}>
                        <CustomersPage />
                    </Suspense>
                } />
                <Route path="customers/:id" element={
                    <Suspense fallback={<Loading label="Customer Details" />}>
                        <CustomerDetailsPage appSlug={appSlug} />
                    </Suspense>
                } />
                <Route path="income" element={
                    <Suspense fallback={<Loading label="Income" />}>
                        <IncomePage />
                    </Suspense>
                } />
                <Route path="expenses" element={
                    <Suspense fallback={<Loading label="Expenses" />}>
                        <ExpensePage />
                    </Suspense>
                } />
                <Route path="invoices" element={
                    <Suspense fallback={<Loading label="Invoices" />}>
                        <InvoicesPage />
                    </Suspense>
                } />
                <Route path="bills" element={
                    <Suspense fallback={<Loading label="Bills" />}>
                        <BillsPage />
                    </Suspense>
                } />
                <Route path="vat" element={
                    <Suspense fallback={<Loading label="VAT Summary" />}>
                        <VATPage />
                    </Suspense>
                } />
                <Route path="bank-reconciliation" element={
                    <Suspense fallback={<Loading label="Bank Reconciliation" />}>
                        <BankReconciliationPage />
                    </Suspense>
                } />
                <Route path="reports" element={
                    <Suspense fallback={<Loading label="Reports" />}>
                        <ReportsPage />
                    </Suspense>
                } />
                <Route path="settings" element={
                    <Suspense fallback={<Loading label="Settings" />}>
                        <SettingsPage />
                    </Suspense>
                } />
                <Route path="*" element={<Navigate to="" replace />} />
            </Route>
        </Routes>
    );
}
