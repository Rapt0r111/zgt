from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List

class PersonnelBase(BaseModel):
    full_name: str
    rank: Optional[str] = None
    rank_priority: Optional[int] = None
    position: Optional[str] = None
    platoon: Optional[str] = None
    personal_number: Optional[str] = None
    service_number: Optional[str] = None
    security_clearance_level: Optional[int] = Field(None, ge=1, le=3)
    clearance_order_number: Optional[str] = None
    clearance_expiry_date: Optional[datetime] = None
    status: str = "В строю"

class PersonnelCreate(PersonnelBase):
    pass

class PersonnelUpdate(BaseModel):
    full_name: Optional[str] = None
    rank: Optional[str] = None
    rank_priority: Optional[int] = None
    position: Optional[str] = None
    platoon: Optional[str] = None
    personal_number: Optional[str] = None
    service_number: Optional[str] = None
    security_clearance_level: Optional[int] = Field(None, ge=1, le=3)
    clearance_order_number: Optional[str] = None
    clearance_expiry_date: Optional[datetime] = None
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
    items: List[PersonnelResponse]