# syntax=docker/dockerfile:1
FROM python:3.12-slim-bookworm AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=0 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# Системные зависимости — отдельный слой, кешируется надолго
RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt,sharing=locked \
    apt-get update && apt-get install -y --no-install-recommends \
        libpq-dev \
        gcc \
        curl \
    && rm -rf /var/lib/apt/lists/*


# ── Dependencies stage ──────────────────────────────────────────────────────
FROM base AS deps

COPY requirements.txt .

# BuildKit cache-mount для pip.
# После первой сборки с интернетом все пакеты кешируются на диске хоста.
# Повторные сборки (и пересборки с нуля) работают офлайн из кеша.
RUN --mount=type=cache,target=/root/.cache/pip,id=pip-cache \
    pip install -r requirements.txt


# ── Production stage ─────────────────────────────────────────────────────────
FROM base AS runner

# Non-root user
RUN groupadd --gid 1001 appgroup && \
    useradd --uid 1001 --gid appgroup --shell /bin/bash --create-home appuser

# Копируем установленные пакеты из deps-стейджа (без кеша pip в финальном образе)
COPY --from=deps /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY --from=deps /usr/local/bin /usr/local/bin

COPY --chown=appuser:appgroup . .

USER appuser

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
