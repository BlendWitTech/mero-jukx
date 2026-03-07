import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import MeroAccountingLayout from './layouts/MeroAccountingLayout';
// import DashboardPage from './pages/DashboardPage'; // This will be lazy loaded now

const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const AccountsPage = lazy(() => import('./pages/AccountsPage'));
const JournalEntriesPage = lazy(() => import('./pages/JournalEntriesPage'));
const ReportsPage = lazy(() => import('./pages/ReportsPage'));
const VendorsPage = lazy(() => import('./pages/VendorsPage'));
const PurchaseInvoicesPage = lazy(() => import('./pages/PurchaseInvoicesPage'));
const CustomersPage = lazy(() => import('./pages/CustomersPage'));
const SalesInvoicesPage = lazy(() => import('./pages/SalesInvoicesPage'));
const BankingPage = lazy(() => import('./pages/BankingPage'));
const FixedAssetsPage = lazy(() => import('./pages/FixedAssetsPage'));
const TaxCompliancePage = lazy(() => import('./pages/TaxCompliancePage'));
const AuditLogPage = lazy(() => import('./pages/AuditLogPage'));
const BudgetsPage = lazy(() => import('./pages/BudgetsPage'));
const YearEndClosingPage = lazy(() => import('./pages/YearEndClosingPage'));

interface MeroAccountingRouterProps {
    appSlug: string;
}

export default function MeroAccountingRouter({ appSlug }: MeroAccountingRouterProps) {
    return (
        <Routes>
            <Route element={<MeroAccountingLayout />}>
                <Route index element={
                    <Suspense fallback={<div className="p-8 text-slate-400">Loading Dashboard...</div>}>
                        <DashboardPage />
                    </Suspense>
                } />
                <Route path="accounts" element={
                    <Suspense fallback={<div className="p-8 text-slate-400">Loading Accounts...</div>}>
                        <AccountsPage />
                    </Suspense>
                } />
                <Route path="tax-compliance" element={
                    <Suspense fallback={<div className="p-8 text-slate-400">Loading Tax...</div>}>
                        <TaxCompliancePage />
                    </Suspense>
                } />
                <Route path="banking" element={
                    <Suspense fallback={<div className="p-8 text-slate-400">Loading Banking...</div>}>
                        <BankingPage />
                    </Suspense>
                } />
                <Route path="fixed-assets" element={
                    <Suspense fallback={<div className="p-8 text-slate-400">Loading Assets...</div>}>
                        <FixedAssetsPage />
                    </Suspense>
                } />
                <Route path="customers" element={
                    <Suspense fallback={<div className="p-8 text-slate-400">Loading Customers...</div>}>
                        <CustomersPage />
                    </Suspense>
                } />
                <Route path="sales-invoices" element={
                    <Suspense fallback={<div className="p-8 text-slate-400">Loading Invoices...</div>}>
                        <SalesInvoicesPage />
                    </Suspense>
                } />
                <Route path="vendors" element={
                    <Suspense fallback={<div className="p-8 text-slate-400">Loading Vendors...</div>}>
                        <VendorsPage />
                    </Suspense>
                } />
                <Route path="purchase-invoices" element={
                    <Suspense fallback={<div className="p-8 text-slate-400">Loading Bills...</div>}>
                        <PurchaseInvoicesPage />
                    </Suspense>
                } />
                <Route path="journal-entries" element={
                    <Suspense fallback={<div className="p-8 text-slate-400">Loading Journal Entries...</div>}>
                        <JournalEntriesPage />
                    </Suspense>
                } />
                <Route path="reports" element={
                    <Suspense fallback={<div className="p-8 text-slate-400">Loading Reports...</div>}>
                        <ReportsPage />
                    </Suspense>
                } />
                <Route path="activity-log" element={
                    <Suspense fallback={<div className="p-8 text-slate-400">Loading Activity Log...</div>}>
                        <AuditLogPage />
                    </Suspense>
                } />
                <Route path="budgets" element={
                    <Suspense fallback={<div className="p-8 text-slate-400">Loading Budgets...</div>}>
                        <BudgetsPage />
                    </Suspense>
                } />
                <Route path="year-end-closing" element={
                    <Suspense fallback={<div className="p-8 text-slate-400">Loading Year-End Closing...</div>}>
                        <YearEndClosingPage />
                    </Suspense>
                } />
                <Route path="*" element={<Navigate to="" replace />} />
            </Route>
        </Routes>
    );
}
