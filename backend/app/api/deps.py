from collections.abc import Callable

from fastapi import Depends, Header, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import verify_csrf_token, verify_token
from app.models.user import User

security = HTTPBearer(auto_error=False)

ROLE_HIERARCHY: dict[str, int] = {
    "admin": 100,
    "officer": 50,
    "operator": 20,
    "user": 10,
}


async def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
    db: AsyncSession = Depends(get_db),
    x_csrf_token: str | None = Header(default=None, alias="X-CSRF-Token"),
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Не удалось проверить учетные данные",
        headers={"WWW-Authenticate": "Bearer"},
    )

    token = request.cookies.get("access_token")
    if credentials and credentials.credentials:
        token = credentials.credentials

    if token is None:
        raise credentials_exception

    try:
        payload = verify_token(token)
        if payload is None:
            raise credentials_exception
        username = payload.get("sub")
        if not isinstance(username, str) or not username:
            raise credentials_exception
    except JWTError as exc:
        raise credentials_exception from exc

    result = await db.execute(select(User).where(User.username == username))
    user = result.scalar_one_or_none()
    if user is None:
        raise credentials_exception

    if request.method not in {"GET", "HEAD", "OPTIONS"}:
        if x_csrf_token is None or not verify_csrf_token(x_csrf_token, user.id):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid CSRF token")

    return user


async def get_current_active_user(current_user: User = Depends(get_current_user)) -> User:
    if not current_user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Пользователь деактивирован")
    return current_user


async def verify_csrf(
    x_csrf_token: str | None = Header(default=None, alias="X-CSRF-Token"),
    current_user: User = Depends(get_current_active_user),
) -> User:
    if x_csrf_token is None or not verify_csrf_token(x_csrf_token, current_user.id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid CSRF token")
    return current_user


def require_role(min_level: int) -> Callable[..., User]:
    async def role_dependency(current_user: User = Depends(get_current_active_user)) -> User:
        user_level = ROLE_HIERARCHY.get(current_user.role, 0)
        if user_level < min_level:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Недостаточно прав для выполнения операции",
            )
        return current_user

    return role_dependency


require_admin = require_role(ROLE_HIERARCHY["admin"])
require_officer = require_role(ROLE_HIERARCHY["officer"])
require_personnel_access = require_officer
