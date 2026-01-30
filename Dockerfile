# Use Node.js 22 slim to align with lockfile resolution and engine ranges
FROM node:22-slim AS base

# Install dependencies only when needed
FROM base AS deps
RUN apt-get update && apt-get install -y --no-install-recommends \
        ca-certificates openssl && rm -rf /var/lib/apt/lists/*
RUN npm install -g npm@11.6.4
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json package-lock.json* ./
RUN npm ci --legacy-peer-deps && npx puppeteer browsers install chrome

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app

# Receive build args
ARG DATABASE_URL
ENV DATABASE_URL=$DATABASE_URL

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build the application
RUN npm run build

# Production image (non-standalone), copy and run Next.js server
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PUPPETEER_CACHE_DIR=/app/.puppeteer

RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs
RUN apt-get update && apt-get install -y --no-install-recommends \
        ca-certificates openssl bash curl rclone postgresql-client \
        libnss3 libnspr4 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 \
        libxkbcommon0 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 \
        libgbm1 libpango-1.0-0 libcairo2 libasound2 libatspi2.0-0 \
        libxshmfence1 fonts-liberation libappindicator3-1 && \
        rm -rf /var/lib/apt/lists/*

COPY --from=deps /root/.cache/puppeteer /app/.puppeteer
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json
COPY --from=builder --chown=nextjs:nodejs /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/scripts ./scripts

# Create data and uploads directories with correct permissions
RUN mkdir -p /app/data /app/uploads /app/uploads/certificates /app/uploads/recordings /app/backups && \
    chown -R nextjs:nodejs /app/data /app/uploads /app/backups /app/.puppeteer

RUN chmod +x ./scripts/docker-entrypoint.sh

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME=0.0.0.0

ENTRYPOINT ["/bin/bash", "./scripts/docker-entrypoint.sh"]
