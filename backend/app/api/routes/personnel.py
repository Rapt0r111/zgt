from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime, timezone

from app.core.database import get_db
from app.api.deps import require_officer, verify_csrf, get_current_user
from app.models.user import User
from app.schemas.personnel import (
    PersonnelCreate, PersonnelUpdate, PersonnelResponse, PersonnelListResponse
)
from app.services.personnel_service import PersonnelService

router = APIRouter(prefix="/personnel", tags=["personnel"])

# Единый dependency для мутирующих операций с персоналом
_officer_csrf = lambda db=Depends(get_db), user=Depends(verify_csrf): (db, user)


def _require_officer_csrf(
    db: Session = Depends(get_db),
    current_user: User = Depends(verify_csrf),
) -> tuple[Session, User]:
    """CSRF + минимум officer."""
    from app.api.deps import ROLE_HIERARCHY
    if ROLE_HIERARCHY.get(current_user.role, 0) < ROLE_HIERARCHY.get("officer", 0):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Требуется роль: officer",
        )
    return db, current_user


@router.get("/", response_model=PersonnelListResponse)
async def list_personnel(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    status: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    _: User = Depends(require_officer),
):
    service = PersonnelService(db)
    items, total = service.get_list(skip=skip, limit=limit, status=status, search=search)
    return PersonnelListResponse(total=total, items=items)


@router.post("/", response_model=PersonnelResponse, status_code=status.HTTP_201_CREATED)
async def create_personnel(
    personnel: PersonnelCreate,
    deps: tuple = Depends(_require_officer_csrf),
):
    db, _ = deps
    service = PersonnelService(db)
    try:
        return service.create(personnel)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/{personnel_id}", response_model=PersonnelResponse)
async def get_personnel(
    personnel_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_officer),
):
    service = PersonnelService(db)
    personnel = service.get_by_id(personnel_id)
    if not personnel:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Военнослужащий не найден")
    return personnel


@router.get("/{personnel_id}/clearance/check")
async def check_clearance(
    personnel_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_officer),
):
    service = PersonnelService(db)
    personnel = service.get_by_id(personnel_id)
    if not personnel:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Военнослужащий не найден")

    expiry = personnel.clearance_expiry_date
    is_expired = False
    if expiry:
        expiry_aware = expiry.replace(tzinfo=timezone.utc) if expiry.tzinfo is None else expiry
        is_expired = expiry_aware < datetime.now(timezone.utc)

    has_clearance = personnel.security_clearance_level is not None
    return {
        "personnel_id": personnel_id,
        "has_clearance": has_clearance,
        "clearance_level": personnel.security_clearance_level,
        "expiry_date": expiry.date().isoformat() if expiry else None,
        "is_expired": is_expired,
        "is_valid": has_clearance and not is_expired,
    }


@router.put("/{personnel_id}", response_model=PersonnelResponse)
async def update_personnel(
    personnel_id: int,
    personnel_data: PersonnelUpdate,
    deps: tuple = Depends(_require_officer_csrf),
):
    db, _ = deps
    service = PersonnelService(db)
    personnel = service.update(personnel_id, personnel_data)
    if not personnel:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Военнослужащий не найден")
    return personnel


@router.delete("/{personnel_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_personnel(
    personnel_id: int,
    deps: tuple = Depends(_require_officer_csrf),
):
    db, _ = deps
    service = PersonnelService(db)
    if not service.delete(personnel_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Военнослужащий не найден")