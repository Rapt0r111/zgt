from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base

class Equipment(Base):
    """Вычислительная техника"""
    __tablename__ = "equipment"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Тип техники
    equipment_type = Column(String(50), nullable=False)  # АРМ/Ноутбук/Сервер/Принтер
    
    # Идентификация
    inventory_number = Column(String(100), unique=True, index=True)  # Инвентарный номер
    serial_number = Column(String(100), index=True)
    
    # Характеристики
    manufacturer = Column(String(100))  # Производитель
    model = Column(String(255))
    
    # Процессор и память
    cpu = Column(String(255))  # Intel Core i5-10400
    ram_gb = Column(Integer)  # Объём RAM в ГБ
    
    # Хранение данных
    storage_type = Column(String(50))  # HDD/SSD/NVMe
    storage_capacity_gb = Column(Integer)  # Объём в ГБ
    
    # Дополнительно
    has_optical_drive = Column(Boolean, default=False)  # Оптический привод
    has_card_reader = Column(Boolean, default=False)  # Картридер
    operating_system = Column(String(100))  # Windows 10 Pro
    
    # Текущее размещение
    current_owner_id = Column(Integer, ForeignKey('personnel.id'), nullable=True)
    current_owner = relationship("Personnel", foreign_keys=[current_owner_id])
    
    current_location = Column(String(255))  # Каб. 205, Склад №1
    
    # Пломбы
    seal_number = Column(String(100))  # Номер пломбы
    seal_install_date = Column(DateTime(timezone=True))  # Дата установки
    seal_status = Column(String(50), default="Исправна")  # Исправна/Повреждена/Отсутствует
    seal_check_date = Column(DateTime(timezone=True))  # Дата последней проверки
    
    # Статус
    status = Column(String(50), default="В работе")  # В работе/На складе/В ремонте/Списан
    
    # Примечания
    notes = Column(Text)
    
    # Связи
    movement_history = relationship("EquipmentMovement", back_populates="equipment", cascade="all, delete-orphan")
    storage_devices = relationship("StorageDevice", back_populates="equipment", cascade="all, delete-orphan")
    
    # Служебная информация
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class EquipmentMovement(Base):
    """История перемещений техники"""
    __tablename__ = "equipment_movements"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Связь с техникой
    equipment_id = Column(Integer, ForeignKey('equipment.id', ondelete='CASCADE'), nullable=False)
    equipment = relationship("Equipment", back_populates="movement_history")
    
    # Откуда/Куда
    from_location = Column(String(255))  # Предыдущее размещение
    to_location = Column(String(255))  # Новое размещение
    
    # Ответственные
    from_person_id = Column(Integer, ForeignKey('personnel.id'), nullable=True)
    from_person = relationship("Personnel", foreign_keys=[from_person_id])
    
    to_person_id = Column(Integer, ForeignKey('personnel.id'), nullable=True)
    to_person = relationship("Personnel", foreign_keys=[to_person_id])
    
    # Документ
    movement_type = Column(String(50))  # Передача/Возврат/Списание/Ремонт
    document_number = Column(String(100))  # Номер акта приёма-передачи
    document_date = Column(DateTime(timezone=True))
    
    # Примечания
    reason = Column(Text)  # Причина перемещения
    
    # Пломба при передаче
    seal_number_before = Column(String(100))  # Номер пломбы до
    seal_number_after = Column(String(100))  # Номер пломбы после
    seal_status = Column(String(50))  # Состояние пломбы при передаче
    
    # Служебная информация
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    created_by_id = Column(Integer, ForeignKey('users.id'))
    created_by = relationship("User")


class StorageDevice(Base):
    """Съёмные носители информации (HDD/SSD)"""
    __tablename__ = "storage_devices"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Связь с компьютером (может быть None если носитель на складе)
    equipment_id = Column(Integer, ForeignKey('equipment.id', ondelete='SET NULL'), nullable=True)
    equipment = relationship("Equipment", back_populates="storage_devices")
    
    # Тип носителя
    device_type = Column(String(50), nullable=False)  # HDD/SSD/NVMe/USB Flash
    
    # Идентификация
    inventory_number = Column(String(100), unique=True, index=True)
    serial_number = Column(String(100), index=True)
    
    # Характеристики
    manufacturer = Column(String(100))
    model = Column(String(255))
    capacity_gb = Column(Integer)
    interface = Column(String(50))  # SATA/NVMe/USB 3.0
    
    # Статус
    status = Column(String(50), default="В работе")  # В работе/На складе/Списан
    location = Column(String(255))  # Текущее местоположение
    
    # Примечания
    notes = Column(Text)
    
    # Служебная информация
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
