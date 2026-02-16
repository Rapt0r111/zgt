"""ss

Revision ID: 3c7677535ef9
Revises: e78b8d19e0f2
Create Date: 2026-02-16 15:54:22.585801

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '3c7677535ef9'
down_revision: Union[str, Sequence[str], None] = 'e78b8d19e0f2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
