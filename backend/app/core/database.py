from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

# ИСПРАВЛЕНО: Оптимизированные настройки для работы с PostgreSQL
engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,  # Проверка соединения перед использованием
    pool_size=5,  # Размер пула соединений
    max_overflow=10,  # Максимум дополнительных соединений
    pool_recycle=3600,  # Переиспользование соединений каждый час
    echo=False,  # ИСПРАВЛЕНО: Отключаем логи SQL в production
    connect_args={
        "options": "-c timezone=utc"  # Устанавливаем timezone
    }
)

# Создаём фабрику сессий
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
    expire_on_commit=False  # ДОБАВЛЕНО: Не истекать объекты после commit
)

# Базовый класс для моделей
Base = declarative_base()

# ИСПРАВЛЕНО: Улучшенный dependency с правильным закрытием сессии
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()  # Всегда закрываем сессию