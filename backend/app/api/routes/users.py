from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from app.api.deps import get_current_user, require_admin, verify_csrf
from app.core.database import get_db
from app.models.user import User
from app.schemas.user import ChangePasswordRequest, UserCreate, UserListResponse, UserResponse, UserUpdate
from app.services.user_service import UserService

router = APIRouter(prefix="/users", tags=["users"])


async def _get_user_or_404(service: UserService, user_id: int) -> User:
    user = await service.get_by_id(user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Пользователь не найден")
    return user


def _assert_self_or_admin(current_user: User, user_id: int) -> None:
    if current_user.role != "admin" and current_user.id != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Недостаточно прав")


@router.get("/", response_model=UserListResponse)
async def list_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    service = UserService(db)
    items, total = await service.get_list(skip=skip, limit=limit, search=search)
    return UserListResponse(total=total, items=items)


@router.post("/", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    user_data: UserCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(verify_csrf),
):
    if user_data.role == "admin" and current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Только администратор может создавать других администраторов")
    try:
        return await UserService(db).create(user_data)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from e


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _assert_self_or_admin(current_user, user_id)
    return await _get_user_or_404(UserService(db), user_id)


@router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int,
    user_data: UserUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(verify_csrf),
):
    _assert_self_or_admin(current_user, user_id)
    if user_data.role and current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Только администратор может менять роли")
    try:
        user = await UserService(db).update(user_id, user_data)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from e
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Пользователь не найден")
    return user


@router.post("/{user_id}/change-password")
async def change_password(
    user_id: int,
    password_data: ChangePasswordRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(verify_csrf),
):
    _assert_self_or_admin(current_user, user_id)
    service = UserService(db)
    if current_user.id == user_id:
        if not password_data.old_password:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Требуется текущий пароль")
        if not await service.verify_old_password(user_id, password_data.old_password):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Неверный текущий пароль")
    if not await service.change_password(user_id, password_data.new_password):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Пользователь не найден")
    return {"message": "Пароль успешно изменён"}


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    if current_user.id == user_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Нельзя удалить собственный аккаунт")
    if not await UserService(db).delete(user_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Пользователь не найден")


@router.post("/{user_id}/toggle-active")
async def toggle_user_active(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(verify_csrf),
):
    if current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Только администратор может активировать/деактивировать пользователей")
    if current_user.id == user_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Нельзя деактивировать собственный аккаунт")
    user = await UserService(db).toggle_active(user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Пользователь не найден")
    return {"message": f"Пользователь {'активирован' if user.is_active else 'деактивирован'}", "is_active": user.is_active}
