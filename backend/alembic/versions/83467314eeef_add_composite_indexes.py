"""add_composite_indexes

Revision ID: 83467314eeef
Revises: f6dccea0881f
Create Date: 2026-02-08 17:11:15.704630

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '83467314eeef'
down_revision: Union[str, Sequence[str], None] = 'f6dccea0881f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Equipment
    op.create_index(
        'ix_equipment_type_status',
        'equipment',
        ['equipment_type', 'status', 'is_active']
    )
    op.create_index(
        'ix_equipment_owner_location',
        'equipment',
        ['current_owner_id', 'current_location']
    )
    
    # Personnel
    op.create_index(
        'ix_personnel_status_active',
        'personnel',
        ['status', 'is_active']
    )
    
    # Phones
    op.create_index(
        'ix_phones_owner_status',
        'phones',
        ['owner_id', 'status', 'is_active']
    )

def downgrade() -> None:
    op.drop_index('ix_equipment_type_status', 'equipment')
    op.drop_index('ix_equipment_owner_location', 'equipment')
    op.drop_index('ix_personnel_status_active', 'personnel')
    op.drop_index('ix_phones_owner_status', 'phones')
