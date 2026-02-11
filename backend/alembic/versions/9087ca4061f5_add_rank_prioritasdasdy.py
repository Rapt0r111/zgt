"""add_rank_prioritasdasdy

Revision ID: 9087ca4061f5
Revises: 80cefe1307e6
Create Date: 2026-02-11 16:26:17.703697

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9087ca4061f5'
down_revision: Union[str, Sequence[str], None] = '80cefe1307e6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

"""add_laptop_accessories_to_equipment

Revision ID: 9087ca4061f5
Revises: 80cefe1307e6
Create Date: 2026-02-11 14:25:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "9087ca4061f5"
down_revision: Union[str, Sequence[str], None] = "80cefe1307e6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("equipment", sa.Column("has_laptop", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column("equipment", sa.Column("laptop_functional", sa.Boolean(), nullable=False, server_default=sa.true()))
    op.add_column("equipment", sa.Column("has_charger", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column("equipment", sa.Column("charger_functional", sa.Boolean(), nullable=False, server_default=sa.true()))
    op.add_column("equipment", sa.Column("has_mouse", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column("equipment", sa.Column("mouse_functional", sa.Boolean(), nullable=False, server_default=sa.true()))
    op.add_column("equipment", sa.Column("has_bag", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column("equipment", sa.Column("bag_functional", sa.Boolean(), nullable=False, server_default=sa.true()))


def downgrade() -> None:
    op.drop_column("equipment", "bag_functional")
    op.drop_column("equipment", "has_bag")
    op.drop_column("equipment", "mouse_functional")
    op.drop_column("equipment", "has_mouse")
    op.drop_column("equipment", "charger_functional")
    op.drop_column("equipment", "has_charger")
    op.drop_column("equipment", "laptop_functional")
    op.drop_column("equipment", "has_laptop")