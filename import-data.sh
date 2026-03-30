#!/usr/bin/env bash
# import-data.sh — импорт данных из дампа zgt.sql в контейнер PostgreSQL
#
# Использование:
#   ./import-data.sh [путь_к_файлу]
#
# Поддерживает оба формата:
#   - Текстовый SQL (pg_dump без флагов или --format=plain)
#   - Бинарный custom-формат (pg_dump --format=custom)
#
# Автоматически определяет формат по сигнатуре файла (PGDMP = binary).
#
# ВАЖНО: Запускать ПОСЛЕ docker compose up -d db
# (или после полного запуска: docker compose up -d)
set -euo pipefail

DUMP_FILE="${1:-./zgt.sql}"
DB_NAME="${POSTGRES_DB:-zgt}"
DB_USER="${POSTGRES_USER:-postgres}"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

info()    { echo -e "${GREEN}[import]${NC} $*"; }
warn()    { echo -e "${YELLOW}[import]${NC} $*"; }
error()   { echo -e "${RED}[import]${NC} $*"; exit 1; }
step()    { echo -e "${CYAN}[import]${NC} $*"; }

# ── Проверки ─────────────────────────────────────────────────────────────────

[[ -f "$DUMP_FILE" ]] || error "Файл дампа не найден: $DUMP_FILE"

# Проверяем, что контейнер db запущен и здоров
if ! docker compose ps db 2>/dev/null | grep -qE "running|healthy"; then
    error "Контейнер db не запущен. Выполните: docker compose up -d db"
fi

# Ждём готовности PostgreSQL (до 60 секунд)
step "Ожидаем готовности PostgreSQL..."
for i in $(seq 1 12); do
    if docker compose exec -T db pg_isready -U "$DB_USER" -d "$DB_NAME" &>/dev/null; then
        break
    fi
    echo "  Попытка $i/12..."
    sleep 5
done

docker compose exec -T db pg_isready -U "$DB_USER" -d "$DB_NAME" &>/dev/null \
    || error "PostgreSQL не стал доступен за 60 секунд"

info "PostgreSQL готов"

# ── Определяем формат дампа ───────────────────────────────────────────────────

# Бинарный custom-формат начинается с 'PGDMP' (5 байт)
FILE_MAGIC=$(head -c 5 "$DUMP_FILE" 2>/dev/null || true)
if [[ "$FILE_MAGIC" == "PGDMP" ]]; then
    DUMP_FORMAT="custom"
    step "Обнаружен binary custom-формат (pg_dump --format=custom)"
else
    DUMP_FORMAT="plain"
    step "Обнаружен текстовый SQL-формат (pg_dump --format=plain)"
fi

# ── Проверяем, есть ли уже данные в БД ───────────────────────────────────────

EXISTING_TABLES=$(docker compose exec -T db psql -U "$DB_USER" -d "$DB_NAME" -tAc \
    "SELECT count(*) FROM information_schema.tables WHERE table_schema='public';" 2>/dev/null || echo "0")

if [[ "$EXISTING_TABLES" -gt 0 ]]; then
    warn "В БД уже есть $EXISTING_TABLES таблиц(ы)."
    echo ""
    read -rp "  Продолжить импорт? Данные будут добавлены/перезаписаны. [y/N] " CONFIRM
    [[ "${CONFIRM,,}" == "y" ]] || { info "Импорт отменён"; exit 0; }
fi

# ── Копируем дамп в контейнер ────────────────────────────────────────────────

CONTAINER=$(docker compose ps -q db)
step "Копируем дамп в контейнер..."
docker cp "$DUMP_FILE" "${CONTAINER}:/tmp/zgt_import.dump"

# ── Импорт ────────────────────────────────────────────────────────────────────

if [[ "$DUMP_FORMAT" == "custom" ]]; then
    step "Запускаем pg_restore (binary custom)..."

    # Сначала пробуем полный restore (schema + data)
    docker compose exec -T db bash -c "
        pg_restore \
            --username='${DB_USER}' \
            --dbname='${DB_NAME}' \
            --no-owner \
            --no-privileges \
            --no-comments \
            --disable-triggers \
            --exit-on-error \
            /tmp/zgt_import.dump
    " && RESTORE_OK=true || RESTORE_OK=false

    if [[ "$RESTORE_OK" == "false" ]]; then
        warn "Полный restore завершился с ошибками. Пробуем только данные (--data-only)..."
        docker compose exec -T db bash -c "
            pg_restore \
                --username='${DB_USER}' \
                --dbname='${DB_NAME}' \
                --no-owner \
                --no-privileges \
                --no-comments \
                --data-only \
                --disable-triggers \
                /tmp/zgt_import.dump
        " || warn "pg_restore завершился с предупреждениями (возможны дубликаты — проверьте данные)"
    fi

else
    step "Запускаем psql (plain SQL)..."

    # Временно отключаем проверку FK для корректного импорта с зависимостями
    docker compose exec -T db psql \
        --username="${DB_USER}" \
        --dbname="${DB_NAME}" \
        --set ON_ERROR_STOP=0 \
        --command="SET session_replication_role = replica;" \
        --file=/tmp/zgt_import.dump \
        || warn "psql завершился с предупреждениями (проверьте данные)"

    # Восстанавливаем FK
    docker compose exec -T db psql \
        --username="${DB_USER}" \
        --dbname="${DB_NAME}" \
        --command="SET session_replication_role = DEFAULT;" \
        &>/dev/null || true
fi

# ── Обновляем последовательности (sequences) ─────────────────────────────────
#
# После bulk-вставки sequences отстают от реальных MAX(id) — это вызывает
# ошибки при создании новых записей (duplicate key on id).

step "Обновляем sequences..."

docker compose exec -T db psql -U "${DB_USER}" -d "${DB_NAME}" << 'SQL'
DO $$
DECLARE
    r       RECORD;
    max_val BIGINT;
    seq_sql TEXT;
BEGIN
    -- Находим все serial/bigserial колонки через pg_sequences
    FOR r IN
        SELECT
            seq.schemaname,
            seq.sequencename,
            seq.sequencename AS seq_name,
            -- Определяем таблицу и колонку через pg_depend
            dep_cls.relname  AS table_name,
            dep_att.attname  AS col_name
        FROM pg_sequences seq
        JOIN pg_class seq_cls ON seq_cls.relname = seq.sequencename
            AND seq_cls.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = seq.schemaname)
        JOIN pg_depend dep ON dep.objid = seq_cls.oid AND dep.deptype = 'a'
        JOIN pg_class dep_cls ON dep_cls.oid = dep.refobjid
        JOIN pg_attribute dep_att ON dep_att.attrelid = dep_cls.oid AND dep_att.attnum = dep.refobjsubid
        WHERE seq.schemaname = 'public'
    LOOP
        BEGIN
            seq_sql := format(
                'SELECT COALESCE(MAX(%I), 0) FROM %I.%I',
                r.col_name, r.schemaname, r.table_name
            );
            EXECUTE seq_sql INTO max_val;

            PERFORM setval(
                format('%I.%I', r.schemaname, r.seq_name),
                GREATEST(max_val, 1)
            );

            RAISE NOTICE 'sequence %.% → %', r.schemaname, r.seq_name, GREATEST(max_val, 1);
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'skip sequence %: %', r.seq_name, SQLERRM;
        END;
    END LOOP;
END $$;
SQL

# ── Очистка ───────────────────────────────────────────────────────────────────

docker compose exec -T db rm -f /tmp/zgt_import.dump

# ── Финальная статистика ──────────────────────────────────────────────────────

echo ""
info "=== Статистика после импорта ==="
docker compose exec -T db psql -U "${DB_USER}" -d "${DB_NAME}" -c \
    "SELECT tablename, (SELECT count(*) FROM information_schema.columns
     WHERE table_name = t.tablename AND table_schema = 'public') AS cols
     FROM pg_tables t WHERE schemaname = 'public' ORDER BY tablename;" \
    2>/dev/null || true

echo ""
info "✅ Импорт завершён!"
info "   БД: ${DB_NAME}  Пользователь: ${DB_USER}"
info "   Подключение (локально): psql -h 127.0.0.1 -p \${DB_LOCAL_PORT:-5433} -U ${DB_USER} -d ${DB_NAME}"