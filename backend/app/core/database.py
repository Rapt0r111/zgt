from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from sqlalchemy.exc import OperationalError
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

class Base(DeclarativeBase):
    pass

engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    pool_size=50,
    max_overflow=100,
    pool_recycle=3600,
    echo=settings.DEBUG,
    connect_args={
        "options": "-c timezone=utc",
        "connect_timeout": 5,
    },
    pool_timeout=30
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
    expire_on_commit=False
)

@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=2, max=10),
    retry=retry_if_exception_type(OperationalError)
)
def get_db():
    db = SessionLocal()
    try:
        db.execute(text("SELECT 1"))
        yield db
    except OperationalError as e:
        logger.error(f"Database connection failed: {e}")
        db.close()
        from fastapi import HTTPException
        raise HTTPException(status_code=503, detail="Database temporarily unavailable")
    except Exception:
        db.close()
        raise
    finally:
        db.close()