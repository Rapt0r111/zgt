from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.core.config import settings
from app.api.routes import auth, personnel, phones, equipment, users, storage_and_passes

import logging
import time

logging.basicConfig(
    level=logging.INFO if settings.DEBUG else logging.WARNING,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

logging.getLogger('sqlalchemy.engine').setLevel(logging.WARNING)
logger = logging.getLogger(__name__)

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    docs_url="/api/docs" if settings.DEBUG else None,
    redoc_url="/api/redoc" if settings.DEBUG else None,
    openapi_url="/api/openapi.json" if settings.DEBUG else None
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Set-Cookie", "X-Process-Time", "X-CSRF-Token"],
    max_age=3600,
)

@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    
    if not settings.DEBUG:
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    
    return response

@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    
    if process_time > 1.0:
        logger.warning(f"SLOW: {request.method} {request.url.path} took {process_time:.2f}s")
    
    response.headers["X-Process-Time"] = f"{process_time:.4f}"
    return response

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Global exception: {exc}", exc_info=True)
    detail = str(exc) if settings.DEBUG else "Internal server error"
    return JSONResponse(status_code=500, content={"detail": detail})

@app.get("/")
async def root():
    return {"message": "ZGT System API", "version": settings.VERSION, "status": "running"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

app.include_router(auth.router, prefix="/api")
app.include_router(users.router, prefix="/api")
app.include_router(personnel.router, prefix="/api")
app.include_router(phones.router, prefix="/api")
app.include_router(equipment.router, prefix="/api")
app.include_router(storage_and_passes.router, prefix="/api")