import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { initSentry } from './services/sentry';
import { ThemeProvider } from './contexts/ThemeContext';
import { TaskbarProvider } from './contexts/TaskbarContext';
import App from './App';
import ToastProviderWrapper from './components/ToastProviderWrapper';
import './index.css';
// Import logger early to suppress console logs in production
import './utils/logger';

// Suppress browser extension errors and expected API errors (harmless but annoying)
// This runs before logger.ts, so we need to handle it here too
const originalError = console.error;
const originalWarn = console.warn;

console.error = (...args: any[]) => {
  // Convert all arguments to string for pattern matching
  const allArgsStr = args.map(arg => {
    if (typeof arg === 'string') return arg;
    if (typeof arg === 'object' && arg !== null) {
      try {
        return JSON.stringify(arg);
      } catch {
        return String(arg);
      }
    }
    return String(arg);
  }).join(' ').toLowerCase();

  // Check if this is an expected error we should suppress
  if (
    allArgsStr.includes('message channel closed') ||
    allArgsStr.includes('asynchronous response') ||
    allArgsStr.includes('extension context invalidated') ||
    allArgsStr.includes('failed to load resource') ||
    allArgsStr.includes(' 404 ') ||
    allArgsStr.includes(' 403 ') ||
    allArgsStr.includes('(not found)') ||
    allArgsStr.includes('(forbidden)') ||
    allArgsStr.includes('net::err') ||
    allArgsStr.includes('err_connection_refused') ||
    allArgsStr.includes('err_network') ||
    allArgsStr.includes('/announcements/active') ||
    allArgsStr.includes('/chats?limit=') ||
    allArgsStr.includes('announcements/active') ||
    allArgsStr.includes('chats?limit')
  ) {
    // Suppress browser extension communication errors and expected API errors
    return;
  }
  originalError.apply(console, args);
};

console.warn = (...args: any[]) => {
  const message = args[0]?.toString() || '';
  if (
    message.includes('404') ||
    message.includes('403') ||
    message.includes('announcements') ||
    message.includes('chats')
  ) {
    return;
  }
  originalWarn.apply(console, args);
};

// Suppress unhandled promise rejections from browser extensions
window.addEventListener('unhandledrejection', (event) => {
  const message = event.reason?.message || String(event.reason || '');
  if (
    message.includes('message channel closed') ||
    message.includes('asynchronous response') ||
    message.includes('Extension context invalidated')
  ) {
    event.preventDefault();
    return;
  }
});

/**
 * GLOBAL UI ENFORCEMENT: 
 * Strictly disable mouse-wheel value changes on number inputs.
 * This prevents accidental accounting errors from scrolling over focused fields.
 */
document.addEventListener('wheel', (event: WheelEvent) => {
  const target = event.target as HTMLElement;
  if (target && target.tagName === 'INPUT' && (target as HTMLInputElement).type === 'number') {
    // If input is focused, prevent scroll from changing value
    if (document.activeElement === target) {
      event.preventDefault();
    }
  }
}, { passive: false });

// Initialize Sentry before rendering
initSentry();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <ThemeProvider>
          <TaskbarProvider>
            <App />
            <ToastProviderWrapper />
          </TaskbarProvider>
        </ThemeProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
);

