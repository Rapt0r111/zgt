import logging
from datetime import timedelta, datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import verify_password, create_access_token, generate_csrf_token
from app.core.config import settings
from app.core.rate_limit import rate_limiter
from app.models.user import User
from app.schemas.auth import LoginRequest, Token, UserResponse
from app.api.deps import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=Token)
async def login(
    login_data: LoginRequest,
    response: Response,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    client_ip = request.client.host if request.client else "unknown"

    if not rate_limiter.is_allowed(client_ip):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Слишком много неудачных попыток. Попробуйте через 15 минут.",
        )

    user = (await db.execute(select(User).where(User.username == login_data.username))).scalars().first()

    if not user or not verify_password(login_data.password, user.password_hash):
        rate_limiter.record_attempt(client_ip)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверный логин или пароль",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Пользователь деактивирован")

    rate_limiter.reset(client_ip)

    # Явный UTC – корректно с DateTime(timezone=True)
    user.last_login = datetime.now(timezone.utc)
    await db.commit()

    access_token = create_access_token(
        data={"sub": user.username, "role": user.role},
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    csrf_token = generate_csrf_token(user.id)
    cookie_domain = settings.COOKIE_DOMAIN if settings.COOKIE_DOMAIN else None

    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=settings.SECURE_COOKIES,
        samesite="strict",
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        domain=cookie_domain,
    )
    response.headers["X-CSRF-Token"] = csrf_token
    logger.info("User '%s' logged in", user.username)
    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    return current_user


@router.post("/logout")
async def logout(response: Response):
    response.delete_cookie(key="access_token", httponly=True, samesite="lax", secure=False)
    return {"message": "Выход выполнен"}


@router.get("/csrf-token")
async def get_csrf_token(
    response: Response,
    current_user: User = Depends(get_current_user),
):
    csrf_token = generate_csrf_token(current_user.id)
    response.headers["X-CSRF-Token"] = csrf_token
    logger.info("CSRF token refreshed for user '%s'", current_user.username)
    return {"csrf_refreshed": True}