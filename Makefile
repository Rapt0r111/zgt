# =============================================================================
# ZGT — Makefile
# Все операции с проектом через make
# =============================================================================

# BuildKit обязателен для кеш-маунтов (--mount=type=cache)
export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1

.DEFAULT_GOAL := help

.PHONY: help prepare prepare-export build up down restart logs \
        status shell-backend shell-db migrate admin backup \
        clean clean-cache clean-all

# ── Справка ───────────────────────────────────────────────────────────────────
help:
	@echo ""
	@echo "  ZGT — Команды управления проектом"
	@echo ""
	@echo "  Первый запуск:"
	@echo "    make prepare        — Скачать образы и прогреть кеш (нужен интернет, 1 раз)"
	@echo ""
	@echo "  Ежедневная работа:"
	@echo "    make build          — Пересобрать образы (офлайн после prepare)"
	@echo "    make up             — Запустить все сервисы"
	@echo "    make down           — Остановить все сервисы"
	@echo "    make restart        — Перезапустить все сервисы"
	@echo "    make logs           — Логи всех сервисов"
	@echo "    make status         — Статус контейнеров"
	@echo ""
	@echo "  Администрирование:"
	@echo "    make admin          — Создать администратора"
	@echo "    make migrate        — Применить миграции"
	@echo "    make backup         — Резервная копия БД"
	@echo "    make shell-backend  — Bash в контейнере backend"
	@echo "    make shell-db       — psql в контейнере БД"
	@echo ""
	@echo "  Очистка:"
	@echo "    make clean          — Удалить контейнеры и образы проекта"
	@echo "    make clean-cache    — Удалить BuildKit кеш (потребует интернет при след. сборке!)"
	@echo "    make clean-all      — Полная очистка (включая тома с данными!)"
	@echo ""

# ── Первый запуск ─────────────────────────────────────────────────────────────
prepare:
	@chmod +x scripts/prepare-offline.sh
	@./scripts/prepare-offline.sh

prepare-export:
	@chmod +x scripts/prepare-offline.sh
	@./scripts/prepare-offline.sh --export

# ── Сборка ───────────────────────────────────────────────────────────────────
build:
	docker compose build

build-no-cache:
	docker compose build --no-cache

# ── Запуск/остановка ─────────────────────────────────────────────────────────
up:
	docker compose up -d
	@echo ""
	@echo "  Сервисы запущены:"
	@echo "  Приложение:  http://localhost:38800"
	@echo "  Backend API: http://localhost:38801"
	@echo ""

down:
	docker compose down

restart:
	docker compose restart

# ── Логи ────────────────────────────────────────────────────────────────────
logs:
	docker compose logs -f --tail=100

logs-backend:
	docker compose logs -f backend

logs-frontend:
	docker compose logs -f frontend

logs-db:
	docker compose logs -f db

# ── Статус ──────────────────────────────────────────────────────────────────
status:
	@echo ""
	@echo "── Контейнеры ──────────────────────────────────────────"
	@docker compose ps
	@echo ""
	@echo "── Healthcheck ─────────────────────────────────────────"
	@curl -sf http://localhost:38801/health > /dev/null \
		&& echo "  ✓ Backend  — OK" \
		|| echo "  ✗ Backend  — НЕДОСТУПЕН"
	@curl -sf http://localhost:38800/ > /dev/null \
		&& echo "  ✓ Frontend — OK" \
		|| echo "  ✗ Frontend — НЕДОСТУПЕН"
	@echo ""

# ── Администрирование ────────────────────────────────────────────────────────
admin:
	docker compose exec backend python -m app.cli create-admin

migrate:
	docker compose run --rm migrate

backup:
	docker compose exec backend python -m app.cli backup-db

shell-backend:
	docker compose exec backend bash

shell-db:
	docker compose exec db psql -U $${POSTGRES_USER:-postgres} $${POSTGRES_DB:-zgt}

# ── Очистка ──────────────────────────────────────────────────────────────────
clean:
	docker compose down --rmi local
	@echo "Образы проекта удалены. Базовые образы сохранены."

clean-cache:
	@echo "⚠️  Удаление BuildKit кеша — следующая сборка потребует интернет!"
	@read -p "Продолжить? (yes/no): " confirm; \
	[ "$$confirm" = "yes" ] && docker builder prune -f || echo "Отменено."

clean-all:
	@echo "⚠️  ВНИМАНИЕ: Будут удалены все данные БД!"
	@read -p "Продолжить? (yes/no): " confirm; \
	[ "$$confirm" = "yes" ] && docker compose down -v --rmi local && docker builder prune -f \
	|| echo "Отменено."
