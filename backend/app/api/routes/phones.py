from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from app.api.deps import get_current_user, verify_csrf
from app.core.database import get_db
from app.schemas.phone import (
    BatchCheckinRequest,
    BatchCheckoutRequest,
    PhoneCreate,
    PhoneListResponse,
    PhoneResponse,
    PhoneUpdate,
)
from app.services.phone_service import PhoneService

router = APIRouter(prefix="/phones", tags=["phones"])


def _enrich(phone) -> dict:
    return {
        **phone.__dict__,
        "owner_full_name": phone.owner.full_name if phone.owner else None,
        "owner_rank": phone.owner.rank if phone.owner else None,
    }


async def _get_or_404(service: PhoneService, phone_id: int):
    phone = await service.get_by_id(phone_id)
    if not phone:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Телефон не найден")
    return phone


@router.get("/", response_model=PhoneListResponse)
async def list_phones(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    status: Optional[str] = None,
    search: Optional[str] = None,
    owner_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    service = PhoneService(db)
    items, total = await service.get_list(skip=skip, limit=limit, status=status, search=search, owner_id=owner_id)
    return PhoneListResponse(total=total, items=[_enrich(p) for p in items])


@router.post("/", response_model=PhoneResponse, status_code=status.HTTP_201_CREATED)
async def create_phone(
    phone: PhoneCreate,
    db: AsyncSession = Depends(get_db),
    _=Depends(verify_csrf),
):
    try:
        return _enrich(await PhoneService(db).create(phone))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from e


@router.get("/reports/status")
async def get_status_report(
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    report = await PhoneService(db).get_status_report()
    return {
        "total_phones": report["total_phones"],
        "checked_in": report["checked_in"],
        "checked_out": report["checked_out"],
        "phones_not_submitted": [_enrich(p) for p in report["phones_not_submitted"]],
    }


@router.post("/batch-checkin")
async def batch_checkin(
    request: BatchCheckinRequest,
    db: AsyncSession = Depends(get_db),
    _=Depends(verify_csrf),
):
    count = await PhoneService(db).batch_checkin(request.phone_ids)
    return {"message": f"Принято {count} телефонов", "count": count}


@router.post("/batch-checkout")
async def batch_checkout(
    request: BatchCheckoutRequest,
    db: AsyncSession = Depends(get_db),
    _=Depends(verify_csrf),
):
    count = await PhoneService(db).batch_checkout(request.phone_ids)
    return {"message": f"Выдано {count} телефонов", "count": count}


@router.get("/{phone_id}", response_model=PhoneResponse)
async def get_phone(
    phone_id: int,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    return _enrich(await _get_or_404(PhoneService(db), phone_id))


@router.put("/{phone_id}", response_model=PhoneResponse)
async def update_phone(
    phone_id: int,
    phone_data: PhoneUpdate,
    db: AsyncSession = Depends(get_db),
    _=Depends(verify_csrf),
):
    phone = await PhoneService(db).update(phone_id, phone_data)
    if not phone:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Телефон не найден")
    return _enrich(phone)


@router.delete("/{phone_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_phone(
    phone_id: int,
    db: AsyncSession = Depends(get_db),
    _=Depends(verify_csrf),
):
    if not await PhoneService(db).delete(phone_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Телефон не найден")
