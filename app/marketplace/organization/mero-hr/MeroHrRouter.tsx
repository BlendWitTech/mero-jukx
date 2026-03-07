import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import MeroHrLayout from './layouts/MeroHrLayout';

const EmployeesPage = lazy(() => import('./pages/EmployeesPage'));
const AttendancePage = lazy(() => import('./pages/AttendancePage'));
const LeavePage = lazy(() => import('./pages/LeavePage'));
const PayrollPage = lazy(() => import('./pages/PayrollPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const DepartmentsPage = lazy(() => import('./pages/DepartmentsPage'));
const DesignationsPage = lazy(() => import('./pages/DesignationsPage'));
const OrgChartPage = lazy(() => import('./pages/OrgChartPage'));
const ReportsPage = lazy(() => import('./pages/ReportsPage'));
const ShiftsPage = lazy(() => import('./pages/ShiftsPage'));
const HolidaysPage = lazy(() => import('./pages/HolidaysPage'));
const RecruitmentPage = lazy(() => import('./pages/RecruitmentPage'));
const PerformancePage = lazy(() => import('./pages/PerformancePage'));
const TrainingPage = lazy(() => import('./pages/TrainingPage'));
const ExitManagementPage = lazy(() => import('./pages/ExitManagementPage'));
const SelfServicePage = lazy(() => import('./pages/SelfServicePage'));

interface MeroHrRouterProps {
    appSlug: string;
}

export default function MeroHrRouter({ appSlug }: MeroHrRouterProps) {
    return (
        <Routes>
            <Route element={<MeroHrLayout />}>
                <Route index element={
                    <Suspense fallback={<div className="p-8 text-slate-400">Loading HR Dashboard...</div>}>
                        <DashboardPage />
                    </Suspense>
                } />
                <Route path="employees" element={
                    <Suspense fallback={<div className="p-8 text-slate-400">Loading Employees...</div>}>
                        <EmployeesPage />
                    </Suspense>
                } />
                <Route path="attendance" element={
                    <Suspense fallback={<div className="p-8 text-slate-400">Loading Attendance...</div>}>
                        <AttendancePage />
                    </Suspense>
                } />
                <Route path="leave" element={
                    <Suspense fallback={<div className="p-8 text-slate-400">Loading Leave Requests...</div>}>
                        <LeavePage />
                    </Suspense>
                } />
                <Route path="payroll" element={
                    <Suspense fallback={<div className="p-8 text-slate-400">Loading Payroll...</div>}>
                        <PayrollPage />
                    </Suspense>
                } />
                <Route path="departments" element={
                    <Suspense fallback={<div className="p-8 text-slate-400">Loading Departments...</div>}>
                        <DepartmentsPage />
                    </Suspense>
                } />
                <Route path="designations" element={
                    <Suspense fallback={<div className="p-8 text-slate-400">Loading Designations...</div>}>
                        <DesignationsPage />
                    </Suspense>
                } />
                <Route path="org-chart" element={
                    <Suspense fallback={<div className="p-8 text-slate-400">Loading Organization Chart...</div>}>
                        <OrgChartPage />
                    </Suspense>
                } />
                <Route path="reports" element={
                    <Suspense fallback={<div className="p-8 text-slate-400">Loading Reports...</div>}>
                        <ReportsPage />
                    </Suspense>
                } />
                <Route path="shifts" element={
                    <Suspense fallback={<div className="p-8 text-slate-400">Loading Shifts...</div>}>
                        <ShiftsPage />
                    </Suspense>
                } />
                <Route path="holidays" element={
                    <Suspense fallback={<div className="p-8 text-slate-400">Loading Holidays...</div>}>
                        <HolidaysPage />
                    </Suspense>
                } />
                <Route path="recruitment" element={
                    <Suspense fallback={<div className="p-8 text-slate-400">Loading Recruitment...</div>}>
                        <RecruitmentPage />
                    </Suspense>
                } />
                <Route path="performance" element={
                    <Suspense fallback={<div className="p-8 text-slate-400">Loading Performance...</div>}>
                        <PerformancePage />
                    </Suspense>
                } />
                <Route path="training" element={
                    <Suspense fallback={<div className="p-8 text-slate-400">Loading Training...</div>}>
                        <TrainingPage />
                    </Suspense>
                } />
                <Route path="exit" element={
                    <Suspense fallback={<div className="p-8 text-slate-400">Loading Exit Management...</div>}>
                        <ExitManagementPage />
                    </Suspense>
                } />
                <Route path="self-service" element={
                    <Suspense fallback={<div className="p-8 text-slate-400">Loading Self Service...</div>}>
                        <SelfServicePage />
                    </Suspense>
                } />
                <Route path="*" element={<Navigate to="" replace />} />
            </Route>
        </Routes>
    );
}
