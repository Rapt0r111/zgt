from pydantic import BaseModel, Field, field_validator
from typing import Optional
from datetime import datetime

class StorageAndPassBase(BaseModel):
    asset_type: str = Field(..., pattern='^(flash_drive|electronic_pass)$')
    serial_number: str = Field(..., min_length=1, max_length=100)
    model: Optional[str] = Field(None, max_length=255)
    manufacturer: Optional[str] = Field(None, max_length=100)
    status: str = Field(default='stock', pattern='^(in_use|stock|broken|lost)$')
    assigned_to_id: Optional[int] = None
    capacity_gb: Optional[int] = Field(None, ge=1, le=10000)
    access_level: Optional[int] = Field(None, ge=1, le=10)
    notes: Optional[str] = None
    
    @field_validator('capacity_gb')
    @classmethod
    def validate_flash_drive_capacity(cls, v, info):
        if info.data.get('asset_type') == 'flash_drive' and not v:
            raise ValueError('capacity_gb обязателен для флешек')
        return v
    
    @field_validator('access_level')
    @classmethod
    def validate_pass_access(cls, v, info):
        if info.data.get('asset_type') == 'electronic_pass' and not v:
            raise ValueError('access_level обязателен для пропусков')
        return v

class StorageAndPassCreate(StorageAndPassBase):
    pass

class StorageAndPassUpdate(BaseModel):
    asset_type: Optional[str] = Field(None, pattern='^(flash_drive|electronic_pass)$')
    serial_number: Optional[str] = Field(None, max_length=100)
    model: Optional[str] = None
    manufacturer: Optional[str] = None
    status: Optional[str] = Field(None, pattern='^(in_use|stock|broken|lost)$')
    assigned_to_id: Optional[int] = None
    capacity_gb: Optional[int] = Field(None, ge=1)
    access_level: Optional[int] = Field(None, ge=1, le=10)
    notes: Optional[str] = None

class AssignmentRequest(BaseModel):
    assigned_to_id: int
    notes: Optional[str] = None

class StorageAndPassResponse(StorageAndPassBase):
    id: int
    issue_date: Optional[datetime] = None
    return_date: Optional[datetime] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime
    assigned_to_name: Optional[str] = None
    assigned_to_rank: Optional[str] = None
    
    class Config:
        from_attributes = True

class StorageAndPassListResponse(BaseModel):
    total: int
    items: list[StorageAndPassResponse]

class StorageAndPassStats(BaseModel):
    total_assets: int
    by_type: dict[str, int]
    by_status: dict[str, int]