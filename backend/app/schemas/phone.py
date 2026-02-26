from pydantic import BaseModel, Field, field_validator
from typing import Optional
from datetime import datetime

class PhoneBase(BaseModel):
    owner_id: int
    model: Optional[str] = Field(None, max_length=255)
    color: Optional[str] = Field(None, max_length=50)
    imei_1: Optional[str] = Field(None, max_length=20)
    imei_2: Optional[str] = Field(None, max_length=20)
    serial_number: Optional[str] = Field(None, max_length=100)
    has_camera: bool = True
    has_recorder: bool = True
    storage_location: Optional[str] = Field(None, max_length=100)
    status: str = Field(default="Выдан", max_length=50)
    @field_validator("imei_1", "imei_2")
    def validate_imei(cls, v: Optional[str]) -> Optional[str]:
        if not v:
            return None
        
        digits = v.replace(" ", "").replace("-", "").replace(".", "")
        
        if not digits.isdigit():
            raise ValueError("IMEI должен содержать только цифры")

        # Проверяем диапазон допустимой длины (например, от 13 до 18)
        if not (13 <= len(digits) <= 18):
            raise ValueError(f"Недопустимая длина IMEI ({len(digits)} цифр)")

        # Если это стандартный IMEI (15 цифр), проверяем его по алгоритму Луна
        if len(digits) == 15:
            if not cls.check_luhn(digits):
                raise ValueError("Некорректная контрольная цифра IMEI (алгоритм Луна)")
        
        # Если это IMEISV (16 цифр), алгоритм Луна обычно не применяется
        # Можно добавить дополнительные проверки для других длин, если нужно
        
        return digits

    @staticmethod
    def check_luhn(digits: str) -> bool:
        """Реализация алгоритма Луна для проверки контрольной цифры"""
        total = 0
        # Идем справа налево
        reverse_digits = digits[::-1]
        for i, d in enumerate(reverse_digits):
            n = int(d)
            # Удваиваем каждую вторую цифру, начиная со второй справа (индексы 1, 3, 5...)
            if i % 2 == 1:
                n *= 2
                if n > 9:
                    n -= 9
            total += n
        return total % 10 == 0

class PhoneCreate(PhoneBase):
    pass

class PhoneUpdate(BaseModel):
    owner_id: Optional[int] = None
    model: Optional[str] = None
    color: Optional[str] = None
    imei_1: Optional[str] = None
    imei_2: Optional[str] = None
    serial_number: Optional[str] = None
    has_camera: Optional[bool] = None
    has_recorder: Optional[bool] = None
    storage_location: Optional[str] = None
    status: Optional[str] = None

class PhoneResponse(PhoneBase):
    id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime
    owner_full_name: Optional[str] = None
    owner_rank: Optional[str] = None

    class Config:
        from_attributes = True

class PhoneListResponse(BaseModel):
    total: int
    items: list[PhoneResponse]

# Схемы для массовых операций
class BatchCheckinRequest(BaseModel):
    phone_ids: list[int] = Field(..., min_length=1)

class BatchCheckoutRequest(BaseModel):
    phone_ids: list[int] = Field(..., min_length=1)

class PhoneStatusReport(BaseModel):
    total_phones: int
    checked_in: int
    checked_out: int
    phones_not_submitted: list[PhoneResponse]