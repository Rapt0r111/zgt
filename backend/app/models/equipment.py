from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func, text
from app.core.database import Base

class Equipment(Base):
    __tablename__ = "equipment"
    
    id = Column(Integer, primary_key=True, index=True)
    equipment_type = Column(String(50), nullable=False)
    
    # Identification
    inventory_number = Column(String(100), index=True)
    serial_number = Column(String(100), index=True)
    mni_serial_number = Column(String(100), index=True)
    
    # Specs
    manufacturer = Column(String(100))
    model = Column(String(255))
    cpu = Column(String(255))
    ram_gb = Column(Integer)
    storage_type = Column(String(50))
    storage_capacity_gb = Column(Integer)
    has_optical_drive = Column(Boolean, default=False)
    has_card_reader = Column(Boolean, default=False)
    operating_system = Column(String(100))
    
    # Assignment
    current_owner_id = Column(Integer, ForeignKey('personnel.id', ondelete='SET NULL'), nullable=True, index=True)
    current_owner = relationship("Personnel", foreign_keys=[current_owner_id], back_populates="equipment")
    current_location = Column(String(255))
    
    # Seals
    seal_number = Column(String(100))
    seal_install_date = Column(DateTime(timezone=True))
    seal_status = Column(String(50), default="Исправна")
    seal_check_date = Column(DateTime(timezone=True))
    
    # Status
    status = Column(String(50), default="В работе")
    notes = Column(Text)
    
    # Relationships
    movement_history = relationship("EquipmentMovement", back_populates="equipment", cascade="all, delete-orphan")
    storage_devices = relationship("StorageDevice", back_populates="equipment", cascade="all, delete-orphan")
    
    # Metadata
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=text("timezone('UTC', now())"), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=text("timezone('UTC', now())"), onupdate=text("timezone('UTC', now())"), nullable=False)
    
    __table_args__ = (
        UniqueConstraint('inventory_number', name='uq_equipment_inventory'),
    )


class EquipmentMovement(Base):
    __tablename__ = "equipment_movements"
    
    id = Column(Integer, primary_key=True, index=True)
    equipment_id = Column(Integer, ForeignKey('equipment.id', ondelete='CASCADE'), nullable=False, index=True)
    equipment = relationship("Equipment", back_populates="movement_history")
    
    from_location = Column(String(255))
    to_location = Column(String(255))
    from_person_id = Column(Integer, ForeignKey('personnel.id'), nullable=True, index=True)
    to_person_id = Column(Integer, ForeignKey('personnel.id'), nullable=True, index=True)
    
    movement_type = Column(String(50))
    document_number = Column(String(100))
    document_date = Column(DateTime(timezone=True))
    reason = Column(Text)
    
    seal_number_before = Column(String(100))
    seal_number_after = Column(String(100))
    seal_status = Column(String(50))
    
    created_at = Column(DateTime(timezone=True), server_default=text("timezone('UTC', now())"), nullable=False)
    created_by_id = Column(Integer, ForeignKey('users.id'))


class StorageDevice(Base):
    __tablename__ = "storage_devices"
    
    id = Column(Integer, primary_key=True, index=True)
    equipment_id = Column(Integer, ForeignKey('equipment.id', ondelete='SET NULL'), nullable=True, index=True)
    equipment = relationship("Equipment", back_populates="storage_devices")
    
    device_type = Column(String(50), nullable=False)
    inventory_number = Column(String(100), index=True)
    serial_number = Column(String(100), index=True)
    manufacturer = Column(String(100))
    model = Column(String(255))
    capacity_gb = Column(Integer)
    interface = Column(String(50))
    status = Column(String(50), default="В работе")
    location = Column(String(255))
    notes = Column(Text)
    
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=text("timezone('UTC', now())"), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=text("timezone('UTC', now())"), onupdate=text("timezone('UTC', now())"), nullable=False)
    
    __table_args__ = (
        UniqueConstraint('inventory_number', name='uq_storage_inventory'),
    )