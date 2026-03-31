# syntax=docker/dockerfile:1
# ─── Stage 1: Dependencies ────────────────────────────────────────────────────
FROM oven/bun:1.2-alpine AS deps
WORKDIR /app

# Копируем оба возможных формата lockfile (bun.lockb = legacy, bun.lock = Bun 1.2+)
COPY package.json bun.lockb* bun.lock* ./

RUN --mount=type=cache,target=/root/.bun/install/cache,id=bun-cache \
    bun install --frozen-lockfile


# ─── Stage 2: Builder ────────────────────────────────────────────────────────
FROM oven/bun:1.2-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ARG NEXT_PUBLIC_API_URL=http://localhost:38801
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN --mount=type=cache,target=/app/.next/cache,id=nextjs-build-cache \
    bun run build


# ─── Stage 3: Runner ─────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME="0.0.0.0" \
    NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs

EXPOSE 3000

# Используем wget (встроен в alpine), не curl
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD wget -q --spider http://localhost:3000/ || exit 1

CMD ["node", "server.js"]