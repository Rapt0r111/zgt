from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, CheckConstraint, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func, text
from app.core.database import Base

class StorageAndPass(Base):
    """Флешки и электронные пропуска"""
    __tablename__ = "storage_and_passes"
    
    id = Column(Integer, primary_key=True, index=True)
    asset_type = Column(String(50), nullable=False)
    serial_number = Column(String(100), nullable=False, index=True)
    model = Column(String(255))
    manufacturer = Column(String(100))
    status = Column(String(50), nullable=False, default='stock')
    assigned_to_id = Column(Integer, ForeignKey('personnel.id', ondelete='SET NULL'), nullable=True, index=True)
    
    # Flash drive specific
    capacity_gb = Column(Integer)
    
    # Electronic pass specific
    access_level = Column(Integer)
    
    # Assignment tracking
    issue_date = Column(DateTime(timezone=True))
    return_date = Column(DateTime(timezone=True))
    notes = Column(Text)
    
    # Relationships
    assigned_to = relationship("Personnel", foreign_keys=[assigned_to_id])
    
    # Metadata
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=text("timezone('UTC', now())"), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=text("timezone('UTC', now())"), onupdate=text("timezone('UTC', now())"), nullable=False)
    
    __table_args__ = (
        UniqueConstraint('serial_number', name='uq_storage_passes_serial'),
        CheckConstraint("asset_type IN ('flash_drive', 'electronic_pass')", name='ck_asset_type'),
        CheckConstraint("status IN ('in_use', 'stock', 'broken', 'lost')", name='ck_status'),
    )