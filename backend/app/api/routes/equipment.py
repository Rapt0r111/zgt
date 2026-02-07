from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import Optional

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.schemas.equipment import (
    EquipmentCreate, EquipmentUpdate, EquipmentResponse, EquipmentListResponse,
    MovementCreate, MovementResponse, MovementListResponse,
    StorageDeviceCreate, StorageDeviceUpdate, StorageDeviceResponse, StorageDeviceListResponse,
    SealCheckRequest, SealCheckResponse, EquipmentStats
)
from app.services.equipment_service import EquipmentService, StorageDeviceService

router = APIRouter(prefix="/equipment", tags=["equipment"])

# ============ EQUIPMENT ENDPOINTS ============

@router.get("/", response_model=EquipmentListResponse)
async def list_equipment(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    equipment_type: Optional[str] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Получить список техники"""
    service = EquipmentService(db)
    items, total = service.get_list(
        skip=skip,
        limit=limit,
        equipment_type=equipment_type,
        status=status,
        search=search
    )
    
    # Добавляем информацию о владельце
    response_items = []
    for equipment in items:
        eq_dict = {
            **equipment.__dict__,
            "current_owner_name": equipment.current_owner.full_name if equipment.current_owner else None,
            "current_owner_rank": equipment.current_owner.rank if equipment.current_owner else None,
        }
        response_items.append(eq_dict)
    
    return EquipmentListResponse(total=total, items=response_items)


@router.post("/", response_model=EquipmentResponse, status_code=status.HTTP_201_CREATED)
async def create_equipment(
    equipment: EquipmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Добавить технику"""
    service = EquipmentService(db)
    try:
        new_equipment = service.create(equipment)
        return {
            **new_equipment.__dict__,
            "current_owner_name": new_equipment.current_owner.full_name if new_equipment.current_owner else None,
            "current_owner_rank": new_equipment.current_owner.rank if new_equipment.current_owner else None,
        }
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/{equipment_id}", response_model=EquipmentResponse)
async def get_equipment(
    equipment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Получить данные техники"""
    service = EquipmentService(db)
    equipment = service.get_by_id(equipment_id)
    
    if not equipment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Техника не найдена"
        )
    
    return {
        **equipment.__dict__,
        "current_owner_name": equipment.current_owner.full_name if equipment.current_owner else None,
        "current_owner_rank": equipment.current_owner.rank if equipment.current_owner else None,
    }


@router.put("/{equipment_id}", response_model=EquipmentResponse)
async def update_equipment(
    equipment_id: int,
    equipment_data: EquipmentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Обновить данные техники"""
    service = EquipmentService(db)
    equipment = service.update(equipment_id, equipment_data)
    
    if not equipment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Техника не найдена"
        )
    
    return {
        **equipment.__dict__,
        "current_owner_name": equipment.current_owner.full_name if equipment.current_owner else None,
        "current_owner_rank": equipment.current_owner.rank if equipment.current_owner else None,
    }


@router.delete("/{equipment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_equipment(
    equipment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Удалить технику"""
    service = EquipmentService(db)
    success = service.delete(equipment_id)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Техника не найдена"
        )


# ============ MOVEMENT ENDPOINTS ============

@router.post("/movements", response_model=MovementResponse, status_code=status.HTTP_201_CREATED)
async def create_movement(
    movement: MovementCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Создать перемещение техники"""
    service = EquipmentService(db)
    try:
        new_movement = service.create_movement(movement, current_user.id)
        return {
            **new_movement.__dict__,
            "from_person_name": new_movement.from_person.full_name if new_movement.from_person else None,
            "to_person_name": new_movement.to_person.full_name if new_movement.to_person else None,
            "created_by_username": new_movement.created_by.username if new_movement.created_by else None,
        }
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/{equipment_id}/movements", response_model=MovementListResponse)
async def get_movement_history(
    equipment_id: int,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Получить историю перемещений"""
    service = EquipmentService(db)
    items, total = service.get_movement_history(equipment_id, skip, limit)
    
    response_items = []
    for movement in items:
        mv_dict = {
            **movement.__dict__,
            "from_person_name": movement.from_person.full_name if movement.from_person else None,
            "to_person_name": movement.to_person.full_name if movement.to_person else None,
            "created_by_username": movement.created_by.username if movement.created_by else None,
        }
        response_items.append(mv_dict)
    
    return MovementListResponse(total=total, items=response_items)


# ============ SEAL CHECK ENDPOINTS ============

@router.post("/seals/check", response_model=SealCheckResponse)
async def check_seals(
    request: SealCheckRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Массовая проверка пломб"""
    service = EquipmentService(db)
    result = service.check_seals(
        equipment_ids=request.equipment_ids,
        seal_status=request.seal_status,
        notes=request.notes
    )
    
    return {
        **result,
        "message": f"Проверено {result['checked_count']} единиц техники"
    }


@router.get("/seals/issues")
async def get_seal_issues(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Получить технику с проблемными пломбами"""
    service = EquipmentService(db)
    issues = service.get_seal_issues()
    
    return {
        "total": len(issues),
        "items": [
            {
                "id": eq.id,
                "inventory_number": eq.inventory_number,
                "model": eq.model,
                "seal_status": eq.seal_status,
                "seal_number": eq.seal_number,
                "current_location": eq.current_location
            }
            for eq in issues
        ]
    }


# ============ STATISTICS ============

@router.get("/stats", response_model=EquipmentStats)
async def get_statistics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Получить статистику по технике"""
    service = EquipmentService(db)
    return service.get_statistics()


# ============ STORAGE DEVICES ENDPOINTS ============

storage_router = APIRouter(prefix="/storage-devices", tags=["storage-devices"])

@storage_router.get("/", response_model=StorageDeviceListResponse)
async def list_storage_devices(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    equipment_id: Optional[int] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Получить список носителей"""
    service = StorageDeviceService(db)
    items, total = service.get_list(
        skip=skip,
        limit=limit,
        equipment_id=equipment_id,
        status=status,
        search=search
    )
    
    response_items = []
    for device in items:
        dev_dict = {
            **device.__dict__,
            "equipment_inventory_number": device.equipment.inventory_number if device.equipment else None,
        }
        response_items.append(dev_dict)
    
    return StorageDeviceListResponse(total=total, items=response_items)


@storage_router.post("/", response_model=StorageDeviceResponse, status_code=status.HTTP_201_CREATED)
async def create_storage_device(
    device: StorageDeviceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Добавить носитель"""
    service = StorageDeviceService(db)
    try:
        new_device = service.create(device)
        return {
            **new_device.__dict__,
            "equipment_inventory_number": new_device.equipment.inventory_number if new_device.equipment else None,
        }
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@storage_router.get("/{device_id}", response_model=StorageDeviceResponse)
async def get_storage_device(
    device_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Получить данные носителя"""
    service = StorageDeviceService(db)
    device = service.get_by_id(device_id)
    
    if not device:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Носитель не найден"
        )
    
    return {
        **device.__dict__,
        "equipment_inventory_number": device.equipment.inventory_number if device.equipment else None,
    }


@storage_router.put("/{device_id}", response_model=StorageDeviceResponse)
async def update_storage_device(
    device_id: int,
    device_data: StorageDeviceUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Обновить данные носителя"""
    service = StorageDeviceService(db)
    device = service.update(device_id, device_data)
    
    if not device:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Носитель не найден"
        )
    
    return {
        **device.__dict__,
        "equipment_inventory_number": device.equipment.inventory_number if device.equipment else None,
    }


@storage_router.delete("/{device_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_storage_device(
    device_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Удалить носитель"""
    service = StorageDeviceService(db)
    success = service.delete(device_id)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Носитель не найден"
        )

# Добавить storage_router к основному router
router.include_router(storage_router)
