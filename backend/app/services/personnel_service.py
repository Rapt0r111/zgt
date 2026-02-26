from typing import Optional

from sqlalchemy import func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.personnel import Personnel
from app.schemas.personnel import PersonnelCreate, PersonnelUpdate

RANK_PRIORITY = {
    "Маршал Российской Федерации": 1,
    "Генерал армии": 2,
    "Генерал-полковник": 3,
    "Генерал-лейтенант": 4,
    "Генерал-майор": 5,
    "Полковник": 6,
    "Подполковник": 7,
    "Майор": 8,
    "Капитан": 9,
    "Старший лейтенант": 10,
    "Лейтенант": 11,
    "Младший лейтенант": 12,
    "Старший прапорщик": 13,
    "Прапорщик": 14,
    "Старшина": 15,
    "Старший сержант": 16,
    "Сержант": 17,
    "Младший сержант": 18,
    "Ефрейтор": 19,
    "Рядовой": 20,
    "Курсант": 21,
}


class PersonnelService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_list(
        self,
        skip: int = 0,
        limit: int = 100,
        status: Optional[str] = None,
        search: Optional[str] = None,
    ) -> tuple[list[Personnel], int]:
        filters = [Personnel.is_active.is_(True)]
        if status:
            filters.append(Personnel.status == status)
        if search:
            filters.append(
                or_(
                    Personnel.full_name.ilike(f"%{search}%"),
                    Personnel.rank.ilike(f"%{search}%"),
                    Personnel.position.ilike(f"%{search}%"),
                    Personnel.platoon.ilike(f"%{search}%"),
                    Personnel.personal_number.ilike(f"%{search}%"),
                    Personnel.service_number.ilike(f"%{search}%"),
                )
            )

        total_stmt = select(func.count(Personnel.id)).where(*filters)
        total = (await self.db.execute(total_stmt)).scalar_one()

        items_stmt = (
            select(Personnel)
            .where(*filters)
            .order_by(Personnel.rank_priority.asc().nullslast(), Personnel.full_name.asc())
            .offset(skip)
            .limit(limit)
        )
        items = (await self.db.execute(items_stmt)).scalars().all()
        return items, total

    async def get_by_id(self, personnel_id: int) -> Optional[Personnel]:
        stmt = select(Personnel).where(Personnel.id == personnel_id, Personnel.is_active.is_(True))
        return (await self.db.execute(stmt)).scalars().first()

    def _calc_rank_priority(self, rank: Optional[str]) -> int:
        return RANK_PRIORITY.get(rank.strip() if rank else "", 999)

    async def create(self, personnel_data: PersonnelCreate) -> Personnel:
        try:
            data = personnel_data.model_dump()
            data["rank_priority"] = self._calc_rank_priority(data.get("rank"))

            personnel = Personnel(**data)
            self.db.add(personnel)
            await self.db.commit()
            await self.db.refresh(personnel)
            return personnel
        except IntegrityError as exc:
            await self.db.rollback()
            raise ValueError("Личный номер уже существует") from exc

    async def update(self, personnel_id: int, personnel_data: PersonnelUpdate) -> Optional[Personnel]:
        personnel = await self.get_by_id(personnel_id)
        if not personnel:
            return None

        update_data = personnel_data.model_dump(exclude_unset=True)
        if "rank" in update_data:
            update_data["rank_priority"] = self._calc_rank_priority(update_data["rank"])

        for field, value in update_data.items():
            setattr(personnel, field, value)

        await self.db.commit()
        await self.db.refresh(personnel)
        return personnel

    async def delete(self, personnel_id: int) -> bool:
        personnel = await self.get_by_id(personnel_id)
        if not personnel:
            return False

        personnel.is_active = False
        await self.db.commit()
        return True
