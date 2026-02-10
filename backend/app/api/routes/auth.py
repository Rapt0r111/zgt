from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import verify_password, create_access_token, generate_csrf_token
from app.core.config import settings
from app.core.rate_limit import rate_limiter
from app.models.user import User
from app.schemas.auth import LoginRequest, Token, UserResponse
from app.api.deps import get_current_user
from sqlalchemy.sql import func

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/login", response_model=Token)
async def login(
    login_data: LoginRequest,
    response: Response,
    request: Request,
    db: Session = Depends(get_db)
):
    """Вход в систему с rate limiting"""
    
    client_ip = request.client.host if request.client else "unknown"
    
    # Check rate limit
    if not rate_limiter.is_allowed(client_ip):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Слишком много неудачных попыток. Попробуйте через 15 минут."
        )
    
    # Найти пользователя
    user = db.query(User).filter(User.username == login_data.username).first()
    
    # Проверить пользователя и пароль
    if not user or not verify_password(login_data.password, user.password_hash):
        rate_limiter.record_attempt(client_ip)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверный логин или пароль",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Пользователь деактивирован"
        )
    
    # Success - reset rate limit counter
    rate_limiter.reset(client_ip)
    
    # Обновить время последнего входа
    user.last_login = func.now()
    db.commit()
    
    # Создать токен
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username, "role": user.role},
        expires_delta=access_token_expires
    )
    
    # Generate CSRF token
    csrf_token = generate_csrf_token(user.id)
    
    # Set secure cookie
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=settings.SECURE_COOKIES,
        samesite="strict",
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        domain=settings.COOKIE_DOMAIN
    )
    
    # ВАЖНО: Отправляем CSRF токен в заголовке ответа
    response.headers["X-CSRF-Token"] = csrf_token
    
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: User = Depends(get_current_user)
):
    """Получить информацию о текущем пользователе"""
    return current_user

@router.post("/logout")
async def logout(response: Response):
    """Выход из системы"""
    response.delete_cookie("access_token")
    return {"message": "Успешный выход"}