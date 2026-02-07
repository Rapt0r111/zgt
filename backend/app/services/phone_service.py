from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_
from typing import Optional, List
from app.models.phone import Phone
from app.models.personnel import Personnel
from app.schemas.phone import PhoneCreate, PhoneUpdate

class PhoneService:
    def __init__(self, db: Session):
        self.db = db
    
    def get_list(
        self,
        skip: int = 0,
        limit: int = 100,
        status: Optional[str] = None,
        search: Optional[str] = None,
        owner_id: Optional[int] = None
    ) -> tuple[List[Phone], int]:
        """Получить список телефонов с фильтрацией"""
        query = self.db.query(Phone).options(joinedload(Phone.owner)).filter(Phone.is_active == True)
        
        # Фильтр по статусу
        if status:
            query = query.filter(Phone.status == status)
        
        # Фильтр по владельцу
        if owner_id:
            query = query.filter(Phone.owner_id == owner_id)
        
        # Поиск по модели, IMEI, владельцу
        if search:
            query = query.join(Personnel).filter(
                or_(
                    Phone.model.ilike(f"%{search}%"),
                    Phone.imei_1.ilike(f"%{search}%"),
                    Phone.imei_2.ilike(f"%{search}%"),
                    Personnel.full_name.ilike(f"%{search}%")
                )
            )
        
        # Подсчёт
        total = query.count()
        
        # Получение с пагинацией
        items = query.order_by(Phone.storage_location).offset(skip).limit(limit).all()
        
        return items, total
    
    def get_by_id(self, phone_id: int) -> Optional[Phone]:
        """Получить телефон по ID"""
        return self.db.query(Phone).options(joinedload(Phone.owner)).filter(
            Phone.id == phone_id,
            Phone.is_active == True
        ).first()
    
    def create(self, phone_data: PhoneCreate) -> Phone:
        """Создать запись о телефоне"""
        # Проверить существование владельца
        owner = self.db.query(Personnel).filter(
            Personnel.id == phone_data.owner_id,
            Personnel.is_active == True
        ).first()
        
        if not owner:
            raise ValueError("Владелец не найден")
        
        phone = Phone(**phone_data.model_dump())
        self.db.add(phone)
        self.db.commit()
        self.db.refresh(phone)
        return phone
    
    def update(self, phone_id: int, phone_data: PhoneUpdate) -> Optional[Phone]:
        """Обновить данные телефона"""
        phone = self.get_by_id(phone_id)
        if not phone:
            return None
        
        update_data = phone_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(phone, field, value)
        
        self.db.commit()
        self.db.refresh(phone)
        return phone
    
    def delete(self, phone_id: int) -> bool:
        """Мягкое удаление"""
        phone = self.get_by_id(phone_id)
        if not phone:
            return False
        
        phone.is_active = False
        self.db.commit()
        return True
    
    def batch_checkin(self, phone_ids: List[int]) -> int:
        """Массовая сдача телефонов"""
        count = self.db.query(Phone).filter(
            Phone.id.in_(phone_ids),
            Phone.is_active == True
        ).update(
            {"status": "Сдан"},
            synchronize_session=False
        )
        self.db.commit()
        return count
    
    def batch_checkout(self, phone_ids: List[int]) -> int:
        """Массовая выдача телефонов"""
        count = self.db.query(Phone).filter(
            Phone.id.in_(phone_ids),
            Phone.is_active == True
        ).update(
            {"status": "Выдан"},
            synchronize_session=False
        )
        self.db.commit()
        return count
    
    def get_status_report(self) -> dict:
        """Отчёт по статусам телефонов"""
        total = self.db.query(Phone).filter(Phone.is_active == True).count()
        checked_in = self.db.query(Phone).filter(
            Phone.is_active == True,
            Phone.status == "Сдан"
        ).count()
        checked_out = self.db.query(Phone).filter(
            Phone.is_active == True,
            Phone.status == "Выдан"
        ).count()
        
        # Телефоны, которые должны быть сданы (статус "Выдан")
        phones_not_submitted = self.db.query(Phone).options(joinedload(Phone.owner)).filter(
            Phone.is_active == True,
            Phone.status == "Выдан"
        ).all()
        
        return {
            "total_phones": total,
            "checked_in": checked_in,
            "checked_out": checked_out,
            "phones_not_submitted": phones_not_submitted
        }