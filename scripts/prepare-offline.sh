#!/usr/bin/env bash
# =============================================================================
# scripts/prepare-offline.sh
#
# Запустите ОДИН РАЗ при наличии интернета.
# После этого все сборки Docker работают полностью офлайн.
#
# Использование:
#   ./scripts/prepare-offline.sh            # стандартная подготовка
#   ./scripts/prepare-offline.sh --export   # + экспорт образов в tar.gz
#                                           #   для переноса на изолированную машину
# =============================================================================
set -euo pipefail

# ── Цвета ─────────────────────────────────────────────────────────────────────
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

info()  { echo -e "${GREEN}[ZGT]${NC} $*"; }
warn()  { echo -e "${YELLOW}[ZGT]${NC} $*"; }
error() { echo -e "${RED}[ZGT]${NC} $*"; }
step()  { echo -e "\n${BLUE}━━━${NC} $* ${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"; }

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_DIR"

EXPORT_MODE="${1:-}"

# ── Проверки ──────────────────────────────────────────────────────────────────
step "Проверка зависимостей"

command -v docker &>/dev/null || { error "Docker не установлен"; exit 1; }
docker info &>/dev/null       || { error "Docker daemon не запущен. Запустите: sudo systemctl start docker"; exit 1; }

# Проверяем BuildKit (нужен Docker 20.10+)
DOCKER_VER=$(docker version --format '{{.Server.Version}}' 2>/dev/null || echo "0.0.0")
info "Docker версия: $DOCKER_VER"

if [[ ! -f "$PROJECT_DIR/.env" ]]; then
    warn ".env не найден — копируем из .env.example"
    cp "$PROJECT_DIR/.env.example" "$PROJECT_DIR/.env"
    warn "Заполните $PROJECT_DIR/.env перед запуском проекта!"
fi

# ── Загрузка базовых образов ──────────────────────────────────────────────────
step "Загрузка базовых Docker-образов"

IMAGES=(
    "python:3.12-slim"
    "postgres:16-alpine"
    "node:20-alpine"
    "oven/bun:1.2-alpine"
)

for img in "${IMAGES[@]}"; do
    info "Pulling $img ..."
    docker pull "$img"
done

# ── Первая сборка (прогрев BuildKit кеша) ─────────────────────────────────────
step "Первая сборка проекта (прогрев кеша pip и bun)"

info "Это займёт 5-15 минут в зависимости от скорости интернета."
info "После этого все повторные сборки будут работать ОФЛАЙН."

DOCKER_BUILDKIT=1 COMPOSE_DOCKER_CLI_BUILD=1 docker compose build

# ── Прогрев кеша миграций ─────────────────────────────────────────────────────
step "Проверка конфигурации"
docker compose config --quiet && info "docker-compose.yml валиден ✓"

# ── Экспорт для полностью изолированной среды ─────────────────────────────────
if [[ "$EXPORT_MODE" == "--export" ]]; then
    step "Экспорт образов для air-gapped машины"

    EXPORT_DIR="$PROJECT_DIR/offline-images"
    mkdir -p "$EXPORT_DIR"

    info "Экспортируем базовые образы → base-images.tar.gz"
    docker save "${IMAGES[@]}" | gzip > "$EXPORT_DIR/base-images.tar.gz"

    # Получаем имена собранных образов
    PROJECT_NAME=$(basename "$PROJECT_DIR" | tr '[:upper:]' '[:lower:]')
    APP_IMAGES=(
        "${PROJECT_NAME}-backend"
        "${PROJECT_NAME}-frontend"
    )

    info "Экспортируем образы приложения → app-images.tar.gz"
    FOUND_IMAGES=()
    for img in "${APP_IMAGES[@]}"; do
        if docker image inspect "$img" &>/dev/null; then
            FOUND_IMAGES+=("$img")
        else
            warn "Образ $img не найден, пропускаем"
        fi
    done

    if [[ ${#FOUND_IMAGES[@]} -gt 0 ]]; then
        docker save "${FOUND_IMAGES[@]}" | gzip > "$EXPORT_DIR/app-images.tar.gz"
    fi

    cat > "$EXPORT_DIR/load-images.sh" << 'LOAD_SCRIPT'
#!/usr/bin/env bash
# Запустите на изолированной машине для загрузки образов
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "Загружаем базовые образы..."
docker load < "$SCRIPT_DIR/base-images.tar.gz"

if [[ -f "$SCRIPT_DIR/app-images.tar.gz" ]]; then
    echo "Загружаем образы приложения..."
    docker load < "$SCRIPT_DIR/app-images.tar.gz"
fi

echo "✅ Все образы загружены. Теперь можно запустить: docker compose up -d"
LOAD_SCRIPT
    chmod +x "$EXPORT_DIR/load-images.sh"

    info "Экспорт завершён. Файлы в: $EXPORT_DIR/"
    ls -lh "$EXPORT_DIR/"
fi

# ── Итог ──────────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  ✅  Подготовка к офлайн-работе завершена!       ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════╝${NC}"
echo ""
info "Теперь вы можете:"
echo "  make up         — запустить проект"
echo "  make build      — пересобрать образы (офлайн)"
echo "  make logs       — посмотреть логи"
echo ""
info "BuildKit кеш pip и bun сохранён. При пересборке интернет не нужен."
