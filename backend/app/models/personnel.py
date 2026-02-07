from sqlalchemy import Column, Integer, String, Boolean, DateTime, Date
from sqlalchemy.sql import func
from app.core.database import Base

class Personnel(Base):
    __tablename__ = "personnel"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Идентификация
    full_name = Column(String(255), nullable=False, index=True)
    rank = Column(String(100))
    position = Column(String(255))
    unit = Column(String(100))  # взвод/отделение
    
    # Служебные данные
    personal_number = Column(String(50), unique=True)  # жетон
    service_number = Column(String(50))
    
    # Допуск к ГТ
    security_clearance_level = Column(Integer)  # 1, 2, или 3
    clearance_order_number = Column(String(100))
    clearance_expiry_date = Column(Date)
    
    # Статус
    status = Column(String(50), default="В строю")  # В строю/Командировка/Госпиталь/Отпуск
    
    # Служебная информация
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())