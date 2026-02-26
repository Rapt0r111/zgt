from typing import Optional

from sqlalchemy import func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_password_hash, verify_password
from app.models.user import User
from app.schemas.user import UserCreate, UserUpdate


class UserService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_list(self, skip: int = 0, limit: int = 100, search: Optional[str] = None) -> tuple[list[User], int]:
        filters = []
        if search:
            filters.append(
                or_(
                    User.username.ilike(f"%{search}%"),
                    User.full_name.ilike(f"%{search}%"),
                )
            )

        total_stmt = select(func.count(User.id)).where(*filters)
        total = (await self.db.execute(total_stmt)).scalar_one()

        items_stmt = select(User).where(*filters).order_by(User.username).offset(skip).limit(limit)
        items = (await self.db.execute(items_stmt)).scalars().all()
        return items, total

    async def get_by_id(self, user_id: int) -> Optional[User]:
        stmt = select(User).where(User.id == user_id)
        return (await self.db.execute(stmt)).scalars().first()

    async def get_by_username(self, username: str) -> Optional[User]:
        stmt = select(User).where(User.username == username)
        return (await self.db.execute(stmt)).scalars().first()

    async def create(self, user_data: UserCreate) -> User:
        user = User(
            username=user_data.username,
            password_hash=get_password_hash(user_data.password),
            full_name=user_data.full_name,
            role=user_data.role,
            is_active=True,
        )

        try:
            self.db.add(user)
            await self.db.commit()
            await self.db.refresh(user)
            return user
        except IntegrityError as exc:
            await self.db.rollback()
            raise ValueError(f"Пользователь с логином '{user_data.username}' уже существует") from exc

    async def update(self, user_id: int, user_data: UserUpdate) -> Optional[User]:
        user = await self.get_by_id(user_id)
        if not user:
            return None

        update_dict = user_data.model_dump(exclude_unset=True)

        if "username" in update_dict:
            existing = await self.get_by_username(update_dict["username"])
            if existing and existing.id != user_id:
                raise ValueError(f"Пользователь с логином '{update_dict['username']}' уже существует")

        for field, value in update_dict.items():
            setattr(user, field, value)

        try:
            await self.db.commit()
            await self.db.refresh(user)
            return user
        except IntegrityError as exc:
            await self.db.rollback()
            raise ValueError("Ошибка при обновлении пользователя") from exc

    async def delete(self, user_id: int) -> bool:
        user = await self.get_by_id(user_id)
        if not user:
            return False
        user.is_active = False
        await self.db.commit()
        return True

    async def toggle_active(self, user_id: int) -> Optional[User]:
        user = await self.get_by_id(user_id)
        if not user:
            return None
        user.is_active = not user.is_active
        await self.db.commit()
        await self.db.refresh(user)
        return user

    async def verify_old_password(self, user_id: int, old_password: str) -> bool:
        user = await self.get_by_id(user_id)
        if not user:
            return False
        return verify_password(old_password, user.password_hash)

    async def change_password(self, user_id: int, new_password: str) -> bool:
        user = await self.get_by_id(user_id)
        if not user:
            return False
        user.password_hash = get_password_hash(new_password)
        await self.db.commit()
        return True
