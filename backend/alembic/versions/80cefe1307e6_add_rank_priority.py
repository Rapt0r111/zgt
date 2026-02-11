"""add_rank_priority

Revision ID: 80cefe1307e6
Revises: 7eb99be426de
Create Date: 2026-02-11 13:08:31.461883

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '80cefe1307e6'
down_revision: Union[str, Sequence[str], None] = '7eb99be426de'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade():
    # Check if columns exist before adding
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    columns = [col['name'] for col in inspector.get_columns('personnel')]
    
    # Add rank_priority column if it doesn't exist
    if 'rank_priority' not in columns:
        op.add_column('personnel', sa.Column('rank_priority', sa.Integer(), nullable=True))
    
    # Add platoon column if it doesn't exist (nullable)
    if 'platoon' not in columns:
        op.add_column('personnel', sa.Column('platoon', sa.String(), nullable=True))
    
    # Remove old unit column if it exists
    if 'unit' in columns:
        op.drop_column('personnel', 'unit')

def downgrade():
    # Restore changes
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    columns = [col['name'] for col in inspector.get_columns('personnel')]
    
    if 'platoon' in columns:
        op.drop_column('personnel', 'platoon')
    if 'rank_priority' in columns:
        op.drop_column('personnel', 'rank_priority')
    
    # Restore unit column
    if 'unit' not in columns:
        op.add_column('personnel', sa.Column('unit', sa.String(), nullable=True))


