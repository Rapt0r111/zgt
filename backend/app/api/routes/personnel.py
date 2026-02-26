from datetime import date, datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_officer, verify_csrf
from app.core.database import get_db
from app.models.personnel import Personnel
from app.models.user import User
from app.schemas.personnel import PersonnelCreate, PersonnelListResponse, PersonnelResponse, PersonnelUpdate

router = APIRouter(prefix="/personnel", tags=["personnel"])


class ClearanceCheckResponse(BaseModel):
    personnel_id: int
    has_clearance: bool
    clearance_level: int | None
    expiry_date: str | None
    is_expired: bool
    is_valid: bool


@router.get("/", response_model=PersonnelListResponse)
async def list_personnel(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    status: Optional[str] = None,
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_officer),
):
    filters = [Personnel.is_active.is_(True)]
    if status:
        filters.append(Personnel.status == status)
    if search:
        term = f"%{search.strip()}%"
        filters.append(
            or_(
                Personnel.full_name.ilike(term),
                Personnel.rank.ilike(term),
                Personnel.position.ilike(term),
                Personnel.personal_number.ilike(term),
                Personnel.service_number.ilike(term),
            )
        )

    total_stmt = select(func.count(Personnel.id)).where(*filters)
    total = (await db.execute(total_stmt)).scalar_one()

    items_stmt = (
        select(Personnel)
        .where(*filters)
        .order_by(Personnel.rank_priority.asc().nullslast(), Personnel.position.asc().nullslast(), Personnel.full_name.asc())
        .offset(skip)
        .limit(limit)
    )
    items = (await db.execute(items_stmt)).scalars().all()
    return PersonnelListResponse(total=total, items=items)


@router.post("/", response_model=PersonnelResponse, status_code=status.HTTP_201_CREATED)
async def create_personnel(
    personnel: PersonnelCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_officer),
    __: User = Depends(verify_csrf),
):
    db_personnel = Personnel(**personnel.model_dump())
    db.add(db_personnel)
    await db.commit()
    await db.refresh(db_personnel)
    return db_personnel


@router.get("/{personnel_id}", response_model=PersonnelResponse)
async def get_personnel(
    personnel_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_officer),
):
    personnel = await db.get(Personnel, personnel_id)
    if personnel is None or not personnel.is_active:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Военнослужащий не найден")
    return personnel


@router.get("/{personnel_id}/clearance/check", response_model=ClearanceCheckResponse)
async def check_clearance(
    personnel_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_officer),
):
    personnel = await db.get(Personnel, personnel_id)
    if personnel is None or not personnel.is_active:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Военнослужащий не найден")

    expiry = personnel.clearance_expiry_date
    is_expired = False
    expiry_date_only: str | None = None

    if expiry is not None:
        if isinstance(expiry, datetime):
            expiry_aware = expiry if expiry.tzinfo is not None else expiry.replace(tzinfo=timezone.utc)
            is_expired = expiry_aware < datetime.now(timezone.utc)
            expiry_date_only = expiry_aware.date().isoformat()
        elif isinstance(expiry, date):
            is_expired = expiry < datetime.now(timezone.utc).date()
            expiry_date_only = expiry.isoformat()

    has_clearance = personnel.security_clearance_level is not None
    return ClearanceCheckResponse(
        personnel_id=personnel_id,
        has_clearance=has_clearance,
        clearance_level=personnel.security_clearance_level,
        expiry_date=expiry_date_only,
        is_expired=is_expired,
        is_valid=has_clearance and not is_expired,
    )


@router.put("/{personnel_id}", response_model=PersonnelResponse)
async def update_personnel(
    personnel_id: int,
    personnel_data: PersonnelUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_officer),
    __: User = Depends(verify_csrf),
):
    personnel = await db.get(Personnel, personnel_id)
    if personnel is None or not personnel.is_active:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Военнослужащий не найден")

    for field, value in personnel_data.model_dump(exclude_unset=True).items():
        setattr(personnel, field, value)

    await db.commit()
    await db.refresh(personnel)
    return personnel


@router.delete("/{personnel_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_personnel(
    personnel_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_officer),
    __: User = Depends(verify_csrf),
):
    personnel = await db.get(Personnel, personnel_id)
    if personnel is None or not personnel.is_active:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Военнослужащий не найден")

    personnel.is_active = False
    await db.commit()
