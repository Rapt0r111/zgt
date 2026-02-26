from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload
from sqlalchemy import or_, func, select
from sqlalchemy.exc import IntegrityError
from typing import Optional, List
from datetime import datetime, timedelta
import logging

from app.models.equipment import Equipment, EquipmentMovement, StorageDevice
from app.schemas.equipment import (
    EquipmentCreate, EquipmentUpdate, MovementCreate,
    StorageDeviceCreate, StorageDeviceUpdate
)
from app.core.validators import sanitize_html

logger = logging.getLogger(__name__)

def _equipment_search_filter(search: str):
    s = sanitize_html(search)
    return or_(
        Equipment.inventory_number.ilike(f"%{s}%"),
        Equipment.serial_number.ilike(f"%{s}%"),
        Equipment.mni_serial_number.ilike(f"%{s}%"),
        Equipment.manufacturer.ilike(f"%{s}%"),
        Equipment.model.ilike(f"%{s}%"),
        Equipment.equipment_type.ilike(f"%{s}%"),
        Equipment.current_location.ilike(f"%{s}%"),
        Equipment.notes.ilike(f"%{s}%"),
    )

class EquipmentService:
    def __init__(self, db: AsyncSession):
        self.db = db

    def _apply_filters(self, stmt, equipment_type=None, status=None, search=None, is_personal=None):
        if equipment_type:
            stmt = stmt.where(Equipment.equipment_type == equipment_type)
        if status:
            stmt = stmt.where(Equipment.status == status)
        if is_personal is not None:
            stmt = stmt.where(Equipment.is_personal == is_personal)
        if search:
            stmt = stmt.where(_equipment_search_filter(search))
        return stmt

    async def get_list(self, skip=0, limit=100, equipment_type=None, status=None, search=None, is_personal=None):
        # Базовый запрос
        stmt = (
            select(Equipment)
            .options(joinedload(Equipment.current_owner))
            .where(Equipment.is_active == True)
        )
        stmt = self._apply_filters(stmt, equipment_type, status, search, is_personal)
        
        # Получаем общее количество (в асинхронном стиле это отдельный запрос)
        count_stmt = select(func.count()).select_from(stmt.subquery())
        total = await self.db.scalar(count_stmt) or 0
        
        # Получаем элементы
        stmt = stmt.order_by(Equipment.inventory_number).offset(skip).limit(limit)
        result = await self.db.execute(stmt)
        items = result.scalars().all()
        
        return items, total

    async def get_by_id(self, equipment_id: int) -> Optional[Equipment]:
        stmt = (
            select(Equipment)
            .options(joinedload(Equipment.current_owner), joinedload(Equipment.storage_devices))
            .where(Equipment.id == equipment_id, Equipment.is_active == True)
        )
        result = await self.db.execute(stmt)
        return result.scalars().first()

    async def create(self, equipment_data: EquipmentCreate) -> Equipment:
        try:
            equipment = Equipment(**equipment_data.model_dump())
            self.db.add(equipment)
            await self.db.commit()
            await self.db.refresh(equipment)
            return equipment
        except IntegrityError as e:
            await self.db.rollback()
            if "uq_equipment_inventory" in str(e.orig):
                raise ValueError(f"Инвентарный номер {equipment_data.inventory_number} уже существует")
            raise ValueError("Ошибка при создании")

    async def update(self, equipment_id: int, equipment_data: EquipmentUpdate) -> Optional[Equipment]:
        equipment = await self.get_by_id(equipment_id)
        if not equipment:
            return None
        try:
            for field, value in equipment_data.model_dump(exclude_unset=True).items():
                setattr(equipment, field, value)
            await self.db.commit()
            await self.db.refresh(equipment)
            return equipment
        except IntegrityError as e:
            await self.db.rollback()
            if "uq_equipment_inventory" in str(e.orig):
                raise ValueError("Инвентарный номер уже существует")
            raise

    async def delete(self, equipment_id: int) -> bool:
        equipment = await self.get_by_id(equipment_id)
        if not equipment:
            return False
        equipment.is_active = False
        await self.db.commit()
        return True

    async def create_movement(self, movement_data: MovementCreate, created_by_id: int) -> EquipmentMovement:
        try:
            # В асинхронной алхимии begin_nested используется как async context manager
            async with self.db.begin_nested():
                stmt = (
                    select(Equipment)
                    .with_for_update()
                    .where(Equipment.id == movement_data.equipment_id, Equipment.is_active == True)
                )
                result = await self.db.execute(stmt)
                equipment = result.scalars().one_or_none()
                
                if not equipment:
                    raise ValueError("Техника не найдена")

                # Проверка на дублирование перемещения
                check_stmt = select(EquipmentMovement).where(
                    EquipmentMovement.equipment_id == equipment.id,
                    EquipmentMovement.created_at > datetime.now() - timedelta(minutes=5)
                )
                check_res = await self.db.execute(check_stmt)
                if check_res.scalars().first():
                    raise ValueError("Перемещение уже выполняется")

                movement = EquipmentMovement(**movement_data.model_dump(), created_by_id=created_by_id)
                self.db.add(movement)
                
                equipment.current_location = movement_data.to_location
                equipment.current_owner_id = movement_data.to_person_id
                await self.db.flush()

            await self.db.commit()
            await self.db.refresh(movement)
            return movement
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Movement creation error: {e}")
            raise

    async def get_movement_history(self, equipment_id: int, skip: int = 0, limit: int = 50):
        stmt = (
            select(EquipmentMovement)
            .options(
                joinedload(EquipmentMovement.from_person),
                joinedload(EquipmentMovement.to_person),
                joinedload(EquipmentMovement.created_by),
            )
            .where(EquipmentMovement.equipment_id == equipment_id)
        )
        
        count_stmt = select(func.count()).select_from(stmt.subquery())
        total = await self.db.scalar(count_stmt) or 0
        
        stmt = stmt.order_by(EquipmentMovement.created_at.desc()).offset(skip).limit(limit)
        result = await self.db.execute(stmt)
        items = result.scalars().all()
        
        return items, total

    async def get_statistics(self, equipment_type=None, status=None, search=None, is_personal=None) -> dict:
        # 1. Total count
        base_stmt = select(Equipment).where(Equipment.is_active == True)
        base_stmt = self._apply_filters(base_stmt, equipment_type, status, search, is_personal)
        total = await self.db.scalar(select(func.count()).select_from(base_stmt.subquery())) or 0

        # 2. By status
        status_stmt = select(Equipment.status, func.count(Equipment.id)).where(Equipment.is_active == True)
        if equipment_type:
            status_stmt = status_stmt.where(Equipment.equipment_type == equipment_type)
        if is_personal is not None:
            status_stmt = status_stmt.where(Equipment.is_personal == is_personal)
        if search:
            status_stmt = status_stmt.where(_equipment_search_filter(search))
        
        status_res = await self.db.execute(status_stmt.group_by(Equipment.status))
        by_status = dict(status_res.all())

        # 3. By type
        type_stmt = select(Equipment.equipment_type, func.count(Equipment.id)).where(Equipment.is_active == True)
        if status:
            type_stmt = type_stmt.where(Equipment.status == status)
        if is_personal is not None:
            type_stmt = type_stmt.where(Equipment.is_personal == is_personal)
        if search:
            type_stmt = type_stmt.where(_equipment_search_filter(search))
            
        type_res = await self.db.execute(type_stmt.group_by(Equipment.equipment_type))
        by_type = dict(type_res.all())

        return {
            "total_equipment": total,
            "by_type": by_type,
            "by_status": by_status,
            "pending_movements": 0,
        }


class StorageDeviceService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_list(self, skip=0, limit=100, equipment_id=None, status=None, search=None):
        stmt = (
            select(StorageDevice)
            .options(joinedload(StorageDevice.equipment))
            .where(StorageDevice.is_active == True)
        )
        if equipment_id:
            stmt = stmt.where(StorageDevice.equipment_id == equipment_id)
        if status:
            stmt = stmt.where(StorageDevice.status == status)
        if search:
            search_clean = sanitize_html(search)
            stmt = stmt.where(or_(
                StorageDevice.inventory_number.ilike(f"%{search_clean}%"),
                StorageDevice.serial_number.ilike(f"%{search_clean}%"),
                StorageDevice.manufacturer.ilike(f"%{search_clean}%"),
                StorageDevice.model.ilike(f"%{search_clean}%"),
                StorageDevice.device_type.ilike(f"%{search_clean}%"),
                StorageDevice.location.ilike(f"%{search_clean}%"),
                StorageDevice.notes.ilike(f"%{search_clean}%"),
            ))
            
        total = await self.db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
        
        stmt = stmt.order_by(StorageDevice.inventory_number).offset(skip).limit(limit)
        result = await self.db.execute(stmt)
        items = result.scalars().all()
        return items, total

    async def get_by_id(self, device_id: int) -> Optional[StorageDevice]:
        stmt = (
            select(StorageDevice)
            .options(joinedload(StorageDevice.equipment))
            .where(StorageDevice.id == device_id, StorageDevice.is_active == True)
        )
        result = await self.db.execute(stmt)
        return result.scalars().first()

    async def create(self, device_data: StorageDeviceCreate) -> StorageDevice:
        try:
            device = StorageDevice(**device_data.model_dump())
            self.db.add(device)
            await self.db.commit()
            await self.db.refresh(device)
            return device
        except IntegrityError as e:
            await self.db.rollback()
            if "uq_storage_inventory" in str(e.orig):
                raise ValueError(f"Инвентарный номер {device_data.inventory_number} уже существует")
            raise ValueError("Ошибка при создании")

    async def update(self, device_id: int, device_data: StorageDeviceUpdate) -> Optional[StorageDevice]:
        device = await self.get_by_id(device_id)
        if not device:
            return None
        for field, value in device_data.model_dump(exclude_unset=True).items():
            setattr(device, field, value)
        await self.db.commit()
        await self.db.refresh(device)
        return device

    async def delete(self, device_id: int) -> bool:
        device = await self.get_by_id(device_id)
        if not device:
            return False
        device.is_active = False
        await self.db.commit()
        return True