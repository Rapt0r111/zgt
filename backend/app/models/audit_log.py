from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, JSON
from sqlalchemy.sql import func
from app.core.database import Base

class AuditLog(Base):
    """Журнал действий пользователей"""
    __tablename__ = "audit_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Кто совершил действие
    user_id = Column(Integer, ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    username = Column(String(100))  # Дублируем на случай удаления пользователя
    
    # Что было сделано
    action = Column(String(50), nullable=False, index=True)  # CREATE, UPDATE, DELETE
    entity_type = Column(String(50), nullable=False, index=True)  # personnel, equipment, etc
    entity_id = Column(Integer, nullable=True)
    
    # Детали
    changes = Column(JSON, nullable=True)  # {"old": {...}, "new": {...}}
    ip_address = Column(String(50))
    user_agent = Column(Text)
    
    # Когда
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)