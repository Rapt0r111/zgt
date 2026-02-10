from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import Optional

from app.core.database import get_db
from app.api.deps import get_current_user, verify_csrf, require_admin
from app.models.user import User
from app.schemas.user import UserCreate, UserUpdate, UserResponse, UserListResponse, ChangePasswordRequest
from app.services.user_service import UserService

router = APIRouter(prefix="/users", tags=["users"])

@router.get("/", response_model=UserListResponse)
async def list_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    service = UserService(db)
    items, total = service.get_list(skip=skip, limit=limit, search=search)
    return UserListResponse(total=total, items=items)

@router.post("/", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    user_data: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(verify_csrf)
):
    if user_data.role == "admin" and current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Только администратор может создавать других администраторов")
    
    service = UserService(db)
    try:
        return service.create(user_data)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "admin" and current_user.id != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Недостаточно прав")
    
    service = UserService(db)
    user = service.get_by_id(user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Пользователь не найден")
    return user

@router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int,
    user_data: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(verify_csrf)
):
    if current_user.role != "admin" and current_user.id != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Недостаточно прав")
    
    if user_data.role and current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Только администратор может менять роли")
    
    service = UserService(db)
    user = service.update(user_id, user_data)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Пользователь не найден")
    return user

@router.post("/{user_id}/change-password")
async def change_password(
    user_id: int,
    password_data: ChangePasswordRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(verify_csrf)
):
    if current_user.id != user_id and current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Недостаточно прав")
    
    service = UserService(db)
    
    if current_user.id == user_id:
        if not service.verify_old_password(user_id, password_data.old_password):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Неверный текущий пароль")
    
    if not service.change_password(user_id, password_data.new_password):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Пользователь не найден")
    
    return {"message": "Пароль успешно изменён"}

@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    if current_user.id == user_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Нельзя удалить собственный аккаунт")
    
    service = UserService(db)
    if not service.delete(user_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Пользователь не найден")

@router.post("/{user_id}/toggle-active")
async def toggle_user_active(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(verify_csrf)
):
    if current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Только администратор может активировать/деактивировать пользователей")
    
    if current_user.id == user_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Нельзя деактивировать собственный аккаунт")
    
    service = UserService(db)
    user = service.toggle_active(user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Пользователь не найден")
    
    return {"message": f"Пользователь {'активирован' if user.is_active else 'деактивирован'}", "is_active": user.is_active}