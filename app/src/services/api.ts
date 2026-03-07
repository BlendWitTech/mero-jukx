import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../store/authStore';
import toast from '@shared/hooks/useToast';
import { logger } from '../utils/logger';

// Get API URL from environment, ensuring it ends with /api/v1
const getApiBaseUrl = () => {
  const viteApiUrl = import.meta.env.VITE_API_URL;
  if (viteApiUrl) {
    return viteApiUrl.endsWith('/') ? viteApiUrl : `${viteApiUrl}/`;
  }
  return '/api/v1/';
};

const api = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
});

// Queue to prevent multiple simultaneous refresh attempts
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: any) => void;
  reject: (error?: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });

  failedQueue = [];
};

// Request interceptor to add auth token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const authStore = useAuthStore.getState();
    const token = authStore.accessToken;

    // Skip adding Authorization header for MFA setup endpoints
    // These endpoints use temp_setup_token in headers instead
    const isMfaSetupEndpoint = config.url?.includes('/mfa/setup') ||
      config.url?.includes('mfa/setup') ||
      (config.baseURL && config.url && `${config.baseURL}${config.url}`.includes('/mfa/setup'));

    // Don't add Authorization header for MFA setup endpoints
    // They use X-MFA-Setup-Token header instead
    if (isMfaSetupEndpoint && config.headers) {
      // Explicitly remove Authorization header if present for MFA setup endpoints
      delete config.headers.Authorization;
      delete config.headers.authorization;
    } else if (!isMfaSetupEndpoint && token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Add app session token if available (for app access)
    // Check if we're in an app context (either from URL or pathname)
    const url = config.url || '';
    const pathname = window.location.pathname;
    // Check for both old /apps/:id and new /app/:slug patterns
    const appIdMatch = url.match(/\/apps\/(\d+)/) || pathname.match(/\/apps\/(\d+)/);
    const appSlugMatch = url.match(/\/app\/([^/]+)/) || pathname.match(/\/app\/([^/]+)/);

    // Also check if the request is to boards endpoints while in app context
    const isBoardsRequest = url.includes('/boards/') || url.includes('/workspaces/') || url.includes('/projects/');
    const isInAppContext = pathname.includes('/apps/') || pathname.includes('/app/');

    if ((appIdMatch || appSlugMatch || (isBoardsRequest && isInAppContext)) && config.headers) {
      let appId: number | null = null;

      // Try to get appId from last_opened_app_id fallback first (most reliable during transitions)
      const lastId = localStorage.getItem('last_opened_app_id');
      if (lastId) {
        appId = parseInt(lastId, 10);
      }

      if (!appId && appIdMatch) {
        appId = parseInt(appIdMatch[1], 10);
      } else if (!appId && appSlugMatch) {
        // Find appId from taskbar_apps using slug
        try {
          const storedApps = localStorage.getItem('taskbar_apps');
          if (storedApps) {
            const apps: any[] = JSON.parse(storedApps);
            const app = apps.find(a => a.slug === appSlugMatch[1]);
            if (app?.id) {
              appId = app.id;
            }
          }
        } catch (e) {
          console.error('Error parsing taskbar_apps in API interceptor:', e);
        }
      } else if (!appId && isInAppContext) {
        // Extract app ID from pathname
        const pathMatch = pathname.match(/\/apps\/(\d+)/);
        if (pathMatch) {
          appId = parseInt(pathMatch[1], 10);
        } else {
          // Try to extract slug and find ID
          const slugMatch = pathname.match(/\/app\/([^/]+)/);
          if (slugMatch) {
            const targetSlug = slugMatch[1];
            try {
              const storedApps = localStorage.getItem('taskbar_apps');
              if (storedApps) {
                const apps: any[] = JSON.parse(storedApps);
                const app = apps.find(a => a.slug === targetSlug);
                if (app?.id) {
                  appId = app.id;
                }
              }
            } catch (e) { }
          }
        }
      }

      if (appId) {
        // Try to get per-app session token
        try {
          const sessionKey = `app_session_${appId}`;
          const sessionDataStr = localStorage.getItem(sessionKey);
          if (sessionDataStr) {
            const sessionData = JSON.parse(sessionDataStr);
            const activityKey = `app_activity_${appId}`;
            const activityStr = localStorage.getItem(activityKey);
            const now = Date.now();
            const lastActivity = activityStr ? parseInt(activityStr, 10) : null;
            const SESSION_TIMEOUT = 15 * 60 * 1000; // 15 minutes

            if (lastActivity && (now - lastActivity) <= SESSION_TIMEOUT) {
              // Session is valid - add X-App-Session header
              config.headers['X-App-Session'] = sessionData.token;
            }
          } else {
            // Fallback to legacy token if no per-app session
            const appSessionToken = localStorage.getItem('app_session_token');
            if (appSessionToken) {
              config.headers['X-App-Session'] = appSessionToken;
            }
          }
        } catch {
          // Fallback to legacy token if parsing fails
          const appSessionToken = localStorage.getItem('app_session_token');
          if (appSessionToken) {
            config.headers['X-App-Session'] = appSessionToken;
          }
        }
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    const url = originalRequest.url || '';

    // Suppress expected errors from logging (404 for announcements, 403 for chats)
    // These are expected and handled gracefully, so we don't want them in console
    if (error.response) {
      const status = error.response.status;
      if (
        (status === 404 && (url.includes('/announcements/active') || url.includes('/marketplace/apps/slug/'))) ||
        (status === 403 && url.includes('/chats')) ||
        (status === 401 && (url.includes('/auth/check-mfa-required') || url.includes('/auth/refresh')))
      ) {
        // Silently reject these expected errors without logging
        return Promise.reject(error);
      }
    }


    // Skip refresh logic for auth endpoints (login, refresh, register) and MFA setup endpoints
    const isAuthEndpoint = originalRequest.url?.includes('/auth/login') ||
      originalRequest.url?.includes('/auth/refresh') ||
      originalRequest.url?.includes('/auth/organization/register');

    // Skip refresh logic for MFA setup endpoints (they use temp_setup_token)
    const isMfaSetupEndpoint = originalRequest.url?.includes('/mfa/setup');

    // For login endpoint errors, check if it's actually an MFA setup requirement
    if (isAuthEndpoint && originalRequest.url?.includes('/auth/login')) {
      const errorData = error.response?.data;
      // If it's a 200 response that got here somehow, or if it contains MFA setup info, let it through
      if (error.response?.status === 200 || (errorData as any)?.requires_mfa_setup || (errorData as any)?.temp_setup_token) {
        // This shouldn't happen, but if it does, return the data as if it was successful
        return Promise.resolve({ data: errorData, status: 200 });
      }
      // Otherwise, let the error propagate normally
      return Promise.reject(error);
    }

    // Handle 401 Unauthorized errors
    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint && !isMfaSetupEndpoint) {
      // Check if MFA setup is required
      const errorData = error.response?.data;
      if ((errorData as any)?.code === 'MFA_SETUP_REQUIRED' || (errorData as any)?.requires_mfa_setup) {
        const currentPath = window.location.pathname;
        if (currentPath !== '/mfa/setup') {
          logger.log('[MFA Setup] Redirecting to MFA setup page');
          window.location.href = '/mfa/setup';
        }
        return Promise.reject(error);
      }

      const authStore = useAuthStore.getState();
      const refreshToken = authStore.refreshToken;

      // If no refresh token, logout immediately
      if (!refreshToken) {
        logger.warn('[Token Refresh] No refresh token available, logging out');
        authStore.logout();
        const currentPath = window.location.pathname;
        if (currentPath !== '/login' && currentPath !== '/register' && !currentPath.startsWith('/verify-email') && !currentPath.startsWith('/reset-password') && !currentPath.startsWith('/forgot-password') && !currentPath.startsWith('/accept-invitation') && currentPath !== '/mfa/setup') {
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }

      // If already refreshing, queue this request
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers && token) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return api(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        logger.log('[Token Refresh] Attempting to refresh token...', {
          hasRefreshToken: !!refreshToken,
          refreshTokenLength: refreshToken?.length || 0,
          originalUrl: originalRequest.url,
        });

        // Try to refresh the token (use plain axios to avoid interceptor loop)
        // Use the same baseURL as the api instance
        const baseUrl = api.defaults.baseURL || '/api/v1';
        const refreshUrl = baseUrl.endsWith('/')
          ? `${baseUrl}auth/refresh`
          : `${baseUrl}/auth/refresh`;
        const response = await axios.post(refreshUrl, {
          refresh_token: refreshToken,
        }, {
          headers: {
            'Content-Type': 'application/json',
          },
        });

        const { access_token } = response.data;

        logger.log('[Token Refresh] Token refreshed successfully', {
          hasNewAccessToken: !!access_token,
          newTokenLength: access_token?.length || 0,
        });

        if (!access_token) {
          throw new Error('No access token received from refresh endpoint');
        }

        // Update the store with new token
        if (authStore.user && authStore.organization) {
          authStore.setAuth(
            { access_token, refresh_token: refreshToken },
            authStore.user,
            authStore.organization
          );
        } else {
          authStore.updateToken(access_token);
        }

        // Process queued requests
        processQueue(null, access_token);

        // Retry the original request with new token
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${access_token}`;
        }

        isRefreshing = false;
        return api(originalRequest);
      } catch (refreshError: any) {
        // Refresh failed, process queue with error and logout
        isRefreshing = false;
        processQueue(refreshError, null);

        const authStore = useAuthStore.getState();
        const currentPath = window.location.pathname;
        const isAuthPage = currentPath === '/login' || currentPath === '/register' ||
          currentPath.startsWith('/verify-email') ||
          currentPath.startsWith('/reset-password') ||
          currentPath.startsWith('/forgot-password') ||
          currentPath.startsWith('/accept-invitation') ||
          currentPath === '/mfa/setup';

        // Only log error if not already on auth page (to reduce console noise)
        if (!isAuthPage) {
          logger.warn('[Token Refresh] Failed to refresh token - redirecting to login', {
            status: refreshError?.response?.status,
            message: refreshError?.response?.data?.message || 'Session expired. Please log in again.',
          });
        }

        // Clear auth state
        authStore.logout();

        // Redirect to login if not already on an auth page
        if (!isAuthPage) {
          // Use replace to avoid adding to history
          window.location.replace('/login');
        }

        return Promise.reject(refreshError);
      }
    }

    // Handle network/connection errors (no response from server)
    if (!error.response) {
      const isNetworkError =
        error.message?.includes('Network Error') ||
        error.message?.includes('ERR_CONNECTION_REFUSED') ||
        error.message?.includes('Failed to fetch') ||
        error.code === 'ECONNABORTED' ||
        error.code === 'ERR_NETWORK';

      if (isNetworkError) {
        const userFriendlyMessage = 'Unable to connect to the server. Please make sure the backend server is running and try again.';

        // Only show toast for non-auth endpoints (auth endpoints handle their own errors)
        if (!isAuthEndpoint && !isMfaSetupEndpoint) {
          toast.error(userFriendlyMessage, { duration: 6000 });
        }

        return Promise.reject(error);
      }
    }

    // Show user-friendly error messages for non-401 errors
    // Skip showing errors for auth endpoints (they handle their own errors)
    if (error.response?.status && error.response.status !== 401 && !isAuthEndpoint && !isMfaSetupEndpoint) {
      const status = error.response.status;
      const url = originalRequest.url || '';

      // For tickets endpoints, we already show a friendly in-page message.
      // Avoid popping an extra toast with a raw 403/401-style message.
      if (status === 403 && url.includes('/tickets')) {
        return Promise.reject(error);
      }

      // For chats endpoints with 403, we still want to show toasts for feature availability errors.
      // Other 403 errors on chats endpoints are handled gracefully without toasts.
      if (status === 403 && url.includes('/chats')) {
        const errorMessage = (error.response?.data as any)?.message || error.message || '';
        // Only skip toast if it's NOT a chat feature availability error
        // Feature availability errors should show the toast
        if (!errorMessage.includes('Chat feature is not available')) {
          return Promise.reject(error);
        }
        // If it is a feature availability error, continue to show the toast below
      }

      // Skip showing toasts for expected 404s (endpoints that don't exist yet)
      // Announcements endpoint doesn't exist yet, so 404 is expected
      if (status === 404 && url.includes('/announcements')) {
        return Promise.reject(error);
      }

      // Skip showing toasts for expected 403s from boards endpoints
      // These occur when user doesn't have access to boards app (handled gracefully in UI)
      if (status === 403 && (url.includes('/boards/projects') || url.includes('/boards/tasks') || url.includes('/boards/epics') || url.includes('/boards/analytics'))) {
        return Promise.reject(error);
      }

      // Skip showing toasts for 403 errors from dashboard/stats endpoints
      // These are expected when users don't have permission to view certain data
      if (status === 403 && (url.includes('/organizations/me/stats') || url.includes('/users') || url.includes('/audit-logs'))) {
        return Promise.reject(error);
      }

      // Skip showing toasts for expected 400s from boards endpoints
      // These are handled gracefully in the UI components
      if (status === 400 && url.includes('/boards/tasks')) {
        return Promise.reject(error);
      }

      // Skip showing toasts for theme-related 404s (endpoint might not support theme updates yet)
      if (status === 404 && (url.includes('/organizations/me') || url.includes('/organizations'))) {
        return Promise.reject(error);
      }

      // Skip showing toasts for announcements endpoint 404s (endpoint doesn't exist yet - expected)
      if (status === 404 && url.includes('/announcements/active')) {
        return Promise.reject(error);
      }

      // Skip showing toasts for chats endpoint 403s (user might not have chat access - handled gracefully)
      if (status === 403 && url.includes('/chats')) {
        return Promise.reject(error);
      }

      // Skip showing toasts for 403 errors from role-templates if user doesn't have permission
      // These are handled gracefully in the UI components (query returns empty array)
      if (status === 403 && url.includes('/role-templates') && !url.includes('/create-role')) {
        return Promise.reject(error);
      }

      // Skip showing toasts for app access endpoints - they handle their own errors in the component
      // But only skip if it's a 400/403/404 - let 500s and other errors show the default toast
      if ((url.includes('/apps/') && (url.includes('/access/grant') || url.includes('/access/revoke'))) &&
        (status === 400 || status === 403 || status === 404)) {
        return Promise.reject(error);
      }

      // For 400 errors from app access, don't show generic "server error" - let component handle it
      if (status === 400 && url.includes('/apps/') && (url.includes('/access/grant') || url.includes('/access/revoke'))) {
        return Promise.reject(error);
      }

      let errorMessage = (error.response?.data as any)?.message || error.message || 'An error occurred';

      // Handle axios default error messages like "Request failed with status code 401"
      if (errorMessage.includes('Request failed with status code')) {
        const statusMatch = errorMessage.match(/status code (\d+)/i);
        const statusCode = statusMatch ? parseInt(statusMatch[1], 10) : null;

        // If we have a status code, provide user-friendly message
        if (statusCode === 401) {
          errorMessage = 'Your session has expired. Please log in again.';
        } else if (statusCode === 403) {
          errorMessage = 'You do not have permission to perform this action.';
        } else if (statusCode === 404) {
          errorMessage = 'The requested resource was not found.';
        } else if (statusCode === 409) {
          errorMessage = 'This information is already in use. Please use a different value.';
        } else if (statusCode === 400) {
          errorMessage = 'Invalid request. Please check your input and try again.';
        } else if (statusCode === 422) {
          errorMessage = 'Validation error. Please check your input and try again.';
        } else if (statusCode === 500 || (statusCode && statusCode >= 500)) {
          errorMessage = 'A server error occurred. Please try again later or contact support if the problem persists.';
        } else if (statusCode) {
          errorMessage = 'An error occurred. Please try again.';
        }
      }

      // Convert technical error messages to user-friendly ones
      // First, remove any technical error codes from the message
      let cleanErrorMessage = errorMessage.replace(/\b(40[0-9]|500|50[0-9])\b/g, '').trim();
      cleanErrorMessage = cleanErrorMessage.replace(/Request failed with status code\s*\d*/gi, '').trim();
      cleanErrorMessage = cleanErrorMessage.replace(/\b(HTTP|Status|Error Code|Status Code)\s*:?\s*/gi, '').trim();
      cleanErrorMessage = cleanErrorMessage || errorMessage; // Fallback to original if cleaning removed everything

      let userFriendlyMessage = cleanErrorMessage;

      // Role hierarchy errors
      if (cleanErrorMessage.includes('cannot view users with the same or higher role level') ||
        cleanErrorMessage.includes('cannot view users with higher role level') ||
        cleanErrorMessage.includes('You cannot view users with the same or higher role level')) {
        userFriendlyMessage = 'You do not have permission to view this user. You can only view users with lower roles than yours.';
      } else if (cleanErrorMessage.includes('Organization Owner cannot be edited') ||
        cleanErrorMessage.includes('Organization Owner cannot be edited by any other user')) {
        userFriendlyMessage = 'Organization owners can only edit their own profile. You cannot edit another organization owner\'s profile.';
      } else if (cleanErrorMessage.includes('cannot edit users with the same or higher role level') ||
        cleanErrorMessage.includes('cannot edit users with higher role level')) {
        userFriendlyMessage = 'You do not have permission to edit this user. You can only edit users with lower roles than yours.';
      } else if (cleanErrorMessage.includes('cannot revoke access') ||
        cleanErrorMessage.includes('cannot revoke access for users')) {
        userFriendlyMessage = 'You do not have permission to revoke this user\'s access. You can only revoke access for users with lower roles than yours.';
      } else if (cleanErrorMessage.includes('cannot assign roles that are equal to or higher than your own role level') ||
        cleanErrorMessage.includes('cannot assign roles') ||
        cleanErrorMessage.includes('You can only assign roles with hierarchy level greater than')) {
        // Extract role level information if available
        const levelMatch = cleanErrorMessage.match(/Your role level is (\d+), and the selected role level is (\d+)/);
        if (levelMatch) {
          userFriendlyMessage = `You cannot assign this role. Your role level is ${levelMatch[1]}, and the selected role level is ${levelMatch[2]}. You can only assign roles with hierarchy level greater than ${levelMatch[1]}.`;
        } else {
          userFriendlyMessage = 'You cannot assign this role. You can only assign roles with lower authority than your own role.';
        }
      } else if (cleanErrorMessage.includes('Chat feature is not available')) {
        userFriendlyMessage = cleanErrorMessage; // Already user-friendly
      } else if (cleanErrorMessage.includes('do not have permission') ||
        cleanErrorMessage.includes('Insufficient permissions')) {
        userFriendlyMessage = cleanErrorMessage; // Already user-friendly
      } else if (cleanErrorMessage.includes('not found') || cleanErrorMessage.includes('does not exist')) {
        userFriendlyMessage = 'The requested resource was not found.';
      } else if (cleanErrorMessage.includes('already exists') || cleanErrorMessage.includes('already taken')) {
        userFriendlyMessage = cleanErrorMessage || 'This resource already exists. Please use a different value.';
      } else if (status === 403) {
        // If backend sent a very technical message (e.g. "Forbidden", "403 Forbidden"),
        // replace it with a clean, user-friendly text.
        const technical403 =
          /forbidden/i.test(cleanErrorMessage) ||
          /http/i.test(cleanErrorMessage) ||
          /status code/i.test(cleanErrorMessage);

        if (technical403 || !cleanErrorMessage) {
          userFriendlyMessage = 'You do not have permission to perform this action.';
        } else {
          userFriendlyMessage = cleanErrorMessage;
        }
      } else if (status === 404) {
        userFriendlyMessage = 'The requested resource was not found.';
      } else if (status === 400) {
        userFriendlyMessage = cleanErrorMessage || 'Invalid request. Please check your input and try again.';
      } else if (status === 409) {
        // Conflict errors - provide specific messages based on context
        if (cleanErrorMessage.includes('Organization name already exists') ||
          cleanErrorMessage.includes('Organization name is already taken')) {
          userFriendlyMessage = 'This organization name is already taken. Please choose a different name.';
        } else if (cleanErrorMessage.includes('organization email') ||
          cleanErrorMessage.includes('email address is already used as an organization email')) {
          userFriendlyMessage = 'This email address is already registered as an organization email. Please use a different email address.';
        } else if (cleanErrorMessage.includes('User with this email already exists') ||
          cleanErrorMessage.includes('Email already exists')) {
          userFriendlyMessage = 'An account with this email address already exists. Please use a different email or sign in if you already have an account.';
        } else if (cleanErrorMessage.includes('already have an organization')) {
          userFriendlyMessage = cleanErrorMessage || 'You already have an organization with this information.';
        } else if (cleanErrorMessage.includes('already exists') || cleanErrorMessage.includes('already taken')) {
          userFriendlyMessage = cleanErrorMessage || 'This information is already in use. Please use a different value.';
        } else if (cleanErrorMessage) {
          userFriendlyMessage = cleanErrorMessage;
        } else {
          userFriendlyMessage = 'This information is already in use. Please use a different value.';
        }
      } else if (status === 422) {
        userFriendlyMessage = cleanErrorMessage || 'Validation error. Please check your input and try again.';
      } else if (status === 500) {
        userFriendlyMessage = 'A server error occurred. Please try again later or contact support if the problem persists.';
      } else if (status >= 500) {
        userFriendlyMessage = 'A server error occurred. Please try again later or contact support if the problem persists.';
      }

      // Show toast notification
      toast.error(userFriendlyMessage, { duration: 5000 });
    }

    return Promise.reject(error);
  },
);

export default api;

