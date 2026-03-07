import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { Loader2, AlertCircle, Minimize2, X } from 'lucide-react';
import { marketplaceService } from '../../services/marketplaceService';
import { useEffect, useState, useRef } from 'react';
import LockScreen from '../../components/LockScreen';
import {
  getAppSession,
  setAppSession,
  removeAppSession,
  updateAppActivity,
  isAppSessionValid
} from '../../services/appSessionService';
import { getAppNameFromSubdomain, isAppSpecificUrl } from '../../utils/appRouting';
import { useTheme } from '../../contexts/ThemeContext';
import { ConfirmDialog } from '@shared/components/feedback/ConfirmDialog';
import React, { Suspense, lazy } from 'react';

// Lazy load app routers
const MeroBoardRouter = lazy(() => import('@apps/mero-board/MeroBoardRouter'));
const MeroSaaSKitRouter = lazy(() => import('@apps/mero-saas-kit/MeroSaaSKitRouter'));
const MeroCrmRouter = lazy(() => import('@crm/MeroCrmRouter'));
const MeroSocialRouter = lazy(() => import('@apps/mero-social/MeroSocialRouter'));
const MeroInventoryRouter = lazy(() => import('@inventory/MeroInventoryRouter'));
const MeroAccountingRouter = lazy(() => import('@accounting/MeroAccountingRouter'));
const MeroKhataRouter = lazy(() => import('@khata/MeroKhataRouter'));
const MeroHrRouter = lazy(() => import('@hr/MeroHrRouter'));
const MeroCmsRouter = lazy(() => import('@cms/MeroCmsRouter'));



interface AppViewPageProps {
  appSlug?: string;
}

export default function AppViewPage({ appSlug: propAppSlug }: AppViewPageProps = {}) {
  const { appSlug: paramAppSlug } = useParams<{ appSlug: string }>();
  const appSlug = propAppSlug || paramAppSlug;
  const { organization, user } = useAuthStore();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const [hasAppSession, setHasAppSession] = useState(false);
  const [needsReauth, setNeedsReauth] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const activityIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch app details by slug (must be before appIdNum is used)
  // System-admin uses a different endpoint (not marketplace)
  const { data: app, isLoading, error } = useQuery({
    queryKey: ['app', appSlug],
    queryFn: async () => {
      if (!appSlug) throw new Error('Invalid app slug');

      // Try to fetch by slug first
      try {
        const response = await api.get(`/marketplace/apps/slug/${appSlug}`);
        const appData = response.data;
        if (appData?.id) {
          localStorage.setItem('last_opened_app_id', appData.id.toString());
        }
        return appData;
      } catch (err: any) {
        // Fallback: fetch all and find by slug
        const response = await api.get('/marketplace/apps');
        const apps = response.data.data || response.data || [];
        const foundApp = apps.find((a: any) => a.slug === appSlug);
        if (!foundApp) throw new Error('App not found');
        if (foundApp.id) {
          localStorage.setItem('last_opened_app_id', foundApp.id.toString());
        }
        return foundApp;
      }
    },
    enabled: !!appSlug,
  });

  // Define appIdNum after app is fetched
  const appIdNum = app?.id || null;

  // Check for existing app session token and validate timeout
  useEffect(() => {
    if (!appIdNum) return;

    // Set last opened app ID for API interceptor
    localStorage.setItem('last_opened_app_id', appIdNum.toString());

    // Clean up expired sessions
    const token = getAppSession(appIdNum);
    if (token && isAppSessionValid(appIdNum)) {
      setHasAppSession(true);
      setNeedsReauth(false);
      updateAppActivity(appIdNum);

      // Ensure app is in taskbar if session is valid
      if (app) {
        syncTaskbarApps(appIdNum, app);
      }
    } else {
      setHasAppSession(false);
      removeAppSession(appIdNum);
    }
  }, [appIdNum, app]);

  // Track user activity in the app (mouse movements, clicks, keyboard)
  useEffect(() => {
    if (!appIdNum || !hasAppSession) return;

    const handleActivity = () => {
      updateAppActivity(appIdNum);
    };

    // Update activity on user interactions
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    events.forEach((event) => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    // Also update activity periodically (every 5 minutes) to ensure it stays active
    activityIntervalRef.current = setInterval(() => {
      if (isAppSessionValid(appIdNum)) {
        updateAppActivity(appIdNum);
      } else {
        // Session expired, require re-auth
        setHasAppSession(false);
        setNeedsReauth(true);
      }
    }, 5 * 60 * 1000); // Check every 5 minutes

    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
      if (activityIntervalRef.current) {
        clearInterval(activityIntervalRef.current);
      }
    };
  }, [appIdNum, hasAppSession]);

  // Fetch user data to check MFA status
  const { data: userData } = useQuery({
    queryKey: ['user-me'],
    queryFn: async () => {
      const response = await api.get('/users/me');
      return response.data;
    },
    enabled: !!appIdNum,
  });

  const hasMfa = userData?.mfa_enabled || userData?.has_mfa || false;

  // Removed subscription requirement - all organization members can access apps
  const hasAccess = true;

  // Check if authentication is needed when app loads
  useEffect(() => {
    if (appIdNum && !isLoading) {
      // Check if session is valid (not expired)
      if (!isAppSessionValid(appIdNum)) {
        setHasAppSession(false);
        setNeedsReauth(true);
      } else {
        const token = getAppSession(appIdNum);
        if (token) {
          setHasAppSession(true);
          setNeedsReauth(false);
          // Token is now handled by API interceptor dynamically based on URL
        } else {
          setHasAppSession(false);
          setNeedsReauth(true);
        }
      }
    }
  }, [appIdNum, hasAccess, isLoading]);

  // Helper to sync app with taskbar_apps
  const syncTaskbarApps = (id: number, appInfo: any) => {
    if (!id || !appInfo) return;

    try {
      const storedApps = localStorage.getItem('taskbar_apps');
      const apps: any[] = storedApps ? JSON.parse(storedApps) : [];
      const appExistsIndex = apps.findIndex(a => a.id === id);

      if (appExistsIndex === -1) {
        apps.push({
          id,
          name: appInfo.name,
          slug: appInfo.slug,
          icon: appInfo.icon_url,
          isMinimized: false,
          isPinned: false
        });
        localStorage.setItem('taskbar_apps', JSON.stringify(apps));
      } else {
        const updated = [...apps];
        updated[appExistsIndex] = {
          ...updated[appExistsIndex],
          name: appInfo.name,
          slug: appInfo.slug,
          icon: appInfo.icon_url,
          isMinimized: false
        };
        localStorage.setItem('taskbar_apps', JSON.stringify(updated));
      }
    } catch (e) {
      console.error('Error syncing taskbar_apps:', e);
    }
  };

  // Record app usage and add to taskbar when app is opened
  // Only add if app has an active session (not just when component mounts)
  useEffect(() => {
    if (appIdNum && hasAppSession && app) {
      marketplaceService.recordUsage(appIdNum).catch(console.error);

      // Check if app session is actually valid before adding to taskbar
      if (isAppSessionValid(appIdNum)) {
        syncTaskbarApps(appIdNum, app);
      }
    }
  }, [appIdNum, hasAppSession, app]);

  // Handler functions (must be defined before early returns)
  const handleAuthSuccess = (token: string) => {
    if (appIdNum && token && app) {
      // Set last opened app ID for API interceptor
      localStorage.setItem('last_opened_app_id', appIdNum.toString());

      // Synchronously update taskbar_apps before setting state to avoid race condition in interceptor
      syncTaskbarApps(appIdNum, app);

      setAppSession(appIdNum, token);
      setHasAppSession(true);
      setNeedsReauth(false);
      updateAppActivity(appIdNum);
      // App is now authenticated and will automatically load
    }
  };

  const handleMinimize = () => {
    if (appIdNum && app) {
      // Update taskbar to mark app as minimized
      const storedApps = localStorage.getItem('taskbar_apps');
      const apps: any[] = storedApps ? JSON.parse(storedApps) : [];
      const updated = apps.map(a =>
        a.id === appIdNum ? { ...a, isMinimized: true } : a
      );
      localStorage.setItem('taskbar_apps', JSON.stringify(updated));

      // Navigate to dashboard
      navigate(`/org/${organization?.slug || ''}`);
    }
  };

  const handleClose = () => {
    setShowCloseConfirm(true);
  };

  const handleConfirmClose = () => {
    if (appIdNum) {
      // Remove app session
      removeAppSession(appIdNum);

      // Remove from taskbar (only if not pinned to taskbar)
      const storedApps = localStorage.getItem('taskbar_apps');
      const apps: any[] = storedApps ? JSON.parse(storedApps) : [];
      const appToRemove = apps.find(a => a.id === appIdNum);

      let updated: any[];
      if (appToRemove?.isPinned) {
        // If pinned to taskbar, keep it but mark as minimized
        updated = apps.map(a =>
          a.id === appIdNum ? { ...a, isMinimized: true } : a
        );
      } else {
        // If not pinned to taskbar, remove completely
        updated = apps.filter(a => a.id !== appIdNum);
      }
      localStorage.setItem('taskbar_apps', JSON.stringify(updated));

      // Dispatch custom event to notify taskbar
      window.dispatchEvent(new CustomEvent('app-closed', { detail: { appId: appIdNum } }));

      setHasAppSession(false);
      setNeedsReauth(true);
      delete api.defaults.headers.common['X-App-Session'];

      // Navigate to dashboard
      navigate(`/org/${organization?.slug || ''}`);
    }
    setShowCloseConfirm(false);
  };

  const handleCancelClose = () => {
    setShowCloseConfirm(false);
  };

  const handleLogout = () => {
    if (appIdNum) {
      // Remove app session
      removeAppSession(appIdNum);

      // Remove from taskbar (only if not pinned to taskbar)
      const storedApps = localStorage.getItem('taskbar_apps');
      const apps: any[] = storedApps ? JSON.parse(storedApps) : [];
      const appToRemove = apps.find(a => a.id === appIdNum);

      let updated: any[];
      if (appToRemove?.isPinned) {
        // If pinned to taskbar, keep it but mark as minimized
        updated = apps.map(a =>
          a.id === appIdNum ? { ...a, isMinimized: true } : a
        );
      } else {
        // If not pinned to taskbar, remove completely
        updated = apps.filter(a => a.id !== appIdNum);
      }
      localStorage.setItem('taskbar_apps', JSON.stringify(updated));

      // Dispatch custom event to notify taskbar
      window.dispatchEvent(new CustomEvent('app-closed', { detail: { appId: appIdNum } }));

      setHasAppSession(false);
      setNeedsReauth(true);
    }
  };

  // Early returns AFTER all hooks
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full" style={{ backgroundColor: theme.colors.background }}>
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: theme.colors.primary }} />
      </div>
    );
  }

  if (error || !app) {
    return (
      <div className="flex items-center justify-center h-full" style={{ backgroundColor: theme.colors.background }}>
        <div className="text-center">
          <AlertCircle className="h-16 w-16 mx-auto mb-4" style={{ color: theme.colors.primary }} />
          <h2 className="text-2xl font-bold mb-2" style={{ color: theme.colors.text }}>App Not Found</h2>
          <p style={{ color: theme.colors.textSecondary }}>The app you're looking for doesn't exist or you don't have access to it.</p>
        </div>
      </div>
    );
  }

  // Removed subscription check - all organization members can access apps

  // Mero SaaS Kit - Coming Soon (no authentication required)
  if (app?.slug === 'mero-saas-kit') {
    return (
      <>
        <div className="h-full w-full flex flex-col overflow-hidden" style={{ backgroundColor: theme.colors.background }}>
          <div className="flex-1 overflow-hidden">
            <Suspense fallback={
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 animate-spin" style={{ color: theme.colors.primary }} />
              </div>
            }>
              <MeroSaaSKitRouter appId={appIdNum!} />
            </Suspense>
          </div>
        </div>
      </>
    );
  }

  // Show locked screen if no session token or needs re-auth
  if (!hasAppSession || needsReauth) {
    return (
      <LockScreen
        onSuccess={handleAuthSuccess}
        appName={app?.name || 'App'}
        hasMfa={hasMfa}
        userEmail={user?.email || ''}
        appId={appIdNum || undefined}
        organizationName={organization?.name}
      />
    );
  }

  // Load the appropriate app component based on slug
  // Apps should be created separately and loaded here based on app slug


  if (app?.slug === 'mero-board' && hasAppSession) {
    return (
      <>
        <div className="h-full w-full flex flex-col overflow-hidden" style={{ backgroundColor: theme.colors.background }}>
          {/* Header removed - now handled by layout */}
          <div className="flex-1 overflow-hidden">
            <Suspense fallback={
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 animate-spin" style={{ color: theme.colors.primary }} />
              </div>
            }>
              <MeroBoardRouter appSlug={appSlug!} />
            </Suspense>
          </div>
        </div>
        <ConfirmDialog
          isOpen={showCloseConfirm}
          onClose={handleCancelClose}
          onConfirm={handleConfirmClose}
          title="Close App"
          message={`Are you sure you want to close "${app.name}"? This will remove the app from the taskbar.`}
          confirmText="Close"
          cancelText="Cancel"
          variant="warning"
        />
      </>
    );
  }

  if (app?.slug === 'mero-crm' && hasAppSession) {
    return (
      <>
        <div className="h-full w-full flex flex-col overflow-hidden" style={{ backgroundColor: theme.colors.background }}>
          <div className="flex-1 overflow-hidden">
            <Suspense fallback={
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 animate-spin" style={{ color: theme.colors.primary }} />
              </div>
            }>
              <MeroCrmRouter appSlug={appSlug!} />
            </Suspense>
          </div>
        </div>
        <ConfirmDialog
          isOpen={showCloseConfirm}
          onClose={handleCancelClose}
          onConfirm={handleConfirmClose}
          title="Close App"
          message={`Are you sure you want to close "${app.name}"? This will remove the app from the taskbar.`}
          confirmText="Close"
          cancelText="Cancel"
          variant="warning"
        />
      </>
    );
  }


  if (app?.slug === 'mero-social' && hasAppSession) {
    return (
      <>
        <div className="h-full w-full flex flex-col overflow-hidden" style={{ backgroundColor: theme.colors.background }}>
          <div className="flex-1 overflow-hidden">
            <Suspense fallback={
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 animate-spin" style={{ color: theme.colors.primary }} />
              </div>
            }>
              <MeroSocialRouter appSlug={appSlug!} />
            </Suspense>
          </div>
        </div>
        <ConfirmDialog
          isOpen={showCloseConfirm}
          onClose={handleCancelClose}
          onConfirm={handleConfirmClose}
          title="Close App"
          message={`Are you sure you want to close "${app.name}"? This will remove the app from the taskbar.`}
          confirmText="Close"
          cancelText="Cancel"
          variant="warning"
        />
      </>
    );
  }

  if (app?.slug === 'mero-inventory' && hasAppSession) {
    return (
      <>
        <div className="h-full w-full flex flex-col overflow-hidden" style={{ backgroundColor: theme.colors.background }}>
          <div className="flex-1 overflow-hidden">
            <Suspense fallback={
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 animate-spin" style={{ color: theme.colors.primary }} />
              </div>
            }>
              <MeroInventoryRouter appSlug={appSlug!} />
            </Suspense>
          </div>
        </div>
        <ConfirmDialog
          isOpen={showCloseConfirm}
          onClose={handleCancelClose}
          onConfirm={handleConfirmClose}
          title="Close App"
          message={`Are you sure you want to close "${app.name}"? This will remove the app from the taskbar.`}
          confirmText="Close"
          cancelText="Cancel"
          variant="warning"
        />
      </>
    );
  }

  if (app?.slug === 'mero-khata' && hasAppSession) {
    return (
      <>
        <div className="h-full w-full flex flex-col overflow-hidden" style={{ backgroundColor: theme.colors.background }}>
          <div className="flex-1 overflow-hidden">
            <Suspense fallback={
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 animate-spin" style={{ color: theme.colors.primary }} />
              </div>
            }>
              <MeroKhataRouter appSlug={appSlug!} />
            </Suspense>
          </div>
        </div>
        <ConfirmDialog
          isOpen={showCloseConfirm}
          onClose={handleCancelClose}
          onConfirm={handleConfirmClose}
          title="Close App"
          message={`Are you sure you want to close "${app.name}"? This will remove the app from the taskbar.`}
          confirmText="Close"
          cancelText="Cancel"
          variant="warning"
        />
      </>
    );
  }

  if (app?.slug === 'mero-accounting' && hasAppSession) {
    return (
      <>
        <div className="h-full w-full flex flex-col overflow-hidden" style={{ backgroundColor: theme.colors.background }}>
          <div className="flex-1 overflow-hidden">
            <Suspense fallback={
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 animate-spin" style={{ color: theme.colors.primary }} />
              </div>
            }>
              <MeroAccountingRouter appSlug={appSlug!} />
            </Suspense>
          </div>
        </div>
        <ConfirmDialog
          isOpen={showCloseConfirm}
          onClose={handleCancelClose}
          onConfirm={handleConfirmClose}
          title="Close App"
          message={`Are you sure you want to close "${app.name}"? This will remove the app from the taskbar.`}
          confirmText="Close"
          cancelText="Cancel"
          variant="warning"
        />
      </>
    );
  }

  if (app?.slug === 'mero-hr' && hasAppSession) {
    return (
      <>
        <div className="h-full w-full flex flex-col overflow-hidden" style={{ backgroundColor: theme.colors.background }}>
          <div className="flex-1 overflow-hidden">
            <Suspense fallback={
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 animate-spin" style={{ color: theme.colors.primary }} />
              </div>
            }>
              <MeroHrRouter appSlug={appSlug!} />
            </Suspense>
          </div>
        </div>
        <ConfirmDialog
          isOpen={showCloseConfirm}
          onClose={handleCancelClose}
          onConfirm={handleConfirmClose}
          title="Close App"
          message={`Are you sure you want to close "${app.name}"? This will remove the app from the taskbar.`}
          confirmText="Close"
          cancelText="Cancel"
          variant="warning"
        />
      </>
    );
  }

  if (app?.slug === 'mero-cms' && hasAppSession) {
    return (
      <>
        <div className="h-full w-full flex flex-col overflow-hidden" style={{ backgroundColor: theme.colors.background }}>
          <div className="flex-1 overflow-hidden">
            <Suspense fallback={
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 animate-spin" style={{ color: theme.colors.primary }} />
              </div>
            }>
              <MeroCmsRouter appSlug={appSlug!} />
            </Suspense>
          </div>
        </div>
        <ConfirmDialog
          isOpen={showCloseConfirm}
          onClose={handleCancelClose}
          onConfirm={handleConfirmClose}
          title="Close App"
          message={`Are you sure you want to close "${app.name}"? This will remove the app from the taskbar.`}
          confirmText="Close"
          cancelText="Cancel"
          variant="warning"
        />
      </>
    );
  }

  // Default placeholder for other apps
  return (
    <>
      <div className="h-full w-full flex flex-col overflow-hidden" style={{ backgroundColor: theme.colors.background }}>
        {/* Header removed - now handled by layout */}
        {/* App Content */}
        <div className="flex-1 overflow-auto">
          <div className="h-full p-6">
            <div
              className="rounded-lg p-8 border text-center"
              style={{
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border
              }}
            >
              <h2 className="text-xl font-semibold mb-4" style={{ color: theme.colors.text }}>
                App Interface
              </h2>
              <p style={{ color: theme.colors.textSecondary }}>
                The app interface for {app.name} will be loaded here. This is a placeholder for the actual app component.
                <br />
                Create your app component and load it based on the app slug: <code style={{ color: theme.colors.primary }}>{app.slug}</code>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Close Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showCloseConfirm}
        onClose={handleCancelClose}
        onConfirm={handleConfirmClose}
        title="Close App"
        message={`Are you sure you want to close "${app.name}"? This will remove the app from the taskbar.`}
        confirmText="Close"
        cancelText="Cancel"
        variant="warning"
        theme={theme}
      />
    </>
  );
}

