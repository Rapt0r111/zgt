from sqlalchemy import Column, Integer, String, Boolean, DateTime, Enum as SQLEnum
from sqlalchemy.sql import func
from app.core.database import Base
import enum

class PersonnelStatus(str, enum.Enum):
    IN_SERVICE = "В строю"
    ON_MISSION = "В командировке"
    IN_HOSPITAL = "В госпитале"
    ON_LEAVE = "В отпуске"

class Personnel(Base):
    __tablename__ = "personnel"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String, nullable=False, index=True)
    rank = Column(String, nullable=True)
    rank_priority = Column(Integer, nullable=True)
    position = Column(String, nullable=True)
    platoon = Column(String, nullable=True)
    personal_number = Column(String, unique=True, nullable=True, index=True)
    service_number = Column(String, unique=True, nullable=True, index=True)
    security_clearance_level = Column(Integer, nullable=True)
    clearance_order_number = Column(String, nullable=True)
    clearance_expiry_date = Column(DateTime, nullable=True)
    status = Column(SQLEnum(PersonnelStatus), default=PersonnelStatus.IN_SERVICE, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)