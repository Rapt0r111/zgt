"""partial_unique_inventory_and_general_equipment

Добавляет поддержку произвольной электроники (телевизоры, доски, проекторы и др.).

Изменения:
- Снимает жёсткое уникальное ограничение uq_equipment_inventory,
  заменяя его частичным (PARTIAL) уникальным индексом — NULL-значения
  больше не считаются дубликатами (каждая запись без инвентарного номера
  существует независимо).
- Снимает NOT NULL с inventory_number на уровне CHECK (уже было nullable);
  явно помечаем тип как "display_name", чтобы иметь человекочитаемое имя.
- Добавляет колонку display_name VARCHAR(255) NULLABLE — позволяет хранить
  произвольное «имя» устройства отдельно от поля model (опционально).

Revision ID: c7d8e9f0a1b2
Revises: a959ee5d3a16
Create Date: 2026-03-31
"""

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "c7d8e9f0a1b2"
down_revision: Union[str, Sequence[str], None] = "a959ee5d3a16"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""

    # ── 1. Снимаем старый UNIQUE (index) на inventory_number ───────────────
    #       В Alembic drop_constraint работает с type_='unique'.
    #       Если constraint был создан как UniqueConstraint, имя совпадает.
    op.drop_constraint("uq_equipment_inventory", "equipment", type_="unique")

    # ── 2. Создаём PARTIAL UNIQUE INDEX — уникальность только для не-пустых ─
    #       inventory_number. Две записи с NULL или '' не конфликтуют.
    op.execute(
        """
        CREATE UNIQUE INDEX uq_equipment_inventory_notnull
        ON equipment (inventory_number)
        WHERE inventory_number IS NOT NULL
          AND inventory_number != ''
        """
    )

    # ── 3. Добавляем колонку display_name для произвольной техники ──────────
    #       Хранит «человеческое» имя (напр. «Телевизор Samsung 55"»),
    #       если model недостаточно. Полностью опциональна.
    op.add_column(
        "equipment",
        sa.Column("display_name", sa.String(length=255), nullable=True),
    )
    op.create_index(
        "ix_equipment_display_name",
        "equipment",
        ["display_name"],
        unique=False,
    )


def downgrade() -> None:
    """Downgrade schema."""

    op.drop_index("ix_equipment_display_name", table_name="equipment")
    op.drop_column("equipment", "display_name")

    op.execute("DROP INDEX IF EXISTS uq_equipment_inventory_notnull")

    # При откате создаём обратно ограничение, но возможна ошибка
    # если в таблице уже есть несколько строк с inventory_number = NULL.
    # В таком случае нужно сначала удалить дубликаты вручную.
    op.create_unique_constraint(
        "uq_equipment_inventory", "equipment", ["inventory_number"]
    )
