"""fix users created_at default

Revision ID: fix001
Revises: c7d8e9f0a1b2
Create Date: 2026-04-01
"""
from alembic import op

revision = "fix001"
down_revision = "c7d8e9f0a1b2"
branch_labels = None
depends_on = None


def upgrade():
    op.execute(
        "ALTER TABLE users ALTER COLUMN created_at "
        "SET DEFAULT timezone('UTC', now())"
    )


def downgrade():
    op.execute(
        "ALTER TABLE users ALTER COLUMN created_at DROP DEFAULT"
    )