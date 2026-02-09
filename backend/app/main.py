from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.routes import auth, personnel, phones, equipment
import logging

# Настройка логирования
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

# Отключаем SQLAlchemy логи
logging.getLogger('sqlalchemy.engine').setLevel(logging.WARNING)

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json"
)

# CORS настройки - КРИТИЧНО для работы с cookies и фронтендом
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Set-Cookie", "X-Process-Time"],
    max_age=3600,
)

# Middleware для мониторинга производительности
@app.middleware("http")
async def add_process_time_header(request, call_next):
    import time
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    
    # Логируем только медленные запросы (>1 сек)
    if process_time > 1.0:
        logging.warning(
            f"⚠️  SLOW: {request.method} {request.url.path} "
            f"took {process_time:.2f}s"
        )
    
    response.headers["X-Process-Time"] = f"{process_time:.4f}"
    return response

@app.get("/")
async def root():
    return {
        "message": "ZGT System API",
        "version": settings.VERSION,
        "status": "running"
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

# Подключение роутеров
app.include_router(auth.router, prefix="/api")
app.include_router(personnel.router, prefix="/api")
app.include_router(phones.router, prefix="/api")
app.include_router(equipment.router, prefix="/api")