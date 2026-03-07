import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
            '@shared': path.resolve(__dirname, '../../../../shared/frontend'),
            '@frontend': path.resolve(__dirname, '../../../src'),
        },
    },
    server: {
        port: 3004,
        host: '0.0.0.0',
        allowedHosts: ['.dev.merojugx.com', 'dev.merojugx.com'],
        proxy: {
            '/api': {
                target: 'http://localhost:3005',
                changeOrigin: true,
                secure: false,
            },
        },
    },
});
