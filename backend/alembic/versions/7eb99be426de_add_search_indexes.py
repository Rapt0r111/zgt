"""add_search_indexes

Revision ID: 7eb99be426de
Revises: 15fb833190e3
Create Date: 2026-02-10 17:11:12.948172

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '7eb99be426de'
down_revision: Union[str, Sequence[str], None] = '15fb833190e3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'storage_and_passes',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('asset_type', sa.String(length=50), nullable=False),
        sa.Column('serial_number', sa.String(length=100), nullable=False),
        sa.Column('model', sa.String(length=255), nullable=True),
        sa.Column('manufacturer', sa.String(length=100), nullable=True),
        sa.Column('status', sa.String(length=50), nullable=False),
        sa.Column('assigned_to_id', sa.Integer(), nullable=True),
        sa.Column('capacity_gb', sa.Integer(), nullable=True),
        sa.Column('access_level', sa.Integer(), nullable=True),
        sa.Column('issue_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('return_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True, server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['assigned_to_id'], ['personnel.id'], ondelete='SET NULL'),
        sa.UniqueConstraint('serial_number', name='uq_storage_passes_serial'),
        sa.CheckConstraint("asset_type IN ('flash_drive', 'electronic_pass')", name='ck_asset_type'),
        sa.CheckConstraint("status IN ('in_use', 'stock', 'broken', 'lost')", name='ck_status')
    )
    
    op.create_index('ix_storage_passes_serial', 'storage_and_passes', ['serial_number'])
    op.create_index('ix_storage_passes_assigned_to', 'storage_and_passes', ['assigned_to_id'])
    op.create_index('ix_storage_passes_type_status', 'storage_and_passes', ['asset_type', 'status', 'is_active'])

def downgrade() -> None:
    op.drop_index('ix_storage_passes_type_status', 'storage_and_passes')
    op.drop_index('ix_storage_passes_assigned_to', 'storage_and_passes')
    op.drop_index('ix_storage_passes_serial', 'storage_and_passes')
    op.drop_table('storage_and_passes')