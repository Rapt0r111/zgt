# ZGT — Руководство по развёртыванию в локальной сети

> GitLab → Docker → tmux

---

## ЧАСТЬ 1. Что добавлено в проект

| Файл | Назначение |
|---|---|
| `backend/Dockerfile` | Сборка FastAPI образа |
| `backend/requirements.txt` | Python-зависимости |
| `backend/.dockerignore` | Исключения при сборке |
| `frontend/Dockerfile` | Сборка Next.js образа (standalone) |
| `frontend/.dockerignore` | Исключения при сборке |
| `frontend/next.config.ts` | Добавлен `output: "standalone"` |
| `docker-compose.yml` | Оркестрация всех сервисов |
| `nginx/nginx.conf` | Reverse proxy |
| `.env.example` | Шаблон переменных окружения |
| `.gitlab-ci.yml` | CI/CD пайплайн |
| `tmux-dev.sh` | Скрипт запуска в tmux |
| `.gitignore` | Обновлён |

---

## ЧАСТЬ 2. Подготовка сервера

### 2.1 Установка Docker

```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg

sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
  | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

echo "deb [arch=$(dpkg --print-architecture) \
  signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
  | sudo tee /etc/apt/sources.list.d/docker.list

sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Добавляем пользователя в группу docker (без sudo)
sudo usermod -aG docker $USER
newgrp docker

# Проверка
docker --version
docker compose version
```

### 2.2 Установка tmux

```bash
sudo apt-get install -y tmux
tmux -V
```

### 2.3 Установка GitLab Runner (если нужен CI/CD)

```bash
# Скачиваем runner
curl -L "https://packages.gitlab.com/install/repositories/runner/gitlab-runner/script.deb.sh" | sudo bash
sudo apt-get install -y gitlab-runner

# Регистрируем runner (берём токен из GitLab → Settings → CI/CD → Runners)
sudo gitlab-runner register \
  --url "http://ВАШ-GITLAB-IP/" \
  --registration-token "ВАШ-ТОКЕН" \
  --executor "shell" \
  --description "server-runner" \
  --tag-list "docker,deploy"

sudo systemctl enable gitlab-runner
sudo systemctl start gitlab-runner
```

---

## ЧАСТЬ 3. Настройка GitLab

### 3.1 Создание репозитория

```bash
# На сервере GitLab (через веб-интерфейс):
# New Project → Create blank project → zgt

# На вашей машине:
cd /путь/к/проекту
git init
git remote add origin http://ВАШ-GITLAB-IP/имя-группы/zgt.git
git add .
git commit -m "feat: initial commit"
git push -u origin main
```

### 3.2 Переменные CI/CD в GitLab

Перейдите: **GitLab → Project → Settings → CI/CD → Variables**

Добавьте следующие переменные (тип: Variable, Protected: ✓, Masked: ✓):

| Переменная | Значение | Masked |
|---|---|---|
| `POSTGRES_USER` | `postgres` | нет |
| `POSTGRES_PASSWORD` | `Ваш_сильный_пароль` | **да** |
| `POSTGRES_DB` | `zgt` | нет |
| `SECRET_KEY` | _(вывод команды ниже)_ | **да** |
| `BACKEND_CORS_ORIGINS` | `http://192.168.X.X` | нет |
| `NEXT_PUBLIC_API_URL` | `http://192.168.X.X` | нет |
| `DEPLOY_HOST` | `192.168.X.X` | нет |
| `DEPLOY_USER` | `имя_пользователя` | нет |
| `DEPLOY_PATH` | `/opt/zgt` | нет |
| `DEPLOY_SSH_KEY` | _(приватный SSH-ключ)_ | **да** |

```bash
# Генерация SECRET_KEY
python3 -c "import secrets; print(secrets.token_hex(32))"

# Генерация SSH-ключа для деплоя
ssh-keygen -t ed25519 -C "gitlab-deploy" -f ~/.ssh/gitlab_deploy -N ""
# Приватный ключ → в переменную DEPLOY_SSH_KEY
cat ~/.ssh/gitlab_deploy
# Публичный ключ → на сервер деплоя
cat ~/.ssh/gitlab_deploy.pub >> ~/.ssh/authorized_keys
```

---

## ЧАСТЬ 4. Первый запуск

### 4.1 Клонируем проект на сервер

```bash
sudo mkdir -p /opt/zgt
sudo chown $USER:$USER /opt/zgt

git clone http://ВАШ-GITLAB-IP/имя-группы/zgt.git /opt/zgt
cd /opt/zgt
```

### 4.2 Создаём .env

```bash
cp .env.example .env
nano .env  # или vi .env
```

Заполните обязательно:
- `POSTGRES_PASSWORD` — сильный пароль
- `SECRET_KEY` — `python3 -c "import secrets; print(secrets.token_hex(32))"`
- `BACKEND_CORS_ORIGINS` — IP вашего сервера, например: `http://192.168.1.100`
- `NEXT_PUBLIC_API_URL` — тот же IP: `http://192.168.1.100`

### 4.3 Делаем скрипт исполняемым

```bash
chmod +x tmux-dev.sh
```

### 4.4 Запуск через tmux

```bash
./tmux-dev.sh start
```

Что откроется в tmux:
- **Window 0 (compose)** — запуск + общие логи
- **Window 1 (backend)** — логи FastAPI
- **Window 2 (frontend)** — логи Next.js
- **Window 3 (db)** — логи PostgreSQL
- **Window 4 (shell)** — терминал для команд

Навигация в tmux:
```
Ctrl+B, [0-4]   — переключение между окнами
Ctrl+B, d       — отключиться (без остановки)
./tmux-dev.sh attach  — подключиться снова
```

### 4.5 Первый запуск: создание администратора

После успешного старта (все контейнеры healthy):

```bash
# В window 4 (shell) или в новом терминале:
cd /opt/zgt
docker compose exec backend python -m app.cli create-admin
```

Запишите временный пароль — он отображается один раз!

---

## ЧАСТЬ 5. Управление

### Основные команды

```bash
# Статус
./tmux-dev.sh status
docker compose ps

# Логи
./tmux-dev.sh logs
docker compose logs -f backend
docker compose logs -f frontend

# Перезапуск сервиса
docker compose restart backend
docker compose restart frontend

# Остановка
./tmux-dev.sh stop
# или
docker compose down

# Остановка с удалением данных БД (осторожно!)
docker compose down -v
```

### Обновление (деплой вручную)

```bash
cd /opt/zgt
git pull origin main

# Пересобрать и запустить
docker compose build --no-cache
docker compose run --rm migrate         # Применить новые миграции
docker compose up -d --remove-orphans

# Почистить старые образы
docker system prune -f
```

### Резервная копия БД

```bash
# Через CLI проекта
docker compose exec backend python -m app.cli backup-db

# Напрямую через pg_dump
docker compose exec db pg_dump -U postgres zgt > backup_$(date +%Y%m%d).sql

# Восстановление
docker compose exec -T db psql -U postgres zgt < backup_20250101.sql
```

### Миграции

```bash
# Применить все новые миграции
docker compose run --rm migrate

# Посмотреть историю
docker compose exec backend alembic history

# Откатить последнюю
docker compose exec backend alembic downgrade -1
```

---

## ЧАСТЬ 6. Доступ в локальной сети

После успешного запуска:

| Сервис | Адрес |
|---|---|
| **Приложение (через nginx)** | `http://192.168.X.X` (порт 80) |
| Frontend напрямую | `http://192.168.X.X:3000` |
| Backend API | `http://192.168.X.X:8000` |
| Swagger (только если DEBUG=true) | `http://192.168.X.X:8000/api/docs` |

Узнать IP сервера:
```bash
hostname -I | awk '{print $1}'
# или
ip addr show | grep 'inet ' | grep -v '127.0.0.1'
```

---

## ЧАСТЬ 7. Диагностика

```bash
# Все контейнеры запущены?
docker compose ps

# Проверить здоровье
curl http://localhost:8000/health
curl http://localhost:3000/

# Логи конкретного контейнера с временными метками
docker compose logs --timestamps backend | tail -50

# Войти в контейнер бэкенда
docker compose exec backend bash

# Войти в psql
docker compose exec db psql -U postgres zgt

# Перестроить один сервис
docker compose up -d --build backend

# Посмотреть использование ресурсов
docker stats
```

### Частые ошибки

**`connection refused` на порту 8000**
→ Бэкенд ещё стартует или упал. Смотрите логи: `docker compose logs backend`

**`CORS error` в браузере**
→ Проверьте `BACKEND_CORS_ORIGINS` в `.env` — должен содержать IP, с которого заходите

**`NEXT_PUBLIC_API_URL` не работает**
→ Это значение **вшивается в бандл при сборке** (не runtime!).
После изменения нужно пересобрать: `docker compose build frontend`

**Ошибка миграции**
→ `docker compose logs migrate` — посмотрите конкретную ошибку.
Возможно, нужно: `docker compose exec backend alembic stamp head`

**Контейнер постоянно рестартует**
→ `docker compose logs --tail=50 ИМЯ_СЕРВИСА`

---

## ЧАСТЬ 8. Автозапуск при перезагрузке сервера

```bash
# Создаём systemd сервис
sudo tee /etc/systemd/system/zgt.service <<EOF
[Unit]
Description=ZGT Application
Requires=docker.service
After=docker.service network.target

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/zgt
ExecStart=/usr/bin/docker compose up -d
ExecStop=/usr/bin/docker compose down
TimeoutStartSec=300
User=$USER

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable zgt
sudo systemctl start zgt
```

Проверка:
```bash
sudo systemctl status zgt
```

---

## Структура после деплоя

```
/opt/zgt/
├── .env                    ← реальные секреты (НЕ в git)
├── .env.example            ← шаблон (в git)
├── .gitlab-ci.yml          ← CI/CD
├── docker-compose.yml      ← оркестрация
├── tmux-dev.sh             ← скрипт запуска
├── nginx/
│   └── nginx.conf
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   └── app/
└── frontend/
    ├── Dockerfile
    └── ...
```
