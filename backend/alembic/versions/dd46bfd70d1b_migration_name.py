"""migration name

Revision ID: dd46bfd70d1b
Revises: 69d4b6a14964
Create Date: 2026-02-19 12:30:16.577545

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'dd46bfd70d1b'
down_revision: Union[str, Sequence[str], None] = '69d4b6a14964'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "equipment",
        sa.Column("is_personal", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.create_index("ix_equipment_is_personal", "equipment", ["is_personal"])


def downgrade() -> None:
    op.drop_index("ix_equipment_is_personal", table_name="equipment")
    op.drop_column("equipment", "is_personal")