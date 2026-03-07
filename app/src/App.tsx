import { Routes, Route, Navigate, useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { useEffect, useState } from 'react';
import LoginPage from './pages/auth/LoginPage';
import RoleSelectionPage from './pages/auth/RoleSelectionPage';
import RegisterOrganizationPage from './pages/auth/RegisterOrganizationPage';
import OrganizationDashboardLayout from './layouts/OrganizationDashboardLayout';
import DashboardPage from './pages/dashboard/DashboardPage';
import UsersPage from './pages/users/UsersPage';
import OrganizationsPage from './pages/organizations/OrganizationsPage';
import InvitationsPage from './pages/invitations/InvitationsPage';
import RolesPage from './pages/roles/RolesPage';
import PermissionsReviewPage from './pages/roles/PermissionsReviewPage';
import PackagesPage from './pages/packages/PackagesPage';
import AppsPage from './pages/apps/AppsPage';
import AppInvitationsPage from './pages/apps/AppInvitationsPage';
import SettingsPage from './pages/settings/SettingsPage';
import ProfilePage from './pages/profile/ProfilePage';
import MfaSetupPage from './pages/mfa/MfaSetupPage';
import VerifyEmailPage from './pages/auth/VerifyEmailPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import AcceptInvitationPage from './pages/invitations/AcceptInvitationPage';
import AuditLogsPage from './pages/audit-logs/AuditLogsPage';
import NotificationsPage from './pages/notifications/NotificationsPage';
import PaymentSuccessPage from './pages/payment/PaymentSuccessPage';
import PaymentFailurePage from './pages/payment/PaymentFailurePage';
import MockEsewaPage from './pages/payment/MockEsewaPage';
import ChatPage from './pages/chat/ChatPage';
import AdminChatPage from './pages/admin-chat/AdminChatPage';
import AnalyticsPage from './pages/analytics/AnalyticsPage';
import TicketsPage from './pages/tickets/TicketsPage';
import CreateTicketPage from './pages/tickets/CreateTicketPage';
import TicketDetailPage from './pages/tickets/TicketDetailPage';
import AppViewPage from './pages/apps/AppViewPage';
import ComingSoonPage from './pages/creator/ComingSoonPage';
import BillingPage from './pages/billing/BillingPage';
import WorkflowsPage from './pages/workflows/WorkflowsPage';
import WorkflowBuilderPage from './pages/workflows/WorkflowBuilderPage';
import CreatorPortalRouter from '@creator/CreatorPortalRouter';
import { OnboardingProvider } from './components/Onboarding/OnboardingProvider';
import ErrorBoundary from './components/ErrorBoundary';
import api from './services/api';
import { ProtectedRoute } from './components/ProtectedRoute';
import { getAppNameFromSubdomain, isAppSubdomain } from './config/urlConfig';

// Component to handle subdomain-based app routing OR normal dashboard
function SubdomainOrDashboardRoute() {
  // Always render OrganizationDashboardLayout - it handles both subdomain and path-based routing
  // It will show AppViewPage when on subdomain, and normal dashboard otherwise
  return <OrganizationDashboardLayout />;
}

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, accessToken, _hasHydrated } = useAuthStore();

  // Wait for hydration before checking authentication
  if (!_hasHydrated) {
    return <div className="min-h-screen flex items-center justify-center bg-[#36393f] text-white">Loading...</div>;
  }

  // Check both isAuthenticated flag and actual token presence
  // Redirect to role selection instead of login
  if (!isAuthenticated || !accessToken) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function NotFoundRoute() {
  const { isAuthenticated, accessToken, _hasHydrated, organization } = useAuthStore();

  // Wait for hydration before checking authentication
  if (!_hasHydrated) {
    return <div className="min-h-screen flex items-center justify-center bg-[#36393f] text-white">Loading...</div>;
  }

  // If not authenticated, redirect to role selection
  if (!isAuthenticated || !accessToken) {
    return <Navigate to="/" replace />;
  }

  // If authenticated, redirect to dashboard with organization slug
  if (organization?.slug) {
    return <Navigate to={`/org/${organization.slug}`} replace />;
  }

  return <Navigate to="/" replace />;
}

// Route wrapper to validate organization slug
function OrganizationRoute({ children }: { children: React.ReactNode }) {
  const { slug } = useParams<{ slug: string }>();
  const { organization, isAuthenticated, accessToken, _hasHydrated } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!_hasHydrated || !isAuthenticated || !accessToken) return;

    // Skip redirect if we're inside an app route (path contains /app/)
    const currentPath = window.location.pathname;
    if (currentPath.includes('/app/')) return;

    // If we have a slug in URL but it doesn't match current organization, fetch and redirect
    if (slug && organization?.slug && slug !== organization.slug) {
      // Fetch current organization to get the correct slug
      api.get('/organizations/me')
        .then((response) => {
          const currentOrg = response.data;
          if (currentOrg.slug && currentOrg.slug !== slug) {
            // Redirect to correct slug
            const newPath = currentPath.replace(`/org/${slug}`, `/org/${currentOrg.slug}`);
            navigate(newPath, { replace: true });
          }
        })
        .catch(() => {
          // If fetch fails, just redirect to root
          navigate('/', { replace: true });
        });
    } else if (!slug && organization?.slug) {
      // If no slug in URL but we have one, redirect to include it
      navigate(`/org/${organization.slug}${currentPath === '/' ? '' : currentPath}`, { replace: true });
    }
  }, [slug, organization?.slug, isAuthenticated, accessToken, _hasHydrated, navigate]);

  return <>{children}</>;
}

// Root route component - shows role selection for unauthenticated users, redirects for authenticated
function RootRoute() {
  const { isAuthenticated, accessToken, organization, _hasHydrated } = useAuthStore();
  const navigate = useNavigate();
  const [forceShow, setForceShow] = useState(false);

  // Fallback: if hydration takes too long, show the page anyway
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!_hasHydrated) {
        setForceShow(true);
      }
    }, 2000); // Wait max 2 seconds for hydration
    return () => clearTimeout(timer);
  }, [_hasHydrated]);

  useEffect(() => {
    // Only run redirect logic after hydration (or force show)
    if (!_hasHydrated && !forceShow) return;

    // Check if we're on an app subdomain and need to handle app-specific routing
    const appName = getAppNameFromSubdomain();

    if (appName && isAppSubdomain()) {
      // If on app subdomain and authenticated, ensure path doesn't include /app/appSlug
      if (isAuthenticated && accessToken && organization?.slug) {
        const currentPath = window.location.pathname;
        // Remove /app/{appName} from path if present (shouldn't be there on subdomain)
        if (currentPath.includes(`/app/${appName}`)) {
          const cleanedPath = currentPath.replace(`/app/${appName}`, '') || '/';
          navigate(cleanedPath, { replace: true });
          return;
        }
        // If path includes /apps/, remove it
        if (currentPath.includes('/apps/')) {
          const cleanedPath = currentPath.replace(/\/apps\/\d+/, '') || '/';
          navigate(cleanedPath, { replace: true });
          return;
        }
        // If path is just root, redirect to /org/{slug} for consistency
        if (currentPath === '/' || currentPath === '') {
          // Redirect to org dashboard on subdomain
          navigate(`/org/${organization.slug}`, { replace: true });
          return;
        }
        // Otherwise, ensure path starts with /org/{slug} for consistency
        if (!currentPath.startsWith('/org/')) {
          navigate(`/org/${organization.slug}${currentPath}`, { replace: true });
          return;
        }
        // Path is already correct for subdomain routing
        return;
      }
      // If not authenticated on app subdomain, redirect to login on app subdomain
      if (!isAuthenticated) {
        const currentPath = window.location.pathname;
        // Check if we're using localhost in development
        const env = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || /^\d+\.\d+\.\d+\.\d+$/.test(window.location.hostname);

        if (env && currentPath.includes('/org/') && (currentPath.includes('/app/') || currentPath.includes('/apps/'))) {
          // For localhost, login is on the same path structure
          // Extract org slug and app slug from path if available
          const pathMatch = currentPath.match(/\/org\/([^/]+)\/app\/([^/]+)/) || currentPath.match(/\/org\/([^/]+)\/apps\/(\d+)/);
          if (pathMatch) {
            const [, orgSlug, appIdentifier] = pathMatch;
            // Use new pattern with slug
            const returnPath = currentPath === '/' || currentPath === '' ? `/org/${orgSlug}/app/${appIdentifier}` : currentPath;
            const returnUrl = encodeURIComponent(`${window.location.protocol}//${window.location.host}${returnPath}`);
            window.location.href = `/org/${orgSlug}/app/${appIdentifier}/login?returnUrl=${returnUrl}`;
            return;
          }
        }

        // For dev.merojugx.com or production, redirect to app subdomain login
        // Build returnUrl with the full app subdomain URL
        const returnPath = currentPath === '/' || currentPath === '' ? `/org/${organization?.slug || ''}` : currentPath;
        const returnUrl = encodeURIComponent(`${window.location.protocol}//${window.location.host}${returnPath}`);
        // Redirect to login on the same subdomain (app subdomain)
        window.location.href = `/login?returnUrl=${returnUrl}`;
        return;
      }
    }

    // If authenticated, redirect to organization dashboard
    if (isAuthenticated && accessToken) {
      if (organization?.slug) {
        navigate(`/org/${organization.slug}`, { replace: true });
      } else {
        // If no organization slug, try to fetch it
        api.get('/organizations/me')
          .then((response) => {
            const org = response.data;
            if (org.slug) {
              navigate(`/org/${org.slug}`, { replace: true });
            }
          })
          .catch(() => {
            // If fetch fails, stay on role selection - don't redirect
          });
      }
    }
    // If not authenticated, show role selection (no redirect needed - component will render it)
  }, [isAuthenticated, accessToken, organization?.slug, _hasHydrated, forceShow, navigate]);

  // Show loading while checking authentication (but only for a short time)
  if (!_hasHydrated && !forceShow) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#36393f', color: '#ffffff' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  // If authenticated, show loading while redirecting
  if (isAuthenticated && accessToken) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#36393f', color: '#ffffff' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Redirecting...</p>
        </div>
      </div>
    );
  }

  // Show role selection for unauthenticated users
  // This should always render when not authenticated
  return <RoleSelectionPage />;
}

function App() {
  return (
    <ErrorBoundary>
      <OnboardingProvider>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterOrganizationPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/accept-invitation" element={<AcceptInvitationPage />} />
          <Route path="/mfa/setup" element={<MfaSetupPage />} />
          <Route path="/payment/success" element={<PaymentSuccessPage />} />
          <Route path="/payment/failure" element={<PaymentFailurePage />} />
          <Route path="/payment/mock-esewa" element={<MockEsewaPage />} />

          {/* Creator Routes */}
          <Route path="/creator/*" element={<CreatorPortalRouter />} />

          {/* Protected Routes with Organization Slug */}
          <Route
            path="/org/:slug/*"
            element={
              <PrivateRoute>
                <OrganizationRoute>
                  <SubdomainOrDashboardRoute />
                </OrganizationRoute>
              </PrivateRoute>
            }
          >
            <Route index element={<DashboardPage />} />
            <Route
              path="users"
              element={
                <ProtectedRoute requiredPermission="users.view" featureName="Users">
                  <UsersPage />
                </ProtectedRoute>
              }
            />
            <Route path="organizations" element={<OrganizationsPage />} />
            <Route
              path="invitations"
              element={
                <ProtectedRoute requiredPermission="invitations.view" featureName="Invitations">
                  <InvitationsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="roles"
              element={
                <ProtectedRoute requiredPermission="roles.view" featureName="Roles" restrictedForBranches={true}>
                  <RolesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="roles/permissions-review"
              element={
                <ProtectedRoute requiredPermission="roles.view" featureName="Permissions Review">
                  <PermissionsReviewPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="packages"
              element={
                <ProtectedRoute requiredPermission="packages.view" featureName="Packages" restrictedForBranches={true}>
                  <PackagesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="billing"
              element={
                <ProtectedRoute requiredPermission="packages.view" featureName="Billing" restrictedForBranches={true}>
                  <BillingPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="apps"
              element={
                <ProtectedRoute requiredPermission="apps.view" featureName="Apps">
                  <AppsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="apps/invitations"
              element={
                <ProtectedRoute requiredPermission="apps.view" featureName="App Invitations">
                  <AppInvitationsPage />
                </ProtectedRoute>
              }
            />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route
              path="audit-logs"
              element={
                <ProtectedRoute requiredPermission="audit.view" featureName="Audit Logs">
                  <AuditLogsPage />
                </ProtectedRoute>
              }
            />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route
              path="chat"
              element={
                <ProtectedRoute requiredPermission="chat.view" featureName="Chat">
                  <ChatPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="chat/admin"
              element={
                <ProtectedRoute requiredPermission="admin_chat.access" featureName="Admin Chat">
                  <AdminChatPage />
                </ProtectedRoute>
              }
            />
            {/* App routes - using slug instead of ID */}
            {/* Specific routes must come before the wildcard route */}
            <Route
              path="app/:appSlug/login"
              element={<LoginPage />}
            />
            <Route
              path="app/:appSlug/lock"
              element={<LoginPage />}
            />
            {/* Note: trailing /* is required for nested routes to work */}
            <Route
              path="app/:appSlug/*"
              element={
                <ProtectedRoute requiredPermission="apps.view" featureName="App View">
                  <AppViewPage />
                </ProtectedRoute>
              }
            />
            {/* Legacy route support - redirect to new pattern */}
            <Route
              path="apps/:appId"
              element={<Navigate to=".." replace />}
            />
            <Route
              path="apps/:appId/login"
              element={<Navigate to=".." replace />}
            />
            <Route
              path="tickets"
              element={
                <ProtectedRoute requiredPermission="tickets.view" featureName="Tickets">
                  <TicketsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="tickets/new"
              element={
                <ProtectedRoute requiredPermission="tickets.create" featureName="Create Ticket">
                  <CreateTicketPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="tickets/:ticketId"
              element={
                <ProtectedRoute requiredPermission="tickets.view" featureName="Ticket Details">
                  <TicketDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="analytics"
              element={
                <ProtectedRoute requiredPermission="organizations.view" featureName="Analytics">
                  <AnalyticsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="workflows"
              element={
                <ProtectedRoute requiredPermission="organizations.view" featureName="Workflows">
                  <WorkflowsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="workflows/new"
              element={
                <ProtectedRoute requiredPermission="organizations.view" featureName="Workflow Builder">
                  <WorkflowBuilderPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="workflows/:workflowId/edit"
              element={
                <ProtectedRoute requiredPermission="organizations.view" featureName="Workflow Builder">
                  <WorkflowBuilderPage />
                </ProtectedRoute>
              }
            />
          </Route>

          {/* Root route - show role selection for unauthenticated, redirect for authenticated */}
          <Route
            path="/"
            element={<RootRoute />}
          />

          {/* 404 - Redirect to login if not authenticated, otherwise to dashboard */}
          <Route path="*" element={<NotFoundRoute />} />
        </Routes>
      </OnboardingProvider>
    </ErrorBoundary>
  );
}

export default App;

