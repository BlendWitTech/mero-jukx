import { Outlet, Link, useNavigate, useLocation, useParams } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useTheme } from '../contexts/ThemeContext';
import { useTaskbar } from '../contexts/TaskbarContext';
import {
  LayoutDashboard,
  Users,
  Building2,
  Mail,
  Shield,
  Package,
  FolderKanban,
  Settings,
  LogOut,
  Menu,
  ChevronLeft,
  ChevronRight,
  Activity,
  User,
  MessageSquare,
  Ticket,
  Clock,
  Hash,
  Plus,
  Search,
  Cog,
  RefreshCw,
  BarChart3,
  Grid3x3,
  X,
  Sun,
  Moon,
  CreditCard,
  Zap,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import * as React from 'react';
import { authService } from '../services/authService';
import toast from '@shared/hooks/useToast';
import NotificationDropdown from '../components/NotificationDropdown';
import { usePermissions } from '../hooks/usePermissions';
import { useMutation, useQuery } from '@tanstack/react-query';
import api from '../services/api';
import OrganizationSwitcher from '../components/OrganizationSwitcher';
import BranchSwitcher from '../components/BranchSwitcher';
import MembersList from '../components/MembersList';
import RightSidebar from '../components/RightSidebar';
import ChatManager from '../components/ChatManager';
import { marketplaceService } from '../services/marketplaceService';
import { getAppNameFromSubdomain, isAppSubdomain, getMainDomainUrl, getEnvironment, redirectToAppSubdomain } from '../config/urlConfig';
import AppViewPage from '../pages/apps/AppViewPage';
import AppHeader from '../components/AppHeader';
import { getActiveAppIds, removeAppSession, removeAllAppSessions, getAppSession, isAppSessionValid } from '../services/appSessionService';
import MarketplaceModal from '../components/MarketplaceModal/MarketplaceModal';
import { ConfirmDialog } from '@shared/components/feedback/ConfirmDialog';
import { TopHeader } from '@shared/components/layout/TopHeader';
import GlobalSearchBar from '../components/GlobalSearchBar';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard, permission: null },
  { name: 'Analytics', href: '/analytics', icon: BarChart3, permission: 'organizations.view' },
  { name: 'Users', href: '/users', icon: Users, permission: 'users.view' },
  { name: 'Organizations', href: '/organizations', icon: Building2, permission: null },
  { name: 'Invitations', href: '/invitations', icon: Mail, permission: 'invitations.view' },
  { name: 'Roles', href: '/roles', icon: Shield, permission: 'roles.view' },
  { name: 'Packages', href: '/packages', icon: Package, permission: 'packages.view' },
  { name: 'Billing', href: '/billing', icon: CreditCard, permission: 'packages.view' },
  { name: 'Apps', href: '/apps', icon: Grid3x3, permission: 'apps.view' },
  { name: 'Workflows', href: '/workflows', icon: Zap, permission: 'organizations.view' },
  { name: 'Audit Logs', href: '/audit-logs', icon: Activity, permission: 'audit.view' },
  { name: 'Settings', href: '/settings', icon: Settings, permission: null },
];

export default function OrganizationDashboardLayout() {
  const { user, logout, accessToken, organization: orgFromStore, _hasHydrated, isAuthenticated } = useAuthStore();
  const { theme, isDark, toggleTheme } = useTheme();
  const { visibility: taskbarVisibility } = useTaskbar();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isLeftSidebarHovered, setIsLeftSidebarHovered] = useState(false);
  const [leftSidebarCollapsed, setLeftSidebarCollapsed] = useState(false);
  const [rightSidebarCollapsed, setRightSidebarCollapsed] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);
  const [showMarketplaceModal, setShowMarketplaceModal] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showCloseAppConfirm, setShowCloseAppConfirm] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { slug } = useParams<{ slug: string }>();
  const { hasPermission, isLoadingPermissions } = usePermissions();

  // Get organization slug from URL or store
  const orgSlug = slug || orgFromStore?.slug || '';

  // Pinned apps for left sidebar
  const { data: pinnedApps } = useQuery({
    queryKey: ['marketplace-pinned'],
    queryFn: marketplaceService.getPinned,
    enabled: _hasHydrated && isAuthenticated && !!accessToken,
  });

  // Get last used apps (for opened apps section)
  const { data: lastUsedApps } = useQuery({
    queryKey: ['marketplace-last-used'],
    queryFn: marketplaceService.getLastUsed,
    enabled: _hasHydrated && isAuthenticated && !!accessToken,
  });

  // Get active app IDs (apps with active sessions - for taskbar)
  const [activeAppIds, setActiveAppIds] = React.useState<number[]>([]);

  // Update active app IDs periodically
  React.useEffect(() => {
    const updateActiveApps = () => {
      setActiveAppIds(getActiveAppIds());
    };

    updateActiveApps();
    const interval = setInterval(updateActiveApps, 1000);

    // Listen for storage changes (when apps are opened/closed)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key?.startsWith('app_session_') || e.key?.startsWith('app_activity_')) {
        updateActiveApps();
      }
    };
    window.addEventListener('storage', handleStorageChange);

    // Listen for custom app-closed events
    const handleAppClosed = () => {
      updateActiveApps();
    };
    window.addEventListener('app-closed', handleAppClosed);

    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('app-closed', handleAppClosed);
    };
  }, []);

  // Fetch all apps to get details for active app IDs
  const { data: allApps } = useQuery({
    queryKey: ['marketplace-apps'],
    queryFn: async () => {
      const response = await api.get('/marketplace/apps');
      return response.data.data || response.data || [];
    },
    enabled: _hasHydrated && isAuthenticated && !!accessToken && activeAppIds.length > 0,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Get open apps (apps with active sessions)
  const openApps = React.useMemo(() => {
    if (!allApps || activeAppIds.length === 0) return [];
    return allApps.filter((app: any) => activeAppIds.includes(app.id));
  }, [allApps, activeAppIds]);

  // Detect currently opened app from URL (by slug)
  const currentAppSlug = React.useMemo(() => {
    // First check URL path for /app/:appSlug (new pattern)
    const pathMatch = location.pathname.match(/\/app\/([^/]+)/);
    if (pathMatch) return pathMatch[1];

    // Legacy support: check for /apps/:id pattern
    const legacyMatch = location.pathname.match(/\/apps\/(\d+)/);
    if (legacyMatch) {
      // Try to find app by ID and return its slug
      // This will be handled by fetching the app
      return null; // Will be resolved via appId lookup
    }

    return null;
  }, [location.pathname, location.search]);

  // Detect app from subdomain - declare before useQuery that uses it
  const [subdomainAppId, setSubdomainAppId] = React.useState<number | null>(null);

  // Fetch app by slug if we have one, or by subdomain
  const { data: currentApp } = useQuery({
    queryKey: ['current-app', currentAppSlug, subdomainAppId],
    queryFn: async () => {
      // If we have a slug, fetch by slug
      if (currentAppSlug) {
        try {
          const response = await api.get(`/marketplace/apps/slug/${currentAppSlug}`);
          return response.data;
        } catch (err: any) {
          // Fallback: fetch all apps and find by slug
          const response = await api.get('/marketplace/apps');
          const apps = response.data.data || response.data || [];
          return apps.find((a: any) => a.slug === currentAppSlug) || null;
        }
      }

      // If we have a subdomain app ID, fetch by ID
      if (subdomainAppId) {
        try {
          const response = await api.get('/marketplace/apps');
          const apps = response.data.data || response.data || [];
          return apps.find((a: any) => a.id === subdomainAppId) || null;
        } catch (err: any) {
          return null;
        }
      }

      return null;
    },
    enabled: (!!currentAppSlug || !!subdomainAppId) && _hasHydrated && isAuthenticated && !!accessToken,
  });

  const currentAppId = currentApp?.id || null;

  // Fetch current organization details
  const { data: currentOrganization } = useQuery<{ id: string; name: string; slug: string; org_type?: string; parent_id?: string | null }>({
    queryKey: ['current-organization'],
    queryFn: async () => {
      const response = await api.get('/organizations/me');
      return response.data;
    },
    enabled: _hasHydrated && isAuthenticated && !!accessToken,
  });

  // Update organization in store with slug if it's missing
  useEffect(() => {
    if (currentOrganization && currentOrganization.slug && (!orgFromStore?.slug || orgFromStore.slug !== currentOrganization.slug)) {
      useAuthStore.getState().setOrganization({
        id: currentOrganization.id,
        name: currentOrganization.name || '',
        slug: currentOrganization.slug,
        org_type: (currentOrganization as any).org_type,
        parent_id: (currentOrganization as any).parent_id,
      });
    }
  }, [currentOrganization, orgFromStore?.slug]);

  // Use fetched organization or fallback to store organization
  const organization = currentOrganization || orgFromStore;

  // Set subdomain app ID based on subdomain detection
  useEffect(() => {
    if (!_hasHydrated || !isAuthenticated || !accessToken || !organization?.id) {
      setSubdomainAppId(null);
      return;
    }

    // Check if we're on an app subdomain
    if (isAppSubdomain()) {
      const appName = getAppNameFromSubdomain();
      if (appName) {
        // Fetch apps to find the one matching the subdomain
        api.get('/marketplace/apps')
          .then((response) => {
            const apps = response.data.data || response.data || [];
            const app = apps.find((a: any) => a.slug === appName);
            if (app) {
              setSubdomainAppId(app.id);
            } else {
              setSubdomainAppId(null);
            }
          })
          .catch(() => {
            setSubdomainAppId(null);
          });
      } else {
        setSubdomainAppId(null);
      }
    } else {
      setSubdomainAppId(null);
    }
  }, [_hasHydrated, isAuthenticated, accessToken, organization?.id]);

  // Use subdomain app if no app in URL
  const effectiveAppId = currentAppId || subdomainAppId;

  const { mutate: recordUsage } = useMutation({
    mutationFn: (appId: number) => marketplaceService.recordUsage(appId),
  });

  const handleOpenApp = (app: any) => {
    if (!app) return;
    recordUsage(app.id);

    // Check if we should use subdomain routing
    const env = getEnvironment();
    const currentHostname = window.location.hostname;
    const isLocalhost = currentHostname === 'localhost' || currentHostname === '127.0.0.1' || /^\d+\.\d+\.\d+\.\d+$/.test(currentHostname);

    // If on dev.merojugx.com (not localhost), use subdomain routing
    if (env === 'development' && !isLocalhost && orgSlug) {
      redirectToAppSubdomain(app.slug, orgSlug);
      return;
    }

    // For localhost or production, use path-based routing
    const path = orgSlug ? `/org/${orgSlug}/app/${app.slug}` : `/app/${app.slug}`;
    navigate(path);
  };

  const handleCloseApp = () => {
    // Show confirmation dialog
    setShowCloseAppConfirm(true);
  };

  const handleConfirmCloseApp = () => {
    // Remove app session when closing
    if (effectiveAppId) {
      removeAppSession(effectiveAppId);
      delete api.defaults.headers.common['X-App-Session'];

      // Dispatch custom event to notify other components
      window.dispatchEvent(new CustomEvent('app-closed', { detail: { appId: effectiveAppId } }));

      // Navigate away from app
      if (orgSlug) {
        navigate(`/org/${orgSlug}`);
      } else {
        navigate('/');
      }
    }

    // If on app subdomain, redirect to main domain
    if (isAppSubdomain()) {
      window.location.href = `${getMainDomainUrl()}/org/${orgSlug}`;
    } else {
      // Navigate to dashboard when closing app
      const path = orgSlug ? `/org/${orgSlug}` : '/';
      navigate(path);
    }
    setShowCloseAppConfirm(false);
  };

  const handleCancelCloseApp = () => {
    setShowCloseAppConfirm(false);
  };

  const handleMinimizeApp = () => {
    // Minimize app - navigate to dashboard but keep session
    if (orgSlug) {
      navigate(`/org/${orgSlug}`);
    } else {
      navigate('/');
    }
  };

  // If we have a slug in URL but it doesn't match organization slug, redirect
  // BUT: Don't redirect if we're inside an app (path contains /app/)
  useEffect(() => {
    if (!_hasHydrated || !isAuthenticated || !accessToken) return;
    // Skip redirect if we're inside an app route
    if (location.pathname.includes('/app/')) return;

    if (slug && organization?.slug && slug !== organization.slug) {
      navigate(`/org/${organization.slug}${location.pathname.replace(`/org/${slug}`, '')}`, { replace: true });
    } else if (!slug && organization?.slug) {
      navigate(`/org/${organization.slug}${location.pathname}`, { replace: true });
    }
  }, [slug, organization?.slug, _hasHydrated, isAuthenticated, accessToken, navigate, location.pathname]);

  const handleLogout = () => {
    // Show confirmation dialog
    setShowLogoutConfirm(true);
  };

  const handleConfirmLogout = async () => {
    try {
      // Clear all app sessions
      removeAllAppSessions();
      // Clear taskbar apps
      localStorage.removeItem('taskbar_apps');
      // Logout from auth service
      await authService.logout();
      toast.success('Logged out successfully');

      // Navigate to login - use window.location for full page reload to clear state
      // Check if we're on localhost or subdomain
      const isLocalhost = window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1' ||
        /^\d+\.\d+\.\d+\.\d+$/.test(window.location.hostname);

      if (isLocalhost) {
        // For localhost, use path-based routing
        window.location.href = '/login';
      } else {
        // For subdomain, navigate to main domain login
        const mainUrl = getMainDomainUrl();
        window.location.href = `${mainUrl}/login`;
      }
    } catch (error) {
      // Clear all app sessions even on error
      removeAllAppSessions();
      localStorage.removeItem('taskbar_apps');
      logout();

      // Navigate to login - use window.location for full page reload
      const isLocalhost = window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1' ||
        /^\d+\.\d+\.\d+\.\d+$/.test(window.location.hostname);

      if (isLocalhost) {
        window.location.href = '/login';
      } else {
        const mainUrl = getMainDomainUrl();
        window.location.href = `${mainUrl}/login`;
      }
    }
    setShowLogoutConfirm(false);
  };

  const handleCancelLogout = () => {
    setShowLogoutConfirm(false);
  };

  // Determine active channel based on current route
  useEffect(() => {
    const path = location.pathname.split('/')[1] || 'dashboard';
    setSelectedChannel(path);
  }, [location.pathname]);

  // Check if app is currently open
  const isAppOpen = effectiveAppId !== null;

  // Check if we're showing lock screen (on subdomain without app session)
  const isShowingLockScreen = isAppSubdomain() && currentApp && (() => {
    const token = getAppSession(currentApp.id);
    return !(token && isAppSessionValid(currentApp.id));
  })();

  return (
    <div
      className="flex h-screen text-gray-100 overflow-hidden transition-colors duration-300"
      style={{
        backgroundColor: theme.colors.background,
        color: theme.colors.text
      }}
    >
      {/* Left Sidebar - Channels/Applications (Taskbar) */}
      {/* Hover trigger when visibility is 'hover' - always visible thin strip on left edge */}
      {!isShowingLockScreen && taskbarVisibility === 'hover' && !isLeftSidebarHovered && (
        <div
          className="fixed left-0 top-0 bottom-0 z-[100] w-2 transition-all duration-300 hover:w-4"
          style={{ backgroundColor: theme.colors.primary, cursor: 'pointer' }}
          onMouseEnter={() => setIsLeftSidebarHovered(true)}
          title="Hover to show taskbar"
        />
      )}
      {!isShowingLockScreen && (
        <div
          className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 fixed md:static inset-y-0 left-0 z-50 flex flex-col items-center py-2 space-y-2 flex-shrink-0 transition-all duration-300 ${taskbarVisibility === 'hover' && !isLeftSidebarHovered ? 'md:w-0 md:overflow-hidden' : 'w-[72px]'
            }`}
          style={{ backgroundColor: theme.colors.border, overflow: 'visible' }}
          onMouseEnter={() => {
            if (taskbarVisibility === 'hover') {
              setIsLeftSidebarHovered(true);
            }
          }}
          onMouseLeave={() => {
            if (taskbarVisibility === 'hover') {
              setIsLeftSidebarHovered(false);
            }
          }}
        >
          {/* Organization Switcher Icon - Hide when app is open */}
          {!isAppOpen && (
            <div className="mb-2 flex flex-col items-center space-y-2 overflow-visible" style={{ overflow: 'visible' }}>
              <OrganizationSwitcher compact={true} />
              <BranchSwitcher compact={true} />
            </div>
          )}

          {/* Dashboard Link - Only show when app is open */}
          {isAppOpen && (
            <button
              onClick={() => {
                // If on subdomain, navigate to main domain dashboard
                if (isAppSubdomain() && orgSlug) {
                  const mainUrl = getMainDomainUrl();
                  window.location.href = `${mainUrl}/org/${orgSlug}`;
                } else if (orgSlug) {
                  navigate(`/org/${orgSlug}`);
                } else {
                  navigate('/');
                }
              }}
              className="w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-200"
              style={{
                backgroundColor: theme.colors.surface,
                color: theme.colors.text
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = theme.colors.primary;
                e.currentTarget.style.color = '#ffffff';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = theme.colors.surface;
                e.currentTarget.style.color = theme.colors.text;
              }}
              title="Dashboard"
            >
              <LayoutDashboard className="h-5 w-5" />
            </button>
          )}

          {/* Divider */}
          <div className="w-8 h-[2px] rounded-full mx-auto mb-2" style={{ backgroundColor: theme.colors.border }}></div>

          {/* Restructured layout: 60% for open/minimized apps, 40% for pinned apps */}
          <div className="flex-1 flex flex-col min-h-0 w-full items-center overflow-visible">
            {/* Open/Minimized apps section - 60% of available space */}
            {(openApps && openApps.length > 0) && (
              <div className="flex-[0.6] space-y-2 overflow-y-auto w-full scrollbar-thin scrollbar-track-transparent min-h-0 flex flex-col items-center overflow-visible" style={{ scrollbarColor: `${theme.colors.surface} transparent` }}>
                {openApps
                  .filter((app: any) => !pinnedApps?.some((p: any) => p.id === app.id)) // Exclude pinned apps
                  .map((app: any) => {
                    const isActive = effectiveAppId === app.id;
                    const initial = app.name?.[0]?.toUpperCase() || 'A';
                    return (
                      <div key={`open-${app.id}`} className="group relative overflow-visible">
                        <button
                          onClick={() => isActive ? handleCloseApp() : handleOpenApp(app)}
                          className={`relative w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-200 mx-auto`}
                          style={{
                            ...(isActive ? {
                              backgroundColor: theme.colors.primary,
                              color: '#ffffff'
                            } : {
                              backgroundColor: '#7289da', // Different color for minimized/open apps (lighter blue)
                              color: '#ffffff'
                            })
                          }}
                          onMouseEnter={(e) => {
                            if (!isActive) {
                              e.currentTarget.style.backgroundColor = theme.colors.primary;
                              e.currentTarget.style.color = '#ffffff';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!isActive) {
                              e.currentTarget.style.backgroundColor = '#7289da';
                              e.currentTarget.style.color = '#ffffff';
                            }
                          }}
                          title={isActive ? `Close ${app.name}` : app.name}
                        >
                          {(() => {
                            if (app.icon_url === 'Users' || app.slug === 'mero-crm') return <Users className="w-6 h-6" />;
                            if (app.icon_url === 'FolderKanban' || app.slug === 'mero-board') return <FolderKanban className="w-6 h-6" />;
                            if (app.icon_url === 'Package' || app.slug === 'mero-inventory') return <Package className="w-6 h-6" />;

                            return app.icon_url ? (
                              <img
                                src={app.icon_url}
                                alt={app.name}
                                className="w-8 h-8 object-contain"
                              />
                            ) : (
                              <span className="text-sm font-semibold">{initial}</span>
                            );
                          })()}

                          {!isActive && (
                            <div
                              className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-0 rounded-r-full group-hover:h-5 transition-all duration-200"
                              style={{ backgroundColor: theme.colors.text }}
                            ></div>
                          )}
                        </button>
                        {isActive && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCloseApp();
                            }}
                            className="absolute -top-1 -right-1 w-4 h-4 bg-[#ed4245] rounded-full border-2 flex items-center justify-center hover:bg-[#c03537] transition-colors"
                            style={{ borderColor: theme.colors.surface }}
                            title="Close App"
                          >
                            <X className="h-2.5 w-2.5 text-white" />
                          </button>
                        )}
                      </div>
                    );
                  })}
              </div>
            )}

            {/* Empty state */}
            {(!pinnedApps || pinnedApps.length === 0) && (!openApps || openApps.length === 0) && (
              <div className="text-[10px] px-2 text-center leading-tight" style={{ color: theme.colors.textSecondary }}>Pin apps to quick launch</div>
            )}
          </div>

          {/* Pinned apps section - Above logout button, scrollable */}
          {pinnedApps && pinnedApps.length > 0 && (
            <>
              <div className="w-8 h-[2px] rounded-full mx-auto my-2" style={{ backgroundColor: theme.colors.border }}></div>
              <div className="space-y-2 overflow-y-auto w-full scrollbar-thin scrollbar-track-transparent max-h-[40vh] flex flex-col items-center overflow-visible mb-2" style={{ scrollbarColor: `${theme.colors.surface} transparent` }}>
                {pinnedApps.map((app: any) => {
                  const isActive = effectiveAppId === app.id;
                  const initial = app.name?.[0]?.toUpperCase() || 'A';
                  return (
                    <div key={`pinned-${app.id}`} className="group relative overflow-visible">
                      <button
                        onClick={() => isActive ? handleCloseApp() : handleOpenApp(app)}
                        className={`relative w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-200 mx-auto`}
                        style={{
                          ...(isActive ? {
                            backgroundColor: theme.colors.primary,
                            color: '#ffffff'
                          } : {
                            backgroundColor: '#5865f2', // Theme-designed color for pinned apps (Discord-like blue)
                            color: '#ffffff'
                          })
                        }}
                        onMouseEnter={(e) => {
                          if (!isActive) {
                            e.currentTarget.style.backgroundColor = theme.colors.primary;
                            e.currentTarget.style.color = '#ffffff';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isActive) {
                            e.currentTarget.style.backgroundColor = '#5865f2';
                            e.currentTarget.style.color = '#ffffff';
                          }
                        }}
                        title={isActive ? `Close ${app.name}` : app.name}
                      >
                        {(() => {
                          if (app.icon_url === 'Users' || app.slug === 'mero-crm') return <Users className="w-6 h-6" />;
                          if (app.icon_url === 'FolderKanban' || app.slug === 'mero-board') return <FolderKanban className="w-6 h-6" />;
                          if (app.icon_url === 'Package' || app.slug === 'mero-inventory') return <Package className="w-6 h-6" />;

                          return app.icon_url ? (
                            <img
                              src={app.icon_url}
                              alt={app.name}
                              className="w-8 h-8 object-contain"
                            />
                          ) : (
                            <span className="text-sm font-semibold">{initial}</span>
                          );
                        })()}

                        {!isActive && (
                          <div
                            className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-0 rounded-r-full group-hover:h-5 transition-all duration-200"
                            style={{ backgroundColor: theme.colors.text }}
                          ></div>
                        )}
                      </button>
                      {isActive && (
                        <div
                          className="absolute -top-1 -right-1 w-4 h-4 bg-[#ed4245] rounded-full border-2 flex items-center justify-center"
                          style={{ borderColor: theme.colors.surface }}
                        >
                          <X className="h-2.5 w-2.5 text-white" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* Logout Button - aligned with app buttons */}
          <div className="mt-auto pt-2 w-full flex justify-center">
            <button
              onClick={handleLogout}
              className="w-12 h-12 rounded-2xl bg-[#ed4245] text-white flex items-center justify-center hover:bg-[#c03537] transition-all duration-200 shadow-sm hover:shadow-md"
              title="Logout"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      {/* Second Sidebar - Navigation & Members - Hide when app is open or showing lock screen */}
      {!isAppOpen && !isShowingLockScreen && (
        <div
          className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 fixed md:static inset-y-0 z-50 flex flex-col flex-shrink-0 transition-all duration-300 ${leftSidebarCollapsed ? 'w-[72px]' : 'w-[240px]'
            }`}
          style={{ backgroundColor: theme.colors.surface }}
        >
          {/* Navigation Section */}
          <div className={`px-2 pt-2 pb-2 ${leftSidebarCollapsed ? 'px-1' : ''}`}>
            <div className={`px-2 py-1.5 mb-1 ${leftSidebarCollapsed ? 'px-0' : ''} flex items-center justify-between`}>
              {!leftSidebarCollapsed ? (
                <>
                  <h2 className="text-xs font-semibold uppercase tracking-wide" style={{ color: theme.colors.textSecondary }}>
                    {organization?.name || 'No Organization'}
                  </h2>
                  <button
                    onClick={() => setLeftSidebarCollapsed(true)}
                    className="transition-colors"
                    style={{ color: theme.colors.textSecondary }}
                    onMouseEnter={(e) => e.currentTarget.style.color = theme.colors.text}
                    onMouseLeave={(e) => e.currentTarget.style.color = theme.colors.textSecondary}
                    title="Collapse sidebar"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setLeftSidebarCollapsed(false)}
                  className="w-full flex items-center justify-center p-1.5 rounded transition-colors"
                  style={{ color: theme.colors.textSecondary }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = theme.colors.text;
                    e.currentTarget.style.backgroundColor = theme.colors.border;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = theme.colors.textSecondary;
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                  title={organization?.name || 'Expand sidebar'}
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              )}
            </div>
            <nav className={`space-y-0.5 ${leftSidebarCollapsed ? 'space-y-2' : ''}`}>
              {!isLoadingPermissions && navigation
                .filter((item) => {
                  // Hide certain items for branches (managed by parent organization)
                  const isBranch = organization?.org_type === 'BRANCH' || !!organization?.parent_id;
                  if (isBranch && ['Roles', 'Packages', 'Billing'].includes(item.name)) {
                    return false;
                  }
                  return !item.permission || hasPermission(item.permission);
                })
                .map((item) => {
                  const Icon = item.icon;
                  // Build href with organization slug
                  const href = orgSlug ? `/org/${orgSlug}${item.href === '/' ? '' : item.href}` : item.href;
                  // Check if current path matches (accounting for slug)
                  const currentPath = location.pathname;
                  const isActive = currentPath === href ||
                    (item.href === '/' && (currentPath === `/org/${orgSlug}` || currentPath === `/org/${orgSlug}/`)) ||
                    (item.href !== '/' && currentPath.startsWith(href));
                  return (
                    <Link
                      key={item.name}
                      to={href}
                      className={`group flex items-center ${leftSidebarCollapsed ? 'justify-center' : 'gap-2'} px-2 py-1.5 rounded text-sm font-medium transition-colors relative`}
                      style={isActive ? {
                        backgroundColor: theme.colors.border,
                        color: theme.colors.text
                      } : {
                        color: theme.colors.textSecondary
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.backgroundColor = theme.colors.border;
                          e.currentTarget.style.color = theme.colors.text;
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.backgroundColor = 'transparent';
                          e.currentTarget.style.color = theme.colors.textSecondary;
                        }
                      }}
                      title={leftSidebarCollapsed ? item.name : undefined}
                    >
                      <Icon className="h-5 w-5 flex-shrink-0" />
                      {!leftSidebarCollapsed && <span className="truncate">{item.name}</span>}
                      {leftSidebarCollapsed && !isActive && (
                        <div
                          className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-0 rounded-r-full group-hover:h-5 transition-all duration-200"
                          style={{ backgroundColor: theme.colors.text }}
                        ></div>
                      )}
                    </Link>
                  );
                })}
            </nav>
          </div>

          {/* Divider */}
          <div className="h-[1px] mx-2 my-2" style={{ backgroundColor: theme.colors.border }}></div>

          {/* Members Section */}
          <div className={`flex-1 overflow-hidden flex flex-col ${leftSidebarCollapsed ? 'hidden' : ''}`}>
            <div className="px-2 py-1.5">
              <div className="px-2">
                <h2 className="text-xs font-semibold uppercase tracking-wide" style={{ color: theme.colors.textSecondary }}>
                  Members
                </h2>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-2 scrollbar-thin scrollbar-track-transparent" style={{ scrollbarColor: `${theme.colors.border} transparent` }}>
              <MembersList />
            </div>
          </div>

          {/* User Panel at Bottom */}
          <div className={`px-2 py-2 ${leftSidebarCollapsed ? 'hidden' : ''}`} style={{ backgroundColor: theme.colors.border }}>
            <div
              className="flex items-center gap-2 px-2 py-1.5 rounded transition-colors group cursor-pointer"
              style={{ backgroundColor: theme.colors.background }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = theme.colors.surface;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = theme.colors.background;
              }}
            >
              <div className="h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: theme.colors.primary }}>
                <span className="text-xs font-semibold text-white">
                  {user?.first_name?.[0]}{user?.last_name?.[0]}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: theme.colors.text }}>
                  {user?.first_name} {user?.last_name}
                </p>
                <p className="text-xs truncate" style={{ color: theme.colors.textSecondary }}>#{user?.id}</p>
              </div>
              <Link
                to={orgSlug ? `/org/${orgSlug}/profile` : '/profile'}
                className="p-1.5 rounded transition-colors"
                style={{ color: theme.colors.textSecondary }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = theme.colors.text;
                  e.currentTarget.style.backgroundColor = theme.colors.border;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = theme.colors.textSecondary;
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
                onClick={(e) => e.stopPropagation()}
                title="Profile Settings"
              >
                <Cog className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-20"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content Area - No margin on desktop since sidebars are static and flex handles spacing */}
      <div
        className="flex-1 flex flex-col overflow-hidden ml-0 md:ml-0 transition-all duration-300"
        style={{
          backgroundColor: theme.colors.background
        }}
      >
        {/* Top Header - Shared component for both main app and apps - Hide when showing lock screen */}
        {!isShowingLockScreen && (
          <TopHeader
            title={isAppOpen && effectiveAppId
              ? (currentApp?.name ||
                pinnedApps?.find((app: any) => app.id === effectiveAppId)?.name ||
                lastUsedApps?.find((app: any) => app.id === effectiveAppId)?.name ||
                'App')
              : (navigation.find(n =>
                n.href === location.pathname ||
                (n.href === '/' && location.pathname === '/') ||
                (n.href !== '/' && location.pathname.startsWith(n.href))
              )?.name || 'Dashboard')}
            theme={theme}
            isDark={isDark}
            onToggleTheme={toggleTheme}
            sidebarCollapsed={
              (isAppOpen && currentApp?.slug === 'mero-board')
                ? (() => {
                  const saved = localStorage.getItem('mero-board-sidebar-collapsed');
                  return saved === 'true';
                })()
                : (isAppOpen && currentApp?.slug === 'mero-crm')
                  ? (() => {
                    const saved = localStorage.getItem('mero-crm-sidebar-collapsed');
                    return saved === 'true';
                  })()
                  : (isAppOpen && currentApp?.slug === 'mero-inventory')
                    ? (() => {
                      const saved = localStorage.getItem('mero-inventory-sidebar-collapsed');
                      return saved === 'true';
                    })()
                    : leftSidebarCollapsed
            }
            onToggleSidebar={
              (isAppOpen && currentApp?.slug === 'mero-board')
                ? (() => {
                  const saved = localStorage.getItem('mero-board-sidebar-collapsed');
                  const newState = saved !== 'true';
                  localStorage.setItem('mero-board-sidebar-collapsed', String(newState));
                  window.dispatchEvent(new CustomEvent('mero-board-sidebar-toggle', { detail: { collapsed: newState } }));
                })
                : (isAppOpen && currentApp?.slug === 'mero-crm')
                  ? (() => {
                    const saved = localStorage.getItem('mero-crm-sidebar-collapsed');
                    const newState = saved !== 'true';
                    localStorage.setItem('mero-crm-sidebar-collapsed', String(newState));
                    window.dispatchEvent(new CustomEvent('mero-crm-sidebar-toggle', { detail: { collapsed: newState } }));
                  })
                  : (isAppOpen && currentApp?.slug === 'mero-inventory')
                    ? (() => {
                      const saved = localStorage.getItem('mero-inventory-sidebar-collapsed');
                      const newState = saved !== 'true';
                      localStorage.setItem('mero-inventory-sidebar-collapsed', String(newState));
                      window.dispatchEvent(new CustomEvent('mero-inventory-sidebar-toggle', { detail: { collapsed: newState } }));
                    })
                    : () => setLeftSidebarCollapsed(false)
            }
            searchComponent={<GlobalSearchBar />}
            notificationsComponent={<NotificationDropdown />}
            showCloseMinimize={isAppOpen && (currentApp?.slug === 'mero-board' || currentApp?.slug === 'mero-crm' || currentApp?.slug === 'mero-inventory' || currentApp?.slug === 'mero-accounting' || currentApp?.slug === 'mero-hr')} // Show close/minimize in header when right sidebar not available
            onClose={isAppOpen ? handleCloseApp : undefined}
            onMinimize={isAppOpen ? handleMinimizeApp : undefined}
          />
        )}

        {/* Page Content */}
        <div
          className="flex-1 overflow-y-auto scrollbar-thin scrollbar-track-transparent transition-colors duration-300"
          style={{
            backgroundColor: theme.colors.background
          }}
        >
          <main className="h-full">
            {/* Show app view if on subdomain - always show AppViewPage on subdomain */}
            {isAppSubdomain() ? (
              <AppViewPage appSlug={currentApp?.slug || getAppNameFromSubdomain() || undefined} />
            ) : (
              <Outlet />
            )}
          </main>
        </div>
      </div>

      {/* Marketplace Modal */}
      <MarketplaceModal
        isOpen={showMarketplaceModal}
        onClose={() => setShowMarketplaceModal(false)}
        onAppSelect={(appId, appSlug) => {
          setShowMarketplaceModal(false);
          // Find the app from allApps or fetch it
          const app = allApps?.find((a: any) => a.id === appId || a.slug === appSlug);
          if (app) {
            handleOpenApp(app);
          } else {
            // If app not found, navigate directly
            const path = orgSlug ? `/org/${orgSlug}/app/${appSlug}` : `/app/${appSlug}`;
            navigate(path);
          }
        }}
      />

      {currentApp?.slug !== 'mero-board' && currentApp?.slug !== 'mero-crm' && currentApp?.slug !== 'mero-inventory' && currentApp?.slug !== 'mero-accounting' && currentApp?.slug !== 'mero-hr' &&
        getAppNameFromSubdomain() !== 'mero-board' && getAppNameFromSubdomain() !== 'mero-crm' && getAppNameFromSubdomain() !== 'mero-inventory' && getAppNameFromSubdomain() !== 'mero-accounting' && getAppNameFromSubdomain() !== 'mero-hr' && (
          <div className="relative">
            {rightSidebarCollapsed ? (
              <button
                onClick={() => setRightSidebarCollapsed(false)}
                className="w-12 h-12 border-l flex items-center justify-center transition-colors"
                style={{
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                  color: theme.colors.textSecondary
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = theme.colors.text;
                  e.currentTarget.style.backgroundColor = theme.colors.border;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = theme.colors.textSecondary;
                  e.currentTarget.style.backgroundColor = theme.colors.surface;
                }}
                title="Expand right sidebar"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
            ) : (
              <RightSidebar
                isCollapsed={rightSidebarCollapsed}
                onCollapse={() => setRightSidebarCollapsed(true)}
                onExpand={() => setRightSidebarCollapsed(false)}
                isAppOpen={isAppOpen && currentApp?.slug !== 'mero-board' && currentApp?.slug !== 'mero-accounting' && getAppNameFromSubdomain() !== 'mero-board' && getAppNameFromSubdomain() !== 'mero-accounting'}
                onCloseApp={isAppOpen && currentApp?.slug !== 'mero-board' && currentApp?.slug !== 'mero-accounting' && getAppNameFromSubdomain() !== 'mero-board' && getAppNameFromSubdomain() !== 'mero-accounting' ? handleCloseApp : undefined}
                onMinimizeApp={isAppOpen && currentApp?.slug !== 'mero-board' && currentApp?.slug !== 'mero-accounting' && getAppNameFromSubdomain() !== 'mero-board' && getAppNameFromSubdomain() !== 'mero-accounting' ? handleMinimizeApp : undefined}
              />
            )}
          </div>
        )}

      {/* Chat Manager - Handles multiple chat windows */}
      <ChatManager />

      {/* Logout Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showLogoutConfirm}
        onClose={handleCancelLogout}
        onConfirm={handleConfirmLogout}
        title="Logout"
        message="Are you sure you want to logout? This will end your session and you will need to login again."
        confirmText="Logout"
        cancelText="Cancel"
        variant="warning"
        theme={theme}
      />
    </div>
  );
}

