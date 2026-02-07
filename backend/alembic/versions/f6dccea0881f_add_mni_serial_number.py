"""add_mni_serial_number

Revision ID: f6dccea0881f
Revises: 655a1551ed54
Create Date: 2026-02-07 20:13:44.999635

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f6dccea0881f'
down_revision: Union[str, Sequence[str], None] = '655a1551ed54'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'equipment',
        sa.Column('mni_serial_number', sa.String(length=100), nullable=True)
    )
    op.create_index(
        'ix_equipment_mni_serial_number',
        'equipment',
        ['mni_serial_number'],
        unique=False
    )

def downgrade() -> None:
    op.drop_index('ix_equipment_mni_serial_number', table_name='equipment')
    op.drop_column('equipment', 'mni_serial_number')
