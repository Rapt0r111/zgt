from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.core.validators import sanitize_html
from app.models.personnel import Personnel
from app.models.storage_and_passes import StorageAndPass
from app.schemas.storage_and_passes import AssignmentRequest, StorageAndPassCreate, StorageAndPassUpdate


class StorageAndPassService:
    def __init__(self, db: AsyncSession):
        self.db = db

    def _search_filters(self, search: Optional[str]) -> list:
        if not search:
            return []
        escaped = sanitize_html(search)
        like_term = f"%{escaped}%"
        return [
            or_(
                StorageAndPass.serial_number.ilike(like_term),
                StorageAndPass.model.ilike(like_term),
                StorageAndPass.manufacturer.ilike(like_term),
                StorageAndPass.notes.ilike(like_term),
            )
        ]

    async def get_statistics(
        self,
        asset_type: Optional[str] = None,
        status: Optional[str] = None,
        search: Optional[str] = None,
    ) -> dict[str, object]:
        filters = [StorageAndPass.is_active.is_(True), *self._search_filters(search)]
        if asset_type:
            filters.append(StorageAndPass.asset_type == asset_type)
        if status:
            filters.append(StorageAndPass.status == status)

        total_stmt = select(func.count(StorageAndPass.id)).where(*filters)
        total_assets = (await self.db.execute(total_stmt)).scalar_one()

        status_filters = [StorageAndPass.is_active.is_(True), *self._search_filters(search)]
        if asset_type:
            status_filters.append(StorageAndPass.asset_type == asset_type)
        status_stmt = (
            select(StorageAndPass.status, func.count(StorageAndPass.id))
            .where(*status_filters)
            .group_by(StorageAndPass.status)
        )
        by_status = {row[0]: row[1] for row in (await self.db.execute(status_stmt)).all()}

        type_filters = [StorageAndPass.is_active.is_(True), *self._search_filters(search)]
        if status:
            type_filters.append(StorageAndPass.status == status)
        type_stmt = (
            select(StorageAndPass.asset_type, func.count(StorageAndPass.id))
            .where(*type_filters)
            .group_by(StorageAndPass.asset_type)
        )
        by_type = {row[0]: row[1] for row in (await self.db.execute(type_stmt)).all()}

        return {
            "total_assets": total_assets,
            "by_type": by_type,
            "by_status": by_status,
        }

    async def get_list(
        self,
        skip: int = 0,
        limit: int = 100,
        asset_type: Optional[str] = None,
        status: Optional[str] = None,
        search: Optional[str] = None,
    ) -> tuple[list[StorageAndPass], int]:
        filters = [StorageAndPass.is_active.is_(True), *self._search_filters(search)]
        if asset_type:
            filters.append(StorageAndPass.asset_type == asset_type)
        if status:
            filters.append(StorageAndPass.status == status)

        total_stmt = select(func.count(StorageAndPass.id)).where(*filters)
        total = (await self.db.execute(total_stmt)).scalar_one()

        items_stmt = (
            select(StorageAndPass)
            .options(joinedload(StorageAndPass.assigned_to))
            .where(*filters)
            .order_by(StorageAndPass.asset_type, StorageAndPass.serial_number)
            .offset(skip)
            .limit(limit)
        )
        items = (await self.db.execute(items_stmt)).scalars().all()
        return items, total

    async def get_by_id(self, asset_id: int) -> Optional[StorageAndPass]:
        stmt = (
            select(StorageAndPass)
            .options(joinedload(StorageAndPass.assigned_to))
            .where(StorageAndPass.id == asset_id, StorageAndPass.is_active.is_(True))
        )
        return (await self.db.execute(stmt)).scalars().first()

    async def create(self, asset_data: StorageAndPassCreate) -> StorageAndPass:
        try:
            asset = StorageAndPass(**asset_data.model_dump())
            self.db.add(asset)
            await self.db.commit()
            await self.db.refresh(asset)
            return asset
        except IntegrityError as exc:
            await self.db.rollback()
            if "uq_storage_passes_serial" in str(exc.orig):
                raise ValueError(f"Серийный номер {asset_data.serial_number} уже существует") from exc
            raise ValueError("Ошибка при создании") from exc

    async def update(self, asset_id: int, asset_data: StorageAndPassUpdate) -> Optional[StorageAndPass]:
        asset = await self.get_by_id(asset_id)
        if asset is None:
            return None

        try:
            for field, value in asset_data.model_dump(exclude_unset=True).items():
                setattr(asset, field, value)
            await self.db.commit()
            await self.db.refresh(asset)
            return asset
        except IntegrityError as exc:
            await self.db.rollback()
            if "uq_storage_passes_serial" in str(exc.orig):
                raise ValueError("Серийный номер уже существует") from exc
            raise

    async def delete(self, asset_id: int) -> bool:
        asset = await self.get_by_id(asset_id)
        if asset is None:
            return False

        asset.is_active = False
        await self.db.commit()
        return True

    async def assign_to_personnel(self, asset_id: int, request: AssignmentRequest) -> StorageAndPass:
        asset_stmt = (
            select(StorageAndPass)
            .options(joinedload(StorageAndPass.assigned_to))
            .where(StorageAndPass.id == asset_id, StorageAndPass.is_active.is_(True))
            .with_for_update()
        )
        asset = (await self.db.execute(asset_stmt)).scalars().one_or_none()
        if asset is None:
            raise ValueError("Актив не найден")

        if asset.status == "in_use" and asset.assigned_to_id:
            owner_name = asset.assigned_to.full_name if asset.assigned_to else f"ID {asset.assigned_to_id}"
            raise ValueError(f"Актив уже выдан: {owner_name}")

        personnel_stmt = select(Personnel).where(Personnel.id == request.assigned_to_id, Personnel.is_active.is_(True))
        personnel = (await self.db.execute(personnel_stmt)).scalars().first()
        if personnel is None:
            raise ValueError("Сотрудник не найден")

        asset.assigned_to_id = request.assigned_to_id
        asset.status = "in_use"
        asset.issue_date = datetime.now(timezone.utc)
        asset.return_date = None
        if request.notes:
            asset.notes = request.notes

        await self.db.commit()
        refreshed = await self.get_by_id(asset_id)
        if refreshed is None:
            raise ValueError("Актив не найден")
        return refreshed

    async def revoke_from_personnel(self, asset_id: int) -> StorageAndPass:
        stmt = (
            select(StorageAndPass)
            .where(StorageAndPass.id == asset_id, StorageAndPass.is_active.is_(True))
            .with_for_update()
        )
        asset = (await self.db.execute(stmt)).scalars().one_or_none()
        if asset is None:
            raise ValueError("Актив не найден")
        if asset.status != "in_use":
            raise ValueError("Актив не находится в использовании")

        asset.assigned_to_id = None
        asset.status = "stock"
        asset.return_date = datetime.now(timezone.utc)

        await self.db.commit()
        await self.db.refresh(asset)
        return asset
