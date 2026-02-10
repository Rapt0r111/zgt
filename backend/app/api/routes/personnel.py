from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import Optional

from app.core.database import get_db
from app.api.deps import get_current_user, verify_csrf
from app.schemas.personnel import PersonnelCreate, PersonnelUpdate, PersonnelResponse, PersonnelListResponse
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
    service = PersonnelService(db)
    items, total = service.get_list(skip=skip, limit=limit, status=status, search=search)
    return PersonnelListResponse(total=total, items=items)

@router.post("/", response_model=PersonnelResponse, status_code=status.HTTP_201_CREATED)
async def create_personnel(
    personnel: PersonnelCreate,
    db: Session = Depends(get_db),
    current_user = Depends(verify_csrf)
):
    service = PersonnelService(db)
    try:
        return service.create(personnel)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.get("/{personnel_id}", response_model=PersonnelResponse)
async def get_personnel(
    personnel_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    service = PersonnelService(db)
    personnel = service.get_by_id(personnel_id)
    
    if not personnel:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Военнослужащий не найден")
    
    return personnel

@router.put("/{personnel_id}", response_model=PersonnelResponse)
async def update_personnel(
    personnel_id: int,
    personnel_data: PersonnelUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(verify_csrf)
):
    service = PersonnelService(db)
    personnel = service.update(personnel_id, personnel_data)
    
    if not personnel:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Военнослужащий не найден")
    
    return personnel

@router.delete("/{personnel_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_personnel(
    personnel_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(verify_csrf)
):
    service = PersonnelService(db)
    success = service.delete(personnel_id)
    
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Военнослужащий не найден")