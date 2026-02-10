from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import Optional

from app.core.database import get_db
from app.api.deps import get_current_user, verify_csrf
from app.models.user import User
from app.schemas.storage_and_passes import (
    StorageAndPassCreate,
    StorageAndPassUpdate,
    StorageAndPassResponse,
    StorageAndPassListResponse,
    AssignmentRequest
)
from app.services.storage_and_passes_service import StorageAndPassService
from app.core.validators import sanitize_html


router = APIRouter(prefix="/storage-and-passes", tags=["storage-and-passes"])

@router.get("/", response_model=StorageAndPassListResponse)
async def list_assets(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    asset_type: Optional[str] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get list of assets"""
    service = StorageAndPassService(db)
    
    if search:
        search = sanitize_html(search)
    
    items, total = service.get_list(
        skip=skip,
        limit=limit,
        asset_type=asset_type,
        status=status,
        search=search
    )
    
    response_items = []
    for asset in items:
        asset_dict = {
            **asset.__dict__,
            "assigned_to_name": asset.assigned_to.full_name if asset.assigned_to else None,
            "assigned_to_rank": asset.assigned_to.rank if asset.assigned_to else None,
        }
        response_items.append(asset_dict)
    
    return StorageAndPassListResponse(total=total, items=response_items)

@router.post("/", response_model=StorageAndPassResponse, status_code=status.HTTP_201_CREATED)
async def create_asset(
    asset: StorageAndPassCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(verify_csrf)
):
    """Create new asset"""
    service = StorageAndPassService(db)
    try:
        new_asset = service.create(asset)
        return {
            **new_asset.__dict__,
            "assigned_to_name": new_asset.assigned_to.full_name if new_asset.assigned_to else None,
            "assigned_to_rank": new_asset.assigned_to.rank if new_asset.assigned_to else None,
        }
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.get("/{asset_id}", response_model=StorageAndPassResponse)
async def get_asset(
    asset_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get asset by ID"""
    service = StorageAndPassService(db)
    asset = service.get_by_id(asset_id)
    
    if not asset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Актив не найден"
        )
    
    return {
        **asset.__dict__,
        "assigned_to_name": asset.assigned_to.full_name if asset.assigned_to else None,
        "assigned_to_rank": asset.assigned_to.rank if asset.assigned_to else None,
    }

@router.patch("/{asset_id}", response_model=StorageAndPassResponse)
async def update_asset(
    asset_id: int,
    asset_data: StorageAndPassUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(verify_csrf)
):
    """Update asset"""
    service = StorageAndPassService(db)
    asset = service.update(asset_id, asset_data)
    
    if not asset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Актив не найден"
        )
    
    return {
        **asset.__dict__,
        "assigned_to_name": asset.assigned_to.full_name if asset.assigned_to else None,
        "assigned_to_rank": asset.assigned_to.rank if asset.assigned_to else None,
    }

@router.delete("/{asset_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_asset(
    asset_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(verify_csrf)
):
    """Delete asset"""
    service = StorageAndPassService(db)
    success = service.delete(asset_id)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Актив не найден"
        )

@router.post("/{asset_id}/assign", response_model=StorageAndPassResponse)
async def assign_asset(
    asset_id: int,
    request: AssignmentRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(verify_csrf)
):
    """Assign asset to personnel"""
    service = StorageAndPassService(db)
    try:
        asset = service.assign_to_personnel(asset_id, request)
        return {
            **asset.__dict__,
            "assigned_to_name": asset.assigned_to.full_name if asset.assigned_to else None,
            "assigned_to_rank": asset.assigned_to.rank if asset.assigned_to else None,
        }
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.post("/{asset_id}/revoke", response_model=StorageAndPassResponse)
async def revoke_asset(
    asset_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(verify_csrf)
):
    """Revoke asset from personnel"""
    service = StorageAndPassService(db)
    try:
        asset = service.revoke_from_personnel(asset_id)
        return {
            **asset.__dict__,
            "assigned_to_name": None,
            "assigned_to_rank": None,
        }
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )