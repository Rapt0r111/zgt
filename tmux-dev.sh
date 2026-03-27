#!/usr/bin/env bash
# tmux-dev.sh — запуск окружения разработки в tmux
# Использование: ./tmux-dev.sh [start|stop|attach|logs]
set -euo pipefail

SESSION="zgt"
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ─── Цвета ───────────────────────────────────────────────────────────────────
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

info()    { echo -e "${GREEN}[ZGT]${NC} $*"; }
warn()    { echo -e "${YELLOW}[ZGT]${NC} $*"; }
error()   { echo -e "${RED}[ZGT]${NC} $*"; }

# ─── Проверки ────────────────────────────────────────────────────────────────
check_deps() {
    local missing=()
    for cmd in tmux docker; do
        command -v "$cmd" &>/dev/null || missing+=("$cmd")
    done
    if [[ ${#missing[@]} -gt 0 ]]; then
        error "Не установлены: ${missing[*]}"
        exit 1
    fi
    if [[ ! -f "$PROJECT_DIR/.env" ]]; then
        warn ".env не найден, копируем из .env.example"
        cp "$PROJECT_DIR/.env.example" "$PROJECT_DIR/.env"
        error "Заполните $PROJECT_DIR/.env и запустите снова"
        exit 1
    fi
}

# ─── Команды ─────────────────────────────────────────────────────────────────
cmd_start() {
    check_deps

    if tmux has-session -t "$SESSION" 2>/dev/null; then
        warn "Сессия '$SESSION' уже запущена. Подключаемся..."
        tmux attach -t "$SESSION"
        return
    fi

    info "Создаём tmux сессию '$SESSION'..."

    # Создаём сессию (window 0 = docker compose logs)
    tmux new-session -d -s "$SESSION" -n "compose" -x 220 -y 50

    # Window 0: Запуск + логи docker compose
    tmux send-keys -t "$SESSION:compose" \
        "cd '$PROJECT_DIR' && echo '=== ZGT Docker ===' && docker compose up -d && docker compose logs -f --tail=100" Enter

    # Window 1: Бэкенд логи отдельно
    tmux new-window -t "$SESSION" -n "backend"
    tmux send-keys -t "$SESSION:backend" \
        "sleep 5 && docker compose logs -f backend" Enter

    # Window 2: Фронтенд логи
    tmux new-window -t "$SESSION" -n "frontend"
    tmux send-keys -t "$SESSION:frontend" \
        "sleep 5 && docker compose logs -f frontend" Enter

    # Window 3: Postgres логи
    tmux new-window -t "$SESSION" -n "db"
    tmux send-keys -t "$SESSION:db" \
        "sleep 3 && docker compose logs -f db" Enter

    # Window 4: Шелл (для команд)
    tmux new-window -t "$SESSION" -n "shell"
    tmux send-keys -t "$SESSION:shell" "cd '$PROJECT_DIR'" Enter
    tmux send-keys -t "$SESSION:shell" \
        "echo 'Команды: docker compose ps | docker compose restart backend | docker compose exec backend python -m app.cli create-admin'" Enter

    # Фокус на 0 окне
    tmux select-window -t "$SESSION:compose"

    info "Сессия создана! Подключаемся..."
    sleep 1
    tmux attach -t "$SESSION"
}

cmd_stop() {
    info "Останавливаем контейнеры..."
    cd "$PROJECT_DIR" && docker compose down
    if tmux has-session -t "$SESSION" 2>/dev/null; then
        tmux kill-session -t "$SESSION"
        info "Tmux сессия '$SESSION' закрыта"
    fi
}

cmd_attach() {
    if tmux has-session -t "$SESSION" 2>/dev/null; then
        tmux attach -t "$SESSION"
    else
        error "Сессия '$SESSION' не найдена. Запустите: $0 start"
        exit 1
    fi
}

cmd_logs() {
    cd "$PROJECT_DIR"
    docker compose logs -f --tail=200
}

cmd_status() {
    cd "$PROJECT_DIR"
    echo ""
    info "=== Статус контейнеров ==="
    docker compose ps
    echo ""
    info "=== Здоровье сервисов ==="
    for svc in backend frontend; do
        local url
        [[ "$svc" == "backend" ]] && url="http://localhost:8000/health" || url="http://localhost:3000/"
        if curl -sf "$url" &>/dev/null; then
            echo -e "  ${GREEN}✓${NC} $svc — OK ($url)"
        else
            echo -e "  ${RED}✗${NC} $svc — НЕДОСТУПЕН ($url)"
        fi
    done
    echo ""
}

# ─── Точка входа ─────────────────────────────────────────────────────────────
case "${1:-start}" in
    start)   cmd_start   ;;
    stop)    cmd_stop    ;;
    attach)  cmd_attach  ;;
    logs)    cmd_logs    ;;
    status)  cmd_status  ;;
    *)
        echo "Использование: $0 {start|stop|attach|logs|status}"
        exit 1
        ;;
esac
