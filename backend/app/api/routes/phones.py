from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import Optional

from app.core.database import get_db
from app.api.deps import get_current_user, verify_csrf
from app.schemas.phone import (
    PhoneCreate, PhoneUpdate, PhoneResponse, PhoneListResponse,
    BatchCheckinRequest, BatchCheckoutRequest
)
from app.services.phone_service import PhoneService

router = APIRouter(prefix="/phones", tags=["phones"])

def _phone_response(phone) -> dict:
    return {
        **phone.__dict__,
        "owner_full_name": phone.owner.full_name if phone.owner else None,
        "owner_rank": phone.owner.rank if phone.owner else None,
    }

@router.get("/", response_model=PhoneListResponse)
async def list_phones(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    status: Optional[str] = None,
    search: Optional[str] = None,
    owner_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    service = PhoneService(db)
    items, total = service.get_list(skip=skip, limit=limit, status=status, search=search, owner_id=owner_id)
    return PhoneListResponse(total=total, items=[_phone_response(p) for p in items])

@router.post("/", response_model=PhoneResponse, status_code=status.HTTP_201_CREATED)
async def create_phone(
    phone: PhoneCreate,
    db: Session = Depends(get_db),
    current_user = Depends(verify_csrf)
):
    service = PhoneService(db)
    try:
        return _phone_response(service.create(phone))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.get("/{phone_id}", response_model=PhoneResponse)
async def get_phone(
    phone_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    service = PhoneService(db)
    phone = service.get_by_id(phone_id)
    if not phone:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Телефон не найден")
    return _phone_response(phone)

@router.put("/{phone_id}", response_model=PhoneResponse)
async def update_phone(
    phone_id: int,
    phone_data: PhoneUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(verify_csrf)
):
    service = PhoneService(db)
    phone = service.update(phone_id, phone_data)
    if not phone:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Телефон не найден")
    return _phone_response(phone)

@router.delete("/{phone_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_phone(
    phone_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(verify_csrf)
):
    service = PhoneService(db)
    if not service.delete(phone_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Телефон не найден")

@router.post("/batch-checkin")
async def batch_checkin(
    request: BatchCheckinRequest,
    db: Session = Depends(get_db),
    current_user = Depends(verify_csrf)
):
    service = PhoneService(db)
    count = service.batch_checkin(request.phone_ids)
    return {"message": f"Принято {count} телефонов", "count": count}

@router.post("/batch-checkout")
async def batch_checkout(
    request: BatchCheckoutRequest,
    db: Session = Depends(get_db),
    current_user = Depends(verify_csrf)
):
    service = PhoneService(db)
    count = service.batch_checkout(request.phone_ids)
    return {"message": f"Выдано {count} телефонов", "count": count}

@router.get("/reports/status")
async def get_status_report(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    service = PhoneService(db)
    report = service.get_status_report()
    
    return {
        "total_phones": report["total_phones"],
        "checked_in": report["checked_in"],
        "checked_out": report["checked_out"],
        "phones_not_submitted": [_phone_response(p) for p in report["phones_not_submitted"]]
    }