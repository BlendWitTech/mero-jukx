# Multi-stage build for NestJS backend
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy package files from root and api
COPY package*.json ./
RUN npm install --omit=dev && npm cache clean --force

# Build stage
FROM base AS builder
WORKDIR /app

COPY package*.json ./
RUN npm install

# Copy source from api and shared
COPY api/ ./api/
COPY shared/ ./shared/

WORKDIR /app/api
RUN npm run build

# Production stage
FROM base AS runner
WORKDIR /app/api

ENV NODE_ENV=production

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
  adduser --system --uid 1001 nestjs

# Copy built application
COPY --from=builder --chown=nestjs:nodejs /app/api/dist ./dist
COPY --from=deps --chown=nestjs:nodejs /app/node_modules ../node_modules
COPY --chown=nestjs:nodejs api/package*.json ./

USER nestjs

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

CMD ["node", "dist/src/main.js"]

