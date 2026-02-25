from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_
from typing import Optional, List
from app.models.phone import Phone
from app.models.personnel import Personnel
from app.schemas.phone import PhoneCreate, PhoneUpdate
from app.core.validators import sanitize_html
import logging

logger = logging.getLogger(__name__)

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
        query = self.db.query(Phone).options(joinedload(Phone.owner)).filter(Phone.is_active == True)
        
        if status:
            query = query.filter(Phone.status == status)
        if owner_id:
            query = query.filter(Phone.owner_id == owner_id)
        if search:
            search_clean = sanitize_html(search)
            query = query.join(Personnel).filter(or_(
                Phone.model.ilike(f"%{search_clean}%"),
                Phone.imei_1.ilike(f"%{search_clean}%"),
                Phone.imei_2.ilike(f"%{search_clean}%"),
                Personnel.full_name.ilike(f"%{search_clean}%")
            ))
        
        total = query.count()
        items = query.order_by(Phone.storage_location).offset(skip).limit(limit).all()
        return items, total
    
    def get_by_id(self, phone_id: int) -> Optional[Phone]:
        return self.db.query(Phone).options(joinedload(Phone.owner)).filter(
            Phone.id == phone_id,
            Phone.is_active == True
        ).first()
    
    def create(self, phone_data: PhoneCreate) -> Phone:
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
        phone = self.get_by_id(phone_id)
        if not phone:
            return None
        
        for field, value in phone_data.model_dump(exclude_unset=True).items():
            setattr(phone, field, value)
        
        self.db.commit()
        self.db.refresh(phone)
        return phone
    
    def delete(self, phone_id: int) -> bool:
        phone = self.get_by_id(phone_id)
        if not phone:
            return False
        phone.is_active = False
        self.db.commit()
        return True
    
    def batch_checkin(self, phone_ids: List[int]) -> int:
        """Принять телефоны (статус -> Сдан). Все проверки — до транзакции."""
        # Загружаем телефоны с блокировкой
        phones = self.db.query(Phone).filter(
            Phone.id.in_(phone_ids),
            Phone.is_active == True
        ).all()
        
        found_ids = {p.id for p in phones}
        missing = set(phone_ids) - found_ids
        if missing:
            raise ValueError(f"Телефоны не найдены: {sorted(missing)}")
        
        already_checked = [p.id for p in phones if p.status == "Сдан"]
        if already_checked:
            raise ValueError(f"Телефоны уже сданы: {already_checked}")
        
        try:
            count = self.db.query(Phone).filter(Phone.id.in_(phone_ids)).update(
                {"status": "Сдан"}, synchronize_session=False
            )
            self.db.commit()
            return count
        except Exception as e:
            self.db.rollback()
            logger.error(f"Batch checkin error: {e}")
            raise ValueError(f"Ошибка массовой сдачи: {str(e)}")
    
    def batch_checkout(self, phone_ids: List[int]) -> int:
        """Выдать телефоны (статус -> Выдан). Все проверки — до транзакции."""
        phones = self.db.query(Phone).filter(
            Phone.id.in_(phone_ids),
            Phone.is_active == True
        ).all()
        
        found_ids = {p.id for p in phones}
        missing = set(phone_ids) - found_ids
        if missing:
            raise ValueError(f"Телефоны не найдены: {sorted(missing)}")
        
        already_out = [p.id for p in phones if p.status == "Выдан"]
        if already_out:
            raise ValueError(f"Телефоны уже выданы: {already_out}")
        
        try:
            count = self.db.query(Phone).filter(Phone.id.in_(phone_ids)).update(
                {"status": "Выдан"}, synchronize_session=False
            )
            self.db.commit()
            return count
        except Exception as e:
            self.db.rollback()
            logger.error(f"Batch checkout error: {e}")
            raise ValueError(f"Ошибка массовой выдачи: {str(e)}")
    
    def get_status_report(self) -> dict:
        total = self.db.query(Phone).filter(Phone.is_active == True).count()
        checked_in = self.db.query(Phone).filter(Phone.is_active == True, Phone.status == "Сдан").count()
        checked_out = self.db.query(Phone).filter(Phone.is_active == True, Phone.status == "Выдан").count()
        
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