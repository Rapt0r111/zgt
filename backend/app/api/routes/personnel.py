from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import Optional
from datetime import date

from app.core.database import get_db
from app.api.deps import get_current_user
from app.schemas.personnel import (
    PersonnelCreate,
    PersonnelUpdate,
    PersonnelResponse,
    PersonnelListResponse
)
from app.services.personnel_service import PersonnelService

router = APIRouter(prefix="/personnel", tags=["personnel"])

@router.get("/", response_model=PersonnelListResponse)
async def list_personnel(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    status: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Получить список личного состава"""
    service = PersonnelService(db)
    items, total = service.get_list(skip=skip, limit=limit, status=status, search=search)
    
    return PersonnelListResponse(total=total, items=items)

@router.post("/", response_model=PersonnelResponse, status_code=status.HTTP_201_CREATED, dependencies=[Depends(verify_csrf)])
async def create_personnel(
    personnel: PersonnelCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Добавить военнослужащего"""
    service = PersonnelService(db)
    try:
        return service.create(personnel)
    except ValueError as e:  # ДОБАВИТЬ обработку
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.get("/{personnel_id}", response_model=PersonnelResponse)
async def get_personnel(
    personnel_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Получить данные военнослужащего"""
    service = PersonnelService(db)
    personnel = service.get_by_id(personnel_id)
    
    if not personnel:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Военнослужащий не найден"
        )
    
    return personnel

@router.put("/{personnel_id}", response_model=PersonnelResponse, dependencies=[Depends(verify_csrf)])
async def update_personnel(
    personnel_id: int,
    personnel_data: PersonnelUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Обновить данные военнослужащего"""
    service = PersonnelService(db)
    personnel = service.update(personnel_id, personnel_data)
    
    if not personnel:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Военнослужащий не найден"
        )
    
    return personnel

@router.delete("/{personnel_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(verify_csrf)])
async def delete_personnel(
    personnel_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Удалить военнослужащего"""
    service = PersonnelService(db)
    success = service.delete(personnel_id)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Военнослужащий не найден"
        )

@router.get("/{personnel_id}/clearance/check")
async def check_clearance(
    personnel_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Проверить допуск военнослужащего"""
    service = PersonnelService(db)
    personnel = service.get_by_id(personnel_id)
    
    if not personnel:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Военнослужащий не найден"
        )
    
    is_expired = service.check_clearance_expired(personnel_id)
    
    return {
        "personnel_id": personnel_id,
        "full_name": personnel.full_name,
        "clearance_level": personnel.security_clearance_level,
        "expiry_date": personnel.clearance_expiry_date,
        "is_expired": is_expired,
        "is_valid": not is_expired and personnel.clearance_expiry_date is not None
    }

@router.get("/clearances/expiring")
async def get_expiring_clearances(
    days: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    service = PersonnelService(db)
    personnel_list = service.get_expiring_clearances(days=days)
    today = date.today()
    
    return {
        "days": days,
        "count": len(personnel_list),
        "personnel": [
            {
                "id": p.id,
                "full_name": p.full_name,
                "rank": p.rank,
                "clearance_level": p.security_clearance_level,
                "expiry_date": p.clearance_expiry_date,
                # Добавляем проверку на None
                "days_remaining": (p.clearance_expiry_date - today).days if p.clearance_expiry_date else None
            }
            for p in personnel_list
        ]
    }