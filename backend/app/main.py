from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.routes import auth, personnel, phones, equipment

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json"
)

# CORS настройки - ВАЖНО для работы с фронтендом
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],  # Разрешаем фронтенд
    allow_credentials=True,  # ← КРИТИЧНО! Для cookies
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "Cookie"],
    expose_headers=["Content-Type", "Set-Cookie"],
    max_age=600,
)

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