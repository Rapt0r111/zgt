# ZGT — Полное руководство по запуску через Docker

---

## Содержание

1. [Предварительные требования](#1-предварительные-требования)
2. [Установка Docker](#2-установка-docker)
3. [Подготовка проекта](#3-подготовка-проекта)
4. [Первый запуск (чистая БД)](#4-первый-запуск-чистая-бд)
5. [Проверка работы](#5-проверка-работы)
6. [Создание администратора](#6-создание-администратора)
7. [Управление и обслуживание](#7-управление-и-обслуживание)
8. [Обновление базы данных (миграции)](#8-обновление-базы-данных-миграции)
9. [Обновление кода проекта](#9-обновление-кода-проекта)
10. [Резервное копирование БД](#10-резервное-копирование-бд)
11. [Сброс и полная переустановка](#11-сброс-и-полная-переустановка)
12. [Частые ошибки и решения](#12-частые-ошибки-и-решения)

---

## 1. Предварительные требования

Перед началом убедитесь, что у вас есть:

- Репозиторий проекта (скачан/склонирован)
- Минимум **4 ГБ** свободной оперативной памяти
- Минимум **10 ГБ** свободного места на диске
- Доступ в интернет (для первой загрузки образов)

---

## 2. Установка Docker

### Windows

**Требования:** Windows 10 (версия 2004+) или Windows 11, включённый WSL 2.

**Шаг 1 — Включить WSL 2** (откройте PowerShell от имени администратора):
```powershell
wsl --install
# После завершения — перезагрузите компьютер
```

**Шаг 2 — Скачать Docker Desktop:**

Перейдите на [https://www.docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop) и скачайте установщик для Windows.

**Шаг 3 — Установить Docker Desktop:**

Запустите скачанный `.exe` файл. В процессе установки:
- Оставьте галочку "Use WSL 2 instead of Hyper-V"
- После установки перезагрузите компьютер

**Шаг 4 — Проверить установку** (в PowerShell или cmd):
```powershell
docker --version
docker compose version
```

Ожидаемый вывод:
```
Docker version 27.x.x, build ...
Docker Compose version v2.x.x
```

> **Важно:** Убедитесь что Docker Desktop запущен (иконка в трее). Без этого команды не работают.

---

### Linux (Ubuntu/Debian)

**Шаг 1 — Обновить пакеты и установить зависимости:**
```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg
```

**Шаг 2 — Добавить официальный репозиторий Docker:**
```bash
sudo install -m 0755 -d /etc/apt/keyrings

curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
  | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

echo "deb [arch=$(dpkg --print-architecture) \
  signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
  | sudo tee /etc/apt/sources.list.d/docker.list
```

**Шаг 3 — Установить Docker:**
```bash
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
```

**Шаг 4 — Настроить права (чтобы не писать `sudo` перед каждой командой):**
```bash
sudo usermod -aG docker $USER
newgrp docker
```

**Шаг 5 — Проверить установку:**
```bash
docker --version
docker compose version
```

---

## 3. Подготовка проекта

Все следующие команды выполняются из корневой папки проекта (там, где лежит `docker-compose.yml`).

### Windows (PowerShell)
```powershell
# Перейти в папку проекта
cd C:\путь\к\проекту\zgt
```

### Linux (Terminal)
```bash
# Перейти в папку проекта
cd /путь/к/проекту/zgt
```

---

### Создать файл `.env`

Скопируйте шаблон и откройте его для редактирования:

**Windows (PowerShell):**
```powershell
Copy-Item .env.example .env
notepad .env
```

**Linux:**
```bash
cp .env.example .env
nano .env
```

---

### Заполнить `.env`

Откройте файл и установите следующие значения:

```env
# ── База данных ──────────────────────────────────────────────────────
POSTGRES_USER=postgres
POSTGRES_PASSWORD=ВашНадёжныйПарольБД123!
POSTGRES_DB=zgt

# ── Безопасность ─────────────────────────────────────────────────────
# Сгенерируйте SECRET_KEY командой ниже (см. раздел генерации ключа)
SECRET_KEY=вставьте_сгенерированный_ключ_сюда

# ── Порты (оставьте как есть, если не конфликтуют) ───────────────────
BACKEND_PORT=38801
FRONTEND_PORT=38800
DB_LOCAL_PORT=34599

# ── Адреса (замените на IP вашего сервера или оставьте localhost) ─────
BACKEND_CORS_ORIGINS=http://localhost:38801
NEXT_PUBLIC_API_URL=http://localhost:38801

# ── Дополнительно ─────────────────────────────────────────────────────
DEBUG=false
SECURE_COOKIES=false
ACCESS_TOKEN_EXPIRE_MINUTES=60
BCRYPT_ROUNDS=12
```

---

### Сгенерировать SECRET_KEY

**Windows (PowerShell — если установлен Python):**
```powershell
python -c "import secrets; print(secrets.token_hex(32))"
```

**Linux:**
```bash
python3 -c "import secrets; print(secrets.token_hex(32))"
```

Скопируйте вывод (64 символа) и вставьте в `.env` в значение `SECRET_KEY`.

> Если Python не установлен на Windows, можно также использовать любой онлайн-генератор случайных hex строк (32 байта = 64 символа).

---

## 4. Первый запуск (чистая БД)

> **Это раздел для самого первого запуска.** База данных будет пустой — никаких данных нет, только схема.

### Шаг 1 — Убедиться, что нет старых контейнеров

**Windows и Linux:**
```bash
docker compose down -v
```

> Флаг `-v` удаляет тома (volumes), включая данные БД. **Используйте только при первом запуске или когда хотите полный сброс!**

---

### Шаг 2 — Собрать образы

Это может занять 5–15 минут при первом запуске (зависит от скорости интернета):

```bash
docker compose build --no-cache
```

Вы увидите процесс сборки backend (Python/FastAPI) и frontend (Next.js). Дождитесь завершения.

---

### Шаг 3 — Применить миграции (создать таблицы в БД)

```bash
docker compose run --rm migrate
```

Этот шаг:
- Запускает PostgreSQL
- Применяет все Alembic-миграции
- Создаёт все таблицы в чистой базе данных
- Завершается и удаляет временный контейнер

Успешный вывод выглядит примерно так:
```
INFO  [alembic.runtime.migration] Running upgrade -> abc123, initial migration
INFO  [alembic.runtime.migration] Running upgrade abc123 -> def456, add personnel
...
```

---

### Шаг 4 — Запустить все сервисы

```bash
docker compose up -d
```

Флаг `-d` запускает контейнеры в фоновом режиме. Дождитесь, пока все сервисы станут `healthy`:

```bash
docker compose ps
```

Ожидаемый вывод (через ~30 секунд после старта):
```
NAME              STATUS
zgt-db-1          running (healthy)
zgt-backend-1     running (healthy)
zgt-frontend-1    running (healthy)
```

---

## 5. Проверка работы

### Проверить что backend отвечает:

**Windows (PowerShell):**
```powershell
Invoke-WebRequest -Uri http://localhost:38801/health -UseBasicParsing
```

**Linux:**
```bash
curl http://localhost:38801/health
```

Ожидаемый ответ: `{"status":"healthy"}`

---

### Открыть приложение в браузере:

- **Фронтенд:** [http://localhost:38800](http://localhost:38800)
- **Backend API (прямой доступ):** [http://localhost:38801](http://localhost:38801)

---

## 6. Создание администратора

После успешного запуска создайте первого пользователя-администратора:

```bash
docker compose exec backend python -m app.cli create-admin
```

Вывод будет примерно таким:
```
✅ Администратор создан успешно!
============================================================
   Логин: admin
   ВРЕМЕННЫЙ пароль: K9#mXzPqW2@nLs4R
============================================================
   ⚠️  ЗАПИШИТЕ ПАРОЛЬ - он показан только один раз!
   ⚠️  ОБЯЗАТЕЛЬНО смените пароль после первого входа!
```

> **Запишите пароль!** Он показывается только один раз. После входа в систему сразу смените его в настройках профиля.

---

## 7. Управление и обслуживание

### Посмотреть статус контейнеров

```bash
docker compose ps
```

---

### Посмотреть логи

```bash
# Все сервисы вместе
docker compose logs -f

# Только backend
docker compose logs -f backend

# Только frontend
docker compose logs -f frontend

# Только БД
docker compose logs -f db

# Последние 100 строк + следить за новыми
docker compose logs --tail=100 -f backend
```

---

### Остановить сервисы (данные сохраняются)

```bash
docker compose down
```

---

### Запустить снова (после остановки)

```bash
docker compose up -d
```

---

### Перезапустить один сервис

```bash
# Перезапустить только backend
docker compose restart backend

# Перезапустить только frontend
docker compose restart frontend
```

---

### Посмотреть использование ресурсов

```bash
docker stats
```

---

### Зайти внутрь контейнера (для диагностики)

```bash
# Зайти в backend контейнер
docker compose exec backend bash

# Зайти в psql (база данных)
docker compose exec db psql -U postgres zgt
```

---

## 8. Обновление базы данных (миграции)

Миграции нужны когда в коде появились изменения моделей (новые таблицы, поля, индексы).

### Применить новые миграции

```bash
# Применяет все новые миграции, которые ещё не были применены
docker compose run --rm migrate
```

> Безопасно запускать даже если новых миграций нет — просто ничего не сделает.

---

### Посмотреть историю миграций

```bash
docker compose exec backend alembic history
```

---

### Посмотреть текущую версию схемы БД

```bash
docker compose exec backend alembic current
```

---

### Откатить последнюю миграцию (осторожно!)

```bash
docker compose exec backend alembic downgrade -1
```

> **Внимание:** Откат может привести к потере данных, если миграция добавляла новые поля. Делайте backup перед откатом.

---

### Откатить до конкретной версии

```bash
# Посмотрите нужный revision из alembic history
docker compose exec backend alembic downgrade abc123def
```

---

### Пересоздать схему (если что-то пошло не так)

Если alembic "потерял" состояние, можно вручную синхронизировать:

```bash
# Пометить всё как применённое без выполнения
docker compose exec backend alembic stamp head

# Затем применить новые миграции
docker compose run --rm migrate
```

---

## 9. Обновление кода проекта

### Стандартное обновление (без изменений в БД)

```bash
# 1. Получить новый код
git pull origin main

# 2. Пересобрать образы
docker compose build --no-cache

# 3. Перезапустить сервисы
docker compose up -d --remove-orphans

# 4. Удалить старые образы
docker system prune -f
```

---

### Обновление с новыми миграциями БД

```bash
# 1. Получить новый код
git pull origin main

# 2. Сделать backup БД (обязательно!)
docker compose exec db pg_dump -U postgres zgt > backup_$(date +%Y%m%d_%H%M%S).sql

# 3. Пересобрать образы
docker compose build --no-cache

# 4. Применить миграции
docker compose run --rm migrate

# 5. Перезапустить сервисы
docker compose up -d --remove-orphans

# 6. Удалить старые образы
docker system prune -f
```

---

### Обновление только frontend (если изменился NEXT_PUBLIC_API_URL)

> Переменная `NEXT_PUBLIC_API_URL` **вшивается в код при сборке**, поэтому при её изменении нужна пересборка:

```bash
# Изменить значение в .env
# Затем:
docker compose build frontend
docker compose up -d frontend
```

---

## 10. Резервное копирование БД

### Создать backup вручную

**Через CLI проекта (рекомендуется):**
```bash
docker compose exec backend python -m app.cli backup-db
```
Файл сохранится в `backend/backups/` с именем вида `zgt_20250115_143022.sql`.

---

**Напрямую через pg_dump:**
```bash
# Linux
docker compose exec db pg_dump -U postgres zgt > backup_$(date +%Y%m%d).sql

# Windows (PowerShell)
docker compose exec db pg_dump -U postgres zgt | Out-File -FilePath "backup_$(Get-Date -Format 'yyyyMMdd').sql" -Encoding utf8
```

---

**В указанное место:**
```bash
docker compose exec backend python -m app.cli backup-db --output ./my_backup.sql
```

---

### Восстановить из backup

```bash
# Убедитесь что сервисы запущены
docker compose up -d db

# Восстановить
docker compose exec -T db psql -U postgres zgt < backup_20250115.sql
```

> **Внимание:** Восстановление перезапишет все текущие данные!

---

### Автоматическое резервное копирование (Linux — через cron)

```bash
# Открыть редактор cron
crontab -e

# Добавить строку (backup каждый день в 2:00 ночи):
0 2 * * * cd /путь/к/проекту && docker compose exec -T db pg_dump -U postgres zgt > /путь/к/backups/zgt_$(date +\%Y\%m\%d).sql
```

---

## 11. Сброс и полная переустановка

> ⚠️ **Все данные будут удалены!** Используйте только если нужен полный сброс.

### Полный сброс (Windows и Linux)

```bash
# 1. Остановить все контейнеры и удалить тома (данные БД)
docker compose down -v

# 2. Удалить собранные образы проекта
docker compose down --rmi local

# 3. (Опционально) Очистить весь Docker кэш
docker system prune -af

# 4. Пересобрать с нуля
docker compose build --no-cache

# 5. Применить миграции
docker compose run --rm migrate

# 6. Запустить
docker compose up -d

# 7. Создать нового администратора
docker compose exec backend python -m app.cli create-admin
```

---

## 12. Частые ошибки и решения

---

### `connection refused` на порту 38801

**Причина:** Backend ещё запускается или упал.

**Решение:**
```bash
# Посмотреть логи
docker compose logs backend

# Проверить статус
docker compose ps
```

Подождите 20–30 секунд после `docker compose up -d` — backend и frontend стартуют не мгновенно.

---

### `CORS error` в браузере

**Причина:** `BACKEND_CORS_ORIGINS` не соответствует адресу, с которого открыт сайт.

**Решение:**

Откройте `.env` и убедитесь что значение совпадает с тем, что в адресной строке браузера:

```env
# Если открываете через localhost:
BACKEND_CORS_ORIGINS=http://localhost:38800

# Если открываете через IP в сети:
BACKEND_CORS_ORIGINS=http://192.168.1.100:38800
```

После изменения перезапустите backend:
```bash
docker compose restart backend
```

---

### Ошибка при запуске migrate: `relation already exists`

**Причина:** Таблицы уже созданы, но alembic не знает об этом.

**Решение:**
```bash
docker compose exec backend alembic stamp head
```

---

### Frontend не подключается к backend

**Причина:** `NEXT_PUBLIC_API_URL` указывает не туда.

**Решение:**

Если открываете сайт через `localhost` — в `.env` должно быть:
```env
NEXT_PUBLIC_API_URL=http://localhost:38801
```

Если открываете через IP в локальной сети (например, `192.168.1.100`) — нужно:
```env
NEXT_PUBLIC_API_URL=http://192.168.1.100:38801
```

> ⚠️ После изменения этой переменной **обязательно пересоберите frontend**:
```bash
docker compose build frontend
docker compose up -d frontend
```

---

### Контейнер постоянно перезапускается (restarting)

**Решение:**
```bash
docker compose logs --tail=50 backend
# или
docker compose logs --tail=50 frontend
```

Посмотрите последние строки — обычно там написана причина.

---

### На Windows: `docker: command not found` в PowerShell

**Причина:** Docker Desktop не запущен.

**Решение:** Откройте Docker Desktop из меню Пуск, дождитесь пока иконка в трее перестанет анимироваться.

---

### На Windows: `cannot open file - permission denied` при работе с .env

**Решение:** Убедитесь что редактируете файл с правами текущего пользователя, а не системного.

---

### Порт уже используется (`port is already allocated`)

**Решение:** Измените порт в `.env`:
```env
BACKEND_PORT=38891   # Вместо 38801
FRONTEND_PORT=38890  # Вместо 38800
```

Затем перезапустите:
```bash
docker compose down
docker compose up -d
```

---

### Нет места на диске

**Решение:** Почистите неиспользуемые Docker-ресурсы:
```bash
# Удалить остановленные контейнеры, неиспользуемые образы и кэш
docker system prune -f

# Удалить вообще всё неиспользуемое (включая тома без контейнеров)
docker system prune -af --volumes
```

---

## Краткая шпаргалка

| Задача | Команда |
|--------|---------|
| Первый запуск (чистая БД) | `docker compose build --no-cache && docker compose run --rm migrate && docker compose up -d` |
| Создать админа | `docker compose exec backend python -m app.cli create-admin` |
| Запустить сервисы | `docker compose up -d` |
| Остановить (данные целы) | `docker compose down` |
| Полный сброс (данные удалены) | `docker compose down -v` |
| Посмотреть логи | `docker compose logs -f backend` |
| Применить миграции | `docker compose run --rm migrate` |
| Обновить код | `git pull && docker compose build --no-cache && docker compose run --rm migrate && docker compose up -d` |
| Backup БД | `docker compose exec db pg_dump -U postgres zgt > backup.sql` |
| Статус контейнеров | `docker compose ps` |


# 1. Загрузить образы
bash /путь/с/флешки/offline-images/load-images.sh

# 2. Скопировать проект
cp -r /путь/с/флешки/проект /opt/zgt
cd /opt/zgt

# 3. Убедиться что .env на месте
ls .env

# 4. Поднять БД и накатить миграции
docker compose up -d db
sleep 15
docker compose run --rm migrate

# 5. Запустить всё (--no-build — не пересобирать)
docker compose up -d --no-build

# 6. Создать администратора
docker compose exec backend python -m app.cli create-admin


docker compose down --rmi all --volumes --remove-orphans
