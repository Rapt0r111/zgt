"""ss

Revision ID: 69d4b6a14964
Revises: 40f0482285a7
Create Date: 2026-02-16 16:09:29.726795

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '69d4b6a14964'
down_revision: Union[str, Sequence[str], None] = '40f0482285a7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
