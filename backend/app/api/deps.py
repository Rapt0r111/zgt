# Заменить полностью файл backend/app/api/deps.py

from fastapi import Depends, HTTPException, status, Request, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional, List
from sqlalchemy.orm import Session
from jose import JWTError

from app.core.database import get_db
from app.core.security import verify_token, verify_csrf_token
from app.models.user import User

security = HTTPBearer(auto_error=False)

# Иерархия ролей: чем выше число — тем больше прав
ROLE_HIERARCHY: dict[str, int] = {
    "admin": 100,
    "user": 10,
}


def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db),
) -> User:
    """Получить текущего пользователя из токена (cookie или Bearer)"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Не удалось проверить учетные данные",
        headers={"WWW-Authenticate": "Bearer"},
    )

    token = None
    if credentials:
        token = credentials.credentials
    else:
        token = request.cookies.get("access_token")

    if not token:
        raise credentials_exception

    try:
        payload = verify_token(token)
        if payload is None:
            raise credentials_exception
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = db.query(User).filter(User.username == username).one_or_none()

    if user is None:
        raise credentials_exception

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Пользователь деактивирован",
        )

    return user


def verify_csrf(
    x_csrf_token: Optional[str] = Header(None),
    current_user: User = Depends(get_current_user),
) -> User:
    """Проверка CSRF-токена для мутирующих запросов"""
    if not x_csrf_token or not verify_csrf_token(x_csrf_token, current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid CSRF token",
        )
    return current_user


def require_roles(allowed_roles: List[str]):
    """Проверка конкретного набора ролей"""
    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Требуется роль: {', '.join(allowed_roles)}",
            )
        return current_user
    return role_checker


def require_min_role(min_role: str):
    """
    Требует минимальный уровень роли по иерархии.
    admin > officer > operator > user
    """
    min_level = ROLE_HIERARCHY.get(min_role, 0)

    def checker(current_user: User = Depends(get_current_user)) -> User:
        user_level = ROLE_HIERARCHY.get(current_user.role, 0)
        if user_level < min_level:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Недостаточно прав. Требуется роль: {min_role} или выше",
            )
        return current_user
    return checker


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    """Только администраторы"""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Требуются права администратора",
        )
    return current_user


def require_personnel_access(current_user: User = Depends(get_current_user)) -> User:
    """
    Доступ к личному составу — только officer и выше.
    Операторы видят только технику.
    """
    allowed_roles = {"admin", "officer"}
    if current_user.role not in allowed_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Доступ к данным личного состава ограничен. Требуется роль: officer",
        )
    return current_user