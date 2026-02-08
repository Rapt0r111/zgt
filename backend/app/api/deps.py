from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional, List

security = HTTPBearer(auto_error=False)  # ← ИЗМЕНИТЬ на auto_error=False

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

def get_current_user(
    request: Request,  # ← ДОБАВИТЬ
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),  # ← Optional
    db: Session = Depends(get_db)
) -> User:
    """Получить текущего пользователя из токена"""
    
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Не удалось проверить учетные данные",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    # ДОБАВИТЬ: Проверка cookie
    token = None
    if credentials:
        token = credentials.credentials
    else:
        # Попытка получить из cookie
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
    
    user = db.query(User).filter(User.username == username).first()
    
    if user is None:
        raise credentials_exception
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Пользователь деактивирован"
        )
    
    return user