from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import Optional, List
from app.models.personnel import Personnel
from app.schemas.personnel import PersonnelCreate, PersonnelUpdate
from sqlalchemy.exc import IntegrityError

RANK_PRIORITY = {
    'Маршал Российской Федерации': 1, 'Генерал армии': 2, 'Генерал-полковник': 3,
    'Генерал-лейтенант': 4, 'Генерал-майор': 5, 'Полковник': 6, 'Подполковник': 7,
    'Майор': 8, 'Капитан': 9, 'Старший лейтенант': 10, 'Лейтенант': 11,
    'Младший лейтенант': 12, 'Старший прапорщик': 13, 'Прапорщик': 14,
    'Старшина': 15, 'Старший сержант': 16, 'Сержант': 17, 'Младший сержант': 18,
    'Ефрейтор': 19, 'Рядовой': 20, 'Курсант': 21,
}

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
        query = self.db.query(Personnel).filter(Personnel.is_active == True)
        
        if status:
            query = query.filter(Personnel.status == status)
        
        if search:
            query = query.filter(or_(
                Personnel.full_name.ilike(f"%{search}%"),
                Personnel.rank.ilike(f"%{search}%"),
                Personnel.position.ilike(f"%{search}%"),
                Personnel.personal_number.ilike(f"%{search}%")
            ))
        
        total = query.count()
        items = query.order_by(
            Personnel.rank_priority.asc().nullslast(),
            Personnel.full_name.asc()
        ).offset(skip).limit(limit).all()
        
        return items, total
    
    def get_by_id(self, personnel_id: int) -> Optional[Personnel]:
        return self.db.query(Personnel).filter(
            Personnel.id == personnel_id,
            Personnel.is_active == True
        ).first()
    
    def _calc_rank_priority(self, rank: Optional[str]) -> int:
        return RANK_PRIORITY.get(rank.strip() if rank else '', 999)
    
    def create(self, personnel_data: PersonnelCreate) -> Personnel:
        try:
            data = personnel_data.model_dump()
            data['rank_priority'] = self._calc_rank_priority(data.get('rank'))
            
            personnel = Personnel(**data)
            self.db.add(personnel)
            self.db.commit()
            self.db.refresh(personnel)
            return personnel
        except IntegrityError:
            self.db.rollback()
            raise ValueError("Личный номер уже существует")
    
    def update(self, personnel_id: int, personnel_data: PersonnelUpdate) -> Optional[Personnel]:
        personnel = self.get_by_id(personnel_id)
        if not personnel:
            return None
        
        update_data = personnel_data.model_dump(exclude_unset=True)
        
        if 'rank' in update_data:
            update_data['rank_priority'] = self._calc_rank_priority(update_data['rank'])
        
        for field, value in update_data.items():
            setattr(personnel, field, value)
        
        self.db.commit()
        self.db.refresh(personnel)
        return personnel
    
    def delete(self, personnel_id: int) -> bool:
        personnel = self.get_by_id(personnel_id)
        if not personnel:
            return False
        
        personnel.is_active = False
        self.db.commit()
        return True