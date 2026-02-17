from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, or_
from sqlalchemy.exc import IntegrityError
from typing import Optional, List
from datetime import datetime
from app.models.storage_and_passes import StorageAndPass
from app.models.personnel import Personnel
from app.schemas.storage_and_passes import StorageAndPassCreate, StorageAndPassUpdate, AssignmentRequest
import logging

logger = logging.getLogger(__name__)

class StorageAndPassService:
    def __init__(self, db: Session):
        self.db = db
    
    def get_statistics(
        self,
        asset_type: Optional[str] = None,
        status: Optional[str] = None,
        search: Optional[str] = None
    ) -> dict:
        # 1. Базовый запрос с учетом активности
        base_query = self.db.query(StorageAndPass).filter(StorageAndPass.is_active == True)
        
        # 2. Применяем фильтры для общего количества
        if asset_type:
            base_query = base_query.filter(StorageAndPass.asset_type == asset_type)
        if status:
            base_query = base_query.filter(StorageAndPass.status == status)
        if search:
            base_query = base_query.filter(or_(
                StorageAndPass.serial_number.ilike(f"%{search}%"),
                StorageAndPass.model.ilike(f"%{search}%"),
                StorageAndPass.manufacturer.ilike(f"%{search}%")
            ))

        total_assets = base_query.count()

        # 3. Группировка по статусу (учитываем фильтр типа и поиска)
        status_q = self.db.query(StorageAndPass.status, func.count(StorageAndPass.id)).filter(StorageAndPass.is_active == True)
        if asset_type:
            status_q = status_q.filter(StorageAndPass.asset_type == asset_type)
        if search:
            status_q = status_q.filter(StorageAndPass.serial_number.ilike(f"%{search}%"))
        
        by_status = dict(status_q.group_by(StorageAndPass.status).all())

        # 4. Группировка по типу (учитываем фильтр статуса и поиска)
        type_q = self.db.query(StorageAndPass.asset_type, func.count(StorageAndPass.id)).filter(StorageAndPass.is_active == True)
        if status:
            type_q = type_q.filter(StorageAndPass.status == status)
        if search:
            type_q = type_q.filter(StorageAndPass.serial_number.ilike(f"%{search}%"))
            
        by_type = dict(type_q.group_by(StorageAndPass.asset_type).all())

        return {
            "total_assets": total_assets,
            "by_type": by_type,
            "by_status": by_status
        }

    def get_list(
        self,
        skip: int = 0,
        limit: int = 100,
        asset_type: Optional[str] = None,
        status: Optional[str] = None,
        search: Optional[str] = None
    ) -> tuple[List[StorageAndPass], int]:
        query = self.db.query(StorageAndPass).options(
            joinedload(StorageAndPass.assigned_to)
        ).filter(StorageAndPass.is_active == True)
        
        if asset_type:
            query = query.filter(StorageAndPass.asset_type == asset_type)
        if status:
            query = query.filter(StorageAndPass.status == status)
        if search:
            query = query.filter(or_(
                StorageAndPass.serial_number.ilike(f"%{search}%"),
                StorageAndPass.model.ilike(f"%{search}%"),
                StorageAndPass.manufacturer.ilike(f"%{search}%")
            ))
        
        total = query.count()
        items = query.order_by(StorageAndPass.asset_type, StorageAndPass.serial_number).offset(skip).limit(limit).all()
        return items, total
    
    def get_by_id(self, asset_id: int) -> Optional[StorageAndPass]:
        return self.db.query(StorageAndPass).options(
            joinedload(StorageAndPass.assigned_to)
        ).filter(StorageAndPass.id == asset_id, StorageAndPass.is_active == True).first()
    
    def create(self, asset_data: StorageAndPassCreate) -> StorageAndPass:
        try:
            asset = StorageAndPass(**asset_data.model_dump())
            self.db.add(asset)
            self.db.commit()
            self.db.refresh(asset)
            return asset
        except IntegrityError as e:
            self.db.rollback()
            if 'uq_storage_passes_serial' in str(e.orig):
                raise ValueError(f"Серийный номер {asset_data.serial_number} уже существует")
            raise ValueError("Ошибка при создании")
    
    def update(self, asset_id: int, asset_data: StorageAndPassUpdate) -> Optional[StorageAndPass]:
        asset = self.get_by_id(asset_id)
        if not asset:
            return None
        
        try:
            for field, value in asset_data.model_dump(exclude_unset=True).items():
                setattr(asset, field, value)
            self.db.commit()
            self.db.refresh(asset)
            return asset
        except IntegrityError as e:
            self.db.rollback()
            if 'uq_storage_passes_serial' in str(e.orig):
                raise ValueError("Серийный номер уже существует")
            raise
    
    def delete(self, asset_id: int) -> bool:
        asset = self.get_by_id(asset_id)
        if not asset:
            return False
        asset.is_active = False
        self.db.commit()
        return True
    
    def assign_to_personnel(self, asset_id: int, request: AssignmentRequest) -> StorageAndPass:
        try:
            with self.db.begin_nested():
                asset = self.db.query(StorageAndPass).with_for_update().filter(
                    StorageAndPass.id == asset_id,
                    StorageAndPass.is_active == True
                ).one_or_none()
                
                if not asset:
                    raise ValueError("Актив не найден")
                
                if asset.status == 'in_use' and asset.assigned_to_id:
                    raise ValueError(f"Актив уже выдан пользователю {asset.assigned_to.full_name}")
                
                personnel = self.db.query(Personnel).filter(
                    Personnel.id == request.assigned_to_id,
                    Personnel.is_active == True
                ).first()
                
                if not personnel:
                    raise ValueError("Сотрудник не найден")
                
                asset.assigned_to_id = request.assigned_to_id
                asset.status = 'in_use'
                asset.issue_date = datetime.now()
                asset.return_date = None
                if request.notes:
                    asset.notes = request.notes
                
                self.db.flush()
            
            self.db.commit()
            self.db.refresh(asset)
            return asset
        except Exception as e:
            self.db.rollback()
            logger.error(f"Assignment error: {e}")
            raise
    
    def revoke_from_personnel(self, asset_id: int) -> StorageAndPass:
        try:
            with self.db.begin_nested():
                asset = self.db.query(StorageAndPass).with_for_update().filter(
                    StorageAndPass.id == asset_id,
                    StorageAndPass.is_active == True
                ).one_or_none()
                
                if not asset:
                    raise ValueError("Актив не найден")
                if asset.status != 'in_use':
                    raise ValueError("Актив не находится в использовании")
                
                asset.assigned_to_id = None
                asset.status = 'stock'
                asset.return_date = datetime.now()
                
                self.db.flush()
            
            self.db.commit()
            self.db.refresh(asset)
            return asset
        except Exception as e:
            self.db.rollback()
            logger.error(f"Revoke error: {e}")
            raise