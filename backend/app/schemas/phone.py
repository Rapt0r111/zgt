from pydantic import BaseModel, Field, field_validator # Добавьте field_validator
from typing import Optional
from datetime import datetime

class PhoneBase(BaseModel):
    owner_id: int
    model: Optional[str] = Field(None, max_length=255)
    color: Optional[str] = Field(None, max_length=50)
    imei_1: Optional[str] = Field(None, max_length=15)
    imei_2: Optional[str] = Field(None, max_length=15)
    serial_number: Optional[str] = Field(None, max_length=100)
    has_camera: bool = True
    has_recorder: bool = True
    storage_location: Optional[str] = Field(None, max_length=100)
    status: str = Field(default="Выдан", max_length=50)

class PhoneCreate(PhoneBase):
    pass

class PhoneUpdate(BaseModel):
    owner_id: Optional[int] = None
    model: Optional[str] = None
    color: Optional[str] = None
    imei_1: Optional[str] = None
    imei_2: Optional[str] = None
    serial_number: Optional[str] = None
    has_camera: Optional[bool] = None
    has_recorder: Optional[bool] = None
    storage_location: Optional[str] = None
    status: Optional[str] = None

class PhoneResponse(PhoneBase):
    id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime
    
    owner_full_name: Optional[str] = None
    owner_rank: Optional[str] = None
    
    @field_validator("owner_full_name", mode="before")
    @classmethod
    def get_owner_name(cls, v, info):
        # Если поле пустое, пробуем достать из связанного объекта owner
        if v is None and info.data.get('owner'):
             return info.data['owner'].full_name
        return v

    class Config:
        from_attributes = True

class PhoneListResponse(BaseModel):
    total: int
    items: list[PhoneResponse]

# Схемы для массовых операций
class BatchCheckinRequest(BaseModel):
    phone_ids: list[int] = Field(..., min_length=1)

class BatchCheckoutRequest(BaseModel):
    phone_ids: list[int] = Field(..., min_length=1)

class PhoneStatusReport(BaseModel):
    total_phones: int
    checked_in: int
    checked_out: int
    phones_not_submitted: list[PhoneResponse]