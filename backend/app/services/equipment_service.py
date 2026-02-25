from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, func
from sqlalchemy.exc import IntegrityError
from typing import Optional, List
from datetime import datetime, timedelta
from app.models.equipment import Equipment, EquipmentMovement, StorageDevice
from app.schemas.equipment import (
    EquipmentCreate, EquipmentUpdate, MovementCreate,
    StorageDeviceCreate, StorageDeviceUpdate
)
from app.core.validators import sanitize_html
import logging

logger = logging.getLogger(__name__)


class EquipmentService:
    def __init__(self, db: Session):
        self.db = db

    def _apply_filters(self, query, equipment_type=None, status=None, search=None, is_personal=None):
        if equipment_type:
            query = query.filter(Equipment.equipment_type == equipment_type)
        if status:
            query = query.filter(Equipment.status == status)
        if is_personal is not None:
            query = query.filter(Equipment.is_personal == is_personal)
        if search:
            search_clean = sanitize_html(search)
            query = query.filter(or_(
                Equipment.inventory_number.ilike(f"%{search_clean}%"),
                Equipment.serial_number.ilike(f"%{search_clean}%"),
                Equipment.mni_serial_number.ilike(f"%{search_clean}%"),
                Equipment.manufacturer.ilike(f"%{search_clean}%"),
                Equipment.model.ilike(f"%{search_clean}%"),
                Equipment.current_location.ilike(f"%{search_clean}%"),
                Equipment.notes.ilike(f"%{search_clean}%"),
            ))
        return query

    def get_list(self, skip=0, limit=100, equipment_type=None, status=None, search=None, is_personal=None):
        query = (
            self.db.query(Equipment)
            .options(joinedload(Equipment.current_owner))
            .filter(Equipment.is_active == True)
        )
        query = self._apply_filters(query, equipment_type, status, search, is_personal)
        total = query.count()
        items = query.order_by(Equipment.inventory_number).offset(skip).limit(limit).all()
        return items, total

    def get_by_id(self, equipment_id: int) -> Optional[Equipment]:
        return (
            self.db.query(Equipment)
            .options(joinedload(Equipment.current_owner), joinedload(Equipment.storage_devices))
            .filter(Equipment.id == equipment_id, Equipment.is_active == True)
            .first()
        )

    def create(self, equipment_data: EquipmentCreate) -> Equipment:
        try:
            equipment = Equipment(**equipment_data.model_dump())
            self.db.add(equipment)
            self.db.commit()
            self.db.refresh(equipment)
            return equipment
        except IntegrityError as e:
            self.db.rollback()
            if "uq_equipment_inventory" in str(e.orig):
                raise ValueError(f"Инвентарный номер {equipment_data.inventory_number} уже существует")
            raise ValueError("Ошибка при создании")

    def update(self, equipment_id: int, equipment_data: EquipmentUpdate) -> Optional[Equipment]:
        equipment = self.get_by_id(equipment_id)
        if not equipment:
            return None
        try:
            for field, value in equipment_data.model_dump(exclude_unset=True).items():
                setattr(equipment, field, value)
            self.db.commit()
            self.db.refresh(equipment)
            return equipment
        except IntegrityError as e:
            self.db.rollback()
            if "uq_equipment_inventory" in str(e.orig):
                raise ValueError("Инвентарный номер уже существует")
            raise

    def delete(self, equipment_id: int) -> bool:
        equipment = self.get_by_id(equipment_id)
        if not equipment:
            return False
        equipment.is_active = False
        self.db.commit()
        return True

    def create_movement(self, movement_data: MovementCreate, created_by_id: int) -> EquipmentMovement:
        try:
            with self.db.begin_nested():
                equipment = (
                    self.db.query(Equipment)
                    .with_for_update()
                    .filter(Equipment.id == movement_data.equipment_id, Equipment.is_active == True)
                    .one_or_none()
                )
                if not equipment:
                    raise ValueError("Техника не найдена")

                pending = self.db.query(EquipmentMovement).filter(
                    EquipmentMovement.equipment_id == equipment.id,
                    EquipmentMovement.created_at > datetime.now() - timedelta(minutes=5),
                ).first()
                if pending:
                    raise ValueError("Перемещение уже выполняется")

                movement = EquipmentMovement(**movement_data.model_dump(), created_by_id=created_by_id)
                self.db.add(movement)
                equipment.current_location = movement_data.to_location
                equipment.current_owner_id = movement_data.to_person_id
                self.db.flush()

            self.db.commit()
            self.db.refresh(movement)
            return movement
        except Exception as e:
            self.db.rollback()
            logger.error(f"Movement creation error: {e}")
            raise

    def get_movement_history(self, equipment_id: int, skip: int = 0, limit: int = 50):
        query = (
            self.db.query(EquipmentMovement)
            .options(
                joinedload(EquipmentMovement.from_person),
                joinedload(EquipmentMovement.to_person),
                joinedload(EquipmentMovement.created_by),
            )
            .filter(EquipmentMovement.equipment_id == equipment_id)
        )
        total = query.count()
        items = query.order_by(EquipmentMovement.created_at.desc()).offset(skip).limit(limit).all()
        return items, total

    def get_statistics(self, equipment_type=None, status=None, search=None, is_personal=None) -> dict:
        base_query = self.db.query(Equipment).filter(Equipment.is_active == True)
        base_query = self._apply_filters(base_query, equipment_type, status, search, is_personal)
        total = base_query.count()

        status_query = self.db.query(Equipment.status, func.count(Equipment.id)).filter(Equipment.is_active == True)
        if equipment_type:
            status_query = status_query.filter(Equipment.equipment_type == equipment_type)
        if is_personal is not None:
            status_query = status_query.filter(Equipment.is_personal == is_personal)
        if search:
            search_clean = sanitize_html(search)
            status_query = status_query.filter(or_(
                Equipment.inventory_number.ilike(f"%{search_clean}%"),
                Equipment.serial_number.ilike(f"%{search_clean}%"),
                Equipment.mni_serial_number.ilike(f"%{search_clean}%"),
            ))
        by_status = dict(status_query.group_by(Equipment.status).all())

        type_query = self.db.query(Equipment.equipment_type, func.count(Equipment.id)).filter(Equipment.is_active == True)
        if status:
            type_query = type_query.filter(Equipment.status == status)
        if is_personal is not None:
            type_query = type_query.filter(Equipment.is_personal == is_personal)
        by_type = dict(type_query.group_by(Equipment.equipment_type).all())

        return {
            "total_equipment": total,
            "by_type": by_type,
            "by_status": by_status,
            "pending_movements": 0,
        }


class StorageDeviceService:
    def __init__(self, db: Session):
        self.db = db

    def get_list(self, skip=0, limit=100, equipment_id=None, status=None, search=None):
        query = (
            self.db.query(StorageDevice)
            .options(joinedload(StorageDevice.equipment))
            .filter(StorageDevice.is_active == True)
        )
        if equipment_id:
            query = query.filter(StorageDevice.equipment_id == equipment_id)
        if status:
            query = query.filter(StorageDevice.status == status)
        if search:
            search_clean = sanitize_html(search)
            query = query.filter(or_(
                StorageDevice.inventory_number.ilike(f"%{search_clean}%"),
                StorageDevice.serial_number.ilike(f"%{search_clean}%"),
                StorageDevice.manufacturer.ilike(f"%{search_clean}%"),
                StorageDevice.model.ilike(f"%{search_clean}%"),
            ))
        total = query.count()
        items = query.order_by(StorageDevice.inventory_number).offset(skip).limit(limit).all()
        return items, total

    def get_by_id(self, device_id: int) -> Optional[StorageDevice]:
        return (
            self.db.query(StorageDevice)
            .options(joinedload(StorageDevice.equipment))
            .filter(StorageDevice.id == device_id, StorageDevice.is_active == True)
            .first()
        )

    def create(self, device_data: StorageDeviceCreate) -> StorageDevice:
        try:
            device = StorageDevice(**device_data.model_dump())
            self.db.add(device)
            self.db.commit()
            self.db.refresh(device)
            return device
        except IntegrityError as e:
            self.db.rollback()
            if "uq_storage_inventory" in str(e.orig):
                raise ValueError(f"Инвентарный номер {device_data.inventory_number} уже существует")
            raise ValueError("Ошибка при создании")

    def update(self, device_id: int, device_data: StorageDeviceUpdate) -> Optional[StorageDevice]:
        device = self.get_by_id(device_id)
        if not device:
            return None
        for field, value in device_data.model_dump(exclude_unset=True).items():
            setattr(device, field, value)
        self.db.commit()
        self.db.refresh(device)
        return device

    def delete(self, device_id: int) -> bool:
        device = self.get_by_id(device_id)
        if not device:
            return False
        device.is_active = False
        self.db.commit()
        return True