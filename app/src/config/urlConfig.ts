/**
 * URL Configuration for Mero Jugx
 * Handles base URLs, API URLs, and app-specific subdomain routing
 */

import { useAuthStore } from '../store/authStore';

/**
 * Get the current environment (development, staging, production)
 */
export function getEnvironment(): 'development' | 'staging' | 'production' {
  const hostname = window.location.hostname;
  
  // Check for local development first (localhost, 127.0.0.1, or IP addresses)
  if (hostname.includes('localhost') || hostname.includes('127.0.0.1') || /^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
    return 'development';
  }
  
  // Check for dev.merojugx.com (local dev with custom domain)
  if (hostname === 'dev.merojugx.com' || hostname.endsWith('.dev.merojugx.com')) {
    return 'development';
  }
  
  // Check for staging environment
  if (hostname.includes('staging.') && !hostname.includes('dev.')) {
    return 'staging';
  }
  
  return 'production';
}

/**
 * Get the main domain base URL (without subdomain)
 */
export function getMainDomainUrl(): string {
  const protocol = window.location.protocol;
  const hostname = window.location.hostname;
  const port = window.location.port;
  
  const env = getEnvironment();
  
  // Remove app subdomain if present
  let mainHostname = hostname;
  if (hostname.includes('.dev.merojugx.com')) {
    mainHostname = 'dev.merojugx.com';
  } else if (hostname.includes('.merojugx.com') && !hostname.startsWith('www.') && !hostname.startsWith('dev.')) {
    // Extract main domain (e.g., appname.merojugx.com -> merojugx.com)
    const parts = hostname.split('.');
    if (parts.length > 2) {
      mainHostname = parts.slice(-2).join('.'); // Get last two parts (merojugx.com)
    }
  }
  
  // Build URL
  let url = `${protocol}//${mainHostname}`;
  // Include port for development (localhost, IPs, or dev.merojugx.com domains)
  if (port && (env === 'development' || hostname.includes('localhost') || hostname.includes('127.0.0.1') || /^\d+\.\d+\.\d+\.\d+$/.test(hostname) || hostname.includes('dev.merojugx.com'))) {
    url += `:${port}`;
  }
  
  return url;
}

/**
 * Get API base URL
 * Uses VITE_API_URL if set, otherwise constructs from current domain
 */
export function getApiBaseUrl(): string {
  const viteApiUrl = import.meta.env.VITE_API_URL;
  
  if (viteApiUrl) {
    // If VITE_API_URL is set, use it (should include /api/v1)
    return viteApiUrl.endsWith('/') ? viteApiUrl.slice(0, -1) : viteApiUrl;
  }
  
  // Otherwise, construct from main domain
  const mainDomain = getMainDomainUrl();
  return `${mainDomain}/api/v1`;
}

/**
 * Get frontend base URL
 */
export function getFrontendBaseUrl(): string {
  return getMainDomainUrl();
}

/**
 * Check if current URL is an app-specific subdomain
 */
export function isAppSubdomain(): boolean {
  const hostname = window.location.hostname;
  
  // Check for appname.dev.merojugx.com pattern
  if (hostname.match(/^[^.]+\.dev\.merojugx\.com$/)) {
    return true;
  }
  
  // Check for appname.merojugx.com pattern (production, excluding www and dev)
  if (hostname.match(/^[^.]+\.merojugx\.com$/) && 
      !hostname.startsWith('www.') && 
      !hostname.startsWith('dev.')) {
    return true;
  }
  
  // Check for production domain pattern (appname.domainname.com)
  // Exclude common prefixes like www, dev, api, etc.
  const excludedPrefixes = ['www', 'dev', 'api', 'admin', 'app', 'apps', 'merojugx'];
  // Exclude deployment platform base domains — these are not user-owned custom domains
  const platformDomains = ['vercel.app', 'railway.app', 'netlify.app', 'herokuapp.com', 'pages.dev', 'onrender.com'];
  const parts = hostname.split('.');
  const baseDomain = parts.slice(-2).join('.');
  if (parts.length >= 3 && !platformDomains.includes(baseDomain)) {
    const subdomain = parts[0];
    if (!excludedPrefixes.includes(subdomain.toLowerCase())) {
      return true;
    }
  }

  return false;
}

/**
 * Get app name (slug) from subdomain
 */
export function getAppNameFromSubdomain(): string | null {
  const hostname = window.location.hostname;
  
  // Match appname.dev.merojugx.com
  const devMatch = hostname.match(/^([^.]+)\.dev\.merojugx\.com$/);
  if (devMatch) {
    return devMatch[1];
  }
  
  // Match appname.merojugx.com (production)
  const prodMatch = hostname.match(/^([^.]+)\.merojugx\.com$/);
  if (prodMatch && prodMatch[1] !== 'www' && prodMatch[1] !== 'dev') {
    return prodMatch[1];
  }
  
  // Match production domain pattern (appname.domainname.com)
  const excludedPrefixes = ['www', 'dev', 'api', 'admin', 'app', 'apps', 'merojugx'];
  const platformDomains = ['vercel.app', 'railway.app', 'netlify.app', 'herokuapp.com', 'pages.dev', 'onrender.com'];
  const parts = hostname.split('.');
  const baseDomain = parts.slice(-2).join('.');
  if (parts.length >= 3 && !platformDomains.includes(baseDomain)) {
    const subdomain = parts[0].toLowerCase();
    if (!excludedPrefixes.includes(subdomain)) {
      return subdomain;
    }
  }

  return null;
}

/**
 * Get the production domain name (without subdomain)
 * In production: returns the actual domain (e.g., domainname.com)
 * In development: returns dev.merojugx.com or localhost
 */
export function getProductionDomain(): string {
  const env = getEnvironment();
  const currentHostname = window.location.hostname;
  
  if (env === 'production') {
    // Extract main domain from current hostname
    // If on app subdomain, extract base domain (e.g., app.domainname.com -> domainname.com)
    const parts = currentHostname.split('.');
    if (parts.length > 2) {
      // Get last two parts (domainname.com)
      return parts.slice(-2).join('.');
    }
    return currentHostname;
  }
  
  // For development, return dev.merojugx.com
  if (currentHostname.includes('dev.merojugx.com')) {
    return 'dev.merojugx.com';
  }
  
  return currentHostname;
}

/**
 * Build app-specific subdomain URL
 * In development:
 * - If using localhost: uses localhost:3001/org/{orgSlug}/app/{appSlug}/path
 * - If using dev.merojugx.com: uses app-slug.dev.merojugx.com:3001/path
 * In production: uses app-slug.domainname.com/path
 */
export function buildAppSubdomainUrl(appSlug: string, path: string = '', orgSlug?: string): string {
  const protocol = window.location.protocol;
  const port = window.location.port;
  const env = getEnvironment();
  const currentHostname = window.location.hostname;

  // Check if we're using localhost in development
  const isLocalhost = currentHostname === 'localhost' || currentHostname === '127.0.0.1' || /^\d+\.\d+\.\d+\.\d+$/.test(currentHostname);

  // Check if we're on a deployment platform domain that doesn't support dynamic subdomains
  const platformDomains = ['vercel.app', 'railway.app', 'netlify.app', 'herokuapp.com', 'pages.dev', 'onrender.com'];
  const baseDomain = currentHostname.split('.').slice(-2).join('.');
  const isOnPlatformDomain = platformDomains.includes(baseDomain);

  // Use path-based routing for localhost (dev) or platform domains (vercel.app, etc.)
  if (((env === 'development' && isLocalhost) || isOnPlatformDomain) && orgSlug) {
    let url = `${protocol}//${currentHostname}`;
    if (port) {
      url += `:${port}`;
    }
    const appPath = path || '';
    url += `/org/${orgSlug}/app/${appSlug}${appPath}`;
    return url;
  }

  // For dev.merojugx.com or production custom domain, use subdomain
  let hostname: string;
  if (env === 'development' || env === 'staging') {
    hostname = `${appSlug}.dev.merojugx.com`;
  } else {
    // In production, use the actual domain
    const productionDomain = getProductionDomain();
    hostname = `${appSlug}.${productionDomain}`;
  }

  let url = `${protocol}//${hostname}`;
  // Include port for development
  if (port && (env === 'development' || hostname.includes('dev.merojugx.com'))) {
    url += `:${port}`;
  }

  if (path) {
    url += path.startsWith('/') ? path : `/${path}`;
  }

  return url;
}

/**
 * Redirect to app-specific subdomain if needed
 * This should be called when accessing an app directly
 */
export function redirectToAppSubdomain(appSlug: string, orgSlug: string): void {
  const currentAppName = getAppNameFromSubdomain();
  const { isAuthenticated } = useAuthStore.getState();

  const env = getEnvironment();
  const currentHostname = window.location.hostname;
  const isLocalhost = currentHostname === 'localhost' || currentHostname === '127.0.0.1' || /^\d+\.\d+\.\d+\.\d+$/.test(currentHostname);
  const platformDomains = ['vercel.app', 'railway.app', 'netlify.app', 'herokuapp.com', 'pages.dev', 'onrender.com'];
  const baseDomain = currentHostname.split('.').slice(-2).join('.');
  const usePathRouting = (env === 'development' && isLocalhost) || platformDomains.includes(baseDomain);

  // If already on the correct subdomain/path, just navigate to the app
  if (currentAppName === appSlug) {
    if (usePathRouting) {
      if (typeof window !== 'undefined' && !window.location.pathname.includes(`/org/${orgSlug}/app/${appSlug}`)) {
        window.location.href = `/org/${orgSlug}/app/${appSlug}`;
      }
    } else {
      // For subdomain, navigate to root or dashboard
      if (typeof window !== 'undefined' && window.location.pathname !== '/') {
        window.location.href = '/';
      }
    }
    return;
  }

  // If user is already authenticated, navigate to app (will show lock screen if needed)
  if (isAuthenticated) {
    const appUrl = buildAppSubdomainUrl(appSlug, usePathRouting ? '' : '/', orgSlug);
    window.location.href = appUrl;
    return;
  }

  // If not authenticated, redirect to login with returnUrl
  const returnUrl = encodeURIComponent(buildAppSubdomainUrl(appSlug, '', orgSlug));
  const mainDomainUrl = getMainDomainUrl();

  if (usePathRouting) {
    window.location.href = `${mainDomainUrl}/org/${orgSlug}/app/${appSlug}/login?returnUrl=${returnUrl}`;
  } else {
    const appLoginUrl = buildAppSubdomainUrl(appSlug, '/login', orgSlug);
    window.location.href = appLoginUrl;
  }
}

