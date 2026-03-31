# syntax=docker/dockerfile:1
# ─── Stage 1: Dependencies ────────────────────────────────────────────────────
# Используем официальный образ oven/bun — bun уже встроен, npm install не нужен
FROM oven/bun:1.2-alpine AS deps
WORKDIR /app

# Копируем только файлы зависимостей — чтобы слой кешировался при неизменённом lockfile
COPY package.json bun.lockb* ./

# BuildKit cache-mount: пакеты кешируются между сборками на этой машине.
# После первой сборки с интернетом — повторные сборки работают полностью офлайн.
RUN --mount=type=cache,target=/root/.bun/install/cache,id=bun-cache \
    bun install --frozen-lockfile


# ─── Stage 2: Builder ────────────────────────────────────────────────────────
FROM oven/bun:1.2-alpine AS builder
WORKDIR /app

# Копируем установленные пакеты из deps-стейджа
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build args — вшиваются в бандл на этапе сборки (не runtime!)
ARG NEXT_PUBLIC_API_URL=http://localhost:8000
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NODE_ENV=production
# Отключаем телеметрию Next.js — не нужен исходящий трафик
ENV NEXT_TELEMETRY_DISABLED=1

# BuildKit cache-mount для .next/cache — инкрементальная пересборка без интернета
RUN --mount=type=cache,target=/app/.next/cache,id=nextjs-build-cache \
    bun run build


# ─── Stage 3: Runner ─────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME="0.0.0.0" \
    NEXT_TELEMETRY_DISABLED=1

# Non-root user для безопасности
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Standalone-сборка содержит только то, что нужно для запуска
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD wget -q --spider http://localhost:3000/ || exit 1

CMD ["node", "server.js"]
