import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import MeroCmsLayout from './layouts/MeroCmsLayout';

const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const PagesPage = lazy(() => import('./pages/PagesPage'));
const PostsPage = lazy(() => import('./pages/PostsPage'));
const MediaPage = lazy(() => import('./pages/MediaPage'));
const FormsPage = lazy(() => import('./pages/FormsPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));

interface MeroCmsRouterProps {
    appSlug: string;
}

const Loader = ({ label }: { label: string }) => (
    <div className="p-8 text-slate-400">Loading {label}...</div>
);

export default function MeroCmsRouter({ appSlug }: MeroCmsRouterProps) {
    return (
        <Routes>
            <Route element={<MeroCmsLayout />}>
                <Route index element={
                    <Suspense fallback={<Loader label="Dashboard" />}>
                        <DashboardPage />
                    </Suspense>
                } />
                <Route path="pages" element={
                    <Suspense fallback={<Loader label="Pages" />}>
                        <PagesPage />
                    </Suspense>
                } />
                <Route path="posts" element={
                    <Suspense fallback={<Loader label="Posts" />}>
                        <PostsPage />
                    </Suspense>
                } />
                <Route path="media" element={
                    <Suspense fallback={<Loader label="Media" />}>
                        <MediaPage />
                    </Suspense>
                } />
                <Route path="forms" element={
                    <Suspense fallback={<Loader label="Forms" />}>
                        <FormsPage />
                    </Suspense>
                } />
                <Route path="settings" element={
                    <Suspense fallback={<Loader label="Settings" />}>
                        <SettingsPage />
                    </Suspense>
                } />
                <Route path="*" element={<Navigate to="" replace />} />
            </Route>
        </Routes>
    );
}
