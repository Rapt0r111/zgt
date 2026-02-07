from sqlalchemy.orm import Session
from sqlalchemy import or_, func
from typing import Optional, List
from app.models.personnel import Personnel
from app.schemas.personnel import PersonnelCreate, PersonnelUpdate
from sqlalchemy.exc import IntegrityError  # ДОБАВИТЬ импорт

class PersonnelService:
    def __init__(self, db: Session):
        self.db = db
    
    def get_list(
        self,
        skip: int = 0,
        limit: int = 100,
        status: Optional[str] = None,
        search: Optional[str] = None
    ) -> tuple[List[Personnel], int]:
        """Получить список личного состава с фильтрацией и поиском"""
        query = self.db.query(Personnel).filter(Personnel.is_active == True)
        
        # Фильтр по статусу
        if status:
            query = query.filter(Personnel.status == status)
        
        # Поиск по ФИО, званию, должности
        if search:
            search_filter = or_(
                Personnel.full_name.ilike(f"%{search}%"),
                Personnel.rank.ilike(f"%{search}%"),
                Personnel.position.ilike(f"%{search}%"),
                Personnel.personal_number.ilike(f"%{search}%")
            )
            query = query.filter(search_filter)
        
        # Подсчёт общего количества
        total = query.count()
        
        # Получение с пагинацией
        items = query.order_by(Personnel.full_name).offset(skip).limit(limit).all()
        
        return items, total
    
    def get_by_id(self, personnel_id: int) -> Optional[Personnel]:
        """Получить военнослужащего по ID"""
        return self.db.query(Personnel).filter(
            Personnel.id == personnel_id,
            Personnel.is_active == True
        ).first()
    
    def create(self, personnel_data: PersonnelCreate) -> Personnel:
        """Создать запись о военнослужащем"""
        try:
            personnel = Personnel(**personnel_data.model_dump())
            self.db.add(personnel)
            self.db.commit()
            self.db.refresh(personnel)
            return personnel
        except IntegrityError as e:
            self.db.rollback()
            if 'personal_number' in str(e.orig):
                raise ValueError("Личный номер уже существует")
            raise ValueError("Ошибка при создании записи")
    
    def update(self, personnel_id: int, personnel_data: PersonnelUpdate) -> Optional[Personnel]:
        """Обновить данные военнослужащего"""
        personnel = self.get_by_id(personnel_id)
        if not personnel:
            return None
        
        # Обновляем только переданные поля
        update_data = personnel_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(personnel, field, value)
        
        self.db.commit()
        self.db.refresh(personnel)
        return personnel
    
    def delete(self, personnel_id: int) -> bool:
        """Мягкое удаление (деактивация)"""
        personnel = self.get_by_id(personnel_id)
        if not personnel:
            return False
        
        personnel.is_active = False
        self.db.commit()
        return True
    
    def check_clearance_expired(self, personnel_id: int) -> bool:
        """Проверить, истёк ли допуск"""
        personnel = self.get_by_id(personnel_id)
        if not personnel or not personnel.clearance_expiry_date:
            return False
        
        from datetime import date
        return personnel.clearance_expiry_date < date.today()
    
    def get_expiring_clearances(self, days: int = 30) -> List[Personnel]:
        """Получить список людей с истекающими допусками"""
        from datetime import date, timedelta
        
        expiry_threshold = date.today() + timedelta(days=days)
        
        return self.db.query(Personnel).filter(
            Personnel.is_active == True,
            Personnel.clearance_expiry_date.isnot(None),
            Personnel.clearance_expiry_date <= expiry_threshold,
            Personnel.clearance_expiry_date >= date.today()
        ).order_by(Personnel.clearance_expiry_date).all()