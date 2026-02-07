from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

# ============ EQUIPMENT SCHEMAS ============

class EquipmentBase(BaseModel):
    equipment_type: str = Field(..., max_length=50)
    inventory_number: str = Field(..., max_length=100)
    serial_number: Optional[str] = Field(None, max_length=100)
    mni_serial_number: Optional[str] = Field(None, max_length=100)
    manufacturer: Optional[str] = Field(None, max_length=100)
    model: Optional[str] = Field(None, max_length=255)
    cpu: Optional[str] = Field(None, max_length=255)
    ram_gb: Optional[int] = None
    storage_type: Optional[str] = Field(None, max_length=50)
    storage_capacity_gb: Optional[int] = None
    has_optical_drive: bool = False
    has_card_reader: bool = False
    operating_system: Optional[str] = Field(None, max_length=100)
    current_owner_id: Optional[int] = None
    current_location: Optional[str] = Field(None, max_length=255)
    seal_number: Optional[str] = Field(None, max_length=100)
    seal_install_date: Optional[datetime] = None
    seal_status: str = Field(default="Исправна", max_length=50)
    seal_check_date: Optional[datetime] = None
    status: str = Field(default="В работе", max_length=50)
    notes: Optional[str] = None

class EquipmentCreate(EquipmentBase):
    pass

class EquipmentUpdate(BaseModel):
    equipment_type: Optional[str] = None
    inventory_number: Optional[str] = None
    serial_number: Optional[str] = None
    mni_serial_number: Optional[str] = None
    manufacturer: Optional[str] = None
    model: Optional[str] = None
    cpu: Optional[str] = None
    ram_gb: Optional[int] = None
    storage_type: Optional[str] = None
    storage_capacity_gb: Optional[int] = None
    has_optical_drive: Optional[bool] = None
    has_card_reader: Optional[bool] = None
    operating_system: Optional[str] = None
    current_owner_id: Optional[int] = None
    current_location: Optional[str] = None
    seal_number: Optional[str] = None
    seal_install_date: Optional[datetime] = None
    seal_status: Optional[str] = None
    seal_check_date: Optional[datetime] = None
    status: Optional[str] = None
    notes: Optional[str] = None

class EquipmentResponse(EquipmentBase):
    id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime
    current_owner_name: Optional[str] = None
    current_owner_rank: Optional[str] = None
    
    class Config:
        from_attributes = True

class EquipmentListResponse(BaseModel):
    total: int
    items: list[EquipmentResponse]


# ============ MOVEMENT SCHEMAS ============

class MovementBase(BaseModel):
    equipment_id: int
    from_location: Optional[str] = Field(None, max_length=255)
    to_location: str = Field(..., max_length=255)
    from_person_id: Optional[int] = None
    to_person_id: Optional[int] = None
    movement_type: str = Field(..., max_length=50)
    document_number: Optional[str] = Field(None, max_length=100)
    document_date: Optional[datetime] = None
    reason: Optional[str] = None
    seal_number_before: Optional[str] = Field(None, max_length=100)
    seal_number_after: Optional[str] = Field(None, max_length=100)
    seal_status: Optional[str] = Field(None, max_length=50)

class MovementCreate(MovementBase):
    pass

class MovementResponse(MovementBase):
    id: int
    created_at: datetime
    from_person_name: Optional[str] = None
    to_person_name: Optional[str] = None
    created_by_username: Optional[str] = None
    
    class Config:
        from_attributes = True

class MovementListResponse(BaseModel):
    total: int
    items: list[MovementResponse]


# ============ STORAGE DEVICE SCHEMAS ============

class StorageDeviceBase(BaseModel):
    equipment_id: Optional[int] = None
    device_type: str = Field(..., max_length=50)
    inventory_number: str = Field(..., max_length=100)
    serial_number: Optional[str] = Field(None, max_length=100)
    manufacturer: Optional[str] = Field(None, max_length=100)
    model: Optional[str] = Field(None, max_length=255)
    capacity_gb: Optional[int] = None
    interface: Optional[str] = Field(None, max_length=50)
    status: str = Field(default="В работе", max_length=50)
    location: Optional[str] = Field(None, max_length=255)
    notes: Optional[str] = None

class StorageDeviceCreate(StorageDeviceBase):
    pass

class StorageDeviceUpdate(BaseModel):
    equipment_id: Optional[int] = None
    device_type: Optional[str] = None
    inventory_number: Optional[str] = None
    serial_number: Optional[str] = None
    manufacturer: Optional[str] = None
    model: Optional[str] = None
    capacity_gb: Optional[int] = None
    interface: Optional[str] = None
    status: Optional[str] = None
    location: Optional[str] = None
    notes: Optional[str] = None

class StorageDeviceResponse(StorageDeviceBase):
    id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime
    equipment_inventory_number: Optional[str] = None
    
    class Config:
        from_attributes = True

class StorageDeviceListResponse(BaseModel):
    total: int
    items: list[StorageDeviceResponse]


# ============ SEAL CHECK SCHEMAS ============

class SealCheckRequest(BaseModel):
    """Запрос на проверку пломбы"""
    equipment_ids: list[int] = Field(..., min_length=1)
    seal_status: str = Field(..., max_length=50)  # Исправна/Повреждена/Отсутствует
    notes: Optional[str] = None

class SealCheckResponse(BaseModel):
    """Результат проверки пломб"""
    checked_count: int
    damaged_count: int
    missing_count: int
    message: str


# ============ STATISTICS SCHEMAS ============

class EquipmentStats(BaseModel):
    """Статистика по технике"""
    total_equipment: int
    by_type: dict[str, int]  # {"АРМ": 15, "Ноутбук": 8}
    by_status: dict[str, int]  # {"В работе": 20, "На складе": 3}
    seal_issues: int  # Количество проблем с пломбами
    pending_movements: int  # Ожидающие перемещения