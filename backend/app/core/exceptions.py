# backend/app/core/exceptions.py (СОЗДАТЬ)
from fastapi import HTTPException, status

class NotFoundException(HTTPException):
    def __init__(self, detail: str = "Объект не найден"):
        super().__init__(status_code=status.HTTP_404_NOT_FOUND, detail=detail)

class BadRequestException(HTTPException):
    def __init__(self, detail: str):
        super().__init__(status_code=status.HTTP_400_BAD_REQUEST, detail=detail)

# Использование:
@router.get("/{equipment_id}", response_model=EquipmentResponse)
async def get_equipment(...):
    equipment = service.get_by_id(equipment_id)
    if not equipment:
        raise NotFoundException("Техника не найдена")
    return equipment