"""ss

Revision ID: 40f0482285a7
Revises: 3c7677535ef9
Create Date: 2026-02-16 15:58:46.031111

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '40f0482285a7'
down_revision: Union[str, Sequence[str], None] = '3c7677535ef9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
