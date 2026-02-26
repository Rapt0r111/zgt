from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_active_user, verify_csrf
from app.core.database import get_db
from app.models.user import User
from app.schemas.storage_and_passes import (
    AssignmentRequest,
    StorageAndPassCreate,
    StorageAndPassListResponse,
    StorageAndPassResponse,
    StorageAndPassStats,
    StorageAndPassUpdate,
)
from app.services.storage_and_passes_service import StorageAndPassService

router = APIRouter(prefix="/storage-and-passes", tags=["storage-and-passes"])


def _enrich(asset) -> dict:
    return {
        **asset.__dict__,
        "assigned_to_name": asset.assigned_to.full_name if asset.assigned_to else None,
        "assigned_to_rank": asset.assigned_to.rank if asset.assigned_to else None,
    }


async def _get_or_404(service: StorageAndPassService, asset_id: int):
    asset = await service.get_by_id(asset_id)
    if not asset:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Актив не найден")
    return asset


@router.get("/", response_model=StorageAndPassListResponse)
async def list_assets(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    asset_type: Optional[str] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_active_user),
):
    service = StorageAndPassService(db)
    items, total = await service.get_list(skip=skip, limit=limit, asset_type=asset_type, status=status, search=search)
    return StorageAndPassListResponse(total=total, items=[_enrich(a) for a in items])


@router.post("/", response_model=StorageAndPassResponse, status_code=status.HTTP_201_CREATED)
async def create_asset(
    asset: StorageAndPassCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(verify_csrf),
):
    try:
        return _enrich(await StorageAndPassService(db).create(asset))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from e


@router.get("/stats", response_model=StorageAndPassStats)
async def get_stats(
    asset_type: Optional[str] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_active_user),
):
    return await StorageAndPassService(db).get_statistics(asset_type=asset_type, status=status, search=search)


@router.get("/{asset_id}", response_model=StorageAndPassResponse)
async def get_asset(
    asset_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_active_user),
):
    return _enrich(await _get_or_404(StorageAndPassService(db), asset_id))


@router.patch("/{asset_id}", response_model=StorageAndPassResponse)
async def update_asset(
    asset_id: int,
    asset_data: StorageAndPassUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(verify_csrf),
):
    asset = await StorageAndPassService(db).update(asset_id, asset_data)
    if not asset:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Актив не найден")
    return _enrich(asset)


@router.delete("/{asset_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_asset(
    asset_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(verify_csrf),
):
    if not await StorageAndPassService(db).delete(asset_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Актив не найден")


@router.post("/{asset_id}/assign", response_model=StorageAndPassResponse)
async def assign_asset(
    asset_id: int,
    request: AssignmentRequest,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(verify_csrf),
):
    try:
        return _enrich(await StorageAndPassService(db).assign_to_personnel(asset_id, request))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from e


@router.post("/{asset_id}/revoke", response_model=StorageAndPassResponse)
async def revoke_asset(
    asset_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(verify_csrf),
):
    try:
        asset = await StorageAndPassService(db).revoke_from_personnel(asset_id)
        return _enrich(asset)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from e
