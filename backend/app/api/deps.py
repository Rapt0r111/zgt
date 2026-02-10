from fastapi import Depends, HTTPException, status, Request, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional, List
from sqlalchemy.orm import Session
from jose import JWTError

from app.core.database import get_db
from app.core.security import verify_token, verify_csrf_token
from app.models.user import User

security = HTTPBearer(auto_error=False)

def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """Получить текущего пользователя из токена"""
    
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Не удалось проверить учетные данные",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    # Проверка cookie
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
            detail="Пользователь деактивирован"
        )
    
    return user


def verify_csrf(
    x_csrf_token: str = Header(...),
    current_user: User = Depends(get_current_user)
):
    """Dependency to verify CSRF token on mutating requests"""
    if not verify_csrf_token(x_csrf_token, current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid CSRF token"
        )
    return current_user


def require_roles(allowed_roles: List[str]):
    """Проверка наличия роли у пользователя"""
    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Требуется роль: {', '.join(allowed_roles)}"
            )
        return current_user
    return role_checker


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    """Проверка, что пользователь - администратор"""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Требуются права администратора"
        )
    return current_user