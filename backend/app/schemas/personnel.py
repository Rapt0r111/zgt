from pydantic import BaseModel, Field, field_validator
from typing import Optional
from datetime import datetime
from datetime import date as date_type

class PersonnelBase(BaseModel):
    full_name: str = Field(..., min_length=1, max_length=255)
    rank: Optional[str] = Field(None, max_length=100)
    position: Optional[str] = Field(None, max_length=255)
    unit: Optional[str] = Field(None, max_length=100)
    personal_number: Optional[str] = Field(None, max_length=50)
    service_number: Optional[str] = Field(None, max_length=50)
    security_clearance_level: Optional[int] = Field(None, ge=1, le=3)
    clearance_order_number: Optional[str] = Field(None, max_length=100)
    clearance_expiry_date: Optional[date_type] = None
    status: str = Field(default="В строю", max_length=50)

class PersonnelCreate(PersonnelBase):
    @field_validator('clearance_expiry_date')
    @classmethod
    def validate_date(cls, v):
        if v and v < date_type(1900, 1, 1):
            raise ValueError('Дата не может быть раньше 1900 года')
        return v

class PersonnelUpdate(BaseModel):
    full_name: Optional[str] = Field(None, min_length=1, max_length=255)
    rank: Optional[str] = None
    position: Optional[str] = None
    unit: Optional[str] = None
    personal_number: Optional[str] = None
    service_number: Optional[str] = None
    security_clearance_level: Optional[int] = Field(None, ge=1, le=3)
    clearance_order_number: Optional[str] = None
    clearance_expiry_date: Optional[date_type] = None
    status: Optional[str] = None

class PersonnelResponse(PersonnelBase):
    id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class PersonnelListResponse(BaseModel):
    total: int
    items: list[PersonnelResponse]