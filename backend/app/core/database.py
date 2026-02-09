from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from app.core.config import settings

# SQLAlchemy 2.0+ синтаксис
class Base(DeclarativeBase):
    pass

# Оптимизированные настройки для PostgreSQL
engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    pool_size=10,              # ↑ Увеличено с 5
    max_overflow=20,           # ↑ Увеличено с 10
    pool_recycle=3600,
    echo=settings.DEBUG,       # Логи только в DEBUG
    connect_args={
        "options": "-c timezone=utc"
    },
    # Новые параметры для производительности
    pool_timeout=30,
    pool_reset_on_return='rollback'
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
    expire_on_commit=False
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()