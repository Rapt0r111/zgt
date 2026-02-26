import logging
from typing import Optional

from sqlalchemy import func, or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.core.validators import sanitize_html
from app.models.personnel import Personnel
from app.models.phone import Phone
from app.schemas.phone import PhoneCreate, PhoneUpdate

logger = logging.getLogger(__name__)


class PhoneService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_list(
        self,
        skip: int = 0,
        limit: int = 100,
        status: Optional[str] = None,
        search: Optional[str] = None,
        owner_id: Optional[int] = None,
    ) -> tuple[list[Phone], int]:
        filters = [Phone.is_active.is_(True)]
        if status:
            filters.append(Phone.status == status)
        if owner_id:
            filters.append(Phone.owner_id == owner_id)

        if search:
            search_clean = sanitize_html(search)
            term = f"%{search_clean}%"
            filters.append(
                or_(
                    Phone.model.ilike(term),
                    Phone.color.ilike(term),
                    Phone.imei_1.ilike(term),
                    Phone.imei_2.ilike(term),
                    Phone.serial_number.ilike(term),
                    Phone.storage_location.ilike(term),
                    Personnel.full_name.ilike(term),
                    Personnel.rank.ilike(term),
                )
            )

        total_stmt = select(func.count(Phone.id)).select_from(Phone)
        items_stmt = select(Phone).options(joinedload(Phone.owner)).where(*filters)
        if search:
            total_stmt = total_stmt.join(Personnel, Phone.owner_id == Personnel.id).where(*filters)
            items_stmt = items_stmt.join(Personnel, Phone.owner_id == Personnel.id)
        else:
            total_stmt = total_stmt.where(*filters)

        total = (await self.db.execute(total_stmt)).scalar_one()
        items = (
            await self.db.execute(
                items_stmt.order_by(Phone.storage_location).offset(skip).limit(limit)
            )
        ).scalars().all()
        return items, total

    async def get_by_id(self, phone_id: int) -> Optional[Phone]:
        stmt = (
            select(Phone)
            .options(joinedload(Phone.owner))
            .where(Phone.id == phone_id, Phone.is_active.is_(True))
        )
        return (await self.db.execute(stmt)).scalars().first()

    async def create(self, phone_data: PhoneCreate) -> Phone:
        owner_stmt = select(Personnel).where(Personnel.id == phone_data.owner_id, Personnel.is_active.is_(True))
        owner = (await self.db.execute(owner_stmt)).scalars().first()
        if not owner:
            raise ValueError("Владелец не найден")

        phone = Phone(**phone_data.model_dump())
        self.db.add(phone)
        await self.db.commit()
        await self.db.refresh(phone)
        return phone

    async def update(self, phone_id: int, phone_data: PhoneUpdate) -> Optional[Phone]:
        phone = await self.get_by_id(phone_id)
        if not phone:
            return None

        for field, value in phone_data.model_dump(exclude_unset=True).items():
            setattr(phone, field, value)

        await self.db.commit()
        await self.db.refresh(phone)
        return phone

    async def delete(self, phone_id: int) -> bool:
        phone = await self.get_by_id(phone_id)
        if not phone:
            return False
        phone.is_active = False
        await self.db.commit()
        return True

    async def batch_checkin(self, phone_ids: list[int]) -> int:
        phones_stmt = select(Phone).where(Phone.id.in_(phone_ids), Phone.is_active.is_(True))
        phones = (await self.db.execute(phones_stmt)).scalars().all()

        found_ids = {p.id for p in phones}
        missing = set(phone_ids) - found_ids
        if missing:
            raise ValueError(f"Телефоны не найдены: {sorted(missing)}")

        already_checked = [p.id for p in phones if p.status == "Сдан"]
        if already_checked:
            raise ValueError(f"Телефоны уже сданы: {already_checked}")

        try:
            stmt = update(Phone).where(Phone.id.in_(phone_ids)).values(status="Сдан")
            result = await self.db.execute(stmt)
            await self.db.commit()
            return result.rowcount or 0
        except Exception as exc:
            await self.db.rollback()
            logger.error("Batch checkin error: %s", exc)
            raise ValueError(f"Ошибка массовой сдачи: {str(exc)}") from exc

    async def batch_checkout(self, phone_ids: list[int]) -> int:
        phones_stmt = select(Phone).where(Phone.id.in_(phone_ids), Phone.is_active.is_(True))
        phones = (await self.db.execute(phones_stmt)).scalars().all()

        found_ids = {p.id for p in phones}
        missing = set(phone_ids) - found_ids
        if missing:
            raise ValueError(f"Телефоны не найдены: {sorted(missing)}")

        already_out = [p.id for p in phones if p.status == "Выдан"]
        if already_out:
            raise ValueError(f"Телефоны уже выданы: {already_out}")

        try:
            stmt = update(Phone).where(Phone.id.in_(phone_ids)).values(status="Выдан")
            result = await self.db.execute(stmt)
            await self.db.commit()
            return result.rowcount or 0
        except Exception as exc:
            await self.db.rollback()
            logger.error("Batch checkout error: %s", exc)
            raise ValueError(f"Ошибка массовой выдачи: {str(exc)}") from exc

    async def get_status_report(self) -> dict:
        total_stmt = select(func.count(Phone.id)).where(Phone.is_active.is_(True))
        checked_in_stmt = select(func.count(Phone.id)).where(Phone.is_active.is_(True), Phone.status == "Сдан")
        checked_out_stmt = select(func.count(Phone.id)).where(Phone.is_active.is_(True), Phone.status == "Выдан")
        not_submitted_stmt = (
            select(Phone)
            .options(joinedload(Phone.owner))
            .where(Phone.is_active.is_(True), Phone.status == "Выдан")
        )

        total = (await self.db.execute(total_stmt)).scalar_one()
        checked_in = (await self.db.execute(checked_in_stmt)).scalar_one()
        checked_out = (await self.db.execute(checked_out_stmt)).scalar_one()
        phones_not_submitted = (await self.db.execute(not_submitted_stmt)).scalars().all()

        return {
            "total_phones": total,
            "checked_in": checked_in,
            "checked_out": checked_out,
            "phones_not_submitted": phones_not_submitted,
        }
