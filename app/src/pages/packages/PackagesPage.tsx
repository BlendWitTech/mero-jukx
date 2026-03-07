import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { Package, Check, Loader2, CreditCard, X, Calendar, ChevronDown, ChevronUp, Sparkles, Globe, Edit2, Save } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../contexts/ThemeContext';
import toast from '@shared/hooks/useToast';
import {
  convertUSDToNPR,
  formatCurrency,
  isNepalRegion,
} from '../../utils/currency';
import { usePermissions } from '../../hooks/usePermissions';
import { formatLimit } from '../../utils/formatLimit';
// Import shared components
import { Button, Card } from '@shared';
export default function PackagesPage() {
  const { isAuthenticated, accessToken, _hasHydrated } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'packages' | 'features'>('packages');
  const { theme } = useTheme();
  const queryClient = useQueryClient();
  const { hasPermission } = usePermissions();

  const { data: organization } = useQuery<{ id: string; name: string; slug: string; country?: string }>({
    queryKey: ['organization'],
    queryFn: async () => {
      const response = await api.get('/organizations/me');
      return response.data;
    },
    enabled: _hasHydrated && isAuthenticated && !!accessToken,
  });

  const isNepal = useMemo(() => {
    if (organization?.country) {
      return organization.country.toLowerCase() === 'nepal';
    }
    return isNepalRegion();
  }, [organization?.country]);

  const canUpgradePackage = hasPermission('packages.upgrade');
  const canPurchaseFeature = hasPermission('packages.features.purchase');
  const [selectedGateway, setSelectedGateway] = useState<string>('esewa');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [pendingPayment, setPendingPayment] = useState<{
    type: 'package' | 'feature';
    item: any;
  } | null>(null);

  const [selectedPeriod, setSelectedPeriod] = useState<'3_months' | '6_months' | '1_year' | 'custom'>('3_months');
  const [customMonths, setCustomMonths] = useState<number>(12);
  const [isCurrentPackageExpanded, setIsCurrentPackageExpanded] = useState(true);
  const [upgradePriceInfo, setUpgradePriceInfo] = useState<{
    new_package_price: number;
    prorated_credit: number;
    final_price: number;
    remaining_days: number | null;
    can_upgrade: boolean;
    reason?: string;
  } | null>(null);
  const [showCredentialModal, setShowCredentialModal] = useState(false);
  const [pendingAutoRenew, setPendingAutoRenew] = useState<boolean | null>(null);
  const [autoRenewCredentials, setAutoRenewCredentials] = useState({
    payment_method: 'esewa' as string,
    esewa_username: '',
    stripe_card_token: '',
    card_last4: '',
    card_brand: '',
  });
  const [isEditingSlug, setIsEditingSlug] = useState(false);
  const [newSlug, setNewSlug] = useState('');

  // Format date helper
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Calculate days remaining
  const getDaysRemaining = (expiresAt: string | null | undefined) => {
    if (!expiresAt) return null;
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diffTime = expiry.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Calculate subscription price with discount
  const calculateSubscriptionPrice = (basePrice: number, period: string, customMonths?: number) => {
    let months: number;
    let discountPercent: number;

    switch (period) {
      case '3_months':
        months = 3;
        discountPercent = 0;
        break;
      case '6_months':
        months = 6;
        discountPercent = 4;
        break;
      case '1_year':
        months = 12;
        discountPercent = 7.5;
        break;
      case 'custom':
        months = customMonths || 12;
        if (months > 12) {
          discountPercent = 10;
        } else if (months === 12) {
          discountPercent = 7.5;
        } else if (months >= 6) {
          discountPercent = 4;
        } else {
          discountPercent = 0;
        }
        break;
      default:
        months = 3;
        discountPercent = 0;
    }

    const originalPrice = basePrice * months;
    const discountAmount = (originalPrice * discountPercent) / 100;
    const discountedPrice = originalPrice - discountAmount;

    return {
      months,
      discountPercent,
      originalPrice: Math.round(originalPrice * 100) / 100,
      discountedPrice: Math.round(discountedPrice * 100) / 100,
      monthlyPrice: Math.round((discountedPrice / months) * 100) / 100,
    };
  };

  // Get package display name with upgrades
  const getPackageDisplayName = () => {
    if (!currentPackage?.package) return 'No Package';

    const packageName = currentPackage.package.name;
    const activeFeatures = currentPackage.active_features || [];

    if (activeFeatures.length === 0) {
      return packageName;
    }

    const featureNames = activeFeatures
      .map((f: any) => {
        if (f.feature?.type === 'user_upgrade') {
          return `+${f.feature.value || 'Unlimited'} Users`;
        } else if (f.feature?.type === 'role_upgrade') {
          return `+${f.feature.value || 'Unlimited'} Roles`;
        }
        return f.feature?.name;
      })
      .filter(Boolean)
      .join(', ');

    return `${packageName} (${featureNames})`;
  };

  // Toggle auto-renewal mutation
  const toggleAutoRenewMutation = useMutation({
    mutationFn: async (data: { enabled: boolean; credentials?: any }) => {
      const response = await api.put('/organizations/me/package/auto-renew', {
        enabled: data.enabled,
        credentials: data.credentials,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['current-package'] });
      toast.success('Auto-renewal setting updated');
      setShowCredentialModal(false);
      setPendingAutoRenew(null);
      setAutoRenewCredentials({
        payment_method: 'esewa',
        esewa_username: '',
        stripe_card_token: '',
        card_last4: '',
        card_brand: '',
      });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to update auto-renewal setting');
    },
  });

  const handleAutoRenewToggle = (enabled: boolean) => {
    if (enabled) {
      // If enabling, show credential modal first
      setPendingAutoRenew(true);
      setShowCredentialModal(true);
    } else {
      // If disabling, just toggle directly
      toggleAutoRenewMutation.mutate({ enabled: false });
    }
  };

  const handleSaveCredentials = () => {
    if (pendingAutoRenew === null) return;

    // Validate credentials based on payment method
    if (autoRenewCredentials.payment_method === 'esewa') {
      if (!autoRenewCredentials.esewa_username.trim()) {
        toast.error('Please enter your eSewa username');
        return;
      }
    } else if (autoRenewCredentials.payment_method === 'stripe') {
      if (!autoRenewCredentials.stripe_card_token) {
        toast.error('Please provide payment card information');
        return;
      }
    }

    toggleAutoRenewMutation.mutate({
      enabled: pendingAutoRenew,
      credentials: autoRenewCredentials,
    });
  };

  // Refetch current package when component mounts, comes into focus, or when package is updated
  // This ensures we have the latest package data after payment
  useEffect(() => {
    if (_hasHydrated && isAuthenticated && accessToken) {
      // Handle package update events from payment success page
      const handlePackageUpdate = () => {
        console.log('Package update event received, refetching package data...');
        queryClient.invalidateQueries({ queryKey: ['current-package'], exact: false });
        queryClient.refetchQueries({ queryKey: ['current-package'], exact: false });
        queryClient.refetchQueries({ queryKey: ['packages'], exact: false });
        queryClient.refetchQueries({ queryKey: ['package-features'], exact: false });
      };

      // Refetch current package when page is focused
      const handleFocus = () => {
        queryClient.refetchQueries({ queryKey: ['current-package'], exact: false });
      };

      window.addEventListener('focus', handleFocus);
      window.addEventListener('package-updated', handlePackageUpdate);

      // Also refetch on mount
      queryClient.refetchQueries({ queryKey: ['current-package'], exact: false });

      return () => {
        window.removeEventListener('focus', handleFocus);
        window.removeEventListener('package-updated', handlePackageUpdate);
      };
    }
  }, [_hasHydrated, isAuthenticated, accessToken, queryClient]);

  const { data: currentPackage, isLoading: isLoadingCurrent } = useQuery({
    queryKey: ['current-package'],
    queryFn: async () => {
      const response = await api.get('/organizations/me/package');
      console.log('Current package data fetched:', response.data);
      console.log('Package ID:', response.data?.package?.id);
      console.log('Package Name:', response.data?.package?.name);
      return response.data;
    },
    enabled: _hasHydrated && isAuthenticated && !!accessToken,
    retry: (failureCount, error: any) => {
      // Retry on 401 errors (token refresh will handle it)
      if (error?.response?.status === 401) {
        return failureCount < 2; // Retry up to 2 times for 401 errors
      }
      return failureCount < 3; // Default retry logic for other errors
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
    refetchOnWindowFocus: true, // Refetch when window comes into focus
    refetchOnMount: true, // Refetch when component mounts
  });

  const { data: packages, isLoading: isLoadingPackages } = useQuery({
    queryKey: ['packages'],
    queryFn: async () => {
      const response = await api.get('/packages');
      return Array.isArray(response.data) ? response.data : [];
    },
    enabled: _hasHydrated && isAuthenticated && !!accessToken,
    retry: (failureCount, error: any) => {
      // Retry on 401 errors (token refresh will handle it)
      if (error?.response?.status === 401) {
        return failureCount < 2; // Retry up to 2 times for 401 errors
      }
      return failureCount < 3; // Default retry logic for other errors
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
  });

  const { data: features, isLoading: isLoadingFeatures } = useQuery({
    queryKey: ['package-features'],
    queryFn: async () => {
      const response = await api.get('/packages/features');
      return Array.isArray(response.data) ? response.data : [];
    },
    enabled: _hasHydrated && isAuthenticated && !!accessToken,
    retry: (failureCount, error: any) => {
      // Retry on 401 errors (token refresh will handle it)
      if (error?.response?.status === 401) {
        return failureCount < 2; // Retry up to 2 times for 401 errors
      }
      return failureCount < 3; // Default retry logic for other errors
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
  });


  // Update slug when organization data changes
  useEffect(() => {
    if (organization?.slug && !isEditingSlug) {
      setNewSlug(organization.slug);
    }
  }, [organization?.slug, isEditingSlug]);

  // Update slug mutation
  const updateSlugMutation = useMutation({
    mutationFn: async (slug: string) => {
      const response = await api.put('/organizations/me/slug', { slug });
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['organization'] });
      queryClient.setQueryData(['organization'], data);
      setIsEditingSlug(false);
      toast.success('Organization URL updated successfully');
      // Update auth store
      const authStore = useAuthStore.getState();
      if (authStore.organization) {
        authStore.setOrganization({ ...authStore.organization, slug: data.slug });
      }
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to update organization URL');
    },
  });

  const canEditSlug = currentPackage?.package?.slug &&
    ['basic', 'platinum', 'diamond'].includes(currentPackage.package.slug);

  // Create payment mutation for package upgrade
  const createPackagePaymentMutation = useMutation({
    mutationFn: async (data: { package_id: number; amount: number; package_name: string; gateway: 'esewa' | 'stripe'; period?: string; custom_months?: number }) => {
      console.log('Creating package payment:', {
        gateway: data.gateway,
        payment_type: 'package_upgrade',
        amount: data.amount,
        package_id: data.package_id,
        description: `Upgrade to ${data.package_name}`,
      });

      // Ensure amount is a number, not a string
      const amount = typeof data.amount === 'string' ? parseFloat(data.amount) : data.amount;
      const packageId = typeof data.package_id === 'string' ? parseInt(data.package_id, 10) : data.package_id;

      console.log('Sending payment request:', {
        gateway: data.gateway,
        payment_type: 'package_upgrade',
        amount: amount,
        amountType: typeof amount,
        package_id: packageId,
        packageIdType: typeof packageId,
        description: `Upgrade to ${data.package_name}`,
      });

      const response = await api.post('/payments', {
        gateway: data.gateway,
        payment_type: 'package_upgrade',
        amount: amount, // Ensure it's a number
        description: `Upgrade to ${data.package_name}`,
        package_id: packageId, // Send as number, not string
        period: data.period,
        custom_months: data.custom_months,
        metadata: {
          package_id: packageId,
          package_name: data.package_name,
          period: data.period,
          custom_months: data.custom_months,
        },
      });
      return response.data;
    },
    onSuccess: (data) => {
      // Verify we have the payment form data
      if (!data.payment_form || !data.payment_form.formUrl) {
        toast.error('Invalid payment form data received');
        console.error('Payment form data:', data);
        return;
      }

      // Store return path before redirecting to payment gateway
      localStorage.setItem('payment_return_path', '/packages');

      const gateway = data.payment?.gateway || 'esewa';
      console.log(`Creating ${gateway} payment for package upgrade:`, {
        url: data.payment_form.formUrl,
        data: data.payment_form.formData,
      });

      try {
        if (gateway === 'stripe' || gateway === 'paypal' || gateway === 'khalti') {
          // Stripe: redirect to checkout URL
          window.location.href = data.payment_form.formUrl;
        } else {
          // eSewa: create and submit form
          if (!data.payment_form.formData) {
            toast.error(`Invalid ${gateway} payment form data`);
            return;
          }

          const form = document.createElement('form');
          form.method = 'POST';
          form.action = data.payment_form.formUrl;
          form.target = '_self';
          form.style.display = 'none';

          // Add form fields
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
          }, 10);
        }
      } catch (error) {
        console.error('Error submitting payment form:', error);
        toast.error('Failed to redirect to payment gateway. Please try again.');
      }
    },
    onError: (error: any) => {
      console.error('Package payment error:', error);
      console.error('Error response:', error?.response?.data);

      // Check for eSewa token authentication error
      const errorData = error?.response?.data;
      if (errorData?.set_token_message || errorData?.user_token) {
        toast.error(
          `${selectedGateway === 'esewa' ? 'eSewa' : selectedGateway} requires specific configuration or token. Please check your environment settings.`,
          { duration: 6000 }
        );
      } else {
        let errorMessage = errorData?.message ||
          errorData?.error ||
          error?.message ||
          'Failed to create payment';

        // Provide more specific error messages for Stripe
        if (errorMessage.includes('Stripe') || errorMessage.includes('stripe')) {
          if (errorMessage.includes('authentication') || errorMessage.includes('API keys') || errorMessage.includes('not configured')) {
            errorMessage = 'Stripe is not configured. Please contact support or check your environment settings.';
          } else if (errorMessage.includes('amount')) {
            errorMessage = 'Invalid payment amount. Please try again.';
          } else if (errorMessage.includes('currency')) {
            errorMessage = 'Invalid currency. Please try again.';
          }
        }

        toast.error(errorMessage, { duration: 5000 });
      }

      // Log validation errors if present
      if (errorData?.message && Array.isArray(errorData.message)) {
        console.error('Validation errors:', errorData.message);
      }

      // Log full error for debugging
      console.error('Full error object:', error);
    },
  });

  // Create payment mutation for feature purchase
  const createFeaturePaymentMutation = useMutation({
    mutationFn: async (data: { feature_id: number; amount: number; feature_name: string; gateway: string }) => {
      console.log('Creating feature payment:', {
        gateway: data.gateway,
        payment_type: 'one_time',
        amount: data.amount,
        feature_id: data.feature_id,
        description: `Purchase ${data.feature_name}`,
      });

      const response = await api.post('/payments', {
        gateway: data.gateway,
        payment_type: 'one_time',
        amount: Number(data.amount), // Ensure it's a number
        description: `Purchase ${data.feature_name}`,
        metadata: {
          feature_id: data.feature_id,
          feature_name: data.feature_name,
        },
      });
      return response.data;
    },
    onSuccess: (data) => {
      // Verify we have the payment form data
      if (!data.payment_form || !data.payment_form.formUrl) {
        toast.error('Invalid payment form data received');
        console.error('Payment form data:', data);
        return;
      }

      // Store return path before redirecting to payment gateway
      localStorage.setItem('payment_return_path', '/packages');

      const gateway = data.payment?.gateway || 'esewa';
      console.log(`Creating ${gateway} payment for feature purchase:`, {
        url: data.payment_form.formUrl,
        data: data.payment_form.formData,
      });

      try {
        if (gateway === 'stripe') {
          // Stripe: redirect to checkout URL
          window.location.href = data.payment_form.formUrl;
        } else {
          // eSewa: create and submit form
          if (!data.payment_form.formData) {
            toast.error('Invalid eSewa payment form data');
            return;
          }

          const form = document.createElement('form');
          form.method = 'POST';
          form.action = data.payment_form.formUrl;
          form.target = '_self';
          form.style.display = 'none';
          form.enctype = 'application/x-www-form-urlencoded';

          // Add form fields
          Object.entries(data.payment_form.formData).forEach(([key, value]) => {
            const input = document.createElement('input');
            input.type = 'hidden';
            input.name = key;
            input.value = String(value);
            form.appendChild(input);
          });

          console.log('Submitting eSewa form:', {
            url: form.action,
            method: form.method,
            fields: Object.keys(data.payment_form.formData),
          });

          document.body.appendChild(form);

          // Small delay to ensure form is in DOM
          setTimeout(() => {
            form.submit();
          }, 10);
        }
      } catch (error) {
        console.error('Error submitting payment form:', error);
        toast.error('Failed to redirect to payment gateway. Please try again.');
      }
    },
    onError: (error: any) => {
      console.error('Feature payment error:', error);
      console.error('Error response:', error?.response?.data);

      // Check for eSewa token authentication error
      const errorData = error?.response?.data;
      if (errorData?.set_token_message || errorData?.user_token) {
        toast.error(
          `${selectedGateway === 'esewa' ? 'eSewa' : selectedGateway} requires specific configuration or token. Please check your environment settings.`,
          { duration: 6000 }
        );
      } else {
        let errorMessage = errorData?.message ||
          errorData?.error ||
          error?.message ||
          'Failed to create payment';

        // Provide more specific error messages for Stripe
        if (errorMessage.includes('Stripe') || errorMessage.includes('stripe')) {
          if (errorMessage.includes('authentication') || errorMessage.includes('API keys') || errorMessage.includes('not configured')) {
            errorMessage = 'Stripe is not configured. Please contact support or check your environment settings.';
          } else if (errorMessage.includes('amount')) {
            errorMessage = 'Invalid payment amount. Please try again.';
          } else if (errorMessage.includes('currency')) {
            errorMessage = 'Invalid currency. Please try again.';
          }
        }

        toast.error(errorMessage, { duration: 5000 });
      }

      // Log full error for debugging
      console.error('Full error object:', error);

      // Log validation errors if present
      if (errorData?.message && Array.isArray(errorData.message)) {
        console.error('Validation errors:', errorData.message);
      }
    },
  });

  // Calculate upgrade price mutation
  const calculateUpgradePriceMutation = useMutation({
    mutationFn: async (data: { package_id: number; period?: string; custom_months?: number }) => {
      const response = await api.post('/organizations/me/package/calculate-upgrade-price', {
        package_id: data.package_id,
        period: data.period,
        custom_months: data.custom_months,
      });
      return response.data;
    },
    onError: (error: any) => {
      console.error('Failed to calculate upgrade price:', error);
    },
  });

  const handlePackageUpgrade = async (pkg: any) => {
    // Don't allow purchasing freemium
    if (pkg.slug === 'freemium') {
      toast.error('Freemium package cannot be purchased. It will be automatically selected when your current package expires.');
      return;
    }

    if (!pkg.price || pkg.price === 0) {
      // Free package - upgrade directly without payment
      toast.success('This is a free package. Upgrading...');
      // TODO: Call upgrade endpoint directly for free packages
      return;
    }

    // Reset period selection when opening modal
    setSelectedPeriod('3_months');
    setCustomMonths(12);
    setUpgradePriceInfo(null);

    // Show payment method selection modal first
    setPendingPayment({ type: 'package', item: pkg });
    setShowPaymentModal(true);

    // Calculate upgrade price if upgrading mid-subscription (after modal opens)
    try {
      const priceInfo = await calculateUpgradePriceMutation.mutateAsync({
        package_id: pkg.id,
        period: '3_months',
      });
      setUpgradePriceInfo(priceInfo);

      if (!priceInfo.can_upgrade && priceInfo.reason) {
        toast.error(priceInfo.reason);
        setShowPaymentModal(false);
        setPendingPayment(null);
        return;
      }
    } catch (error: any) {
      console.error('Error calculating upgrade price:', error);
      // Don't block - backend will handle validation
      if (error?.response?.data?.reason) {
        toast.error(error.response.data.reason);
        setShowPaymentModal(false);
        setPendingPayment(null);
        return;
      }
    }
  };

  const handleFeaturePurchase = (feature: any) => {
    if (!feature.price || feature.price === 0) {
      toast.success('This feature is free. Purchasing...');
      // TODO: Call purchase endpoint directly for free features
      return;
    }

    // Show payment method selection modal
    setPendingPayment({ type: 'feature', item: feature });
    setShowPaymentModal(true);
  };

  const handleConfirmPayment = async () => {
    if (!pendingPayment) return;

    const item = pendingPayment.item;

    if (pendingPayment.type === 'package') {
      // Recalculate upgrade price with selected period
      let finalPrice = 0;

      if (upgradePriceInfo && upgradePriceInfo.can_upgrade && upgradePriceInfo.prorated_credit > 0) {
        // Mid-subscription upgrade - recalculate with selected period
        try {
          const priceInfo = await calculateUpgradePriceMutation.mutateAsync({
            package_id: item.id,
            period: selectedPeriod,
            custom_months: selectedPeriod === 'custom' ? customMonths : undefined,
          });

          if (!priceInfo.can_upgrade) {
            toast.error(priceInfo.reason || 'Cannot upgrade to this package');
            return;
          }

          finalPrice = priceInfo.final_price;
        } catch (error) {
          console.error('Error calculating final upgrade price:', error);
          // Fall back to regular calculation
          const subscription = calculateSubscriptionPrice(
            item.price,
            selectedPeriod,
            selectedPeriod === 'custom' ? customMonths : undefined
          );
          finalPrice = subscription.discountedPrice;
        }
      } else {
        // New subscription or expired package
        const subscription = calculateSubscriptionPrice(
          item.price,
          selectedPeriod,
          selectedPeriod === 'custom' ? customMonths : undefined
        );
        finalPrice = subscription.discountedPrice;
      }

      // Calculate amount based on gateway
      // Stripe uses USD, eSewa uses NPR
      const amount = selectedGateway === 'stripe'
        ? finalPrice  // Use final USD price for Stripe
        : convertUSDToNPR(finalPrice); // Convert final price to NPR for eSewa

      createPackagePaymentMutation.mutate({
        package_id: item.id,
        amount: amount,
        package_name: item.name,
        gateway: selectedGateway,
        period: selectedPeriod,
        custom_months: selectedPeriod === 'custom' ? customMonths : undefined,
      });
    } else {
      // Features don't have subscription periods
      const amount = selectedGateway === 'stripe'
        ? item.price
        : convertUSDToNPR(item.price);

      createFeaturePaymentMutation.mutate({
        feature_id: item.id,
        amount: amount,
        feature_name: item.name,
        gateway: selectedGateway,
      });
    }

    setShowPaymentModal(false);
    setPendingPayment(null);
  };

  return (
    <div className="w-full p-6" style={{ backgroundColor: theme.colors.background, color: theme.colors.text }}>
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg" style={{ backgroundColor: theme.colors.primary }}>
            <Package className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: theme.colors.text }}>Packages</h1>
            <p className="mt-2 text-sm sm:text-base" style={{ color: theme.colors.textSecondary }}>Manage your organization package and features</p>
          </div>
        </div>
      </div>

      {isLoadingCurrent || isLoadingPackages || isLoadingFeatures ? (
        <div className="animate-pulse">
          <Card style={{ backgroundColor: theme.colors.surface, border: `1px solid ${theme.colors.border}` }}>
            <div className="h-8 rounded w-1/4 mb-4" style={{ backgroundColor: theme.colors.background }}></div>
            <div className="h-4 rounded w-1/2" style={{ backgroundColor: theme.colors.background }}></div>
          </Card>
        </div>
      ) : (
        <>
          {/* Current Package - Collapsible */}
          {currentPackage && (
            <div className="mb-4 overflow-hidden">
              <Card style={{ backgroundColor: theme.colors.surface, border: `1px solid ${theme.colors.border}` }}>
                <button
                  onClick={() => setIsCurrentPackageExpanded(!isCurrentPackageExpanded)}
                  className="w-full flex items-center justify-between p-4 transition-colors"
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.colors.background}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <div className="flex items-center flex-1">
                    <div className="flex items-center justify-center w-12 h-12 rounded-lg mr-4" style={{ background: `linear-gradient(to bottom right, ${theme.colors.primary}, ${theme.colors.secondary})` }}>
                      <Package className="h-6 w-6 text-white" />
                    </div>
                    <div className="text-left flex-1">
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-semibold" style={{ color: theme.colors.text }}>
                          {getPackageDisplayName()}
                        </h2>
                        {currentPackage?.active_features && currentPackage.active_features.length > 0 && (
                          <span className="px-2 py-0.5 text-xs font-medium rounded-full flex items-center gap-1" style={{ background: `linear-gradient(to right, ${theme.colors.primary}33, ${theme.colors.primary}4D)`, color: theme.colors.primary, border: `1px solid ${theme.colors.primary}4D` }}>
                            <Sparkles className="h-3 w-3" />
                            Upgraded
                          </span>
                        )}
                      </div>
                      <p className="text-sm mt-1" style={{ color: theme.colors.textSecondary }}>
                        {formatLimit(currentPackage?.current_limits?.users)} users, {formatLimit(currentPackage?.current_limits?.roles)} roles
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {(() => {
                      // Calculate total price including package and features
                      const packagePrice = parseFloat(String(currentPackage?.package?.price || 0)) || 0;
                      const featuresPrice = currentPackage?.active_features?.reduce((sum: number, feature: any) => {
                        const featurePrice = parseFloat(String(feature.feature?.price || 0)) || 0;
                        return sum + featurePrice;
                      }, 0) || 0;
                      const totalPrice = packagePrice + featuresPrice;

                      return (
                        <div className="text-right">
                          <p className="text-xl font-bold" style={{ color: theme.colors.primary }}>
                            {totalPrice === 0
                              ? 'Free'
                              : isNepal
                                ? `${formatCurrency(convertUSDToNPR(totalPrice), 'NPR')} (${formatCurrency(totalPrice, 'USD')})`
                                : `${formatCurrency(totalPrice, 'USD')} (${formatCurrency(convertUSDToNPR(totalPrice), 'NPR')})`}
                          </p>
                          {totalPrice > 0 && (
                            <p className="text-xs" style={{ color: theme.colors.textSecondary }}>per month</p>
                          )}
                        </div>
                      );
                    })()}
                    {isCurrentPackageExpanded ? (
                      <ChevronUp className="h-5 w-5" style={{ color: theme.colors.textSecondary }} />
                    ) : (
                      <ChevronDown className="h-5 w-5" style={{ color: theme.colors.textSecondary }} />
                    )}
                  </div>
                </button>

                {isCurrentPackageExpanded && (
                  <div className="px-4 pb-4 pt-4 space-y-4" style={{ borderTop: `1px solid ${theme.colors.border}` }}>

                    {/* Package Expiration */}
                    {currentPackage?.package_expires_at && (
                      <div className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: theme.colors.background, border: `1px solid ${theme.colors.border}` }}>
                        <div className="flex items-center text-sm" style={{ color: theme.colors.textSecondary }}>
                          <Calendar className="h-4 w-4 mr-2" style={{ color: theme.colors.primary }} />
                          <span>Expires on: <strong style={{ color: theme.colors.text }}>{formatDate(currentPackage.package_expires_at)}</strong></span>
                        </div>
                        {(() => {
                          const daysRemaining = getDaysRemaining(currentPackage.package_expires_at);
                          if (daysRemaining !== null) {
                            if (daysRemaining < 0) {
                              return <span className="px-2 py-1 text-xs font-semibold bg-[#ed4245]/20 text-[#ed4245] border border-[#ed4245]/30 rounded">Expired</span>;
                            } else if (daysRemaining <= 3) {
                              return <span className="px-2 py-1 text-xs font-semibold bg-[#ed4245]/20 text-[#ed4245] border border-[#ed4245]/30 rounded">{daysRemaining} day{daysRemaining !== 1 ? 's' : ''} left</span>;
                            } else if (daysRemaining <= 7) {
                              return <span className="px-2 py-1 text-xs font-semibold bg-[#faa61a]/20 text-[#faa61a] border border-[#faa61a]/30 rounded">{daysRemaining} day{daysRemaining !== 1 ? 's' : ''} left</span>;
                            } else {
                              return <span className="px-2 py-1 text-xs font-medium bg-[#23a55a]/20 text-[#23a55a] border border-[#23a55a]/30 rounded">{daysRemaining} day{daysRemaining !== 1 ? 's' : ''} left</span>;
                            }
                          }
                          return null;
                        })()}
                      </div>
                    )}

                    {/* Auto-Renewal Toggle */}
                    {currentPackage?.package && currentPackage.package.price > 0 && canUpgradePackage && (
                      <div className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: theme.colors.background, border: `1px solid ${theme.colors.border}` }}>
                        <div className="flex items-center gap-3 flex-1">
                          <div className="p-2 rounded-lg" style={{ backgroundColor: theme.colors.primary + '33' }}>
                            <Calendar className="h-4 w-4" style={{ color: theme.colors.primary }} />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium" style={{ color: theme.colors.text }}>Auto-Renewal</p>
                            <p className="text-xs mt-0.5" style={{ color: theme.colors.textSecondary }}>Automatically renew when package expires</p>
                          </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer flex-shrink-0 ml-4">
                          <input
                            type="checkbox"
                            checked={currentPackage?.package_auto_renew || false}
                            onChange={(e) => handleAutoRenewToggle(e.target.checked)}
                            disabled={toggleAutoRenewMutation.isPending}
                            className="sr-only peer"
                          />
                          <div
                            className="w-11 h-6 peer-focus:outline-none peer-focus:ring-4 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:border after:rounded-full after:h-5 after:w-5 after:transition-all"
                            style={{
                              backgroundColor: theme.colors.surface,
                              // @ts-ignore - CSS custom property
                              '--tw-ring-color': theme.colors.primary + '4D'
                            } as React.CSSProperties}
                            onMouseEnter={(e) => {
                              if (!currentPackage?.package_auto_renew) {
                                e.currentTarget.style.backgroundColor = theme.colors.border;
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!currentPackage?.package_auto_renew) {
                                e.currentTarget.style.backgroundColor = theme.colors.surface;
                              }
                            }}
                          ></div>
                        </label>
                      </div>
                    )}

                    {/* Package and Features Cards */}
                    <div>
                      <h3 className="text-sm font-semibold mb-3" style={{ color: theme.colors.text }}>Active Subscriptions</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Package Card */}
                        {(() => {
                          const packagePrice = parseFloat(String(currentPackage?.package?.price || 0)) || 0;
                          if (packagePrice === 0) return null;

                          return (
                            <div className="p-4 rounded-lg" style={{ background: `linear-gradient(to bottom right, ${theme.colors.surface}, ${theme.colors.background})`, border: `1px solid ${theme.colors.border}` }}>
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <Package className="h-5 w-5" style={{ color: theme.colors.primary }} />
                                  <span className="text-sm font-medium" style={{ color: theme.colors.text }}>
                                    {currentPackage?.package?.name || 'Package'}
                                  </span>
                                </div>
                              </div>
                              <div className="mt-2">
                                <p className="text-2xl font-bold" style={{ color: theme.colors.primary }}>
                                  {isNepal
                                    ? formatCurrency(convertUSDToNPR(packagePrice), 'NPR')
                                    : formatCurrency(packagePrice, 'USD')}
                                </p>
                              </div>
                            </div>
                          );
                        })()}

                        {/* Feature Cards */}
                        {currentPackage?.active_features && currentPackage.active_features.length > 0 && (
                          <>
                            {currentPackage.active_features.map((feature: any) => {
                              const featurePrice = parseFloat(String(feature.feature?.price || 0)) || 0;
                              if (featurePrice === 0) return null;

                              return (
                                <div
                                  key={feature.id}
                                  className="p-4 rounded-lg"
                                  style={{ background: `linear-gradient(to bottom right, ${theme.colors.background}, ${theme.colors.surface})`, border: `1px solid ${theme.colors.border}` }}
                                >
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                      <Sparkles className="h-5 w-5" style={{ color: theme.colors.primary }} />
                                      <span className="text-sm font-medium" style={{ color: theme.colors.text }}>
                                        {feature.feature?.type === 'user_upgrade'
                                          ? `+${feature.feature.value || 'Unlimited'} Users`
                                          : feature.feature?.type === 'role_upgrade'
                                            ? `+${feature.feature.value || 'Unlimited'} Roles`
                                            : feature.feature?.name || 'Feature'}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="mt-2">
                                    <p className="text-2xl font-bold" style={{ color: theme.colors.primary }}>
                                      {isNepal
                                        ? formatCurrency(convertUSDToNPR(featurePrice), 'NPR')
                                        : formatCurrency(featurePrice, 'USD')}
                                    </p>
                                  </div>
                                </div>
                              );
                            })}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </Card>
            </div>
          )}

          {/* Organization URL Editor */}
          {canEditSlug && organization && (
            <div className="mb-4">
              <Card style={{ backgroundColor: theme.colors.surface, border: `1px solid ${theme.colors.border}` }}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg" style={{ backgroundColor: theme.colors.primary + '33' }}>
                    <Globe className="h-5 w-5" style={{ color: theme.colors.primary }} />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-lg font-semibold" style={{ color: theme.colors.text }}>Organization URL</h2>
                    <p className="text-sm mt-1" style={{ color: theme.colors.textSecondary }}>
                      Customize your organization's URL slug
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: theme.colors.textSecondary }}>
                      Current URL
                    </label>
                    <div className="flex items-center gap-2 p-3 rounded-lg" style={{ backgroundColor: theme.colors.background, border: `1px solid ${theme.colors.border}` }}>
                      <span className="text-sm" style={{ color: theme.colors.textSecondary }}>https://yourdomain.com/org/</span>
                      <span className="text-sm font-medium" style={{ color: theme.colors.text }}>{organization.slug || 'your-slug'}</span>
                    </div>
                  </div>

                  {isEditingSlug ? (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium mb-2" style={{ color: theme.colors.textSecondary }}>
                          New URL Slug
                        </label>
                        <input
                          type="text"
                          value={newSlug}
                          onChange={(e) => {
                            // Allow lowercase letters, numbers, and hyphens
                            // Remove any characters that are not a-z, 0-9, or hyphen
                            let value = e.target.value.toLowerCase();
                            // First, remove invalid characters (keep only a-z, 0-9, and -)
                            value = value.replace(/[^a-z0-9\-]/g, '');
                            // Remove consecutive hyphens (replace multiple hyphens with single hyphen)
                            // But allow typing hyphens at the end while user is typing
                            value = value.replace(/-{2,}/g, '-');
                            setNewSlug(value);
                          }}
                          onBlur={(e) => {
                            // Clean up leading/trailing hyphens only when user finishes editing
                            let value = e.target.value;
                            // Remove leading and trailing hyphens
                            value = value.replace(/^-+|-+$/g, '');
                            setNewSlug(value);
                          }}
                          placeholder="your-organization-slug"
                          className="w-full px-4 py-2 rounded-lg focus:outline-none focus:ring-2 transition-colors"
                          style={{
                            backgroundColor: theme.colors.background,
                            border: `1px solid ${theme.colors.border}`,
                            color: theme.colors.text,
                            // @ts-ignore - CSS custom property
                            '--tw-ring-color': theme.colors.primary
                          } as React.CSSProperties}
                          disabled={updateSlugMutation.isPending}
                        />
                        <p className="mt-1 text-xs" style={{ color: theme.colors.textSecondary }}>
                          Only lowercase letters, numbers, and hyphens. Must be 3-50 characters.
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            if (newSlug.length >= 3 && newSlug.length <= 50 && newSlug !== organization.slug) {
                              updateSlugMutation.mutate(newSlug);
                            } else if (newSlug === organization.slug) {
                              toast.error('Please enter a different slug');
                            } else {
                              toast.error('Slug must be between 3 and 50 characters');
                            }
                          }}
                          disabled={updateSlugMutation.isPending || newSlug.length < 3 || newSlug.length > 50 || newSlug === organization.slug}
                          className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          style={{ backgroundColor: theme.colors.primary, color: '#ffffff' }}
                          onMouseEnter={(e) => {
                            if (!updateSlugMutation.isPending && newSlug.length >= 3 && newSlug.length <= 50 && newSlug !== organization.slug) {
                              e.currentTarget.style.backgroundColor = theme.colors.secondary;
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!updateSlugMutation.isPending && newSlug.length >= 3 && newSlug.length <= 50 && newSlug !== organization.slug) {
                              e.currentTarget.style.backgroundColor = theme.colors.primary;
                            }
                          }}
                        >
                          {updateSlugMutation.isPending ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            <>
                              <Save className="h-4 w-4" />
                              Save
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => {
                            setIsEditingSlug(false);
                            setNewSlug(organization.slug || '');
                          }}
                          disabled={updateSlugMutation.isPending}
                          className="px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                          style={{
                            backgroundColor: theme.colors.surface,
                            color: theme.colors.textSecondary
                          }}
                          onMouseEnter={(e) => {
                            if (!updateSlugMutation.isPending) {
                              e.currentTarget.style.backgroundColor = theme.colors.background;
                              e.currentTarget.style.color = theme.colors.text;
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!updateSlugMutation.isPending) {
                              e.currentTarget.style.backgroundColor = theme.colors.surface;
                              e.currentTarget.style.color = theme.colors.textSecondary;
                            }
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setIsEditingSlug(true);
                        setNewSlug(organization.slug || '');
                      }}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors"
                      style={{
                        backgroundColor: theme.colors.surface,
                        color: theme.colors.textSecondary
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = theme.colors.background;
                        e.currentTarget.style.color = theme.colors.text;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = theme.colors.surface;
                        e.currentTarget.style.color = theme.colors.textSecondary;
                      }}
                    >
                      <Edit2 className="h-4 w-4" />
                      Edit URL
                    </button>
                  )}
                </div>
              </Card>
            </div>
          )}

          {/* Other Available Packages - Only show if user can upgrade */}
          {canUpgradePackage && packages && packages.length > 0 && (
            <div className="mb-4">
              {packages.filter((pkg: any) => {
                const currentPackageId = currentPackage?.package?.id;
                return currentPackageId !== undefined &&
                  (currentPackageId !== pkg.id &&
                    String(currentPackageId) !== String(pkg.id) &&
                    Number(currentPackageId) !== Number(pkg.id));
              }).length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {packages.filter((pkg: any) => {
                    const currentPackageId = currentPackage?.package?.id;
                    return currentPackageId !== undefined &&
                      (currentPackageId !== pkg.id &&
                        String(currentPackageId) !== String(pkg.id) &&
                        Number(currentPackageId) !== Number(pkg.id));
                  }).map((pkg: any) => {
                    // Compare package IDs - handle both number and string types
                    const currentPackageId = currentPackage?.package?.id;
                    const isCurrentPackage = currentPackageId !== undefined &&
                      (currentPackageId === pkg.id ||
                        String(currentPackageId) === String(pkg.id) ||
                        Number(currentPackageId) === Number(pkg.id));

                    return (
                      <div
                        key={pkg.id}
                        className="relative overflow-hidden rounded-xl transition-all duration-300 hover:shadow-xl flex flex-col h-full"
                        style={isCurrentPackage
                          ? {
                            border: `2px solid ${theme.colors.primary}`,
                            background: `linear-gradient(to bottom right, ${theme.colors.primary}33, ${theme.colors.primary}1A)`,
                            boxShadow: `0 10px 15px -3px ${theme.colors.primary}33`,
                            backgroundColor: theme.colors.surface
                          }
                          : pkg.slug === 'diamond'
                            ? {
                              border: `2px solid ${theme.colors.primary}80`,
                              background: `linear-gradient(to bottom right, ${theme.colors.primary}20, ${theme.colors.primary}10)`,
                              backgroundColor: theme.colors.surface
                            }
                            : {
                              border: `2px solid ${theme.colors.border}`,
                              backgroundColor: theme.colors.surface
                            }
                        }
                        onMouseEnter={(e) => {
                          if (!isCurrentPackage && pkg.slug !== 'diamond') {
                            e.currentTarget.style.borderColor = theme.colors.primary;
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isCurrentPackage && pkg.slug !== 'diamond') {
                            e.currentTarget.style.borderColor = theme.colors.border;
                          }
                        }}
                      >
                        {isCurrentPackage && (
                          <div className="absolute top-0 right-0 px-3 py-1 text-xs font-semibold rounded-bl-lg text-white" style={{ background: `linear-gradient(to bottom right, ${theme.colors.primary}, ${theme.colors.secondary})` }}>
                            Current
                          </div>
                        )}

                        <div className="p-6 flex flex-col flex-1">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <div className="p-2 rounded-lg" style={{ backgroundColor: isCurrentPackage ? theme.colors.primary + '33' : theme.colors.surface }}>
                                  <Package className="h-5 w-5" style={{ color: isCurrentPackage ? theme.colors.primary : theme.colors.textSecondary }} />
                                </div>
                                <h3 className="text-xl font-bold" style={{ color: theme.colors.text }}>{pkg.name}</h3>
                              </div>
                              {pkg.description && (
                                <p className="text-sm" style={{ color: theme.colors.textSecondary }}>{pkg.description}</p>
                              )}
                            </div>
                          </div>

                          <div className="mb-6">
                            {pkg.price === 0 ? (
                              <div className="text-center py-4">
                                <div className="text-5xl font-bold mb-2" style={{ background: `linear-gradient(to right, ${theme.colors.primary}, ${theme.colors.secondary})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                                  Free
                                </div>
                                <p className="text-sm" style={{ color: theme.colors.textSecondary }}>Forever</p>
                              </div>
                            ) : (
                              <div className="text-center py-4 rounded-xl p-4" style={{ background: `linear-gradient(to bottom right, ${theme.colors.background}, ${theme.colors.surface})`, border: `1px solid ${theme.colors.border}` }}>
                                <div className="flex items-baseline justify-center gap-2 mb-2 flex-wrap">
                                  <span className="text-5xl font-bold" style={{ background: `linear-gradient(to right, ${theme.colors.primary}, ${theme.colors.secondary})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                                    {isNepal ? formatCurrency(convertUSDToNPR(pkg.price), 'NPR') : formatCurrency(pkg.price, 'USD')}
                                  </span>
                                  <span className="text-sm" style={{ color: theme.colors.textSecondary }}>
                                    {isNepal ? (
                                      <span>({formatCurrency(pkg.price, 'USD')} USD)</span>
                                    ) : (
                                      <span>({formatCurrency(convertUSDToNPR(pkg.price), 'NPR')} NPR)</span>
                                    )}
                                  </span>
                                </div>
                                <p className="text-sm font-medium mt-2" style={{ color: theme.colors.textSecondary }}>per month</p>
                              </div>
                            )}
                          </div>

                          <div className="mb-4 space-y-3 flex-1">
                            <div className="flex items-center gap-2 p-2 rounded-lg" style={{ backgroundColor: theme.colors.surface }}>
                              <Check className="h-5 w-5 text-green-500 flex-shrink-0" />
                              <span className="text-sm" style={{ color: theme.colors.textSecondary }}>
                                <strong style={{ color: theme.colors.text }}>{formatLimit(pkg.base_user_limit)}</strong> users included
                              </span>
                            </div>
                            <div className="flex items-center gap-2 p-2 rounded-lg" style={{ backgroundColor: theme.colors.surface }}>
                              <Check className="h-5 w-5 text-green-500 flex-shrink-0" />
                              <span className="text-sm" style={{ color: theme.colors.textSecondary }}>
                                <strong style={{ color: theme.colors.text }}>{pkg.base_role_limit}</strong> base roles
                                {pkg.additional_role_limit > 0 && (
                                  <span className="text-xs ml-1" style={{ color: theme.colors.textSecondary, opacity: 0.8 }}>
                                    (+{pkg.additional_role_limit} additional)
                                  </span>
                                )}
                              </span>
                            </div>
                            {/* Chat System - show for all packages */}
                            <div className="flex items-center gap-2 p-2 rounded-lg" style={{ backgroundColor: theme.colors.surface }}>
                              {pkg.slug === 'platinum' || pkg.slug === 'diamond' ? (
                                <>
                                  <Check className="h-5 w-5 text-green-500 flex-shrink-0" />
                                  <span className="text-sm text-green-500">
                                    <strong>Chat System</strong> included
                                  </span>
                                </>
                              ) : (
                                <>
                                  <X className="h-5 w-5 text-red-500 flex-shrink-0" />
                                  <span className="text-sm text-red-500">
                                    <strong>Chat System</strong>
                                  </span>
                                </>
                              )}
                            </div>
                            {/* Ticket System - show for all packages */}
                            <div className="flex items-center gap-2 p-2 rounded-lg" style={{ backgroundColor: theme.colors.surface }}>
                              {pkg.slug === 'platinum' || pkg.slug === 'diamond' ? (
                                <>
                                  <Check className="h-5 w-5 text-green-500 flex-shrink-0" />
                                  <span className="text-sm text-green-500">
                                    <strong>Ticket System</strong> included
                                  </span>
                                </>
                              ) : (
                                <>
                                  <X className="h-5 w-5 text-red-500 flex-shrink-0" />
                                  <span className="text-sm text-red-500">
                                    <strong>Ticket System</strong>
                                  </span>
                                </>
                              )}
                            </div>
                            {/* Custom Organization URL - show for all packages */}
                            <div className="flex items-center gap-2 p-2 rounded-lg" style={{ backgroundColor: theme.colors.surface }}>
                              {pkg.slug === 'basic' || pkg.slug === 'platinum' || pkg.slug === 'diamond' ? (
                                <>
                                  <Check className="h-5 w-5 text-green-500 flex-shrink-0" />
                                  <span className="text-sm text-green-500">
                                    <strong>Custom Organization URL</strong>
                                  </span>
                                </>
                              ) : (
                                <>
                                  <X className="h-5 w-5 text-red-500 flex-shrink-0" />
                                  <span className="text-sm text-red-500">
                                    <strong>Custom Organization URL</strong>
                                  </span>
                                </>
                              )}
                            </div>
                          </div>

                          <div className="mt-auto pt-4">
                            {(() => {
                              // Don't show purchase button for freemium
                              if (pkg.slug === 'freemium') {
                                return (
                                  <Button variant="secondary" fullWidth disabled leftIcon={<Check className="h-5 w-5" />}>
                                    {isCurrentPackage ? 'Current Package' : 'Default Package'}
                                  </Button>
                                );
                              }

                              // Check if this is an upgrade (higher tier) or downgrade (lower tier)
                              // Higher sort_order = Higher tier (Freemium=1, Basic=2, Platinum=3, Diamond=4)
                              const currentPackageSortOrder = currentPackage?.package?.sort_order || 999;
                              const isUpgrade = pkg.sort_order > currentPackageSortOrder;
                              const isDowngrade = pkg.sort_order < currentPackageSortOrder;
                              const hasActiveSubscription = currentPackage?.package_expires_at &&
                                new Date(currentPackage.package_expires_at) > new Date();

                              if (isCurrentPackage) {
                                return (
                                  <Button variant="secondary" fullWidth disabled leftIcon={<Check className="h-5 w-5" />}>
                                    Current Package
                                  </Button>
                                );
                              }

                              // Show upgrade button for higher packages, or if current package expired
                              if (isUpgrade || !hasActiveSubscription) {
                                if (!canUpgradePackage) {
                                  return (
                                    <div className="w-full py-3 px-4 font-semibold rounded-lg text-center text-sm" style={{ backgroundColor: theme.colors.surface, color: theme.colors.textSecondary }}>
                                      Upgrade not available
                                    </div>
                                  );
                                }
                                return (
                                  <Button
                                    onClick={() => handlePackageUpgrade(pkg)}
                                    disabled={createPackagePaymentMutation.isPending || calculateUpgradePriceMutation.isPending}
                                    variant="primary"
                                    fullWidth
                                    isLoading={createPackagePaymentMutation.isPending || calculateUpgradePriceMutation.isPending}
                                    leftIcon={<CreditCard className="h-5 w-5" />}
                                    style={{
                                      backgroundColor: theme.colors.primary,
                                      color: '#ffffff',
                                    }}
                                    onMouseEnter={(e: any) => {
                                      if (!createPackagePaymentMutation.isPending && !calculateUpgradePriceMutation.isPending) {
                                        e.currentTarget.style.backgroundColor = theme.colors.secondary;
                                      }
                                    }}
                                    onMouseLeave={(e: any) => {
                                      if (!createPackagePaymentMutation.isPending && !calculateUpgradePriceMutation.isPending) {
                                        e.currentTarget.style.backgroundColor = theme.colors.primary;
                                      }
                                    }}
                                  >
                                    {isUpgrade && hasActiveSubscription ? 'Upgrade Package' : 'Purchase Package'}
                                  </Button>
                                );
                              }

                              // Show disabled button for downgrades when subscription is active
                              if (isDowngrade && hasActiveSubscription) {
                                return (
                                  <Button variant="secondary" fullWidth disabled leftIcon={<X className="h-5 w-5" />}>
                                    Downgrade Not Available
                                  </Button>
                                );
                              }

                              // Default: show purchase button
                              if (!canUpgradePackage) {
                                return (
                                  <div className="w-full py-3 px-4 font-semibold rounded-lg text-center text-sm" style={{ backgroundColor: theme.colors.surface, color: theme.colors.textSecondary }}>
                                    Purchase not available
                                  </div>
                                );
                              }
                              return (
                                <button
                                  onClick={() => handlePackageUpgrade(pkg)}
                                  disabled={createPackagePaymentMutation.isPending}
                                  className="w-full py-3 px-4 text-white font-semibold rounded-lg transition-all duration-200 flex items-center justify-center shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                                  style={{
                                    background: `linear-gradient(to right, ${theme.colors.primary}, ${theme.colors.secondary})`
                                  }}
                                  onMouseEnter={(e) => {
                                    if (!createPackagePaymentMutation.isPending) {
                                      e.currentTarget.style.background = `linear-gradient(to right, ${theme.colors.secondary}, ${theme.colors.primary})`;
                                      e.currentTarget.style.boxShadow = `0 10px 15px -3px ${theme.colors.primary}33`;
                                    }
                                  }}
                                  onMouseLeave={(e) => {
                                    if (!createPackagePaymentMutation.isPending) {
                                      e.currentTarget.style.background = `linear-gradient(to right, ${theme.colors.primary}, ${theme.colors.secondary})`;
                                      e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
                                    }
                                  }}
                                >
                                  {createPackagePaymentMutation.isPending ? (
                                    <>
                                      <Loader2 className="animate-spin h-5 w-5 mr-2" />
                                      Processing...
                                    </>
                                  ) : (
                                    <>
                                      <CreditCard className="h-5 w-5 mr-2" />
                                      Purchase Package
                                    </>
                                  )}
                                </button>
                              );
                            })()}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8" style={{ color: theme.colors.textSecondary }}>
                  <Card>
                    No packages available
                  </Card>
                </div>
              )}
            </div>
          )}

          {/* Available Features */}
          {features && features.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-4" style={{ color: theme.colors.text }}>Available Features</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {features.map((feature: any) => {
                  // Check if this feature is active/purchased
                  const isActive = currentPackage?.active_features?.some(
                    (activeFeature: any) => activeFeature.feature_id === feature.id || activeFeature.feature?.id === feature.id
                  ) || false;

                  return (
                    <div
                      key={feature.id}
                      className="card rounded-lg p-4"
                      style={isActive
                        ? { border: `2px solid ${theme.colors.primary}`, backgroundColor: theme.colors.primary + '1A' }
                        : { backgroundColor: theme.colors.surface, border: `1px solid ${theme.colors.border}` }
                      }
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="text-md font-semibold" style={{ color: theme.colors.text }}>{feature.name}</h3>
                        <div className="flex items-center gap-2">
                          {isActive && (
                            <Check className="h-5 w-5" style={{ color: theme.colors.primary }} />
                          )}
                          <span className="px-2 py-1 text-xs font-medium rounded" style={{ backgroundColor: theme.colors.surface, color: theme.colors.textSecondary }}>
                            {feature.type === 'user_upgrade'
                              ? 'User Upgrade'
                              : feature.type === 'role_upgrade'
                                ? 'Role Upgrade'
                                : feature.type === 'support' || feature.type === 'chat'
                                  ? 'Support'
                                  : 'Feature'}
                          </span>
                        </div>
                      </div>
                      {feature.description && (
                        <p className="text-sm mb-3" style={{ color: theme.colors.textSecondary }}>{feature.description}</p>
                      )}
                      <div className="flex items-center justify-between">
                        <div>
                          {feature.value && (
                            <p className="text-sm" style={{ color: theme.colors.textSecondary }}>
                              Value: {feature.value === null ? 'Unlimited' : feature.value}
                            </p>
                          )}
                        </div>
                        <div>
                          <p className="text-lg font-bold" style={{ color: theme.colors.primary }}>
                            {feature.price === 0 ? (
                              'Free'
                            ) : (
                              <>
                                {/* Assume prices are in USD, display both currencies */}
                                {isNepal ? (
                                  formatCurrency(convertUSDToNPR(feature.price), 'NPR')
                                ) : (
                                  formatCurrency(feature.price, 'USD')
                                )}
                              </>
                            )}
                          </p>
                        </div>
                      </div>
                      {!isActive ? (
                        canPurchaseFeature ? (
                          <Button
                            onClick={() => handleFeaturePurchase(feature)}
                            disabled={createFeaturePaymentMutation.isPending}
                            variant="primary"
                            fullWidth
                            className="mt-4"
                            isLoading={createFeaturePaymentMutation.isPending}
                            leftIcon={<CreditCard className="h-4 w-4" />}
                            style={{
                              backgroundColor: theme.colors.primary,
                              color: '#ffffff',
                            }}
                            onMouseEnter={(e: any) => {
                              if (!createFeaturePaymentMutation.isPending) {
                                e.currentTarget.style.backgroundColor = theme.colors.secondary;
                              }
                            }}
                            onMouseLeave={(e: any) => {
                              if (!createFeaturePaymentMutation.isPending) {
                                e.currentTarget.style.backgroundColor = theme.colors.primary;
                              }
                            }}
                          >
                            Purchase
                          </Button>
                        ) : (
                          <div className="w-full mt-4 py-2 px-4 text-center text-sm rounded-lg" style={{ backgroundColor: theme.colors.surface, color: theme.colors.textSecondary }}>
                            Purchase not available
                          </div>
                        )
                      ) : (
                        <Button
                          variant="secondary"
                          fullWidth
                          className="mt-4"
                          disabled
                          style={{
                            backgroundColor: theme.colors.surface,
                            color: theme.colors.textSecondary,
                            borderColor: theme.colors.border,
                          }}
                        >
                          <Check className="h-4 w-4 mr-2 inline" />
                          Active
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* Payment Method Selection Modal */}
      {showPaymentModal && pendingPayment && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4 animate-fadeIn backdrop-blur-sm" style={{ backgroundColor: 'rgba(0, 0, 0, 0.8)' }}>
          <div className="rounded-xl shadow-2xl max-w-lg w-full p-6 animate-slideUp" style={{ backgroundColor: theme.colors.background, border: `1px solid ${theme.colors.border}` }}>
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold" style={{ color: theme.colors.text }}>Select Payment Method</h2>
              <button
                onClick={() => {
                  setShowPaymentModal(false);
                  setPendingPayment(null);
                }}
                className="transition-colors"
                style={{ color: theme.colors.textSecondary }}
                onMouseEnter={(e) => e.currentTarget.style.color = theme.colors.text}
                onMouseLeave={(e) => e.currentTarget.style.color = theme.colors.textSecondary}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Item Details */}
            <div className="mb-4 p-4 rounded-lg" style={{ backgroundColor: theme.colors.surface, border: `1px solid ${theme.colors.border}` }}>
              <p className="text-sm font-medium mb-1" style={{ color: theme.colors.textSecondary }}>Purchasing:</p>
              <p className="text-lg font-semibold mb-3" style={{ color: theme.colors.text }}>
                {pendingPayment.type === 'package' ? pendingPayment.item.name : pendingPayment.item.name}
              </p>

              {/* Subscription Period Selection (only for packages) */}
              {pendingPayment.type === 'package' && pendingPayment.item.price > 0 && (
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2" style={{ color: theme.colors.textSecondary }}>Subscription Period</label>
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    {(['3_months', '6_months', '1_year', 'custom'] as const).map((period) => (
                      <button
                        key={period}
                        type="button"
                        onClick={async () => {
                          setSelectedPeriod(period);
                          // Recalculate upgrade price when period changes
                          if (upgradePriceInfo && upgradePriceInfo.can_upgrade) {
                            try {
                              const priceInfo = await calculateUpgradePriceMutation.mutateAsync({
                                package_id: pendingPayment.item.id,
                                period: period,
                                custom_months: period === 'custom' ? customMonths : undefined,
                              });
                              setUpgradePriceInfo(priceInfo);
                            } catch (error) {
                              console.error('Error recalculating upgrade price:', error);
                            }
                          }
                        }}
                        className="px-3 py-2 text-sm font-medium rounded-lg border-2 transition-all"
                        style={{
                          borderColor: selectedPeriod === period ? theme.colors.primary : theme.colors.border,
                          backgroundColor: selectedPeriod === period ? `${theme.colors.primary}33` : theme.colors.surface,
                          color: selectedPeriod === period ? theme.colors.text : theme.colors.textSecondary,
                        }}
                        onMouseEnter={(e) => {
                          if (selectedPeriod !== period) {
                            e.currentTarget.style.borderColor = theme.colors.border;
                            e.currentTarget.style.backgroundColor = theme.colors.background;
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (selectedPeriod !== period) {
                            e.currentTarget.style.borderColor = theme.colors.border;
                            e.currentTarget.style.backgroundColor = theme.colors.surface;
                          }
                        }}
                      >
                        {period === '3_months' ? '3 Months' :
                          period === '6_months' ? '6 Months (4% off)' :
                            period === '1_year' ? '1 Year (7.5% off)' :
                              'Custom'}
                      </button>
                    ))}
                  </div>
                  {selectedPeriod === 'custom' && (
                    <div className="mt-2">
                      <label className="block text-xs font-medium mb-1" style={{ color: theme.colors.textSecondary }}>Number of Months</label>
                      <input
                        type="number"
                        min="1"
                        value={customMonths}
                        onChange={async (e) => {
                          const months = Math.max(1, parseInt(e.target.value) || 12);
                          setCustomMonths(months);
                          // Recalculate upgrade price when custom months change
                          if (upgradePriceInfo && upgradePriceInfo.can_upgrade && selectedPeriod === 'custom') {
                            try {
                              const priceInfo = await calculateUpgradePriceMutation.mutateAsync({
                                package_id: pendingPayment.item.id,
                                period: 'custom',
                                custom_months: months,
                              });
                              setUpgradePriceInfo(priceInfo);
                            } catch (error) {
                              console.error('Error recalculating upgrade price:', error);
                            }
                          }
                        }}
                        className="w-full px-3 py-2 text-sm rounded-lg focus:ring-2 transition-colors"
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
                      />
                      {customMonths > 12 && (
                        <p className="mt-1 text-xs font-medium" style={{ color: theme.colors.primary }}>✓ 10% discount applied</p>
                      )}
                      {customMonths === 12 && (
                        <p className="mt-1 text-xs font-medium" style={{ color: theme.colors.primary }}>✓ 7.5% discount applied</p>
                      )}
                      {customMonths >= 6 && customMonths < 12 && (
                        <p className="mt-1 text-xs font-medium" style={{ color: theme.colors.primary }}>✓ 4% discount applied</p>
                      )}
                    </div>
                  )}

                  {/* Price Calculation */}
                  {(() => {
                    const subscription = calculateSubscriptionPrice(
                      pendingPayment.item.price,
                      selectedPeriod,
                      selectedPeriod === 'custom' ? customMonths : undefined
                    );

                    // Show prorated credit if upgrading mid-subscription
                    const showProratedCredit = upgradePriceInfo && upgradePriceInfo.can_upgrade && upgradePriceInfo.prorated_credit > 0;
                    const finalPrice = showProratedCredit ? upgradePriceInfo.final_price : subscription.discountedPrice;

                    return (
                      <div className="mt-3 p-3 rounded-lg" style={{ backgroundColor: theme.colors.surface, border: `1px solid ${theme.colors.border}` }}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm" style={{ color: theme.colors.textSecondary }}>New Package Price:</span>
                          <span className="text-sm font-medium" style={{ color: theme.colors.textSecondary }}>
                            {formatCurrency(subscription.discountedPrice, 'USD')}
                          </span>
                        </div>
                        {subscription.discountPercent > 0 && (
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm" style={{ color: theme.colors.textSecondary }}>Period Discount ({subscription.discountPercent}%):</span>
                            <span className="text-sm font-medium" style={{ color: theme.colors.primary }}>
                              -{formatCurrency(subscription.originalPrice - subscription.discountedPrice, 'USD')}
                            </span>
                          </div>
                        )}
                        {showProratedCredit && (
                          <>
                            <div className="flex items-center justify-between mb-1 mt-2 pt-2" style={{ borderTop: `1px solid ${theme.colors.border}` }}>
                              <span className="text-sm" style={{ color: theme.colors.textSecondary }}>Prorated Credit ({upgradePriceInfo.remaining_days} days remaining):</span>
                              <span className="text-sm font-medium" style={{ color: theme.colors.primary }}>
                                -{formatCurrency(upgradePriceInfo.prorated_credit, 'USD')}
                              </span>
                            </div>
                            <div className="text-xs mt-1" style={{ color: theme.colors.textSecondary }}>
                              Credit from remaining subscription time
                            </div>
                          </>
                        )}
                        <div className="flex items-center justify-between pt-2 mt-2" style={{ borderTop: `1px solid ${theme.colors.border}` }}>
                          <span className="text-base font-semibold" style={{ color: theme.colors.text }}>Final Price:</span>
                          <span className="text-xl font-bold" style={{ color: theme.colors.primary }}>
                            {isNepal
                              ? formatCurrency(convertUSDToNPR(finalPrice), 'NPR')
                              : formatCurrency(finalPrice, 'USD')}
                          </span>
                        </div>
                        <p className="text-xs mt-1" style={{ color: theme.colors.textSecondary }}>
                          {subscription.months} month{subscription.months !== 1 ? 's' : ''} • {formatCurrency(subscription.monthlyPrice, 'USD')}/month
                        </p>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Feature or Package without period */}
              {(pendingPayment.type === 'feature' || (pendingPayment.type === 'package' && pendingPayment.item.price === 0)) && (
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold" style={{ color: theme.colors.primary }}>
                    {isNepal
                      ? formatCurrency(convertUSDToNPR(pendingPayment.item.price), 'NPR')
                      : formatCurrency(pendingPayment.item.price, 'USD')}
                  </span>
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-3 mb-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar justify-center">
              {/* Localized Gateways Selection */}
              {isNepal ? (
                <>
                  <label
                    className="flex flex-col items-center justify-center p-3 border-2 rounded-xl cursor-pointer transition-all w-[140px] text-center"
                    style={{
                      borderColor: selectedGateway === 'esewa' ? theme.colors.primary : theme.colors.border,
                      backgroundColor: selectedGateway === 'esewa' ? `${theme.colors.primary}15` : theme.colors.surface,
                    }}
                  >
                    <input
                      type="radio"
                      name="gateway"
                      value="esewa"
                      checked={selectedGateway === 'esewa'}
                      onChange={(e) => setSelectedGateway('esewa')}
                      className="hidden"
                    />
                    <div className="mb-2 p-2 rounded-lg bg-white shadow-sm flex items-center justify-center h-12 w-12 overflow-hidden">
                      <span className="font-black text-green-600">eSewa</span>
                    </div>
                    <div>
                      <span className="text-sm font-bold block" style={{ color: theme.colors.text }}>eSewa</span>
                      <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border" style={{ color: theme.colors.primary, borderColor: `${theme.colors.primary}33` }}>NPR</span>
                    </div>
                  </label>

                  <label
                    className="flex flex-col items-center justify-center p-3 border-2 rounded-xl cursor-pointer transition-all w-[140px] text-center"
                    style={{
                      borderColor: selectedGateway === 'khalti' ? theme.colors.primary : theme.colors.border,
                      backgroundColor: selectedGateway === 'khalti' ? `${theme.colors.primary}15` : theme.colors.surface,
                    }}
                  >
                    <input
                      type="radio"
                      name="gateway"
                      value="khalti"
                      checked={selectedGateway === 'khalti'}
                      onChange={(e) => setSelectedGateway('khalti')}
                      className="hidden"
                    />
                    <div className="mb-2 p-2 rounded-lg bg-white shadow-sm flex items-center justify-center h-12 w-12 overflow-hidden">
                      <span className="font-black text-purple-600">Khalti</span>
                    </div>
                    <div>
                      <span className="text-sm font-bold block" style={{ color: theme.colors.text }}>Khalti</span>
                      <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border" style={{ color: theme.colors.primary, borderColor: `${theme.colors.primary}33` }}>NPR</span>
                    </div>
                  </label>

                  <label
                    className="flex flex-col items-center justify-center p-3 border-2 rounded-xl cursor-pointer transition-all w-[140px] text-center"
                    style={{
                      borderColor: selectedGateway === 'connect_ips' ? theme.colors.primary : theme.colors.border,
                      backgroundColor: selectedGateway === 'connect_ips' ? `${theme.colors.primary}15` : theme.colors.surface,
                    }}
                  >
                    <input
                      type="radio"
                      name="gateway"
                      value="connect_ips"
                      checked={selectedGateway === 'connect_ips'}
                      onChange={(e) => setSelectedGateway('connect_ips')}
                      className="hidden"
                    />
                    <div className="mb-2 p-2 rounded-lg bg-white shadow-sm flex items-center justify-center h-12 w-12 overflow-hidden">
                      <span className="font-black text-blue-600">Connect</span>
                    </div>
                    <div>
                      <span className="text-sm font-bold block" style={{ color: theme.colors.text }}>ConnectIPS</span>
                      <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border" style={{ color: theme.colors.primary, borderColor: `${theme.colors.primary}33` }}>NPR</span>
                    </div>
                  </label>
                </>
              ) : (
                <>
                  <label
                    className="flex flex-col items-center justify-center p-3 border-2 rounded-xl cursor-pointer transition-all w-[140px] text-center"
                    style={{
                      borderColor: selectedGateway === 'stripe' ? theme.colors.primary : theme.colors.border,
                      backgroundColor: selectedGateway === 'stripe' ? `${theme.colors.primary}15` : theme.colors.surface,
                    }}
                  >
                    <input
                      type="radio"
                      name="gateway"
                      value="stripe"
                      checked={selectedGateway === 'stripe'}
                      onChange={(e) => setSelectedGateway('stripe')}
                      className="hidden"
                    />
                    <div className="mb-2 p-2 rounded-lg bg-white shadow-sm flex items-center justify-center h-12 w-12 overflow-hidden">
                      <span className="font-bold text-gray-800">Stripe</span>
                    </div>
                    <div>
                      <span className="text-sm font-bold block" style={{ color: theme.colors.text }}>Stripe / Card</span>
                      <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border" style={{ color: theme.colors.primary, borderColor: `${theme.colors.primary}33` }}>USD</span>
                    </div>
                  </label>

                  <label
                    className="flex flex-col items-center justify-center p-3 border-2 rounded-xl cursor-pointer transition-all w-[140px] text-center"
                    style={{
                      borderColor: selectedGateway === 'paypal' ? theme.colors.primary : theme.colors.border,
                      backgroundColor: selectedGateway === 'paypal' ? `${theme.colors.primary}15` : theme.colors.surface,
                    }}
                  >
                    <input
                      type="radio"
                      name="gateway"
                      value="paypal"
                      checked={selectedGateway === 'paypal'}
                      onChange={(e) => setSelectedGateway('paypal')}
                      className="hidden"
                    />
                    <div className="mb-2 p-2 rounded-lg bg-white shadow-sm flex items-center justify-center h-12 w-12 overflow-hidden">
                      <span className="font-bold text-blue-800">PayPal</span>
                    </div>
                    <div>
                      <span className="text-sm font-bold block" style={{ color: theme.colors.text }}>PayPal</span>
                      <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border" style={{ color: theme.colors.primary, borderColor: `${theme.colors.primary}33` }}>USD</span>
                    </div>
                  </label>
                </>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowPaymentModal(false);
                  setPendingPayment(null);
                }}
                className="flex-1 px-4 py-3 border-2 rounded-lg font-medium transition-colors"
                style={{
                  borderColor: theme.colors.border,
                  color: theme.colors.textSecondary,
                  backgroundColor: theme.colors.surface,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = theme.colors.border;
                  e.currentTarget.style.color = theme.colors.text;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = theme.colors.surface;
                  e.currentTarget.style.color = theme.colors.textSecondary;
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmPayment}
                disabled={createPackagePaymentMutation.isPending || createFeaturePaymentMutation.isPending}
                className="flex-1 px-4 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-md hover:shadow-lg"
                style={{
                  backgroundColor: theme.colors.primary,
                  color: '#ffffff',
                }}
                onMouseEnter={(e) => {
                  if (!createPackagePaymentMutation.isPending && !createFeaturePaymentMutation.isPending) {
                    e.currentTarget.style.backgroundColor = theme.colors.secondary;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!createPackagePaymentMutation.isPending && !createFeaturePaymentMutation.isPending) {
                    e.currentTarget.style.backgroundColor = theme.colors.primary;
                  }
                }}
              >
                {(createPackagePaymentMutation.isPending || createFeaturePaymentMutation.isPending) ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CreditCard className="w-5 h-5 mr-2" />
                    Continue to Payment
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Auto-Renewal Credentials Modal */}
      {showCredentialModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4 animate-fadeIn" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
          <div className="rounded-xl shadow-2xl max-w-lg w-full p-6 animate-slideUp" style={{ backgroundColor: theme.colors.surface, border: `1px solid ${theme.colors.border}` }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold" style={{ color: theme.colors.text }}>Auto-Renewal Setup</h2>
              <button
                onClick={() => {
                  setShowCredentialModal(false);
                  setPendingAutoRenew(null);
                  setAutoRenewCredentials({
                    payment_method: 'esewa',
                    esewa_username: '',
                    stripe_card_token: '',
                    card_last4: '',
                    card_brand: '',
                  });
                }}
                className="transition-colors"
                style={{ color: theme.colors.textSecondary }}
                onMouseEnter={(e) => e.currentTarget.style.color = theme.colors.text}
                onMouseLeave={(e) => e.currentTarget.style.color = theme.colors.textSecondary}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-4">
              <p className="mb-4" style={{ color: theme.colors.textSecondary }}>
                To enable auto-renewal, please provide your payment credentials. Your package will be automatically renewed when it expires.
              </p>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-2" style={{ color: theme.colors.textSecondary }}>Payment Method</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setAutoRenewCredentials({ ...autoRenewCredentials, payment_method: 'esewa' })}
                    className="px-4 py-3 rounded-lg border-2 transition-all"
                    style={{
                      borderColor: autoRenewCredentials.payment_method === 'esewa' ? theme.colors.primary : theme.colors.border,
                      backgroundColor: autoRenewCredentials.payment_method === 'esewa' ? `${theme.colors.primary}33` : theme.colors.background,
                      color: autoRenewCredentials.payment_method === 'esewa' ? theme.colors.primary : theme.colors.text,
                    }}
                    onMouseEnter={(e) => {
                      if (autoRenewCredentials.payment_method !== 'esewa') {
                        e.currentTarget.style.borderColor = theme.colors.border;
                        e.currentTarget.style.backgroundColor = theme.colors.surface;
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (autoRenewCredentials.payment_method !== 'esewa') {
                        e.currentTarget.style.borderColor = theme.colors.border;
                        e.currentTarget.style.backgroundColor = theme.colors.background;
                      }
                    }}
                  >
                    <div className="font-semibold">eSewa</div>
                    <div className="text-xs" style={{ color: theme.colors.textSecondary }}>NPR</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAutoRenewCredentials({ ...autoRenewCredentials, payment_method: 'stripe' })}
                    className="px-4 py-3 rounded-lg border-2 transition-all"
                    style={{
                      borderColor: autoRenewCredentials.payment_method === 'stripe' ? theme.colors.primary : theme.colors.border,
                      backgroundColor: autoRenewCredentials.payment_method === 'stripe' ? `${theme.colors.primary}33` : theme.colors.background,
                      color: autoRenewCredentials.payment_method === 'stripe' ? theme.colors.primary : theme.colors.text,
                    }}
                    onMouseEnter={(e) => {
                      if (autoRenewCredentials.payment_method !== 'stripe') {
                        e.currentTarget.style.borderColor = theme.colors.border;
                        e.currentTarget.style.backgroundColor = theme.colors.surface;
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (autoRenewCredentials.payment_method !== 'stripe') {
                        e.currentTarget.style.borderColor = theme.colors.border;
                        e.currentTarget.style.backgroundColor = theme.colors.background;
                      }
                    }}
                  >
                    <div className="font-semibold">Stripe</div>
                    <div className="text-xs" style={{ color: theme.colors.textSecondary }}>USD</div>
                  </button>
                </div>
              </div>

              {autoRenewCredentials.payment_method === 'esewa' && (
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2" style={{ color: theme.colors.textSecondary }}>eSewa Username</label>
                  <input
                    type="text"
                    value={autoRenewCredentials.esewa_username}
                    onChange={(e) => setAutoRenewCredentials({ ...autoRenewCredentials, esewa_username: e.target.value })}
                    placeholder="Enter your eSewa username"
                    className="w-full px-4 py-2 rounded-lg focus:ring-2 transition-colors"
                    style={{
                      border: `1px solid ${theme.colors.border}`,
                      backgroundColor: theme.colors.background,
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
                  />
                  <p className="mt-1 text-xs" style={{ color: theme.colors.textSecondary }}>Your eSewa account will be used for automatic payments</p>
                </div>
              )}

              {autoRenewCredentials.payment_method === 'stripe' && (
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2" style={{ color: theme.colors.textSecondary }}>Card Information</label>
                  <div className="space-y-3">
                    <input
                      type="text"
                      placeholder="Card Number"
                      className="w-full px-4 py-2 rounded-lg focus:ring-2 transition-colors"
                      style={{
                        border: `1px solid ${theme.colors.border}`,
                        backgroundColor: theme.colors.background,
                        color: theme.colors.text,
                      }}
                      maxLength={19}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\s/g, '').replace(/\D/g, '');
                        const formatted = value.match(/.{1,4}/g)?.join(' ') || value;
                        e.target.value = formatted;
                        // In a real implementation, you'd use Stripe Elements to tokenize the card
                        // For now, we'll just store a placeholder
                        setAutoRenewCredentials({
                          ...autoRenewCredentials,
                          stripe_card_token: value,
                          card_last4: value.slice(-4),
                          card_brand: value.startsWith('4') ? 'visa' : value.startsWith('5') ? 'mastercard' : 'unknown',
                        });
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = theme.colors.primary;
                        e.currentTarget.style.boxShadow = `0 0 0 2px ${theme.colors.primary}33`;
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = theme.colors.border;
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="text"
                        placeholder="MM/YY"
                        className="px-4 py-2 rounded-lg focus:ring-2 transition-colors"
                        style={{
                          border: `1px solid ${theme.colors.border}`,
                          backgroundColor: theme.colors.background,
                          color: theme.colors.text,
                        }}
                        maxLength={5}
                        onFocus={(e) => {
                          e.currentTarget.style.borderColor = theme.colors.primary;
                          e.currentTarget.style.boxShadow = `0 0 0 2px ${theme.colors.primary}33`;
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor = theme.colors.border;
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                      />
                      <input
                        type="text"
                        placeholder="CVC"
                        className="px-4 py-2 rounded-lg focus:ring-2 transition-colors"
                        style={{
                          border: `1px solid ${theme.colors.border}`,
                          backgroundColor: theme.colors.background,
                          color: theme.colors.text,
                        }}
                        maxLength={4}
                        onFocus={(e) => {
                          e.currentTarget.style.borderColor = theme.colors.primary;
                          e.currentTarget.style.boxShadow = `0 0 0 2px ${theme.colors.primary}33`;
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor = theme.colors.border;
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                      />
                    </div>
                    <p className="text-xs" style={{ color: theme.colors.textSecondary }}>
                      Your card will be securely stored and used for automatic renewals
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowCredentialModal(false);
                  setPendingAutoRenew(null);
                  setAutoRenewCredentials({
                    payment_method: 'esewa',
                    esewa_username: '',
                    stripe_card_token: '',
                    card_last4: '',
                    card_brand: '',
                  });
                }}
                className="flex-1 px-4 py-3 border-2 rounded-lg font-medium transition-colors"
                style={{
                  borderColor: theme.colors.border,
                  color: theme.colors.textSecondary,
                  backgroundColor: theme.colors.surface,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = theme.colors.background;
                  e.currentTarget.style.color = theme.colors.text;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = theme.colors.surface;
                  e.currentTarget.style.color = theme.colors.textSecondary;
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveCredentials}
                disabled={toggleAutoRenewMutation.isPending}
                className="flex-1 px-4 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                style={{
                  backgroundColor: theme.colors.primary,
                  color: '#ffffff',
                }}
                onMouseEnter={(e) => {
                  if (!toggleAutoRenewMutation.isPending) {
                    e.currentTarget.style.backgroundColor = theme.colors.secondary;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!toggleAutoRenewMutation.isPending) {
                    e.currentTarget.style.backgroundColor = theme.colors.primary;
                  }
                }}
              >
                {toggleAutoRenewMutation.isPending ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save & Enable'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

