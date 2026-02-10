from pydantic import BaseModel, Field, field_validator
from typing import Optional
from datetime import datetime
from app.core.validators import validate_date_range

class PersonnelBase(BaseModel):
    full_name: str = Field(..., min_length=1, max_length=255)
    rank: Optional[str] = Field(None, max_length=100)
    position: Optional[str] = Field(None, max_length=255)
    unit: Optional[str] = Field(None, max_length=100)
    personal_number: Optional[str] = Field(None, max_length=50)
    status: str = Field(default="active", max_length=50)

class PersonnelCreate(PersonnelBase):
    pass

class PersonnelUpdate(BaseModel):
    full_name: Optional[str] = Field(None, min_length=1, max_length=255)
    rank: Optional[str] = None
    position: Optional[str] = None
    unit: Optional[str] = None
    personal_number: Optional[str] = None
    status: Optional[str] = None

class PersonnelResponse(PersonnelBase):
    id: int
    rank_priority: Optional[int] = None
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class PersonnelListResponse(BaseModel):
    total: int
    items: list[PersonnelResponse]