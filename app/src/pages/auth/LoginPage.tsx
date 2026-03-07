import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { authService, LoginResponse } from '../../services/authService';
import { useAuthStore } from '../../store/authStore';
import toast from '@shared/hooks/useToast';
import { Loader2, Mail, Lock, Shield, ArrowLeft, Building2, Sparkles, Eye, EyeOff } from 'lucide-react';
// Import shared components
import { Button, Input, Card, CardHeader, CardTitle, CardContent, CardDescription, Loading } from '@shared';
import { getRedirectToAppAfterLogin } from '../../utils/appRouting';
import { getMainDomainUrl, getAppNameFromSubdomain, isAppSubdomain } from '../../config/urlConfig';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import { useTheme } from '../../contexts/ThemeContext';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;

// Helper function to handle post-login redirect
const handlePostLoginRedirect = (orgSlug: string | null, navigate: (path: string) => void) => {
  // Check for return URL (from app subdomain redirect)
  const urlParams = new URLSearchParams(window.location.search);
  const returnUrl = urlParams.get('returnUrl');

  if (returnUrl) {
    // Decode and redirect to the return URL (preserves app subdomain)
    try {
      const decodedUrl = decodeURIComponent(returnUrl);
      const url = new URL(decodedUrl);

      // If returnUrl is just the root path, redirect to org dashboard on that subdomain
      if (url.pathname === '/' || url.pathname === '') {
        if (orgSlug) {
          url.pathname = `/org/${orgSlug}`;
        } else {
          // If no org slug, fall through to normal redirect
          if (orgSlug) {
            navigate(`/org/${orgSlug}`);
          } else {
            navigate('/');
          }
          return;
        }
      }

      // Redirect to the return URL
      window.location.href = url.toString();
      return;
    } catch (error) {
      // If decoding fails, fall through to normal redirect
      console.error('Error parsing returnUrl:', error);
    }
  }

  // Check if we should redirect to app after login
  const appRedirect = getRedirectToAppAfterLogin();
  if (appRedirect && orgSlug) {
    // Redirect to app subdomain with org dashboard
    window.location.href = `http://${appRedirect.appName}.dev.merojugx.com:3001/org/${orgSlug}`;
    return;
  }

  if (orgSlug) {
    navigate(`/org/${orgSlug}`);
  } else {
    navigate('/');
  }
};

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { appId: appIdFromParams } = useParams<{ appId?: string }>();
  const { isAuthenticated, accessToken, organization, user, _hasHydrated } = useAuthStore();
  const { theme, isDark } = useTheme();
  const [isLoading, setIsLoading] = useState(false);
  const [mfaRequired, setMfaRequired] = useState(false);
  const [tempToken, setTempToken] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState('');
  const [requiresOrgSelection, setRequiresOrgSelection] = useState(false);
  const [availableOrganizations, setAvailableOrganizations] = useState<Array<{ id: string; name: string; slug: string; role: string; org_type?: string }>>([]);
  const [loginCredentials, setLoginCredentials] = useState<{ email: string; password?: string; mfaCode?: string } | null>(null);
  const [loginMode, setLoginMode] = useState<'email' | 'password' | 'mfa'>('email');
  const [email, setEmail] = useState('');
  const [mfaLoginEmail, setMfaLoginEmail] = useState('');
  const [checkingMfa, setCheckingMfa] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showMfaCode, setShowMfaCode] = useState(false);
  const setAuth = useAuthStore((state) => state.setAuth);

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

  // Also check for appId in URL params (for localhost routes like /org/:slug/apps/:appId/login)
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

  // If user is already authenticated, redirect to returnUrl or dashboard
  useEffect(() => {
    if (!_hasHydrated) return;

    if (isAuthenticated && accessToken) {
      // If on app subdomain and authenticated, redirect to org dashboard (will show lock screen if needed)
      // This includes when accessing /login - just redirect to org dashboard
      if (isOnAppSubdomain && appSlug) {
        // Check for return URL (from app subdomain redirect)
        const urlParams = new URLSearchParams(window.location.search);
        const returnUrl = urlParams.get('returnUrl');

        if (returnUrl) {
          try {
            const decodedUrl = decodeURIComponent(returnUrl);
            window.location.href = decodedUrl;
            return;
          } catch (error) {
            console.error('Error parsing returnUrl:', error);
          }
        }

        // If organization is available, redirect to org dashboard (AppViewPage will show lock screen if needed)
        if (organization?.slug) {
          navigate(`/org/${organization.slug}`, { replace: true });
          return;
        } else {
          // No organization, show login (can't access app without org)
          return;
        }
      }

      // Check for return URL (from app subdomain redirect)
      const urlParams = new URLSearchParams(window.location.search);
      const returnUrl = urlParams.get('returnUrl');

      if (returnUrl) {
        // Decode and redirect to the return URL (preserves app subdomain)
        try {
          const decodedUrl = decodeURIComponent(returnUrl);
          const url = new URL(decodedUrl);

          // If returnUrl is just the root path, redirect to org dashboard on that subdomain
          if (url.pathname === '/' || url.pathname === '') {
            if (organization?.slug) {
              url.pathname = `/org/${organization.slug}`;
            } else {
              // If no org slug, redirect to dashboard
              if (organization?.slug) {
                navigate(`/org/${organization.slug}`, { replace: true });
              } else {
                navigate('/', { replace: true });
              }
              return;
            }
          }

          // Redirect to the return URL (will show lock screen if needed)
          window.location.href = url.toString();
          return;
        } catch (error) {
          // If decoding fails, fall through to normal redirect
          console.error('Error parsing returnUrl:', error);
        }
      }

      // No returnUrl, redirect to dashboard
      if (organization?.slug) {
        navigate(`/org/${organization.slug}`, { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    }
  }, [isAuthenticated, accessToken, organization, _hasHydrated, navigate, isOnAppSubdomain, appSlug]);

  // Handle email verification success message from navigation state
  useEffect(() => {
    if (location.state?.emailVerified && location.state?.message) {
      toast.success(location.state.message, {
        duration: 5000,
        style: {
          background: '#10b981',
          color: '#fff',
          fontSize: '16px',
          padding: '16px',
        },
      } as any);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, navigate]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  // Check if MFA is available for email
  const handleEmailSubmit = async (emailValue: string) => {
    if (!emailValue || !emailValue.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }

    setCheckingMfa(true);
    try {
      const checkResult = await authService.checkMfaRequired(emailValue);
      setEmail(emailValue);
      setMfaLoginEmail(emailValue);

      if (checkResult.mfa_available) {
        setLoginMode('mfa');
        toast.success('MFA login available. Please enter your authenticator code.');
      } else {
        setLoginMode('password');
      }
    } catch (error: any) {
      // Handle connection errors gracefully
      if (!error.response) {
        const isNetworkError =
          error.message?.includes('Network Error') ||
          error.message?.includes('ERR_CONNECTION_REFUSED') ||
          error.message?.includes('Failed to fetch');

        if (isNetworkError) {
          toast.error('Unable to connect to the server. Please make sure the backend server is running.', {
            duration: 6000,
          });
        }
      }
      // Fallback to password login if MFA check fails
      setLoginMode('password');
      setEmail(emailValue);
    } finally {
      setCheckingMfa(false);
    }
  };

  // Handle MFA-only login
  const handleMfaLogin = async () => {
    if (!mfaLoginEmail || !mfaCode || mfaCode.length !== 6) {
      toast.error('Please enter email and a valid 6-digit MFA code');
      return;
    }

    setIsLoading(true);
    try {
      const response: LoginResponse = await authService.loginWithMfa({
        email: mfaLoginEmail,
        code: mfaCode,
      });

      if (response.requires_organization_selection && response.organizations) {
        setRequiresOrgSelection(true);
        setAvailableOrganizations(response.organizations);
        setLoginCredentials({ email: mfaLoginEmail, mfaCode: mfaCode });
        setIsLoading(false);
        return;
      }

      if (response.access_token && response.user && response.organization) {
        const org = {
          id: response.organization.id,
          name: response.organization.name || '',
          slug: response.organization.slug || '',
        };
        setAuth(
          {
            access_token: response.access_token,
            refresh_token: response.refresh_token || '',
          },
          response.user,
          org,
        );
        toast.success('Login successful!');
        await new Promise(resolve => setTimeout(resolve, 100));
        handlePostLoginRedirect(org.slug, navigate);
        setIsLoading(false);
        return;
      }

      toast.error('Unexpected response from server. Please try again.');
      setIsLoading(false);
    } catch (error: any) {
      // Handle connection errors
      if (!error.response) {
        const isNetworkError =
          error.message?.includes('Network Error') ||
          error.message?.includes('ERR_CONNECTION_REFUSED') ||
          error.message?.includes('Failed to fetch');

        if (isNetworkError) {
          toast.error('Unable to connect to the server. Please make sure the backend server is running and try again.', {
            duration: 6000,
          });
          setIsLoading(false);
          return;
        }
      }

      // Get error message and clean it
      let errorMessage = error.response?.data?.message || error.message || 'Login failed';

      // Handle axios default error messages
      if (errorMessage.includes('Request failed with status code')) {
        const statusMatch = errorMessage.match(/status code (\d+)/i);
        const statusCode = statusMatch ? parseInt(statusMatch[1], 10) : null;

        if (statusCode === 401) {
          errorMessage = ((!errorMessage || errorMessage.includes('Request failed')) ? 'Invalid email or password. Please try again.' : errorMessage);
        } else if (statusCode === 403) {
          errorMessage = 'You do not have permission to access this account.';
        } else if (statusCode === 400) {
          errorMessage = 'Invalid request. Please check your email and password.';
        } else {
          errorMessage = 'Login failed. Please try again.';
        }
      }

      // Remove any technical error codes from the message
      errorMessage = errorMessage.replace(/\b(40[0-9]|500|50[0-9])\b/g, '').trim();
      errorMessage = errorMessage.replace(/Request failed with status code\s*\d*/gi, '').trim();
      errorMessage = errorMessage.replace(/\b(HTTP|Status|Error Code|Status Code)\s*:?\s*/gi, '').trim();

      toast.error(errorMessage || 'Login failed. Please try again.');
      setIsLoading(false);
    }
  };

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    localStorage.removeItem('mfa_setup_token');

    try {
      const response: LoginResponse = await authService.login({
        email: data.email,
        password: data.password,
      });

      if (
        response.requires_mfa_setup === true ||
        response.temp_setup_token ||
        (response.message && response.message.includes('MFA is required'))
      ) {
        const tempToken = response.temp_setup_token;
        if (tempToken) {
          localStorage.setItem('mfa_setup_token', tempToken);
        }
        setIsLoading(false);
        toast.info('MFA is required. Please set up 2FA first.');
        await new Promise(resolve => setTimeout(resolve, 300));
        navigate('/mfa/setup');
        return;
      }

      if (response.requires_organization_selection && response.organizations) {
        setRequiresOrgSelection(true);
        setAvailableOrganizations(response.organizations);
        setLoginCredentials({ email: data.email, password: data.password });
        setIsLoading(false);
        return;
      }

      if (response.requires_mfa_verification && response.temp_token) {
        setMfaRequired(true);
        setTempToken(response.temp_token);
        setIsLoading(false);
        return;
      }

      if (response.access_token && response.user && response.organization) {
        const org = {
          id: response.organization.id,
          name: response.organization.name || '',
          slug: response.organization.slug || '',
        };
        setAuth(
          {
            access_token: response.access_token,
            refresh_token: response.refresh_token || '',
          },
          response.user,
          org,
        );
        toast.success('Login successful!');
        await new Promise(resolve => setTimeout(resolve, 100));
        handlePostLoginRedirect(org.slug, navigate);
        setIsLoading(false);
        return;
      }

      toast.error('Unexpected response from server. Please try again.');
      setIsLoading(false);
    } catch (error: any) {
      const errorData = error.response?.data || error.data || {};
      if (
        errorData.requires_mfa_setup === true ||
        errorData.requires_mfa_setup === 'true' ||
        errorData.temp_setup_token ||
        (errorData.message && errorData.message.includes('MFA is required'))
      ) {
        const tempToken = errorData.temp_setup_token;
        if (tempToken) {
          localStorage.setItem('mfa_setup_token', tempToken);
        }
        setIsLoading(false);
        toast.info('MFA is required. Please set up 2FA first.');
        await new Promise(resolve => setTimeout(resolve, 300));
        navigate('/mfa/setup');
        return;
      }

      // Get error message and clean it
      let errorMessage = errorData.message || error.message || 'Login failed';

      // Handle axios default error messages
      if (errorMessage.includes('Request failed with status code')) {
        const statusMatch = errorMessage.match(/status code (\d+)/i);
        const statusCode = statusMatch ? parseInt(statusMatch[1], 10) : null;

        if (statusCode === 401) {
          errorMessage = ((!errorMessage || errorMessage.includes('Request failed')) ? 'Invalid email or password. Please try again.' : errorMessage);
        } else if (statusCode === 403) {
          errorMessage = 'You do not have permission to access this account.';
        } else {
          errorMessage = 'Login failed. Please try again.';
        }
      }

      // Remove any technical error codes from the message
      errorMessage = errorMessage.replace(/\b(40[0-9]|500|50[0-9])\b/g, '').trim();
      errorMessage = errorMessage.replace(/Request failed with status code\s*\d*/gi, '').trim();
      errorMessage = errorMessage.replace(/\b(HTTP|Status|Error Code|Status Code)\s*:?\s*/gi, '').trim();

      toast.error(errorMessage || 'Login failed. Please try again.');
      setIsLoading(false);
    }
  };

  const handleOrganizationSelect = async (organizationId: string) => {
    if (!loginCredentials) return;

    localStorage.removeItem('mfa_setup_token');

    setIsLoading(true);
    try {
      let response: LoginResponse;
      if (loginCredentials.password) {
        response = await authService.login({
          email: loginCredentials.email,
          password: loginCredentials.password,
          organization_id: organizationId,
        });
      } else if (loginCredentials.mfaCode) {
        response = await authService.loginWithMfa({
          email: loginCredentials.email,
          code: loginCredentials.mfaCode,
          organization_id: organizationId,
        });
      } else {
        throw new Error('Invalid login credentials');
      }

      if (response.requires_mfa_setup) {
        if (response.temp_setup_token) {
          localStorage.setItem('mfa_setup_token', response.temp_setup_token);
        }
        setIsLoading(false);
        toast.info('MFA is required. Please set up 2FA first.');
        await new Promise(resolve => setTimeout(resolve, 300));
        navigate('/mfa/setup');
        return;
      }

      if (response.requires_mfa_verification && response.temp_token) {
        setMfaRequired(true);
        setTempToken(response.temp_token);
        setRequiresOrgSelection(false);
        return;
      }

      if (response.access_token && response.user && response.organization) {
        setAuth(
          {
            access_token: response.access_token,
            refresh_token: response.refresh_token || '',
          },
          response.user,
          { id: response.organization.id, name: response.organization.name || '', slug: response.organization.slug || '' },
        );
        toast.success('Login successful!');

        const org = { id: response.organization.id, name: response.organization.name || '', slug: response.organization.slug || '' };

        // Wait a bit longer to ensure auth state is persisted to localStorage
        await new Promise(resolve => setTimeout(resolve, 300));

        // Check for return URL (from app subdomain redirect)
        const urlParams = new URLSearchParams(window.location.search);
        const returnUrl = urlParams.get('returnUrl');

        if (returnUrl) {
          // Decode and redirect to the return URL (preserves app subdomain)
          try {
            const decodedUrl = decodeURIComponent(returnUrl);
            const url = new URL(decodedUrl);

            // If returnUrl is just the root path, redirect to org dashboard on that subdomain
            if (url.pathname === '/' || url.pathname === '') {
              if (org.slug) {
                url.pathname = `/org/${org.slug}`;
              } else {
                // If no org slug, fall through to normal redirect
                handlePostLoginRedirect(org.slug, navigate);
                return;
              }
            }

            // Redirect to the return URL
            window.location.href = url.toString();
            return;
          } catch (error) {
            // If decoding fails, fall through to normal redirect
            console.error('Error parsing returnUrl:', error);
          }
        }

        // Check if we should redirect to app after login
        const appRedirect = getRedirectToAppAfterLogin();
        if (appRedirect && org.slug) {
          // Redirect to app subdomain with org dashboard
          window.location.href = `http://${appRedirect.appName}.dev.merojugx.com:3001/org/${org.slug}`;
          return;
        }

        handlePostLoginRedirect(org.slug, navigate);
      }
    } catch (error: any) {
      let errorMessage = error.response?.data?.message || 'Login failed';

      // Handle axios default error messages
      if (errorMessage.includes('Request failed with status code')) {
        const statusMatch = errorMessage.match(/status code (\d+)/i);
        const statusCode = statusMatch ? parseInt(statusMatch[1], 10) : null;
        if (statusCode === 401) {
          // Keep the message from backend if available, otherwise use default
          if (!errorMessage || errorMessage.includes('Request failed')) {
            errorMessage = 'Invalid email or password. Please try again.';
          }
        } else {
          errorMessage = 'Login failed. Please try again.';
        }
      }

      // Remove any technical error codes
      errorMessage = errorMessage.replace(/\b(40[0-9]|500|50[0-9])\b/g, '').trim();
      errorMessage = errorMessage.replace(/Request failed with status code\s*\d*/gi, '').trim();
      errorMessage = errorMessage.replace(/\b(HTTP|Status|Error Code|Status Code)\s*:?\s*/gi, '').trim();

      toast.error(errorMessage || 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMfaVerify = async () => {
    if (!tempToken || !mfaCode) {
      toast.error('Please enter the 2FA code');
      return;
    }

    setIsLoading(true);
    try {
      const response = await authService.verifyMfa(tempToken, mfaCode);

      if (response.requires_organization_selection && response.organizations) {
        setRequiresOrgSelection(true);
        setAvailableOrganizations(response.organizations);
        setMfaRequired(false);
        setTempToken(null);
        setMfaCode('');
        setIsLoading(false);
        return;
      }

      if (response.access_token && response.user && response.organization) {
        setAuth(
          {
            access_token: response.access_token,
            refresh_token: response.refresh_token || '',
          },
          response.user,
          { id: response.organization.id, name: response.organization.name || '', slug: response.organization.slug || '' },
        );
        toast.success('Login successful!');
        await new Promise(resolve => setTimeout(resolve, 100));
        const orgSlug = response.organization?.slug || null;
        handlePostLoginRedirect(orgSlug, navigate);
      }
    } catch (error: any) {
      let errorMessage = error.response?.data?.message || 'Invalid 2FA code';

      // Handle axios default error messages
      if (errorMessage.includes('Request failed with status code')) {
        const statusMatch = errorMessage.match(/status code (\d+)/i);
        const statusCode = statusMatch ? parseInt(statusMatch[1], 10) : null;
        if (statusCode === 401) {
          // Keep the message from backend if available, otherwise use default
          if (!errorMessage || errorMessage.includes('Request failed')) {
            errorMessage = 'Invalid 2FA code. Please try again.';
          }
        } else {
          errorMessage = 'Invalid 2FA code. Please check your authenticator app.';
        }
      }

      // Remove any technical error codes
      errorMessage = errorMessage.replace(/\b(40[0-9]|500|50[0-9])\b/g, '').trim();
      errorMessage = errorMessage.replace(/Request failed with status code\s*\d*/gi, '').trim();
      errorMessage = errorMessage.replace(/\b(HTTP|Status|Error Code|Status Code)\s*:?\s*/gi, '').trim();

      toast.error(errorMessage || 'Invalid 2FA code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Organization Selection Screen
  if (requiresOrgSelection) {
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
            className="absolute top-20 left-10 w-72 h-72 rounded-full blur-3xl animate-pulse"
            style={{ backgroundColor: `${theme.colors.primary}1A` }}
          />
          <div
            className="absolute bottom-20 right-10 w-96 h-96 rounded-full blur-3xl"
            style={{ backgroundColor: `${theme.colors.primary}0D` }}
          />
        </div>

        <div className="relative max-w-md w-full z-10">
          <div
            className="rounded-2xl p-8 shadow-2xl border backdrop-blur-sm"
            style={{
              backgroundColor: `${theme.colors.surface}F2`,
              borderColor: theme.colors.border,
            }}
          >
            <div className="text-center mb-6">
              <div
                className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
                style={{
                  background: `linear-gradient(135deg, ${theme.colors.primary} 0%, ${theme.colors.secondary} 100%)`,
                  color: '#ffffff'
                }}
              >
                <Building2 className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold" style={{ color: theme.colors.text }}>
                Select Organization
              </h2>
              <p className="mt-2 text-sm" style={{ color: theme.colors.textSecondary }}>
                You belong to multiple organizations. Please select one to continue.
              </p>
            </div>
            <div className="space-y-3">
              {availableOrganizations.map((org) => (
                <Button
                  key={org.id}
                  onClick={() => handleOrganizationSelect(org.id)}
                  disabled={isLoading}
                  variant="outline"
                  fullWidth
                  className="justify-start text-left h-auto p-4"
                  style={{
                    borderColor: theme.colors.border,
                    color: theme.colors.text,
                    backgroundColor: theme.colors.surface,
                  }}
                  onMouseEnter={(e: any) => {
                    e.currentTarget.style.borderColor = theme.colors.primary;
                  }}
                  onMouseLeave={(e: any) => {
                    e.currentTarget.style.borderColor = theme.colors.border;
                  }}
                >
                  <div className="flex flex-col items-start w-full">
                    <div className="flex items-center justify-between w-full">
                      <div className="font-semibold" style={{ color: theme.colors.text }}>{org.name}</div>
                      {org.org_type === 'MAIN' && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full border bg-blue-500/10 text-blue-500 border-blue-500/20">
                          Master Account
                        </span>
                      )}
                      {org.org_type === 'BRANCH' && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full border bg-green-500/10 text-green-500 border-green-500/20">
                          Branch
                        </span>
                      )}
                    </div>
                    <div className="text-sm mt-1" style={{ color: theme.colors.textSecondary }}>Role: {org.role}</div>
                  </div>
                </Button>
              ))}
              <Button
                onClick={() => {
                  setRequiresOrgSelection(false);
                  setAvailableOrganizations([]);
                  setLoginCredentials(null);
                }}
                variant="link"
                fullWidth
                leftIcon={<ArrowLeft className="w-4 h-4" />}
                className="mt-4"
              >
                Back to login
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // MFA Verification Screen
  if (mfaRequired) {
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
            className="absolute top-20 left-10 w-72 h-72 rounded-full blur-3xl animate-pulse"
            style={{ backgroundColor: `${theme.colors.primary}1A` }}
          />
          <div
            className="absolute bottom-20 right-10 w-96 h-96 rounded-full blur-3xl"
            style={{ backgroundColor: `${theme.colors.primary}0D` }}
          />
        </div>

        <div className="relative max-w-md w-full z-10">
          <div
            className="rounded-2xl p-8 shadow-2xl border backdrop-blur-sm"
            style={{
              backgroundColor: `${theme.colors.surface}F2`,
              borderColor: theme.colors.border,
            }}
          >
            <div className="text-center mb-6">
              <div
                className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
                style={{
                  background: `linear-gradient(135deg, ${theme.colors.primary} 0%, ${theme.colors.secondary} 100%)`,
                  color: '#ffffff'
                }}
              >
                <Shield className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold" style={{ color: theme.colors.text }}>
                Two-Factor Authentication
              </h2>
              <p className="mt-2 text-sm" style={{ color: theme.colors.textSecondary }}>
                Enter the 6-digit code from your authenticator app
              </p>
            </div>
            <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); handleMfaVerify(); }}>
              <Input
                label="Verification Code"
                id="mfa-code"
                type={showMfaCode ? 'text' : 'password'}
                maxLength={6}
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                autoFocus
                fullWidth
                className="text-center text-2xl tracking-[0.4em] font-mono"
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowMfaCode(!showMfaCode)}
                    style={{ color: theme.colors.textSecondary }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = theme.colors.text;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = theme.colors.textSecondary;
                    }}
                    tabIndex={-1}
                  >
                    {showMfaCode ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                }
              />

              <Button
                type="submit"
                variant="primary"
                fullWidth
                disabled={isLoading || mfaCode.length !== 6}
                isLoading={isLoading}
              >
                Verify
              </Button>

              <Button
                type="button"
                variant="link"
                fullWidth
                onClick={() => {
                  setMfaRequired(false);
                  setTempToken(null);
                  setMfaCode('');
                }}
                leftIcon={<ArrowLeft className="w-4 h-4" />}
              >
                Back to login
              </Button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // MFA Login Mode
  if (loginMode === 'mfa') {
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
            className="absolute top-20 left-10 w-72 h-72 rounded-full blur-3xl animate-pulse"
            style={{ backgroundColor: `${theme.colors.primary}1A` }}
          />
          <div
            className="absolute bottom-20 right-10 w-96 h-96 rounded-full blur-3xl"
            style={{ backgroundColor: `${theme.colors.primary}0D` }}
          />
        </div>

        <div className="relative max-w-md w-full z-10">
          <div
            className="rounded-2xl p-8 shadow-2xl border backdrop-blur-sm"
            style={{
              backgroundColor: `${theme.colors.surface}F2`,
              borderColor: theme.colors.border,
            }}
          >
            <div className="text-center mb-6">
              <div
                className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
                style={{
                  background: `linear-gradient(135deg, ${theme.colors.primary} 0%, ${theme.colors.secondary} 100%)`,
                  color: '#ffffff'
                }}
              >
                <Shield className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold" style={{ color: theme.colors.text }}>
                Sign in with MFA
              </h2>
              <p className="mt-2 text-sm" style={{ color: theme.colors.textSecondary }}>
                Enter your email and authenticator code
              </p>
            </div>
            <form
              className="space-y-6"
              onSubmit={(e) => {
                e.preventDefault();
                handleMfaLogin();
              }}
            >
              <Input
                label="Email address"
                id="mfa-email"
                type="email"
                value={mfaLoginEmail}
                onChange={(e) => setMfaLoginEmail(e.target.value)}
                placeholder="you@example.com"
                disabled={isLoading}
                leftIcon={<Mail className="w-5 h-5" />}
                fullWidth
              />

              <Input
                label="Authenticator Code"
                id="mfa-code-input"
                type={showMfaCode ? 'text' : 'password'}
                maxLength={6}
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                autoFocus
                disabled={isLoading}
                fullWidth
                className="text-center text-2xl tracking-[0.4em] font-mono"
                helperText="Enter the 6-digit code from your authenticator app"
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowMfaCode(!showMfaCode)}
                    style={{ color: theme.colors.textSecondary }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = theme.colors.text;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = theme.colors.textSecondary;
                    }}
                    tabIndex={-1}
                    disabled={isLoading}
                  >
                    {showMfaCode ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                }
              />

              <Button
                type="submit"
                variant="primary"
                fullWidth
                disabled={isLoading || !mfaLoginEmail || mfaCode.length !== 6}
                isLoading={isLoading}
              >
                Sign in
              </Button>

              <Button
                type="button"
                variant="link"
                fullWidth
                onClick={() => {
                  setLoginMode('email');
                  setMfaLoginEmail('');
                  setMfaCode('');
                }}
                leftIcon={<ArrowLeft className="w-4 h-4" />}
              >
                Back
              </Button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // Main Login Screen
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
          className="absolute -top-16 -left-8 w-80 h-80 rounded-full blur-3xl"
          style={{ backgroundColor: `${theme.colors.primary}25` }}
        />
        <div
          className="absolute bottom-0 right-0 w-[420px] h-[420px] rounded-full blur-3xl"
          style={{ backgroundColor: `${theme.colors.primary}10` }}
        />
      </div>

      <div className="relative max-w-5xl w-full grid grid-cols-1 lg:grid-cols-2 gap-10 items-center z-10">
        {/* Left: marketing / branding */}
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
              Secure, customizable dashboards for your organization
            </span>
          </div>

          <div className="space-y-4">
            <h1 className="text-4xl xl:text-5xl font-extrabold leading-tight tracking-tight" style={{ color: theme.colors.text }}>
              {isAppContext ? 'Welcome back to' : 'Welcome to'}{' '}
              <span
                className="bg-clip-text text-transparent"
                style={{
                  backgroundImage: `linear-gradient(to right, ${theme.colors.text}, ${theme.colors.primary})`
                }}
              >
                {appDisplayName}
              </span>
            </h1>
            <p className="text-sm max-w-md" style={{ color: theme.colors.textSecondary }}>
              {isAppContext
                ? `Access ${appDisplayName} and continue working with your team in a secure, organized workspace.`
                : 'Access your organization workspace, manage roles, collaborate with your team, and stay on top of everything in one beautiful dashboard.'}
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
                {isAppContext ? 'App-focused' : 'Organization-first'}
              </p>
              <p className="text-xs" style={{ color: theme.colors.textSecondary }}>
                {isAppContext
                  ? `Dedicated workspace for ${appDisplayName} with seamless collaboration.`
                  : 'Switch between organizations and manage access with confidence.'}
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
                {isAppContext ? 'Protected access' : 'Secure by design'}
              </p>
              <p className="text-xs" style={{ color: theme.colors.textSecondary }}>
                {isAppContext
                  ? `Your ${appDisplayName} data is protected with enterprise-grade security.`
                  : 'MFA, audit logs, and fine-grained permissions keep your data safe.'}
              </p>
            </div>
          </div>
        </div>

        {/* Right: auth card */}
        <div
          className="relative backdrop-blur-md rounded-2xl shadow-2xl border p-8 sm:p-10 space-y-6 animate-slideUp"
          style={{
            backgroundColor: `${theme.colors.surface}F2`,
            borderColor: theme.colors.border,
          }}
        >
          <div className="mb-2">
            <h2 className="text-2xl font-bold" style={{ color: theme.colors.text }}>
              {loginMode === 'email' ? 'Sign in' : 'Enter your password'}
            </h2>
            <p className="mt-1 text-xs" style={{ color: theme.colors.textSecondary }}>
              {loginMode === 'email'
                ? isAppContext
                  ? `Sign in to access ${appDisplayName}.`
                  : "Start with your work email, we'll handle the rest."
                : isAppContext
                  ? `Welcome back to ${appDisplayName}. Enter your password to continue.`
                  : 'Welcome back. Enter your password to continue.'}
            </p>
          </div>

          {loginMode === 'email' ? (
            <form
              className="space-y-6"
              onSubmit={(e) => {
                e.preventDefault();
                const emailInput = (e.target as HTMLFormElement).querySelector('input[type="email"]') as HTMLInputElement;
                if (emailInput) {
                  handleEmailSubmit(emailInput.value);
                }
              }}
            >
              <Input
                label="Email address"
                id="email-only"
                type="email"
                placeholder="you@example.com"
                autoFocus
                disabled={checkingMfa}
                leftIcon={<Mail className="w-5 h-5" />}
                fullWidth
                helperText={checkingMfa ? undefined : undefined}
              />
              {checkingMfa && (
                <div className="flex items-center gap-2 text-sm" style={{ color: theme.colors.textSecondary }}>
                  <Loader2 className="animate-spin h-4 w-4" />
                  Checking...
                </div>
              )}

              <Button
                type="submit"
                variant="primary"
                fullWidth
                disabled={checkingMfa}
                isLoading={checkingMfa}
              >
                Continue
              </Button>
            </form>
          ) : (
            <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
              <div className="space-y-4">
                <Input
                  label="Email address"
                  id="email"
                  type="email"
                  {...register('email')}
                  defaultValue={email}
                  placeholder="you@example.com"
                  leftIcon={<Mail className="w-5 h-5" />}
                  error={errors.email?.message}
                  fullWidth
                />

                <Input
                  label="Password"
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  {...register('password')}
                  placeholder="••••••••"
                  leftIcon={<Lock className="w-5 h-5" />}
                  rightIcon={
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{ color: theme.colors.textSecondary }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = theme.colors.text;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = theme.colors.textSecondary;
                      }}
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  }
                  error={errors.password?.message}
                  fullWidth
                />
              </div>

              <div className="flex items-center justify-between">
                <Link
                  to="/forgot-password"
                  className="text-sm font-medium transition-colors"
                  style={{
                    color: theme.colors.primary,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = theme.colors.secondary;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = theme.colors.primary;
                  }}
                >
                  Forgot password?
                </Link>
              </div>

              <Button
                type="submit"
                variant="primary"
                fullWidth
                disabled={isLoading}
                isLoading={isLoading}
              >
                Sign in
              </Button>

              {loginMode === 'password' && (
                <Button
                  type="button"
                  variant="link"
                  fullWidth
                  onClick={() => {
                    setLoginMode('email');
                    setEmail('');
                  }}
                  leftIcon={<ArrowLeft className="w-4 h-4" />}
                >
                  Back
                </Button>
              )}
            </form>
          )}

          <div
            className="pt-4 border-t mt-6 text-center"
            style={{ borderColor: theme.colors.border }}
          >
            <p className="text-sm" style={{ color: theme.colors.textSecondary }}>
              Don't have an account?{' '}
              <a
                href="/register"
                className="font-semibold transition-colors"
                style={{ color: theme.colors.primary }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = theme.colors.secondary;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = theme.colors.primary;
                }}
              >
                Register organization
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
