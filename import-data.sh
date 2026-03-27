#!/usr/bin/env bash
# import-data.sh — импорт данных из дампа zgt.sql в контейнер PostgreSQL
# Использование: ./import-data.sh [путь_к_файлу]
#
# Дамп создан pg_dump в custom-формате (бинарный, PGDMP-заголовок).
# Восстановление выполняется через pg_restore, а не psql.
#
# Имя БД в дампе: zgt_db  →  целевая БД в контейнере: zgt (или $POSTGRES_DB)
set -euo pipefail

DUMP_FILE="${1:-./zgt.sql}"
DB_NAME="${POSTGRES_DB:-zgt}"
DB_USER="${POSTGRES_USER:-postgres}"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

info()  { echo -e "${GREEN}[import]${NC} $*"; }
warn()  { echo -e "${YELLOW}[import]${NC} $*"; }
error() { echo -e "${RED}[import]${NC} $*"; exit 1; }

# ── Проверки ─────────────────────────────────────────────────────────────────
[[ -f "$DUMP_FILE" ]] || error "Файл дампа не найден: $DUMP_FILE"

if ! docker compose ps db | grep -q "running\|healthy"; then
    error "Контейнер db не запущен. Выполните: docker compose up -d db"
fi

# ── Копируем дамп в контейнер ────────────────────────────────────────────────
CONTAINER=$(docker compose ps -q db)
info "Копируем дамп в контейнер db..."
docker cp "$DUMP_FILE" "${CONTAINER}:/tmp/zgt_import.dump"

# ── Восстанавливаем данные ───────────────────────────────────────────────────
info "Запускаем pg_restore в БД '${DB_NAME}'..."
docker compose exec db bash -c "
    pg_restore \
        --username='${DB_USER}' \
        --dbname='${DB_NAME}' \
        --no-owner \
        --no-privileges \
        --no-comments \
        --schema=public \
        --data-only \
        --disable-triggers \
        /tmp/zgt_import.dump \
    && echo 'OK: данные импортированы' \
    || echo 'WARN: pg_restore завершился с предупреждениями (возможны дубликаты — не критично)'
"

# ── Обновляем последовательности (sequences) после bulk-вставки ──────────────
info "Обновляем последовательности..."
docker compose exec db psql -U "${DB_USER}" -d "${DB_NAME}" -c "
SELECT setval(pg_get_serial_sequence(t.table_schema||'.'||t.table_name, c.column_name),
              COALESCE(MAX(c2.attnum), 1))
FROM information_schema.tables t
JOIN information_schema.columns c USING (table_schema, table_name)
JOIN pg_class pc ON pc.relname = t.table_name
JOIN pg_attribute c2 ON c2.attrelid = pc.oid AND c2.attname = c.column_name
WHERE t.table_schema = 'public'
  AND c.column_default LIKE 'nextval%'
  AND t.table_type = 'BASE TABLE';
" 2>/dev/null || true

# Более простой и надёжный вариант — сбрасываем каждую sequence вручную
docker compose exec db psql -U "${DB_USER}" -d "${DB_NAME}" << 'SQL'
DO $$
DECLARE
    r RECORD;
    max_val BIGINT;
BEGIN
    FOR r IN
        SELECT sequence_name,
               replace(replace(sequence_name, '_id_seq', ''), '_seq', '') AS tbl,
               'id' AS col
        FROM information_schema.sequences
        WHERE sequence_schema = 'public'
    LOOP
        BEGIN
            EXECUTE format('SELECT COALESCE(MAX(id), 0) FROM %I', r.tbl) INTO max_val;
            PERFORM setval(r.sequence_name, GREATEST(max_val, 1));
        EXCEPTION WHEN OTHERS THEN
            NULL; -- пропускаем таблицы без поля id
        END;
    END LOOP;
END $$;
SQL

info "Готово! Данные из дампа импортированы в БД '${DB_NAME}'."
info "Проверить: docker compose exec db psql -U ${DB_USER} -d ${DB_NAME} -c '\dt'"
