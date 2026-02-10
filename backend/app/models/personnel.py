from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.sql import func
from app.core.database import Base
from sqlalchemy.orm import relationship

class Personnel(Base):
    __tablename__ = "personnel"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Core identification
    full_name = Column(String(255), nullable=False, index=True)
    rank = Column(String(100))
    rank_priority = Column(Integer, index=True)
    position = Column(String(255))
    unit = Column(String(100))
    personal_number = Column(String(50), unique=True, index=True)
    
    # Status
    status = Column(String(50), default="active")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    phones = relationship("Phone", back_populates="owner", cascade="all, delete-orphan")
    equipment = relationship("Equipment", foreign_keys="Equipment.current_owner_id", back_populates="current_owner")
    storage_items = relationship("StorageAndPass", back_populates="assigned_to", cascade="all, delete-orphan")