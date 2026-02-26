from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base

class Phone(Base):
    __tablename__ = "phones"
    
    __table_args__ = (
        UniqueConstraint("imei_1", name="uq_phone_imei_1"),
    )

    id = Column(Integer, primary_key=True, index=True)
    
    # Владелец (связь с Personnel)
    owner_id = Column(Integer, ForeignKey('personnel.id', ondelete='CASCADE'), nullable=False)
    owner = relationship("Personnel", back_populates="phones")
    
    # Данные телефона
    model = Column(String(255))
    color = Column(String(50))
    imei_1 = Column(String(15), index=True)
    imei_2 = Column(String(15))
    serial_number = Column(String(100))
    
    # Функции
    has_camera = Column(Boolean, default=True)
    has_recorder = Column(Boolean, default=True)
    
    # Хранение
    storage_location = Column(String(100))  # "Ячейка 15"
    status = Column(String(50), default="Выдан")  # Выдан/Сдан
    
    # Служебная информация
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())