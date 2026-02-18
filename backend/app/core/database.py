import logging
import time
from contextlib import contextmanager
from typing import Generator

from sqlalchemy import create_engine, event, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.exc import OperationalError

from app.core.config import settings

logger = logging.getLogger(__name__)

_is_postgres = settings.DATABASE_URL.startswith(("postgresql://", "postgres://", "postgresql+psycopg2://"))

if _is_postgres:
    connect_args = {}  # psycopg2 не принимает check_same_thread и прочие SQLite-параметры
else:
    connect_args = {"check_same_thread": False}

engine = create_engine(
    settings.DATABASE_URL,
    connect_args=connect_args,
    pool_pre_ping=True,
    pool_recycle=3600,
    echo=settings.DEBUG,
)

if not _is_postgres:
    @event.listens_for(engine, "connect")
    def _set_sqlite_pragma(dbapi_conn, _connection_record):
        cursor = dbapi_conn.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

_MAX_RETRIES = 3
_RETRY_DELAY = 0.5


def _create_session_with_retry() -> Session:
    last_exc = None
    for attempt in range(1, _MAX_RETRIES + 1):
        try:
            session = SessionLocal()
            session.execute(text("SELECT 1"))
            return session
        except OperationalError as exc:
            last_exc = exc
            logger.warning("Не удалось подключиться к БД (попытка %d/%d): %s", attempt, _MAX_RETRIES, exc)
            if attempt < _MAX_RETRIES:
                time.sleep(_RETRY_DELAY * attempt)
    raise RuntimeError(f"Не удалось подключиться к БД после {_MAX_RETRIES} попыток") from last_exc


def get_db() -> Generator[Session, None, None]:
    db = _create_session_with_retry()
    try:
        yield db
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


@contextmanager
def get_db_context():
    db = _create_session_with_retry()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()