import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import api from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { usePermissions } from '../../hooks/usePermissions';
import { formatLimit } from '../../utils/formatLimit';
import { Users, Building2, Shield, Package, TrendingUp, Activity, CheckCircle2, AlertCircle, Settings, Clock, Star, Plus, Ticket, MessageSquare, AppWindow, CreditCard, History } from 'lucide-react';
import { marketplaceService } from '../../services/marketplaceService';
import { useMutation } from '@tanstack/react-query';
import { useAnnouncements } from '../../hooks/useAnnouncements';
import { AnnouncementModal } from '../../components/AnnouncementModal';
import { useTheme } from '../../contexts/ThemeContext';
import { logger } from '../../utils/logger';
import { Progress } from '@shared';
import { formatCurrency, DEFAULT_CURRENCY } from '../../utils/currency';

export default function DashboardPage() {
  const { organization, user, isAuthenticated, accessToken, _hasHydrated } = useAuthStore();
  const { isOrganizationOwner, hasPermission } = usePermissions();
  const navigate = useNavigate();
  const location = useLocation();
  const { announcement, dismissAnnouncement } = useAnnouncements();
  const { theme } = useTheme();
  const [showAnnouncement, setShowAnnouncement] = useState(false);

  // Only show announcements on the dashboard page (not on tickets or chat admin)
  const currentPath = location.pathname.toLowerCase();
  const isTicketsPage = currentPath.includes('/tickets') || currentPath.includes('ticket');
  const isChatAdminPage = currentPath.includes('/chat/admin') || currentPath.includes('chat/admin');

  // Explicitly check for dashboard routes
  const isRoot = currentPath === '/' || currentPath === '';
  const isDashboardRoute = currentPath.endsWith('/dashboard');
  const isOrgRoot = /^\/org\/[^/]+\/?$/.test(currentPath);
  const isOrgDashboard = /^\/org\/[^/]+\/dashboard\/?$/.test(currentPath);
  const isDashboard = isRoot || isDashboardRoute || isOrgRoot || isOrgDashboard;

  // CRITICAL: Never show on tickets or chat admin pages
  const shouldShowAnnouncement = !isTicketsPage && !isChatAdminPage && isDashboard && announcement;

  // Debug logging
  useEffect(() => {
    logger.log('[Dashboard] Auth State:', {
      _hasHydrated,
      isAuthenticated,
      hasAccessToken: !!accessToken,
      accessTokenLength: accessToken?.length || 0,
      hasUser: !!user,
      hasOrganization: !!organization,
    });
  }, [_hasHydrated, isAuthenticated, accessToken, user, organization]);

  // Fetch organization details
  const { data: orgDetails, isLoading: isLoadingOrg } = useQuery({
    queryKey: ['organization-details'],
    queryFn: async () => {
      try {
        const response = await api.get('/organizations/me');
        return response.data;
      } catch (error: any) {
        if (error?.response?.status === 401 || error?.response?.status === 403) {
          return null;
        }
        throw error;
      }
    },
    enabled: _hasHydrated && isAuthenticated && !!accessToken,
    retry: false,
  });

  // Fetch organization statistics - only if user has permission to view organization
  const { data: stats, isLoading: isLoadingStats } = useQuery({
    queryKey: ['organization-stats'],
    queryFn: async () => {
      try {
        const response = await api.get('/organizations/me/stats');
        return response.data;
      } catch (error: any) {
        // Silently handle 403 - user doesn't have permission
        if (error?.response?.status === 403) {
          return null;
        }
        if (error?.response?.status === 401) {
          return null;
        }
        throw error;
      }
    },
    enabled: _hasHydrated && isAuthenticated && !!accessToken && (isOrganizationOwner || hasPermission('organizations.view')),
    retry: false,
  });

  // Fetch current package
  const { data: packageInfo, isLoading: isLoadingPackage, refetch: refetchPackage } = useQuery({
    queryKey: ['current-package'],
    queryFn: async () => {
      try {
        const response = await api.get('/organizations/me/package');
        return response.data;
      } catch (error: any) {
        if (error?.response?.status === 401 || error?.response?.status === 403) {
          return null;
        }
        throw error;
      }
    },
    enabled: _hasHydrated && isAuthenticated && !!accessToken,
    refetchOnWindowFocus: true,
    retry: false,
  });

  // Fetch organization apps count
  const { data: orgAppsData, isLoading: isLoadingApps } = useQuery({
    queryKey: ['organization-apps-count'],
    queryFn: async () => {
      try {
        const response = await api.get(`/organizations/${organization?.id}/apps?page=1&limit=1`);
        return response.data;
      } catch (error: any) {
        if (error?.response?.status === 401 || error?.response?.status === 403) {
          return { meta: { total: 0 } };
        }
        throw error;
      }
    },
    enabled: _hasHydrated && isAuthenticated && !!accessToken && !!organization?.id,
    retry: false,
  });

  // Listen for package update events
  useEffect(() => {
    const handlePackageUpdate = () => {
      logger.log('[Dashboard] Package update event received, refetching package data...');
      refetchPackage();
    };

    window.addEventListener('package-updated', handlePackageUpdate);
    return () => {
      window.removeEventListener('package-updated', handlePackageUpdate);
    };
  }, [refetchPackage]);

  // Fetch recent users - only if user has permission to view users
  const { data: recentUsers, isLoading: isLoadingUsers } = useQuery({
    queryKey: ['recent-users'],
    queryFn: async () => {
      try {
        const response = await api.get('/users', { params: { page: 1, limit: 5 } });
        return response.data?.users || [];
      } catch (error: any) {
        // Silently handle 403 - user doesn't have permission
        if (error?.response?.status === 403) {
          return [];
        }
        if (error?.response?.status === 401) {
          return [];
        }
        throw error;
      }
    },
    enabled: _hasHydrated && isAuthenticated && !!accessToken && (isOrganizationOwner || hasPermission('users.view')),
    retry: false,
  });

  // Fetch recent audit logs - only if user has permission to view audit logs
  const { data: recentActivity, isLoading: isLoadingActivity } = useQuery({
    queryKey: ['recent-activity'],
    queryFn: async () => {
      try {
        const response = await api.get('/audit-logs', { params: { page: 1, limit: 5 } });
        return response.data?.audit_logs || [];
      } catch (error: any) {
        // Silently handle 403 - user doesn't have permission
        if (error?.response?.status === 403) {
          return [];
        }
        if (error?.response?.status === 401) {
          return [];
        }
        throw error;
      }
    },
    enabled: _hasHydrated && isAuthenticated && !!accessToken && (isOrganizationOwner || hasPermission('audit.view')),
    retry: false,
  });

  const isLoading = isLoadingOrg || isLoadingStats || isLoadingPackage || isLoadingApps;

  // Marketplace: favorites and last used
  const { data: favoriteApps } = useQuery({
    queryKey: ['marketplace-favorites'],
    queryFn: marketplaceService.getFavorites,
    enabled: _hasHydrated && isAuthenticated && !!accessToken,
  });

  const { data: lastUsedApps, refetch: refetchLastUsed } = useQuery({
    queryKey: ['marketplace-last-used'],
    queryFn: marketplaceService.getLastUsed,
    enabled: _hasHydrated && isAuthenticated && !!accessToken,
  });

  const { mutate: recordUsage } = useMutation({
    mutationFn: (appId: number) => marketplaceService.recordUsage(appId),
    onSuccess: () => refetchLastUsed(),
  });

  const openApp = (app: { id: number; slug: string }) => {
    recordUsage(app.id);
    navigate(`/org/${organization?.slug}/app/${app.slug}`);
  };

  // Permission checks for stat cards
  const canViewUsers = isOrganizationOwner || hasPermission('users.view');
  const canViewRoles = isOrganizationOwner || hasPermission('roles.view');
  const canViewPackages = isOrganizationOwner || hasPermission('packages.view');
  const canViewApps = isOrganizationOwner || hasPermission('apps.view') || hasPermission('apps.subscribe');

  const isBranch = organization?.org_type === 'BRANCH' || !!organization?.parent_id;

  const statCards = [
    {
      name: 'Total Users',
      value: isBranch ? stats?.branch_users || 0 : stats?.total_users || 0,
      subValue: isBranch ? `Total: ${stats?.total_users || 0}` : undefined,
      limit: stats?.user_limit || 0,
      usage: stats?.user_usage_percentage || 0,
      icon: Users,
      color: 'bg-blue-500',
      link: `/org/${organization?.slug}/users`,
      permission: canViewUsers,
    },
    {
      name: 'Total Applications',
      value: orgAppsData?.meta?.total || 0,
      icon: AppWindow,
      color: 'bg-purple-500',
      link: `/org/${organization?.slug}/apps`,
      permission: canViewApps,
    },
    {
      name: 'System Roles',
      value: stats?.total_roles || 0,
      limit: stats?.role_limit || 0,
      usage: stats?.role_usage_percentage || 0,
      icon: Shield,
      color: 'bg-green-500',
      link: `/org/${organization?.slug}/roles`,
      permission: canViewRoles && !isBranch,
    },
    {
      name: 'Total Spend',
      value: stats?.total_spend !== undefined
        ? formatCurrency(Number(stats.total_spend), orgDetails?.currency || organization?.currency || DEFAULT_CURRENCY)
        : formatCurrency(0, orgDetails?.currency || organization?.currency || DEFAULT_CURRENCY),
      icon: CreditCard,
      color: 'bg-emerald-500',
      link: `/org/${organization?.slug}/packages`,
      permission: canViewPackages && !isBranch,
    },
    {
      name: 'Open Tickets',
      value: stats?.open_tickets || 0,
      icon: Ticket,
      color: 'bg-amber-500',
      link: `/org/${organization?.slug}/tickets`,
      permission: isOrganizationOwner || hasPermission('tickets.view'),
    },
    {
      name: 'Daily Activity',
      value: stats?.actions_today || 0,
      icon: History,
      color: 'bg-rose-500',
      link: `/org/${organization?.slug}/audit-logs`,
      permission: isOrganizationOwner || hasPermission('audit.view'),
    },
  ];

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  // Show announcement modal when announcement is available and on dashboard
  // Ensure it doesn't show on tickets or chat admin pages
  useEffect(() => {
    // CRITICAL: Check path first - hide modal immediately if on tickets or chat admin
    const path = location.pathname.toLowerCase();
    const onTickets = path.includes('/tickets') || path.includes('ticket');
    const onChatAdmin = path.includes('/chat/admin') || path.includes('chat/admin');

    if (onTickets || onChatAdmin) {
      setShowAnnouncement(false);
      return;
    }

    // Also check if we're not on dashboard
    if (!isDashboard) {
      setShowAnnouncement(false);
      return;
    }

    // Only show if we're on dashboard and have an announcement
    if (shouldShowAnnouncement && announcement) {
      setShowAnnouncement(true);
    } else {
      setShowAnnouncement(false);
    }
  }, [shouldShowAnnouncement, isTicketsPage, isChatAdminPage, isDashboard, announcement, location.pathname]);

  const handleAnnouncementClose = () => {
    setShowAnnouncement(false);
    if (announcement) {
      // For first-time welcome, mark as permanently dismissed so it doesn't show again
      const isPermanent = announcement.isFirstTime || false;
      dismissAnnouncement(announcement.id, isPermanent);
    }
  };

  const handleAnnouncementDismiss = () => {
    setShowAnnouncement(false);
    if (announcement) {
      // Always permanently dismiss when user clicks "Don't show again"
      dismissAnnouncement(announcement.id, true);
    }
  };

  return (
    <div className="w-full p-6" style={{ backgroundColor: theme.colors.background, color: theme.colors.text }}>
      {/* Announcement Modal - Only show on dashboard, not on tickets or chat admin pages */}
      {(() => {
        // Double-check path before rendering modal
        const path = location.pathname.toLowerCase();
        const onTickets = path.includes('/tickets') || path.includes('ticket');
        const onChatAdmin = path.includes('/chat/admin') || path.includes('chat/admin');

        if (onTickets || onChatAdmin || !isDashboard) {
          return null;
        }

        return showAnnouncement && announcement ? (
          <AnnouncementModal
            announcement={announcement}
            onClose={handleAnnouncementClose}
            onDismiss={announcement.isFirstTime ? undefined : handleAnnouncementDismiss}
          />
        ) : null;
      })()}
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg" style={{ backgroundColor: theme.colors.primary }}>
            <Activity className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: theme.colors.text }}>Dashboard</h1>
            <p className="mt-2 text-sm sm:text-base" style={{ color: theme.colors.textSecondary }}>
              Welcome back, {user?.first_name}! Here's what's happening with {orgDetails?.name || organization?.name || 'your organization'}.
            </p>
          </div>
        </div>
      </div>

      {/* Organization Info Card */}
      {orgDetails && (
        <div
          className="relative backdrop-blur-sm rounded-xl p-6 mb-6 shadow-xl overflow-hidden"
          style={{
            background: `linear-gradient(to bottom right, ${theme.colors.surface}, ${theme.colors.background}, ${theme.colors.surface})`,
            border: `1px solid ${theme.colors.border}80`
          }}
        >
          {/* Animated background gradient */}
          <div className="absolute inset-0 animate-pulse" style={{ background: `linear-gradient(to right, ${theme.colors.primary}08, transparent, ${theme.colors.primary}08)` }}></div>

          <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center flex-1 min-w-0">
              <div className="h-12 w-12 rounded-xl flex items-center justify-center mr-4 flex-shrink-0 shadow-lg" style={{ background: `linear-gradient(to bottom right, ${theme.colors.primary}, ${theme.colors.secondary})` }}>
                <Building2 className="h-6 w-6 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-lg sm:text-xl font-bold truncate" style={{ color: theme.colors.text }}>{orgDetails.name}</h2>
                <p className="text-xs sm:text-sm mt-1 truncate" style={{ color: theme.colors.textSecondary }}>{orgDetails.email}</p>
                {orgDetails.description && (
                  <p className="text-xs sm:text-sm mt-1 line-clamp-2" style={{ color: theme.colors.textSecondary, opacity: 0.8 }}>{orgDetails.description}</p>
                )}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3 mt-4 sm:mt-0">
              {packageInfo?.package && !isBranch && (
                <div
                  className="flex items-center h-9 rounded-xl overflow-hidden shadow-sm border"
                  style={{
                    borderColor: `${theme.colors.border}80`,
                    backgroundColor: `${theme.colors.background}CC`
                  }}
                >
                  <div
                    className="flex items-center px-3 h-full text-white text-xs font-bold"
                    style={{ background: `linear-gradient(135deg, ${theme.colors.primary}, ${theme.colors.secondary})` }}
                  >
                    <Package className="h-3.5 w-3.5 mr-2" />
                    {packageInfo.package.name}
                  </div>
                  <div className="px-3 text-xs font-bold opacity-80" style={{ color: theme.colors.text }}>
                    {formatCurrency(packageInfo.package.price, orgDetails?.currency || organization?.currency || DEFAULT_CURRENCY)}{packageInfo.package.price > 0 && '/mo'}
                  </div>
                  <Link
                    to={`/org/${organization?.slug}/packages`}
                    className="px-3 h-full flex items-center text-[10px] font-black uppercase tracking-wider transition-all duration-300 border-l hover:opacity-80"
                    style={{
                      borderColor: `${theme.colors.border}80`,
                      backgroundColor: theme.colors.surface,
                      color: theme.colors.primary
                    }}
                  >
                    Manage
                  </Link>
                </div>
              )}

              {orgDetails.mfa_enabled ? (
                <div className="flex items-center h-9 px-3 rounded-xl text-xs font-bold bg-gradient-to-r from-[#23a55a]/20 to-[#23a55a]/10 text-[#23a55a] border border-[#23a55a]/30 shadow-sm">
                  <CheckCircle2 className="h-3.5 w-3.5 mr-2" />
                  MFA Protected
                </div>
              ) : (
                <div className="flex items-center h-9 px-3 rounded-xl text-xs font-bold bg-gradient-to-r from-[#faa61a]/20 to-[#faa61a]/10 text-[#faa61a] border border-[#faa61a]/30 shadow-sm">
                  <AlertCircle className="h-3.5 w-3.5 mr-2" />
                  MFA Disabled
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Statistics Cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="backdrop-blur-sm rounded-xl p-6 animate-pulse shadow-lg"
              style={{
                backgroundColor: `${theme.colors.surface}CC`,
                border: `1px solid ${theme.colors.border}80`
              }}
            >
              <div className="h-24 rounded-lg" style={{ backgroundColor: `${theme.colors.background}80` }}></div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {statCards
            .filter(stat => stat.permission !== false)
            .map((stat) => {
              const Icon = stat.icon;
              return (
                <div
                  key={stat.name}
                  className="group relative backdrop-blur-sm rounded-xl p-6 transition-all duration-300 shadow-lg overflow-hidden hover:shadow-xl hover:-translate-y-1 cursor-pointer"
                  style={{
                    background: `linear-gradient(to bottom right, ${theme.colors.surface}, ${theme.colors.background})`,
                    border: `1px solid ${theme.colors.border}80`
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = `${theme.colors.primary}80`;
                    e.currentTarget.style.boxShadow = `0 20px 25px -5px ${theme.colors.primary}33`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = `${theme.colors.border}80`;
                    e.currentTarget.style.boxShadow = '';
                  }}
                >
                  <Link
                    to={stat.link || '#'}
                    className="block"
                  >
                    {/* Gradient overlay on hover */}
                    <div className="absolute inset-0 transition-all duration-300" style={{ background: `linear-gradient(to bottom right, transparent, transparent)` }} onMouseEnter={(e) => {
                      e.currentTarget.style.background = `linear-gradient(to bottom right, ${theme.colors.primary}1A, transparent)`;
                    }} onMouseLeave={(e) => {
                      e.currentTarget.style.background = `linear-gradient(to bottom right, transparent, transparent)`;
                    }}></div>

                    <div className="relative flex items-center justify-between">
                      <div className="flex items-center">
                        <div className={`${stat.color} p-3 rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                          <Icon className="h-6 w-6 text-white" />
                        </div>
                        <div className="ml-4">
                          <p className="text-sm font-medium transition-colors" style={{ color: theme.colors.textSecondary }}>{stat.name}</p>
                          <div className="flex items-baseline gap-2">
                            <p className="text-2xl font-bold mt-1" style={{ color: theme.colors.text }}>{stat.value}</p>
                            {stat.subValue && (
                              <p className="text-xs font-medium opacity-60" style={{ color: theme.colors.textSecondary }}>{stat.subValue}</p>
                            )}
                          </div>
                          {stat.limit !== undefined && stat.limit > 0 && (
                            <div className="mt-2">
                              <div className="flex items-center text-xs mb-1.5" style={{ color: theme.colors.textSecondary, opacity: 0.8 }}>
                                <span>{stat.value} / {stat.limit}</span>
                                <span className="ml-2">({stat.usage}% used)</span>
                              </div>
                              <Progress
                                value={stat.value}
                                max={stat.limit}
                                smartColor
                                size="sm"
                                className="mt-1 shadow-inner"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                </div>
              );
            })}
        </div>
      )}

      {/* Apps quick access */}
      <div className="mt-6 sm:mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Last used apps - 2/3 Column */}
        <div
          className="lg:col-span-2 backdrop-blur-sm rounded-xl p-6 shadow-lg flex flex-col h-full"
          style={{
            background: `linear-gradient(to bottom right, ${theme.colors.surface}, ${theme.colors.background})`,
            border: `1px solid ${theme.colors.border}80`
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold flex items-center" style={{ color: theme.colors.text }}>
              <Clock className="h-5 w-5 mr-2" style={{ color: theme.colors.primary }} />
              Last used apps
            </h2>
            <Link
              to={`/org/${organization?.slug}/apps`}
              className="text-sm transition-colors font-medium hover:underline"
              style={{ color: theme.colors.textSecondary }}
            >
              View all
            </Link>
          </div>
          <div className="flex-1">
            {lastUsedApps && lastUsedApps.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {lastUsedApps.slice(0, 6).map((app: any) => (
                  <button
                    key={app.id}
                    onClick={() => openApp(app)}
                    className="group flex items-center gap-3 backdrop-blur-sm rounded-xl p-4 transition-all duration-300 text-left hover:-translate-y-0.5"
                    style={{
                      backgroundColor: `${theme.colors.background}CC`,
                      border: `1px solid ${theme.colors.border}80`
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = `${theme.colors.primary}80`;
                      e.currentTarget.style.backgroundColor = theme.colors.background;
                      e.currentTarget.style.boxShadow = `0 10px 15px -3px ${theme.colors.primary}1A`;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = `${theme.colors.border}80`;
                      e.currentTarget.style.backgroundColor = `${theme.colors.background}CC`;
                    }}
                  >
                    <div className="h-10 w-10 rounded-xl text-white flex items-center justify-center text-lg font-bold flex-shrink-0 shadow-md group-hover:scale-110 transition-transform duration-300" style={{ background: `linear-gradient(to bottom right, ${theme.colors.primary}, ${theme.colors.secondary})` }}>
                      {app.name?.[0]?.toUpperCase() || 'A'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold truncate" style={{ color: theme.colors.text }}>{app.name}</p>
                      <p className="text-[10px] line-clamp-1 mt-0.5 opacity-60" style={{ color: theme.colors.textSecondary }}>{app.short_description || 'Resume action'}</p>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center py-8 opacity-40">
                <Clock className="h-12 w-12 mb-2" />
                <p className="text-sm">No recent activity</p>
              </div>
            )}
          </div>
        </div>

        {/* Favorite apps - 1/3 Column */}
        <div
          className="lg:col-span-1 backdrop-blur-sm rounded-xl p-6 shadow-lg flex flex-col h-full"
          style={{
            background: `linear-gradient(to bottom right, ${theme.colors.surface}, ${theme.colors.background})`,
            border: `1px solid ${theme.colors.border}80`
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold flex items-center" style={{ color: theme.colors.text }}>
              <Star className="h-5 w-5 mr-2 text-[#faa61a]" />
              Favorites
            </h2>
            <Link
              to={`/org/${organization?.slug}/apps`}
              className="text-sm transition-colors font-medium hover:underline"
              style={{ color: theme.colors.textSecondary }}
            >
              Add
            </Link>
          </div>
          <div className="flex-1">
            {favoriteApps && favoriteApps.length > 0 ? (
              <div className="grid grid-cols-2 gap-3">
                {favoriteApps.slice(0, 4).map((app: any) => (
                  <button
                    key={app.id}
                    onClick={() => openApp(app)}
                    className="group flex flex-col items-center justify-center gap-2 backdrop-blur-sm rounded-xl p-4 transition-all duration-300 text-center hover:-translate-y-0.5 h-full aspect-square"
                    style={{
                      backgroundColor: `${theme.colors.background}CC`,
                      border: `1px solid ${theme.colors.border}80`
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = `#faa61a80`;
                      e.currentTarget.style.backgroundColor = theme.colors.background;
                      e.currentTarget.style.boxShadow = `0 10px 15px -3px #faa61a1A`;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = `${theme.colors.border}80`;
                      e.currentTarget.style.backgroundColor = `${theme.colors.background}CC`;
                    }}
                  >
                    <div className="h-12 w-12 rounded-2xl text-white flex items-center justify-center text-xl font-black shadow-lg group-hover:scale-110 transition-transform duration-300" style={{ background: `linear-gradient(to bottom right, #faa61a, #f59e0b)` }}>
                      {app.name?.[0]?.toUpperCase() || 'A'}
                    </div>
                    <p className="font-bold text-xs truncate w-full" style={{ color: theme.colors.text }}>{app.name}</p>
                  </button>
                ))}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center py-8 opacity-40">
                <Star className="h-12 w-12 mb-2" />
                <p className="text-sm">No favorites</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="mt-6 sm:mt-8 grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Recent Activity */}
        <div className="lg:col-span-2 space-y-4 sm:space-y-6">
          <div className="rounded-lg p-6" style={{ backgroundColor: theme.colors.surface, border: `1px solid ${theme.colors.border}` }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center" style={{ color: theme.colors.text }}>
                <Activity className="h-5 w-5 mr-2" style={{ color: theme.colors.primary }} />
                Recent Activity
              </h2>
              <Link
                to={`/org/${organization?.slug}/audit-logs`}
                className="text-sm"
                style={{ color: theme.colors.primary }}
                onMouseEnter={(e) => e.currentTarget.style.color = theme.colors.secondary}
                onMouseLeave={(e) => e.currentTarget.style.color = theme.colors.primary}
              >
                View All
              </Link>
            </div>
            {isLoadingActivity ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-16 rounded" style={{ backgroundColor: theme.colors.background }}></div>
                  </div>
                ))}
              </div>
            ) : recentActivity && recentActivity.length > 0 ? (
              <div className="space-y-3">
                {recentActivity.map((activity: any) => (
                  <div
                    key={activity.id}
                    className="flex items-start p-3 rounded-lg transition-colors"
                    style={{ backgroundColor: theme.colors.border }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.colors.surface}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = theme.colors.border}
                  >
                    <div className="flex-shrink-0">
                      <div className="h-8 w-8 rounded-full flex items-center justify-center" style={{ backgroundColor: theme.colors.primary }}>
                        <Activity className="h-4 w-4 text-white" />
                      </div>
                    </div>
                    <div className="ml-3 flex-1 min-w-0">
                      <p className="text-sm font-medium" style={{ color: theme.colors.text }}>{activity.action}</p>
                      <p className="text-xs mt-1" style={{ color: theme.colors.textSecondary }}>
                        {activity.entity_type} • {formatDateTime(activity.created_at)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8" style={{ color: theme.colors.textSecondary }}>
                <Activity className="h-12 w-12 mx-auto mb-2" style={{ color: theme.colors.textSecondary, opacity: 0.8 }} />
                <p>No recent activity</p>
              </div>
            )}
          </div>

          {/* Recent Users */}
          <div className="rounded-lg p-6" style={{ backgroundColor: theme.colors.surface, border: `1px solid ${theme.colors.border}` }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center" style={{ color: theme.colors.text }}>
                <Users className="h-5 w-5 mr-2" style={{ color: theme.colors.primary }} />
                Recent Users
              </h2>
              <Link
                to={`/org/${organization?.slug}/users`}
                className="text-sm"
                style={{ color: theme.colors.primary }}
                onMouseEnter={(e) => e.currentTarget.style.color = theme.colors.secondary}
                onMouseLeave={(e) => e.currentTarget.style.color = theme.colors.primary}
              >
                View All
              </Link>
            </div>
            {isLoadingUsers ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-16 rounded" style={{ backgroundColor: theme.colors.background }}></div>
                  </div>
                ))}
              </div>
            ) : recentUsers && recentUsers.length > 0 ? (
              <div className="space-y-3">
                {recentUsers.map((userItem: any) => (
                  <div
                    key={userItem.id}
                    className="flex items-center p-3 rounded-lg transition-colors"
                    style={{ backgroundColor: theme.colors.border }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.colors.surface}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = theme.colors.border}
                  >
                    <div className="h-10 w-10 rounded-full flex items-center justify-center" style={{ backgroundColor: theme.colors.primary }}>
                      <span className="text-white font-medium text-sm">
                        {userItem.first_name?.[0]?.toUpperCase() || ''}{userItem.last_name?.[0]?.toUpperCase() || ''}
                      </span>
                    </div>
                    <div className="ml-3 flex-1 min-w-0">
                      <p className="text-sm font-medium" style={{ color: theme.colors.text }}>
                        {userItem.first_name} {userItem.last_name}
                      </p>
                      <p className="text-xs" style={{ color: theme.colors.textSecondary }}>{userItem.email}</p>
                    </div>
                    {userItem.role && (
                      <span className="px-2 py-1 text-xs font-medium rounded-full" style={{ color: theme.colors.textSecondary, backgroundColor: theme.colors.background }}>
                        {userItem.role.name}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8" style={{ color: theme.colors.textSecondary }}>
                <Users className="h-12 w-12 mx-auto mb-2" style={{ color: theme.colors.textSecondary, opacity: 0.8 }} />
                <p>No users found</p>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4 sm:space-y-6">

          {/* Quick Actions */}
          <div className="rounded-lg p-6" style={{ backgroundColor: theme.colors.surface, border: `1px solid ${theme.colors.border}` }}>
            <h2 className="text-lg font-semibold mb-4 flex items-center" style={{ color: theme.colors.text }}>
              <TrendingUp className="h-5 w-5 mr-2" style={{ color: theme.colors.primary }} />
              Quick Actions
            </h2>
            <div className="space-y-2">
              {(isOrganizationOwner || hasPermission('invitations.create')) && (
                <Link
                  to={`/org/${organization?.slug}/invitations`}
                  className="flex items-center px-4 py-2 text-sm rounded-lg transition-colors whitespace-nowrap"
                  style={{ color: theme.colors.primary }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = `${theme.colors.primary}1A`}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <Plus className="h-4 w-4 mr-2 flex-shrink-0" />
                  <span>Create Invitation</span>
                </Link>
              )}
              {(isOrganizationOwner || hasPermission('users.view')) && (
                <Link
                  to={`/org/${organization?.slug}/users`}
                  className="flex items-center px-4 py-2 text-sm rounded-lg transition-colors whitespace-nowrap"
                  style={{ color: theme.colors.primary }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = `${theme.colors.primary}1A`}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <Users className="h-4 w-4 mr-2 flex-shrink-0" />
                  <span>View All Users</span>
                </Link>
              )}
              {(isOrganizationOwner || hasPermission('roles.view')) && !isBranch && (
                <Link
                  to={`/org/${organization?.slug}/roles`}
                  className="flex items-center px-4 py-2 text-sm rounded-lg transition-all duration-200 hover:bg-opacity-10"
                  style={{ color: theme.colors.primary }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = `${theme.colors.primary}1A`}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <Shield className="h-4 w-4 mr-2 flex-shrink-0" />
                  <span>Manage Roles</span>
                </Link>
              )}
              {(isOrganizationOwner || hasPermission('tickets.view')) && (
                <Link
                  to={`/org/${organization?.slug}/tickets`}
                  className="flex items-center px-4 py-2 text-sm rounded-lg transition-colors whitespace-nowrap"
                  style={{ color: theme.colors.primary }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = `${theme.colors.primary}1A`}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <Ticket className="h-4 w-4 mr-2 flex-shrink-0" />
                  <span>View Tickets</span>
                </Link>
              )}
              {(isOrganizationOwner || hasPermission('admin_chat.access')) && (
                <Link
                  to={`/org/${organization?.slug}/chat/admin`}
                  className="flex items-center px-4 py-2 text-sm rounded-lg transition-colors whitespace-nowrap"
                  style={{ color: theme.colors.primary }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = `${theme.colors.primary}1A`}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <MessageSquare className="h-4 w-4 mr-2 flex-shrink-0" />
                  <span>Chat with Admin</span>
                </Link>
              )}
              <Link
                to={`/org/${organization?.slug}/settings`}
                className="flex items-center px-4 py-2 text-sm rounded-lg transition-colors whitespace-nowrap"
                style={{ color: theme.colors.primary }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = `${theme.colors.primary}1A`}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <Settings className="h-4 w-4 mr-2 flex-shrink-0" />
                <span>Organization Settings</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

