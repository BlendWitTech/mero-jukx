import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { authService } from '../../services/authService';
import toast from '@shared/hooks/useToast';
import { Loader2, Building2, Mail, User, Lock, Phone, ArrowLeft, Sparkles, Shield } from 'lucide-react';
// Import shared components
import { Button, Input, Card, CardContent, Select } from '@shared';
import { Globe, Clock, Banknote } from 'lucide-react';
import { getAppNameFromSubdomain, isAppSubdomain } from '../../config/urlConfig';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import { useTheme } from '../../contexts/ThemeContext';

const registerSchema = z.object({
  name: z.string().min(2, 'Organization name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  owner_email: z.string().email('Invalid email address'),
  owner_password: z.string().min(8, 'Password must be at least 8 characters'),
  owner_first_name: z.string().min(2, 'First name is required'),
  owner_last_name: z.string().min(2, 'Last name is required'),
  owner_phone: z.string().optional(),
  is_existing_user: z.boolean().default(false),
  timezone: z.string().min(1, 'Timezone is required'),
  currency: z.string().min(1, 'Currency is required'),
  language: z.string().min(1, 'Language is required'),
  country: z.string().min(1, 'Country is required'),
  pan_number: z.string().regex(/^\d{9}$/, 'PAN must be 9 digits').optional().or(z.literal('')),
  vat_number: z.string().regex(/^\d{9}$/, 'VAT must be 9 digits').optional().or(z.literal('')),
});

type RegisterFormData = z.infer<typeof registerSchema>;

export default function RegisterOrganizationPage() {
  const navigate = useNavigate();
  const { appId: appIdFromParams } = useParams<{ appId?: string }>();
  const { theme, isDark } = useTheme();
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState(1);

  // Detect app context from subdomain or returnUrl
  const appNameFromSubdomain = getAppNameFromSubdomain();
  const isOnAppSubdomain = isAppSubdomain();

  // Extract app name from returnUrl if present
  const urlParamsForApp = new URLSearchParams(window.location.search);
  const returnUrlForApp = urlParamsForApp.get('returnUrl');
  let appNameFromReturnUrl: string | null = null;
  if (returnUrlForApp) {
    try {
      const decodedUrl = decodeURIComponent(returnUrlForApp);
      const url = new URL(decodedUrl);
      const hostname = url.hostname;
      // Extract app name from subdomain (e.g., mero-board.dev.merojugx.com -> mero-board)
      // Also handle production domains (e.g., mero-board.domainname.com -> mero-board)
      const devMatch = hostname.match(/^([^.]+)\.dev\.merojugx\.com$/);
      const prodMatch = hostname.match(/^([^.]+)\.merojugx\.com$/);
      const customDomainMatch = hostname.match(/^([^.]+)\.(.+)$/);

      if (devMatch) {
        appNameFromReturnUrl = devMatch[1];
      } else if (prodMatch && prodMatch[1] !== 'www' && prodMatch[1] !== 'dev') {
        appNameFromReturnUrl = prodMatch[1];
      } else if (customDomainMatch) {
        const excludedPrefixes = ['www', 'dev', 'api', 'admin', 'app', 'apps', 'merojugx'];
        const subdomain = customDomainMatch[1].toLowerCase();
        if (!excludedPrefixes.includes(subdomain)) {
          appNameFromReturnUrl = subdomain;
        }
      }
    } catch {
      // Ignore parsing errors
    }
  }

  const appSlug = appNameFromSubdomain || appNameFromReturnUrl;

  // Also check for appId in URL params (for localhost routes like /org/:slug/apps/:appId/register)
  const appIdFromUrl = appIdFromParams ? parseInt(appIdFromParams, 10) : null;

  // Fetch app information if in app context (by slug or by ID)
  const { data: appInfo } = useQuery({
    queryKey: ['app-info', appSlug, appIdFromUrl],
    queryFn: async () => {
      try {
        const response = await api.get('/marketplace/apps');
        const apps = response.data.data || response.data || [];

        // Try to find by ID first (more reliable)
        if (appIdFromUrl) {
          const appById = apps.find((app: any) => app.id === appIdFromUrl);
          if (appById) return appById;
        }

        // Fall back to slug
        if (appSlug) {
          return apps.find((app: any) => app.slug === appSlug) || null;
        }

        return null;
      } catch {
        return null;
      }
    },
    enabled: !!(appSlug || appIdFromUrl) && (isOnAppSubdomain || !!appNameFromReturnUrl || !!appIdFromUrl),
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Determine if we're in app context
  const isAppContext = !!(appSlug || appIdFromUrl) && appInfo;
  const appDisplayName = appInfo?.name || appSlug || 'Mero Jugx';

  // State for detected location
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    trigger,
    setValue,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      is_existing_user: false,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
      currency: 'USD',
      language: 'en',
      country: '',
    },
  });

  // Auto-detect location
  useEffect(() => {
    const detectLocation = async () => {
      setIsDetectingLocation(true);
      try {
        const response = await fetch('https://ipapi.co/json/');
        const data = await response.json();
        if (data.country_name) {
          setValue('country', data.country_name);
          if (data.country_code === 'NP') {
            setValue('currency', 'NPR');
            setValue('timezone', 'Asia/Kathmandu');
          } else if (data.currency) {
            setValue('currency', data.currency);
          }
          if (data.timezone) {
            setValue('timezone', data.timezone);
          }
        }
      } catch (error) {
        console.error('Failed to detect location:', error);
      } finally {
        setIsDetectingLocation(false);
      }
    };
    detectLocation();
  }, []); // Only run once on mount

  const handleNext = async () => {
    const isValid = await trigger(['name', 'email']);
    if (isValid) setStep(2);
  };

  const isExistingUser = watch('is_existing_user');

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);
    try {
      const response = await authService.registerOrganization({
        name: data.name,
        email: data.email,
        owner_email: data.owner_email,
        owner_password: data.owner_password,
        owner_first_name: data.owner_first_name,
        owner_last_name: data.owner_last_name,
        is_existing_user: data.is_existing_user,
        timezone: data.timezone,
        currency: data.currency,
        language: data.language,
        country: data.country,
      });

      toast.success('Organization registered successfully! Please check your email to verify your account.');
      navigate('/login', {
        state: { organization_id: response.organization_id },
      });
    } catch (error: any) {
      // Extract error message from response
      const errorMessage = error.response?.data?.message || error.message || '';
      const status = error.response?.status;

      // Provide user-friendly error messages based on the error
      let userFriendlyMessage = 'Registration failed. Please try again.';

      if (status === 409) {
        // Conflict errors - provide specific messages
        if (errorMessage.includes('Organization name already exists') ||
          errorMessage.includes('Organization name is already taken')) {
          userFriendlyMessage = 'This organization name is already taken. Please choose a different name.';
        } else if (errorMessage.includes('organization email') ||
          errorMessage.includes('email address is already used as an organization email')) {
          userFriendlyMessage = 'This email address is already registered as an organization email. Please use a different email address for your organization.';
        } else if (errorMessage.includes('User with this email already exists')) {
          userFriendlyMessage = 'An account with this email address already exists. If you already have an account, please check the "I\'m already a user" option and try again.';
        } else if (errorMessage.includes('already have an organization with email')) {
          userFriendlyMessage = 'You already have an organization registered with this email address. Each email can only be used for one organization.';
        } else if (errorMessage) {
          // Use the backend message if it's descriptive
          userFriendlyMessage = errorMessage;
        } else {
          userFriendlyMessage = 'This information is already in use. Please check your organization name, email, or owner email and try again.';
        }
      } else if (status === 400) {
        // Bad request errors
        if (errorMessage.includes('required') || errorMessage.includes('must be')) {
          userFriendlyMessage = errorMessage || 'Please fill in all required fields correctly.';
        } else {
          userFriendlyMessage = errorMessage || 'Invalid information provided. Please check your details and try again.';
        }
      } else if (status === 422) {
        // Validation errors
        userFriendlyMessage = errorMessage || 'Please check your information and ensure all fields are filled correctly.';
      } else if (status === 500 || status >= 500) {
        userFriendlyMessage = 'A server error occurred. Please try again later or contact support if the problem persists.';
      } else if (errorMessage) {
        // Use the backend message if available
        userFriendlyMessage = errorMessage;
      }

      toast.error(userFriendlyMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden"
      style={{
        background: isDark
          ? `linear-gradient(135deg, ${theme.colors.background} 0%, ${theme.colors.surface} 50%, ${theme.colors.background} 100%)`
          : `linear-gradient(135deg, ${theme.colors.surface} 0%, ${theme.colors.background} 50%, ${theme.colors.surface} 100%)`
      }}
    >
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute -top-16 -left-10 w-80 h-80 rounded-full blur-3xl"
          style={{ backgroundColor: `${theme.colors.primary}40` }}
        />
        <div
          className="absolute bottom-0 right-0 w-[420px] h-[420px] rounded-full blur-3xl"
          style={{ backgroundColor: `${theme.colors.primary}1A` }}
        />
      </div>

      <div className="relative max-w-5xl w-full grid grid-cols-1 lg:grid-cols-2 gap-10 items-center z-10">
        {/* Left: narrative / selling points */}
        <div className="hidden lg:flex flex-col gap-8 animate-fadeIn" style={{ color: theme.colors.text }}>
          <div
            className="inline-flex items-center gap-3 rounded-full px-4 py-2 w-max border"
            style={{
              backgroundColor: `${theme.colors.surface}CC`,
              borderColor: theme.colors.border,
            }}
          >
            <Sparkles className="w-4 h-4" style={{ color: '#faa61a' }} />
            <span className="text-xs font-medium" style={{ color: theme.colors.textSecondary }}>
              {isAppContext
                ? `Get started with ${appDisplayName}`
                : 'Spin up a secure organization workspace in minutes'}
            </span>
          </div>

          <div className="space-y-4">
            <h1 className="text-4xl xl:text-5xl font-extrabold leading-tight tracking-tight" style={{ color: theme.colors.text }}>
              {isAppContext ? 'Create your organization for' : 'Create your'}{' '}
              <span
                className="bg-clip-text text-transparent"
                style={{
                  backgroundImage: `linear-gradient(to right, ${theme.colors.text}, ${theme.colors.primary})`
                }}
              >
                {appDisplayName}
              </span>
              {!isAppContext && ' workspace'}
            </h1>
            <p className="text-sm max-w-md" style={{ color: theme.colors.textSecondary }}>
              {isAppContext
                ? `Set up your organization to start using ${appDisplayName}. Create your workspace, invite your team, and get started in minutes.`
                : 'Bring your team into a unified hub for roles, permissions, communication, and billing – all tailored for modern SaaS organizations.'}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm" style={{ color: theme.colors.textSecondary }}>
            <div
              className="rounded-xl p-4 space-y-2 border"
              style={{
                backgroundColor: `${theme.colors.surface}B3`,
                borderColor: theme.colors.border,
              }}
            >
              <div
                className="inline-flex items-center justify-center w-8 h-8 rounded-lg"
                style={{ backgroundColor: `${theme.colors.primary}33`, color: theme.colors.primary }}
              >
                <Building2 className="w-4 h-4" />
              </div>
              <p className="font-semibold text-sm" style={{ color: theme.colors.text }}>
                {isAppContext ? 'App-focused' : 'Organization-centric'}
              </p>
              <p className="text-xs" style={{ color: theme.colors.textSecondary }}>
                {isAppContext
                  ? `Dedicated workspace for ${appDisplayName} with seamless collaboration.`
                  : 'Structure your users, roles, and apps around how your business actually works.'}
              </p>
            </div>
            <div
              className="rounded-xl p-4 space-y-2 border"
              style={{
                backgroundColor: `${theme.colors.surface}B3`,
                borderColor: theme.colors.border,
              }}
            >
              <div
                className="inline-flex items-center justify-center w-8 h-8 rounded-lg"
                style={{ backgroundColor: '#23a55a26', color: '#23a55a' }}
              >
                <Shield className="w-4 h-4" />
              </div>
              <p className="font-semibold text-sm" style={{ color: theme.colors.text }}>
                {isAppContext ? 'Protected access' : 'Secure onboarding'}
              </p>
              <p className="text-xs" style={{ color: theme.colors.textSecondary }}>
                {isAppContext
                  ? `Your ${appDisplayName} data is protected with enterprise-grade security.`
                  : 'MFA-ready accounts, audit logs, and permission templates built-in.'}
              </p>
            </div>
          </div>
        </div>

        {/* Right: registration card */}
        <div
          className="relative backdrop-blur-md rounded-2xl shadow-2xl border p-8 sm:p-10 space-y-6 animate-slideUp"
          style={{
            backgroundColor: `${theme.colors.surface}F2`,
            borderColor: theme.colors.border,
          }}
        >
          <div className="mb-2">
            {/* Step Indicator */}
            <div className="flex gap-2 mb-6">
              <div
                className="h-1.5 flex-1 rounded-full transition-all duration-300"
                style={{ backgroundColor: step >= 1 ? theme.colors.primary : theme.colors.border }}
              ></div>
              <div
                className="h-1.5 flex-1 rounded-full transition-all duration-300"
                style={{ backgroundColor: step >= 2 ? theme.colors.primary : theme.colors.border }}
              ></div>
            </div>

            <div className="flex items-center gap-3 mb-2">
              <div
                className="inline-flex items-center justify-center w-10 h-10 rounded-xl"
                style={{
                  background: `linear-gradient(135deg, ${theme.colors.primary} 0%, ${theme.colors.secondary} 100%)`,
                  color: '#ffffff'
                }}
              >
                {step === 1 ? <Building2 className="w-5 h-5 text-white" /> : <User className="w-5 h-5 text-white" />}
              </div>
              <div>
                <h2 className="text-2xl font-bold" style={{ color: theme.colors.text }}>
                  {step === 1 ? 'Organization Details' : 'Owner Account'}
                </h2>
                <p className="mt-1 text-xs" style={{ color: theme.colors.textSecondary }}>
                  {step === 1
                    ? (isAppContext ? `Register your organization for ${appDisplayName}` : 'Set up your organization workspace details.')
                    : 'Personalize your account as the primary owner.'}
                </p>
              </div>
            </div>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            {step === 1 ? (
              /* Step 1: Organization Details */
              <div className="space-y-4 animate-fadeIn">
                <div className="flex items-center gap-2 mb-4">
                  <div className="h-px flex-1" style={{ backgroundColor: theme.colors.border }}></div>
                  <span
                    className="text-xs font-semibold uppercase tracking-wider px-3 py-1 rounded-full"
                    style={{
                      backgroundColor: `${theme.colors.primary}26`,
                      color: theme.colors.primary,
                    }}
                  >
                    Workspace Info
                  </span>
                  <div className="h-px flex-1" style={{ backgroundColor: theme.colors.border }}></div>
                </div>

                <div>
                  <Input
                    label="Organization Name *"
                    id="name"
                    type="text"
                    {...register('name')}
                    placeholder="Acme Corporation"
                    leftIcon={<Building2 className="w-5 h-5" />}
                    error={errors.name?.message}
                    fullWidth
                  />
                </div>

                <div>
                  <Input
                    label="Organization Email *"
                    id="email"
                    type="email"
                    {...register('email')}
                    placeholder="contact@acme.com"
                    leftIcon={<Mail className="w-5 h-5" />}
                    error={errors.email?.message}
                    fullWidth
                  />
                </div>

                <div className="pt-4">
                  <Button
                    type="button"
                    variant="primary"
                    fullWidth
                    onClick={handleNext}
                  >
                    Next: Owner Details
                  </Button>
                </div>
              </div>
            ) : (
              /* Step 2: Owner Details */
              <div className="space-y-4 animate-fadeIn">
                <div className="flex items-center gap-2 mb-4">
                  <div className="h-px flex-1" style={{ backgroundColor: theme.colors.border }}></div>
                  <span
                    className="text-xs font-semibold uppercase tracking-wider px-3 py-1 rounded-full"
                    style={{
                      backgroundColor: `${theme.colors.primary}26`,
                      color: theme.colors.primary,
                    }}
                  >
                    Owner Profile
                  </span>
                  <div className="h-px flex-1" style={{ backgroundColor: theme.colors.border }}></div>
                </div>

                <div>
                  <Input
                    label="Owner Email *"
                    id="owner_email"
                    type="email"
                    {...register('owner_email')}
                    placeholder="owner@example.com"
                    error={errors.owner_email?.message}
                    fullWidth
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: theme.colors.text }}>
                      Country *
                    </label>
                    <div className="relative">
                      <Input
                        id="country"
                        type="text"
                        {...register('country')}
                        placeholder="e.g. Nepal, USA"
                        leftIcon={<Globe className="w-5 h-5" />}
                        error={errors.country?.message}
                        fullWidth
                        disabled={isDetectingLocation}
                      />
                      {isDetectingLocation && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <Loader2 className="w-4 h-4 animate-spin text-primary" />
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: theme.colors.text }}>
                      Default Currency *
                    </label>
                    <select
                      {...register('currency')}
                      className="w-full h-10 px-3 py-2 rounded-lg border focus:ring-2 outline-none transition-all"
                      style={{
                        backgroundColor: theme.colors.surface,
                        borderColor: theme.colors.border,
                        color: theme.colors.text
                      }}
                    >
                      <option value="USD">USD - Dollar</option>
                      <option value="NPR">NPR - Rupee</option>
                      <option value="EUR">EUR - Euro</option>
                      <option value="GBP">GBP - Pound</option>
                      <option value="INR">INR - Rupee (India)</option>
                    </select>
                    {errors.currency && <p className="text-xs mt-1 text-red-500">{errors.currency.message}</p>}
                  </div>
                </div>

                <div className="flex items-center gap-2 my-4">
                  <div className="h-px flex-1" style={{ backgroundColor: theme.colors.border }}></div>
                  <span
                    className="text-xs font-semibold uppercase tracking-wider px-3 py-1 rounded-full"
                    style={{
                      backgroundColor: `${theme.colors.primary}26`,
                      color: theme.colors.primary,
                    }}
                  >
                    Organization Settings
                  </span>
                  <div className="h-px flex-1" style={{ backgroundColor: theme.colors.border }}></div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: theme.colors.text }}>
                      Timezone *
                    </label>
                    <select
                      {...register('timezone')}
                      className="w-full h-10 px-3 py-2 rounded-lg border focus:ring-2 outline-none transition-all"
                      style={{
                        backgroundColor: theme.colors.surface,
                        borderColor: theme.colors.border,
                        color: theme.colors.text
                      }}
                    >
                      <option value="Asia/Kathmandu">(GMT+05:45) Kathmandu</option>
                      <option value="UTC">(GMT+00:00) UTC</option>
                      <option value="America/New_York">(GMT-05:00) New York</option>
                      <option value="Europe/London">(GMT+00:00) London</option>
                      <option value="Asia/Dubai">(GMT+04:00) Dubai</option>
                      <option value="Asia/Kolkata">(GMT+05:30) Mumbai, Kolkata</option>
                      <option value="Asia/Singapore">(GMT+08:00) Singapore</option>
                      <option value="Australia/Sydney">(GMT+11:00) Sydney</option>
                    </select>
                    {errors.timezone && <p className="text-xs mt-1 text-red-500">{errors.timezone.message}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: theme.colors.text }}>
                      Language *
                    </label>
                    <div className="relative">
                      <select
                        {...register('language')}
                        disabled
                        className="w-full h-10 px-3 py-2 rounded-lg border focus:ring-2 outline-none transition-all opacity-70 cursor-not-allowed"
                        style={{
                          backgroundColor: theme.colors.surface,
                          borderColor: theme.colors.border,
                          color: theme.colors.text
                        }}
                      >
                        <option value="en">English (Locked)</option>
                        <option value="ne">Nepali (Coming Soon)</option>
                      </select>
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <Lock className="w-3 h-3 text-textSecondary" />
                      </div>
                    </div>
                    {errors.language && <p className="text-xs mt-1 text-red-500">{errors.language.message}</p>}
                  </div>
                </div>

                {/* Optional Nepal Tax Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: theme.colors.text }}>
                      PAN Number <span style={{ color: theme.colors.textSecondary }}>(optional)</span>
                    </label>
                    <input
                      type="text"
                      {...register('pan_number')}
                      placeholder="9-digit PAN"
                      maxLength={9}
                      className="w-full h-10 px-3 py-2 rounded-lg border focus:ring-2 outline-none text-sm"
                      style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.text }}
                      onInput={(e) => { (e.target as HTMLInputElement).value = (e.target as HTMLInputElement).value.replace(/\D/g, ''); }}
                    />
                    {errors.pan_number && <p className="text-xs mt-1 text-red-500">{errors.pan_number.message}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: theme.colors.text }}>
                      VAT Number <span style={{ color: theme.colors.textSecondary }}>(optional)</span>
                    </label>
                    <input
                      type="text"
                      {...register('vat_number')}
                      placeholder="9-digit VAT"
                      maxLength={9}
                      className="w-full h-10 px-3 py-2 rounded-lg border focus:ring-2 outline-none text-sm"
                      style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.text }}
                      onInput={(e) => { (e.target as HTMLInputElement).value = (e.target as HTMLInputElement).value.replace(/\D/g, ''); }}
                    />
                    {errors.vat_number && <p className="text-xs mt-1 text-red-500">{errors.vat_number.message}</p>}
                  </div>
                </div>

                <div className="flex items-center gap-2 my-4">
                  <div className="h-px flex-1" style={{ backgroundColor: theme.colors.border }}></div>
                  <span
                    className="text-xs font-semibold uppercase tracking-wider px-3 py-1 rounded-full"
                    style={{
                      backgroundColor: `${theme.colors.primary}26`,
                      color: theme.colors.primary,
                    }}
                  >
                    Owner Details
                  </span>
                  <div className="h-px flex-1" style={{ backgroundColor: theme.colors.border }}></div>
                </div>

                {!isExistingUser && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Input
                        label="First Name *"
                        id="owner_first_name"
                        type="text"
                        {...register('owner_first_name')}
                        placeholder="John"
                        leftIcon={<User className="w-5 h-5" />}
                        error={errors.owner_first_name?.message}
                        fullWidth
                      />
                    </div>

                    <div>
                      <Input
                        label="Last Name *"
                        id="owner_last_name"
                        type="text"
                        {...register('owner_last_name')}
                        placeholder="Doe"
                        leftIcon={<User className="w-5 h-5" />}
                        error={errors.owner_last_name?.message}
                        fullWidth
                      />
                    </div>
                  </div>
                )}

                {!isExistingUser && (
                  <div>
                    <Input
                      label="Owner Password *"
                      id="owner_password"
                      type="password"
                      {...register('owner_password')}
                      placeholder="••••••••"
                      leftIcon={<Lock className="w-5 h-5" />}
                      error={errors.owner_password?.message}
                      helperText="This account will be the initial owner and can invite more admins later."
                      fullWidth
                    />
                  </div>
                )}

                <div className="pt-2">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      {...register('is_existing_user')}
                      className="mt-1 rounded border-2 transition-all"
                      style={{
                        borderColor: theme.colors.border,
                        backgroundColor: theme.colors.surface,
                        accentColor: theme.colors.primary,
                      }}
                    />
                    <span className="text-sm" style={{ color: theme.colors.text }}>
                      I'm already a user and want to attach this organization to my existing account
                    </span>
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    fullWidth
                    onClick={() => setStep(1)}
                  >
                    Back
                  </Button>
                  <Button
                    type="submit"
                    disabled={isLoading}
                    variant="primary"
                    fullWidth
                    isLoading={isLoading}
                  >
                    Finish
                  </Button>
                </div>
              </div>
            )}

            <div
              className="pt-4 border-t mt-4 text-center"
              style={{ borderColor: theme.colors.border }}
            >
              <p className="text-sm" style={{ color: theme.colors.textSecondary }}>
                Already have an account?{' '}
                <a
                  href="/login"
                  className="font-semibold transition-colors"
                  style={{ color: theme.colors.primary }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = theme.colors.secondary;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = theme.colors.primary;
                  }}
                >
                  Sign in
                </a>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
