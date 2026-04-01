import { ConfigService } from '@nestjs/config';

/**
 * Shared utility to get allowed origins for CORS configuration.
 * Consistently used by both main.ts (HTTP) and WebSocket gateways.
 */
export const getAllowedOrigins = (configService: ConfigService): (string | RegExp)[] => {
    const nodeEnv = configService.get<string>('NODE_ENV', 'development');
    const frontendUrl = configService.get<string>('FRONTEND_URL', 'http://localhost:3001');

    if (nodeEnv === 'development') {
        return [
            'http://localhost:3001',
            'http://127.0.0.1:3001',
            'http://dev.merojugx.com:3001',
            'http://mero-crm.dev.merojugx.com:3001',
            /^http:\/\/.*\.dev\.merojugx\.com(:\d+)?$/, // Allow all subdomains on any port
            /^http:\/\/(\d+\.){3}\d+(:\d+)?$/, // Allow IP addresses on any port
        ];
    }

    // Support comma-separated list of allowed origins via CORS_ORIGINS env var
    const corsOrigins = configService.get<string>('CORS_ORIGINS', '');
    const extraOrigins = corsOrigins
        ? corsOrigins.split(',').map((o) => o.trim()).filter(Boolean)
        : [];

    return [
        frontendUrl,
        ...extraOrigins,
        // Allow all Vercel preview deployments for this project
        /^https:\/\/mero-jukx(-[a-z0-9]+)*\.vercel\.app$/,
        /^https:\/\/mero-jukx-.*-blendwit-techs-projects\.vercel\.app$/,
    ];
};
