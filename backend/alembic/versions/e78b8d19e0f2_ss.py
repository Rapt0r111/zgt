"""ss

Revision ID: e78b8d19e0f2
Revises: 9087ca4061f5
Create Date: 2026-02-16 12:48:35.058790

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e78b8d19e0f2'
down_revision: Union[str, Sequence[str], None] = '9087ca4061f5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_column("equipment_movements", "seal_status")
    op.drop_column("equipment_movements", "seal_number_after")
    op.drop_column("equipment_movements", "seal_number_before")

    op.drop_column("equipment", "seal_check_date")
    op.drop_column("equipment", "seal_status")
    op.drop_column("equipment", "seal_install_date")
    op.drop_column("equipment", "seal_number")


def downgrade() -> None:
    op.add_column("equipment", sa.Column("seal_number", sa.String(length=100), nullable=True))
    op.add_column("equipment", sa.Column("seal_install_date", sa.DateTime(timezone=True), nullable=True))
    op.add_column("equipment", sa.Column("seal_status", sa.String(length=50), nullable=True, server_default="Исправна"))
    op.add_column("equipment", sa.Column("seal_check_date", sa.DateTime(timezone=True), nullable=True))

    op.add_column("equipment_movements", sa.Column("seal_number_before", sa.String(length=100), nullable=True))
    op.add_column("equipment_movements", sa.Column("seal_number_after", sa.String(length=100), nullable=True))
    op.add_column("equipment_movements", sa.Column("seal_status", sa.String(length=50), nullable=True))