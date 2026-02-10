from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, func
from sqlalchemy.exc import SQLAlchemyError, IntegrityError
from typing import Optional, List
from datetime import datetime, timedelta
from app.models.equipment import Equipment, EquipmentMovement, StorageDevice
from app.models.personnel import Personnel
from app.schemas.equipment import (
    EquipmentCreate, EquipmentUpdate,
    MovementCreate,
    StorageDeviceCreate, StorageDeviceUpdate
)
from app.core.validators import sanitize_html
import logging

logger = logging.getLogger(__name__)

class EquipmentService:
    def __init__(self, db: Session):
        self.db = db
    
    def get_list(
        self,
        skip: int = 0,
        limit: int = 100,
        equipment_type: Optional[str] = None,
        status: Optional[str] = None,
        search: Optional[str] = None
    ) -> tuple[List[Equipment], int]:
        """Получить список техники с фильтрацией"""
        query = self.db.query(Equipment).options(
            joinedload(Equipment.current_owner)
        ).filter(Equipment.is_active == True)
        
        if equipment_type:
            query = query.filter(Equipment.equipment_type == equipment_type)
        
        if status:
            query = query.filter(Equipment.status == status)
        
        if search:
            search = sanitize_html(search)
            search_filter = or_(
                Equipment.inventory_number.ilike(f"%{search}%"),
                Equipment.serial_number.ilike(f"%{search}%"),
                Equipment.manufacturer.ilike(f"%{search}%"),
                Equipment.model.ilike(f"%{search}%"),
                Equipment.current_location.ilike(f"%{search}%")
            )
            query = query.filter(search_filter)
        
        total = query.count()
        items = query.order_by(Equipment.inventory_number).offset(skip).limit(limit).all()
        
        return items, total
    
    def get_by_id(self, equipment_id: int) -> Optional[Equipment]:
        """Получить технику по ID"""
        return self.db.query(Equipment).options(
            joinedload(Equipment.current_owner),
            joinedload(Equipment.storage_devices)
        ).filter(
            Equipment.id == equipment_id,
            Equipment.is_active == True
        ).first()
    
    def create(self, equipment_data: EquipmentCreate) -> Equipment:
        """Создать запись о технике с DB-enforced uniqueness"""
        try:
            equipment = Equipment(**equipment_data.model_dump())
            self.db.add(equipment)
            self.db.commit()
            self.db.refresh(equipment)
            return equipment
        except IntegrityError as e:
            self.db.rollback()
            if 'uq_equipment_inventory' in str(e.orig):
                raise ValueError(f"Инвентарный номер {equipment_data.inventory_number} уже существует")
            raise ValueError(f"Ошибка при создании: {str(e)}")
    
    def update(self, equipment_id: int, equipment_data: EquipmentUpdate) -> Optional[Equipment]:
        """Обновить данные техники"""
        equipment = self.get_by_id(equipment_id)
        if not equipment:
            return None
        
        update_data = equipment_data.model_dump(exclude_unset=True)
        
        try:
            for field, value in update_data.items():
                setattr(equipment, field, value)
            
            self.db.commit()
            self.db.refresh(equipment)
            return equipment
        except IntegrityError as e:
            self.db.rollback()
            if 'uq_equipment_inventory' in str(e.orig):
                raise ValueError(f"Инвентарный номер {update_data.get('inventory_number')} уже существует")
            raise
    
    def delete(self, equipment_id: int) -> bool:
        """Мягкое удаление"""
        equipment = self.get_by_id(equipment_id)
        if not equipment:
            return False
        
        equipment.is_active = False
        self.db.commit()
        return True
    
    def create_movement(
        self,
        movement_data: MovementCreate,
        created_by_id: int
    ) -> EquipmentMovement:
        """Create movement with row-level locking to prevent race conditions"""
        
        try:
            with self.db.begin_nested():  # Savepoint for rollback
                
                # Lock equipment row
                equipment = self.db.query(Equipment).with_for_update().filter(
                    Equipment.id == movement_data.equipment_id,
                    Equipment.is_active == True
                ).one_or_none()
                
                if not equipment:
                    raise ValueError("Техника не найдена")
                
                # Verify no concurrent movement in last 5 minutes
                pending_movement = self.db.query(EquipmentMovement).filter(
                    EquipmentMovement.equipment_id == equipment.id,
                    EquipmentMovement.created_at > datetime.now() - timedelta(minutes=5)
                ).first()
                
                if pending_movement:
                    raise ValueError("Перемещение уже выполняется другим пользователем")
                
                # Create movement record
                movement = EquipmentMovement(
                    **movement_data.model_dump(),
                    created_by_id=created_by_id
                )
                self.db.add(movement)
                
                # Update equipment location atomically
                equipment.current_location = movement_data.to_location
                equipment.current_owner_id = movement_data.to_person_id
                
                if movement_data.seal_number_after:
                    equipment.seal_number = movement_data.seal_number_after
                    equipment.seal_install_date = datetime.now()
                    equipment.seal_status = movement_data.seal_status or "Исправна"
                
                self.db.flush()
            
            self.db.commit()
            self.db.refresh(movement)
            return movement
            
        except IntegrityError as e:
            self.db.rollback()
            logger.error(f"Movement creation failed: {e}")
            raise ValueError(f"Конфликт данных: {str(e)}")
        except Exception as e:
            self.db.rollback()
            logger.error(f"Movement creation error: {e}")
            raise
    
    def get_movement_history(
        self,
        equipment_id: int,
        skip: int = 0,
        limit: int = 50
    ) -> tuple[List[EquipmentMovement], int]:
        """Получить историю перемещений"""
        query = self.db.query(EquipmentMovement).options(
            joinedload(EquipmentMovement.from_person),
            joinedload(EquipmentMovement.to_person),
            joinedload(EquipmentMovement.created_by)
        ).filter(
            EquipmentMovement.equipment_id == equipment_id
        )
        
        total = query.count()
        items = query.order_by(EquipmentMovement.created_at.desc()).offset(skip).limit(limit).all()
        
        return items, total
    
    def check_seals(
        self,
        equipment_ids: List[int],
        seal_status: str,
        notes: Optional[str] = None
    ) -> dict:
        """Массовая проверка пломб"""
        checked_count = 0
        damaged_count = 0
        missing_count = 0
        
        for eq_id in equipment_ids:
            equipment = self.get_by_id(eq_id)
            if equipment:
                equipment.seal_status = seal_status
                equipment.seal_check_date = datetime.now()
                
                if seal_status == "Повреждена":
                    damaged_count += 1
                elif seal_status == "Отсутствует":
                    missing_count += 1
                
                checked_count += 1
        
        self.db.commit()
        
        return {
            "checked_count": checked_count,
            "damaged_count": damaged_count,
            "missing_count": missing_count
        }
    
    def get_seal_issues(self) -> List[Equipment]:
        """Получить технику с проблемными пломбами"""
        return self.db.query(Equipment).filter(
            Equipment.is_active == True,
            Equipment.seal_status.in_(["Повреждена", "Отсутствует"])
        ).all()
    
    def get_statistics(self) -> dict:
        """Получить статистику по технике"""
        total = self.db.query(Equipment).filter(Equipment.is_active == True).count()
        
        by_type = {}
        type_stats = self.db.query(
            Equipment.equipment_type,
            func.count(Equipment.id)
        ).filter(
            Equipment.is_active == True
        ).group_by(Equipment.equipment_type).all()
        
        for eq_type, count in type_stats:
            by_type[eq_type] = count
        
        by_status = {}
        status_stats = self.db.query(
            Equipment.status,
            func.count(Equipment.id)
        ).filter(
            Equipment.is_active == True
        ).group_by(Equipment.status).all()
        
        for status, count in status_stats:
            by_status[status] = count
        
        seal_issues = self.db.query(Equipment).filter(
            Equipment.is_active == True,
            Equipment.seal_status.in_(["Повреждена", "Отсутствует"])
        ).count()
        
        return {
            "total_equipment": total,
            "by_type": by_type,
            "by_status": by_status,
            "seal_issues": seal_issues,
            "pending_movements": 0
        }


class StorageDeviceService:
    def __init__(self, db: Session):
        self.db = db
    
    def get_list(
        self,
        skip: int = 0,
        limit: int = 100,
        equipment_id: Optional[int] = None,
        status: Optional[str] = None,
        search: Optional[str] = None
    ) -> tuple[List[StorageDevice], int]:
        """Получить список носителей"""
        query = self.db.query(StorageDevice).options(
            joinedload(StorageDevice.equipment)
        ).filter(StorageDevice.is_active == True)
        
        if equipment_id:
            query = query.filter(StorageDevice.equipment_id == equipment_id)
        
        if status:
            query = query.filter(StorageDevice.status == status)
        
        if search:
            search = sanitize_html(search)
            search_filter = or_(
                StorageDevice.inventory_number.ilike(f"%{search}%"),
                StorageDevice.serial_number.ilike(f"%{search}%"),
                StorageDevice.manufacturer.ilike(f"%{search}%"),
                StorageDevice.model.ilike(f"%{search}%")
            )
            query = query.filter(search_filter)
        
        total = query.count()
        items = query.order_by(StorageDevice.inventory_number).offset(skip).limit(limit).all()
        
        return items, total
    
    def get_by_id(self, device_id: int) -> Optional[StorageDevice]:
        """Получить носитель по ID"""
        return self.db.query(StorageDevice).options(
            joinedload(StorageDevice.equipment)
        ).filter(
            StorageDevice.id == device_id,
            StorageDevice.is_active == True
        ).first()
    
    def create(self, device_data: StorageDeviceCreate) -> StorageDevice:
        """Создать запись о носителе"""
        try:
            device = StorageDevice(**device_data.model_dump())
            self.db.add(device)
            self.db.commit()
            self.db.refresh(device)
            return device
        except IntegrityError as e:
            self.db.rollback()
            if 'uq_storage_inventory' in str(e.orig):
                raise ValueError(f"Инвентарный номер {device_data.inventory_number} уже существует")
            raise ValueError(f"Ошибка при создании: {str(e)}")
    
    def update(self, device_id: int, device_data: StorageDeviceUpdate) -> Optional[StorageDevice]:
        """Обновить данные носителя"""
        device = self.get_by_id(device_id)
        if not device:
            return None
        
        update_data = device_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(device, field, value)
        
        self.db.commit()
        self.db.refresh(device)
        return device
    
    def delete(self, device_id: int) -> bool:
        """Мягкое удаление"""
        device = self.get_by_id(device_id)
        if not device:
            return False
        
        device.is_active = False
        self.db.commit()
        return True