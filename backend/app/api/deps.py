from fastapi import Depends, HTTPException, status, Request, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional, List
from sqlalchemy.orm import Session
from jose import JWTError

from app.core.database import get_db
from app.core.security import verify_token, verify_csrf_token
from app.models.user import User

security = HTTPBearer(auto_error=False)

# Исправлено: добавлены все роли включая officer и operator
ROLE_HIERARCHY: dict[str, int] = {
    "admin": 100,
    "officer": 50,
    "operator": 20,
    "user": 10,
}


def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db),
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Не удалось проверить учетные данные",
        headers={"WWW-Authenticate": "Bearer"},
    )
    token = credentials.credentials if credentials else request.cookies.get("access_token")
    if not token:
        raise credentials_exception

    try:
        payload = verify_token(token)
        if not payload:
            raise credentials_exception
        username: str = payload.get("sub")
        if not username:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = db.query(User).filter(User.username == username).one_or_none()
    if not user:
        raise credentials_exception
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Пользователь деактивирован")

    return user


def verify_csrf(
    x_csrf_token: Optional[str] = Header(None),
    current_user: User = Depends(get_current_user),
) -> User:
    if not x_csrf_token or not verify_csrf_token(x_csrf_token, current_user.id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid CSRF token")
    return current_user


def require_min_role(min_role: str):
    """Универсальная проверка минимального уровня роли."""
    min_level = ROLE_HIERARCHY.get(min_role, 0)

    def checker(current_user: User = Depends(get_current_user)) -> User:
        user_level = ROLE_HIERARCHY.get(current_user.role, 0)
        if user_level < min_level:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Требуется роль: {min_role} или выше",
            )
        return current_user
    return checker


# Алиасы для удобства — убирают дублирование проверок по всему коду
require_admin = require_min_role("admin")
require_officer = require_min_role("officer")
require_personnel_access = require_officer  # офицер+ видит личный состав