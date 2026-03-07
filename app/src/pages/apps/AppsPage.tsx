import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import {
  Grid3x3,
  Search,
  Filter,
  Star,
  ShoppingCart,
  Check,
  X,
  Calendar,
  CreditCard,
  Loader2,
  Sparkles,
  TrendingUp,
  Clock,
  Zap,
  Shield,
  Users,
  Settings,
  ChevronRight,
  Play,
  Pause,
  RefreshCw,
  UserPlus,
  UserMinus,
  FolderKanban,
  Package,
  BookOpen,
  Calculator,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import toast from '@shared/hooks/useToast';
import { getErrorMessage, logError } from '../../utils/errorHandler';
import { convertUSDToNPR, formatCurrency, isNepalRegion } from '../../utils/currency';
import { usePermissions } from '../../hooks/usePermissions';
import { marketplaceService } from '../../services/marketplaceService';
import { LogIn, ShoppingBag, Pin, PinOff } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
// Import shared components
import { Button, Input, Card, CardContent, Badge, Modal, ModalHeader, ModalContent, ModalFooter } from '@shared';
import { SearchBar } from '@shared/components/data-display';
import { CardSkeleton } from '@shared/components/ui/Skeleton';
import { redirectToAppSubdomain } from '../../utils/appRouting';

interface App {
  id: number;
  name: string;
  slug: string;
  description: string;
  short_description: string | null;
  icon_url: string | null;
  banner_url: string | null;
  screenshots: string[] | null;
  category: string;
  tags: string[] | null;
  price: number;
  billing_period: 'monthly' | 'yearly';
  trial_days: number;
  features: Record<string, any> | null;
  permissions: string[] | null;
  developer_name: string;
  developer_email: string | null;
  developer_website: string | null;
  version: string;
  support_url: string | null;
  documentation_url: string | null;
  status: 'draft' | 'active' | 'archived';
  is_featured: boolean;
  sort_order: number;
  subscription_count: number;
  rating: number | null;
  review_count: number;
  created_at: string;
  updated_at: string;
}

interface OrganizationApp {
  id: number;
  organization_id: string;
  app_id: number;
  app: App;
  status: 'trial' | 'active' | 'cancelled' | 'expired';
  subscription_start: string;
  subscription_end: string;
  next_billing_date: string | null;
  trial_ends_at: string | null;
  trial_used: boolean;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  auto_renew: boolean;
  subscription_price: number;
  billing_period: 'monthly' | 'yearly';
  payment_id: string | null;
  created_at: string;
  updated_at: string;
}

export default function AppsPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { organization } = useAuthStore();
  const { theme } = useTheme();
  const queryClient = useQueryClient();
  const [isNepal] = useState(() => isNepalRegion());
  const { hasPermission } = usePermissions();
  const canSubscribe = hasPermission('apps.subscribe');
  const canManage = hasPermission('apps.manage');
  const canView = hasPermission('apps.view');
  const isBranch = organization?.org_type === 'BRANCH' || !!organization?.parent_id;

  // Filters and search
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'active' | 'trial' | 'expired'>('all');
  const [showMyApps, setShowMyApps] = useState(false);
  const [selectedApp, setSelectedApp] = useState<App | null>(null);
  const [showAppModal, setShowAppModal] = useState(false);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [purchaseBillingPeriod, setPurchaseBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const [purchaseGateway, setPurchaseGateway] = useState<'stripe' | 'esewa' | 'ime_pay'>('esewa');
  const [startTrial, setStartTrial] = useState(false);
  const [autoRenew, setAutoRenew] = useState(true);
  // Removed: selectedUserIds, showAccessModal, accessAppId - using invitation system instead

  // Fetch apps
  const { data: appsData, isLoading: appsLoading } = useQuery({
    queryKey: ['apps', searchTerm, selectedCategory],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (selectedCategory !== 'all') params.append('category', selectedCategory);
      params.append('status', 'active');
      const response = await api.get(`/apps?${params.toString()}`);
      return response.data;
    },
    enabled: canView,
  });

  // Fetch categories
  const { data: categoriesData } = useQuery({
    queryKey: ['app-categories'],
    queryFn: async () => {
      const response = await api.get('/apps/categories');
      return response.data;
    },
    enabled: canView,
  });

  // Fetch organization apps
  const { data: orgAppsData, isLoading: orgAppsLoading } = useQuery({
    queryKey: ['organization-apps', slug, selectedStatus],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedStatus !== 'all') params.append('status', selectedStatus);
      const response = await api.get(
        `/organizations/${organization?.id}/apps?${params.toString()}`,
      );
      return response.data;
    },
    enabled: !!organization?.id && canSubscribe,
  });

  // Fetch favorites
  const { data: favoriteAppsData } = useQuery({
    queryKey: ['marketplace-favorites'],
    queryFn: marketplaceService.getFavorites,
    enabled: !!organization?.id,
  });

  // Fetch pinned apps
  const { data: pinnedAppsData } = useQuery({
    queryKey: ['marketplace-pinned'],
    queryFn: marketplaceService.getPinned,
    enabled: !!organization?.id,
  });

  // Fetch organization members for user selection
  const { data: membersData } = useQuery({
    queryKey: ['users', organization?.id],
    queryFn: async () => {
      const response = await api.get('/users');
      return response.data;
    },
    enabled: !!organization?.id && (showPurchaseModal || showAppModal),
  });

  // Fetch app access for modal (when app is selected and subscribed)
  // Note: We'll define isSubscribed after orgApps is available
  // Removed: currentAppAccess query - using invitation system instead
  const currentAppAccess = null; // Placeholder to prevent errors
  const { data: _unused } = useQuery({
    queryKey: ['app-access-modal', selectedApp?.id, organization?.id],
    queryFn: async () => {
      if (!selectedApp?.id || !organization?.id) return [];
      try {
        const response = await api.get(`/organizations/${organization.id}/apps/${selectedApp.id}/access`);
        // Handle both { data: [...] } and [...] formats
        return response.data?.data || response.data || [];
      } catch (error: any) {
        // Don't throw for 403/404/500 - just return empty array
        if (error.response?.status === 403 || error.response?.status === 404 || error.response?.status === 500) {
          console.warn('Failed to fetch app access:', error.response?.status);
          return [];
        }
        throw error;
      }
    },
    enabled: !!organization?.id && !!selectedApp?.id && showAppModal && canManage,
    retry: false, // Don't retry on errors
  });

  // Removed: appAccessData query - using invitation system instead

  const favoriteAppIds = (favoriteAppsData || []).map((app: any) => app.id);
  const pinnedAppIds = (pinnedAppsData || []).map((app: any) => app.id);

  // Toggle favorite mutation
  const toggleFavoriteMutation = useMutation({
    mutationFn: async (appId: number) => {
      const isFavorite = favoriteAppIds.includes(appId);
      let newFavorites: number[];

      if (isFavorite) {
        newFavorites = favoriteAppIds.filter((id: number) => id !== appId);
      } else {
        if (favoriteAppIds.length >= 4) {
          throw new Error('Maximum 4 favorite apps allowed');
        }
        newFavorites = [...favoriteAppIds, appId];
      }

      await marketplaceService.setFavorites(newFavorites);
      return newFavorites;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketplace-favorites'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update favorites');
    },
  });

  // Toggle pin mutation
  const togglePinMutation = useMutation({
    mutationFn: async (appId: number) => {
      const isPinned = pinnedAppIds.includes(appId);

      if (isPinned) {
        await marketplaceService.unpinApp(appId);
      } else {
        // Removed subscription check - all organization members can pin apps
        await marketplaceService.pinApp(appId);
      }
      return !isPinned;
    },
    onSuccess: (isPinned) => {
      // Invalidate both pinned and last-used queries to ensure sidebar updates
      queryClient.invalidateQueries({ queryKey: ['marketplace-pinned'] });
      queryClient.invalidateQueries({ queryKey: ['marketplace-last-used'] });
      toast.success(isPinned ? 'App pinned to sidebar' : 'App unpinned from sidebar');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update pin status');
    },
  });

  // Purchase app mutation
  const purchaseMutation = useMutation({
    mutationFn: async (appId: number) => {
      // Check if already subscribed and purchased
      const existing = orgApps.find((oa) => oa.app_id === appId);
      if (existing && existing.payment_id && (existing.status === 'active' || existing.status === 'trial')) {
        throw new Error('You have already purchased this app');
      }

      const response = await api.post(`/organizations/${organization?.id}/apps`, {
        app_id: appId,
        billing_period: purchaseBillingPeriod,
        payment_method: purchaseGateway,
        start_trial: startTrial && !existing, // Only start trial if not already subscribed
        auto_renew: autoRenew,
      });
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['organization-apps'] });
      queryClient.invalidateQueries({ queryKey: ['apps'] });
      setShowPurchaseModal(false);
      setSelectedApp(null);

      // Handle payment redirect like packages do
      if (data.payment_url) {
        // Store return path before redirecting
        localStorage.setItem('payment_return_path', `/org/${slug}/apps`);

        // For Stripe, redirect directly
        if (purchaseGateway === 'stripe') {
          window.location.href = data.payment_url;
        } else {
          // For eSewa, check if we have form data
          // The payment_url should be the form URL for eSewa
          // If backend returns payment_form with formData, use that
          if (data.payment_form && data.payment_form.formData) {
            const form = document.createElement('form');
            form.method = 'POST';
            form.action = data.payment_url || data.payment_form.formUrl || data.payment_form.action;
            form.target = '_self';
            form.style.display = 'none';
            form.enctype = 'application/x-www-form-urlencoded';
            form.acceptCharset = 'UTF-8';

            Object.entries(data.payment_form.formData).forEach(([key, value]) => {
              const input = document.createElement('input');
              input.type = 'hidden';
              input.name = key;
              input.value = String(value);
              form.appendChild(input);
            });

            document.body.appendChild(form);
            // Small delay to ensure form is in DOM
            setTimeout(() => {
              form.submit();
            }, 100);
          } else if (data.payment_url) {
            // Fallback to direct redirect
            window.location.href = data.payment_url;
          } else {
            toast.error('Payment form data is missing. Please try again.');
          }
        }
      } else if (data.organization_app?.status === 'trial') {
        toast.success(`Trial started! Your ${data.organization_app.app?.name || 'app'} trial is now active.`);
      } else {
        toast.success('App subscription created successfully!');
      }
    },
    onError: (error: any) => {
      logError(error, 'App Purchase');
      let errorMessage = getErrorMessage(error);

      // Check for eSewa token authentication error
      const errorData = error?.response?.data;
      if (errorData?.set_token_message || errorData?.user_token) {
        errorMessage = 'eSewa requires token authentication. Please enable Mock Mode in .env (ESEWA_USE_MOCK_MODE=true) for development testing.';
      }

      toast.error(errorMessage, { duration: 5000 });
    },
  });

  // Cancel subscription mutation
  const cancelMutation = useMutation({
    mutationFn: async ({ appId, reason }: { appId: number; reason?: string }) => {
      const response = await api.patch(
        `/organizations/${organization?.id}/apps/${appId}/cancel`,
        { cancellation_reason: reason },
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-apps'] });
      toast.success('Subscription cancelled successfully');
    },
    onError: (error: any) => {
      logError(error, 'Cancel Subscription');
      toast.error(getErrorMessage(error));
    },
  });

  // Renew subscription mutation
  const renewMutation = useMutation({
    mutationFn: async ({ appId, paymentMethod }: { appId: number; paymentMethod: 'stripe' | 'esewa' }) => {
      const response = await api.post(
        `/organizations/${organization?.id}/apps/${appId}/renew`,
        { payment_method: paymentMethod },
      );
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['organization-apps'] });
      if (data.payment_url) {
        window.location.href = data.payment_url;
      } else {
        toast.success('Subscription renewed successfully!');
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to renew subscription');
    },
  });

  const apps: App[] = appsData?.data || [];
  const categories: string[] = categoriesData || [];
  const orgApps: OrganizationApp[] = orgAppsData?.data || [];

  // Helper function to check if app is subscribed (defined after orgApps)
  const isSubscribed = (appId: number): boolean => {
    const subscription = orgApps.find((oa) => oa.app_id === appId);
    return subscription ? (subscription.status === 'active' || subscription.status === 'trial') : false;
  };

  // Filter apps based on showMyApps
  const displayedApps = showMyApps
    ? apps.filter((app) => orgApps.some((oa) => oa.app_id === app.id))
    : apps;


  // Check if app is purchased (has payment)
  const isPurchased = (appId: number) => {
    const subscription = orgApps.find((oa) => oa.app_id === appId);
    return subscription?.payment_id != null;
  };

  // Check if user has access to app
  const hasAppAccess = async (appId: number): Promise<boolean> => {
    try {
      const response = await api.get(`/organizations/${organization?.id}/apps/${appId}/access`);
      return response.data.has_access || false;
    } catch {
      return false;
    }
  };

  const getSubscriptionStatus = (appId: number) => {
    const subscription = orgApps.find((oa) => oa.app_id === appId);
    return subscription?.status || null;
  };

  const getTrialSubscription = (appId: number): OrganizationApp | null => {
    const sub = orgApps.find((oa) => oa.app_id === appId);
    return sub?.status === 'trial' ? sub : null;
  };

  const activeAppsCount = orgApps.filter((oa) => oa.status === 'active' || oa.status === 'trial').length;
  const hasBundleDiscount = activeAppsCount >= 2;

  const getModalPrice = (basePrice: number) => {
    let price = basePrice;
    if (purchaseBillingPeriod === 'yearly') price = price * 12 * 0.80;
    if (hasBundleDiscount) price = price * 0.85;
    return price;
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getDaysRemaining = (expiresAt: string | null | undefined) => {
    if (!expiresAt) return null;
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diffTime = expiry.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const handlePurchase = (app: App) => {
    setSelectedApp(app);
    setShowPurchaseModal(true);
  };

  // Removed: handleManageAccess - using invitation system instead

  // Removed: grantAccessMutation and revokeAccessMutation - using invitation system instead

  if (!canView) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1a1d29] via-[#1e2132] to-[#252938] text-white">
        <div className="text-center">
          <Shield className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
          <p className="text-gray-400">You don't have permission to view apps.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: theme.colors.background, color: theme.colors.text }}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-xl backdrop-blur-sm border border-purple-500/30">
              <Grid3x3 className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                App Marketplace
              </h1>
              <p className="mt-1" style={{ color: theme.colors.textSecondary }}>Discover and subscribe to powerful apps</p>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1">
              <SearchBar
                placeholder="Search apps..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                theme={theme}
              />
            </div>
            <div className="flex gap-2">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-4 py-3 rounded-xl focus:outline-none focus:ring-2 transition-colors"
                style={{
                  backgroundColor: theme.colors.surface,
                  border: `1px solid ${theme.colors.border}`,
                  color: theme.colors.text,
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = theme.colors.primary;
                  e.currentTarget.style.boxShadow = `0 0 0 2px ${theme.colors.primary}33`;
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = theme.colors.border;
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <option value="all">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
              {canSubscribe && (
                <Button
                  onClick={() => setShowMyApps(!showMyApps)}
                  variant={showMyApps ? 'primary' : 'outline'}
                  className="px-4 py-3 h-auto"
                  style={showMyApps ? undefined : {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                    color: theme.colors.text,
                  }}
                >
                  {showMyApps ? 'All Apps' : 'My Apps'}
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Bundle Discount Banner */}
        {hasBundleDiscount && canSubscribe && (
          <div className="mb-4 flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium"
            style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', color: '#16a34a' }}
          >
            <Zap className="w-4 h-4 flex-shrink-0" />
            Bundle discount active — 15% off any additional apps you subscribe to
          </div>
        )}

        {/* Apps Grid */}
        {appsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {displayedApps.map((app) => {
              const subscribed = isSubscribed(app.id);
              const subscriptionStatus = getSubscriptionStatus(app.id);

              const isFavorite = favoriteAppIds.includes(app.id);
              const isPinned = pinnedAppIds.includes(app.id);

              return (
                <div
                  key={app.id}
                  className="group relative flex flex-col items-center p-4 rounded-2xl transition-all duration-300 hover:-translate-y-1"
                  style={{
                    background: `linear-gradient(to bottom right, ${theme.colors.surface}, ${theme.colors.background})`,
                    border: `1px solid ${theme.colors.border}`
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = theme.colors.primary;
                    e.currentTarget.style.boxShadow = `0 10px 20px -5px ${theme.colors.primary}33`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = theme.colors.border;
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  {/* Pin and Favorite Buttons */}
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        togglePinMutation.mutate(app.id);
                      }}
                      className="p-1.5 rounded-lg transition-colors"
                      style={{
                        backgroundColor: isPinned ? theme.colors.primary : theme.colors.background,
                        color: isPinned ? '#ffffff' : theme.colors.textSecondary,
                        border: `1px solid ${theme.colors.border}`
                      }}
                      onMouseEnter={(e) => {
                        if (!isPinned) {
                          e.currentTarget.style.backgroundColor = theme.colors.border;
                          e.currentTarget.style.color = theme.colors.text;
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isPinned) {
                          e.currentTarget.style.backgroundColor = theme.colors.background;
                          e.currentTarget.style.color = theme.colors.textSecondary;
                        }
                      }}
                      title={isPinned ? 'Unpin from taskbar' : 'Pin to taskbar'}
                    >
                      {isPinned ? (
                        <Pin className="w-4 h-4 fill-current" />
                      ) : (
                        <PinOff className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavoriteMutation.mutate(app.id);
                      }}
                      className="p-1.5 rounded-lg transition-colors"
                      style={{
                        backgroundColor: isFavorite ? theme.colors.primary : theme.colors.background,
                        color: isFavorite ? '#ffffff' : theme.colors.textSecondary,
                        border: `1px solid ${theme.colors.border}`
                      }}
                      onMouseEnter={(e) => {
                        if (!isFavorite) {
                          e.currentTarget.style.backgroundColor = theme.colors.border;
                          e.currentTarget.style.color = theme.colors.text;
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isFavorite) {
                          e.currentTarget.style.backgroundColor = theme.colors.background;
                          e.currentTarget.style.color = theme.colors.textSecondary;
                        }
                      }}
                      title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                    >
                      <Star className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
                    </button>
                  </div>

                  {/* App Icon - Clickable */}
                  <div
                    className="relative mb-3 cursor-pointer"
                    onClick={() => {
                      setSelectedApp(app);
                      setShowAppModal(true);
                    }}
                  >
                    <div className="w-20 h-20 rounded-2xl overflow-hidden flex items-center justify-center transition-transform duration-300 group-hover:scale-110"
                      style={{
                        background: app.icon_url ? 'transparent' : `linear-gradient(to bottom right, ${theme.colors.primary}33, ${theme.colors.secondary}33)`,
                        border: `2px solid ${theme.colors.border}`
                      }}
                    >
                      {(() => {
                        // Check if icon_url is a Lucide icon name
                        if (app.icon_url === 'Users') return <Users className="w-10 h-10" style={{ color: theme.colors.primary }} />;
                        if (app.icon_url === 'FolderKanban') return <FolderKanban className="w-10 h-10" style={{ color: theme.colors.primary }} />;
                        if (app.icon_url === 'Package') return <Package className="w-10 h-10" style={{ color: theme.colors.primary }} />;
                        if (app.icon_url === 'BookOpen' || app.slug === 'mero-khata') return <BookOpen className="w-10 h-10" style={{ color: theme.colors.primary }} />;
                        if (app.icon_url === 'Calculator' || app.slug === 'mero-accounting') return <Calculator className="w-10 h-10" style={{ color: theme.colors.primary }} />;

                        return app.icon_url ? (
                          <img
                            src={app.icon_url}
                            alt={app.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Grid3x3 className="w-10 h-10" style={{ color: theme.colors.primary }} />
                        );
                      })()}
                    </div>
                    {/* Status Badges */}
                    {app.is_featured && (
                      <div className="absolute -top-1 -right-1 bg-gradient-to-r from-[#faa61a] to-[#fbbf24] text-white px-2 py-0.5 rounded-full text-xs font-bold flex items-center gap-1 shadow-lg backdrop-blur-sm border border-[#faa61a]/30">
                        <Star className="w-2.5 h-2.5 fill-current" />
                      </div>
                    )}
                    {subscribed && (
                      <div className="absolute -bottom-1 -right-1 bg-gradient-to-r from-[#23a55a] to-[#2dd4bf] text-white px-2 py-0.5 rounded-full text-xs font-bold flex items-center gap-1 shadow-lg backdrop-blur-sm border border-[#23a55a]/30">
                        <Check className="w-2.5 h-2.5" />
                      </div>
                    )}
                  </div>

                  {/* App Name - Clickable */}
                  <h3
                    className="text-sm font-semibold text-center transition-colors duration-300 line-clamp-2 w-full cursor-pointer"
                    style={{ color: theme.colors.text }}
                    onMouseEnter={(e) => e.currentTarget.style.color = theme.colors.primary}
                    onMouseLeave={(e) => e.currentTarget.style.color = theme.colors.text}
                    onClick={() => {
                      setSelectedApp(app);
                      setShowAppModal(true);
                    }}
                  >
                    {app.name}
                  </h3>

                  {/* Trial Days Banner */}
                  {(() => {
                    const trialSub = getTrialSubscription(app.id);
                    if (!trialSub) return null;
                    const daysLeft = getDaysRemaining(trialSub.trial_ends_at);
                    if (daysLeft === null) return null;
                    const isUrgent = daysLeft <= 3;
                    return (
                      <div className="mt-1 text-xs font-semibold px-2 py-0.5 rounded-full w-full text-center"
                        style={{
                          backgroundColor: isUrgent ? '#fef2f2' : '#fffbeb',
                          color: isUrgent ? '#dc2626' : '#d97706',
                          border: `1px solid ${isUrgent ? '#fca5a5' : '#fcd34d'}`,
                        }}
                      >
                        {daysLeft > 0 ? `Trial — ${daysLeft}d left` : 'Trial expired'}
                        {isUrgent && daysLeft > 0 && (
                          <button
                            className="ml-1 underline text-xs"
                            onClick={(e) => { e.stopPropagation(); handlePurchase(app); }}
                          >Upgrade</button>
                        )}
                      </div>
                    );
                  })()}
                </div>
              );
            })}
          </div>
        )}

        {/* App Detail Modal */}
        {showAppModal && selectedApp && (
          <div className="fixed inset-0 backdrop-blur-sm z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.8)' }}>
            <div className="rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border" style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border }}>
              <div className="relative">
                {/* Banner */}
                <div className="relative h-64" style={{ background: `linear-gradient(to bottom right, ${theme.colors.primary}33, ${theme.colors.secondary}33)` }}>
                  {selectedApp.banner_url ? (
                    <img
                      src={selectedApp.banner_url}
                      alt={selectedApp.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      {(() => {
                        // Check if icon_url is a Lucide icon name
                        if (selectedApp.icon_url === 'Users') return <Users className="w-32 h-32" style={{ color: theme.colors.primary }} />;
                        if (selectedApp.icon_url === 'FolderKanban') return <FolderKanban className="w-32 h-32" style={{ color: theme.colors.primary }} />;
                        if (selectedApp.icon_url === 'Package') return <Package className="w-32 h-32" style={{ color: theme.colors.primary }} />;
                        if (selectedApp.icon_url === 'BookOpen' || selectedApp.slug === 'mero-khata') return <BookOpen className="w-32 h-32" style={{ color: theme.colors.primary }} />;
                        if (selectedApp.icon_url === 'Calculator' || selectedApp.slug === 'mero-accounting') return <Calculator className="w-32 h-32" style={{ color: theme.colors.primary }} />;

                        return selectedApp.icon_url ? (
                          <img
                            src={selectedApp.icon_url}
                            alt={selectedApp.name}
                            className="w-32 h-32 rounded-2xl"
                          />
                        ) : (
                          <Grid3x3 className="w-24 h-24" style={{ color: theme.colors.primary, opacity: 0.5 }} />
                        );
                      })()}
                    </div>
                  )}
                  <Button
                    onClick={() => {
                      setShowAppModal(false);
                      setSelectedApp(null);
                    }}
                    variant="ghost"
                    size="sm"
                    className="absolute top-4 right-4"
                    style={{
                      color: theme.colors.text,
                    }}
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>

                {/* Content */}
                <div className="p-8">
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <h2 className="text-3xl font-bold mb-2" style={{ color: theme.colors.text }}>{selectedApp.name}</h2>
                      <p style={{ color: theme.colors.textSecondary }}>{selectedApp.category}</p>
                    </div>
                    <div className="text-right">
                      {(selectedApp.price === 0 || isBranch) ? (
                        <div className="text-3xl font-bold" style={{ background: `linear-gradient(to right, ${theme.colors.primary}, ${theme.colors.secondary})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                          {selectedApp.price === 0 ? 'Free' : 'Subscription Required'}
                        </div>
                      ) : (
                        <>
                          <div className="text-2xl font-bold" style={{ background: `linear-gradient(to right, ${theme.colors.primary}, ${theme.colors.secondary})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                            {formatCurrency(selectedApp.price, 'USD')}
                          </div>
                          <div className="text-xl font-semibold" style={{ color: theme.colors.text }}>
                            {formatCurrency(convertUSDToNPR(selectedApp.price), 'NPR')}
                          </div>
                          <div className="text-sm" style={{ color: theme.colors.textSecondary }}>
                            /{selectedApp.billing_period === 'monthly' ? 'month' : 'year'}
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  <p className="mb-6" style={{ color: theme.colors.text }}>{selectedApp.description}</p>

                  {/* Removed: Subscription Info section */}

                  {/* Features */}
                  {selectedApp.features && (
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold mb-4" style={{ color: theme.colors.text }}>Features</h3>
                      <div className="grid grid-cols-2 gap-3">
                        {Object.entries(selectedApp.features).map(([key, value]) => (
                          <div
                            key={key}
                            className="flex items-center gap-2 text-sm rounded-lg p-3"
                            style={{ backgroundColor: theme.colors.background, border: `1px solid ${theme.colors.border}` }}
                          >
                            <Check className="w-4 h-4 flex-shrink-0" style={{ color: theme.colors.primary }} />
                            <span style={{ color: theme.colors.text }}>
                              {key}: {String(value)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Removed: User Access Management - using invitation system instead */}

                  {/* Actions */}
                  <div className="flex gap-3">
                    {/* Pin Button */}
                    {isSubscribed(selectedApp.id) && (
                      <button
                        onClick={() => {
                          togglePinMutation.mutate(selectedApp.id);
                        }}
                        className="px-4 py-2 rounded-lg transition-all border"
                        style={pinnedAppIds.includes(selectedApp.id) ? {
                          color: theme.colors.primary,
                          backgroundColor: `${theme.colors.primary}33`,
                          borderColor: `${theme.colors.primary}80`,
                        } : {
                          color: theme.colors.textSecondary,
                          borderColor: theme.colors.border,
                          backgroundColor: theme.colors.surface,
                        }}
                        onMouseEnter={(e) => {
                          if (!pinnedAppIds.includes(selectedApp.id)) {
                            e.currentTarget.style.color = theme.colors.primary;
                            e.currentTarget.style.backgroundColor = `${theme.colors.primary}1A`;
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!pinnedAppIds.includes(selectedApp.id)) {
                            e.currentTarget.style.color = theme.colors.textSecondary;
                            e.currentTarget.style.backgroundColor = theme.colors.surface;
                          }
                        }}
                        title={pinnedAppIds.includes(selectedApp.id) ? 'Unpin from sidebar' : 'Pin to sidebar'}
                      >
                        {pinnedAppIds.includes(selectedApp.id) ? (
                          <Pin className="w-5 h-5 fill-current" />
                        ) : (
                          <PinOff className="w-5 h-5" />
                        )}
                      </button>
                    )}
                    {/* Favorite Button */}
                    <button
                      onClick={() => {
                        toggleFavoriteMutation.mutate(selectedApp.id);
                      }}
                      className="px-4 py-2 rounded-lg transition-all border"
                      style={favoriteAppIds.includes(selectedApp.id) ? {
                        color: '#faa61a',
                        backgroundColor: '#faa61a33',
                        borderColor: '#faa61a80',
                      } : {
                        color: theme.colors.textSecondary,
                        borderColor: theme.colors.border,
                        backgroundColor: theme.colors.surface,
                      }}
                      onMouseEnter={(e) => {
                        if (!favoriteAppIds.includes(selectedApp.id)) {
                          e.currentTarget.style.color = '#faa61a';
                          e.currentTarget.style.backgroundColor = '#faa61a1A';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!favoriteAppIds.includes(selectedApp.id)) {
                          e.currentTarget.style.color = theme.colors.textSecondary;
                          e.currentTarget.style.backgroundColor = theme.colors.surface;
                        }
                      }}
                      title={favoriteAppIds.includes(selectedApp.id) ? 'Remove from favorites' : 'Add to favorites'}
                    >
                      <Star className={`w-5 h-5 ${favoriteAppIds.includes(selectedApp.id) ? 'fill-current' : ''}`} />
                    </button>
                    {(() => {
                      // Mero SaaS Kit - Coming Soon (no purchase/subscribe)
                      if (selectedApp.slug === 'mero-saas-kit') {
                        return (
                          <button
                            onClick={() => {
                              marketplaceService.recordUsage(selectedApp.id);
                              const path = slug ? `/org/${slug}/app/${selectedApp.slug}` : `/app/${selectedApp.slug}`;
                              navigate(path);
                            }}
                            className="flex-1 py-3 border rounded-xl font-semibold transition-all flex items-center justify-center gap-2"
                            style={{
                              background: `linear-gradient(to right, ${theme.colors.primary}33, ${theme.colors.secondary}33)`,
                              color: theme.colors.primary,
                              borderColor: `${theme.colors.primary}80`,
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = `linear-gradient(to right, ${theme.colors.primary}4D, ${theme.colors.secondary}4D)`;
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = `linear-gradient(to right, ${theme.colors.primary}33, ${theme.colors.secondary}33)`;
                            }}
                          >
                            <Sparkles className="w-5 h-5" />
                            View Coming Soon
                          </button>
                        );
                      }

                      const purchased = isPurchased(selectedApp.id);
                      if (!isSubscribed(selectedApp.id) && canSubscribe && !isBranch) {
                        return (
                          <button
                            onClick={() => {
                              setShowAppModal(false);
                              handlePurchase(selectedApp);
                            }}
                            className="flex-1 py-3 text-white rounded-xl font-semibold transition-all"
                            style={{
                              background: `linear-gradient(to right, ${theme.colors.primary}, ${theme.colors.secondary})`,
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = `linear-gradient(to right, ${theme.colors.secondary}, ${theme.colors.primary})`;
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = `linear-gradient(to right, ${theme.colors.primary}, ${theme.colors.secondary})`;
                            }}
                          >
                            Subscribe Now
                          </button>
                        );
                      } else if (isSubscribed(selectedApp.id) && purchased) {
                        return (
                          <button
                            onClick={() => {
                              marketplaceService.recordUsage(selectedApp.id);
                              // Use subdomain routing
                              if (slug) {
                                redirectToAppSubdomain(selectedApp.slug, slug);
                              } else {
                                // Fallback to path-based if no organization slug
                                navigate(`/org/${slug}/app/${selectedApp.slug}`);
                              }
                            }}
                            className="flex-1 py-3 border rounded-xl font-semibold transition-all flex items-center justify-center gap-2"
                            style={{
                              backgroundColor: '#23a55a33',
                              color: '#23a55a',
                              borderColor: '#23a55a80',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = '#23a55a4D';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = '#23a55a33';
                            }}
                          >
                            <LogIn className="w-5 h-5" />
                            Enter App
                          </button>
                        );
                      } else if (isSubscribed(selectedApp.id) && !purchased && !isBranch) {
                        return (
                          <button
                            onClick={() => {
                              setShowAppModal(false);
                              handlePurchase(selectedApp);
                            }}
                            disabled={purchased}
                            className="flex-1 py-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 border"
                            style={purchased ? {
                              backgroundColor: theme.colors.surface,
                              color: theme.colors.textSecondary,
                              borderColor: theme.colors.border,
                              cursor: 'not-allowed',
                            } : {
                              backgroundColor: `${theme.colors.primary}33`,
                              color: theme.colors.primary,
                              borderColor: `${theme.colors.primary}80`,
                            }}
                            onMouseEnter={(e) => {
                              if (!purchased) {
                                e.currentTarget.style.backgroundColor = `${theme.colors.primary}4D`;
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!purchased) {
                                e.currentTarget.style.backgroundColor = `${theme.colors.primary}33`;
                              }
                            }}
                          >
                            <ShoppingBag className="w-5 h-5" />
                            Purchase
                          </button>
                        );
                      }
                      return null;
                    })()}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Purchase Modal */}
        {showPurchaseModal && selectedApp && (
          <div className="fixed inset-0 backdrop-blur-sm z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.8)' }}>
            <div className="rounded-2xl max-w-md w-full border p-6" style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border }}>
              <h3 className="text-2xl font-bold mb-4" style={{ color: theme.colors.text }}>Subscribe to {selectedApp.name}</h3>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: theme.colors.text }}>Billing Period</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setPurchaseBillingPeriod('monthly')}
                      className="p-3 rounded-lg border transition-all"
                      style={purchaseBillingPeriod === 'monthly' ? {
                        backgroundColor: `${theme.colors.primary}33`,
                        borderColor: `${theme.colors.primary}80`,
                        color: theme.colors.primary,
                      } : {
                        backgroundColor: theme.colors.background,
                        borderColor: theme.colors.border,
                        color: theme.colors.text,
                      }}
                    >
                      Monthly
                    </button>
                    <button
                      onClick={() => setPurchaseBillingPeriod('yearly')}
                      className="p-3 rounded-lg border transition-all"
                      style={purchaseBillingPeriod === 'yearly' ? {
                        backgroundColor: `${theme.colors.primary}33`,
                        borderColor: `${theme.colors.primary}80`,
                        color: theme.colors.primary,
                      } : {
                        backgroundColor: theme.colors.background,
                        borderColor: theme.colors.border,
                        color: theme.colors.text,
                      }}
                    >
                      <div>Annual</div>
                      <div className="text-xs font-semibold" style={{ color: '#16a34a' }}>· 20% off</div>
                    </button>
                  </div>
                </div>

                {selectedApp.trial_days > 0 && (
                  <div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={startTrial}
                        onChange={(e) => setStartTrial(e.target.checked)}
                        className="w-4 h-4 rounded"
                        style={{ accentColor: theme.colors.primary }}
                      />
                      <span className="text-sm" style={{ color: theme.colors.text }}>
                        Start {selectedApp.trial_days}-day free trial
                      </span>
                    </label>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: theme.colors.text }}>Payment Method</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['esewa', 'ime_pay', 'stripe'] as const).map((gw) => (
                      <button
                        key={gw}
                        onClick={() => setPurchaseGateway(gw)}
                        className="p-2 rounded-lg border transition-all text-sm"
                        style={purchaseGateway === gw ? {
                          backgroundColor: `${theme.colors.primary}33`,
                          borderColor: `${theme.colors.primary}80`,
                          color: theme.colors.primary,
                        } : {
                          backgroundColor: theme.colors.background,
                          borderColor: theme.colors.border,
                          color: theme.colors.text,
                        }}
                      >
                        {gw === 'esewa' ? 'eSewa' : gw === 'ime_pay' ? 'IME Pay' : 'Stripe'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rounded-lg border p-4 space-y-1" style={{ backgroundColor: theme.colors.background, borderColor: theme.colors.border }}>
                  {selectedApp.price === 0 ? (
                    <div className="text-xl font-bold" style={{ color: theme.colors.text }}>Free</div>
                  ) : (() => {
                    const modalPrice = getModalPrice(selectedApp.price);
                    const isNpr = purchaseGateway === 'esewa' || purchaseGateway === 'ime_pay';
                    const displayPrice = isNpr ? convertUSDToNPR(modalPrice) : modalPrice;
                    const currency = isNpr ? 'NPR' : 'USD';
                    return (
                      <>
                        <div className="flex justify-between items-center">
                          <span className="text-sm" style={{ color: theme.colors.textSecondary }}>
                            Base ({purchaseBillingPeriod === 'yearly' ? '12 months' : '1 month'})
                          </span>
                          <span className="font-semibold" style={{ color: theme.colors.text }}>
                            {formatCurrency(isNpr ? convertUSDToNPR(selectedApp.price * (purchaseBillingPeriod === 'yearly' ? 12 : 1)) : selectedApp.price * (purchaseBillingPeriod === 'yearly' ? 12 : 1), currency)}
                          </span>
                        </div>
                        {purchaseBillingPeriod === 'yearly' && (
                          <div className="flex justify-between items-center text-sm" style={{ color: '#16a34a' }}>
                            <span>Annual discount (20% off)</span>
                            <span>-{formatCurrency(isNpr ? convertUSDToNPR(selectedApp.price * 12 * 0.20) : selectedApp.price * 12 * 0.20, currency)}</span>
                          </div>
                        )}
                        {hasBundleDiscount && (
                          <div className="flex justify-between items-center text-sm" style={{ color: '#16a34a' }}>
                            <span>Bundle discount (15% off)</span>
                            <span>-{formatCurrency(isNpr ? convertUSDToNPR(selectedApp.price * (purchaseBillingPeriod === 'yearly' ? 12 * 0.80 : 1) * 0.15) : selectedApp.price * (purchaseBillingPeriod === 'yearly' ? 12 * 0.80 : 1) * 0.15, currency)}</span>
                          </div>
                        )}
                        <div className="flex justify-between items-center pt-1 border-t" style={{ borderColor: theme.colors.border }}>
                          <span className="font-semibold" style={{ color: theme.colors.textSecondary }}>Total</span>
                          <span className="text-xl font-bold" style={{ color: theme.colors.text }}>
                            {formatCurrency(displayPrice, currency)}
                          </span>
                        </div>
                      </>
                    );
                  })()}
                </div>

                <div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoRenew}
                      onChange={(e) => setAutoRenew(e.target.checked)}
                      className="w-4 h-4 rounded"
                      style={{ accentColor: theme.colors.primary }}
                    />
                    <span className="text-sm" style={{ color: theme.colors.text }}>
                      Enable auto-renewal
                    </span>
                  </label>
                  <p className="text-xs mt-1 ml-6" style={{ color: theme.colors.textSecondary }}>
                    Your subscription will automatically renew. You can disable this anytime.
                  </p>
                </div>

                {/* Removed: Grant Access section - using invitation system instead */}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowPurchaseModal(false);
                    setSelectedApp(null);
                  }}
                  className="flex-1 py-3 border rounded-lg transition-colors"
                  style={{
                    backgroundColor: theme.colors.background,
                    borderColor: theme.colors.border,
                    color: theme.colors.text,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = theme.colors.surface;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = theme.colors.background;
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => purchaseMutation.mutate(selectedApp.id)}
                  disabled={purchaseMutation.isPending}
                  className="flex-1 py-3 text-white rounded-lg font-semibold transition-all disabled:opacity-50"
                  style={{
                    background: `linear-gradient(to right, ${theme.colors.primary}, ${theme.colors.secondary})`,
                  }}
                  onMouseEnter={(e) => {
                    if (!purchaseMutation.isPending) {
                      e.currentTarget.style.background = `linear-gradient(to right, ${theme.colors.secondary}, ${theme.colors.primary})`;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!purchaseMutation.isPending) {
                      e.currentTarget.style.background = `linear-gradient(to right, ${theme.colors.primary}, ${theme.colors.secondary})`;
                    }
                  }}
                >
                  {purchaseMutation.isPending ? (
                    <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                  ) : (
                    'Subscribe'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Removed: App Access Management Modal - using invitation system instead */}
      </div>
    </div>
  );
}

