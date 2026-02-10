from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import Optional, List, Tuple
from app.models.user import User
from app.schemas.user import UserCreate, UserUpdate
from app.core.security import get_password_hash, verify_password
from sqlalchemy.exc import IntegrityError

class UserService:
    def __init__(self, db: Session):
        self.db = db
    
    def get_list(
        self,
        skip: int = 0,
        limit: int = 100,
        search: Optional[str] = None
    ) -> Tuple[List[User], int]:
        """Получить список пользователей"""
        query = self.db.query(User)
        
        if search:
            search_filter = or_(
                User.username.ilike(f"%{search}%"),
                User.full_name.ilike(f"%{search}%")
            )
            query = query.filter(search_filter)
        
        total = query.count()
        items = query.order_by(User.username).offset(skip).limit(limit).all()
        
        return items, total
    
    def get_by_id(self, user_id: int) -> Optional[User]:
        """Получить пользователя по ID"""
        return self.db.query(User).filter(User.id == user_id).first()
    
    def get_by_username(self, username: str) -> Optional[User]:
        """Получить пользователя по username"""
        return self.db.query(User).filter(User.username == username).first()
    
    def create(self, user_data: UserCreate) -> User:
        """Создать пользователя"""
        # Проверка уникальности username
        existing = self.get_by_username(user_data.username)
        if existing:
            raise ValueError(f"Пользователь с логином '{user_data.username}' уже существует")
        
        user = User(
            username=user_data.username,
            password_hash=get_password_hash(user_data.password),
            full_name=user_data.full_name,
            role=user_data.role,
            is_active=True
        )
        
        try:
            self.db.add(user)
            self.db.commit()
            self.db.refresh(user)
            return user
        except IntegrityError:
            self.db.rollback()
            raise ValueError("Ошибка при создании пользователя")
    
    def update(self, user_id: int, user_data: UserUpdate) -> Optional[User]:
        """Обновить пользователя"""
        user = self.get_by_id(user_id)
        if not user:
            return None
        
        update_dict = user_data.model_dump(exclude_unset=True)
        
        # Проверка уникальности username при изменении
        if 'username' in update_dict:
            existing = self.get_by_username(update_dict['username'])
            if existing and existing.id != user_id:
                raise ValueError(f"Пользователь с логином '{update_dict['username']}' уже существует")
        
        for field, value in update_dict.items():
            setattr(user, field, value)
        
        try:
            self.db.commit()
            self.db.refresh(user)
            return user
        except IntegrityError:
            self.db.rollback()
            raise ValueError("Ошибка при обновлении пользователя")
    
    def delete(self, user_id: int) -> bool:
        """Удалить пользователя"""
        user = self.get_by_id(user_id)
        if not user:
            return False
        
        self.db.delete(user)
        self.db.commit()
        return True
    
    def toggle_active(self, user_id: int) -> Optional[User]:
        """Переключить статус активности"""
        user = self.get_by_id(user_id)
        if not user:
            return None
        
        user.is_active = not user.is_active
        self.db.commit()
        self.db.refresh(user)
        return user
    
    def verify_old_password(self, user_id: int, old_password: str) -> bool:
        """Проверить старый пароль"""
        user = self.get_by_id(user_id)
        if not user:
            return False
        
        return verify_password(old_password, user.password_hash)
    
    def change_password(self, user_id: int, new_password: str) -> bool:
        """Сменить пароль"""
        user = self.get_by_id(user_id)
        if not user:
            return False
        
        user.password_hash = get_password_hash(new_password)
        self.db.commit()
        return True