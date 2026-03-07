# Multi-stage build for React frontend
FROM node:20-alpine AS base

# Install dependencies
FROM base AS deps
WORKDIR /app/app

COPY app/package*.json ./
RUN npm install

# Build stage
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/app/node_modules ./app/node_modules
# Copy app and shared
COPY app/ ./app/
COPY shared/ ./shared/

ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}

WORKDIR /app/app
# Add the musl rollup package explicitly for alpine if not already present
RUN npm install @rollup/rollup-linux-x64-musl
RUN npm run build

# Production stage with Nginx
FROM nginx:alpine AS runner

# Copy built files
COPY --from=builder /app/app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY app/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

