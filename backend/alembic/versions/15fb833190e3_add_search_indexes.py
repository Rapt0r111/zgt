"""add_search_indexes

Revision ID: 15fb833190e3
Revises: b334d448cabe
Create Date: 2026-02-10 12:44:17.274177

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '15fb833190e3'
down_revision: Union[str, Sequence[str], None] = 'b334d448cabe'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add indexes, unique constraints, and fix FK cascades"""
    
    # Add unique constraints
    op.create_unique_constraint(
        'uq_equipment_inventory',
        'equipment',
        ['inventory_number']
    )
    op.create_unique_constraint(
        'uq_storage_inventory',
        'storage_devices',
        ['inventory_number']
    )
    
    # Add missing indexes on foreign keys
    op.create_index('ix_equipment_current_owner_id', 'equipment', ['current_owner_id'])
    op.create_index('ix_phones_owner_id', 'phones', ['owner_id'])
    op.create_index('ix_equipment_movements_equipment_id', 'equipment_movements', ['equipment_id'])
    op.create_index('ix_equipment_movements_from_person_id', 'equipment_movements', ['from_person_id'])
    op.create_index('ix_equipment_movements_to_person_id', 'equipment_movements', ['to_person_id'])
    op.create_index('ix_storage_devices_equipment_id', 'storage_devices', ['equipment_id'])
    
    # Add composite index for common query pattern
    op.create_index(
        'ix_equipment_type_status',
        'equipment',
        ['equipment_type', 'status', 'is_active']
    )
    
    # Fix CASCADE on equipment.current_owner_id
    op.drop_constraint('equipment_current_owner_id_fkey', 'equipment', type_='foreignkey')
    op.create_foreign_key(
        'equipment_current_owner_id_fkey',
        'equipment', 'personnel',
        ['current_owner_id'], ['id'],
        ondelete='SET NULL'
    )


def downgrade() -> None:
    """Downgrade schema"""
    
    # Remove constraints
    op.drop_constraint('uq_equipment_inventory', 'equipment', type_='unique')
    op.drop_constraint('uq_storage_inventory', 'storage_devices', type_='unique')
    
    # Remove indexes
    op.drop_index('ix_equipment_current_owner_id', 'equipment')
    op.drop_index('ix_phones_owner_id', 'phones')
    op.drop_index('ix_equipment_movements_equipment_id', 'equipment_movements')
    op.drop_index('ix_equipment_movements_from_person_id', 'equipment_movements')
    op.drop_index('ix_equipment_movements_to_person_id', 'equipment_movements')
    op.drop_index('ix_storage_devices_equipment_id', 'storage_devices')
    op.drop_index('ix_equipment_type_status', 'equipment')
    
    # Revert FK
    op.drop_constraint('equipment_current_owner_id_fkey', 'equipment', type_='foreignkey')
    op.create_foreign_key(
        'equipment_current_owner_id_fkey',
        'equipment', 'personnel',
        ['current_owner_id'], ['id']
    )