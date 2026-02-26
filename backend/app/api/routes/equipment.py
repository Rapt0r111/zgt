from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from app.core.database import get_db
from app.api.deps import get_current_user, require_admin, verify_csrf
from app.models.user import User
from app.schemas.equipment import (
    EquipmentCreate, EquipmentUpdate, EquipmentResponse, EquipmentListResponse,
    MovementCreate, MovementResponse, MovementListResponse,
    StorageDeviceCreate, StorageDeviceUpdate, StorageDeviceResponse, StorageDeviceListResponse,
    EquipmentStats
)
from app.services.equipment_service import EquipmentService, StorageDeviceService


def _enrich_equipment(equipment) -> dict:
    """DRY: обогащение ответа данными владельца."""
    return {
        **equipment.__dict__,
        "current_owner_name": equipment.current_owner.full_name if equipment.current_owner else None,
        "current_owner_rank": equipment.current_owner.rank if equipment.current_owner else None,
    }


def _enrich_device(device) -> dict:
    return {
        **device.__dict__,
        "equipment_inventory_number": device.equipment.inventory_number if device.equipment else None,
    }


def _enrich_movement(movement) -> dict:
    return {
        **movement.__dict__,
        "from_person_name": movement.from_person.full_name if movement.from_person else None,
        "to_person_name": movement.to_person.full_name if movement.to_person else None,
        "created_by_username": movement.created_by.username if movement.created_by else None,
    }


# ── Storage Devices sub-router ──────────────────────────────────────────────

storage_router = APIRouter(prefix="/storage-devices", tags=["storage-devices"])


@storage_router.get("/", response_model=StorageDeviceListResponse)
async def list_storage_devices(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    equipment_id: Optional[int] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    service = StorageDeviceService(db)
    items, total = await service.get_list(skip=skip, limit=limit, equipment_id=equipment_id, status=status, search=search)
    return StorageDeviceListResponse(total=total, items=[_enrich_device(d) for d in items])


@storage_router.post("/", response_model=StorageDeviceResponse, status_code=status.HTTP_201_CREATED)
async def create_storage_device(
    device: StorageDeviceCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(verify_csrf),
):
    service = StorageDeviceService(db)
    try:
        return _enrich_device(await service.create(device))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@storage_router.get("/{device_id}", response_model=StorageDeviceResponse)
async def get_storage_device(
    device_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    service = StorageDeviceService(db)
    device = await service.get_by_id(device_id)
    if not device:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Носитель не найден")
    return _enrich_device(device)


@storage_router.put("/{device_id}", response_model=StorageDeviceResponse)
async def update_storage_device(
    device_id: int,
    device_data: StorageDeviceUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(verify_csrf),
):
    service = StorageDeviceService(db)
    device = await service.update(device_id, device_data)
    if not device:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Носитель не найден")
    return _enrich_device(device)


@storage_router.delete("/{device_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_storage_device(
    device_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(verify_csrf),
):
    service = StorageDeviceService(db)
    if not await service.delete(device_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Носитель не найден")


# ── Equipment router ─────────────────────────────────────────────────────────

router = APIRouter(prefix="/equipment", tags=["equipment"])

# ВАЖНО: статичные маршруты ДО параметрических /{equipment_id}
router.include_router(storage_router)


@router.get("/", response_model=EquipmentListResponse)
async def list_equipment(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    equipment_type: Optional[str] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    is_personal: Optional[bool] = None,  # <-- добавлено
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    service = EquipmentService(db)
    items, total = await service.get_list(
        skip=skip, limit=limit,
        equipment_type=equipment_type, status=status,
        search=search, is_personal=is_personal,
    )
    return EquipmentListResponse(total=total, items=[_enrich_equipment(e) for e in items])


@router.post("/", response_model=EquipmentResponse, status_code=status.HTTP_201_CREATED)
async def create_equipment(
    equipment: EquipmentCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(verify_csrf),
):
    service = EquipmentService(db)
    try:
        new_equipment = await service.create(equipment)
        await db.refresh(new_equipment, ['current_owner'])
        return _enrich_equipment(new_equipment)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/stats", response_model=EquipmentStats)
async def get_statistics(
    equipment_type: Optional[str] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    is_personal: Optional[bool] = None,  # <-- добавлено
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return await EquipmentService(db).get_statistics(
        equipment_type=equipment_type, status=status,
        search=search, is_personal=is_personal,
    )


@router.post("/movements", response_model=MovementResponse, status_code=status.HTTP_201_CREATED)
async def create_movement(
    movement: MovementCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(verify_csrf),
):
    service = EquipmentService(db)
    try:
        return _enrich_movement(await service.create_movement(movement, current_user.id))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/{equipment_id}", response_model=EquipmentResponse)
async def get_equipment(
    equipment_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    service = EquipmentService(db)
    equipment = await service.get_by_id(equipment_id)
    if not equipment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Техника не найдена")
    return _enrich_equipment(equipment)


@router.put("/{equipment_id}", response_model=EquipmentResponse)
async def update_equipment(
    equipment_id: int,
    equipment_data: EquipmentUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(verify_csrf),
):
    service = EquipmentService(db)
    equipment = await service.update(equipment_id, equipment_data)
    if not equipment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Техника не найдена")
    return _enrich_equipment(equipment)


@router.delete("/{equipment_id}")
async def delete_equipment(
    equipment_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    if not await EquipmentService(db).delete(equipment_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Техника не найдена")
    return {"message": "Техника удалена"}


@router.get("/{equipment_id}/movements", response_model=MovementListResponse)
async def get_movement_history(
    equipment_id: int,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    service = EquipmentService(db)
    items, total = await service.get_movement_history(equipment_id, skip, limit)
    return MovementListResponse(total=total, items=[_enrich_movement(m) for m in items])