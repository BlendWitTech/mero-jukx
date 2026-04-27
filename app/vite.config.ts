import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// Force single React instance paths (prevents "invalid hook call" in monorepo)
const appDir = path.resolve(__dirname);

// https://vitejs.dev/config/
export default defineConfig({
  root: __dirname, // Ensure Vite uses frontend as root
  plugins: [react()],
  resolve: {
    alias: {
      // *** CRITICAL: Force single React instance - prevents invalid hook call in monorepo ***
      // All modules (including @ui and shared/) must use the same React from app/node_modules
      'react': path.resolve(appDir, 'node_modules/react'),
      'react-dom': path.resolve(appDir, 'node_modules/react-dom'),
      'react/jsx-runtime': path.resolve(appDir, 'node_modules/react/jsx-runtime'),
      'react/jsx-dev-runtime': path.resolve(appDir, 'node_modules/react/jsx-dev-runtime'),
      'react-dom/client': path.resolve(appDir, 'node_modules/react-dom/client'),
      // App aliases
      '@': path.resolve(__dirname, './src'),
      '@shared/frontend': path.resolve(__dirname, '../shared/frontend'),
      '@shared': path.resolve(__dirname, '../shared/frontend'),
      '@apps': path.resolve(__dirname, './marketplace/shared'),
      '@crm': path.resolve(__dirname, './marketplace/organization/mero-crm/src'),
      '@inventory': path.resolve(__dirname, './marketplace/organization/mero-inventory'),
      '@accounting': path.resolve(__dirname, './marketplace/organization/mero-accounting'),
      '@khata': path.resolve(__dirname, './marketplace/organization/mero-khata'),
      '@hr': path.resolve(__dirname, './marketplace/organization/mero-hr'),
      '@cms': path.resolve(__dirname, './marketplace/organization/mero-cms'),
      '@creator': path.resolve(__dirname, './marketplace/creator/portal'),
      '@frontend': path.resolve(__dirname, './src'),
      '@ui': path.resolve(__dirname, '../packages/ui/src'),
    },
    // Dedupe ensures npm deduplication in case any nested node_modules still has react
    dedupe: ['react', 'react-dom', 'react-router-dom', 'lucide-react', 'react-calendar', 'zustand', 'axios', '@tanstack/react-query', 'react-hook-form', 'zod'],
  },
  server: {
    host: '0.0.0.0',
    port: 3001,
    strictPort: true,
    // Prevent browser from caching stale dev chunks
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
    hmr: {
      host: '127.0.0.1',
      clientPort: 3001,
    },

    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
        secure: false,
        ws: true,
        timeout: 30000,
        proxyTimeout: 30000,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, res) => {
            if (res && 'writeHead' in res && typeof res.writeHead === 'function') {
              res.writeHead(502, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ message: 'API server unavailable', detail: err.message }));
            }
          });
        },
      },
      '/socket.io': {
        target: 'http://127.0.0.1:3000',
        ws: true,
        changeOrigin: true,
      },
    },
    fs: {
      allow: [
        path.resolve(__dirname),
        path.resolve(__dirname, '../shared'),
        path.resolve(__dirname, '../packages'),
      ],
    },
  },
  build: {
    // Enable code splitting
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks
          'react-vendor': ['react', 'react-dom', 'react-router-dom', 'zustand', '@tanstack/react-query'],
          'ui-vendor': ['lucide-react'],
          'form-vendor': ['react-hook-form', '@hookform/resolvers', 'zod'],
          'socket-vendor': ['socket.io-client'],
        },
      },
    },
    // Optimize chunk size
    chunkSizeWarningLimit: 1000,
    // Enable source maps for production debugging
    sourcemap: process.env.NODE_ENV === 'production',
    // Minify
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: process.env.NODE_ENV === 'production',
        drop_debugger: true,
      },
    },
  },
  // Optimize dependencies
  optimizeDeps: {
    force: true, // Always re-bundle deps to prevent stale chunk hash mismatches
    include: [
      'react',
      'react-dom',
      'react/jsx-runtime',
      'react/jsx-dev-runtime',
      'react-router-dom',
      '@tanstack/react-query',
      'axios',
      'zustand',
      'react-calendar',
      'lucide-react',
    ],
  },
});

